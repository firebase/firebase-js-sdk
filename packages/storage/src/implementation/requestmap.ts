/**
 * @license
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
import { Request } from './request';
import * as constants from './constants';

export class RequestMap {
  private readonly map: Map<number, Request<unknown>> = new Map();
  private id: number;

  constructor() {
    this.id = constants.MIN_SAFE_INTEGER;
  }

  /**
   * Registers the given request with this map.
   * The request is unregistered when it completes.
   *
   * @param request The request to register.
   */
  addRequest(request: Request<unknown>): void {
    const id = this.id;
    this.id++;
    this.map.set(id, request);

    request
      .getPromise()
      .then(() => this.map.delete(id), () => this.map.delete(id));
  }

  /**
   * Cancels all registered requests.
   */
  clear(): void {
    this.map.forEach(v => {
      v && v.cancel(true);
    });
    this.map.clear();
  }
}
