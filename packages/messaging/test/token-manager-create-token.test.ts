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
import { expect } from 'chai';
import * as sinon from 'sinon';
import makeFakeSWReg from './make-fake-sw-reg';
import dbTMHelper from './db-token-manager';
import TokenManager from '../src/models/token-manager';
import Errors from '../src/models/errors';
import arrayBufferToBase64 from '../src/helpers/array-buffer-to-base64';

describe('Firebase Messaging > tokenManager.createToken()', function() {
  const AUTH_BUFFER = new Uint8Array([1, 2, 3]);
  const P256DH_BUFFER = new Uint8Array([1, 2, 3]);
  const EXAMPLE_SENDER_ID = '1234567890';
  const EXAMPLE_SUBSCRIPTION = {
    endpoint: 'http://example-subscription-test.com/1234567890',
    getKey: keyName => {
      if (keyName === 'auth') {
        return AUTH_BUFFER;
      } else {
        return P256DH_BUFFER;
      }
    }
  };
  const EXAMPLE_FCM_TOKEN_DETAILS = {
    token: 'ExampleFCMToken1337',
    pushSet: 'ExampleFCMPushSet7331'
  };

  let globalTokenManager = null;
  let stubs = [];

  beforeEach(function() {
    globalTokenManager = null;
    return dbTMHelper.deleteDB();
  });

  afterEach(function() {
    stubs.forEach(stub => {
      stub.restore();
    });
    stubs = [];

    return Promise.all([
      globalTokenManager.closeDatabase(),
      dbTMHelper.closeDatabase()
    ]);
  });

  it('should test bad input', function() {
    const FakeRegistration = function() {};
    FakeRegistration.prototype = ServiceWorkerRegistration.prototype;

    const exampleSWReg = new FakeRegistration();
    const badInputs = [
      [undefined, undefined],
      [EXAMPLE_SENDER_ID, undefined],
      [undefined, exampleSWReg],
      [null, null],
      [EXAMPLE_SENDER_ID, null],
      [null, exampleSWReg],
      [{}, exampleSWReg],
      [[], exampleSWReg],
      [true, exampleSWReg],
      [1, exampleSWReg],
      ['', exampleSWReg],
      [EXAMPLE_SENDER_ID, {}],
      [EXAMPLE_SENDER_ID, []],
      [EXAMPLE_SENDER_ID, true],
      [EXAMPLE_SENDER_ID, 1],
      [EXAMPLE_SENDER_ID, '']
    ];

    globalTokenManager = new TokenManager();

    return badInputs.reduce((promiseChain, badInput) => {
      return promiseChain.then(() => {
        return globalTokenManager.createToken(badInput[0], badInput[1]).then(
          () => {
            throw new Error('Bad input should have thrown');
          },
          err => {
            switch (err.code) {
              case 'messaging/' + Errors.codes.BAD_SENDER_ID:
              case 'messaging/' + Errors.codes.SW_REGISTRATION_EXPECTED:
                break;
              default:
                throw new Error('Unexpected error thrown: ' + err.message);
            }
          }
        );
      });
    }, Promise.resolve());
  });

  it('should handle failing getSubscription', function() {
    const activatedRegistration = makeFakeSWReg('active', {
      state: 'activated'
    });

    Object.defineProperty(activatedRegistration, 'pushManager', {
      value: {
        getSubscription: () => {
          return Promise.reject('Unknown error.');
        }
      }
    });

    globalTokenManager = new TokenManager();
    return globalTokenManager
      .createToken(EXAMPLE_SENDER_ID, activatedRegistration)
      .then(
        () => {
          throw new Error('This should have rejected');
        },
        err => {
          expect(err).to.equal('Unknown error.');
        }
      );
  });

  it('should handle failing subscribe call', function() {
    const activatedRegistration = makeFakeSWReg('active', {
      state: 'activated'
    });
    Object.defineProperty(activatedRegistration, 'scope', {
      value: '/example-scope'
    });
    Object.defineProperty(activatedRegistration, 'pushManager', {
      value: {
        getSubscription: () => {
          return Promise.resolve(null);
        },
        subscribe: options => {
          return Promise.reject(new Error('Unknown Error'));
        }
      }
    });

    const subscribeStub = sinon
      .stub(TokenManager.prototype, 'subscribeToFCM')
      .callsFake(() => Promise.resolve(EXAMPLE_FCM_TOKEN_DETAILS));
    stubs.push(subscribeStub);

    globalTokenManager = new TokenManager();
    return globalTokenManager
      .createToken(EXAMPLE_SENDER_ID, activatedRegistration)
      .then(
        () => {
          throw new Error('Expected createToken to throw.');
        },
        err => {
          expect(err.message).to.equal('Unknown Error');
        }
      );
  });

  it('should use an existing subscription', function() {
    let currentSubscription = null;
    const activatedRegistration = makeFakeSWReg('active', {
      state: 'activated'
    });
    Object.defineProperty(activatedRegistration, 'scope', {
      value: '/example-scope'
    });
    Object.defineProperty(activatedRegistration, 'pushManager', {
      value: {
        getSubscription: () => {
          return Promise.resolve(currentSubscription);
        },
        subscribe: options => {
          currentSubscription = EXAMPLE_SUBSCRIPTION;
          return Promise.resolve(currentSubscription);
        }
      }
    });

    const subscribeStub = sinon
      .stub(TokenManager.prototype, 'subscribeToFCM')
      .callsFake(() => Promise.resolve(EXAMPLE_FCM_TOKEN_DETAILS));
    stubs.push(subscribeStub);

    globalTokenManager = new TokenManager();
    return globalTokenManager
      .createToken(EXAMPLE_SENDER_ID, activatedRegistration)
      .then(token => {
        expect(token).to.equal(EXAMPLE_FCM_TOKEN_DETAILS.token);
      })
      .then(() => {
        // Ensure details are saved correctly
        return dbTMHelper.getTokenDetailsFromDB();
      })
      .then(allDetails => {
        expect(allDetails.length).to.equal(1);

        const details = allDetails[0];

        expect(details.fcmPushSet).to.equal(EXAMPLE_FCM_TOKEN_DETAILS.pushSet);
        expect(details.fcmToken).to.equal(EXAMPLE_FCM_TOKEN_DETAILS.token);
        expect(details.fcmSenderId).to.equal(EXAMPLE_SENDER_ID);
        expect(details.endpoint).to.equal(EXAMPLE_SUBSCRIPTION.endpoint);
        expect(details.swScope).to.equal(activatedRegistration.scope);
        expect(details.auth).to.equal(arrayBufferToBase64(AUTH_BUFFER));
        expect(details.p256dh).to.equal(arrayBufferToBase64(P256DH_BUFFER));
      })
      .then(() => {
        return globalTokenManager.getSavedToken(
          EXAMPLE_SENDER_ID,
          activatedRegistration
        );
      })
      .then(token => {
        expect(token).to.equal(EXAMPLE_FCM_TOKEN_DETAILS.token);
      });
  });

  it('should handle valid flow', function() {
    // This tests when there is already a valid subscription as well as
    // tests when the service is already activated or moves from installing
    // state to dispatching an activate statechange event.

    // Test already activated
    const activatedRegistration = makeFakeSWReg('active', {
      state: 'activated'
    });
    Object.defineProperty(activatedRegistration, 'scope', {
      value: '/example-scope-1'
    });
    Object.defineProperty(activatedRegistration, 'pushManager', {
      value: {
        getSubscription: () => {
          return Promise.resolve(EXAMPLE_SUBSCRIPTION);
        }
      }
    });

    const swValue = {
      state: 'installing',
      addEventListener: (eventName, cb) => {
        swValue.state = 'activated';
        cb();
      },
      removeEventListener: (eventName, cb) => {
        // NOOP
      }
    };
    const installToActivateReg = makeFakeSWReg('installing', swValue);
    Object.defineProperty(installToActivateReg, 'scope', {
      value: '/example-scope-2'
    });
    Object.defineProperty(installToActivateReg, 'pushManager', {
      value: {
        getSubscription: () => {
          return Promise.resolve(EXAMPLE_SUBSCRIPTION);
        }
      }
    });

    stubs.push(
      sinon
        .stub(TokenManager.prototype, 'subscribeToFCM')
        .onCall(0)
        .returns(
          Promise.resolve({
            token: EXAMPLE_FCM_TOKEN_DETAILS.token + '1',
            pushSet: EXAMPLE_FCM_TOKEN_DETAILS.pushSet + '1'
          })
        )
        .onCall(1)
        .returns(
          Promise.resolve({
            token: EXAMPLE_FCM_TOKEN_DETAILS.token + '2',
            pushSet: EXAMPLE_FCM_TOKEN_DETAILS.pushSet + '2'
          })
        )
    );

    const validCombos = [
      {
        senderId: EXAMPLE_SENDER_ID,
        swReg: activatedRegistration,
        expectedToken: EXAMPLE_FCM_TOKEN_DETAILS.token + '1',
        expectedPushSet: EXAMPLE_FCM_TOKEN_DETAILS.pushSet + '1'
      },
      {
        senderId: EXAMPLE_SENDER_ID,
        swReg: installToActivateReg,
        expectedToken: EXAMPLE_FCM_TOKEN_DETAILS.token + '2',
        expectedPushSet: EXAMPLE_FCM_TOKEN_DETAILS.pushSet + '2'
      }
    ];

    globalTokenManager = new TokenManager();

    return validCombos.reduce((promiseChain, validCombo) => {
      return promiseChain.then(() => {
        return globalTokenManager
          .createToken(validCombo.senderId, validCombo.swReg)
          .then(token => {
            expect(token).to.equal(validCombo.expectedToken);
          })
          .then(() => {
            // Ensure details are saved correctly
            return globalTokenManager.getTokenDetailsFromToken(
              validCombo.expectedToken
            );
          })
          .then(details => {
            expect(validCombo.expectedToken).to.equal(details.fcmToken);
            expect(validCombo.expectedPushSet).to.equal(details.fcmPushSet);
            expect(validCombo.senderId).to.equal(details.fcmSenderId);
            expect(EXAMPLE_SUBSCRIPTION.endpoint).to.equal(details.endpoint);
            expect(validCombo.swReg.scope).to.equal(details.swScope);
            expect(arrayBufferToBase64(AUTH_BUFFER)).to.equal(details.auth);
            expect(arrayBufferToBase64(P256DH_BUFFER)).to.equal(details.p256dh);
          })
          .then(() => {
            return globalTokenManager.getSavedToken(
              validCombo.senderId,
              validCombo.swReg
            );
          })
          .then(token => {
            expect(validCombo.expectedToken).to.equal(token);
          });
      });
    }, Promise.resolve());
  });

  it('should handle sender ID difference', function() {
    const activatedRegistration = makeFakeSWReg('active', {
      state: 'activated'
    });
    Object.defineProperty(activatedRegistration, 'scope', {
      value: '/example-scope'
    });
    Object.defineProperty(activatedRegistration, 'pushManager', {
      value: {
        getSubscription: () => {
          return Promise.resolve(null);
        },
        subscribe: options => {
          return Promise.resolve(EXAMPLE_SUBSCRIPTION);
        }
      }
    });

    const secondDetails = {
      token: EXAMPLE_FCM_TOKEN_DETAILS.token + '2',
      pushSet: EXAMPLE_FCM_TOKEN_DETAILS.pushSet + '2'
    };
    const secondSenderId = EXAMPLE_SENDER_ID + '2';

    const methodStub = sinon.stub(TokenManager.prototype, 'subscribeToFCM');
    methodStub
      .withArgs(EXAMPLE_SENDER_ID, EXAMPLE_SUBSCRIPTION)
      .returns(Promise.resolve(EXAMPLE_FCM_TOKEN_DETAILS));
    methodStub
      .withArgs(secondSenderId, EXAMPLE_SUBSCRIPTION)
      .returns(Promise.resolve(secondDetails));
    stubs.push(methodStub);

    globalTokenManager = new TokenManager();
    return globalTokenManager
      .createToken(EXAMPLE_SENDER_ID, activatedRegistration)
      .then(token => {
        expect(EXAMPLE_FCM_TOKEN_DETAILS.token).to.equal(token);
      })
      .then(() => {
        return globalTokenManager.createToken(
          secondSenderId,
          activatedRegistration
        );
      })
      .then(token => {
        expect(secondDetails.token).to.equal(token);
      });
  });
});
