/**
 * @license
 * Copyright 2019 Google Inc.
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
import { Auth, Dependencies } from '../model/auth';
import firebase from '@firebase/app';
import { inMemoryPersistence } from './persistence/in_memory';

export function initializeAuth(
  app: FirebaseApp = firebase.app(),
  deps?: Dependencies
): Auth {
  const auth = new Auth(
    app.name,
    {
      appVerificationDisabledForTesting: false
    },
    {
      apiKey: app.options.apiKey,
      authDomain: app.options.authDomain
    }
  );
  // TODO: support multiple persistence
  deps = deps || {};
  deps.persistence = deps.persistence || inMemoryPersistence;
  // Synchronously call setPersistenec, ignoring errors
  // TODO: maybe throw error anyway?
  auth.setPersistence(deps.persistence).then(
    () => {},
    () => {}
  );
  return auth;
}
