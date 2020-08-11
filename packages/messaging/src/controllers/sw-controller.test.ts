/**
 * @license
 * Copyright 2017 Google LLC
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
import { stub, spy } from 'sinon';

import { getFakeFirebaseDependencies } from '../testing/fakes/firebase-dependencies';
import '../testing/setup';
import { SwController, BgMessageHandler } from './sw-controller';
import * as tokenManagementModule from '../core/token-management';
import * as utilModule from '@firebase/util';
import { Stub } from '../testing/sinon-types';
import { Writable, ValueOf, DeepPartial } from 'ts-essentials';
import { MessagePayload } from '../interfaces/message-payload';
import { MessageType, InternalMessage } from '../interfaces/internal-message';
import {
  mockServiceWorker,
  restoreServiceWorker,
  FakeEvent,
  FakePushSubscription
} from '../testing/fakes/service-worker';
import {
  FCM_MSG,
  DEFAULT_VAPID_KEY,
  CONSOLE_CAMPAIGN_ID,
  CONSOLE_CAMPAIGN_NAME,
  CONSOLE_CAMPAIGN_TIME,
  CONSOLE_CAMPAIGN_ANALYTICS_ENABLED
} from '../util/constants';
import { dbSet } from '../helpers/idb-manager';
import { getFakeTokenDetails } from '../testing/fakes/token-details';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';

// Add fake SW types.
declare const self: Window & Writable<ServiceWorkerGlobalScope>;

const NOTIFICATION_MESSAGE_PAYLOAD: MessagePayload = {
  notification: {
    title: 'message title',
    body: 'message body',
    data: {
      key: 'value'
    }
  },
  fcmOptions: {
    link: 'https://example.org'
  }
};

const DATA_MESSAGE_PAYLOAD: MessagePayload = {
  data: {
    key: 'value'
  }
};

describe('SwController', () => {
  let addEventListenerStub: Stub<typeof self.addEventListener>;
  let eventListenerMap: Map<string, Function>;
  let swController: SwController;
  let firebaseDependencies: FirebaseInternalDependencies;
  let getTokenStub: Stub<typeof tokenManagementModule['getToken']>;
  let deleteTokenStub: Stub<typeof tokenManagementModule['deleteToken']>;

  beforeEach(() => {
    mockServiceWorker();

    stub(Notification, 'permission').value('granted');

    // Instead of calling actual addEventListener, add the event to the
    // eventListeners list.
    // Actual event listeners can't be used as the tests are not running in a
    // Service Worker, which means Push events do not exist.
    addEventListenerStub = stub(self, 'addEventListener').callsFake(
      (type, listener) => {
        eventListenerMap.set(type, listener);
      }
    );
    eventListenerMap = new Map();

    getTokenStub = stub(tokenManagementModule, 'getToken').resolves(
      'token-value'
    );
    deleteTokenStub = stub(tokenManagementModule, 'deleteToken').resolves(true);

    firebaseDependencies = getFakeFirebaseDependencies();
    swController = new SwController(firebaseDependencies);
  });

  afterEach(() => {
    restoreServiceWorker();
  });

  it('has app', () => {
    expect(swController.app).to.equal(firebaseDependencies.app);
  });

  it('sets event listeners on initialization', () => {
    expect(addEventListenerStub).to.have.been.calledThrice;
    expect(addEventListenerStub).to.have.been.calledWith('push');
    expect(addEventListenerStub).to.have.been.calledWith(
      'pushsubscriptionchange'
    );
    expect(addEventListenerStub).to.have.been.calledWith('notificationclick');
  });

  it('throws when window-only methods are called', () => {
    expect(() => swController.requestPermission()).to.throw(
      'messaging/only-available-in-window'
    );
    expect(() => swController.useServiceWorker()).to.throw(
      'messaging/only-available-in-window'
    );
    expect(() => swController.onMessage()).to.throw(
      'messaging/only-available-in-window'
    );
    expect(() => swController.onTokenRefresh()).to.throw(
      'messaging/only-available-in-window'
    );
  });

  describe('getToken', () => {
    it('calls getToken with the set VAPID key', async () => {
      swController.usePublicVapidKey('use-vapid-key');
      await swController.getToken();

      expect(getTokenStub).to.have.been.calledWith(
        firebaseDependencies,
        self.registration,
        'use-vapid-key'
      );
    });

    it('calls getToken with the current VAPID key if it is not set', async () => {
      const tokenDetails = getFakeTokenDetails();
      await dbSet(firebaseDependencies, tokenDetails);

      await swController.getToken();

      expect(getTokenStub).to.have.been.calledWith(
        firebaseDependencies,
        self.registration,
        'dmFwaWQta2V5LXZhbHVl'
      );
    });

    it('calls getToken with the default VAPID key if there is no token in db', async () => {
      await swController.getToken();

      expect(getTokenStub).to.have.been.calledWith(
        firebaseDependencies,
        self.registration,
        DEFAULT_VAPID_KEY
      );
    });
  });

  describe('deleteToken', () => {
    it('calls deleteToken', async () => {
      await swController.deleteToken();

      expect(deleteTokenStub).to.have.been.calledWith(
        firebaseDependencies,
        self.registration
      );
    });
  });

  describe('onPush', () => {
    it('does nothing if push is not from FCM', async () => {
      const showNotificationSpy = spy(self.registration, 'showNotification');
      const matchAllSpy = spy(self.clients, 'matchAll');

      await callEventListener(makeEvent('push', {}));

      await callEventListener(
        makeEvent('push', {
          data: {}
        })
      );

      expect(showNotificationSpy).not.to.have.been.called;
      expect(matchAllSpy).not.to.have.been.called;
    });

    it('sends a message to window clients if a window client is visible', async () => {
      const client: Writable<WindowClient> = (await self.clients.openWindow(
        'https://example.org'
      ))!;
      client.visibilityState = 'visible';
      const postMessageSpy = spy(client, 'postMessage');

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => NOTIFICATION_MESSAGE_PAYLOAD
          }
        })
      );

      const expectedMessage: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.PUSH_RECEIVED,
          payload: NOTIFICATION_MESSAGE_PAYLOAD
        }
      };
      expect(postMessageSpy).to.have.been.calledOnceWith(expectedMessage);
    });

    it('sends a message to chrome extension clients if a chrome extension client is visible', async () => {
      const client: Writable<WindowClient> = (await self.clients.openWindow(
        'chrome-extension://testExtensionId/popup.html'
      ))!;
      const backgroundClient: Writable<WindowClient> = (await self.clients.openWindow(
        'chrome-extension://testExtensionId/background_page.html'
      ))!;
      client.visibilityState = 'visible';
      stub(utilModule, 'getBrowserExtensionRuntime').returns({
        getBackgroundClient() {
          return backgroundClient;
        }
      });
      const postMessageSpy = spy(client, 'postMessage');

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => NOTIFICATION_MESSAGE_PAYLOAD
          }
        })
      );

      const expectedMessage: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.PUSH_RECEIVED,
          payload: NOTIFICATION_MESSAGE_PAYLOAD
        }
      };
      expect(postMessageSpy).to.have.been.calledOnceWith(expectedMessage);
    });

    it('does not send a message to window clients if window clients are hidden', async () => {
      const client = (await self.clients.openWindow('https://example.org'))!;
      const postMessageSpy = spy(client, 'postMessage');
      const showNotificationSpy = spy(self.registration, 'showNotification');

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => NOTIFICATION_MESSAGE_PAYLOAD
          }
        })
      );

      expect(postMessageSpy).not.to.have.been.called;
      expect(showNotificationSpy).to.have.been.calledWith('message title', {
        ...NOTIFICATION_MESSAGE_PAYLOAD.notification,
        data: {
          ...NOTIFICATION_MESSAGE_PAYLOAD.notification!.data,
          [FCM_MSG]: NOTIFICATION_MESSAGE_PAYLOAD
        }
      });
    });

    it('does not send a message to chrome extension background pages if background page is visible', async () => {
      const client: Writable<WindowClient> = (await self.clients.openWindow(
        'chrome-extension://testExtensionId/background_page.html'
      ))!;
      client.visibilityState = 'visible';
      stub(utilModule, 'getBrowserExtensionRuntime').returns({
        getBackgroundClient() {
          return client;
        }
      });
      const postMessageSpy = spy(client, 'postMessage');
      const showNotificationSpy = spy(self.registration, 'showNotification');

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => NOTIFICATION_MESSAGE_PAYLOAD
          }
        })
      );

      expect(postMessageSpy).not.to.have.been.called;
      expect(showNotificationSpy).to.have.been.calledWith('message title', {
        ...NOTIFICATION_MESSAGE_PAYLOAD.notification,
        data: {
          ...NOTIFICATION_MESSAGE_PAYLOAD.notification!.data,
          [FCM_MSG]: NOTIFICATION_MESSAGE_PAYLOAD
        }
      });
    });

    it('displays a notification if a window client does not exist', async () => {
      const showNotificationSpy = spy(self.registration, 'showNotification');

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => NOTIFICATION_MESSAGE_PAYLOAD
          }
        })
      );

      expect(showNotificationSpy).to.have.been.calledWith('message title', {
        ...NOTIFICATION_MESSAGE_PAYLOAD.notification,
        data: {
          ...NOTIFICATION_MESSAGE_PAYLOAD.notification!.data,
          [FCM_MSG]: NOTIFICATION_MESSAGE_PAYLOAD
        }
      });
    });

    it('calls bgMessageHandler if message is not a notification', async () => {
      const bgMessageHandlerSpy = spy();
      swController.setBackgroundMessageHandler(bgMessageHandlerSpy);

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => DATA_MESSAGE_PAYLOAD
          }
        })
      );

      expect(bgMessageHandlerSpy).to.have.been.calledWith();
    });

    it('warns if there are more action buttons than the browser limit', async () => {
      // This doesn't exist on Firefox:
      // https://developer.mozilla.org/en-US/docs/Web/API/notification/maxActions
      if (!Notification.maxActions) {
        return;
      }
      stub(Notification, 'maxActions').value(1);

      const warnStub = stub(console, 'warn');

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => ({
              notification: {
                ...NOTIFICATION_MESSAGE_PAYLOAD,
                actions: [
                  { action: 'like', title: 'Like' },
                  { action: 'favorite', title: 'Favorite' }
                ]
              }
            })
          }
        })
      );

      expect(warnStub).to.have.been.calledOnceWith(
        'This browser only supports 1 actions. The remaining actions will not be displayed.'
      );
    });
  });

  describe('setBackgrounMessageHandler', () => {
    it('throws on invalid input', () => {
      expect(() =>
        swController.setBackgroundMessageHandler(
          (null as unknown) as BgMessageHandler
        )
      ).to.throw('messaging/invalid-bg-handler');
    });
  });

  describe('usePublicVapidKey', () => {
    it('throws on invalid input', () => {
      expect(() =>
        swController.usePublicVapidKey((null as unknown) as string)
      ).to.throw('messaging/invalid-vapid-key');

      expect(() => swController.usePublicVapidKey('')).to.throw(
        'messaging/invalid-vapid-key'
      );
    });

    it('throws if called twice', () => {
      swController.usePublicVapidKey('dmFwaWQta2V5LXZhbHVl');
      expect(() =>
        swController.usePublicVapidKey('dmFwaWQta2V5LXZhbHVl')
      ).to.throw('messaging/use-vapid-key-after-get-token');
    });

    it('throws if called after getToken', async () => {
      await swController.getToken();

      expect(() =>
        swController.usePublicVapidKey('dmFwaWQta2V5LXZhbHVl')
      ).to.throw('messaging/use-vapid-key-after-get-token');
    });
  });

  describe('onNotificationClick', () => {
    let NOTIFICATION_CLICK_PAYLOAD: DeepPartial<NotificationEvent>;

    beforeEach(() => {
      NOTIFICATION_CLICK_PAYLOAD = {
        notification: new Notification('message title', {
          ...NOTIFICATION_MESSAGE_PAYLOAD.notification,
          data: {
            ...NOTIFICATION_MESSAGE_PAYLOAD.notification!.data,
            [FCM_MSG]: NOTIFICATION_MESSAGE_PAYLOAD
          }
        })
      };
    });

    it('does nothing if notification is not from FCM', async () => {
      delete NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG];

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);
      const stopImmediatePropagationSpy = spy(
        event,
        'stopImmediatePropagation'
      );

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).not.to.have.been.called;
    });

    it('does nothing if an action button was clicked', async () => {
      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);
      event.action = 'actionName';
      const stopImmediatePropagationSpy = spy(
        event,
        'stopImmediatePropagation'
      );

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).not.to.have.been.called;
    });

    it('calls stopImmediatePropagation and notification.close', async () => {
      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);
      const stopImmediatePropagationSpy = spy(
        event,
        'stopImmediatePropagation'
      );
      const notificationCloseSpy = spy(event.notification, 'close');

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).to.have.been.called;
      expect(notificationCloseSpy).to.have.been.called;
    });

    it('does not redirect if there is no link', async () => {
      // Remove link.
      delete NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].fcmOptions;

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);
      const stopImmediatePropagationSpy = spy(
        event,
        'stopImmediatePropagation'
      );
      const notificationCloseSpy = spy(event.notification, 'close');
      const matchAllSpy = spy(self.clients, 'matchAll');

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).to.have.been.called;
      expect(notificationCloseSpy).to.have.been.called;
      expect(matchAllSpy).not.to.have.been.called;
    });

    it('focuses on and sends the message to an open WindowClient', async () => {
      const client: Writable<WindowClient> = (await self.clients.openWindow(
        'https://example.org'
      ))!;
      const focusSpy = spy(client, 'focus');
      const matchAllSpy = spy(self.clients, 'matchAll');
      const openWindowSpy = spy(self.clients, 'openWindow');
      const postMessageSpy = spy(client, 'postMessage');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).to.have.been.called;
      expect(openWindowSpy).not.to.have.been.called;
      expect(focusSpy).to.have.been.called;
      expect(postMessageSpy).to.have.been.calledWith({
        firebaseMessaging: {
          type: MessageType.NOTIFICATION_CLICKED,
          payload: NOTIFICATION_MESSAGE_PAYLOAD
        }
      });
    });

    it("opens a new client if there isn't one already open", async () => {
      const matchAllSpy = spy(self.clients, 'matchAll');
      const openWindowSpy = spy(self.clients, 'openWindow');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).to.have.been.called;
      expect(openWindowSpy).to.have.been.calledWith('https://example.org');
    });

    it('works with click_action', async () => {
      // Replace link with the deprecated click_action.
      delete NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].fcmOptions;
      NOTIFICATION_CLICK_PAYLOAD.notification!.data![
        FCM_MSG
      ].notification.click_action = 'https://example.org'; // eslint-disable-line camelcase

      const matchAllSpy = spy(self.clients, 'matchAll');
      const openWindowSpy = spy(self.clients, 'openWindow');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).to.have.been.called;
      expect(openWindowSpy).to.have.been.calledWith('https://example.org');
    });

    it('redirects to origin if message was sent from the FN Console', async () => {
      // Remove link.
      delete NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].fcmOptions;
      // Add FN data.
      NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].data = {
        [CONSOLE_CAMPAIGN_ID]: '123456',
        [CONSOLE_CAMPAIGN_NAME]: 'Campaign Name',
        [CONSOLE_CAMPAIGN_TIME]: '1234567890',
        [CONSOLE_CAMPAIGN_ANALYTICS_ENABLED]: '1'
      };

      const matchAllSpy = spy(self.clients, 'matchAll');
      const openWindowSpy = spy(self.clients, 'openWindow');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).to.have.been.called;
      expect(openWindowSpy).to.have.been.calledWith(self.location.origin);
    });
  });

  describe('onSubChange', () => {
    it('calls deleteToken if there is no new subscription', async () => {
      const event = makeEvent('pushsubscriptionchange', {
        oldSubscription: new FakePushSubscription(),
        newSubscription: undefined
      });

      await callEventListener(event);

      expect(deleteTokenStub).to.have.been.called;
      expect(getTokenStub).not.to.have.been.called;
    });

    it('calls deleteToken and getToken if subscription changed', async () => {
      const event = makeEvent('pushsubscriptionchange', {
        oldSubscription: new FakePushSubscription(),
        newSubscription: new FakePushSubscription()
      });

      await callEventListener(event);

      expect(deleteTokenStub).to.have.been.called;
      expect(getTokenStub).to.have.been.called;
    });
  });

  async function callEventListener(
    event: ValueOf<ServiceWorkerGlobalScopeEventMap>
  ): Promise<void> {
    const listener = eventListenerMap.get(event.type);
    if (!listener) {
      throw new Error(`Event listener for ${event.type} was not defined.`);
    }

    const waitUntil = spy(event, 'waitUntil');
    listener(event);
    await waitUntil.getCall(0).args[0];
  }
});

/** Makes fake push events. */
function makeEvent<K extends keyof ServiceWorkerGlobalScopeEventMap>(
  type: K,
  data: DeepPartial<ServiceWorkerGlobalScopeEventMap[K]>
): Writable<ServiceWorkerGlobalScopeEventMap[K]> {
  const event = new FakeEvent(type);
  Object.assign(event, data);
  return (event as unknown) as ServiceWorkerGlobalScopeEventMap[K];
}
