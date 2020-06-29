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

import * as externs from '@firebase/auth-types-exp';

import {
  Persistence,
  PersistenceType,
  PersistenceValue,
  STORAGE_AVAILABLE_KEY
} from './';

/**
 * Returns a persistence class that wraps AsyncStorage imported from
 * `react-native` or `@react-native-community/async-storage`.
 *
 * Creates a "new"-able subclass on the fly that has an empty constructor.
 *
 * In the _getInstance() implementation (see src/core/persistence/index.ts),
 * we expect each "externs.Persistence" object passed to us by the user to
 * be able to be instantiated (as a class) using "new". That function also
 * expects the constructor to be empty. Since ReactNativeStorage requires the
 * underlying storage layer, we need to be able to create subclasses
 * (closures, esentially) that have the storage layer but empty constructor.
 */

export function makeReactNativePersistence(
  storage: externs.ReactNativeAsyncStorage
): externs.Persistence {
  return class implements Persistence {
    static type: 'LOCAL' = 'LOCAL';
    readonly type: PersistenceType = PersistenceType.LOCAL;

    async isAvailable(): Promise<boolean> {
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

    set(key: string, value: PersistenceValue): Promise<void> {
      return storage.setItem(key, JSON.stringify(value));
    }

    async get<T extends PersistenceValue>(key: string): Promise<T | null> {
      const json = await storage.getItem(key);
      return json ? JSON.parse(json) : null;
    }

    remove(key: string): Promise<void> {
      return storage.removeItem(key);
    }
  };
}
