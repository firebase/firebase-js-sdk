/**
 * @license
 * Copyright 2019 Google LLC
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

import { FakePushSubscription } from './service-worker';
import { TokenDetails } from '../../interfaces/token-details';
import { arrayToBase64 } from '../../helpers/array-base64-translator';

export function getFakeTokenDetails(): TokenDetails {
  const subscription = new FakePushSubscription();

  return {
    token: 'token-value',
    createTime: 1234567890,
    subscriptionOptions: {
      swScope: '/scope-value',
      vapidKey: arrayToBase64(new TextEncoder().encode('vapid-key-value')), // 'dmFwaWQta2V5LXZhbHVl',
      endpoint: subscription.endpoint,
      auth: arrayToBase64(subscription.getKey('auth')), // 'YXV0aC12YWx1ZQ'
      p256dh: arrayToBase64(subscription.getKey('p256dh')) // 'cDI1Ni12YWx1ZQ'
    }
  };
}
