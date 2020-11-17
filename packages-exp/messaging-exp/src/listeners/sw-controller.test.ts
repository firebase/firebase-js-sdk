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

import '../testing/setup';

import * as tokenManagementModule from '../internals/token-manager';

import {
  CONSOLE_CAMPAIGN_ANALYTICS_ENABLED,
  CONSOLE_CAMPAIGN_ID,
  CONSOLE_CAMPAIGN_NAME,
  CONSOLE_CAMPAIGN_TIME,
  FCM_MSG
} from '../util/constants';
import { DeepPartial, ValueOf, Writable } from 'ts-essentials';
import {
  FakeEvent,
  FakePushSubscription,
  mockServiceWorker,
  restoreServiceWorker
} from '../testing/fakes/service-worker';
import {
  MessagePayloadInternal,
  MessageType
} from '../interfaces/internal-message-payload';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { spy, stub } from 'sinon';

import { MessagingService } from '../messaging-service';
import { Stub } from '../testing/sinon-types';
import { SwController } from './sw-controller';
import { expect } from 'chai';

const LOCAL_HOST = self.location.host;
const TEST_LINK = 'https://' + LOCAL_HOST + '/test-link.org';
const TEST_CLICK_ACTION = 'https://' + LOCAL_HOST + '/test-click-action.org';

// Add fake SW types.
declare const self: Window & Writable<ServiceWorkerGlobalScope>;

// internal message payload (parsed directly from the push event) that contains and only contains
// notification payload.
const DISPLAY_MESSAGE: MessagePayloadInternal = {
  notification: {
    title: 'title',
    body: 'body'
  },
  fcmOptions: {
    link: TEST_LINK
  },
  from: 'from',
  // eslint-disable-next-line camelcase
  collapse_key: 'collapse'
};

describe('SwController', () => {
  let addEventListenerStub: Stub<typeof self.addEventListener>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  let eventListenerMap: Map<string, Function>;
  let messaging: MessagingService;
  let getTokenStub: Stub<typeof tokenManagementModule['getTokenInternal']>;
  let deleteTokenStub: Stub<
    typeof tokenManagementModule['deleteTokenInternal']
  >;

  beforeEach(() => {
    mockServiceWorker();

    stub(Notification, 'permission').value('granted');

    // Instead of calling actual addEventListener, add the event to the eventListeners list. Actual
    // event listeners can't be used as the tests are not running in a Service Worker, which means
    // Push events do not exist.
    addEventListenerStub = stub(self, 'addEventListener').callsFake(
      (type, listener) => {
        eventListenerMap.set(type, listener);
      }
    );
    eventListenerMap = new Map();

    getTokenStub = stub(tokenManagementModule, 'getTokenInternal').resolves(
      'token-value'
    );
    deleteTokenStub = stub(
      tokenManagementModule,
      'deleteTokenInternal'
    ).resolves(true);

    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
    new SwController(messaging);
  });

  afterEach(() => {
    restoreServiceWorker();
  });

  it('sets event listeners on initialization', () => {
    expect(addEventListenerStub).to.have.been.calledThrice;
    expect(addEventListenerStub).to.have.been.calledWith('push');
    expect(addEventListenerStub).to.have.been.calledWith(
      'pushsubscriptionchange'
    );
    expect(addEventListenerStub).to.have.been.calledWith('notificationclick');
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
            json: () => DISPLAY_MESSAGE
          }
        })
      );

      const expectedMessage: MessagePayloadInternal = {
        ...DISPLAY_MESSAGE,
        messageType: MessageType.PUSH_RECEIVED
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
            json: () => DISPLAY_MESSAGE
          }
        })
      );

      expect(postMessageSpy).not.to.have.been.called;
      expect(showNotificationSpy).to.have.been.calledWith('title', {
        ...DISPLAY_MESSAGE.notification,
        data: {
          [FCM_MSG]: DISPLAY_MESSAGE
        }
      });
    });

    it('displays a notification if a window client does not exist', async () => {
      const showNotificationSpy = spy(self.registration, 'showNotification');

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => DISPLAY_MESSAGE
          }
        })
      );

      expect(showNotificationSpy).to.have.been.calledWith('title', {
        ...DISPLAY_MESSAGE.notification,
        data: {
          ...DISPLAY_MESSAGE.notification!.data,
          [FCM_MSG]: DISPLAY_MESSAGE
        }
      });
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
                ...DISPLAY_MESSAGE,
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

  describe('onNotificationClick', () => {
    let NOTIFICATION_CLICK_PAYLOAD: DeepPartial<NotificationEvent>;

    beforeEach(() => {
      NOTIFICATION_CLICK_PAYLOAD = {
        notification: new Notification('title', {
          ...DISPLAY_MESSAGE.notification,
          data: {
            ...DISPLAY_MESSAGE.notification!.data,
            [FCM_MSG]: DISPLAY_MESSAGE
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

    it('does not redirect if link is not from origin', async () => {
      // Remove link.
      NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].fcmOptions.link =
        'https://www.youtube.com';

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
        TEST_LINK
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
        ...DISPLAY_MESSAGE,
        messageType: MessageType.NOTIFICATION_CLICKED
      });
    });

    it("opens a new client if there isn't one already open", async () => {
      const matchAllSpy = spy(self.clients, 'matchAll');
      const openWindowSpy = spy(self.clients, 'openWindow');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).to.have.been.called;
      expect(openWindowSpy).to.have.been.calledWith(TEST_LINK);
    });

    it('works with click_action', async () => {
      // Replace link with the deprecated click_action.
      delete NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].fcmOptions;
      NOTIFICATION_CLICK_PAYLOAD.notification!.data![
        FCM_MSG
      ].notification.click_action = TEST_CLICK_ACTION; // eslint-disable-line camelcase

      const matchAllSpy = spy(self.clients, 'matchAll');
      const openWindowSpy = spy(self.clients, 'openWindow');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).to.have.been.called;
      expect(openWindowSpy).to.have.been.calledWith(TEST_CLICK_ACTION);
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
