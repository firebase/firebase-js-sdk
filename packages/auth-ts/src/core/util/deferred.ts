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

/**
 * A Promise implementation that supports deferred resolution.
 *
 * TODO: merge this with the one in @firebase/util
 *
 * @private
 */
export class Deferred<R> {
  promise: Promise<R>;
  resolve: (value?: R | Promise<R>) => void = () => {};
  reject: (reason?: Error) => void = () => {};

  constructor() {
    this.promise = new Promise(
      (
        resolve: (value?: R | Promise<R>) => void,
        reject: (reason?: Error) => void
      ) => {
        this.resolve = resolve;
        this.reject = reject;
      }
    );
  }
}
