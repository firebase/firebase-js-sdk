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
import { assert } from 'chai';
import * as sinon from 'sinon';
import makeFakeApp from './make-fake-app';
import makeFakeSWReg from './make-fake-sw-reg';
import makeFakeSubscription from './make-fake-subscription';
import Errors from '../src/models/errors';
import WindowController from '../src/controllers/window-controller';
import SWController from '../src/controllers/sw-controller';
import ControllerInterface from '../src/controllers/controller-interface';
import DefaultSW from '../src/models/default-sw';
import FCMDetails from '../src/models/fcm-details';
import TokenDetailsModel from '../src/models/token-details-model';
import VapidDetailsModel from '../src/models/vapid-details-model';
import IIDModel from '../src/models/iid-model';
import NotificationPermission from '../src/models/notification-permission';
import arrayBufferToBase64 from '../src/helpers/array-buffer-to-base64';
import base64ToArrayBuffer from '../src/helpers/base64-to-array-buffer';
import TOKEN_EXPIRATION_MILLIS from '../src/controllers/controller-interface';

const ONE_DAY = 24 * 60 * 60 * 1000;

describe('Firebase Messaging > *Controller.getToken()', function() {
  const sandbox = sinon.sandbox.create();
  const now = Date.now();
  const expiredDate = new Date(now - ONE_DAY);

  const EXAMPLE_FCM_TOKEN = 'ExampleFCMToken1337';
  const EXAMPLE_SENDER_ID = '1234567890';
  const CUSTOM_VAPID_KEY =
    'BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiApwXK' +
    'pNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo';
  const DEFAULT_VAPID_KEY = arrayBufferToBase64(
    FCMDetails.DEFAULT_PUBLIC_VAPID_KEY
  );

  const EXAMPLE_TOKEN_DETAILS_DEFAULT_VAPID = {
    swScope: '/example-scope',
    vapidKey: DEFAULT_VAPID_KEY,
    subscription: makeFakeSubscription(),
    fcmSenderId: EXAMPLE_SENDER_ID,
    fcmToken: 'qwerty1',
    fcmPushSet: '87654321',
    createTime: now
  };
  const EXAMPLE_TOKEN_DETAILS_CUSTOM_VAPID = {
    swScope: '/example-scope',
    vapidKey: CUSTOM_VAPID_KEY,
    subscription: makeFakeSubscription(),
    fcmSenderId: EXAMPLE_SENDER_ID,
    fcmToken: 'qwerty2',
    fcmPushSet: '7654321',
    createTime: now
  };
  const EXAMPLE_EXPIRED_TOKEN_DETAILS = {
    swScope: '/example-scope',
    vapidKey: DEFAULT_VAPID_KEY,
    subscription: makeFakeSubscription(),
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

  beforeEach(function() {
    return cleanUp();
  });

  after(function() {
    return cleanUp();
  });

  it('should throw on unsupported browsers', function() {
    sandbox
      .stub(WindowController.prototype, 'isSupported_')
      .callsFake(() => false);

    const messagingService = new WindowController(app);
    return messagingService.getToken().then(
      () => {
        throw new Error('Expected getToken to throw ');
      },
      err => {
        assert.equal('messaging/' + Errors.codes.UNSUPPORTED_BROWSER, err.code);
      }
    );
  });

  it('should handle a failure to get registration', function() {
    sandbox
      .stub(ControllerInterface.prototype, 'getNotificationPermission_')
      .callsFake(() => NotificationPermission.granted);

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
            'messaging/' + Errors.codes.FAILED_DEFAULT_REGISTRATION,
            err.code
          );
        }
      )
      .then(() => {
        messagingService.delete();
      });
  });

  it('should handle the notification permission', function() {
    const notificationStub = sandbox.stub(
      ControllerInterface.prototype,
      'getNotificationPermission_'
    );
    notificationStub.onCall(0).returns(NotificationPermission.denied);
    notificationStub.onCall(1).returns(NotificationPermission.default);
    notificationStub.onCall(2).returns(NotificationPermission.denied);
    notificationStub.onCall(3).returns(NotificationPermission.default);

    return servicesToTest.reduce((chain, ServiceClass) => {
      const serviceInstance = new ServiceClass(app);
      sandbox
        .stub(ServiceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(FCMDetails.DEFAULT_PUBLIC_VAPID_KEY));
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
              'messaging/' + Errors.codes.NOTIFICATIONS_BLOCKED,
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
      } VAPID setup`, function() {
        const registration = generateFakeReg(Promise.resolve(null));
        const subscription = makeFakeSubscription();
        mockGetReg(Promise.resolve(registration));

        sandbox
          .stub(ServiceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(subscription));

        let vapidKeyToUse = FCMDetails.DEFAULT_PUBLIC_VAPID_KEY;
        if (VapidSetup['name'] == 'custom') {
          vapidKeyToUse = base64ToArrayBuffer(CUSTOM_VAPID_KEY);
        }
        sandbox
          .stub(ServiceClass.prototype, 'getPublicVapidKey_')
          .callsFake(() => Promise.resolve(vapidKeyToUse));

        sandbox
          .stub(ControllerInterface.prototype, 'getNotificationPermission_')
          .callsFake(() => NotificationPermission.granted);

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
    }`, function() {
      const registration = generateFakeReg(Promise.resolve(null));
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      sandbox
        .stub(ServiceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));
      sandbox
        .stub(ServiceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() =>
          Promise.resolve(base64ToArrayBuffer(CUSTOM_VAPID_KEY))
        );

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => NotificationPermission.granted);

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
    it(`should update token in ${ServiceClass.name} every 7 days`, function() {
      const registration = generateFakeReg(Promise.resolve(null));
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => NotificationPermission.granted);

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_EXPIRED_TOKEN_DETAILS));

      sandbox
        .stub(ServiceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(FCMDetails.DEFAULT_PUBLIC_VAPID_KEY));

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
      it('should get a new token in ${ServiceClass.name} for ${VapidSetup.name} VAPID setup', function() {
        const registration = generateFakeReg(Promise.resolve(null));
        const subscription = makeFakeSubscription();
        mockGetReg(Promise.resolve(registration));

        const TOKEN_DETAILS = {
          token: 'example-token',
          pushSet: 'example-pushSet'
        };

        sandbox
          .stub(ControllerInterface.prototype, 'getNotificationPermission_')
          .callsFake(() => NotificationPermission.granted);

        sandbox
          .stub(ServiceClass.prototype, 'getPushSubscription')
          .callsFake(() => Promise.resolve(subscription));

        let vapidKeyToUse = FCMDetails.DEFAULT_PUBLIC_VAPID_KEY;
        if (VapidSetup['name'] === 'custom') {
          vapidKeyToUse = base64ToArrayBuffer(CUSTOM_VAPID_KEY);
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
        return serviceInstance.getToken().then(token => {
          assert.equal('example-token', token);

          // Ensure save token is called in VAPID and Token model.
          assert.equal(
            VapidDetailsModel.prototype.saveVapidDetails['callCount'],
            1
          );
          const vapidModelArgs = VapidDetailsModel.prototype.saveVapidDetails[
            'getCall'
          ](0)['args'][0];

          assert.equal(
            TokenDetailsModel.prototype.saveTokenDetails['callCount'],
            1
          );
          const tokenModelArgs = TokenDetailsModel.prototype.saveTokenDetails[
            'getCall'
          ](0)['args'][0];

          Promise.resolve(registration).then(reg => {
            assert.equal(tokenModelArgs.swScope, reg.scope);
            assert.equal(vapidModelArgs.swScope, reg.scope);
          });
          assert.equal(
            arrayBufferToBase64(tokenModelArgs.vapidKey),
            VapidSetup['details']['vapidKey']
          );
          assert.equal(tokenModelArgs.subscription, subscription);
          assert.equal(tokenModelArgs.fcmSenderId, EXAMPLE_SENDER_ID);
          assert.equal(tokenModelArgs.fcmToken, TOKEN_DETAILS['token']);
          assert.equal(tokenModelArgs.fcmPushSet, TOKEN_DETAILS['pushSet']);
        });
      });
    });
  });

  servicesToTest.forEach(ServiceClass => {
    it(`should get new token if VAPID details are updated in ${
      ServiceClass.name
    }`, async function() {
      const registration = generateFakeReg(Promise.resolve(null));
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => NotificationPermission.granted);

      // start with using the deault key.
      const getPublicVapidKeyStub = sandbox.stub(
        ServiceClass.prototype,
        'getPublicVapidKey_'
      );

      getPublicVapidKeyStub.callsFake(() =>
        Promise.resolve(FCMDetails.DEFAULT_PUBLIC_VAPID_KEY)
      );

      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(() => Promise.resolve(FCMDetails.DEFAULT_PUBLIC_VAPID_KEY));

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
      getPublicVapidKeyStub.callsFake(() =>
        Promise.resolve(base64ToArrayBuffer(CUSTOM_VAPID_KEY))
      );

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
    }`, async function() {
      const registration = generateFakeReg(Promise.resolve(null));
      const subscription = makeFakeSubscription();
      mockGetReg(Promise.resolve(registration));

      const errorMsg = 'messaging/' + Errors.codes.TOKEN_UPDATE_FAILED;

      sandbox
        .stub(ControllerInterface.prototype, 'getNotificationPermission_')
        .callsFake(() => NotificationPermission.granted);

      sandbox
        .stub(TokenDetailsModel.prototype, 'getTokenDetailsFromSWScope')
        .callsFake(() => Promise.resolve(EXAMPLE_EXPIRED_TOKEN_DETAILS));

      sandbox
        .stub(ServiceClass.prototype, 'getPushSubscription')
        .callsFake(() => Promise.resolve(subscription));

      sandbox
        .stub(ServiceClass.prototype, 'getPublicVapidKey_')
        .callsFake(() => Promise.resolve(FCMDetails.DEFAULT_PUBLIC_VAPID_KEY));

      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(() => Promise.resolve(FCMDetails.DEFAULT_PUBLIC_VAPID_KEY));

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
