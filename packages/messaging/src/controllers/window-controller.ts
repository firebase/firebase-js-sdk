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

import { getToken, deleteToken } from '../core/token-management';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { FirebaseMessaging } from '@firebase/messaging-types';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { NextFn, Observer, Unsubscribe } from '@firebase/util';
import { InternalMessage, MessageType } from '../interfaces/internal-message';
import {
  CONSOLE_CAMPAIGN_ID,
  CONSOLE_CAMPAIGN_ANALYTICS_ENABLED,
  CONSOLE_CAMPAIGN_NAME,
  CONSOLE_CAMPAIGN_TIME,
  DEFAULT_SW_PATH,
  DEFAULT_SW_SCOPE,
  DEFAULT_VAPID_KEY
} from '../util/constants';
import { FirebaseApp } from '@firebase/app-types';
import { ConsoleMessageData } from '../interfaces/message-payload';
import { isConsoleMessage } from '../helpers/is-console-message';
import { FirebaseService } from '@firebase/app-types/private';

export class WindowController implements FirebaseMessaging, FirebaseService {
  private vapidKey: string | null = null;
  private swRegistration?: ServiceWorkerRegistration;
  private onMessageCallback: NextFn<object> | null = null;

  constructor(
    private readonly firebaseDependencies: FirebaseInternalDependencies
  ) {
    navigator.serviceWorker.addEventListener('message', e =>
      this.messageEventListener(e)
    );
  }

  get app(): FirebaseApp {
    return this.firebaseDependencies.app;
  }

  async getToken(): Promise<string> {
    if (!this.vapidKey) {
      this.vapidKey = DEFAULT_VAPID_KEY;
    }

    const swRegistration = await this.getServiceWorkerRegistration();

    // Check notification permission.
    if (Notification.permission === 'default') {
      // The user hasn't allowed or denied notifications yet. Ask them.
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      throw ERROR_FACTORY.create(ErrorCode.PERMISSION_BLOCKED);
    }

    return getToken(this.firebaseDependencies, swRegistration, this.vapidKey);
  }

  async deleteToken(): Promise<boolean> {
    const swRegistration = await this.getServiceWorkerRegistration();

    return deleteToken(this.firebaseDependencies, swRegistration);
  }

  /**
   * Request permission if it is not currently granted.
   *
   * @return Resolves if the permission was granted, rejects otherwise.
   *
   * @deprecated Use Notification.requestPermission() instead.
   * https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission
   */
  async requestPermission(): Promise<void> {
    if (Notification.permission === 'granted') {
      return;
    }

    const permissionResult = await Notification.requestPermission();
    if (permissionResult === 'granted') {
      return;
    } else if (permissionResult === 'denied') {
      throw ERROR_FACTORY.create(ErrorCode.PERMISSION_BLOCKED);
    } else {
      throw ERROR_FACTORY.create(ErrorCode.PERMISSION_DEFAULT);
    }
  }

  // TODO: Deprecate this and make VAPID key a parameter in getToken.
  usePublicVapidKey(vapidKey: string): void {
    if (this.vapidKey !== null) {
      throw ERROR_FACTORY.create(ErrorCode.USE_VAPID_KEY_AFTER_GET_TOKEN);
    }

    if (typeof vapidKey !== 'string' || vapidKey.length === 0) {
      throw ERROR_FACTORY.create(ErrorCode.INVALID_VAPID_KEY);
    }

    this.vapidKey = vapidKey;
  }

  useServiceWorker(swRegistration: ServiceWorkerRegistration): void {
    if (!(swRegistration instanceof ServiceWorkerRegistration)) {
      throw ERROR_FACTORY.create(ErrorCode.INVALID_SW_REGISTRATION);
    }

    if (this.swRegistration) {
      throw ERROR_FACTORY.create(ErrorCode.USE_SW_AFTER_GET_TOKEN);
    }

    this.swRegistration = swRegistration;
  }

  /**
   * @param nextOrObserver An observer object or a function triggered on
   * message.
   * @return The unsubscribe function for the observer.
   */
  // TODO: Simplify this to only accept a function and not an Observer.
  onMessage(nextOrObserver: NextFn<object> | Observer<object>): Unsubscribe {
    this.onMessageCallback =
      typeof nextOrObserver === 'function'
        ? nextOrObserver
        : nextOrObserver.next;

    return () => {
      this.onMessageCallback = null;
    };
  }

  setBackgroundMessageHandler(): void {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_SW);
  }

  // Unimplemented
  onTokenRefresh(): Unsubscribe {
    return () => {};
  }

  /**
   * Creates or updates the default service worker registration.
   * @return The service worker registration to be used for the push service.
   */
  private async getServiceWorkerRegistration(): Promise<
    ServiceWorkerRegistration
  > {
    if (!this.swRegistration) {
      try {
        this.swRegistration = await navigator.serviceWorker.register(
          DEFAULT_SW_PATH,
          {
            scope: DEFAULT_SW_SCOPE
          }
        );

        // The timing when browser updates sw when sw has an update is unreliable by my experiment.
        // It leads to version conflict when the SDK upgrades to a newer version in the main page, but
        // sw is stuck with the old version. For example, https://github.com/firebase/firebase-js-sdk/issues/2590
        // The following line reliably updates sw if there was an update.
        this.swRegistration.update().catch(() => {
          /* it is non blocking and we don't care if it failed */
        });
      } catch (e) {
        throw ERROR_FACTORY.create(ErrorCode.FAILED_DEFAULT_REGISTRATION, {
          browserErrorMessage: e.message
        });
      }
    }

    return this.swRegistration;
  }

  private async messageEventListener(event: MessageEvent): Promise<void> {
    if (!event.data?.firebaseMessaging) {
      // Not a message from FCM
      return;
    }

    const { type, payload } = (event.data as InternalMessage).firebaseMessaging;

    if (this.onMessageCallback && type === MessageType.PUSH_RECEIVED) {
      this.onMessageCallback(payload);
    }

    const { data } = payload;
    if (
      isConsoleMessage(data) &&
      data[CONSOLE_CAMPAIGN_ANALYTICS_ENABLED] === '1'
    ) {
      // Analytics is enabled on this message, so we should log it.
      await this.logEvent(type, data);
    }
  }

  private async logEvent(
    messageType: MessageType,
    data: ConsoleMessageData
  ): Promise<void> {
    const eventType = getEventType(messageType);
    const analytics = await this.firebaseDependencies.analyticsProvider.get();
    analytics.logEvent(eventType, {
      /* eslint-disable camelcase */
      message_id: data[CONSOLE_CAMPAIGN_ID],
      message_name: data[CONSOLE_CAMPAIGN_NAME],
      message_time: data[CONSOLE_CAMPAIGN_TIME],
      message_device_time: Math.floor(Date.now() / 1000)
      /* eslint-enable camelcase */
    });
  }
}

function getEventType(messageType: MessageType): string {
  switch (messageType) {
    case MessageType.NOTIFICATION_CLICKED:
      return 'notification_open';
    case MessageType.PUSH_RECEIVED:
      return 'notification_foreground';
    default:
      throw new Error();
  }
}
