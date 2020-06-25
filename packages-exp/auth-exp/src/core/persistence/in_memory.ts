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

import { Persistence, PersistenceType, PersistenceValue } from '../persistence';

export class InMemoryPersistence implements Persistence {
  static type: 'NONE' = 'NONE';
  static instance: InMemoryPersistence|null = null;
  readonly type = PersistenceType.NONE;
  storage: {
    [key: string]: PersistenceValue;
  } = {};

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async set(key: string, value: PersistenceValue): Promise<void> {
    this.storage[key] = value;
  }

  async get<T extends PersistenceValue>(key: string): Promise<T | null> {
    const value = this.storage[key];
    return value === undefined ? null : (value as T);
  }

  async remove(key: string): Promise<void> {
    delete this.storage[key];
  }

  static _getInstance(): Persistence {
    if (!this.instance) {
      this.instance = new InMemoryPersistence();
    }

    return this.instance;
  }
}

export const inMemoryPersistence: externs.Persistence = InMemoryPersistence;
