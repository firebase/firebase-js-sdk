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

import { Persistence, PersistenceType } from '.';

const STORAGE_AVAILABLE_KEY_ = '__sak';

class BrowserLocalPersistence implements Persistence {
  type: PersistenceType = PersistenceType.LOCAL;

  async isAvailable(): Promise<boolean> {
    try {
      const storage = localStorage;
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

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

export const browserLocalPersistence: Persistence = new BrowserLocalPersistence();
