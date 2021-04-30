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
import { Deferred, getGlobal } from '@firebase/util';

declare global {
  // var must be used for global scopes
  // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#type-checking-for-globalthis
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
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
  const globals = getGlobal();
  if (
    typeof globals.FIREBASE_APPCHECK_DEBUG_TOKEN !== 'string' &&
    globals.FIREBASE_APPCHECK_DEBUG_TOKEN !== true
  ) {
    return;
  }

  const debugState = getDebugState();
  debugState.enabled = true;
  const deferredToken = new Deferred<string>();
  debugState.token = deferredToken;

  if (typeof globals.FIREBASE_APPCHECK_DEBUG_TOKEN === 'string') {
    deferredToken.resolve(globals.FIREBASE_APPCHECK_DEBUG_TOKEN);
  } else {
    deferredToken.resolve(readOrCreateDebugTokenFromStorage());
  }
}
