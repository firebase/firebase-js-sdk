/**
 * The Firebase Cloud Messaging Web SDK.
 * This SDK does not work in a Node.js environment.
 *
 * @packageDocumentation
 */

import { FirebaseApp } from '@firebase/app';
import { NextFn } from '@firebase/util';
import { Observer } from '@firebase/util';
import { Unsubscribe } from '@firebase/util';

/**
 * Deletes the registration token associated with this {@link Messaging} instance and unsubscribes
 * the {@link Messaging} instance from the push subscription.
 *
 * If there is no legacy registration token but the client has FID-based registration metadata
 * (from {@link register}), this deletes that registration on the server, clears local metadata, and
 * invokes {@link onUnregistered} with the removed FID when successful.
 *
 * @param messaging - The {@link Messaging} instance.
 *
 * @returns The promise resolves when the token has been successfully deleted.
 *
 * @deprecated Use {@link onUnregistered} to observe when the client is no longer
 * registered and update your backend accordingly, instead of explicitly deleting the
 * registration token with this API.
 *
 * @public
 */
export declare function deleteToken(messaging: Messaging): Promise<boolean>;

/**
 * Options for features provided by the FCM SDK for Web. See {@link
 * https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#webpushfcmoptions |
 * WebpushFcmOptions}.
 *
 * @public
 */
export declare interface FcmOptions {
    /**
     * The link to open when the user clicks on the notification.
     */
    link?: string;
    /**
     * The label associated with the message's analytics data.
     */
    analyticsLabel?: string;
}

/* Excluded from this release type: _FirebaseMessagingName */

/**
 * Retrieves a Firebase Cloud Messaging instance.
 *
 * @returns The Firebase Cloud Messaging instance associated with the provided firebase app.
 *
 * @public
 */
export declare function getMessaging(app?: FirebaseApp): Messaging;

/**
 * Subscribes the {@link Messaging} instance to push notifications. Returns a Firebase Cloud
 * Messaging registration token that can be used to send push messages to that {@link Messaging}
 * instance.
 *
 * If notification permission isn't already granted, this method asks the user for permission. The
 * returned promise rejects if the user does not allow the app to show notifications.
 *
 * @param messaging - The {@link Messaging} instance.
 * @param options - Provides an optional vapid key and an optional service worker registration.
 *
 * @returns The promise resolves with an FCM registration token.
 *
 * @deprecated Use {@link register} together with {@link onRegistered} for Firebase
 * Installation ID-based messaging instead of retrieving an FCM registration token with this API.
 *
 * @public
 */
export declare function getToken(messaging: Messaging, options?: GetTokenOptions): Promise<string>;

/**
 * Options for {@link getToken}.
 *
 * @public
 */
export declare interface GetTokenOptions {
    /**
     * The public server key provided to push services. The key is used to
     * authenticate push subscribers to receive push messages only from sending servers that hold
     * the corresponding private key. If it is not provided, a default VAPID key is used. Note that some
     * push services (Chrome Push Service) require a non-default VAPID key. Therefore, it is recommended
     * to generate and import a VAPID key for your project with
     * {@link https://firebase.google.com/docs/cloud-messaging/js/client#configure_web_credentials_in_your_app | Configure Web Credentials with FCM}.
     * See
     * {@link https://developers.google.com/web/fundamentals/push-notifications/web-push-protocol | The Web Push Protocol}
     * for details on web push services.
     */
    vapidKey?: string;
    /**
     * The service worker registration for receiving push
     * messaging. If the registration is not provided explicitly, you need to have a
     * `firebase-messaging-sw.js` at your root location. See
     * {@link https://firebase.google.com/docs/cloud-messaging/js/client#access_the_registration_token | Access the registration token}
     * for more details.
     */
    serviceWorkerRegistration?: ServiceWorkerRegistration;
}

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
 * Checks if all required APIs exist in the browser.
 * @returns a Promise that resolves to a boolean.
 *
 * @public
 */
export declare function isSupported(): Promise<boolean>;

/**
 * Message payload that contains the notification payload that is represented with
 * {@link NotificationPayload} and the data payload that contains an arbitrary
 * number of key-value pairs sent by developers through the
 * {@link https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#notification | Send API}.
 *
 * @public
 */
