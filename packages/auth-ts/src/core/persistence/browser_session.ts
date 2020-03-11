/**
 * @license
 * Copyright 2019 Google Inc.
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
  Persistence,
  PersistenceType,
  PersistenceValue,
  Instantiator
} from '../persistence';

const STORAGE_AVAILABLE_KEY_ = '__sak';

class BrowserSessionPersistence implements Persistence {
  type: PersistenceType = PersistenceType.SESSION;

  async isAvailable(): Promise<boolean> {
    try {
      const storage = sessionStorage;
      if (!storage) {
        return false;
      }
      storage.setItem(STORAGE_AVAILABLE_KEY_, '1');
      storage.removeItem(STORAGE_AVAILABLE_KEY_);
      return true;
    } catch (e) {
      return false;
    }
  }

  async set(key: string, value: PersistenceValue): Promise<void> {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  async get<T extends PersistenceValue>(
    key: string,
    instantiator?: Instantiator<T>
  ): Promise<T | null> {
    const json = await sessionStorage.getItem(key);
    const obj = json ? JSON.parse(json) : null;
    return instantiator && obj ? instantiator(obj) : obj;
  }

  async remove(key: string): Promise<void> {
    sessionStorage.removeItem(key);
  }
}

export const browserSessionPersistence: Persistence = new BrowserSessionPersistence();
