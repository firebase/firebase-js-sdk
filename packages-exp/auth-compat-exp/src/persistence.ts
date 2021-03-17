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

import * as exp from '@firebase/auth-exp/internal';
import { isIndexedDBAvailable, isNode, isReactNative } from '@firebase/util';
import { _isWebStorageSupported, _isWorker } from './platform';

export const Persistence = {
  LOCAL: 'LOCAL',
  NONE: 'NONE',
  SESSION: 'SESSION'
};

const _assert: typeof exp._assert = exp._assert;

const PERSISTENCE_KEY = 'persistence';

/**
 * Validates that an argument is a valid persistence value. If an invalid type
 * is specified, an error is thrown synchronously.
 */
export function _validatePersistenceArgument(
  auth: exp.Auth,
  persistence: string
): void {
  _assert(
    Object.values(Persistence).includes(persistence),
    auth,
    exp.AuthErrorCode.INVALID_PERSISTENCE
  );
  // Validate if the specified type is supported in the current environment.
  if (isReactNative()) {
    // This is only supported in a browser.
    _assert(
      persistence !== Persistence.SESSION,
      auth,
      exp.AuthErrorCode.UNSUPPORTED_PERSISTENCE
    );
    return;
  }
  if (isNode()) {
    // Only none is supported in Node.js.
    _assert(
      persistence === Persistence.NONE,
      auth,
      exp.AuthErrorCode.UNSUPPORTED_PERSISTENCE
    );
    return;
  }
  if (_isWorker()) {
    // In a worker environment, either LOCAL or NONE are supported.
    // If indexedDB not supported and LOCAL provided, throw an error
    _assert(
      persistence === Persistence.NONE ||
        (persistence === Persistence.LOCAL && isIndexedDBAvailable()),
      auth,
      exp.AuthErrorCode.UNSUPPORTED_PERSISTENCE
    );
    return;
  }
  // This is restricted by what the browser supports.
  _assert(
    persistence === Persistence.NONE || _isWebStorageSupported(),
    auth,
    exp.AuthErrorCode.UNSUPPORTED_PERSISTENCE
  );
}

export async function _savePersistenceForRedirect(
  auth: exp.AuthInternal
): Promise<void> {
  await auth._initializationPromise;

  const win = getSelfWindow();
  const key = exp._persistenceKeyName(
    PERSISTENCE_KEY,
    auth.config.apiKey,
    auth.name
  );
  if (win?.sessionStorage) {
    win.sessionStorage.setItem(key, auth._getPersistence());
  }
}

export function _getPersistenceFromRedirect(
  auth: exp.AuthInternal
): exp.Persistence | null {
  const win = getSelfWindow();
  if (!win?.sessionStorage) {
    return null;
  }

  const key = exp._persistenceKeyName(
    PERSISTENCE_KEY,
    auth.config.apiKey,
    auth.name
  );
  const persistence = win.sessionStorage.getItem(key);

  switch (persistence) {
    case exp.inMemoryPersistence.type:
      return exp.inMemoryPersistence;
    case exp.indexedDBLocalPersistence.type:
      return exp.indexedDBLocalPersistence;
    case exp.browserSessionPersistence.type:
      return exp.browserSessionPersistence;
    case exp.browserLocalPersistence.type:
      return exp.browserLocalPersistence;
    default:
      return null;
  }
}

function getSelfWindow(): Window | null {
  return typeof window !== 'undefined' ? window : null;
}
