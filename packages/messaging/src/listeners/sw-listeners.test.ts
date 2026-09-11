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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  CONSOLE_CAMPAIGN_ANALYTICS_ENABLED,
  CONSOLE_CAMPAIGN_ID,
  CONSOLE_CAMPAIGN_NAME,
  CONSOLE_CAMPAIGN_TIME,
  FCM_LOG_SOURCE,
  FCM_MSG
} from '../util/constants';
import { DeepPartial, ValueOf, Writable } from 'ts-essentials';
import {
  FakeEvent,
  FakePushSubscription,
  mockServiceWorker,
  restoreServiceWorker
} from '../testing/fakes/service-worker';
import { getSuccessResponse } from '../testing/fakes/logging-object';
import {
  MessagePayloadInternal,
  MessageType
} from '../interfaces/internal-message-payload';
import {
  NotificationEvent,
  PushSubscriptionChangeEvent,
  ServiceWorkerGlobalScope,
  ServiceWorkerGlobalScopeEventMap,
  WindowClient
} from '../util/sw-types';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { onNotificationClick, onPush, onSubChange } from './sw-listeners';
import * as LogToFirelog from '../helpers/logToFirelog';
import { MessagingService } from '../messaging-service';

const {
  mockGetTokenInternal,
  mockRevokeRegistrationInternal,
  mockRefreshFidRegistrationIfStored,
  mockDbGetFidRegistration
} = vi.hoisted(() => ({
  mockGetTokenInternal: vi.fn(),
  mockRevokeRegistrationInternal: vi.fn(),
  mockRefreshFidRegistrationIfStored: vi.fn(),
  mockDbGetFidRegistration: vi.fn()
}));

vi.mock('../internals/token-manager', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../internals/token-manager')>();
  return {
    ...actual,
    getTokenInternal: (...args: unknown[]) =>
      mockGetTokenInternal.getMockImplementation()
        ? mockGetTokenInternal(...args)
        : actual.getTokenInternal(...(args as [any])),
    revokeRegistrationInternal: (...args: unknown[]) =>
      mockRevokeRegistrationInternal.getMockImplementation()
        ? mockRevokeRegistrationInternal(...args)
        : actual.revokeRegistrationInternal(...(args as [any]))
  };
});

vi.mock('../helpers/fid-change-registration', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../helpers/fid-change-registration')>();
  return {
    ...actual,
    refreshFidRegistrationIfStored: (...args: unknown[]) =>
      mockRefreshFidRegistrationIfStored.getMockImplementation()
        ? mockRefreshFidRegistrationIfStored(...args)
        : actual.refreshFidRegistrationIfStored(...(args as [any]))
  };
});

vi.mock('../internals/idb-manager', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../internals/idb-manager')>();
  return {
    ...actual,
    dbGetFidRegistration: (...args: unknown[]) =>
      mockDbGetFidRegistration.getMockImplementation()
        ? mockDbGetFidRegistration(...args)
        : actual.dbGetFidRegistration(...(args as [any]))
  };
});

vi.mock('../helpers/sleep', () => ({
  sleep: vi.fn().mockResolvedValue(undefined)
}));

const LOCAL_HOST = self.location.host;
const FIRELOG_ENDPOINT = 'https://play.google.com/log?format=json_proto3';
const FCM_TRANSPORT_KEY = LogToFirelog._mergeStrings(
  'AzSCbw63g1R0nCw85jG8',
  'Iaya3yLKwmgvh7cF0q4'
);
const TEST_LINK = 'https://' + LOCAL_HOST + '/test-link.org';
const TEST_CLICK_ACTION = 'https://' + LOCAL_HOST + '/test-click-action.org';

// Add fake SW types.
declare const self: ServiceWorkerGlobalScope;

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
  collapse_key: 'collapse',
  // eslint-disable-next-line camelcase
  fcmMessageId: 'mid',
  productId: 123
};

// maxActions is an experimental property and not part of the official
// TypeScript interface
// https://developer.mozilla.org/en-US/docs/Web/API/Notification/maxActions
interface NotificationExperimental extends Notification {
  maxActions?: number;
}

