/**
 * @license
 * Copyright 2020 Google LLC
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

import { _getProvider, getApp } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types-exp';
import * as externs from '@firebase/auth-types-exp';

import { Dependencies } from '../../model/auth';
import { Persistence } from '../persistence';
import { _getInstance } from '../util/instantiator';
import { _castAuth, AuthImpl } from './auth_impl';

export function initializeAuth(
  app: FirebaseApp = getApp(),
  deps?: Dependencies
): externs.Auth {
  const auth = _getProvider(app, 'auth-exp').getImmediate() as AuthImpl;
  _initializeAuthInstance(auth, deps);

  return auth;
}

export function _initializeAuthInstance(
  auth: AuthImpl,
  deps?: Dependencies
): void {
  const persistence = deps?.persistence || [];
  const hierarchy = (Array.isArray(persistence)
    ? persistence
    : [persistence]
  ).map<Persistence>(_getInstance);

  // This promise is intended to float; auth initialization happens in the
  // background, meanwhile the auth object may be used by the app.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  auth._initializeWithPersistence(hierarchy, deps?.popupRedirectResolver);
}
