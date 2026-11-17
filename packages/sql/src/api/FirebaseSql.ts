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

import {
  FirebaseApp,
  getApp,
  _getProvider,
  _removeServiceInstance
} from '@firebase/app';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { PostgrestClient } from '@supabase/postgrest-js';

import type { FirebaseSqlContext } from '../core/context';
import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { mapPostgrestFailureToFirebaseSqlError } from '../core/errorMapper';
import {
  SqlServiceSettings,
  validateSqlServiceSettings
} from '../core/settings';
import { AppCheckProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import type {
  UntypedClientOptions,
  UntypedDatabase,
  UntypedSchema
} from '../core/untypedSchema';
import { logDebug } from '../logger';
import { validateHeaders } from '../network/headers';
import { createBuilderFetch } from '../network/transport';
import { FIREBASE_SQL_COMPONENT_NAME } from '../util/constants';
import { resolvePostgrestUrl } from '../util/url';

import type { FilterBuilder } from './FilterBuilder';
import { FilterBuilderImpl } from './impl/FilterBuilderImpl';
import { QueryBuilderImpl } from './impl/QueryBuilderImpl';
import type { QueryBuilder, QueryCountStrategy } from './QueryBuilder';

declare module '@firebase/component' {
  interface NameServiceMapping {
    [FIREBASE_SQL_COMPONENT_NAME]: FirebaseSql;
  }
}

/**
 * The Firebase SQL service client instance.
 */
export class FirebaseSql {
  /** The bound FirebaseApp instance. */
  readonly app: FirebaseApp;

  /** The URL with which to communicate with the backend Firebase SQL server. */
  readonly restUrl: string;

  /** The name of the schema that is sent over the wire. */
  readonly schemaName: string | undefined;

  /**
   * Returns whether this object is in a "mutable" state, such that mutator
   * methods like `setHeaders()` are allowed to be invoked.
   *
   * A newly created `FirebaseSql` instance starts in the "mutable" state and
   * permanently transitions to `mutable === false` upon the first call to
   * `from()` or `rpc()`, or when terminated via `terminate()` or `deleteApp()`.
   * Note that `getSql()` returns cached instances, so `mutable` will already be
   * `false` if the cached instance was previously used.
   */
  get mutable(): boolean {
    return this._state.name === 'mutable';
  }

  /** @internal */
  private _state: FirebaseSqlState;

  /**
   * Should only be called by {@linkcode getSql()}, after validating inputs.
   * @internal
   */
  constructor(parameters: {
    app: FirebaseApp;
    settings: SqlServiceSettings;
    instanceIdentifier: string;
    authProvider: Provider<FirebaseAuthInternalName>;
    appCheckProvider: Provider<AppCheckInternalComponentName>;
  }) {
    const {
      app,
      settings,
      instanceIdentifier,
      authProvider,
      appCheckProvider
    } = parameters;

    this.app = app;
    this.schemaName = settings.schemaName;
    this.restUrl = resolvePostgrestUrl(settings, app.options.projectId!);

    this._state = {
      name: 'mutable',
      instanceIdentifier,
      headers: new Headers(),
      authProvider,
      appCheckProvider
    };
  }

  /**
   * Called by `@firebase/app` when the bound `FirebaseApp` is deleted.
   * @internal
   */
  _delete(): Promise<void> {
    if (this._state.name === 'terminated') {
      return Promise.resolve();
    }
    if (this._state.name === 'mutable') {
      const { instanceIdentifier } = this._state;
      this._state = { name: 'terminated' };
      _removeServiceInstance(
        this.app,
        FIREBASE_SQL_COMPONENT_NAME,
        instanceIdentifier
      );
      return Promise.resolve();
    }

    const { context, instanceIdentifier, abortController } = this._state;
    this._state = { name: 'terminated' };
    const { resources } = context;
    context.resources = null;

    abortController.abort(
      new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      )
    );
    if (resources !== null) {
      resources.appCheckTokenProvider.terminate();
      resources.authTokenProvider.terminate();
    }
    _removeServiceInstance(
      this.app,
      FIREBASE_SQL_COMPONENT_NAME,
      instanceIdentifier
    );

    return Promise.resolve();
  }

  /**
   * Sets the headers that will be included on every HTTP request,
   * overwriting any previously-set headers.
   *
   * Throws `TypeError` if `headers` contains invalid HTTP header names or
   * values. Throws `FirebaseSqlError` if this method is called when `mutable`
   * is `false` or if the given headers contains one or more reserved headers.
   *
   * @param headers The headers to set.
   */
  setHeaders(headers: HeadersInit): void {
    const headersCopy = new Headers(headers);
    validateHeaders(headersCopy);

    if (this._state.name === 'immutable') {
      throw new FirebaseSqlError(
        Code.ALREADY_INITIALIZED,
        'The Firebase SQL client is no longer mutable; ' +
          'therefore, the headers may not be changed.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    if (this._state.name === 'terminated') {
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated; ' +
          'therefore, the headers may not be changed.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }

    this._state.headers = headersCopy;
  }

  private _getFirebaseSqlStateImmutableOrThrow(): FirebaseSqlStateImmutable {
    if (this._state.name === 'terminated') {
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'The Firebase SQL client has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }

    if (this._state.name === 'immutable') {
      return this._state;
    }

    const { instanceIdentifier, headers, authProvider, appCheckProvider } =
      this._state;

    // PostgrestClient is deliberately instantiated without a static `fetch` option.
    // Instead, `createBuilderFetch` is passed down to query/filter builders, which
    // bind an execution-isolated `fetch` dynamically on each query execution to ensure
    // concurrent executions of the same builder instance do not share a single
    // `BuilderExecutionTracker` closure.
    const postgrestClient = new PostgrestClient(this.restUrl, {
      headers,
      schema: this.schemaName
    });

    const abortController = new AbortController();
    const context: FirebaseSqlContext = {
      resources: {
        appId: this.app.options.appId,
        authTokenProvider: new FirebaseAuthProvider(this.app, authProvider),
        appCheckTokenProvider: new AppCheckProvider(this.app, appCheckProvider)
      },
      abortSignal: abortController.signal
    };

    this._state = {
      name: 'immutable',
      instanceIdentifier,
      abortController,
      postgrestClient,
      context
    };

    return this._state;
  }

  // Encode table and RPC names so `/`, `?`, `#`, and dot-segments cannot traverse out of
  // `/postgrest` or inject query parameters on the shared `firebasedataconnect.googleapis.com`
  // origin (deviating from `PostgrestClient`'s raw URL interpolation while leaving blank
  // `from('')` inputs untouched so `@supabase/postgrest-js`'s raw `Error` still propagates).
  private _encodeResourceSegment(
    segment: string,
    preserveBlank: boolean
  ): string {
    if (segment === '.' || segment === '..') {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        `Invalid resource name "${segment}".`,
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    if (
      typeof segment !== 'string' ||
      segment.length === 0 ||
      (preserveBlank && segment.trim() === '')
    ) {
      return segment;
    }
    return encodeURIComponent(segment);
  }

  from(table: string): QueryBuilder {
    const encodedTable = this._encodeResourceSegment(table, true);
    const { context, postgrestClient } =
      this._getFirebaseSqlStateImmutableOrThrow();
    const postgrestQueryBuilder = postgrestClient.from(encodedTable);
    return new QueryBuilderImpl(
      postgrestQueryBuilder,
      context,
      createBuilderFetch,
      mapPostgrestFailureToFirebaseSqlError
    );
  }

  /**
   * Calls a Postgres stored procedure or function (RPC).
   *
   * Untyped RPC results default to `unknown` for type safety. Call `.returns<T>()` or
   * `.overrideTypes<T>()` on the returned builder to specify the expected return type.
   *
   * @param fn - The function name to call.
   * @param params - Named arguments to pass to the function.
   * @param options - Execution options.
   */
  rpc<
    Args extends object & {
      readonly [K in keyof Args]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    fn: string,
    params?: Args | undefined,
    options?: Readonly<FirebaseSqlRpcOptions> | undefined
  ): FilterBuilder<unknown, 'RPC'> {
    const encodedFn = this._encodeResourceSegment(fn, false);
    const { context, postgrestClient } =
      this._getFirebaseSqlStateImmutableOrThrow();
    const postgrestFilterBuilder = postgrestClient.rpc(
      encodedFn,
      params,
      options
    );
    return new FilterBuilderImpl<unknown, 'RPC'>(
      postgrestFilterBuilder,
      context,
      createBuilderFetch,
      mapPostgrestFailureToFirebaseSqlError
    );
  }
}

/**
 * Returns the cached or newly initialized `FirebaseSql` instance for the default `FirebaseApp`.
 *
 * @param settings - Configuration settings for the Firebase SQL service instance.
 */
export function getSql(settings: SqlServiceSettings): FirebaseSql;

/**
 * Returns the cached or newly initialized `FirebaseSql` instance for the given `FirebaseApp`.
 *
 * @param app - The `FirebaseApp` instance to bind to.
 * @param settings - Configuration settings for the Firebase SQL service instance.
 */
export function getSql(
  app: FirebaseApp,
  settings: SqlServiceSettings
): FirebaseSql;

export function getSql(
  appOrSettings: FirebaseApp | SqlServiceSettings,
  settingsArg?: SqlServiceSettings
): FirebaseSql {
  let app: FirebaseApp;
  let rawSettings: SqlServiceSettings;

  if (settingsArg === undefined) {
    app = getApp();
    rawSettings = appOrSettings as SqlServiceSettings;
  } else {
    if (appOrSettings === undefined) {
      app = getApp();
    } else if (
      !appOrSettings ||
      typeof appOrSettings !== 'object' ||
      !('options' in appOrSettings)
    ) {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        'First argument passed to getSql() must be a FirebaseApp or SqlServiceSettings instance.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    } else {
      app = appOrSettings;
    }
    rawSettings = settingsArg;
  }

  const validatedSettings = validateSqlServiceSettings(rawSettings);

  if (
    typeof app.options?.projectId !== 'string' ||
    app.options.projectId.length === 0
  ) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'Project ID must be provided in FirebaseApp options. Did you pass in a proper projectId to initializeApp?',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }

  const instanceIdentifier = getInstanceIdentifier(
    validatedSettings,
    app.options.projectId
  );
  const provider = _getProvider(app, FIREBASE_SQL_COMPONENT_NAME);

  if (provider.isInitialized(instanceIdentifier)) {
    logDebug('Re-using cached Firebase SQL instance');
    return provider.getImmediate({ identifier: instanceIdentifier });
  }

  logDebug('Creating new Firebase SQL instance');
  return provider.initialize({
    instanceIdentifier,
    options: validatedSettings
  });
}

/**
 * Terminates the `FirebaseSql` instance and removes it from the app's component registry.
 *
 * @param sql - The `FirebaseSql` instance to terminate.
 */
export function terminate(sql: FirebaseSql): Promise<void> {
  return sql._delete();
}

/**
 * Computes a deterministic JSON instance identifier string.
 * Assumes settings have been validated!
 * @internal
 */
export function getInstanceIdentifier(
  settings: SqlServiceSettings,
  projectId: string
): string {
  const resolvedUrl = resolvePostgrestUrl(settings, projectId);
  return JSON.stringify({
    resolvedUrl,
    schemaName: settings.schemaName
  });
}

export interface FirebaseSqlRpcOptions {
  head?: boolean | undefined;
  get?: boolean | undefined;
  count?: QueryCountStrategy | undefined;
}

type FirebaseSqlState =
  | FirebaseSqlStateMutable
  | FirebaseSqlStateImmutable
  | FirebaseSqlStateTerminated;

interface FirebaseSqlStateMutable {
  name: 'mutable';
  instanceIdentifier: string;
  headers: Headers;
  authProvider: Provider<FirebaseAuthInternalName>;
  appCheckProvider: Provider<AppCheckInternalComponentName>;
}

interface FirebaseSqlStateImmutable {
  name: 'immutable';
  instanceIdentifier: string;
  abortController: AbortController;
  postgrestClient: PostgrestClient<
    UntypedDatabase,
    UntypedClientOptions,
    string,
    UntypedSchema
  >;
  context: FirebaseSqlContext;
}

interface FirebaseSqlStateTerminated {
  name: 'terminated';
}
