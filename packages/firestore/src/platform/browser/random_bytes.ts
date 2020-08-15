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

import { debugAssert } from '../../util/assert';

/**
 * Generates `nBytes` of random bytes.
 *
 * If `nBytes < 0` , an error will be thrown.
 */
export function randomBytes(nBytes: number): Uint8Array {
  debugAssert(nBytes >= 0, `Expecting non-negative nBytes, got: ${nBytes}`);

  // Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
  const crypto =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof self !== 'undefined' && (self.crypto || (self as any)['msCrypto']);
  const bytes = new Uint8Array(nBytes);
  if (crypto && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    // Falls back to Math.random
    for (let i = 0; i < nBytes; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}
