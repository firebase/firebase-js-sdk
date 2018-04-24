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

import '../src/controllers/sw-types';

// Let TS know that this is a (writable and deep partial) service worker
declare const self: ServiceWorkerGlobalScope;

import { expect } from 'chai';
import * as sinon from 'sinon';

import { FirebaseApp } from '@firebase/app-types';
import { FirebaseError } from '@firebase/util';

import { makeFakeApp } from './testing-utils/make-fake-app';
import { makeFakeSWReg } from './testing-utils/make-fake-sw-reg';

import { SWController } from '../src/controllers/sw-controller';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';
import { VapidDetailsModel } from '../src/models/vapid-details-model';

const VALID_VAPID_KEY =
  'BJzVfWqLoALJdgV20MYy6lrj0OfhmE16PI1qLIIYx2ZZL3FoQWJJL8L0rf7rS7tqd92j_3xN3fmejKK5Eb7yMYw';

describe('Firebase Messaging > *SWController', () => {
  let sandbox: sinon.SinonSandbox;
  let app: FirebaseApp;

  beforeEach(() => {
    // When trying to stub self.clients self.registration, Sinon complains that
    // these properties do not exist. This is because we're not actually running
    // these tests in a service worker context.
    //
    // Here we're adding placeholders for Sinon to overwrite, which prevents the
    // "Cannot stub non-existent own property" errors.
    //
    // Casting to any is needed because TS also thinks that we're in a SW
    // context and considers these properties readonly.

    (self as any).clients = 'This is a placeholder for sinon to overwrite.';
    (self as any).registration =
      'This is a placeholder for sinon to overwrite.';

    sandbox = sinon.sandbox.create();
    app = makeFakeApp({
      messagingSenderId: '12345'
    });
  });

  afterEach(() => {
    delete (self as any).clients;
    delete (self as any).registration;

    sandbox.restore();
  });

  describe('onPush', () => {
    it('should handle a push event with no data', async () => {
      const swController = new SWController(app);
      const waitUntilSpy = sandbox.spy();
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: undefined
      } as any);

      await waitUntilSpy.getCall(0).args[0];
    });

    it('should handle a push event where .json() throws', async () => {
      const swController = new SWController(app);
      const waitUntilSpy = sandbox.spy();
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            throw new Error('Injected Error');
          }
        }
      } as any);
    });

    it('should send data payload to window if window is in focus', async () => {
      const waitUntilSpy = sandbox.spy();
      const stub = sandbox.stub(
        SWController.prototype,
        'sendMessageToWindowClients_'
      );
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(async () => true);

      const swController = new SWController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {};
          }
        }
      } as any);

      await waitUntilSpy.getCall(0).args[0];
      expect(stub.callCount).to.equal(1);
    });

    it('should send notification payload to window if window is in focus', async () => {
      const waitUntilSpy = sandbox.spy();
      const stub = sandbox.stub(
        SWController.prototype,
        'sendMessageToWindowClients_'
      );
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(async () => true);

      const swController = new SWController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {
              notification: {}
            };
          }
        }
      } as any);

      await waitUntilSpy.getCall(0).args[0];
      expect(stub.callCount).to.equal(1);
    });

    it('should generate notification without options and show notification if no visible clients', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);

      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);
      const showNotificationStub = sandbox.spy(
        registration,
        'showNotification'
      );

      const swController = new SWController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {
              notification: {}
            };
          }
        }
      } as any);

      await waitUntilSpy.getCall(0).args[0];
      expect(showNotificationStub.callCount).to.equal(1);
      expect(showNotificationStub.args[0][0]).to.equal('');
      expect(showNotificationStub.args[0][1]).to.deep.equal({
        data: {
          FCM_MSG: {
            notification: {}
          }
        }
      });
    });

    it('should generate notification with options and show notification if no visible clients', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);

      const bgMessageHandlerSpy = sandbox.spy();
      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);
      sandbox.spy(registration, 'showNotification');

      const payloadData = {};

      const swController = new SWController(app);
      swController.setBackgroundMessageHandler(bgMessageHandlerSpy);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return payloadData;
          }
        }
      } as any);

      await waitUntilSpy.getCall(0).args[0];
      expect(bgMessageHandlerSpy['callCount']).to.equal(1);
      expect(bgMessageHandlerSpy['args'][0][0]).to.equal(payloadData);
    });

    it('should fall back to background message handler otherwise', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);

      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);
      const showNotificationSpy = sandbox.spy(registration, 'showNotification');

      const notificationData = {
        title: 'test-title',
        body: 'test-body',
        icon: '/images/test-icon.png'
      };

      const swController = new SWController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {
              notification: notificationData
            };
          }
        }
      } as any);

      await waitUntilSpy.getCall(0).args[0];
      expect(showNotificationSpy.callCount).to.equal(1);
      expect(showNotificationSpy.args[0][0]).to.equal(notificationData.title);
      expect(showNotificationSpy.args[0][1]).to.deep.equal({
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

    it('should do nothing if no background message handler and no notification', async () => {
      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SWController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);

      const swController = new SWController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => {
            return {};
          }
        }
      } as any);

      return waitUntilSpy.getCall(0).args[0];
    });
  });

  describe('setBackgroundMessageHandler', () => {
    it('should throw on a non-function input', () => {
      const swController = new SWController(app);
      let thrownError: FirebaseError | undefined;
      try {
        swController.setBackgroundMessageHandler('' as any);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).to.exist;
      expect(thrownError!.code).to.equal(
        'messaging/bg-handler-function-expected'
      );
    });
  });

  describe('hasVisibleClients_', () => {
    it('should return false when no clients', async () => {
      const clients = {
        matchAll: async (options: Partial<ClientQueryOptions>) => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return [];
        }
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);
      const result = await swController.hasVisibleClients_();
      expect(result).to.equal(false);
    });

    it('should return false when all clients arent visible', async () => {
      const clients = {
        matchAll: async (options: Partial<ClientQueryOptions>) => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return [
            {
              visibilityState: 'hidden'
            },
            {
              visibilityState: 'prerender'
            },
            {
              visibilityState: 'unloaded'
            }
          ];
        }
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);
      const result = await swController.hasVisibleClients_();
      expect(result).to.equal(false);
    });

    it('should return true when a client is visible', async () => {
      const clients = {
        matchAll: async (options: Partial<ClientQueryOptions>) => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return [
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
          ];
        }
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);
      const result = await swController.hasVisibleClients_();
      expect(result).to.equal(true);
    });
  });

  describe('getWindowClient_', () => {
    it('should return null when no client', async () => {
      const clients = {
        matchAll: async (options: Partial<ClientQueryOptions>) => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return [];
        }
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);
      const result = await swController.getWindowClient_('/test-url');
      expect(result).to.equal(null);
    });

    it('should return null when no matching clients', async () => {
      const clients = {
        matchAll: async (options: Partial<ClientQueryOptions>) => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return [
            {
              url: '/other-url'
            },
            {
              url: '/other-url/2'
            },
            {
              url: '/other-url/3'
            }
          ];
        }
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);
      const result = await swController.getWindowClient_('/test-url');
      expect(result).to.equal(null);
    });

    it('should return matching clients', async () => {
      const matchingClient = {
        url: '/test-url'
      };
      const clients = {
        matchAll: async (options: Partial<ClientQueryOptions>) => {
          expect(options).to.deep.equal({
            type: 'window',
            includeUncontrolled: true
          });

          return [
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
          ];
        }
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);
      const result = await swController.getWindowClient_(matchingClient.url);
      expect(result).to.equal(matchingClient);
    });
  });

  describe('onNotificationClick', () => {
    it('should do nothing for no notification', async () => {
      const waitUntilSpy = sandbox.spy();
      const event: any = {
        waitUntil: waitUntilSpy,
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick(event);

      expect(event.stopImmediatePropagation.callCount).to.equal(0);
    });

    it('should do nothing for notification with no data', async () => {
      const waitUntilSpy = sandbox.spy();
      const event: any = {
        notification: {},
        waitUntil: waitUntilSpy,
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick(event);

      expect(event.stopImmediatePropagation.callCount).to.equal(0);
    });

    it('should do nothing for notification with no FCM data', async () => {
      const waitUntilSpy = sandbox.spy();
      const event: any = {
        notification: {
          data: {}
        },
        waitUntil: waitUntilSpy,
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick(event);

      expect(event.stopImmediatePropagation.callCount).to.equal(0);
    });

    it('should handle FCM notification without a notification data field', async () => {
      const waitUntilSpy = sandbox.spy();
      const event: any = {
        notification: {
          data: {
            FCM_MSG: {}
          },
          close: sandbox.spy()
        },
        waitUntil: waitUntilSpy,
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick(event);

      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);
    });

    it('should handle FCM notification without a click_action field', async () => {
      const waitUntilSpy = sandbox.spy();
      const event: any = {
        notification: {
          data: {
            FCM_MSG: {
              notification: {}
            }
          },
          close: sandbox.spy()
        },
        waitUntil: waitUntilSpy,
        stopImmediatePropagation: sandbox.spy()
      };
      const swController = new SWController(app);

      swController.onNotificationClick(event);
      await event.waitUntil.getCall(0).args[0];

      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);
    });

    it('should open click_action URL for FCM notification (third-party so no window client access)', async () => {
      const clickAction = '/test-click-action';
      const waitUntilSpy = sandbox.spy();
      const event: any = {
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
        waitUntil: waitUntilSpy,
        stopImmediatePropagation: sandbox.spy()
      };

      const openWindowStub = sandbox.stub().callsFake(() => {
        // Pretend it's a third party URL
        return null;
      });

      const clients = {
        openWindow: openWindowStub
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);

      sandbox
        .stub(swController, 'getWindowClient_')
        .callsFake(async () => null);

      swController.onNotificationClick(event);

      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);

      await event.waitUntil.getCall(0).args[0];
      expect(openWindowStub.callCount).to.equal(1);
      expect(openWindowStub.getCall(0).args[0]).to.equal(clickAction);
    });

    it('should open click_action URL for FCM notification (same origin will include window client access)', async () => {
      const fakeWindowClient = {};
      const clickAction = '/test-click-action';
      const waitUntilSpy = sandbox.spy();
      const event: any = {
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
        waitUntil: waitUntilSpy,
        stopImmediatePropagation: sandbox.spy()
      };

      const openWindowStub = sandbox.stub().callsFake(() => {
        // Pretend it's a third party URL
        return fakeWindowClient;
      });

      const clients = {
        openWindow: openWindowStub
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);

      sandbox
        .stub(swController, 'getWindowClient_')
        .callsFake(async () => null);
      const attemptToMessageClientStub = sandbox
        .stub(swController, 'attemptToMessageClient_')
        .callsFake(async () => {});

      swController.onNotificationClick(event);

      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);

      await event.waitUntil.getCall(0).args[0];
      expect(openWindowStub.callCount).to.equal(1);
      expect(openWindowStub.getCall(0).args[0]).to.equal(clickAction);

      expect(attemptToMessageClientStub.callCount).to.equal(1);
      expect(attemptToMessageClientStub.args[0][0]).to.equal(fakeWindowClient);
      expect(attemptToMessageClientStub.args[0][1]).to.deep.equal({
        'firebase-messaging-msg-data': {},
        'firebase-messaging-msg-type': 'notification-clicked'
      });
    });

    it('should not open a window if one exists, instead focus is', async () => {
      const focusStub = sandbox.stub().callsFake(() => fakeWindowClient);
      const fakeWindowClient: Partial<WindowClient> = {
        focus: focusStub
      };
      const clickAction = '/test-click-action';
      const waitUntilSpy = sandbox.spy();
      const event: any = {
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
        waitUntil: waitUntilSpy,
        stopImmediatePropagation: sandbox.spy()
      };

      const openWindowStub = sandbox.stub().callsFake(() => {
        // Pretend it's a same origin URL
        return fakeWindowClient;
      });

      const clients = {
        openWindow: openWindowStub
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);

      sandbox
        .stub(swController, 'getWindowClient_')
        .callsFake(async () => fakeWindowClient);
      const attemptToMessageClientStub = sandbox
        .stub(swController, 'attemptToMessageClient_')
        .callsFake(async () => {});

      swController.onNotificationClick(event);

      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);

      await event.waitUntil.getCall(0).args[0];

      expect(openWindowStub.callCount).to.equal(0);

      expect(focusStub.callCount).to.equal(1);

      expect(attemptToMessageClientStub.callCount).to.equal(1);
      expect(attemptToMessageClientStub.args[0][0]).to.equal(fakeWindowClient);
      expect(attemptToMessageClientStub.args[0][1]).to.deep.equal({
        'firebase-messaging-msg-data': {},
        'firebase-messaging-msg-type': 'notification-clicked'
      });
    });
  });

  describe('getNotificationData_', () => {
    it('should return nothing for no payload', () => {
      const swController = new SWController(app);
      expect(swController.getNotificationData_(undefined as any)).to.equal(
        undefined
      );
    });
  });

  describe('attemptToMessageClient_', () => {
    it('should reject when no window client provided', () => {
      const swController = new SWController(app);
      return swController.attemptToMessageClient_(null as any, {} as any).then(
        () => {
          throw new Error('Expected error to be thrown');
        },
        err => {
          expect(err).to.exist;
          expect(err.code).to.equal('messaging/no-window-client-to-msg');
        }
      );
    });

    it('should message window client', async () => {
      const msg: any = {};
      const client: any = {
        postMessage: sandbox.spy()
      };
      const swController = new SWController(app);
      await swController.attemptToMessageClient_(client, msg);
      expect(client.postMessage.callCount).to.equal(1);
      expect(client.postMessage.getCall(0).args[0]).to.equal(msg);
    });
  });

  describe('sendMessageToWindowClients_', () => {
    it('should do nothing when no clients', async () => {
      const matchAllStub = sandbox.stub().callsFake(async () => []);
      const clients = {
        matchAll: matchAllStub
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);

      const payload = {};

      await swController.sendMessageToWindowClients_(payload);
      expect(matchAllStub.callCount).to.equal(1);
      expect(matchAllStub.getCall(0).args[0]).to.deep.equal({
        type: 'window',
        includeUncontrolled: true
      });
    });

    it('should message existing clients', async () => {
      const clientList = [{}, {}];
      const matchAllStub = sandbox.stub().callsFake(async () => clientList);
      const clients = {
        matchAll: matchAllStub
      };
      sandbox.stub(self, 'clients').value(clients);

      const swController = new SWController(app);
      const attemptToMessageClientStub = sandbox
        .stub(swController, 'attemptToMessageClient_')
        .callsFake(async () => {});

      const payload: any = {
        example: 'test'
      };

      await swController.sendMessageToWindowClients_(payload);
      expect(matchAllStub.callCount).to.equal(1);
      expect(matchAllStub.getCall(0).args[0]).to.deep.equal({
        type: 'window',
        includeUncontrolled: true
      });

      expect(attemptToMessageClientStub.callCount).to.equal(clientList.length);
      for (let i = 0; i < clientList.length; i++) {
        expect(attemptToMessageClientStub.args[i][0]).to.equal(clientList[i]);
        expect(attemptToMessageClientStub.args[i][1]).to.deep.equal({
          'firebase-messaging-msg-data': {
            example: 'test'
          },
          'firebase-messaging-msg-type': 'push-msg-received'
        });
      }
    });
  });

  describe('constructor', () => {
    it('should hook up push events', () => {
      const listeners: { [key: string]: (e: Event) => void } = {};
      sandbox.stub(self, 'addEventListener').callsFake((eventName, eventCb) => {
        listeners[eventName] = eventCb;
      });
      const onPushStub = sandbox.stub(SWController.prototype, 'onPush');
      const pushEvent = new Event('push');

      new SWController(app);
      expect(listeners['push']).to.exist;

      listeners['push'](pushEvent);

      expect(onPushStub.callCount).to.equal(1);
      expect(onPushStub.args[0][0]).to.equal(pushEvent);
    });

    it('should hook up subscription change events', () => {
      const listeners: { [key: string]: (e: Event) => void } = {};
      sandbox.stub(self, 'addEventListener').callsFake((eventName, eventCb) => {
        listeners[eventName] = eventCb;
      });
      const onSubChangeStub = sandbox.stub(
        SWController.prototype,
        'onSubChange'
      );
      const pushEvent = new Event('pushsubscriptionchange');

      new SWController(app);
      expect(listeners['pushsubscriptionchange']).to.exist;

      listeners['pushsubscriptionchange'](pushEvent);

      expect(onSubChangeStub.callCount).to.equal(1);
      expect(onSubChangeStub.args[0][0]).to.equal(pushEvent);

      // sandbox.stub(swController, 'onNotificationClick');

      // const notificaitonClick = new Event('notificationclick');

      // self.dispatchEvent(notificaitonClick);
    });

    it('should hook up notification click events', () => {
      const listeners: { [key: string]: (e: Event) => void } = {};
      sandbox.stub(self, 'addEventListener').callsFake((eventName, eventCb) => {
        listeners[eventName] = eventCb;
      });
      const onNotificationClickStub = sandbox.stub(
        SWController.prototype,
        'onNotificationClick'
      );
      const pushEvent = new Event('notificationclick');

      new SWController(app);
      expect(listeners['notificationclick']).to.exist;

      listeners['notificationclick'](pushEvent);

      expect(onNotificationClickStub.callCount).to.equal(1);
      expect(onNotificationClickStub.args[0][0]).to.equal(pushEvent);
    });
  });

  describe('onSubChange', () => {
    it('should do nothing if subscription is same', () => {});

    it('should update token if the subscription has changed', () => {});

    it('should handle errors and delete token', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);

      sandbox
        .stub(SWController.prototype, 'getSWRegistration_')
        .callsFake(async () => {
          throw new Error('Injected Error');
        });
      const waitUntilSpy = sandbox.spy();
      const event: any = {
        waitUntil: waitUntilSpy
      };

      const swController = new SWController(app);
      swController.onSubChange(event);

      let error: FirebaseError | undefined;
      try {
        await event.waitUntil.getCall(0).args[0];
      } catch (e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error!.code).to.equal('messaging/unable-to-resubscribe');
    });
  });

  describe('getPublicVapidKey_()', () => {
    it('should return the default key by default', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);
      const controller = new SWController(app);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(async () => null);
      const pubKey = await controller.getPublicVapidKey_();
      expect(pubKey).to.equal(DEFAULT_PUBLIC_VAPID_KEY);
    });

    it('should return the default key', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);
      const controller = new SWController(app);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(async () => DEFAULT_PUBLIC_VAPID_KEY);
      const pubKey = await controller.getPublicVapidKey_();
      expect(pubKey).to.equal(DEFAULT_PUBLIC_VAPID_KEY);
    });

    it('should return the custom key if set', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);
      const controller = new SWController(app);
      const vapidKeyInUse = base64ToArrayBuffer(VALID_VAPID_KEY);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(async () => vapidKeyInUse);
      const pubKey = await controller.getPublicVapidKey_();
      expect(pubKey).deep.equal(vapidKeyInUse);
    });
  });
});
