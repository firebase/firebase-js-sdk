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
import * as object from './object';
import * as RequestExports from './request';
import { Request } from './request';
import * as constants from './constants';

/**
 * @struct
 */
export class RequestMap {
  private map_: { [key: number]: Request<any> } = {};
  private id_: number;

  constructor() {
    this.id_ = constants.minSafeInteger;
  }

  /**
   * Registers the given request with this map.
   * The request is unregistered when it completes.
   * @param r The request to register.
   */
  addRequest(r: Request<any>) {
    let id = this.id_;
    this.id_++;
    this.map_[id] = r;
    let self = this;

    function unmap() {
      delete self.map_[id];
    }
    r.getPromise().then(unmap, unmap);
  }

  /**
   * Cancels all registered requests.
   */
  clear() {
    object.forEach(this.map_, (key: string, val: Request<any>) => {
      if (val) {
        val.cancel(true);
      }
    });
    this.map_ = {};
  }
}
