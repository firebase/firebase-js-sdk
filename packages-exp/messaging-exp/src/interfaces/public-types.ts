/**
 * @license
 * Copyright 2020 Google LLC
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

/**
 * Display notification details. They are sent through the
 * {@link https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#notification | Send API}
 *
 * @public
 */
export interface NotificationPayload {
  /**
   * The notification's title.
   */
  title?: string;

  /**
   * The notification's body text.
   */
  body?: string;

  /**
   * The URL of an image that is downloaded on the device and displayed in the notification.
   */
  image?: string;
}

/**
 * Options for features provided by the FCM SDK for Web. See {@link
 * https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#webpushfcmoptions |
 * WebpushFcmOptions}
 *
 * @public
 */
export interface FcmOptions {
  /**
   * The link to open when the user clicks on the notification.
   */
  link?: string;

  /**
   * The label associated with the message's analytics data.
   */
  analyticsLabel?: string;
}

/**
 * Message payload that contains the notification payload that is represented with
 * {@link NotificationPayload} and the data payload that contains an arbitrary
 * number of key-value pairs sent by developers through the
 * {@link https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#notification | Send API}
 *
 * @public
 */
export interface MessagePayload {
  /**
   * {@inheritdoc NotificationPayload}
   */
  notification?: NotificationPayload;

  /**
   * Arbitrary key/value payload.
   */
  data?: { [key: string]: string };

  /**
   * {@inheritdoc FcmOptions}
   */
  fcmOptions?: FcmOptions;

  /**
   * The sender of this message.
   */
  from: string;

  /**
   * The collapse key of the message. See
   * {@link https://firebase.google.com/docs/cloud-messaging/concept-options#collapsible_and_non-collapsible_messages | Non-collapsible and collapsible messages}
   */
  collapseKey: string;
}

/**
 * Public interface of the Firebase Cloud Messaging SDK.
 *
 * @public
 */
export interface FirebaseMessaging {}

/**
 * @internal
 */
export type _FirebaseMessagingName = 'messaging';

export { NextFn, Observer, Unsubscribe } from '@firebase/util';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'messaging-exp': FirebaseMessaging;
  }
}
