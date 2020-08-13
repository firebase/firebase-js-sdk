/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

import {
  CONSOLE_CAMPAIGN_ANALYTICS_ENABLED,
  CONSOLE_CAMPAIGN_ID,
  CONSOLE_CAMPAIGN_NAME,
  CONSOLE_CAMPAIGN_TIME
} from '../util/constants';

export interface MessagePayloadInternal {
  notification?: NotificationPayloadInternal;
  data?: unknown;
  fcmOptions?: FcmOptionsInternal;
  messageType?: MessageType;
  isFirebaseMessaging?: boolean;
  from: string;
  // eslint-disable-next-line camelcase
  collapse_key: string;
}

export interface NotificationPayloadInternal extends NotificationOptions {
  title: string;
  // Supported in the Legacy Send API.
  // See:https://firebase.google.com/docs/cloud-messaging/xmpp-server-ref.
  // eslint-disable-next-line camelcase
  click_action?: string;
}

// Defined in
// https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#webpushfcmoptions. Note
// that the keys are sent to the clients in snake cases which we need to convert to camel so it can
// be exposed as a type to match the Firebase API convention.
export interface FcmOptionsInternal {
  link?: string;

  // eslint-disable-next-line camelcase
  analytics_label?: string;
}

export enum MessageType {
  PUSH_RECEIVED = 'push-received',
  NOTIFICATION_CLICKED = 'notification-clicked'
}

/** Additional data of a message sent from the FN Console. */
export interface ConsoleMessageData {
  [CONSOLE_CAMPAIGN_ID]: string;
  [CONSOLE_CAMPAIGN_TIME]: string;
  [CONSOLE_CAMPAIGN_NAME]?: string;
  [CONSOLE_CAMPAIGN_ANALYTICS_ENABLED]?: '1';
}
