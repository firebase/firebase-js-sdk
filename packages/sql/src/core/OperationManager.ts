/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { mergeHeadersInit } from '../network/headers';
import { FirebaseSqlTransportInterface } from '../network/transport';
import { deepSortKeysForObj } from '../util/encoder';

/**
 * HTTP methods supported by PostgREST operations.
 * @internal
 */
export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PATCH' | 'DELETE';
export type { HttpMethod as SqlHttpMethod };

/**
 * Resolves the uppercase HTTP method from `RequestInit`.
 * @internal
 */
export function resolveHttpMethod(init?: RequestInit): HttpMethod {
  const rawMethod = init?.method ?? 'GET';
  return rawMethod.toUpperCase() as HttpMethod;
}

/**
 * High-level classification of a PostgREST operation.
 * @internal
 */
export type SqlOperationType = 'query' | 'mutation' | 'rpc';

/**
 * Canonical, JSON-serializable metadata describing a PostgREST operation.
 * Used for deterministic SSR cache keys and cache hydration.
 * @internal
 */
export interface OperationInfo {
  /** Target backend url */
  restUrl: string;
  /** Request path relative to PostgREST root URL (e.g., 'movies' or 'rpc/calculate_tax') */
  pathname: string;
  /**
   * Deterministically sorted array of URL search parameter tuples.
   * Stored as an array of tuples (not a Record) because PostgREST supports
   * multiple filters on the same column (e.g., `[['age', 'gte.18'], ['age', 'lte.65']]`).
   */
  searchParams: Array<[key: string, value: string]>;
  /** Primary database entity (table, view, or RPC function name) */
  relation: string;
  method: HttpMethod;
  operationType: SqlOperationType;
  /**
   * Sanitized protocol-only request headers (Accept, Prefer, Accept-Profile, Content-Profile).
   * All authentication tokens, API keys, and transport headers are stripped.
   */
  headers?: {
    accept?: string;
    prefer?: string;
  };
  schemaName?: string;
  /** Request payload for RPC or mutations (keys sorted deterministically) */
  body?: unknown;
  /** Set to true when .maybeSingle() is called (cardinality: 0 or 1 row) */
  isMaybeSingle?: boolean;
}

/**
 * Optional builder-supplied metadata used when capturing an {@link OperationInfo} snapshot.
 * @internal
 */
export interface OperationDispatchContext {
  relation?: string;
  operationType?: SqlOperationType;
  isMaybeSingle?: boolean;
  body?: unknown;
}

/**
 * Combined HTTP response and immutable dispatch-time {@link OperationInfo} snapshot.
 * @internal
 */
export interface OperationDispatchResult {
  response: Response;
  operationInfo: OperationInfo;
}

/**
 * Recursively freezes an object or array graph so post-dispatch mutations throw in strict mode.
 */
function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return Object.freeze(value);
}

/**
 * Decodes a URI component, falling back to the raw segment if percent-encoding is malformed.
 */
function safeDecodeURIComponent(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Normalizes a request body payload into canonical parsed JSON values so `Date` instances,
 * `.toJSON()` methods, and `undefined` fields serialize identically across `context.body` and `init.body`.
 */
function normalizeJsonBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  try {
    return JSON.parse(JSON.stringify(body));
  } catch {
    return body;
  }
}

/**
 * Parses a URL string into a standalone `URL` instance.
 */
