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
import { _FirebaseNamespace, _FirebaseApp } from '@firebase/app-types/private';
import { RepoManager } from './src/core/RepoManager';
import * as types from '@firebase/database-types';
import { setSDKVersion } from './src/core/version';
import {
  Component,
  ComponentType,
  Provider,
  ComponentContainer
} from '@firebase/component';
import {
  FirebaseAuthInternalName,
  FirebaseAuthInternal
} from '@firebase/auth-interop-types';

/**
 * A one off register function which returns a database based on the app and
 * passed database URL.
 *
 * @param app A valid FirebaseApp-like object
 * @param url A valid Firebase databaseURL
 * @param version custom version e.g. firebase-admin version
 * @param customAuthImpl custom auth implementation
 */
export function initFirstParty(
  app: FirebaseApp,
  url: string,
  version: string,
  customAuthImpl: FirebaseAuthInternal
) {
  setSDKVersion(version);

  /**
   * ComponentContainer('database-admin') is just a placeholder that doesn't perform
   * any actual function.
   */
  const authProvider = new Provider<FirebaseAuthInternalName>(
    'auth-internal',
    new ComponentContainer('database-admin')
  );
  authProvider.setComponent(
    new Component('auth-internal', () => customAuthImpl, ComponentType.PRIVATE)
  );

  return RepoManager.getInstance().databaseFromApp(
    app,
    authProvider,
    url
  ) as types.Database;
}
