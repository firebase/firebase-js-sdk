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

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { mapPostgrestFailureToFirebaseSqlError } from '../core/errorMapper';
import {
  normalizeHeaders,
  SqlServiceSettings,
  validateSqlServiceSettings
} from '../core/settings';
import type {
  BuilderExecutionTracker,
  MutableSqlClientState
} from '../core/state';
import { AppCheckProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { createBuilderFetch } from '../network';
import { FIREBASE_SQL_COMPONENT_NAME } from '../util/constants';
import { deepSortKeysForObj } from '../util/encoder';
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

interface UntypedClientOptions {
  PostgrestVersion: '13';
}

interface UntypedRelationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

interface UntypedTable {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: UntypedRelationship[];
}

interface UntypedFunction {
  Args: Record<string, unknown>;
  Returns: unknown;
}

interface UntypedSchema {
  Tables: Record<string, UntypedTable>;
  Views: Record<string, UntypedTable>;
  Functions: Record<string, UntypedFunction>;
}

interface UntypedDatabase {
  [schema: string]: UntypedSchema;
}

export interface FirebaseSqlRpcOptions {
  head?: boolean | undefined;
  get?: boolean | undefined;
  count?: QueryCountStrategy | undefined;
}

/**
 * The Firebase SQL service client instance.
 */
export class FirebaseSql {
  /** @internal */
  readonly _postgrestUrl: string;

  /** @internal */
  private readonly _state: MutableSqlClientState;

  readonly #postgrestClient: PostgrestClient<
    UntypedDatabase,
    UntypedClientOptions,
    string,
    UntypedSchema
  >;

  /** @internal */
  constructor(
    /** The bound FirebaseApp instance. */
    readonly app: FirebaseApp,
    /** Resolved configuration settings. */
    readonly settings: SqlServiceSettings,
    /** @internal */
    readonly _instanceIdentifier: string,
    /** @internal */
    private authInternalProvider: Provider<FirebaseAuthInternalName>,
    /** @internal */
    private appCheckInternalProvider: Provider<AppCheckInternalComponentName>
  ) {
    this._postgrestUrl = resolvePostgrestUrl(
      this.settings,
      app.options.projectId!
    );

    this._state = {
      active: {
        appId: app.options.appId,
        authTokenProvider: new FirebaseAuthProvider(app, authInternalProvider),
        appCheckTokenProvider: new AppCheckProvider(
          app,
          appCheckInternalProvider
        )
      }
    };

    this.#postgrestClient = new PostgrestClient<
      UntypedDatabase,
      UntypedClientOptions,
      string,
      UntypedSchema
    >(this._postgrestUrl, {
      headers: this.settings.headers,
      schema: this.settings.schemaName
    });
  }

  /** @internal */
  _delete(): Promise<void> {
    if (this._state.active !== null) {
      const active = this._state.active;
      this._state.active = null;
      active.appCheckTokenProvider.terminate();
      active.authTokenProvider.terminate();
      _removeServiceInstance(
        this.app,
        FIREBASE_SQL_COMPONENT_NAME,
        this._instanceIdentifier
      );
    }
    return Promise.resolve();
  }

  // Encode table and RPC names so `/`, `?`, `#`, and dot-segments cannot traverse out of
  // `/postgrest` or inject query parameters on the shared `firebasedataconnect.googleapis.com`
  // origin (deviating from `PostgrestClient`'s raw URL interpolation while leaving blank
  // `from('')` inputs untouched so `@supabase/postgrest-js`'s raw `Error` still propagates).
  #encodeResourceSegment(segment: string, preserveBlank: boolean): string {
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
    if (this._state.active === null) {
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'FirebaseSql instance has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    const delegate = this.#postgrestClient.from(
      this.#encodeResourceSegment(table, true)
    );
    return new QueryBuilderImpl(
      delegate,
      this._state,
      createBuilderFetch,
      mapPostgrestFailureToFirebaseSqlError
    );
  }

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
    if (this._state.active === null) {
      throw new FirebaseSqlError(
        Code.NOT_INITIALIZED,
        'FirebaseSql instance has been terminated.',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
    // PostgrestClient.rpc snapshots `this.fetch` synchronously into the newly
    // constructed PostgrestFilterBuilder, giving each RPC call an isolated tracker.
    const tracker: BuilderExecutionTracker = { clientError: null };
    this.#postgrestClient.fetch = createBuilderFetch(this._state, tracker);
    const delegate = this.#postgrestClient.rpc(
      this.#encodeResourceSegment(fn, false),
      params as Record<string, unknown> | undefined,
      options
    );
    return new FilterBuilderImpl<unknown, 'RPC'>(
      delegate,
      this._state,
      tracker,
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
    return provider.getImmediate({ identifier: instanceIdentifier });
  }

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
 * Computes a deterministic, normalized JSON instance identifier string.
 * @internal
 */
export function getInstanceIdentifier(
  settings: SqlServiceSettings,
  projectId: string
): string {
  const resolvedUrl = resolvePostgrestUrl(settings, projectId);
  const headers = normalizeHeaders(settings.headers);
  return JSON.stringify(
    deepSortKeysForObj({
      resolvedUrl,
      schemaName: settings.schemaName,
      headers
    })
  );
}
