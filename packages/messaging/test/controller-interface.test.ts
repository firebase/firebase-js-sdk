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
import makeFakeApp from './make-fake-app';
import makeFakeSWReg from './make-fake-sw-reg';

import FCMDetails from '../src/models/fcm-details';
import WindowController from '../src/controllers/window-controller';
import SWController from '../src/controllers/sw-controller';
import ControllerInterface from '../src/controllers/controller-interface';
import TokenDetailsModel from '../src/models/token-details-model';
import VapidDetailsModel from '../src/models/vapid-details-model';
import IIDModel from '../src/models/iid-model';

const controllersToTest = [WindowController, SWController];

describe('Firebase Messaging > *ControllerInterface', function() {
  const sandbox = sinon.sandbox.create();
  const app = makeFakeApp({
    messagingSenderId: '12345'
  });

  const cleanup = function() {
    sandbox.restore();
  };

  beforeEach(function() {
    return cleanup();
  });

  after(function() {
    return cleanup();
  });

  describe('INTERNAL.delete()', function() {
    it('should call delete()', function() {
      const controller = new ControllerInterface(app);
      sandbox.spy(controller, 'delete');
      controller.INTERNAL.delete();
      expect(controller.delete['callCount']).to.equal(1);
    });
  });

  describe('getSWRegistration_()', function() {
    it(`should throw`, function() {
      const controller = new ControllerInterface(app);
      let thrownError;
      try {
        controller.getSWRegistration_();
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/should-be-overriden');
    });
  });

  describe('getPublicVapidKey_()', function() {
    it(`should throw`, function() {
      const controller = new ControllerInterface(app);
      let thrownError;
      try {
        controller.getPublicVapidKey_();
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/should-be-overriden');
    });
  });

  describe('requestPermission()', function() {
    it(`should throw`, function() {
      const controller = new ControllerInterface(app);
      let thrownError;
      try {
        controller.requestPermission();
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('getPushSubscription()', function() {
    controllersToTest.forEach(ControllerInTest => {
      it(`should return rejection error in ${
        ControllerInTest.name
      }`, function() {
        const injectedError = new Error('Inject error.');
        const reg = makeFakeSWReg();
        sandbox.stub(reg, 'pushManager').value({
          getSubscription: () => Promise.reject(injectedError)
        });

        const controller = new ControllerInTest(app);
        return controller
          .getPushSubscription(reg, FCMDetails.DEFAULT_PUBLIC_VAPID_KEY)
          .then(
            () => {
              throw new Error('Expected an error.');
            },
            err => {
              expect(err).to.equal(injectedError);
            }
          );
      });

      it(`should return PushSubscription if returned`, function() {
        const exampleSubscription = {};
        const reg = makeFakeSWReg();
        sandbox.stub(reg, 'pushManager').value({
          getSubscription: () => Promise.resolve(exampleSubscription)
        });

        const controller = new ControllerInTest(app);
        return controller
          .getPushSubscription(reg, FCMDetails.DEFAULT_PUBLIC_VAPID_KEY)
          .then(subscription => {
            expect(subscription).to.equal(exampleSubscription);
          });
      });

      it('should call subscribe() if no subscription', function() {
        const exampleSubscription = {};
        const reg = makeFakeSWReg();
        sandbox.stub(reg, 'pushManager').value({
          getSubscription: async () => {},
          subscribe: options => {
            expect(options).to.deep.equal({
              userVisibleOnly: true,
              applicationServerKey: FCMDetails.DEFAULT_PUBLIC_VAPID_KEY
            });

            return Promise.resolve(exampleSubscription);
          }
        });

        const controller = new ControllerInTest(app);
        return controller
          .getPushSubscription(reg, FCMDetails.DEFAULT_PUBLIC_VAPID_KEY)
          .then(subscription => {
            expect(subscription).to.equal(exampleSubscription);
          });
      });
    });
  });

  describe('useServiceWorker()', function() {
    it(`should throw`, function() {
      const controller = new ControllerInterface(app);
      let thrownError;
      try {
        controller.useServiceWorker(null);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('usePublicVapidKey()', function() {
    it(`should throw`, function() {
      const controller = new ControllerInterface(app);
      let thrownError;
      try {
        controller.usePublicVapidKey(null);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('onMessage()', function() {
    it(`should throw`, function() {
      const controller = new ControllerInterface(app);
      let thrownError;
      try {
        controller.onMessage(null, null, null);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('onTokenRefresh()', function() {
    it(`should throw`, function() {
      const controller = new ControllerInterface(app);
      let thrownError;
      try {
        controller.onTokenRefresh(null, null, null);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-window');
    });
  });

  describe('setBackgroundMessageHandler()', function() {
    it(`should throw`, function() {
      const controller = new ControllerInterface(app);
      let thrownError;
      try {
        controller.setBackgroundMessageHandler(null);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/only-available-in-sw');
    });
  });

  describe('getNotificationPermission_', function() {
    it('should return current permission', function() {
      sandbox.stub(Notification as any, 'permission').value('test');
      const controller = new ControllerInterface(app);
      const result = controller.getNotificationPermission_();
      expect(result).to.equal('test');
    });
  });

  describe('getTokenDetailsModel', function() {
    it('should return an instance of TokenDetailsModel', function() {
      const controller = new ControllerInterface(app);
      const result = controller.getTokenDetailsModel();
      expect(result).to.be.instanceof(TokenDetailsModel);
    });
  });

  describe('getVapidDetailsModel', function() {
    it('should return an instance of VapidDetailsModel', function() {
      const controller = new ControllerInterface(app);
      const result = controller.getVapidDetailsModel();
      expect(result).to.be.instanceof(VapidDetailsModel);
    });
  });

  describe('getIIDModel', function() {
    it('should return an instance of IIDModel', function() {
      const controller = new ControllerInterface(app);
      const result = controller.getIIDModel();
      expect(result).to.be.instanceof(IIDModel);
    });
  });
});
