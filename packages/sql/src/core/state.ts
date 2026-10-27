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

import type { FirebaseSqlError } from './error';
import type { AppCheckTokenProvider } from './tokenProviders/AppCheckTokenProvider';
import type { FirebaseAuthTokenProvider } from './tokenProviders/FirebaseAuthTokenProvider';

export interface BuilderExecutionTracker {
  clientError: FirebaseSqlError | null;
}

export interface SqlClientResources {
  readonly appId: string | undefined;
  readonly authTokenProvider: FirebaseAuthTokenProvider;
  readonly appCheckTokenProvider: AppCheckTokenProvider;
}

export interface MutableSqlClientState {
  active: SqlClientResources | null;
}

export interface ReadonlySqlClientState {
  readonly active: SqlClientResources | null;
}

export type CreateBuilderFetch = (
  state: ReadonlySqlClientState,
  tracker: BuilderExecutionTracker
) => typeof fetch;

export type MapPostgrestError = (
  rawError: unknown,
  status: number,
  statusText: string
) => FirebaseSqlError;
