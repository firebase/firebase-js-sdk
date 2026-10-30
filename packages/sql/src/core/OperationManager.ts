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

import type { OperationFailure, OperationResult } from '../api/Builder';
import type { FirebaseSqlTransportInterface } from '../network/transport';
import { LOWERCASE_DISALLOWED_HEADER_KEYS } from '../util/constants';
import { deepSortKeysForObj } from '../util/encoder';

import { Code, FirebaseSqlError, FirebaseSqlErrorCategory } from './error';

/**
 * HTTP methods supported by PostgREST operations.
 * @internal
 */
export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PATCH' | 'DELETE';
export type { HttpMethod as SqlHttpMethod };

/**
 * Resolves the uppercase HTTP method from `RequestInit` or a raw method string.
 * @internal
 */
export function resolveHttpMethod(
  initOrMethod?: RequestInit | string
): HttpMethod {
  const rawMethod =
    typeof initOrMethod === 'string'
      ? initOrMethod
      : (initOrMethod?.method ?? 'GET');
  return rawMethod.toUpperCase() as HttpMethod;
}

/**
 * Sanitized PostgREST protocol headers and custom user headers.
 * Excludes transport-managed headers (`content-type`, auth tokens, telemetry).
 * @internal
 */
export interface PostgrestRequestHeaders {
  accept?: string;
  prefer?: string;
  'accept-profile'?: string;
  'content-profile'?: string;
  [key: string]: string | undefined;
}

/**
 * Immutable, JSON-serializable representation of a PostgREST operation.
 * All keys in `headers` and `body`, and all search parameters in `url`,
 * are deterministically sorted and deeply frozen at creation time.
 * @internal
 */
export interface PostgrestRequestInfo {
  url: string;
  method: HttpMethod;
  headers?: PostgrestRequestHeaders;
  body?: unknown;
}

/**
 * Per-execution behavioral controls passed alongside `PostgrestRequestInfo`.
 * @internal
 */
export interface PostgrestBuilderContext {
  isMaybeSingle?: boolean;
  throwOnError?: boolean;
  signal?: AbortSignal;
  retry?: boolean;
}

/**
 * Recursively freezes an object or array graph so post-dispatch mutations throw in strict mode.
 */
function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/**
 * Normalizes a request body payload into canonical parsed JSON values so `Date` instances,
 * `bigint` values, `.toJSON()` methods, and `undefined` fields serialize deterministically.
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
    const serialized = JSON.stringify(body, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    if (serialized === undefined) {
      return body;
    }
    return JSON.parse(serialized);
  } catch {
    return body;
  }
}

// TODO: should all the postgrestrequestinfo stuff go to the builders? seems like they should be created there and then passed to the manager.
// TODO: so this would mean the order of operations is [Builder: user builds operation + executes, then we normalize it and build PostgrestRequestInfo] --> [Manager: receives PostgrestRequestInfo + PostgrestBuilderContext from builder, handles routing] --> [Network/Cache: executes PostgrestRequestInfo] --> [Manager: routes the result to builder+user and/or cache]
/**
 * Produces a canonical, deeply frozen, JSON-serializable {@link PostgrestRequestInfo}
 * from builder state at `.then()` invocation time.
 * @internal
 */
export function createPostgrestRequestInfo(
  url: URL | string,
  method?: HttpMethod | string,
  headers?: HeadersInit,
  schemaName?: string,
  body?: unknown
): PostgrestRequestInfo {
  const resolvedMethod: HttpMethod = resolveHttpMethod(method);

  const initialRequestUrl = new URL(url.toString());

  const queryParameters: Array<[string, string]> = [];
  initialRequestUrl.searchParams.forEach((value, key) => {
    queryParameters.push([key, value]);
  });
  queryParameters.sort(([keyA, valueA], [keyB, valueB]) => {
    if (keyA !== keyB) {
      return keyA < keyB ? -1 : 1;
    }
    if (valueA !== valueB) {
      return valueA < valueB ? -1 : 1;
    }
    return 0;
  });
  for (const [key] of queryParameters) {
    initialRequestUrl.searchParams.delete(key);
  }
  for (const [key, value] of queryParameters) {
    initialRequestUrl.searchParams.append(key, value);
  }

  const sortedRequestUrl = initialRequestUrl.toString();

  const workingHeaders = new Headers(headers);

  if (schemaName !== undefined) {
    if (resolvedMethod === 'GET' || resolvedMethod === 'HEAD') {
      workingHeaders.set('accept-profile', schemaName);
      workingHeaders.delete('content-profile');
    } else {
      workingHeaders.set('content-profile', schemaName);
      workingHeaders.delete('accept-profile');
    }
  }

  workingHeaders.delete('content-type');
  for (const key of LOWERCASE_DISALLOWED_HEADER_KEYS) {
    workingHeaders.delete(key);
  }

  const headerEntries: Array<[string, string]> = [];
  workingHeaders.forEach((value, key) => {
    headerEntries.push([key.toLowerCase(), value]);
  });
  headerEntries.sort(([keyA], [keyB]) =>
    keyA < keyB ? -1 : keyA > keyB ? 1 : 0
  );

  const postgrestRequestInfo: PostgrestRequestInfo = {
    url: sortedRequestUrl,
    method: resolvedMethod
  };

  if (headerEntries.length > 0) {
    const sortedHeaders: PostgrestRequestHeaders = {};
    for (const [key, value] of headerEntries) {
      sortedHeaders[key] = value;
    }
    postgrestRequestInfo.headers = sortedHeaders;
  }

  if (body !== undefined) {
    const normalizedBody = normalizeJsonBody(body);
    try {
      postgrestRequestInfo.body = deepSortKeysForObj(normalizedBody);
    } catch {
      postgrestRequestInfo.body = normalizedBody;
    }
  }

  return deepFreeze(postgrestRequestInfo);
}

