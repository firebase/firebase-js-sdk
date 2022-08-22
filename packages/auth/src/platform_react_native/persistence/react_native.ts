/**
 * @license
 * Copyright 2019 Google LLC
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

import { Persistence, ReactNativeAsyncStorage } from '../../model/public_types';

import {
  PersistenceInternal,
  PersistenceType,
  PersistenceValue,
  STORAGE_AVAILABLE_KEY,
  StorageEventListener
} from '../../core/persistence';

/**
 * Returns a persistence object that wraps `AsyncStorage` imported from
 * `react-native` or `@react-native-community/async-storage`, and can
 * be used in the persistence dependency field in {@link initializeAuth}.
 *
 * @public
 */
export function getReactNativePersistence(
  storage: ReactNativeAsyncStorage
): Persistence {
  // In the _getInstance() implementation (see src/core/persistence/index.ts),
  // we expect each "externs.Persistence" object passed to us by the user to
  // be able to be instantiated (as a class) using "new". That function also
  // expects the constructor to be empty. Since ReactNativeStorage requires the
  // underlying storage layer, we need to be able to create subclasses
  // (closures, esentially) that have the storage layer but empty constructor.
  return class implements PersistenceInternal {
    static type: 'LOCAL' = 'LOCAL';
    readonly type: PersistenceType = PersistenceType.LOCAL;

    async _isAvailable(): Promise<boolean> {
      try {
        if (!storage) {
          return false;
        }
        await storage.setItem(STORAGE_AVAILABLE_KEY, '1');
        await storage.removeItem(STORAGE_AVAILABLE_KEY);
        return true;
      } catch {
        return false;
      }
    }

    _set(key: string, value: PersistenceValue): Promise<void> {
      return storage.setItem(key, JSON.stringify(value));
    }

    async _get<T extends PersistenceValue>(key: string): Promise<T | null> {
      const json = await storage.getItem(key);
      return json ? JSON.parse(json) : null;
    }

    _remove(key: string): Promise<void> {
      return storage.removeItem(key);
    }

    _addListener(_key: string, _listener: StorageEventListener): void {
      // Listeners are not supported for React Native storage.
      return;
    }

    _removeListener(_key: string, _listener: StorageEventListener): void {
      // Listeners are not supported for React Native storage.
      return;
    }
  };
}
