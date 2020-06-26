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

export enum PersistenceType {
  SESSION = 'SESSION',
  LOCAL = 'LOCAL',
  NONE = 'NONE'
}

export interface PersistedBlob {
  [key: string]: unknown;
}

export interface Instantiator<T> {
  (blob: PersistedBlob): T;
}

export type PersistenceValue = PersistedBlob | string;

export const STORAGE_AVAILABLE_KEY = '__sak';

export interface Persistence {
  type: PersistenceType;
  isAvailable(): Promise<boolean>;
  set(key: string, value: PersistenceValue): Promise<void>;
  get<T extends PersistenceValue>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
}

/**
 * We can't directly export all of the different types of persistence as
 * constants: this would cause tree-shaking libraries to keep all of the
 * various persistence classes in the bundle, even if they're not used, since
 * the system can't prove those constructors don't side-effect. Instead, the
 * persistence classes themselves all have a static method called _getInstance()
 * which does the instantiation.
 */
export interface PersistenceInstantiator extends externs.Persistence {
  new (): Persistence;
}

const persistenceCache: Map<externs.Persistence, Persistence> = new Map();

export function _getInstance(cls: externs.Persistence): Persistence {
  if (persistenceCache.has(cls)) {
    return persistenceCache.get(cls)!;
  }

  const persistence = new (cls as PersistenceInstantiator)();
  persistenceCache.set(cls, persistence);
  return persistence;
}