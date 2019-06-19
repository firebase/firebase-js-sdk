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
import { assert, expect } from 'chai';
import * as sinon from 'sinon';

import { FirebaseApp } from '@firebase/app-types';

import { BaseController } from '../src/controllers/base-controller';
import { SwController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { isArrayBufferEqual } from '../src/helpers/is-array-buffer-equal';
import { TokenDetails } from '../src/interfaces/token-details';
import { ErrorCode } from '../src/models/errors';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';
import { IidModel } from '../src/models/iid-model';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { VapidDetailsModel } from '../src/models/vapid-details-model';

import { makeFakeApp } from './testing-utils/make-fake-app';
import { makeFakeSubscription } from './testing-utils/make-fake-subscription';
import { makeFakeSWReg } from './testing-utils/make-fake-sw-reg';

const ONE_DAY = 24 * 60 * 60 * 1000;

describe('Firebase Messaging > *Controller.getToken()', () => {
  const servicesToTest = [WindowController, SwController];
  const vapidSetupToTest = ['default', 'custom'];

  function mockGetReg(fakeReg: Promise<ServiceWorkerRegistration>): void {
    servicesToTest.forEach(serviceClass => {
      sandbox
        .stub(serviceClass.prototype, 'getSWRegistration_')
        .callsFake(() => fakeReg);
    });
  }

  function generateFakeReg(): Promise<ServiceWorkerRegistration> {
    const registration = makeFakeSWReg();
    Object.defineProperty(registration, 'pushManager', {
      value: {
        getSubscription: async () => null
      }
    });
    return Promise.resolve(registration);
  }

  let sandbox: sinon.SinonSandbox;

  let now: number;
  let expiredDate: number;

  let EXAMPLE_FCM_TOKEN: string;
  let EXAMPLE_SENDER_ID: string;
  let CUSTOM_VAPID_KEY: Uint8Array;
  let ENDPOINT: string;
  let AUTH: ArrayBuffer;
  let P256DH: ArrayBuffer;

  let EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID: TokenDetails;
  let EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID: TokenDetails;
  let EXAMPLE_EXPIRED_TOKEN_DETAILS: TokenDetails;

  let app: FirebaseApp;

  beforeEach(() => {
    now = Date.now();
    expiredDate = now - ONE_DAY * 8; // 8 days ago

    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers(now);

    const FAKE_SUBSCRIPTION = makeFakeSubscription();

    EXAMPLE_FCM_TOKEN = 'ExampleFCMToken1337';
    EXAMPLE_SENDER_ID = '1234567890';
    CUSTOM_VAPID_KEY = base64ToArrayBuffer(
      'BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiApwXK' +
        'pNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo'
    );
    ENDPOINT = FAKE_SUBSCRIPTION.endpoint;
    AUTH = FAKE_SUBSCRIPTION.getKey('auth')!;
    P256DH = FAKE_SUBSCRIPTION.getKey('p256dh')!;

    EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID = {
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
    EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID = {
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
    EXAMPLE_EXPIRED_TOKEN_DETAILS = {
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

    app = makeFakeApp({
      messagingSenderId: EXAMPLE_SENDER_ID
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should handle a failure to get registration', async () => {
    sandbox
      .stub(BaseController.prototype, 'getNotificationPermission_')
      .callsFake(() => 'granted');

    sandbox
      .stub(navigator.serviceWorker, 'register')
      .callsFake(() => Promise.reject('No Service Worker'));

    const messagingService = new WindowController(app);
    try {
      await messagingService.getToken();
      throw new Error('Expected getToken to throw ');
    } catch (err) {
      assert.equal(
        'messaging/' + ErrorCode.FAILED_DEFAULT_REGISTRATION,
        err.code
      );
    }
    await messagingService.delete();
  });

  it('should handle the notification permission', () => {
    const notificationStub = sandbox.stub(
      BaseController.prototype,
      'getNotificationPermission_'
    );
    notificationStub.onCall(0).returns('denied');
    notificationStub.onCall(1).returns('default');
    notificationStub.onCall(2).returns('denied');
    notificationStub.onCall(3).returns('default');

    return servicesToTest.reduce(async (chain, serviceClass) => {
      const serviceInstance = new serviceClass(app);
      sandbox
        .stub(serviceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY));
      try {
        await chain;
        await serviceInstance.getToken();
        throw new Error('Expected getToken to throw ');
      } catch (err) {
        assert.equal('messaging/' + ErrorCode.NOTIFICATIONS_BLOCKED, err.code);
      }
      const token = await serviceInstance.getToken();
      assert.equal(null, token);
    }, Promise.resolve());
  });

  servicesToTest.forEach(serviceClass => {
    vapidSetupToTest.forEach(vapidSetup => {
      it(`should get saved token in ${
        serviceClass.name
      } for ${vapidSetup} VAPID setup`, async () => {
        const regPromise = generateFakeReg();
        const subscription = makeFakeSubscription();
        mockGetReg(regPromise);

        sandbox
          .stub(serviceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(subscription));

        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        let details = EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID;
        if (vapidSetup === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
          details = EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID;
        }

        sandbox
          .stub(serviceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        sandbox
          .stub(BaseController.prototype, 'getNotificationPermission_')
          .callsFake(() => 'granted');

        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(details));

        const serviceInstance = new serviceClass(app);
        const token = await serviceInstance.getToken();
        assert.equal(details.fcmToken, token);
      });
    });

    it(`should get saved token with custom VAPID in ${
      serviceClass.name
    }`, async () => {
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
        .stub(BaseController.prototype, 'getNotificationPermission_')
        .callsFake(() => 'granted');

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID));

      const serviceInstance = new serviceClass(app);
      const token = await serviceInstance.getToken();
      assert.equal(EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID.fcmToken, token);
    });
  });

  servicesToTest.forEach(serviceClass => {
    it(`should update token in ${serviceClass.name} every 7 days`, async () => {
      const registration = generateFakeReg();
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      sandbox
        .stub(BaseController.prototype, 'getNotificationPermission_')
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
        .stub(IidModel.prototype, 'updateToken')
        .callsFake(() => Promise.resolve(EXAMPLE_FCM_TOKEN));

      sandbox
        .stub(TokenDetailsModel.prototype, 'saveTokenDetails')
        .callsFake(async () => {});

      sandbox
        .stub(VapidDetailsModel.prototype, 'saveVapidDetails')
        .callsFake(async () => {});

      const serviceInstance = new serviceClass(app);
      const token = await serviceInstance.getToken();
      assert.equal(EXAMPLE_FCM_TOKEN, token);
    });
  });

  servicesToTest.forEach(serviceClass => {
    vapidSetupToTest.forEach(vapidSetup => {
      it(`should get a new token in ${
        serviceClass.name
      } for ${vapidSetup} VAPID setup`, async () => {
        const regPromise = generateFakeReg();
        const subscription = makeFakeSubscription();
        mockGetReg(regPromise);

        const TOKEN_DETAILS = {
          token: 'example-token',
          pushSet: 'example-pushSet'
        };

        sandbox
          .stub(BaseController.prototype, 'getNotificationPermission_')
          .callsFake(() => 'granted');

        sandbox
          .stub(serviceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(subscription));

        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        let details = EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID;
        if (vapidSetup === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
          details = EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID;
        }

        sandbox
          .stub(serviceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        const saveVapidDetailsStub = sandbox
          .stub(VapidDetailsModel.prototype, 'saveVapidDetails')
          .callsFake(async () => {});

        sandbox
          .stub(IidModel.prototype, 'getToken')
          .callsFake(() => Promise.resolve(TOKEN_DETAILS));

        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(undefined));

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
        assert.equal(tokenModelArgs[0].vapidKey, details.vapidKey);

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
      } if PushSubscription details have changed`, async () => {
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
          .stub(BaseController.prototype, 'getNotificationPermission_')
          .callsFake(() => 'granted');

        let vapidKeyToUse = DEFAULT_PUBLIC_VAPID_KEY;
        let details = EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID;
        if (vapidSetup === 'custom') {
          vapidKeyToUse = CUSTOM_VAPID_KEY;
          details = EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID;
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
          .stub(IidModel.prototype, 'getToken')
          .callsFake(() => Promise.resolve(GET_TOKEN_RESPONSE));
        sandbox
          .stub(IidModel.prototype, 'deleteToken')
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
          assert.equal(token, details.fcmToken);
          return Promise.resolve(details);
        });
        // The push subscription has changed since we saved the token.
        sandbox
          .stub(serviceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(newPS));
        sandbox
          .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
          .callsFake(() => Promise.resolve(details));

        const serviceInstance = new serviceClass(app);
        const token = await serviceInstance.getToken();
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

  servicesToTest.forEach(serviceClass => {
    it(`should get new token if VAPID details are updated in ${
      serviceClass.name
    }`, async () => {
      const regPromise = generateFakeReg();
      const subscription = makeFakeSubscription();
      mockGetReg(regPromise);

      sandbox
        .stub(BaseController.prototype, 'getNotificationPermission_')
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

      sandbox.stub(IidModel.prototype, 'deleteToken').callsFake(async () => {});

      sandbox
        .stub(IidModel.prototype, 'getToken')
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

      const errorMsg = 'messaging/' + ErrorCode.TOKEN_UPDATE_FAILED;

      sandbox
        .stub(BaseController.prototype, 'getNotificationPermission_')
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
        .stub(IidModel.prototype, 'updateToken')
        .callsFake(() => Promise.reject(new Error(errorMsg)));

      const deleteTokenStub = sandbox.stub(
        TokenDetailsModel.prototype,
        'deleteToken'
      );
      deleteTokenStub.callsFake(token => {
        assert.equal(token, EXAMPLE_EXPIRED_TOKEN_DETAILS.fcmToken);
        return Promise.resolve(EXAMPLE_EXPIRED_TOKEN_DETAILS);
      });

      sandbox.stub(IidModel.prototype, 'deleteToken').callsFake(async () => {});

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
