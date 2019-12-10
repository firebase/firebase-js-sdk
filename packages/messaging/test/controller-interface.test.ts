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

import { expect } from 'chai';
import { stub, restore, spy } from 'sinon';

import { BaseController } from '../src/controllers/base-controller';
import { SwController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';
import { SubscriptionManager } from '../src/models/subscription-manager';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { VapidDetailsModel } from '../src/models/vapid-details-model';

import { makeFakeFirebaseInternalServices } from './testing-utils/make-fake-firebase-services';
import { makeFakeSWReg } from './testing-utils/make-fake-sw-reg';
import { FirebaseInternalServices } from '../src/interfaces/internal-services';

const controllersToTest = [WindowController, SwController];

/**
 * As BaseController is an abstract class, we need a concrete
 * implementation that can be initialized for testing
 */
class MockBaseController extends BaseController {
  async getSWRegistration_(): Promise<ServiceWorkerRegistration> {
    return new ServiceWorkerRegistration();
  }

  async getPublicVapidKey_(): Promise<Uint8Array> {
    return new Uint8Array(0);
  }
}

describe('Firebase Messaging > *BaseController', () => {
  let firebaseInternalServices: FirebaseInternalServices;

  beforeEach(() => {
    firebaseInternalServices = makeFakeFirebaseInternalServices({
      messagingSenderId: '12345'
    });
  });

  afterEach(() => {
    restore();
  });

  describe('INTERNAL.delete()', () => {
    it('should call delete()', async () => {
      const controller = new MockBaseController(firebaseInternalServices);
      const sinonSpy = spy(controller, 'delete');
      await controller.INTERNAL.delete();
      expect(sinonSpy.callCount).to.equal(1);
    });
  });

  describe('requestPermission()', () => {
    it(`should throw`, async () => {
      const controller = new MockBaseController(firebaseInternalServices);
      let thrownError;
      try {
        await controller.requestPermission();
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('getPushSubscription()', () => {
    for (const controllerInTest of controllersToTest) {
      it(`should return rejection error in ${controllerInTest.name}`, () => {
        const injectedError = new Error('Inject error.');
        const reg = makeFakeSWReg();
        stub(reg, 'pushManager').value({
          getSubscription: async () => {
            throw injectedError;
          }
        });

        const controller = new controllerInTest(firebaseInternalServices);
        return controller
          .getPushSubscription(reg, DEFAULT_PUBLIC_VAPID_KEY)
          .then(
            () => {
              throw new Error('Expected an error.');
            },
            err => {
              expect(err).to.equal(injectedError);
            }
          );
      });

      it(`should return PushSubscription if returned`, () => {
        const exampleSubscription = {};
        const reg = makeFakeSWReg();
        stub(reg, 'pushManager').value({
          getSubscription: async () => exampleSubscription
        });

        const controller = new controllerInTest(firebaseInternalServices);
        return controller
          .getPushSubscription(reg, DEFAULT_PUBLIC_VAPID_KEY)
          .then(subscription => {
            expect(subscription).to.equal(exampleSubscription);
          });
      });

      it('should call subscribe() if no subscription', () => {
        const exampleSubscription = {};
        const reg = makeFakeSWReg();
        stub(reg, 'pushManager').value({
          getSubscription: async () => {},
          subscribe: async (options: PushSubscriptionOptions) => {
            expect(options).to.deep.equal({
              userVisibleOnly: true,
              applicationServerKey: DEFAULT_PUBLIC_VAPID_KEY
            });

            return exampleSubscription;
          }
        });

        const controller = new controllerInTest(firebaseInternalServices);
        return controller
          .getPushSubscription(reg, DEFAULT_PUBLIC_VAPID_KEY)
          .then(subscription => {
            expect(subscription).to.equal(exampleSubscription);
          });
      });
    }
  });

  describe('useServiceWorker()', () => {
    it(`should throw`, () => {
      const controller = new MockBaseController(firebaseInternalServices);
      let thrownError;
      try {
        controller.useServiceWorker(null as any);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('usePublicVapidKey()', () => {
    it(`should throw`, () => {
      const controller = new MockBaseController(firebaseInternalServices);
      let thrownError;
      try {
        controller.usePublicVapidKey(null as any);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('onMessage()', () => {
    it(`should throw`, () => {
      const controller = new MockBaseController(firebaseInternalServices);
      let thrownError;
      try {
        controller.onMessage(null as any, null as any, null as any);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('onTokenRefresh()', () => {
    it(`should throw`, () => {
      const controller = new MockBaseController(firebaseInternalServices);
      let thrownError;
      try {
        controller.onTokenRefresh(null as any, null as any, null as any);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('setBackgroundMessageHandler()', () => {
    it(`should throw`, () => {
      const controller = new MockBaseController(firebaseInternalServices);
      let thrownError;
      try {
        controller.setBackgroundMessageHandler(null as any);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-sw');
    });
  });

  describe('getNotificationPermission', () => {
    it('should return current permission', () => {
      stub(Notification, 'permission').value('test');
      const controller = new MockBaseController(firebaseInternalServices);
      const result = (controller as any).getNotificationPermission();
      expect(result).to.equal('test');
    });
  });

  describe('getTokenDetailsModel', () => {
    it('should return an instance of TokenDetailsModel', () => {
      const controller = new MockBaseController(firebaseInternalServices);
      const result = controller.getTokenDetailsModel();
      expect(result).to.be.instanceof(TokenDetailsModel);
    });
  });

  describe('getVapidDetailsModel', () => {
    it('should return an instance of VapidDetailsModel', () => {
      const controller = new MockBaseController(firebaseInternalServices);
      const result = controller.getVapidDetailsModel();
      expect(result).to.be.instanceof(VapidDetailsModel);
    });
  });

  describe('getIidModel', () => {
    it('should return an instance of IidModel', () => {
      const controller = new MockBaseController(firebaseInternalServices);
      const result = controller.getSubscriptionManager();
      expect(result).to.be.instanceof(SubscriptionManager);
    });
  });
});
