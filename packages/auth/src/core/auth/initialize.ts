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

import { _getProvider, FirebaseApp } from '@firebase/app';
import { deepEqual } from '@firebase/util';
import { Auth, Dependencies } from '../../model/public_types';

import { AuthErrorCode } from '../errors';
import { PersistenceInternal } from '../persistence';
import { _fail } from '../util/assert';
import { _getInstance } from '../util/instantiator';
import { AuthImpl } from './auth_impl';

/**
 * Initializes an {@link Auth} instance with fine-grained control over
 * {@link Dependencies}.
 *
 * @remarks
 *
 * This function allows more control over the {@link Auth} instance than
 * {@link getAuth}. `getAuth` uses platform-specific defaults to supply
 * the {@link Dependencies}. In general, `getAuth` is the easiest way to
 * initialize Auth and works for most use cases. Use `initializeAuth` if you
 * need control over which persistence layer is used, or to minimize bundle
 * size if you're not using either `signInWithPopup` or `signInWithRedirect`.
 *
 * For example, if your app only uses anonymous accounts and you only want
 * accounts saved for the current session, initialize `Auth` with:
 *
 * ```js
 * const auth = initializeAuth(app, {
 *   persistence: browserSessionPersistence,
 *   popupRedirectResolver: undefined,
 * });
 * ```
 *
 * @public
 */
export function initializeAuth(app: FirebaseApp, deps?: Dependencies): Auth {
  const provider = _getProvider(app, 'auth');

  if (provider.isInitialized()) {
    const auth = provider.getImmediate() as AuthImpl;
    const initialOptions = provider.getOptions() as Dependencies;
    if (deepEqual(initialOptions, deps ?? {})) {
      return auth;
    } else {
      _fail(auth, AuthErrorCode.ALREADY_INITIALIZED);
    }
  }

  const auth = provider.initialize({ options: deps }) as AuthImpl;

  return auth;
}

export function _initializeAuthInstance(
  auth: AuthImpl,
  deps?: Dependencies
): void {
  const persistence = deps?.persistence || [];
  const hierarchy = (
    Array.isArray(persistence) ? persistence : [persistence]
  ).map<PersistenceInternal>(_getInstance);
  if (deps?.errorMap) {
    auth._updateErrorMap(deps.errorMap);
  }

  // This promise is intended to float; auth initialization happens in the
  // background, meanwhile the auth object may be used by the app.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  auth._initializeWithPersistence(hierarchy, deps?.popupRedirectResolver);
}
