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
 * FakeSubscription Constructor.
 */
const FakeSubscription = function() {};
FakeSubscription.prototype = PushSubscription.prototype;

/**
 * @private
 * @param  {string} string String to convert to ArrayBuffer.
 * @return {ArrayBuffer} ArrayBuffer containing bytes from supplied string.
 */
const stringToArrayBuffer = string => {
  // String char codes are 16 bits (See MDN).
  const arrayBuffer = new ArrayBuffer(string.length * 2);
  const bufferView = new Uint16Array(arrayBuffer);
  for (let i = 0; i < string.length; i++) {
    bufferView[i] = string.charCodeAt(i);
  }
  return arrayBuffer;
};

/**
 * Used only in tests to make a semi-reasonable fake push subscription.
 * @param  {Object=} options Options to set on the object if desired.
 * @return {PushSubscription}              Returns a fake subscription.
 */
export default function(options = {}) {
  const fakeSub = new FakeSubscription();

  // Set endpoint
  const endpoint = (options as any).endpoint
    ? (options as any).endpoint
    : 'https://example-push-endpoint.com/';

  Object.defineProperty(fakeSub, 'endpoint', {
    value: endpoint
  });

  // Set getKey
  Object.defineProperty(fakeSub, 'getKey', {
    value: keyName => {
      let keyString = null;
      switch (keyName) {
        case 'auth': {
          keyString = (options as any).auth
            ? (options as any).auth
            : 'auth-secret';
          break;
        }
        case 'p256dh': {
          keyString = (options as any).p256dh
            ? (options as any).p256dh
            : 'the-user-public-key';
          break;
        }
        default:
          throw new Error(
            'Error from MakeFakeSubscription, unexpected ' +
              'getKey() key name: ' +
              keyName
          );
      }
      return stringToArrayBuffer(keyString);
    }
  });

  return fakeSub;
}
