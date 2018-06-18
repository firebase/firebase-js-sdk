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

import { SwController } from '../src/controllers/sw-controller';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';
import { VapidDetailsModel } from '../src/models/vapid-details-model';

import { describe } from './testing-utils/messaging-test-runner';

const VALID_VAPID_KEY =
  'BJzVfWqLoALJdgV20MYy6lrj0OfhmE16PI1qLIIYx2ZZL3FoQWJJL8L0rf7rS7tqd92j_3xN3fmejKK5Eb7yMYw';

describe('Firebase Messaging > *SwController', () => {
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
      const swController = new SwController(app);
      const waitUntilSpy = sandbox.spy();
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: undefined
      } as any);

      await waitUntilSpy.getCall(0).args[0];
    });

    it('should handle a push event where .json() throws', async () => {
      const swController = new SwController(app);
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
        SwController.prototype,
        'sendMessageToWindowClients_'
      );
      sandbox
        .stub(SwController.prototype, 'hasVisibleClients_')
        .callsFake(async () => true);

      const swController = new SwController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => ({})
        }
      } as any);

      await waitUntilSpy.getCall(0).args[0];
      expect(stub.callCount).to.equal(1);
    });

    it('should send notification payload to window if window is in focus', async () => {
      const waitUntilSpy = sandbox.spy();
      const stub = sandbox.stub(
        SwController.prototype,
        'sendMessageToWindowClients_'
      );
      sandbox
        .stub(SwController.prototype, 'hasVisibleClients_')
        .callsFake(async () => true);

      const swController = new SwController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => ({
            notification: {}
          })
        }
      } as any);

      await waitUntilSpy.getCall(0).args[0];
      expect(stub.callCount).to.equal(1);
    });

    it('should send to window if a bgMessageHandler is defined', async () => {
      const waitUntilSpy = sandbox.spy();
      const stub = sandbox.stub(
        SwController.prototype,
        'sendMessageToWindowClients_'
      );
      sandbox
        .stub(SwController.prototype, 'hasVisibleClients_')
        .callsFake(async () => true);

      const swController = new SwController(app);
      swController.setBackgroundMessageHandler((() => {}) as any);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => ({})
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
        .stub(SwController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);
      const showNotificationStub = sandbox.spy(
        registration,
        'showNotification'
      );

      const swController = new SwController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => ({
            notification: {}
          })
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

      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SwController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);
      const showNotificationSpy = sandbox.spy(registration, 'showNotification');

      const notificationData = {
        title: 'test-title',
        body: 'test-body',
        icon: '/images/test-icon.png'
      };

      const swController = new SwController(app);
      swController.onPush({
        waitUntil: waitUntilSpy,
        data: {
          json: () => ({
            notification: notificationData
          })
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

    it('displays a warning if there are too many actions in the message', async () => {
      if (!('maxActions' in Notification)) {
        // Browser does not support maxActions, skip test
        return;
      }

      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);

      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SwController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);
      sandbox.spy(registration, 'showNotification');

      // TODO: Remove cast
      sandbox.stub(Notification as any, 'maxActions').value(2);

      const consoleWarnStub = sandbox.stub(console, 'warn');

      const notificationData = {
        title: 'test-title',
        body: 'test-body',
        actions: [
          {
            action: 'action1',
            title: 'Action 1'
          },
          {
            action: 'action2',
            title: 'Action 2'
          },
          {
            action: 'action3',
            title: 'Action 3'
          },
          {
            action: 'action4',
            title: 'Action 4'
          }
        ]
      };

      const swController = new SwController(app);
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

      expect(consoleWarnStub.callCount).to.equal(1);
      expect(consoleWarnStub.getCall(0).args[0]).to.equal(
        `This browser only supports 2 actions.` +
          `The remaining actions will not be displayed.`
      );
    });

    it('should fall back to background message handler otherwise', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);

      const bgMessageHandlerSpy = sandbox.spy();
      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SwController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);
      sandbox.spy(registration, 'showNotification');

      const payloadData = {};

      const swController = new SwController(app);
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
      expect(bgMessageHandlerSpy.callCount).to.equal(1);
      expect(bgMessageHandlerSpy.args[0][0]).to.equal(payloadData);
    });

    it('should do nothing if no background message handler and no notification', async () => {
      const waitUntilSpy = sandbox.spy();
      sandbox
        .stub(SwController.prototype, 'hasVisibleClients_')
        .callsFake(async () => false);

      const swController = new SwController(app);
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
      const swController = new SwController(app);
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

      const swController = new SwController(app);
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

      const swController = new SwController(app);
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

      const swController = new SwController(app);
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

      const swController = new SwController(app);
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

      const swController = new SwController(app);
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

      const swController = new SwController(app);
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
      const swController = new SwController(app);

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
      const swController = new SwController(app);

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
      const swController = new SwController(app);

      swController.onNotificationClick(event);

      expect(event.stopImmediatePropagation.callCount).to.equal(0);
    });

    it('should do nothing for action clicks', async () => {
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
        stopImmediatePropagation: sandbox.spy(),
        action: 'action1'
      };
      const swController = new SwController(app);

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
      const swController = new SwController(app);

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
      const swController = new SwController(app);

      swController.onNotificationClick(event);
      await event.waitUntil.getCall(0).args[0];

      expect(event.stopImmediatePropagation.callCount).to.equal(1);
      expect(event.notification.close.callCount).to.equal(1);
    });

    for (const key of ['link', 'click_action']) {
      describe(key, () => {
        let link: string;
        let waitUntilSpy: sinon.SinonSpy;
        let event: any;

        beforeEach(() => {
          link = '/test-link';
          waitUntilSpy = sandbox.spy();

          const FCM_MSG =
            key === 'link'
              ? // New API
                {
                  notification: {},
                  fcmOptions: {
                    link
                  }
                }
              : // Legacy API
                {
                  notification: {
                    click_action: link
                  }
                };

          event = {
            notification: {
              data: {
                FCM_MSG
              },
              close: sandbox.spy()
            },
            waitUntil: waitUntilSpy,
            stopImmediatePropagation: sandbox.spy()
          };
        });

        it('should open URL (third-party so no window client access)', async () => {
          const openWindowStub = sandbox.stub().callsFake(() => {
            // Pretend it's a third party URL
            return null;
          });

          const clients = {
            openWindow: openWindowStub
          };
          sandbox.stub(self, 'clients').value(clients);

          const swController = new SwController(app);

          sandbox
            .stub(swController, 'getWindowClient_')
            .callsFake(async () => null);

          swController.onNotificationClick(event);

          expect(event.stopImmediatePropagation.callCount).to.equal(1);
          expect(event.notification.close.callCount).to.equal(1);

          await event.waitUntil.getCall(0).args[0];
          expect(openWindowStub.callCount).to.equal(1);
          expect(openWindowStub.getCall(0).args[0]).to.equal(link);
        });

        it('should open URL (same origin will include window client access)', async () => {
          const fakeWindowClient = {};

          const openWindowStub = sandbox.stub().callsFake(() => {
            // Pretend it's a same origin URL
            return fakeWindowClient;
          });

          const clients = {
            openWindow: openWindowStub
          };
          sandbox.stub(self, 'clients').value(clients);

          const swController = new SwController(app);

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
          expect(openWindowStub.getCall(0).args[0]).to.equal(link);

          expect(attemptToMessageClientStub.callCount).to.equal(1);
          expect(attemptToMessageClientStub.args[0][0]).to.equal(
            fakeWindowClient
          );
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

          const openWindowStub = sandbox.stub().callsFake(() => {
            // Pretend it's a same origin URL
            return fakeWindowClient;
          });

          const clients = {
            openWindow: openWindowStub
          };
          sandbox.stub(self, 'clients').value(clients);

          const swController = new SwController(app);

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
          expect(attemptToMessageClientStub.args[0][0]).to.equal(
            fakeWindowClient
          );
          expect(attemptToMessageClientStub.args[0][1]).to.deep.equal({
            'firebase-messaging-msg-data': {},
            'firebase-messaging-msg-type': 'notification-clicked'
          });
        });
      });
    }
  });

  describe('getNotificationData_', () => {
    it('should return nothing for no payload', () => {
      const swController = new SwController(app);
      expect(swController.getNotificationData_(undefined as any)).to.equal(
        undefined
      );
    });

    it('adds message payload to data.FCM_MSG without replacing user defined data', () => {
      const swController = new SwController(app);
      const msgPayload = {
        notification: {
          title: 'Hello World',
          body: 'Notification Body',
          data: {
            userDefinedData: 'canBeAnything'
          }
        },
        data: {
          randomData: 'randomString'
        }
      };

      expect(swController.getNotificationData_(msgPayload)).to.deep.equal({
        title: 'Hello World',
        body: 'Notification Body',
        data: {
          userDefinedData: 'canBeAnything',
          FCM_MSG: msgPayload
        }
      });
    });
  });

  describe('attemptToMessageClient_', () => {
    it('should reject when no window client provided', () => {
      const swController = new SwController(app);
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
      const swController = new SwController(app);
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

      const swController = new SwController(app);

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

      const swController = new SwController(app);
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
      const onPushStub = sandbox.stub(SwController.prototype, 'onPush');
      const pushEvent = new Event('push');

      new SwController(app);
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
        SwController.prototype,
        'onSubChange'
      );
      const pushEvent = new Event('pushsubscriptionchange');

      new SwController(app);
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
        SwController.prototype,
        'onNotificationClick'
      );
      const pushEvent = new Event('notificationclick');

      new SwController(app);
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
        .stub(SwController.prototype, 'getSWRegistration_')
        .callsFake(async () => {
          throw new Error('Injected Error');
        });
      const waitUntilSpy = sandbox.spy();
      const event: any = {
        waitUntil: waitUntilSpy
      };

      const swController = new SwController(app);
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
      const controller = new SwController(app);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(async () => null);
      const pubKey = await controller.getPublicVapidKey_();
      expect(pubKey).to.equal(DEFAULT_PUBLIC_VAPID_KEY);
    });

    it('should return the default key', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);
      const controller = new SwController(app);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(async () => DEFAULT_PUBLIC_VAPID_KEY);
      const pubKey = await controller.getPublicVapidKey_();
      expect(pubKey).to.equal(DEFAULT_PUBLIC_VAPID_KEY);
    });

    it('should return the custom key if set', async () => {
      const registration = makeFakeSWReg();
      sandbox.stub(self, 'registration').value(registration);
      const controller = new SwController(app);
      const vapidKeyInUse = base64ToArrayBuffer(VALID_VAPID_KEY);
      sandbox
        .stub(VapidDetailsModel.prototype, 'getVapidFromSWScope')
        .callsFake(async () => vapidKeyInUse);
      const pubKey = await controller.getPublicVapidKey_();
      expect(pubKey).deep.equal(vapidKeyInUse);
    });
  });
});
