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

import { getDebugState } from './state';
import { readOrCreateDebugTokenFromStorage } from './storage';
import { Deferred } from '@firebase/util';

declare global {
  interface Window {
    /**
     * When it is a string, we treat it as the debug token and give it to consumers as the app check token
     * When it is `true`, we will try to read the debug token from the indexeddb,
     *      if it doesn't exist, create one, print it to console, and ask developers to register it in the Firebase console.
     * When it is `undefined`, `false` or any unsupported value type, the SDK will operate in production mode
     */
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

export function isDebugMode(): boolean {
  const debugState = getDebugState();
  return debugState.enabled;
}

export async function getDebugToken(): Promise<string> {
  const state = getDebugState();

  if (state.enabled && state.token) {
    return state.token.promise;
  } else {
    // should not happen!
    throw Error(`
            Can't get debug token in production mode.
        `);
  }
}

export function initializeDebugMode(): void {
  if (
    typeof self.FIREBASE_APPCHECK_DEBUG_TOKEN !== 'string' &&
    self.FIREBASE_APPCHECK_DEBUG_TOKEN !== true
  ) {
    return;
  }

  const debugState = getDebugState();
  debugState.enabled = true;
  const deferredToken = new Deferred<string>();
  debugState.token = deferredToken;

  if (typeof self.FIREBASE_APPCHECK_DEBUG_TOKEN === 'string') {
    deferredToken.resolve(self.FIREBASE_APPCHECK_DEBUG_TOKEN);
  } else {
    deferredToken.resolve(readOrCreateDebugTokenFromStorage());
  }
}
