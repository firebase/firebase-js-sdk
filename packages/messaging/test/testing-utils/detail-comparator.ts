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

import { assert } from 'chai';
import { isArrayBufferEqual } from '../../src/helpers/is-array-buffer-equal';
import { TokenDetails } from '../../src/interfaces/token-details';

/** Compares the input details and the saved ones  */
export function compareDetails(input: TokenDetails, saved: TokenDetails): void {
  assert.deepEqual(Object.keys(input), Object.keys(saved));

  for (const key of Object.keys(input)) {
    switch (key) {
      case 'auth':
      case 'p256dh':
        compareArrayBuffer(input[key], saved[key], key);
        break;
      case 'vapidKey':
        compareArrayBuffer(input[key].buffer, saved[key].buffer, key);
        break;
      default:
        compare((input as any)[key], (saved as any)[key], key);
    }
  }
}

function compareArrayBuffer(
  a: ArrayBufferLike,
  b: ArrayBufferLike,
  key: string
): void {
  assert.equal(isArrayBufferEqual(a, b), true, message(key));
}

function compare(a: {}, b: {}, key: string): void {
  assert.equal(a, b, message(key));
}

function message(key: string): string {
  return `${key} does not match`;
}
