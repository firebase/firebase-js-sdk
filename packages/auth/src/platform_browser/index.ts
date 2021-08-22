/**
 * @license
 * Copyright 2021 Google LLC
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

import { FirebaseApp, getApp, _getProvider } from '@firebase/app';

import { initializeAuth } from '..';
import { registerAuth } from '../core/auth/register';
import { ClientPlatform } from '../core/util/version';
import { browserLocalPersistence } from './persistence/local_storage';
import { browserSessionPersistence } from './persistence/session_storage';
import { indexedDBLocalPersistence } from './persistence/indexed_db';
import { browserPopupRedirectResolver } from './popup_redirect';
import { Auth } from '../model/public_types';

/**
 * Returns the Auth instance associated with the provided {@link @firebase/app#FirebaseApp}.
 * If no instance exists, initializes an Auth instance with platform-specific default dependencies.
 *
 * @param app - The Firebase App.
 *
 * @public
 */
export function getAuth(app: FirebaseApp = getApp()): Auth {
  const provider = _getProvider(app, 'auth');

  if (provider.isInitialized()) {
    return provider.getImmediate();
  }

  return initializeAuth(app, {
    popupRedirectResolver: browserPopupRedirectResolver,
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence
    ]
  });
}

registerAuth(ClientPlatform.BROWSER);
