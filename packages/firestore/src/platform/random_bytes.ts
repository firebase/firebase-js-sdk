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

import { isNode, isReactNative } from '@firebase/util';
import { randomBytes as nodeRandomBytes } from './node/random_bytes';
import { randomBytes as rnRandomBytes } from './rn/random_bytes';
import { randomBytes as browserRandomBytes } from './browser/random_bytes';

/**
 * Generates `nBytes` of random bytes.
 *
 * If `nBytes < 0` , an error will be thrown.
 */
export function randomBytes(nBytes: number): Uint8Array {
  if (isNode()) {
    return nodeRandomBytes(nBytes);
  } else if (isReactNative()) {
    return rnRandomBytes(nBytes);
  } else {
    return browserRandomBytes(nBytes);
  }
}
