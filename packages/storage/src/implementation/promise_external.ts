/**
* Copyright 2017 Google Inc.
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

/**
 * @fileoverview Implements the promise abstraction interface for external
 * (public SDK) packaging, which just passes through to the firebase-app impl.
 */

/**
 * @template T
 * @param {function((function(T): void),
 *                  (function(!Error): void))} resolver
 */

export function make<T>(
  resolver: (p1: (p1: T) => void, p2: (p1: Error) => void) => void
): Promise<T> {
  return new Promise(resolver);
}

/**
 * @template T
 */
export function resolve<T>(value: T): Promise<T> {
  return Promise.resolve(value) as Promise<T>;
}

export function reject<T>(error: Error): Promise<T> {
  return Promise.reject(error) as Promise<T>;
}
