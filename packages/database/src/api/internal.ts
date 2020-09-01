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

import { WebSocketConnection } from '../realtime/WebSocketConnection';
import { BrowserPollConnection } from '../realtime/BrowserPollConnection';
import { Reference } from './Reference';
import { RepoManager } from '../core/RepoManager';
import { setSDKVersion } from '../core/version';
import { FirebaseApp } from '@firebase/app-types';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
import * as types from '@firebase/database-types';
import {
  Provider,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';

/**
 * INTERNAL methods for internal-use only (tests, etc.).
 *
 * Customers shouldn't use these or else should be aware that they could break at any time.
 *
 * @const
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ref.repo.persistentConnection_ as any).securityDebugCallback_ = callback;
};

export const stats = function (ref: Reference, showDelta?: boolean) {
  ref.repo.stats(showDelta);
};

export const statsIncrementCounter = function (ref: Reference, metric: string) {
  ref.repo.statsIncrementCounter(metric);
};

export const dataUpdateCount = function (ref: Reference): number {
  return ref.repo.dataUpdateCount;
};

export const interceptServerData = function (
  ref: Reference,
  callback: ((a: string, b: unknown) => void) | null
) {
  return ref.repo.interceptServerData_(callback);
};

/**
 * Used by console to create a database based on the app,
 * passed database URL and a custom auth implementation.
 *
 * @param app A valid FirebaseApp-like object
 * @param url A valid Firebase databaseURL
 * @param version custom version e.g. firebase-admin version
 * @param customAuthImpl custom auth implementation
 */
export function initStandalone<T>({
  app,
  url,
  version,
  customAuthImpl,
  namespace
}: {
  app: FirebaseApp;
  url: string;
  version: string;
  customAuthImpl: FirebaseAuthInternal;
  namespace: T;
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
    instance: RepoManager.getInstance().databaseFromApp(
      app,
      authProvider,
      url
    ) as types.Database,
    namespace
  };
}
