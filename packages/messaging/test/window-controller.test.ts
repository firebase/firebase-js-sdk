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

import { makeFakeApp } from './testing-utils/make-fake-app';
import { makeFakeSWReg } from './testing-utils/make-fake-sw-reg';

import { WindowController } from '../src/controllers/window-controller';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';

import { describe } from './testing-utils/messaging-test-runner';

const VALID_VAPID_KEY =
  'BJzVfWqLoALJdgV20MYy6lrj0OfhmE16PI1qLIIYx2ZZL3FoQWJJL8L0rf7rS7tqd92j_3xN3fmejKK5Eb7yMYw';

describe('Firebase Messaging > *WindowController', () => {
  const sandbox = sinon.sandbox.create();
  const app = makeFakeApp({
    messagingSenderId: '12345'
  });

  const cleanup = () => {
    sandbox.restore();
  };

  beforeEach(() => {
    return cleanup();
  });

  after(() => {
    return cleanup();
  });

  describe('manifestCheck_()', () => {
    it("should resolve when the tag isn't defined", () => {
      sandbox
        .stub(document, 'querySelector')
        .withArgs('link[rel="manifest"]')
        .returns(null);

      const controller = new WindowController(app);
      return controller.manifestCheck_();
    });

    it('should fetch the manifest if defined and resolve when no gcm_sender_id', () => {
      sandbox
        .stub(document, 'querySelector')
        .withArgs('link[rel="manifest"]')
        .returns({
          href: 'https://firebase.io/messaging/example'
        });

      sandbox
        .stub(window, 'fetch')
        .withArgs('https://firebase.io/messaging/example')
        .returns(
          Promise.resolve({
            json: () => {
              return {};
            }
          })
        );

      const controller = new WindowController(app);
      return controller.manifestCheck_();
    });

    it('should fetch the manifest if defined and resolve with expected gcm_sender_id', () => {
      sandbox
        .stub(document, 'querySelector')
        .withArgs('link[rel="manifest"]')
        .returns({
          href: 'https://firebase.io/messaging/example'
        });

      sandbox
        .stub(window, 'fetch')
        .withArgs('https://firebase.io/messaging/example')
        .returns(
          Promise.resolve({
            json: () => {
              return {
                gcm_sender_id: '103953800507'
              };
            }
          })
        );

      const controller = new WindowController(app);
      return controller.manifestCheck_();
    });

    it('should fetch the manifest if defined and reject when using wrong gcm_sender_id', () => {
      sandbox
        .stub(document, 'querySelector')
        .withArgs('link[rel="manifest"]')
        .returns({
          href: 'https://firebase.io/messaging/example'
        });

      sandbox
        .stub(window, 'fetch')
        .withArgs('https://firebase.io/messaging/example')
        .returns(
          Promise.resolve({
            json: () => {
              return {
                gcm_sender_id: 'incorrect-sender-id'
              };
            }
          })
        );

      const controller = new WindowController(app);
      return controller.manifestCheck_().then(
        () => {
          throw new Error('Expected error to be thrown.');
        },
        err => {
          expect(err.code).to.equal('messaging/incorrect-gcm-sender-id');
        }
      );
    });

    it('should fetch the manifest and resolve if the request fails', () => {
      sandbox
        .stub(document, 'querySelector')
        .withArgs('link[rel="manifest"]')
        .returns({
          href: 'https://firebase.io/messaging/example'
        });

      sandbox
        .stub(window, 'fetch')
        .withArgs('https://firebase.io/messaging/example')
        .returns(Promise.reject(new Error('Injected Failure.')));

      const controller = new WindowController(app);
      return controller.manifestCheck_();
    });
  });

  describe('requestPermission', () => {
    it('should resolve if the permission is already granted', () => {
      sandbox.stub(Notification as any, 'permission').value('granted');

      const controller = new WindowController(app);
      return controller.requestPermission();
    });

    it('should reject if the requestPermission() is denied', () => {
      sandbox.stub(Notification as any, 'permission').value('denied');
      sandbox
        .stub(Notification, 'requestPermission')
        .returns(Promise.resolve('denied'));

      const controller = new WindowController(app);
      return controller.requestPermission().then(
        () => {
          throw new Error('Expected an error.');
        },
        err => {
          expect(err.code).to.equal('messaging/permission-blocked');
        }
      );
    });

    it('should reject if the requestPermission() is default', () => {
      sandbox.stub(Notification as any, 'permission').value('default');
      sandbox
        .stub(Notification, 'requestPermission')
        .returns(Promise.resolve('default'));

      const controller = new WindowController(app);
      return controller.requestPermission().then(
        () => {
          throw new Error('Expected an error.');
        },
        err => {
          expect(err.code).to.equal('messaging/permission-default');
        }
      );
    });

    it('should resolve if the requestPermission() is granted', () => {
      sandbox.stub(Notification as any, 'permission').value('default');
      sandbox
        .stub(Notification, 'requestPermission')
        .returns(Promise.resolve('granted'));

      const controller = new WindowController(app);
      return controller.requestPermission();
    });

    it('should resolve if the requestPermission() is granted using old callback API', () => {
      sandbox.stub(Notification as any, 'permission').value('default');
      sandbox.stub(Notification, 'requestPermission').callsFake(cb => {
        cb('granted');
      });

      const controller = new WindowController(app);
      return controller.requestPermission();
    });
  });

  describe('useServiceWorker()', () => {
    it(`should throw on invalid input`, () => {
      const controller = new WindowController(app);
      let thrownError;
      try {
        controller.useServiceWorker(null as any);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/sw-registration-expected');
    });

    it(`should only be callable once`, () => {
      const registration = makeFakeSWReg();
      const controller = new WindowController(app);
      controller.useServiceWorker(registration);

      let thrownError;
      try {
        controller.useServiceWorker(registration);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/use-sw-before-get-token');
    });
  });

  describe('onMessage()', () => {
    it(`should call through to private function`, () => {
      const nextFunc = () => {};
      const errFunc = () => {};
      const compFunc = () => {};

      const controller = new WindowController(app);
      const onMessageStub = sandbox.stub(controller as any, 'onMessage');
      controller.onMessage(nextFunc, errFunc, compFunc);

      expect(onMessageStub.callCount).to.equal(1);
      expect(onMessageStub.args[0][0]).to.equal(nextFunc);
      expect(onMessageStub.args[0][1]).to.equal(errFunc);
      expect(onMessageStub.args[0][2]).to.equal(compFunc);
    });
  });

  describe('onTokenRefresh()', () => {
    it(`should call through to private function`, () => {
      const nextFunc = () => {};
      const errFunc = () => {};
      const compFunc = () => {};

      const controller = new WindowController(app);
      const onTokenRefreshStub = sandbox.stub(
        controller as any,
        'onTokenRefresh'
      );
      controller.onTokenRefresh(nextFunc, errFunc, compFunc);

      expect(onTokenRefreshStub.callCount).to.equal(1);
      expect(onTokenRefreshStub.args[0][0]).to.equal(nextFunc);
      expect(onTokenRefreshStub.args[0][1]).to.equal(errFunc);
      expect(onTokenRefreshStub.args[0][2]).to.equal(compFunc);
    });
  });

  describe('usePublicVapidKey()', () => {
    it('should throw an error when passing in an invalid value', () => {
      const controller = new WindowController(app);

      let thrownError;
      try {
        controller.usePublicVapidKey({} as any);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal('messaging/invalid-public-vapid-key');
    });

    it('should throw an error when called twice', () => {
      const controller = new WindowController(app);
      controller.usePublicVapidKey(VALID_VAPID_KEY);

      let thrownError;
      try {
        controller.usePublicVapidKey(VALID_VAPID_KEY);
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal(
        'messaging/use-public-key-before-get-token'
      );
    });

    it('should throw when decrypting to invalid value', () => {
      const controller = new WindowController(app);

      let thrownError;
      try {
        controller.usePublicVapidKey(
          VALID_VAPID_KEY.substring(0, VALID_VAPID_KEY.length - 1)
        );
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal(
        'messaging/public-vapid-key-decryption-failed'
      );
    });
  });

  describe('getPublicVapidKey_()', () => {
    it('should return the default key by default', () => {
      const controller = new WindowController(app);
      return controller.getPublicVapidKey_().then(pubKey => {
        expect(pubKey).to.equal(DEFAULT_PUBLIC_VAPID_KEY);
      });
    });

    it('should return the custom key if set', () => {
      const controller = new WindowController(app);
      controller.usePublicVapidKey(VALID_VAPID_KEY);
      return controller.getPublicVapidKey_().then(pubKey => {
        expect(pubKey).deep.equal(base64ToArrayBuffer(VALID_VAPID_KEY));
      });
    });
  });

  describe('setupSWMessageListener_()', () => {
    it('should add listener when supported', () => {
      const spy = sandbox.spy();
      sandbox.stub(navigator, 'serviceWorker').value({
        addEventListener: spy
      });

      const controller = new WindowController(app);
      controller.setupSWMessageListener_();

      expect(spy.args[0][0]).to.equal('message');
    });

    it('should do nothing when non-fcm message is passed in', () => {
      const spy = sandbox.spy();
      const onMessageSpy = sandbox.spy();

      sandbox.stub(navigator, 'serviceWorker').value({
        addEventListener: spy
      });

      const controller = new WindowController(app);
      controller.onMessage(onMessageSpy, null as any, null as any);
      controller.setupSWMessageListener_();

      const callback = spy.args[0][1];
      // New message without data
      callback({});
      expect(onMessageSpy.callCount).to.equal(0);

      // Not FCM data
      callback({
        data: {}
      });
      expect(onMessageSpy.callCount).to.equal(0);

      // Even with FCM data, if the type isn't known - do nothing.
      callback({
        data: {
          'firebase-messaging-msg-type': 'unknown'
        }
      });
      expect(onMessageSpy.callCount).to.equal(0);
    });

    it('should not throw when message observer is not defined', () => {
      const messageCallbackSpy = sandbox.spy();
      sandbox.stub(navigator, 'serviceWorker').value({
        addEventListener: messageCallbackSpy
      });

      const controller = new WindowController(app);
      controller.setupSWMessageListener_();
      const callback = messageCallbackSpy.args[0][1];

      // Ensure it's not defined
      controller['messageObserver'] = null;

      callback({
        data: {
          'firebase-messaging-msg-type': 'push-msg-received'
        }
      });
    });

    it('should call onMessage for push msg received event', async () => {
      const messageCallbackSpy = sandbox.spy();
      const onMessageSpy = sandbox.spy();

      sandbox.stub(navigator, 'serviceWorker').value({
        addEventListener: messageCallbackSpy
      });

      const controller = new WindowController(app);

      // The API for the observables means it's async and so we kind have to
      // hope that everything is set up after a task skip
      return new Promise(resolve => setTimeout(resolve, 500))
        .then(() => {
          controller.onMessage(onMessageSpy);
          controller.setupSWMessageListener_();

          const callback = messageCallbackSpy.args[0][1];

          // Even with FCM data, if the type isn't known - do nothing.
          callback({
            data: {
              'firebase-messaging-msg-type': 'push-msg-received'
            }
          });

          // Apparently triggering an event is also async - so another timeout.
          return new Promise(resolve => setTimeout(resolve, 500));
        })
        .then(() => {
          expect(onMessageSpy.callCount).to.equal(1);
          expect(onMessageSpy.args[0][0]).to.equal(undefined);
        });
    });
  });

  describe('waitForRegistrationToActivate_', () => {
    it('should handle service worker lifecycle', () => {
      let changeListener = () => {};
      const swValue = {
        state: 'installing',
        addEventListener: (eventName: string, cb: () => void) => {
          expect(eventName).to.equal('statechange');
          changeListener = cb;
        },
        removeEventListener: (eventName: string, cb: () => void) => {
          expect(eventName).to.equal('statechange');
          expect(cb).to.equal(changeListener);
        }
      };

      const fakeReg = makeFakeSWReg('installing', swValue);

      const messagingService = new WindowController(app);
      const waitPromise = messagingService.waitForRegistrationToActivate_(
        fakeReg
      );

      changeListener();

      swValue.state = 'activated';

      changeListener();

      return waitPromise.then(reg => {
        expect(reg).to.equal(fakeReg);
      });
    });
  });
});
