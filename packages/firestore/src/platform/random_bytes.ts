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

import { isNode, isReactNative } from '@firebase/util';

import * as browser from './browser/random_bytes';
import * as node from './node/random_bytes';
import * as rn from './rn/random_bytes';

/**
 * Generates `nBytes` of random bytes.
 *
 * If `nBytes < 0` , an error will be thrown.
 */
export function randomBytes(nBytes: number): Uint8Array {
  if (isNode()) {
    return node.randomBytes(nBytes);
  } else if (isReactNative()) {
    return rn.randomBytes(nBytes);
  } else {
    return browser.randomBytes(nBytes);
  }
}
