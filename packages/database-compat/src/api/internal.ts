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
import {
  _repoManagerDatabaseFromApp,
  _setSDKVersion
} from '@firebase/database';
import * as types from '@firebase/database-types';

import { Database } from './Database';

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
  _setSDKVersion(version);

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
      _repoManagerDatabaseFromApp(
        app,
        authProvider,
        /* appCheckProvider= */ undefined,
        url,
        nodeAdmin
      ),
      app
    ) as types.Database,
    namespace
  };
}