describe('SwController', () => {
  let addEventListenerStub: any;
  let eventListenerMap: Map<string, Function>;
  let messaging: MessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceWorker();

    vi.spyOn(Notification, 'permission', 'get').mockReturnValue('granted');

    eventListenerMap = new Map();
    addEventListenerStub = vi
      .spyOn(self, 'addEventListener')
      .mockImplementation(((type: string, listener: any) => {
        eventListenerMap.set(type, listener);
      }) as any);

    mockGetTokenInternal.mockReset().mockResolvedValue('token-value');
    mockRevokeRegistrationInternal.mockReset().mockResolvedValue(true);
    mockRefreshFidRegistrationIfStored.mockReset().mockResolvedValue(undefined);
    mockDbGetFidRegistration.mockReset().mockResolvedValue(undefined);

    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );

    self.addEventListener('push', e => {
      e.waitUntil(onPush(e, messaging as MessagingService));
    });
    self.addEventListener('pushsubscriptionchange', e => {
      e.waitUntil(onSubChange(e, messaging as MessagingService));
    });
    self.addEventListener('notificationclick', e => {
      e.waitUntil(onNotificationClick(e));
    });
  });

  afterEach(() => {
    restoreServiceWorker();
  });

  it('sets event listeners on initialization', () => {
    expect(addEventListenerStub).toHaveBeenCalledTimes(3);
    expect(addEventListenerStub).toHaveBeenCalledWith(
      'push',
      expect.any(Function)
    );
    expect(addEventListenerStub).toHaveBeenCalledWith(
      'pushsubscriptionchange',
      expect.any(Function)
    );
    expect(addEventListenerStub).toHaveBeenCalledWith(
      'notificationclick',
      expect.any(Function)
    );
  });

  describe('onPush', () => {
    it('does nothing if push is not from FCM', async () => {
      const showNotificationSpy = vi.spyOn(
        self.registration,
        'showNotification'
      );
      const matchAllSpy = vi.spyOn(self.clients, 'matchAll');

      await callEventListener(makeEvent('push', {}));

      await callEventListener(
        makeEvent('push', {
          data: {}
        })
      );

      expect(showNotificationSpy).not.toHaveBeenCalled();
      expect(matchAllSpy).not.toHaveBeenCalled();
    });

    it('sends a message to window clients if a window client is visible', async () => {
      const client: Writable<WindowClient> = (await self.clients.openWindow(
        'https://example.org'
      ))!;
      client.visibilityState = 'visible';
      const postMessageSpy = vi.spyOn(client, 'postMessage');

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
      expect(postMessageSpy).toHaveBeenCalledWith(expectedMessage);
    });

    it('does not send a message to window clients if window clients are hidden', async () => {
      const client = (await self.clients.openWindow('https://example.org'))!;
      const postMessageSpy = vi.spyOn(client, 'postMessage');
      const showNotificationSpy = vi.spyOn(
        self.registration,
        'showNotification'
      );

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => DISPLAY_MESSAGE
          }
        })
      );

      expect(postMessageSpy).not.toHaveBeenCalled();
      expect(showNotificationSpy).toHaveBeenCalledWith('title', {
        ...DISPLAY_MESSAGE.notification,
        data: {
          [FCM_MSG]: DISPLAY_MESSAGE
        }
      });
    });

    it('displays a notification if a window client does not exist', async () => {
      const showNotificationSpy = vi.spyOn(
        self.registration,
        'showNotification'
      );

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => DISPLAY_MESSAGE
          }
        })
      );

      expect(showNotificationSpy).toHaveBeenCalledWith('title', {
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
      if (!(Notification as unknown as NotificationExperimental).maxActions) {
        return;
      }
      vi.spyOn(
        Notification as unknown as NotificationExperimental,
        'maxActions',
        'get'
      ).mockReturnValue(1);

      const warnStub = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnStub).toHaveBeenCalledWith(
        'This browser only supports 1 actions. The remaining actions will not be displayed.'
      );
    });

    it('POSTs Firelog delivery metrics after onPush when BigQuery export is enabled', async () => {
      const fetchStub = vi
        .spyOn(window, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(getSuccessResponse())));
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => DISPLAY_MESSAGE
          }
        })
      );

      await new Promise<void>(resolve => setTimeout(resolve, 50));

      expect(fetchStub).toHaveBeenCalledTimes(1);
      const [url, init] = fetchStub.mock.calls[0];
      expect(url).toEqual(FIRELOG_ENDPOINT.concat('&key=', FCM_TRANSPORT_KEY));
      expect(init).to.deep.include({ method: 'POST' });
      const body = JSON.parse((init as RequestInit).body as string) as {
        log_source: string;
        log_event: unknown[];
      };
      expect(body.log_source).toEqual(FCM_LOG_SOURCE.toString());
      expect(body.log_event).to.have.length(1);
    });

    it('does not POST to Firelog from onPush when BigQuery export is disabled', async () => {
      const fetchStub = vi
        .spyOn(window, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(getSuccessResponse())));
      messaging.deliveryMetricsExportedToBigQueryEnabled = false;

      await callEventListener(
        makeEvent('push', {
          data: {
            json: () => DISPLAY_MESSAGE
          }
        })
      );

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchStub).not.toHaveBeenCalled();
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
      const stopImmediatePropagationSpy = vi.spyOn(
        event,
        'stopImmediatePropagation'
      );

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).not.toHaveBeenCalled();
    });

    it('does nothing if an action button was clicked', async () => {
      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);
      event.action = 'actionName';
      const stopImmediatePropagationSpy = vi.spyOn(
        event,
        'stopImmediatePropagation'
      );

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).not.toHaveBeenCalled();
    });

    it('calls stopImmediatePropagation and notification.close', async () => {
      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);
      const stopImmediatePropagationSpy = vi.spyOn(
        event,
        'stopImmediatePropagation'
      );
      const notificationCloseSpy = vi.spyOn(event.notification, 'close');

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).toHaveBeenCalled();
      expect(notificationCloseSpy).toHaveBeenCalled();
    });

    it('does not redirect if there is no link', async () => {
      // Remove link.
      delete NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].fcmOptions;

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);
      const stopImmediatePropagationSpy = vi.spyOn(
        event,
        'stopImmediatePropagation'
      );
      const notificationCloseSpy = vi.spyOn(event.notification, 'close');
      const matchAllSpy = vi.spyOn(self.clients, 'matchAll');

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).toHaveBeenCalled();
      expect(notificationCloseSpy).toHaveBeenCalled();
      expect(matchAllSpy).not.toHaveBeenCalled();
    });

    it('does not redirect if link is not from origin', async () => {
      // Remove link.
      NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].fcmOptions.link =
        'https://www.youtube.com';

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);
      const stopImmediatePropagationSpy = vi.spyOn(
        event,
        'stopImmediatePropagation'
      );
      const notificationCloseSpy = vi.spyOn(event.notification, 'close');
      const matchAllSpy = vi.spyOn(self.clients, 'matchAll');

      await callEventListener(event);

      expect(stopImmediatePropagationSpy).toHaveBeenCalled();
      expect(notificationCloseSpy).toHaveBeenCalled();
      expect(matchAllSpy).not.toHaveBeenCalled();
    });

    it('focuses on and sends the message to an open WindowClient', async () => {
      const client: Writable<WindowClient> =
        (await self.clients.openWindow(TEST_LINK))!;
      const focusSpy = vi.spyOn(client, 'focus');
      const matchAllSpy = vi.spyOn(self.clients, 'matchAll');
      const openWindowSpy = vi.spyOn(self.clients, 'openWindow');
      const postMessageSpy = vi.spyOn(client, 'postMessage');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).toHaveBeenCalled();
      expect(openWindowSpy).not.toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
      expect(postMessageSpy).toHaveBeenCalledWith({
        ...DISPLAY_MESSAGE,
        messageType: MessageType.NOTIFICATION_CLICKED
      });
    });

    it("opens a new client if there isn't one already open", async () => {
      const matchAllSpy = vi.spyOn(self.clients, 'matchAll');
      const openWindowSpy = vi.spyOn(self.clients, 'openWindow');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).toHaveBeenCalled();
      expect(openWindowSpy).toHaveBeenCalledWith(TEST_LINK);
    });

    it('works with click_action', async () => {
      // Replace link with the deprecated click_action.
      delete NOTIFICATION_CLICK_PAYLOAD.notification!.data![FCM_MSG].fcmOptions;
      NOTIFICATION_CLICK_PAYLOAD.notification!.data![
        FCM_MSG
      ].notification.click_action = TEST_CLICK_ACTION; // eslint-disable-line camelcase

      const matchAllSpy = vi.spyOn(self.clients, 'matchAll');
      const openWindowSpy = vi.spyOn(self.clients, 'openWindow');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).toHaveBeenCalled();
      expect(openWindowSpy).toHaveBeenCalledWith(TEST_CLICK_ACTION);
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

      const matchAllSpy = vi.spyOn(self.clients, 'matchAll');
      const openWindowSpy = vi.spyOn(self.clients, 'openWindow');

      const event = makeEvent('notificationclick', NOTIFICATION_CLICK_PAYLOAD);

      await callEventListener(event);

      expect(matchAllSpy).toHaveBeenCalled();
      expect(openWindowSpy).toHaveBeenCalledWith(self.location.origin);
    });
  });

  describe('onSubChange', () => {
    it('revokes registration if there is no new subscription', async () => {
      const event = makeFakePushSubscriptionChangeEvent({
        oldSubscription: new FakePushSubscription(),
        newSubscription: null
      });

      await callEventListener(event);

      expect(mockRevokeRegistrationInternal).toHaveBeenCalled();
      expect(mockGetTokenInternal).not.toHaveBeenCalled();
    });

    it('revokes registration and getToken if subscription changed', async () => {
      const event = makeFakePushSubscriptionChangeEvent({
        oldSubscription: new FakePushSubscription(),
        newSubscription: new FakePushSubscription()
      });

      await callEventListener(event);

      expect(mockRevokeRegistrationInternal).toHaveBeenCalled();
      expect(mockGetTokenInternal).toHaveBeenCalled();
      expect(mockRefreshFidRegistrationIfStored).not.toHaveBeenCalled();
    });

    it('refreshes FID registration when subscription changed and register() metadata exists', async () => {
      mockDbGetFidRegistration.mockResolvedValue({
        fid: 'fid-in-db',
        lastRegisterTime: Date.now()
      });
      const event = makeFakePushSubscriptionChangeEvent({
        oldSubscription: new FakePushSubscription(),
        newSubscription: new FakePushSubscription()
      });

      await callEventListener(event);

      expect(mockRefreshFidRegistrationIfStored).toHaveBeenCalledTimes(1);
      expect(mockRevokeRegistrationInternal).not.toHaveBeenCalled();
      expect(mockGetTokenInternal).not.toHaveBeenCalled();
    });

    it('notifies visible window clients on successful FID refresh', async () => {
      mockDbGetFidRegistration.mockResolvedValue({
        fid: 'fid-in-db',
        lastRegisterTime: Date.now()
      });
      mockRefreshFidRegistrationIfStored.mockResolvedValue('refreshed-fid');

      const client: Writable<WindowClient> = (await self.clients.openWindow(
        'https://example.org'
      ))!;
      client.visibilityState = 'visible';
      const postMessageSpy = vi.spyOn(client, 'postMessage');

      const event = makeFakePushSubscriptionChangeEvent({
        oldSubscription: new FakePushSubscription(),
        newSubscription: new FakePushSubscription()
      });

      await callEventListener(event);

      expect(mockRefreshFidRegistrationIfStored).toHaveBeenCalledTimes(1);

      const expectedMessage = {
        isFirebaseMessaging: true,
        messageType: MessageType.FID_REGISTERED,
        fid: 'refreshed-fid'
      };
      expect(postMessageSpy).toHaveBeenCalledWith(expectedMessage);
    });

    it('does not notify clients if FID refresh fails', async () => {
      mockDbGetFidRegistration.mockResolvedValue({
        fid: 'fid-in-db',
        lastRegisterTime: Date.now()
      });
      mockRefreshFidRegistrationIfStored.mockRejectedValue(
        new Error('refresh failed')
      );

      const client: Writable<WindowClient> = (await self.clients.openWindow(
        'https://example.org'
      ))!;
      client.visibilityState = 'visible';
      const postMessageSpy = vi.spyOn(client, 'postMessage');

      const event = makeFakePushSubscriptionChangeEvent({
        oldSubscription: new FakePushSubscription(),
        newSubscription: new FakePushSubscription()
      });

      await callEventListener(event);

      expect(mockRefreshFidRegistrationIfStored).toHaveBeenCalledTimes(1);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('does not notify clients if FID is not registered', async () => {
      mockDbGetFidRegistration.mockResolvedValue(undefined);

      const client: Writable<WindowClient> = (await self.clients.openWindow(
        'https://example.org'
      ))!;
      client.visibilityState = 'visible';
      const postMessageSpy = vi.spyOn(client, 'postMessage');

      const event = makeFakePushSubscriptionChangeEvent({
        oldSubscription: new FakePushSubscription(),
        newSubscription: new FakePushSubscription()
      });

      await callEventListener(event);

      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  async function callEventListener(
    event: ValueOf<ServiceWorkerGlobalScopeEventMap>
  ): Promise<void> {
    const listener = eventListenerMap.get(event.type);
    if (!listener) {
      throw new Error(`Event listener for ${event.type} was not defined.`);
    }

    const waitUntil = vi.spyOn(event, 'waitUntil');
    listener(event);
    await waitUntil.mock.calls[0][0];
  }
});

/** Makes fake push events. */
function makeEvent<K extends keyof ServiceWorkerGlobalScopeEventMap>(
  type: K,
  data: DeepPartial<ServiceWorkerGlobalScopeEventMap[K]>
): Writable<ServiceWorkerGlobalScopeEventMap[K]> {
  const event = new FakeEvent(type);
  Object.assign(event, data);
  return event as unknown as ServiceWorkerGlobalScopeEventMap[K];
}

function makeFakePushSubscriptionChangeEvent(data: {
  newSubscription: PushSubscription | null;
  oldSubscription: PushSubscription | null;
}): PushSubscriptionChangeEvent {
  const event = new FakeEvent('pushsubscriptionchange');
  Object.assign(event, data);
  return event as unknown as PushSubscriptionChangeEvent;
}
