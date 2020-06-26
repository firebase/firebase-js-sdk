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

import { Persistence, PersistenceType, PersistenceValue, STORAGE_AVAILABLE_KEY } from './';

/**
 * Persistence class that wraps AsyncStorage imported from `react-native` or `@react-native-community/async-storage`.
 */
export class ReactNativePersistence implements Persistence {
  static type: 'LOCAL' = 'LOCAL';
  readonly type: PersistenceType = PersistenceType.LOCAL;
  private storage!: externs.ReactNativeAsyncStorage;

  private constructor() {}

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.storage) {
        return false;
      }
      await this.storage.setItem(STORAGE_AVAILABLE_KEY, '1');
      await this.storage.removeItem(STORAGE_AVAILABLE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  async set(key: string, value: PersistenceValue): Promise<void> {
    await this.storage.setItem(key, JSON.stringify(value));
  }

  async get<T extends PersistenceValue>(key: string): Promise<T | null> {
    const json = await this.storage.getItem(key);
    return json ? JSON.parse(json) : null;
  }

  async remove(key: string): Promise<void> {
    await this.storage.removeItem(key);
  }

  /**
   * Creates a "new"-able subclass on the fly that has an empty constructor.
   * 
   * In the _getInstance() implementation (see src/core/persistence/index.ts),
   * we expect each "externs.Persistence" object passed to us by the user to
   * be able to be instantiated (as a class) using "new". That function also
   * expects the constructor to be empty. Since ReactNativeStorage requires the
   * underlying storage layer, we need to be able to create subclasses 
   * (closures, esentially) that have the storage layer but empty constructor.
   * 
   * Modern JavaScript does allow anonymous classes to be created as
   * first-class objects. This would be much cleaner, but unfortunately that
   * syntax prevents rollup from tree-shaking. For that reason, we need to fall
   * back to the old-school prototype-based classing (using functions); this
   * implementation will be tree-shaken by rollup.
   */
  static createFromUnderlyingStorage(storage: externs.ReactNativeAsyncStorage): externs.Persistence {
    function instantiator(this: ReactNativePersistence): void {
      this.storage = storage;
    }

    instantiator.prototype = ReactNativePersistence.prototype;
    const afterCast = instantiator as unknown as {type: 'LOCAL'};
    afterCast.type = 'LOCAL';

    return afterCast;
  }
}
