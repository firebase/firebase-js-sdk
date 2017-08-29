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
import * as sinon from 'sinon';
import dbTMHelper from './db-token-manager';
import TokenManager from '../src/models/token-manager';
import Errors from '../src/models/errors';
import arrayBufferToBase64 from '../src/helpers/array-buffer-to-base64';

describe('Firebase Messaging > tokenManager.getSavedToken()', function() {
  let globalTokenManager = null;
  let stubs = [];

  beforeEach(function() {
    globalTokenManager = null;
    return dbTMHelper.deleteDB();
  });

  afterEach(function() {
    return Promise.all([
      globalTokenManager.closeDatabase(),
      dbTMHelper.closeDatabase()
    ]);
  });

  it('should handle bad send ID input', function() {
    const FakeRegistration = function() {};
    FakeRegistration.prototype = ServiceWorkerRegistration.prototype;

    const badInputs = ['', [], {}, true, null];
    const promises = badInputs.map(badInput => {
      globalTokenManager = new TokenManager();
      return globalTokenManager
        .getSavedToken(badInput, new FakeRegistration())
        .then(
          () => {
            throw new Error('Expected getSavedToken to reject the promise.');
          },
          err => {
            assert.equal('messaging/' + Errors.codes.BAD_SENDER_ID, err.code);
          }
        );
    });
    return Promise.all(promises);
  });

  it('should handle bad registration input', function() {
    const badInputs = ['invalid', [], {}, true, null];
    const promises = badInputs.map(badInput => {
      globalTokenManager = new TokenManager();
      return globalTokenManager.getSavedToken('1234567890', badInput).then(
        () => {
          throw new Error('Expected getSavedToken to reject the promise.');
        },
        err => {
          assert.equal(
            'messaging/' + Errors.codes.SW_REGISTRATION_EXPECTED,
            err.code
          );
        }
      );
    });
    return Promise.all(promises);
  });

  it('should handle sw mismatch', function() {
    const swScope = 'sw-scope';

    const FakeRegistration = function() {};
    FakeRegistration.prototype = ServiceWorkerRegistration.prototype;

    const registration = new FakeRegistration();
    Object.defineProperty(registration, 'scope', {
      value: swScope
    });

    globalTokenManager = new TokenManager();
    return globalTokenManager
      .getSavedToken('1234567890', registration)
      .then(token => {
        assert.equal(undefined, token);
      });
  });

  it('should handle sender ID mismatch', function() {
    const originalSenderID = '1234567890';
    const sencondSenderID = '0987654321';
    const auth = new Uint8Array([1, 2, 3]);
    const p256dh = new Uint8Array([4, 5, 6]);
    const details = {
      swScope: 'sw-scope',
      endpoint: 'http://example.google.com/',
      auth: arrayBufferToBase64(auth),
      p256dh: arrayBufferToBase64(p256dh),
      fcmToken: 'example-token',
      fcmPushSet: 'example-push-set',
      fcmSenderId: originalSenderID
    };

    dbTMHelper.addObjectToIndexDB(details);

    const FakeRegistration = function() {};
    FakeRegistration.prototype = ServiceWorkerRegistration.prototype;

    const registration = new FakeRegistration();
    Object.defineProperty(registration, 'scope', {
      value: details.swScope
    });

    // First test with no subscription
    Object.defineProperty(registration, 'pushManager', {
      value: {
        getSubscription: () => {
          return Promise.resolve({
            endpoint: details.endpoint,
            getKey: keyName => {
              if (keyName === 'auth') {
                return auth;
              } else {
                return p256dh;
              }
            }
          });
        }
      }
    });

    globalTokenManager = new TokenManager();
    return globalTokenManager
      .getSavedToken(originalSenderID, registration)
      .then(token => {
        assert.equal(details.fcmToken, token);
      })
      .then(() => {
        return globalTokenManager.getSavedToken(sencondSenderID, registration);
      })
      .then(token => {
        assert.equal(undefined, token);
      });
  });

  it('should handle subscription', function() {
    const swScope = 'sw-scope';
    const senderId = '1234567890';

    dbTMHelper.addObjectToIndexDB({
      fcmToken: 'current-token',
      fcmPushSet: 'example-push-set',
      fcmSenderId: senderId,
      swScope
    });

    const FakeRegistration = function() {};
    FakeRegistration.prototype = ServiceWorkerRegistration.prototype;

    let registration = new FakeRegistration();
    Object.defineProperty(registration, 'scope', {
      value: swScope
    });

    // First test with no subscription
    Object.defineProperty(registration, 'pushManager', {
      value: {
        getSubscription: () => {
          return Promise.resolve(null);
        }
      }
    });

    const authBuffer = new Uint8Array([1, 2, 3]);
    const p256dhBuffer = new Uint8Array([4, 5, 6]);
    globalTokenManager = new TokenManager();
    return globalTokenManager
      .getSavedToken(senderId, registration)
      .then(token => {
        assert.equal(undefined, token);

        registration = new FakeRegistration();
        Object.defineProperty(registration, 'scope', {
          value: swScope
        });
        Object.defineProperty(registration, 'pushManager', {
          value: {
            getSubscription: () => {
              return Promise.reject(new Error('Unknown service worker error'));
            }
          }
        });

        return globalTokenManager.getSavedToken(senderId, registration).then(
          () => {
            throw new Error('Expected this to reject the promise');
          },
          err => {
            assert.equal(
              'messaging/' + Errors.codes.GET_SUBSCRIPTION_FAILED,
              err.code
            );
          }
        );
      })
      .then(() => {
        // Second test with mis-match subscription
        registration = new FakeRegistration();
        Object.defineProperty(registration, 'scope', {
          value: swScope
        });
        Object.defineProperty(registration, 'pushManager', {
          value: {
            getSubscription: () => {
              return Promise.resolve({
                endpoint: 'https://fcm.google.com/fake-endpoint',
                getKey: keyName => {
                  if (keyName === 'auth') {
                    return authBuffer;
                  } else {
                    return p256dhBuffer;
                  }
                }
              });
            }
          }
        });

        dbTMHelper.updateObjectInIndexDb({
          fcmToken: 'current-token',
          fcmPushSet: 'example-push-set',
          fcmSenderId: senderId,
          endpoint: 'https://fcm.google.com/wrong-fake-endpoint',
          auth: arrayBufferToBase64(authBuffer),
          p256dh: arrayBufferToBase64(p256dhBuffer),
          swScope
        });

        return globalTokenManager.getSavedToken(senderId, registration);
      })
      .then(token => {
        assert.equal(undefined, token);

        dbTMHelper.updateObjectInIndexDb({
          fcmToken: 'current-token',
          fcmPushSet: 'example-push-set',
          fcmSenderId: senderId,
          endpoint: 'https://fcm.google.com/fake-endpoint',
          auth: arrayBufferToBase64(new Uint8Array([9, 8, 7])),
          p256dh: arrayBufferToBase64(p256dhBuffer),
          swScope
        });

        return globalTokenManager.getSavedToken(senderId, registration);
      })
      .then(token => {
        assert.equal(undefined, token);

        dbTMHelper.updateObjectInIndexDb({
          fcmToken: 'current-token',
          fcmPushSet: 'example-push-set',
          fcmSenderId: senderId,
          endpoint: 'https://fcm.google.com/fake-endpoint',
          auth: arrayBufferToBase64(authBuffer),
          p256dh: arrayBufferToBase64(new Uint8Array([9, 8, 7])),
          swScope
        });

        return globalTokenManager.getSavedToken(senderId, registration);
      })
      .then(token => {
        assert.equal(undefined, token);

        dbTMHelper.updateObjectInIndexDb({
          fcmToken: 'current-token',
          fcmPushSet: 'example-push-set',
          fcmSenderId: senderId,
          endpoint: 'https://fcm.google.com/fake-endpoint',
          auth: arrayBufferToBase64(authBuffer),
          p256dh: arrayBufferToBase64(p256dhBuffer),
          swScope
        });

        return globalTokenManager.getSavedToken(senderId, registration);
      })
      .then(token => {
        assert.equal('current-token', token);
      });
  });
});
