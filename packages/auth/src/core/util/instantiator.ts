/**
 * @license
 * Copyright 2020 Google LLC
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

import { debugAssert } from './assert';

/**
 * Our API has a lot of one-off constants that are used to do things.
 * Unfortunately we can't export these as classes instantiated directly since
 * the constructor may side effect and therefore can't be proven to be safely
 * culled. Instead, we export these classes themselves as a lowerCamelCase
 * constant, and instantiate them under the hood.
 */
export interface SingletonInstantiator<T> {
  new (): T;
}

const instanceCache: Map<unknown, unknown> = new Map();

export function _getInstance<T>(cls: unknown): T {
  debugAssert(cls instanceof Function, 'Expected a class definition');
  let instance = instanceCache.get(cls) as T | undefined;

  if (instance) {
    debugAssert(
      instance instanceof cls,
      'Instance stored in cache mismatched with class'
    );
    return instance;
  }

  instance = new (cls as SingletonInstantiator<T>)();
  instanceCache.set(cls, instance);
  return instance;
}

export function _clearInstanceMap(): void {
  instanceCache.clear();
}
