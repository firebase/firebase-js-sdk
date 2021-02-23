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

import { _getProvider, FirebaseApp } from '@firebase/app-exp';
import { Auth } from '../../model/public_types';

import { Dependencies } from '../../model/auth';
import { AuthErrorCode } from '../errors';
import { PersistenceInternal } from '../persistence';
import { _fail } from '../util/assert';
import { _getInstance } from '../util/instantiator';
import { AuthImpl } from './auth_impl';

/** @public */
export function initializeAuth(app: FirebaseApp, deps?: Dependencies): Auth {
  const provider = _getProvider(app, 'auth-exp');

  if (provider.isInitialized()) {
    const auth = provider.getImmediate() as AuthImpl;
    _fail(auth, AuthErrorCode.ALREADY_INITIALIZED);
  }

  const auth = provider.getImmediate() as AuthImpl;
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
  ).map<PersistenceInternal>(_getInstance);
  if (deps?.errorMap) {
    auth._updateErrorMap(deps.errorMap);
  }

  // This promise is intended to float; auth initialization happens in the
  // background, meanwhile the auth object may be used by the app.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  auth._initializeWithPersistence(hierarchy, deps?.popupRedirectResolver);
}
