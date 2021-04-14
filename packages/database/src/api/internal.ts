/**
 * @license
 * Copyright 2017 Google LLC
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

import { FirebaseApp } from '@firebase/app-types';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
import {
  Component,
  ComponentContainer,
  ComponentType,
  Provider
} from '@firebase/component';
import * as types from '@firebase/database-types';

import { _repoManagerDatabaseFromApp } from '../../exp/index';
import {
  repoInterceptServerData,
  repoStats,
  repoStatsIncrementCounter
} from '../core/Repo';
import { setSDKVersion } from '../core/version';
import { BrowserPollConnection } from '../realtime/BrowserPollConnection';
import { WebSocketConnection } from '../realtime/WebSocketConnection';

import { Database } from './Database';
import { Reference } from './Reference';

/**
 * INTERNAL methods for internal-use only (tests, etc.).
 *
 * Customers shouldn't use these or else should be aware that they could break at any time.
 */

export const forceLongPolling = function () {
  WebSocketConnection.forceDisallow();
  BrowserPollConnection.forceAllow();
};

export const forceWebSockets = function () {
  BrowserPollConnection.forceDisallow();
};

/* Used by App Manager */
export const isWebSocketsAvailable = function (): boolean {
  return WebSocketConnection['isAvailable']();
};

export const setSecurityDebugCallback = function (
  ref: Reference,
  callback: (a: object) => void
) {
  const connection = ref._delegate._repo.persistentConnection_;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (connection as any).securityDebugCallback_ = callback;
};

export const stats = function (ref: Reference, showDelta?: boolean) {
  repoStats(ref._delegate._repo, showDelta);
};

export const statsIncrementCounter = function (ref: Reference, metric: string) {
  repoStatsIncrementCounter(ref._delegate._repo, metric);
};

export const dataUpdateCount = function (ref: Reference): number {
  return ref._delegate._repo.dataUpdateCount;
};

export const interceptServerData = function (
  ref: Reference,
  callback: ((a: string, b: unknown) => void) | null
) {
  return repoInterceptServerData(ref._delegate._repo, callback);
};

/**
 * Used by console to create a database based on the app,
 * passed database URL and a custom auth implementation.
 *
 * @param app - A valid FirebaseApp-like object
 * @param url - A valid Firebase databaseURL
 * @param version - custom version e.g. firebase-admin version
 * @param customAuthImpl - custom auth implementation
 */
export function initStandalone<T>({
  app,
  url,
  version,
  customAuthImpl,
  namespace,
  nodeAdmin = false
}: {
  app: FirebaseApp;
  url: string;
  version: string;
  customAuthImpl: FirebaseAuthInternal;
  namespace: T;
  nodeAdmin?: boolean;
}): {
  instance: types.Database;
  namespace: T;
} {
  setSDKVersion(version);

  /**
   * ComponentContainer('database-standalone') is just a placeholder that doesn't perform
   * any actual function.
   */
  const authProvider = new Provider<FirebaseAuthInternalName>(
    'auth-internal',
    new ComponentContainer('database-standalone')
  );
  authProvider.setComponent(
    new Component('auth-internal', () => customAuthImpl, ComponentType.PRIVATE)
  );

  return {
    instance: new Database(
      _repoManagerDatabaseFromApp(app, authProvider, url, nodeAdmin),
      app
    ) as types.Database,
    namespace
  };
}
