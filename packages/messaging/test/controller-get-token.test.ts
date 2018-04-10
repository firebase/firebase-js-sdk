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
import {
  ControllerInterface,
  TOKEN_EXPIRATION_MILLIS
} from '../src/controllers/controller-interface';
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
import { makeFakeApp } from './make-fake-app';
import { makeFakeSubscription } from './make-fake-subscription';
import { makeFakeSWReg } from './make-fake-sw-reg';

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

  const mockGetReg = fakeReg => {
    servicesToTest.forEach(serviceClass => {
      sandbox
        .stub(serviceClass.prototype, 'getSWRegistration_')
        .callsFake(() => fakeReg);
    });
  };

  const generateFakeReg = getSubResult => {
    const registration = makeFakeSWReg();
    Object.defineProperty(registration, 'pushManager', {
      value: {
        getSubscription: () => {
          if (typeof getSubResult === 'function') {
            return getSubResult();
          }

          return getSubResult;
        }
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

  it('should throw on unsupported browsers', () => {
    sandbox
      .stub(WindowController.prototype, 'isSupported_')
      .callsFake(() => false);

    const messagingService = new WindowController(app);
    return messagingService.getToken().then(
      () => {
        throw new Error('Expected getToken to throw ');
      },
      err => {
        assert.equal('messaging/' + ERROR_CODES.UNSUPPORTED_BROWSER, err.code);
      }
    );
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

    return servicesToTest.reduce((chain, ServiceClass) => {
      const serviceInstance = new ServiceClass(app);
      sandbox
        .stub(ServiceClass.prototype, 'getPublicVapidKey_')
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

  servicesToTest.forEach(ServiceClass => {
    vapidSetupToTest.forEach(VapidSetup => {
      it(`should get saved token in ${ServiceClass.name} for ${
        VapidSetup.name
      } VAPID setup`, () => {
        const regPromise = generateFakeReg(Promise.resolve(null));
        const subscription = makeFakeSubscription();
        mockGetReg(regPromise);

        sandbox
          .stub(ServiceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(subscription));

        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        if (VapidSetup['name'] === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
        }
        sandbox
          .stub(ServiceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        sandbox
          .stub(ControllerInterface.prototype, 'getNotificationPermission_')
          .callsFake(() => 'granted');

        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(VapidSetup['details']));

        const serviceInstance = new ServiceClass(app);
        return serviceInstance.getToken().then(token => {
          assert.equal(VapidSetup['details']['fcmToken'], token);
        });
      });
    });

    it(`should get saved token with custom VAPID in ${
      ServiceClass.name
    }`, () => {
      const registration = generateFakeReg(Promise.resolve(null));
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      sandbox
        .stub(ServiceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));
      sandbox
        .stub(ServiceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(CUSTOM_VAPID_KEY));

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => 'granted');

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID));

      const serviceInstance = new ServiceClass(app);
      return serviceInstance.getToken().then(token => {
        assert.equal(EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID['fcmToken'], token);
      });
    });
  });

  servicesToTest.forEach(ServiceClass => {
    it(`should update token in ${ServiceClass.name} every 7 days`, () => {
      const registration = generateFakeReg(Promise.resolve(null));
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => 'granted');

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_EXPIRED_TOKEN_DETAILS));

      sandbox
        .stub(ServiceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY));

      sandbox
        .stub(ServiceClass.prototype, 'getPushSubscription')
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

      const serviceInstance = new ServiceClass(app);
      return serviceInstance.getToken().then(token => {
        assert.equal(EXAMPLE_FCM_TOKEN, token);
      });
    });
  });

  servicesToTest.forEach(ServiceClass => {
    vapidSetupToTest.forEach(VapidSetup => {
      it(`should get a new token in ${ServiceClass.name} for ${
        VapidSetup.name
      } VAPID setup`, async () => {
        const regPromise = generateFakeReg(Promise.resolve(null));
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
          .stub(ServiceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(subscription));

        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        if (VapidSetup['name'] === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
        }
        sandbox
          .stub(ServiceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        sandbox
          .stub(VapidDetailsModel.prototype, 'saveVapidDetails')
          .callsFake(async () => {});

        sandbox
          .stub(IIDModel.prototype, 'getToken')
          .callsFake(() => Promise.resolve(TOKEN_DETAILS));

        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(null));

        sandbox
          .stub(TokenDetailsModel.prototype, 'saveTokenDetails')
          .callsFake(async () => {});

        const serviceInstance = new ServiceClass(app);
        const token = await serviceInstance.getToken();

        assert.equal('example-token', token);

        // Ensure save token is called in VAPID and Token model.
        assert.equal(
          VapidDetailsModel.prototype.saveVapidDetails['callCount'],
          1
        );
        const vapidModelArgs = VapidDetailsModel.prototype.saveVapidDetails[
          'getCall'
        ](0)['args'];

        assert.equal(
          TokenDetailsModel.prototype.saveTokenDetails['callCount'],
          1
        );

        const tokenModelArgs = TokenDetailsModel.prototype.saveTokenDetails[
          'getCall'
        ](0)['args'];

        const registration = await regPromise;
        assert.equal(vapidModelArgs[0], registration.scope);

        assert.equal(tokenModelArgs[0].swScope, registration.scope);
        assert.equal(
          tokenModelArgs[0].vapidKey,
          VapidSetup['details']['vapidKey']
        );

        assert.equal(tokenModelArgs[0].endpoint, ENDPOINT);
        assert.equal(isArrayBufferEqual(tokenModelArgs[0].auth, AUTH), true);
        assert.equal(
          isArrayBufferEqual(tokenModelArgs[0].p256dh, P256DH),
          true
        );
        assert.equal(tokenModelArgs[0].fcmSenderId, EXAMPLE_SENDER_ID);
        assert.equal(tokenModelArgs[0].fcmToken, TOKEN_DETAILS['token']);
        assert.equal(tokenModelArgs[0].fcmPushSet, TOKEN_DETAILS['pushSet']);
      });

      it(`should get a new token in ${
        ServiceClass.name
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

        const existingTokenDetails = VapidSetup['details'];
        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        if (VapidSetup['name'] === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
        }
        sandbox
          .stub(ServiceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        sandbox
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

        const registration = generateFakeReg(Promise.resolve(null));
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
          .stub(ServiceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(newPS));
        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(existingTokenDetails));

        const serviceInstance = new ServiceClass(app);
        return serviceInstance.getToken().then(token => {
          // make sure we call getToken and retrieve the new token.
          assert.equal('new-token', token);
          // make sure the existing token is deleted.
          assert.equal(deleteTokenStub.callCount, 1);
          // make sure the new details are saved.
          assert.equal(saveTokenDetailsStub.callCount, 1);
          assert.equal(
            VapidDetailsModel.prototype.saveVapidDetails['callCount'],
            1
          );
        });
      });
    });
  });

  servicesToTest.forEach(ServiceClass => {
    it(`should get new token if VAPID details are updated in ${
      ServiceClass.name
    }`, async () => {
      const regPromise = generateFakeReg(Promise.resolve(null));
      const subscription = makeFakeSubscription();
      mockGetReg(regPromise);

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => 'granted');

      // start with using the deault key.
      const getPublicVapidKeyStub = sandbox.stub(
        ServiceClass.prototype,
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
        .stub(ServiceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));

      const serviceInstance = new ServiceClass(app);
      const defaultVAPIDToken = await serviceInstance.getToken();
      assert.equal(
        defaultVAPIDToken,
        EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID['fcmToken']
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

  servicesToTest.forEach(ServiceClass => {
    it(`should handle update token errors in ${
      ServiceClass.name
    }`, async () => {
      const regPromise = generateFakeReg(Promise.resolve(null));
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
        .stub(ServiceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));

      sandbox
        .stub(ServiceClass.prototype, 'getPublicVapidKey_')
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

      const serviceInstance = new ServiceClass(app);
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
