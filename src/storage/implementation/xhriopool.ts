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
 * @fileoverview Replacement for goog.net.XhrIoPool that works with fbs.XhrIo.
 */
import { XhrIo } from './xhrio';
import { NetworkXhrIo } from './xhrio_network';

/**
 * Factory-like class for creating XhrIo instances.
 */
export class XhrIoPool {
  createXhrIo(): XhrIo {
    return new NetworkXhrIo();
  }
}