function parseRequestUrl(url: string, baseUrl: string): URL {
  if (/^https?:\/\//i.test(url)) {
    return new URL(url);
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(url.replace(/^\/+/, ''), normalizedBase);
}

/**
 * Dispatch interceptor that captures immutable {@link OperationInfo} snapshots
 * and resolves PostgREST headers before delegating to {@link FirebaseSqlTransportInterface}.
 * @internal
 */
export class OperationManager {
  private readonly _schemaName?: string;

  /**
   * Bound `fetch`-compatible callback suitable for passing to PostgREST query builders.
   */
  readonly sqlFetch: typeof fetch = (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => this.createSqlFetch()(input, init);

  constructor(
    private readonly _restUrl: string,
    private readonly _transport: FirebaseSqlTransportInterface,
    schemaName?: string
  ) {
    this._schemaName = schemaName ?? this._transport.settings?.schemaName;
  }

  /**
   * Synchronously captures a deep-frozen {@link OperationInfo} snapshot before network I/O begins.
   */
  snapshotOperationInfo(
    url: string,
    init?: RequestInit,
    context?: OperationDispatchContext
  ): OperationInfo {
    const baseUrl = new URL(this._restUrl);
    const requestUrl = parseRequestUrl(url, this._restUrl);
    const basePath = baseUrl.pathname.replace(/\/+$/, '');

    let pathname = requestUrl.pathname;
    if (
      basePath.length > 0 &&
      (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ) {
      pathname = pathname.slice(basePath.length);
    }
    pathname = pathname.replace(/^\/+|\/+$/g, '');

    const searchParams: Array<[string, string]> = [];
    requestUrl.searchParams.forEach((value, key) => {
      searchParams.push(Object.freeze([key, value]) as [string, string]);
    });
    searchParams.sort((a, b) =>
      a[0] < b[0]
        ? -1
        : a[0] > b[0]
          ? 1
          : a[1] < b[1]
            ? -1
            : a[1] > b[1]
              ? 1
              : 0
    );
    Object.freeze(searchParams);

    const method = resolveHttpMethod(init);
    const operationType: SqlOperationType =
      context?.operationType ??
      (pathname.startsWith('rpc/')
        ? 'rpc'
        : method === 'GET' || method === 'HEAD'
          ? 'query'
          : 'mutation');

    const relation =
      context?.relation ??
      (pathname.startsWith('rpc/')
        ? safeDecodeURIComponent(pathname.slice(4))
        : safeDecodeURIComponent(pathname.split('/')[0] ?? ''));

    const operationInfo: OperationInfo = {
      restUrl: this._restUrl,
      pathname,
      searchParams,
      relation,
      method,
      operationType
    };

    const mergedHeaders = new Headers();
    mergeHeadersInit(mergedHeaders, this._transport.settings?.headers);
    mergeHeadersInit(mergedHeaders, init?.headers);

    const accept = mergedHeaders.get('accept') ?? undefined;
    const prefer = mergedHeaders.get('prefer') ?? undefined;
    if (accept !== undefined || prefer !== undefined) {
      const sanitizedHeaders: { accept?: string; prefer?: string } = {};
      if (accept !== undefined) {
        sanitizedHeaders.accept = accept;
      }
      if (prefer !== undefined) {
        sanitizedHeaders.prefer = prefer;
      }
      operationInfo.headers = Object.freeze(sanitizedHeaders);
    }

    if (this._schemaName !== undefined) {
      operationInfo.schemaName = this._schemaName;
    }

    if (context?.body !== undefined) {
      operationInfo.body = deepFreeze(
        deepSortKeysForObj(normalizeJsonBody(context.body))
      );
    } else if (init?.body !== undefined && init?.body !== null) {
      operationInfo.body = deepFreeze(
        deepSortKeysForObj(normalizeJsonBody(init.body))
      );
    }

    if (context?.isMaybeSingle !== undefined) {
      operationInfo.isMaybeSingle = context.isMaybeSingle;
    }

    return Object.freeze(operationInfo);
  }

  /**
   * Captures a dispatch-time {@link OperationInfo} snapshot synchronously and executes the request.
   */
  async execute(
    url: string,
    init?: RequestInit,
    context?: OperationDispatchContext
  ): Promise<OperationDispatchResult> {
    const operationInfo = this.snapshotOperationInfo(url, init, context);
    const dispatchUrl = parseRequestUrl(url, this._restUrl).toString();
    const dispatchInit = this._buildDispatchInit(init);
    const response = await this._transport.invokePostgrestOperation(
      dispatchUrl,
      dispatchInit
    );
    return {
      response,
      operationInfo
    };
  }

  /**
   * Returns a `fetch`-compatible function that synchronously captures an {@link OperationInfo}
   * snapshot before delegating network execution to {@link FirebaseSqlTransportInterface}.
   */
  createSqlFetch(
    context?: OperationDispatchContext,
    onSnapshot?: (info: OperationInfo) => void
  ): typeof fetch {
    return (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url = String(input);
      const operationInfo = this.snapshotOperationInfo(url, init, context);
      onSnapshot?.(operationInfo);
      const dispatchUrl = parseRequestUrl(url, this._restUrl).toString();
      const dispatchInit = this._buildDispatchInit(init);
      return this._transport.invokePostgrestOperation(
        dispatchUrl,
        dispatchInit
      );
    };
  }

  /**
   * Resolves PostgREST headers (settings headers, request headers, `Content-Type`,
   * and `Accept-Profile` / `Content-Profile`) for the outgoing dispatch.
   */
  private _buildDispatchInit(init?: RequestInit): RequestInit {
    const method = resolveHttpMethod(init);
    const headers = new Headers();

    mergeHeadersInit(headers, this._transport.settings?.headers);
    mergeHeadersInit(headers, init?.headers);

    if (method !== 'GET' && method !== 'HEAD') {
      headers.set('Content-Type', 'application/json');
    }

    if (this._schemaName !== undefined) {
      if (method === 'GET' || method === 'HEAD') {
        headers.set('Accept-Profile', this._schemaName);
        headers.delete('Content-Profile');
      } else {
        headers.set('Content-Profile', this._schemaName);
        headers.delete('Accept-Profile');
      }
    }

    return Object.assign({}, init, { headers });
  }
}
