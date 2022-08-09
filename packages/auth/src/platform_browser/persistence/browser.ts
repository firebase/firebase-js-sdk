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

import {
  PersistenceValue,
  STORAGE_AVAILABLE_KEY,
  PersistenceType
} from '../../core/persistence';

// There are two different browser persistence types: local and session.
// Both have the same implementation but use a different underlying storage
// object.

export abstract class BrowserPersistenceClass {
  protected constructor(
    protected readonly storageRetriever: () => Storage,
    readonly type: PersistenceType
  ) {}

  _isAvailable(): Promise<boolean> {
    try {
      if (!this.storage) {
        return Promise.resolve(false);
      }
      this.storage.setItem(STORAGE_AVAILABLE_KEY, '1');
      this.storage.removeItem(STORAGE_AVAILABLE_KEY);
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  _set(key: string, value: PersistenceValue): Promise<void> {
    this.storage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  }

  _get<T extends PersistenceValue>(key: string): Promise<T | null> {
    const json = this.storage.getItem(key);
    return Promise.resolve(json ? JSON.parse(json) : null);
  }

  _remove(key: string): Promise<void> {
    this.storage.removeItem(key);
    return Promise.resolve();
  }

  protected get storage(): Storage {
    return this.storageRetriever();
  }
}
