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

import { ReactNativeAsyncStorage } from '@firebase/auth-types-exp';

import { Persistence, PersistenceType, PersistenceValue, STORAGE_AVAILABLE_KEY } from './';

/**
 * Persistence class that wraps AsyncStorage imported from `react-native` or `@react-native-community/async-storage`.
 */
export class ReactNativePersistence implements Persistence {
  readonly type: PersistenceType = PersistenceType.LOCAL;

  constructor(private readonly storage: ReactNativeAsyncStorage) {}

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
}
