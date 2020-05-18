/**
 * @license
 * Copyright 2017 Google LLC
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

export interface Resolver<R> {
  (value?: R | Promise<R>): void;
}

export interface Rejecter {
  (reason?: Error): void;
}

export class Deferred<R> {
  promise: Promise<R>;
  // Assigned synchronously in constructor by Promise constructor callback.
  resolve!: Resolver<R>;
  reject!: Rejecter;

  constructor() {
    this.promise = new Promise((resolve: Resolver<R>, reject: Rejecter) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
