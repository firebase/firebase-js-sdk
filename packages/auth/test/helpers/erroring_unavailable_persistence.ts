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

import {
  PersistenceInternal,
  PersistenceType,
  PersistenceValue
} from '../../src/core/persistence';

const PERMISSION_ERROR =
  typeof window !== 'undefined'
    ? new DOMException(
        'Failed to read this storage class from the Window; access is denied'
      )
    : new Error('This is Node.');

/**
 * Helper class for mocking completely broken persistence that errors when
 * accessed.
 *
 * When disabling cookies in Chrome entirely, for example, simply reading the
 * "localStorage" field in "window" will throw an error, but this can't be
 * checked for by calling `'localStorage' in window`. This class simulates a
 * situation where _isAvailable works correctly but all other methods fail.
 */
export class ErroringUnavailablePersistence implements PersistenceInternal {
  type = PersistenceType.NONE;
  async _isAvailable(): Promise<boolean> {
    return false;
  }
  async _set(): Promise<void> {
    throw PERMISSION_ERROR;
  }
  async _get<T extends PersistenceValue>(): Promise<T | null> {
    throw PERMISSION_ERROR;
  }
  async _remove(): Promise<void> {
    throw PERMISSION_ERROR;
  }
  _addListener(): void {
    throw PERMISSION_ERROR;
  }
  _removeListener(): void {
    throw PERMISSION_ERROR;
  }
  _shouldAllowMigration = false;
}
