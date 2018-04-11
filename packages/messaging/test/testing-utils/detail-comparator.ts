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

import { assert } from 'chai';
import { isArrayBufferEqual } from '../../src/helpers/is-array-buffer-equal';
import { TokenDetails } from '../../src/interfaces/token-details';

/** Compares the input details and the saved ones  */
export function compareDetails(input: TokenDetails, saved: TokenDetails): void {
  const subscription = {
    endpoint: input.endpoint,
    auth: input.auth,
    p256dh: input.p256dh
  };

  for (const key of Object.keys(subscription)) {
    assert.equal(
      isArrayBufferEqual(saved[key], subscription[key]),
      true,
      `${key} does not match`
    );
  }

  for (const key of Object.keys(saved)) {
    if (Object.keys(subscription).indexOf(key) !== -1) {
      return;
    }

    if (key === 'createTime') {
      assert.equal(saved[key], Date.now(), `${key} does not match`);
    } else if (key === 'vapidKey') {
      assert.equal(
        isArrayBufferEqual(saved[key].buffer, input[key].buffer),
        true,
        `${key} does not match`
      );
    } else {
      assert.equal(saved[key], input[key], `${key} does not match`);
    }
  }
}
