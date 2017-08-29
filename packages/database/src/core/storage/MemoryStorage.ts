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

import { contains } from '@firebase/util';

/**
 * An in-memory storage implementation that matches the API of DOMStorageWrapper
 * (TODO: create interface for both to implement).
 *
 * @constructor
 */
export class MemoryStorage {
  private cache_: { [k: string]: any } = {};

  set(key: string, value: any | null) {
    if (value == null) {
      delete this.cache_[key];
    } else {
      this.cache_[key] = value;
    }
  }

  get(key: string): any {
    if (contains(this.cache_, key)) {
      return this.cache_[key];
    }
    return null;
  }

  remove(key: string) {
    delete this.cache_[key];
  }

  isInMemoryStorage = true;
}