/**
 * Converts a thrown transport/network exception into a client-category {@link FirebaseSqlError}
 * (`Code.OTHER`, `FirebaseSqlErrorCategory.SQL_CLIENT`).
 * Preserves existing {@link FirebaseSqlError} instances unchanged.
 * @internal
 */
export function createErrorFromTransportFailure(
  transportError: unknown
): FirebaseSqlError {
  if (transportError instanceof FirebaseSqlError) {
    return transportError;
  }

  if (transportError && typeof transportError === 'object') {
    const err = transportError as {
      name?: string;
      message?: string;
      details?: string;
      hint?: string;
      stack?: string;
    };
    const message = err.message
      ? `${err.name || 'TransportError'}: ${err.message}`
      : String(transportError);
    return new FirebaseSqlError(
      Code.OTHER,
      message,
      FirebaseSqlErrorCategory.SQL_CLIENT,
      err.details ?? err.stack,
      err.hint
    );
  }

  return new FirebaseSqlError(
    Code.OTHER,
    String(transportError || 'Network request failed.'),
    FirebaseSqlErrorCategory.SQL_CLIENT
  );
}

/**
 * Execution coordinator that dispatches {@link PostgrestRequestInfo} to
 * {@link FirebaseSqlTransportInterface}, validates `.maybeSingle()` cardinality,
 * and applies `throwOnError` delivery semantics.
 * @internal
 */
export class OperationManager {
  constructor(private readonly _transport: FirebaseSqlTransportInterface) { }

  async execute<T = unknown>(
    requestInfo: PostgrestRequestInfo,
    context?: PostgrestBuilderContext
  ): Promise<OperationResult<T>> {
    let result: OperationResult<T>;
    try {
      result = await this._transport.invokePostgrestOperation<T>(requestInfo, {
        signal: context?.signal,
        retry: context?.retry
      });
    } catch (fetchError: unknown) {
      if (context?.throwOnError === true) {
        throw fetchError;
      }
      const error = createErrorFromTransportFailure(fetchError);
      const failureResult: OperationFailure = {
        success: false,
        error,
        data: null,
        count: null,
        status: 0,
        statusText: ''
      };
      return failureResult;
    }
    // TODO: feels like the builder should be responsible for this sort of thing. if we don't have to take care of it, we don't need the builderContext - that's a smell telling us that this really belongs with the builder...    if (
    if (result.success && context?.isMaybeSingle) {
      result = this.assertIsMaybeSingle(result);
    }
    if (!result.success && context?.throwOnError === true) {
      throw result.error;
    }
    return result;
  }

  /**
   * Checks if the result is a maybe single and if so, adjusts the result to match.
   * @param result The result to check.
   */
  private assertIsMaybeSingle<T>(result: OperationResult<T>): OperationResult<T> {
    let isMaybeSingleResult: OperationResult<T> = result;
    if (result.data && Array.isArray(result.data)) {
      if (result.data.length > 1) {
        isMaybeSingleResult = {
          success: false,
          data: null,
          count: null,
          status: 406,
          statusText: 'Not Acceptable',
          error: new FirebaseSqlError(
            'PGRST116',
            'JSON object requested, multiple (or no) rows returned',
            FirebaseSqlErrorCategory.SQL_POSTGREST,
            `Results contain ${result.data.length} rows, application/vnd.pgrst.object+json requires 1 row`,
            undefined,
            406
          )
        };
      } else if (result.data.length === 1) {
        isMaybeSingleResult = Object.assign({}, result);
        isMaybeSingleResult.data = result.data[0] as T;
      } else {
        isMaybeSingleResult = Object.assign({}, result);
        isMaybeSingleResult.data = null as T;
      }
    }
    return isMaybeSingleResult;
  }
}
