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
import * as object from './object';
import { Request } from './request';
import * as constants from './constants';

/**
 * @struct
 */
export class RequestMap {
  private map_: { [key: number]: Request<unknown> } = {};
  private id_: number;

  constructor() {
    this.id_ = constants.MIN_SAFE_INTEGER;
  }

  /**
   * Registers the given request with this map.
   * The request is unregistered when it completes.
   * @param r The request to register.
   */
  addRequest(r: Request<unknown>): void {
    const id = this.id_;
    this.id_++;
    this.map_[id] = r;
    const self = this;

    function unmap(): void {
      delete self.map_[id];
    }
    r.getPromise().then(unmap, unmap);
  }

  /**
   * Cancels all registered requests.
   */
  clear(): void {
    object.forEach(this.map_, (_key: string, val: Request<unknown>) => {
      if (val) {
        val.cancel(true);
      }
    });
    this.map_ = {};
  }
}
