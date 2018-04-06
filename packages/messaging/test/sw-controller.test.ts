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
import { makeFakeApp } from './make-fake-app';
import { makeFakeSWReg } from './make-fake-sw-reg';

import { SWController } from '../src/controllers/sw-controller';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';
import { VapidDetailsModel } from '../src/models/vapid-details-model';

const VALID_VAPID_KEY =
  'BJzVfWqLoALJdgV20MYy6lrj0OfhmE16PI1qLIIYx2ZZL3FoQWJJL8L0rf7rS7tqd92j_3xN3fmejKK5Eb7yMYw';

describe('Firebase Messaging > *SWController', () => {
  const sandbox = sinon.sandbox.create();
  const originalReg = self['registration'];
  const originalClients = self['clients'];

  const app = makeFakeApp({
    messagingSenderId: '12345'
  });

  const cleanup = () => {
    sandbox.restore();

    // Just in case it was anything different after a test.
    self['registration'] = originalReg;
    self['clients'] = originalClients;
  };

  beforeEach(() => {
    return cleanup();
  });

  after(() => {
    return cleanup();
  });

  describe('onPush_', () => {
    it('should handle a push event with no data', () => {
      const swController = new SWController(app);
      swController.onPush_({
        data: undefined
      });
    });

    it('should handle a push event where .json() throws', () => {
      const swController = new SWController(app);
      swController.onPush_({
        data: {
          json: () => {
            throw new Error('Injected Error');
          }
        }
      });
    });

    it('should not do anything if window is in focus', () => {
      const waitUntilSpy = sandbox.spy();
      sandbox.stub(SWController.prototype, 'sendMessageToWindowClients_');
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(() => Promise.resolve(true));

      const swController = new SWController(app);
      swController.onPush_({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {};
          }
        }
      });

      return waitUntilSpy.args[0][0].then(() => {
        expect(swController.sendMessageToWindowClients_['callCount']).to.equal(
          0
        );
      });
    });

    it('should send to window if a notification payload', () => {
      const waitUntilSpy = sandbox.spy();
      sandbox.stub(SWController.prototype, 'sendMessageToWindowClients_');
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(() => Promise.resolve(true));

      const swController = new SWController(app);
      swController.onPush_({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {
              notification: {}
            };
          }
        }
      });

      return waitUntilSpy.args[0][0].then(() => {
        expect(swController.sendMessageToWindowClients_['callCount']).to.equal(
          1
        );
      });
    });

    it('should send to window if a bgMessageHandler is defined', () => {
      const waitUntilSpy = sandbox.spy();
      sandbox.stub(SWController.prototype, 'sendMessageToWindowClients_');
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(() => Promise.resolve(true));

      const swController = new SWController(app);
      swController.setBackgroundMessageHandler((() => {}) as any);
      swController.onPush_({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {};
          }
        }
      });

      return waitUntilSpy.args[0][0].then(() => {
        expect(swController.sendMessageToWindowClients_['callCount']).to.equal(
          1
        );
      });
    });

    it('should generate notification without options and show notification if no visible clients', () => {
      const registration = makeFakeSWReg();
      self['registration'] = registration;

      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(() => Promise.resolve(false));
      sandbox.spy(registration, 'showNotification');

      const swController = new SWController(app);
      swController.onPush_({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {
              notification: {}
            };
          }
        }
      });

      return waitUntilSpy.args[0][0].then(() => {
        expect(registration.showNotification['callCount']).to.equal(1);
        expect(registration.showNotification['args'][0][0]).to.equal('');
        expect(registration.showNotification['args'][0][1]).to.deep.equal({
          data: {
            FCM_MSG: {
              notification: {}
            }
          }
        });
      });
    });

    it('should generate notification with options and show notification if no visible clients', () => {
      const registration = makeFakeSWReg();
      self['registration'] = registration;

      const bgMessageHandlerSpy = sandbox.spy();
      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(() => Promise.resolve(false));
      sandbox.spy(registration, 'showNotification');

      const payloadData = {};

      const swController = new SWController(app);
      swController.setBackgroundMessageHandler(bgMessageHandlerSpy);
      swController.onPush_({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return payloadData;
          }
        }
      });

      return waitUntilSpy.args[0][0].then(() => {
        expect(bgMessageHandlerSpy['callCount']).to.equal(1);
        expect(bgMessageHandlerSpy['args'][0][0]).to.equal(payloadData);
      });
    });

    it('should fall back to background message handler otherwise', () => {
      const registration = makeFakeSWReg();
      self['registration'] = registration;

      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(() => Promise.resolve(false));
      sandbox.spy(registration, 'showNotification');

      const notificationData = {
        title: 'test-title',
        body: 'test-body',
        icon: '/images/test-icon.png'
      };

      const swController = new SWController(app);
      swController.onPush_({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {
              notification: notificationData
            };
          }
        }
      });

      return waitUntilSpy.args[0][0].then(() => {
        expect(registration.showNotification['callCount']).to.equal(1);
        expect(registration.showNotification['args'][0][0]).to.equal(
          notificationData.title
        );
        expect(registration.showNotification['args'][0][1]).to.deep.equal({
          title: notificationData.title,
          body: notificationData.body,
          icon: notificationData.icon,
          data: {
            FCM_MSG: {
              notification: notificationData
            }
          }
        });
      });
    });

    it('should do nothing if no background message handler and no notification', () => {
      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(() => Promise.resolve(false));

      const swController = new SWController(app);
      swController.onPush_({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {};
          }
        }
      });

      return waitUntilSpy.args[0][0];
    });
  });

  describe('setBackgroundMessageHandler', () => {
    it('should throw on a non-function input', () => {
      const swController = new SWController(app);
      let thrownError;
      try {
        swController.setBackgroundMessageHandler('' as any);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).to.exist;
      expect(thrownError.code).to.equal(
        'messaging/bg-handler-function-expected'
      );
    });
  });

  describe('hasVisibleClients_', () => {
    it('should return false when no clients', () => {
      self['clients'] = {
        matchAll: options => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return Promise.resolve([]);
        }
      };

      const swController = new SWController(app);
      return swController.hasVisibleClients_().then(result => {
        expect(result).to.equal(false);
      });
    });

    it('should return false when all clients arent visible', () => {
      self['clients'] = {
        matchAll: options => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return Promise.resolve([
            {
              visibilityState: 'hidden'
            },
            {
              visibilityState: 'prerender'
            },
            {
              visibilityState: 'unloaded'
            }
          ]);
        }
      };

      const swController = new SWController(app);
      return swController.hasVisibleClients_().then(result => {
        expect(result).to.equal(false);
      });
    });

    it('should return true when a client is visible', () => {
      self['clients'] = {
        matchAll: options => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return Promise.resolve([
            {
              visibilityState: 'hidden'
            },
            {
              visibilityState: 'prerender'
            },
            {
              visibilityState: 'unloaded'
            },
            {
              visibilityState: 'visible'
            }
          ]);
        }
      };

      const swController = new SWController(app);
      return swController.hasVisibleClients_().then(result => {
        expect(result).to.equal(true);
      });
    });
  });

  describe('getWindowClient_', () => {
    it('should return null when no client', () => {
      self['clients'] = {
        matchAll: options => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return Promise.resolve([]);
        }
      };

      const swController = new SWController(app);
      return swController.getWindowClient_('/test-url').then(result => {
        expect(result).to.equal(null);
      });
    });

    it('should return null when no matching clients', () => {
      self['clients'] = {
        matchAll: options => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return Promise.resolve([
            {
              url: '/other-url'
            },
            {
              url: '/other-url/2'
            },
            {
              url: '/other-url/3'
            }
          ]);
        }
      };

      const swController = new SWController(app);
      return swController.getWindowClient_('/test-url').then(result => {
        expect(result).to.equal(null);
      });
    });

    it('should return matching clients', () => {
      const matchingClient = {
        url: '/test-url'
      };
      self['clients'] = {
        matchAll: options => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return Promise.resolve([
            {
              url: '/other-url'
            },
            {
              url: '/other-url/2'
            },
            matchingClient,
            {
              url: '/other-url/3'
            }
          ]);
        }
      };

      const swController = new SWController(app);
      return swController.getWindowClient_(matchingClient.url).then(result => {
        expect(result).to.equal(matchingClient);
      });
    });
  });

  describe('onNotificationClick_', () => {
    it('should do nothing for no notification', () => {
      const event = {
        waitUntil: sandbox.spy(),
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick_(event);

      expect(event.waitUntil.callCount).to.equal(0);
      expect(event.stopImmediatePropagation.callCount).to.equal(0);
    });

    it('should do nothing for notification with no data', () => {
      const event = {
        notification: {},
        waitUntil: sandbox.spy(),
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick_(event);

      expect(event.waitUntil.callCount).to.equal(0);
      expect(event.stopImmediatePropagation.callCount).to.equal(0);
    });

    it('should do nothing for notification with no FCM data', () => {
      const event = {
        notification: {
          data: {}
        },
        waitUntil: sandbox.spy(),
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick_(event);

      expect(event.waitUntil.callCount).to.equal(0);
      expect(event.stopImmediatePropagation.callCount).to.equal(0);
    });

    it('should handle FCM notification without a notification data field', () => {
      const event = {
        notification: {
          data: {
            FCM_MSG: {}
          },
          close: sandbox.spy()
        },
        waitUntil: sandbox.spy(),
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick_(event);

      expect(event.waitUntil.callCount).to.equal(0);
      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);
    });

    it('should handle FCM notification without a click_action field', () => {
      const event = {
        notification: {
          data: {
            FCM_MSG: {
              notification: {}
            }
          },
          close: sandbox.spy()
        },
        waitUntil: sandbox.spy(),
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick_(event);

      expect(event.waitUntil.callCount).to.equal(0);
      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);
    });

    it('should open click_action URL for FCM notification (third-party so no window client access)', () => {
      const clickAction = '/test-click-action';
      const event = {
        notification: {
          data: {
            FCM_MSG: {
              notification: {
                click_action: clickAction
              }
            }
          },
          close: sandbox.spy()
        },
        waitUntil: sandbox.spy(),
        stopImmediatePropagation: sandbox.spy()
      };

      self['clients'] = {
        openWindow: sandbox.stub().callsFake(() => {
          // Pretend it's a third party URL
          return null;
        })
      };

      const swController = new SWController(app);

      sandbox
        .stub(swController, 'getWindowClient_')
        .callsFake(() => Promise.resolve(null));

      swController.onNotificationClick_(event);

      expect(event.waitUntil.callCount).to.equal(1);
      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);

      return event.waitUntil.args[0][0].then(() => {
        expect(self['clients'].openWindow.callCount).to.equal(1);
        expect(self['clients'].openWindow.args[0][0]).to.equal(clickAction);
      });
    });

    it('should open click_action URL for FCM notification (same origin will include window client access)', () => {
      const fakeWindowClient = {};
      const clickAction = '/test-click-action';
      const event = {
        notification: {
          data: {
            FCM_MSG: {
              notification: {
                click_action: clickAction
              }
            }
          },
          close: sandbox.spy()
        },
        waitUntil: sandbox.spy(),
        stopImmediatePropagation: sandbox.spy()
      };

      self['clients'] = {
        openWindow: sandbox.stub().callsFake(() => {
          // Pretend it's a same origin URL
          return fakeWindowClient;
        })
      };

      const swController = new SWController(app);

      sandbox
        .stub(swController, 'getWindowClient_')
        .callsFake(() => Promise.resolve(null));
      sandbox
        .stub(swController, 'attemptToMessageClient_')
        .callsFake(async () => {});

      swController.onNotificationClick_(event);

      expect(event.waitUntil.callCount).to.equal(1);
      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);

      return event.waitUntil.args[0][0].then(() => {
        expect(self['clients'].openWindow.callCount).to.equal(1);
        expect(self['clients'].openWindow.args[0][0]).to.equal(clickAction);

        expect(swController.attemptToMessageClient_['callCount']).to.equal(1);
        expect(swController.attemptToMessageClient_['args'][0][0]).to.equal(
          fakeWindowClient
        );
        expect(
          swController.attemptToMessageClient_['args'][0][1]
        ).to.deep.equal({
          'firebase-messaging-msg-data': {},
          'firebase-messaging-msg-type': 'notification-clicked'
        });
      });
    });

    it('should not open a window if one exists, instead focus is', () => {
      const fakeWindowClient = {
        focus: sandbox.stub().callsFake(() => fakeWindowClient)
      };
      const clickAction = '/test-click-action';
      const event = {
        notification: {
          data: {
            FCM_MSG: {
              notification: {
                click_action: clickAction
              }
            }
          },
          close: sandbox.spy()
        },
        waitUntil: sandbox.spy(),
        stopImmediatePropagation: sandbox.spy()
      };

      self['clients'] = {
        openWindow: sandbox.stub().callsFake(() => {
          // Pretend it's a same origin URL
          return fakeWindowClient;
        })
      };

      const swController = new SWController(app);

      sandbox
        .stub(swController, 'getWindowClient_')
        .callsFake(() => Promise.resolve(fakeWindowClient));
      sandbox
        .stub(swController, 'attemptToMessageClient_')
        .callsFake(async () => {});

      swController.onNotificationClick_(event);

      expect(event.waitUntil.callCount).to.equal(1);
      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);

      return event.waitUntil.args[0][0].then(() => {
        expect(self['clients'].openWindow.callCount).to.equal(0);

        expect(fakeWindowClient.focus.callCount).to.equal(1);

        expect(swController.attemptToMessageClient_['callCount']).to.equal(1);
        expect(swController.attemptToMessageClient_['args'][0][0]).to.equal(
          fakeWindowClient
        );
        expect(
          swController.attemptToMessageClient_['args'][0][1]
        ).to.deep.equal({
          'firebase-messaging-msg-data': {},
          'firebase-messaging-msg-type': 'notification-clicked'
        });
      });
    });
  });

  describe('getNotificationData_', () => {
    it('should return nothing for no payload', () => {
      const swController = new SWController(app);
      expect(swController.getNotificationData_(undefined)).to.equal(undefined);
    });
  });

  describe('attemptToMessageClient_', () => {
    it('should reject when no window client provided', () => {
      const swController = new SWController(app);
      return swController.attemptToMessageClient_(null, {}).then(
        () => {
          throw new Error('Expected error to be thrown');
        },
        err => {
          expect(err).to.exist;
          expect(err.code).to.equal('messaging/no-window-client-to-msg');
        }
      );
    });

    it('should message window client', () => {
      const msg = {};
      const client = {
        postMessage: sandbox.spy()
      };
      const swController = new SWController(app);
      return swController.attemptToMessageClient_(client, msg).then(() => {
        expect(client.postMessage.callCount).to.equal(1);
        expect(client.postMessage.args[0][0]).to.equal(msg);
      });
    });
  });

  describe('sendMessageToWindowClients_', () => {
    it('should do nothing when no clients', () => {
      self['clients'] = {
        matchAll: sandbox.stub().callsFake(() => Promise.resolve([]))
      };

      const swController = new SWController(app);

      const payload = {};

      return swController.sendMessageToWindowClients_(payload).then(() => {
        expect(self['clients'].matchAll.callCount).to.equal(1);
        expect(self['clients'].matchAll.args[0][0]).to.deep.equal({
          type: 'window',
          includeUncontrolled: true
        });
      });
    });

    it('should message existing clients', () => {
      const clients = [{}, {}];
      self['clients'] = {
        matchAll: sandbox.stub().callsFake(() => Promise.resolve(clients))
      };

      const swController = new SWController(app);
      sandbox
        .stub(swController, 'attemptToMessageClient_')
        .callsFake(async () => {});

      const payload = {
        example: 'test'
      };

      return swController.sendMessageToWindowClients_(payload).then(() => {
        expect(self['clients'].matchAll.callCount).to.equal(1);
        expect(self['clients'].matchAll.args[0][0]).to.deep.equal({
          type: 'window',
          includeUncontrolled: true
        });

        expect(swController.attemptToMessageClient_['callCount']).to.equal(
          clients.length
        );
        for (let i = 0; i < clients.length; i++) {
          expect(swController.attemptToMessageClient_['args'][i][0]).to.equal(
            clients[i]
          );
          expect(
            swController.attemptToMessageClient_['args'][i][1]
          ).to.deep.equal({
            'firebase-messaging-msg-data': {
              example: 'test'
            },
            'firebase-messaging-msg-type': 'push-msg-received'
          });
        }
      });
    });
  });

  describe('constructor', () => {
    it('should hook up push events', () => {
      const listeners = {};
      sandbox.stub(self, 'addEventListener').callsFake((eventName, eventCb) => {
        listeners[eventName] = eventCb;
      });
      sandbox.stub(SWController.prototype, 'onPush_');
      const pushEvent = new Event('push');

      const swController = new SWController(app);
      expect(listeners['push']).to.exist;

      listeners['push'](pushEvent);

      expect(swController.onPush_['callCount']).to.equal(1);
      expect(swController.onPush_['args'][0][0]).to.equal(pushEvent);
    });

    it('should hook up subscription change events', () => {
      const listeners = {};
      sandbox.stub(self, 'addEventListener').callsFake((eventName, eventCb) => {
        listeners[eventName] = eventCb;
      });
      sandbox.stub(SWController.prototype, 'onSubChange_');
      const pushEvent = new Event('pushsubscriptionchange');

      const swController = new SWController(app);
      expect(listeners['pushsubscriptionchange']).to.exist;

      listeners['pushsubscriptionchange'](pushEvent);

      expect(swController.onSubChange_['callCount']).to.equal(1);
      expect(swController.onSubChange_['args'][0][0]).to.equal(pushEvent);

      // sandbox.stub(swController, 'onNotificationClick_');

      // const notificaitonClick = new Event('notificationclick');

      // self.dispatchEvent(notificaitonClick);
    });

    it('should hook up notification click events', () => {
      const listeners = {};
      sandbox.stub(self, 'addEventListener').callsFake((eventName, eventCb) => {
        listeners[eventName] = eventCb;
      });
      sandbox.stub(SWController.prototype, 'onNotificationClick_');
      const pushEvent = new Event('notificationclick');

      const swController = new SWController(app);
      expect(listeners['notificationclick']).to.exist;

      listeners['notificationclick'](pushEvent);

      expect(swController.onNotificationClick_['callCount']).to.equal(1);
      expect(swController.onNotificationClick_['args'][0][0]).to.equal(
        pushEvent
      );
    });
  });

  describe('onSubChange_', () => {
    it('should do nothing if subscription is same', () => {});

    it('should update token if the subscription has changed', () => {});

    it('should handle errors and delete token', () => {
      const registration = makeFakeSWReg();
      self['registration'] = registration;

      sandbox
        .stub(SWController.prototype, 'getSWRegistration_')
        .callsFake(() => Promise.reject('Injected Error'));
      const event = {
        waitUntil: sandbox.spy()
      };

      const swController = new SWController(app);
      swController.onSubChange_(event);

      expect(event.waitUntil.callCount).to.equal(1);

      return event.waitUntil.args[0][0]
        .then(() => {
          throw new Error('Expected error');
        })
        .catch(err => {
          expect(err).to.exist;
          expect(err.code).to.equal('messaging/unable-to-resubscribe');
        });
    });
  });

  describe('getPublicVapidKey_()', () => {
    it('should return the default key by default', () => {
      self['registration'] = makeFakeSWReg();
      const controller = new SWController(app);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(() => Promise.resolve(null));
      return controller.getPublicVapidKey_().then(pubKey => {
        expect(pubKey).to.equal(DEFAULT_PUBLIC_VAPID_KEY);
      });
    });

    it('should return the default key', () => {
      self['registration'] = makeFakeSWReg();
      const controller = new SWController(app);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(() => Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY));
      return controller.getPublicVapidKey_().then(pubKey => {
        expect(pubKey).to.equal(DEFAULT_PUBLIC_VAPID_KEY);
      });
    });

    it('should return the custom key if set', () => {
      self['registration'] = makeFakeSWReg();
      const controller = new SWController(app);
      const vapidKeyInUse = base64ToArrayBuffer(VALID_VAPID_KEY);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(() => Promise.resolve(vapidKeyInUse));
      return controller.getPublicVapidKey_().then(pubKey => {
        expect(pubKey).deep.equal(vapidKeyInUse);
      });
    });
  });
});
