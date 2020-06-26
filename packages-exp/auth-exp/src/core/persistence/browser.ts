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

// There are two different browser persistence types: local and session.
// Both have the same implementation but use a different underlying storage
// object. Using class inheritance compiles down to an es5 polyfill, which
// prevents rollup from tree shaking. By making these "methods" free floating
// functions bound to the classes, the two different types can share the
// implementation without subclassing.

interface BrowserPersistenceClass extends Persistence {
  storage: Storage;
}

function isAvailable(this: BrowserPersistenceClass): Promise<boolean> {
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

function set(
  this: BrowserPersistenceClass,
  key: string,
  value: PersistenceValue
): Promise<void> {
  this.storage.setItem(key, JSON.stringify(value));
  return Promise.resolve();
}

function get<T extends PersistenceValue>(
  this: BrowserPersistenceClass,
  key: string
): Promise<T | null> {
  const json = this.storage.getItem(key);
  return Promise.resolve(json ? JSON.parse(json) : null);
}

function remove(this: BrowserPersistenceClass, key: string): Promise<void> {
  this.storage.removeItem(key);
  return Promise.resolve();
}

class BrowserLocalPersistence implements BrowserPersistenceClass {
  static type: 'LOCAL' = 'LOCAL';
  type = PersistenceType.LOCAL;
  isAvailable = isAvailable;
  set = set;
  get = get;
  remove = remove;
  storage = localStorage;
}

class BrowserSessionPersistence implements BrowserPersistenceClass {
  static type: 'SESSION' = 'SESSION';
  type = PersistenceType.SESSION;
  isAvailable = isAvailable;
  set = set;
  get = get;
  remove = remove;
  storage = sessionStorage;
}

export const browserLocalPersistence: externs.Persistence = BrowserLocalPersistence;

export const browserSessionPersistence: externs.Persistence = BrowserSessionPersistence;
