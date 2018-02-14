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
import arrayBufferToBase64 from '../../src/helpers/array-buffer-to-base64';
import { assert } from 'chai';

/** Token details that are fed to the database */
export declare interface InputDetails {
  swScope: string;
  vapidKey: Uint8Array;
  subscription: PushSubscription;
  fcmSenderId: string;
  fcmToken: string;
  fcmPushSet: string;
}

/** Compares the input details and the saved ones  */
export function compareDetails(
  input: InputDetails,
  saved: Object,
  now: number
): void {
  const subscriptionKeys = ['endpoint', 'auth', 'p256dh'];
  const subscriptionValues = {
    endpoint: input.subscription.endpoint,
    auth: arrayBufferToBase64(input.subscription.getKey('auth')),
    p256dh: arrayBufferToBase64(input.subscription.getKey('p256dh'))
  };

  subscriptionKeys.forEach(keyName => {
    assert.equal(saved[keyName], subscriptionValues[keyName]);
  });

  Object.keys(saved).forEach(keyName => {
    if (subscriptionKeys.indexOf(keyName) !== -1) {
      return;
    }

    if (keyName === 'createTime') {
      assert.equal(saved[keyName], now);
    } else if (keyName === 'vapidKey') {
      assert.equal(saved[keyName], arrayBufferToBase64(input[keyName]));
    } else {
      assert.equal(saved[keyName], input[keyName]);
    }
    return true;
  });
}
