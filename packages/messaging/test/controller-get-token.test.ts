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
import { assert, expect } from 'chai';
import * as sinon from 'sinon';

import { ControllerInterface } from '../src/controllers/controller-interface';
import { SWController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { isArrayBufferEqual } from '../src/helpers/is-array-buffer-equal';
import { TokenDetails } from '../src/interfaces/token-details';
import { ERROR_CODES } from '../src/models/errors';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';
import { IIDModel } from '../src/models/iid-model';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { VapidDetailsModel } from '../src/models/vapid-details-model';

import { makeFakeApp } from './testing-utils/make-fake-app';
import { makeFakeSubscription } from './testing-utils/make-fake-subscription';
import { makeFakeSWReg } from './testing-utils/make-fake-sw-reg';

const ONE_DAY = 24 * 60 * 60 * 1000;

describe('Firebase Messaging > *Controller.getToken()', () => {
  const sandbox = sinon.sandbox.create();
  const now = Date.now();
  const expiredDate = now - ONE_DAY * 8; // 8 days ago
  const FAKE_SUBSCRIPTION = makeFakeSubscription();

  const EXAMPLE_FCM_TOKEN = 'ExampleFCMToken1337';
  const EXAMPLE_SENDER_ID = '1234567890';
  const CUSTOM_VAPID_KEY = base64ToArrayBuffer(
    'BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiApwXK' +
      'pNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo'
  );
  const ENDPOINT = FAKE_SUBSCRIPTION.endpoint;
  const AUTH = FAKE_SUBSCRIPTION.getKey('auth')!;
  const P256DH = FAKE_SUBSCRIPTION.getKey('p256dh')!;

  const EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID: TokenDetails = {
    swScope: '/example-scope',
    vapidKey: DEFAULT_PUBLIC_VAPID_KEY,
    endpoint: ENDPOINT,
    auth: AUTH,
    p256dh: P256DH,
    fcmSenderId: EXAMPLE_SENDER_ID,
    fcmToken: 'qwerty1',
    fcmPushSet: '87654321',
    createTime: now
  };
  const EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID: TokenDetails = {
    swScope: '/example-scope',
    vapidKey: CUSTOM_VAPID_KEY,
    endpoint: ENDPOINT,
    auth: AUTH,
    p256dh: P256DH,
    fcmSenderId: EXAMPLE_SENDER_ID,
    fcmToken: 'qwerty2',
    fcmPushSet: '7654321',
    createTime: now
  };
  const EXAMPLE_EXPIRED_TOKEN_DETAILS: TokenDetails = {
    swScope: '/example-scope',
    vapidKey: DEFAULT_PUBLIC_VAPID_KEY,
    endpoint: ENDPOINT,
    auth: AUTH,
    p256dh: P256DH,
    fcmSenderId: EXAMPLE_SENDER_ID,
    fcmToken: 'qwerty3',
    fcmPushSet: '654321',
    createTime: expiredDate
  };

  const customVAPIDSetup = {
    name: 'custom',
    details: EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID
  };
  const defaultVAPIDSetup = {
    name: 'default',
    details: EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID
  };

  const app = makeFakeApp({
    messagingSenderId: EXAMPLE_SENDER_ID
  });

  const servicesToTest = [WindowController, SWController];
  const vapidSetupToTest = [defaultVAPIDSetup, customVAPIDSetup];

  const mockGetReg = (fakeReg: Promise<ServiceWorkerRegistration>) => {
    servicesToTest.forEach(serviceClass => {
      sandbox
        .stub(serviceClass.prototype, 'getSWRegistration_')
        .callsFake(() => fakeReg);
    });
  };

  const generateFakeReg = () => {
    const registration = makeFakeSWReg();
    Object.defineProperty(registration, 'pushManager', {
      value: {
        getSubscription: async () => null
      }
    });
    return Promise.resolve(registration);
  };

  const cleanUp = () => {
    sandbox.restore();
  };

  beforeEach(() => {
    return cleanUp();
  });

  after(() => {
    return cleanUp();
  });

  it('should handle a failure to get registration', () => {
    sandbox
      .stub(ControllerInterface.prototype, 'getNotificationPermission_')
      .callsFake(() => 'granted');

    sandbox
      .stub(navigator.serviceWorker, 'register')
      .callsFake(() => Promise.reject('No Service Worker'));

    const messagingService = new WindowController(app);
    return messagingService
      .getToken()
      .then(
        () => {
          throw new Error('Expected getToken to throw ');
        },
        err => {
          assert.equal(
            'messaging/' + ERROR_CODES.FAILED_DEFAULT_REGISTRATION,
            err.code
          );
        }
      )
      .then(() => {
        messagingService.delete();
      });
  });

  it('should handle the notification permission', () => {
    const notificationStub = sandbox.stub(
      ControllerInterface.prototype,
      'getNotificationPermission_'
    );
    notificationStub.onCall(0).returns('denied');
    notificationStub.onCall(1).returns('default');
    notificationStub.onCall(2).returns('denied');
    notificationStub.onCall(3).returns('default');

    return servicesToTest.reduce((chain, serviceClass) => {
      const serviceInstance = new serviceClass(app);
      sandbox
        .stub(serviceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY));
      return chain
        .then(() => {
          return serviceInstance.getToken();
        })
        .then(
          () => {
            throw new Error('Expected getToken to throw ');
          },
          err => {
            assert.equal(
              'messaging/' + ERROR_CODES.NOTIFICATIONS_BLOCKED,
              err.code
            );
          }
        )
        .then(() => {
          return serviceInstance.getToken();
        })
        .then(token => {
          assert.equal(null, token);
        });
    }, Promise.resolve());
  });

  servicesToTest.forEach(serviceClass => {
    vapidSetupToTest.forEach(vapidSetup => {
      it(`should get saved token in ${serviceClass.name} for ${
        vapidSetup.name
      } VAPID setup`, () => {
        const regPromise = generateFakeReg();
        const subscription = makeFakeSubscription();
        mockGetReg(regPromise);

        sandbox
          .stub(serviceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(subscription));

        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        if (vapidSetup.name === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
        }
        sandbox
          .stub(serviceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        sandbox
          .stub(ControllerInterface.prototype, 'getNotificationPermission_')
          .callsFake(() => 'granted');

        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(vapidSetup.details));

        const serviceInstance = new serviceClass(app);
        return serviceInstance.getToken().then(token => {
          assert.equal(vapidSetup.details.fcmToken, token);
        });
      });
    });

    it(`should get saved token with custom VAPID in ${
      serviceClass.name
    }`, () => {
      const registration = generateFakeReg();
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      sandbox
        .stub(serviceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));
      sandbox
        .stub(serviceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(CUSTOM_VAPID_KEY));

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => 'granted');

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID));

      const serviceInstance = new serviceClass(app);
      return serviceInstance.getToken().then(token => {
        assert.equal(EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID.fcmToken, token);
      });
    });
  });

  servicesToTest.forEach(serviceClass => {
    it(`should update token in ${serviceClass.name} every 7 days`, () => {
      const registration = generateFakeReg();
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => 'granted');

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_EXPIRED_TOKEN_DETAILS));

      sandbox
        .stub(serviceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY));

      sandbox
        .stub(serviceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));

      sandbox
        .stub(IIDModel.prototype, 'updateToken')
        .callsFake(() => Promise.resolve(EXAMPLE_FCM_TOKEN));

      sandbox
        .stub(TokenDetailsModel.prototype, 'saveTokenDetails')
        .callsFake(async () => {});

      sandbox
        .stub(VapidDetailsModel.prototype, 'saveVapidDetails')
        .callsFake(async () => {});

      const serviceInstance = new serviceClass(app);
      return serviceInstance.getToken().then(token => {
        assert.equal(EXAMPLE_FCM_TOKEN, token);
      });
    });
  });

  servicesToTest.forEach(serviceClass => {
    vapidSetupToTest.forEach(vapidSetup => {
      it(`should get a new token in ${serviceClass.name} for ${
        vapidSetup.name
      } VAPID setup`, async () => {
        const regPromise = generateFakeReg();
        const subscription = makeFakeSubscription();
        mockGetReg(regPromise);

        const TOKEN_DETAILS = {
          token: 'example-token',
          pushSet: 'example-pushSet'
        };

        sandbox
          .stub(ControllerInterface.prototype, 'getNotificationPermission_')
          .callsFake(() => 'granted');

        sandbox
          .stub(serviceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(subscription));

        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        if (vapidSetup.name === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
        }
        sandbox
          .stub(serviceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        const saveVapidDetailsStub = sandbox
          .stub(VapidDetailsModel.prototype, 'saveVapidDetails')
          .callsFake(async () => {});

        sandbox
          .stub(IIDModel.prototype, 'getToken')
          .callsFake(() => Promise.resolve(TOKEN_DETAILS));

        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(null));

        const saveTokenDetailsStub = sandbox
          .stub(TokenDetailsModel.prototype, 'saveTokenDetails')
          .callsFake(async () => {});

        const serviceInstance = new serviceClass(app);
        const token = await serviceInstance.getToken();

        assert.equal('example-token', token);

        // Ensure save token is called in VAPID and Token model.
        assert.equal(saveVapidDetailsStub.callCount, 1);
        const vapidModelArgs = saveVapidDetailsStub.getCall(0).args;

        assert.equal(saveTokenDetailsStub.callCount, 1);
        const tokenModelArgs = saveTokenDetailsStub.getCall(0).args;

        const registration = await regPromise;
        assert.equal(vapidModelArgs[0], registration.scope);

        assert.equal(tokenModelArgs[0].swScope, registration.scope);
        assert.equal(tokenModelArgs[0].vapidKey, vapidSetup.details.vapidKey);

        assert.equal(tokenModelArgs[0].endpoint, ENDPOINT);
        assert.equal(isArrayBufferEqual(tokenModelArgs[0].auth, AUTH), true);
        assert.equal(
          isArrayBufferEqual(tokenModelArgs[0].p256dh, P256DH),
          true
        );
        assert.equal(tokenModelArgs[0].fcmSenderId, EXAMPLE_SENDER_ID);
        assert.equal(tokenModelArgs[0].fcmToken, TOKEN_DETAILS.token);
        assert.equal(tokenModelArgs[0].fcmPushSet, TOKEN_DETAILS.pushSet);
      });

      it(`should get a new token in ${
        serviceClass.name
      } if PushSubscription details have changed`, () => {
        // Stubs
        const deleteTokenStub = sandbox.stub(
          TokenDetailsModel.prototype,
          'deleteToken'
        );
        const saveTokenDetailsStub = sandbox.stub(
          TokenDetailsModel.prototype,
          'saveTokenDetails'
        );
        saveTokenDetailsStub.callsFake(async () => {});

        sandbox
          .stub(ControllerInterface.prototype, 'getNotificationPermission_')
          .callsFake(() => 'granted');

        const existingTokenDetails = vapidSetup.details;
        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        if (vapidSetup.name === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
        }
        sandbox
          .stub(serviceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        const saveVapidDetailsSandbox = sandbox
          .stub(VapidDetailsModel.prototype, 'saveVapidDetails')
          .callsFake(async () => {});

        const GET_TOKEN_RESPONSE = {
          token: 'new-token',
          pushSet: 'new-pushSet'
        };
        sandbox
          .stub(IIDModel.prototype, 'getToken')
          .callsFake(() => Promise.resolve(GET_TOKEN_RESPONSE));
        sandbox
          .stub(IIDModel.prototype, 'deleteToken')
          .callsFake(async () => {});

        const registration = generateFakeReg();
        mockGetReg(Promise.resolve(registration));

        const options = {
          endpoint: 'https://different-push-endpoint.com/',
          auth: 'another-auth-secret',
          p256dh: 'another-user-public-key'
        };
        const newPS = makeFakeSubscription(options);

        deleteTokenStub.callsFake(token => {
          assert.equal(token, existingTokenDetails.fcmToken);
          return Promise.resolve(existingTokenDetails);
        });
        // The push subscription has changed since we saved the token.
        sandbox
          .stub(serviceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(newPS));
        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(existingTokenDetails));

        const serviceInstance = new serviceClass(app);
        return serviceInstance.getToken().then(token => {
          // make sure we call getToken and retrieve the new token.
          assert.equal('new-token', token);
          // make sure the existing token is deleted.
          assert.equal(deleteTokenStub.callCount, 1);
          // make sure the new details are saved.
          assert.equal(saveTokenDetailsStub.callCount, 1);
          assert.equal(saveVapidDetailsSandbox.callCount, 1);
        });
      });
    });
  });

  servicesToTest.forEach(serviceClass => {
    it(`should get new token if VAPID details are updated in ${
      serviceClass.name
    }`, async () => {
      const regPromise = generateFakeReg();
      const subscription = makeFakeSubscription();
      mockGetReg(regPromise);

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => 'granted');

      // start with using the deault key.
      const getPublicVapidKeyStub = sandbox.stub(
        serviceClass.prototype,
        'getPublicVapidKey_'
      );

      getPublicVapidKeyStub.callsFake(() =>
        Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY)
      );

      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(() => Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY));

      sandbox
        .stub(VapidDetailsModel.prototype, 'saveVapidDetails')
        .callsFake(async () => {});

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID));

      sandbox
        .stub(serviceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));

      const serviceInstance = new serviceClass(app);
      const defaultVAPIDToken = await serviceInstance.getToken();
      assert.equal(
        defaultVAPIDToken,
        EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID.fcmToken
      );

      const TOKEN_DETAILS = {
        token: EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID.fcmToken,
        pushSet: EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID.fcmPushSet
      };

      // now update the VAPID key.
      getPublicVapidKeyStub.callsFake(() => Promise.resolve(CUSTOM_VAPID_KEY));

      const saveTokenDetailsStub = sandbox.stub(
        TokenDetailsModel.prototype,
        'saveTokenDetails'
      );
      saveTokenDetailsStub.callsFake(async () => {});

      const deleteTokenStub = sandbox.stub(
        TokenDetailsModel.prototype,
        'deleteToken'
      );
      deleteTokenStub.callsFake(token => {
        assert.equal(token, EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID.fcmToken);
        return Promise.resolve(EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID);
      });

      sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

      sandbox
        .stub(IIDModel.prototype, 'getToken')
        .callsFake(() => Promise.resolve(TOKEN_DETAILS));

      const customVAPIDToken = await serviceInstance.getToken();
      expect(deleteTokenStub.callCount).equal(1);
      expect(saveTokenDetailsStub.callCount).equal(1);
      expect(customVAPIDToken).to.be.equal(
        EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID.fcmToken
      );
    });
  });

  servicesToTest.forEach(serviceClass => {
    it(`should handle update token errors in ${
      serviceClass.name
    }`, async () => {
      const regPromise = generateFakeReg();
      const subscription = makeFakeSubscription();
      mockGetReg(regPromise);

      const errorMsg = 'messaging/' + ERROR_CODES.TOKEN_UPDATE_FAILED;

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => 'granted');

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_EXPIRED_TOKEN_DETAILS));

      sandbox
        .stub(serviceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));

      sandbox
        .stub(serviceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY));

      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(() => Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY));

      sandbox
        .stub(VapidDetailsModel.prototype, 'saveVapidDetails')
        .callsFake(async () => {});

      sandbox
        .stub(IIDModel.prototype, 'updateToken')
        .callsFake(() => Promise.reject(new Error(errorMsg)));

      const deleteTokenStub = sandbox.stub(
        TokenDetailsModel.prototype,
        'deleteToken'
      );
      deleteTokenStub.callsFake(token => {
        assert.equal(token, EXAMPLE_EXPIRED_TOKEN_DETAILS.fcmToken);
        return Promise.resolve(EXAMPLE_EXPIRED_TOKEN_DETAILS);
      });

      sandbox.stub(IIDModel.prototype, 'deleteToken').callsFake(async () => {});

      const serviceInstance = new serviceClass(app);
      try {
        await serviceInstance.getToken();
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        assert.equal(errorMsg, e.message);
        expect(deleteTokenStub.callCount).equal(1);
      }
    });
  });
});