export declare interface MessagePayload {
    /**
     * {@inheritdoc NotificationPayload}
     */
    notification?: NotificationPayload;
    /**
     * Arbitrary key/value payload.
     */
    data?: {
        [key: string]: string;
    };
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
    /**
     * The message ID of a message.
     */
    messageId: string;
}

/**
 * Public interface of the Firebase Cloud Messaging SDK.
 *
 * @public
 */
export declare interface Messaging {
    /**
     * The {@link @firebase/app#FirebaseApp} this `Messaging` instance is associated with.
     */
    app: FirebaseApp;
}
export { NextFn }

/**
 * Display notification details. Details are sent through the
 * {@link https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#notification | Send API}.
 *
 * @public
 */
export declare interface NotificationPayload {
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
    /**
     * The URL to use for the notification's icon. If you don't send this key in the request,
     * FCM displays the launcher icon specified in your app manifest.
     */
    icon?: string;
}
export { Observer }

/**
 * When a push message is received and the user is currently on a page for your origin, the
 * message is passed to the page and an `onMessage()` event is dispatched with the payload of
 * the push message.
 *
 *
 * @param messaging - The {@link Messaging} instance.
 * @param nextOrObserver - This function, or observer object with `next` defined,
 *     is called when a message is received and the user is currently viewing your page.
 * @returns To stop listening for messages execute this returned function.
 *
 * @public
 */
export declare function onMessage(messaging: Messaging, nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>): Unsubscribe;

/**
 * Subscribes to an event that the app instance is registered with FCM via Firebase Installation ID (FID).
 * Use the FID passed to the callback to upload it to your application server. When you receive an FID
 * after calling {@link register}, instruct your backend to remove any legacy token for this instance.
 *
 * @param messaging - The {@link Messaging} instance.
 * @param nextOrObserver - A function or observer object called when an FID is registered.
 * @returns Unsubscribe function to stop listening.
 *
 * @public
 */
export declare function onRegistered(messaging: Messaging, nextOrObserver: NextFn<string> | Observer<string>): Unsubscribe;

/**
 * Subscribes to an event that the app instance is unregistered from FCM (FID no longer active).
 * Use this to notify your backend to remove this FID to prevent 404 errors on send.
 *
 * @param messaging - The {@link Messaging} instance.
 * @param nextOrObserver - A function or observer object called with the unregistered FID.
 * @returns Unsubscribe function to stop listening.
 *
 * @public
 */
export declare function onUnregistered(messaging: Messaging, nextOrObserver: NextFn<string> | Observer<string>): Unsubscribe;

/**
 * Registers the app instance with FCM using its Firebase Installation ID (FID). The FID is
 * delivered via the {@link onRegistered} callback, not as a return value. Call this to establish
 * an FID-based identity; once {@link onRegistered} provides an FID, instruct your backend to
 * remove any legacy token previously associated with this instance. The backend send API
 * supports FID as a target.
 *
 * @param messaging - The {@link Messaging} instance.
 * @param options - Optional. VAPID key and/or service worker registration (same as getToken).
 * @returns Promise that resolves when registration has been initiated; FID is delivered via onRegistered.
 *
 * @public
 */
export declare function register(messaging: Messaging, options?: RegisterOptions): Promise<void>;

/**
 * Options for {@link register}. Same shape as GetTokenOptions for SW and VAPID configuration.
 *
 * @public
 */
export declare interface RegisterOptions {
    /** Optional VAPID key. See {@link GetTokenOptions.vapidKey}. */
    vapidKey?: string;
    /** Optional service worker registration. See {@link GetTokenOptions.serviceWorkerRegistration}. */
    serviceWorkerRegistration?: ServiceWorkerRegistration;
}

/**
 * Unregisters the app instance from FCM by deleting its FID-based registration.
 * On success, triggers {@link onUnregistered} (if registered) with the unregistered FID.
 *
 * @param messaging - The {@link Messaging} instance.
 *
 * @public
 */
export declare function unregister(messaging: Messaging): Promise<void>;
export { Unsubscribe }

export { }
