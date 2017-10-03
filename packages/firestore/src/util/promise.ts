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

import { AnyDuringMigration } from './misc';

export interface Resolver<R> {
  (value?: R | Promise<R>): void;
}

// tslint:disable-next-line:no-any
export interface Rejecter {
  (value?: any): void;
}

export class Deferred<R> {
  promise: Promise<R>;
  resolve: Resolver<R>;
  reject: Rejecter;

  constructor() {
    this.promise = new Promise((resolve: Resolver<R>, reject: Rejecter) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

/**
 * Takes an array of values and sequences them using the promise (or value)
 * returned by the supplied callback. The callback for each item is called
 * after the promise is resolved for the previous item.
 * The function returns a promise which is resolved after the promise for
 * the last item is resolved.
 */
export function sequence<T, R>(
  values: T[],
  fn: (value: T, result?: R) => R | Promise<R>,
  initialValue?: R
): Promise<R> {
  let result = Promise.resolve(initialValue);
  values.forEach(value => {
    result = result.then(lastResult => fn(value, lastResult));
  });
  return result as AnyDuringMigration;
}
