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

import {
  Observer,
  Unsubscribe,
  NextFn,
  ErrorFn,
  CompleteFn
} from '@firebase/util';

// Currently supported fcm notification display parameters. Note that
// {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications/NotificationOptions}
// defines a full list of display notification parameters. This interface we only include what the
// SEND API support for clarity.
export interface NotificationPayload {
  title?: string;
  body?: string;
  image?: string;
}

export interface FcmOptions {
  link?: string;
  analyticsLabel?: string;
}

export interface MessagePayload {
  notification?: NotificationPayload;
  data?: { [key: string]: string };
  fcmOptions?: FcmOptions;
  from: string;
  collapseKey: string;
}

export interface FirebaseMessaging {}

export type FirebaseMessagingName = 'messaging';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'messaging-exp': FirebaseMessaging;
  }
}
