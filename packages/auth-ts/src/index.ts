/**
 * @license
 * Copyright 2017 Google Inc.
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

export { initializeAuth } from './core/initialize_auth';
export { Auth } from './model/auth';

export { Persistence } from './core/persistence';
export { indexedDBLocalPersistence } from './core/persistence/indexed_db';
export { inMemoryPersistence } from './core/persistence/in_memory';
export { browserLocalPersistence } from './core/persistence/browser_local';
export { browserSessionPersistence } from './core/persistence/browser_session';

export { signInWithRedirect } from './core/strategies/redirect';
export { signInAnonymously } from './core/strategies/anonymous';
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from './core/strategies/email_and_password';
export { signInWithCustomToken } from './core/strategies/custom_token';
