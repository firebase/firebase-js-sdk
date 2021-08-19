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
import { clearPersistence } from './persistence';

export function reset() {
  return clearPersistence();
}

export function authInit() {
  return new Promise(resolve => {
    auth.onAuthStateChanged(() => resolve());
  });
}

export function legacyAuthInit() {
  return new Promise(resolve => {
    legacyAuth.onAuthStateChanged(() => resolve());
  });
}

export async function userSnap() {
  return auth.currentUser;
}

export async function legacyUserSnap() {
  return legacyAuth.currentUser;
}

export async function authSnap() {
  return auth;
}

export function signOut() {
  return auth.signOut();
}
