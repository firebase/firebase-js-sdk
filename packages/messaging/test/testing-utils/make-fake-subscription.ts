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

function stringToArrayBuffer(str: string): ArrayBuffer {
  // String char codes are 16 bits (See MDN).
  const arrayBuffer = new ArrayBuffer(str.length * 2);
  const bufferView = new Uint16Array(arrayBuffer);
  for (let i = 0; i < str.length; i++) {
    bufferView[i] = str.charCodeAt(i);
  }
  return arrayBuffer;
}

/**
 * Used only in tests to make a semi-reasonable fake push subscription.
 * @param options Options to set on the object if desired.
 * @return Returns a fake subscription.
 */
export function makeFakeSubscription(options: any = {}): PushSubscription {
  const fakeSubscription = ((() => {}) as any) as {
    new (): PushSubscription;
  };
  fakeSubscription.prototype = PushSubscription.prototype;

  const fakeSub = new fakeSubscription();

  // Set endpoint
  const endpoint = options.endpoint
    ? options.endpoint
    : 'https://example-push-endpoint.com/';

  Object.defineProperty(fakeSub, 'endpoint', {
    value: endpoint
  });

  // Set getKey
  Object.defineProperty(fakeSub, 'getKey', {
    value: (keyName: string) => {
      let keyString = null;
      switch (keyName) {
        case 'auth': {
          keyString = options.auth ? options.auth : 'auth-secret';
          break;
        }
        case 'p256dh': {
          keyString = options.p256dh ? options.p256dh : 'the-user-public-key';
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
