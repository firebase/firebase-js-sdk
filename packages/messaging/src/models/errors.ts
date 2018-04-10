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

export const ERROR_CODES = {
  AVAILABLE_IN_WINDOW: 'only-available-in-window',
  AVAILABLE_IN_SW: 'only-available-in-sw',
  SHOULD_BE_INHERITED: 'should-be-overriden',
  BAD_SENDER_ID: 'bad-sender-id',
  INCORRECT_GCM_SENDER_ID: 'incorrect-gcm-sender-id',
  PERMISSION_DEFAULT: 'permission-default',
  PERMISSION_BLOCKED: 'permission-blocked',
  UNSUPPORTED_BROWSER: 'unsupported-browser',
  NOTIFICATIONS_BLOCKED: 'notifications-blocked',
  FAILED_DEFAULT_REGISTRATION: 'failed-serviceworker-registration',
  SW_REGISTRATION_EXPECTED: 'sw-registration-expected',
  GET_SUBSCRIPTION_FAILED: 'get-subscription-failed',
  INVALID_SAVED_TOKEN: 'invalid-saved-token',
  SW_REG_REDUNDANT: 'sw-reg-redundant',
  TOKEN_SUBSCRIBE_FAILED: 'token-subscribe-failed',
  TOKEN_SUBSCRIBE_NO_TOKEN: 'token-subscribe-no-token',
  TOKEN_SUBSCRIBE_NO_PUSH_SET: 'token-subscribe-no-push-set',
  TOKEN_UNSUBSCRIBE_FAILED: 'token-unsubscribe-failed',
  TOKEN_UPDATE_FAILED: 'token-update-failed',
  TOKEN_UPDATE_NO_TOKEN: 'token-update-no-token',
  USE_SW_BEFORE_GET_TOKEN: 'use-sw-before-get-token',
  INVALID_DELETE_TOKEN: 'invalid-delete-token',
  DELETE_TOKEN_NOT_FOUND: 'delete-token-not-found',
  DELETE_SCOPE_NOT_FOUND: 'delete-scope-not-found',
  BG_HANDLER_FUNCTION_EXPECTED: 'bg-handler-function-expected',
  NO_WINDOW_CLIENT_TO_MSG: 'no-window-client-to-msg',
  UNABLE_TO_RESUBSCRIBE: 'unable-to-resubscribe',
  NO_FCM_TOKEN_FOR_RESUBSCRIBE: 'no-fcm-token-for-resubscribe',
  FAILED_TO_DELETE_TOKEN: 'failed-to-delete-token',
  NO_SW_IN_REG: 'no-sw-in-reg',
  BAD_SCOPE: 'bad-scope',
  BAD_VAPID_KEY: 'bad-vapid-key',
  BAD_SUBSCRIPTION: 'bad-subscription',
  BAD_TOKEN: 'bad-token',
  BAD_PUSH_SET: 'bad-push-set',
  FAILED_DELETE_VAPID_KEY: 'failed-delete-vapid-key',
  INVALID_PUBLIC_VAPID_KEY: 'invalid-public-vapid-key',
  USE_PUBLIC_KEY_BEFORE_GET_TOKEN: 'use-public-key-before-get-token',
  PUBLIC_KEY_DECRYPTION_FAILED: 'public-vapid-key-decryption-failed'
};

export const ERROR_MAP = {
  [ERROR_CODES.AVAILABLE_IN_WINDOW]:
    'This method is available in a Window context.',
  [ERROR_CODES.AVAILABLE_IN_SW]:
    'This method is available in a service worker ' + 'context.',
  [ERROR_CODES.SHOULD_BE_INHERITED]:
    'This method should be overriden by ' + 'extended classes.',
  [ERROR_CODES.BAD_SENDER_ID]:
    "Please ensure that 'messagingSenderId' is set " +
    'correctly in the options passed into firebase.initializeApp().',
  [ERROR_CODES.PERMISSION_DEFAULT]:
    'The required permissions were not granted and ' + 'dismissed instead.',
  [ERROR_CODES.PERMISSION_BLOCKED]:
    'The required permissions were not granted and ' + 'blocked instead.',
  [ERROR_CODES.UNSUPPORTED_BROWSER]:
    "This browser doesn't support the API's " +
    'required to use the firebase SDK.',
  [ERROR_CODES.NOTIFICATIONS_BLOCKED]: 'Notifications have been blocked.',
  [ERROR_CODES.FAILED_DEFAULT_REGISTRATION]:
    'We are unable to register the ' +
    'default service worker. {$browserErrorMessage}',
  [ERROR_CODES.SW_REGISTRATION_EXPECTED]:
    'A service worker registration was the ' + 'expected input.',
  [ERROR_CODES.GET_SUBSCRIPTION_FAILED]:
    'There was an error when trying to get ' +
    'any existing Push Subscriptions.',
  [ERROR_CODES.INVALID_SAVED_TOKEN]:
    'Unable to access details of the saved token.',
  [ERROR_CODES.SW_REG_REDUNDANT]:
    'The service worker being used for push was made ' + 'redundant.',
  [ERROR_CODES.TOKEN_SUBSCRIBE_FAILED]:
    'A problem occured while subscribing the ' + 'user to FCM: {$message}',
  [ERROR_CODES.TOKEN_SUBSCRIBE_NO_TOKEN]:
    'FCM returned no token when subscribing ' + 'the user to push.',
  [ERROR_CODES.TOKEN_SUBSCRIBE_NO_PUSH_SET]:
    'FCM returned an invalid response ' + 'when getting an FCM token.',
  [ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED]:
    'A problem occured while unsubscribing the ' + 'user from FCM: {$message}',
  [ERROR_CODES.TOKEN_UPDATE_FAILED]:
    'A problem occured while updating the ' + 'user from FCM: {$message}',
  [ERROR_CODES.TOKEN_UPDATE_NO_TOKEN]:
    'FCM returned no token when updating ' + 'the user to push.',
  [ERROR_CODES.USE_SW_BEFORE_GET_TOKEN]:
    'The useServiceWorker() method may only be called once and must be ' +
    'called before calling getToken() to ensure your service worker is used.',
  [ERROR_CODES.INVALID_DELETE_TOKEN]:
    'You must pass a valid token into ' +
    'deleteToken(), i.e. the token from getToken().',
  [ERROR_CODES.DELETE_TOKEN_NOT_FOUND]:
    'The deletion attempt for token could not ' +
    'be performed as the token was not found.',
  [ERROR_CODES.DELETE_SCOPE_NOT_FOUND]:
    'The deletion attempt for service worker ' +
    'scope could not be performed as the scope was not found.',
  [ERROR_CODES.BG_HANDLER_FUNCTION_EXPECTED]:
    'The input to ' + 'setBackgroundMessageHandler() must be a function.',
  [ERROR_CODES.NO_WINDOW_CLIENT_TO_MSG]:
    'An attempt was made to message a ' + 'non-existant window client.',
  [ERROR_CODES.UNABLE_TO_RESUBSCRIBE]:
    'There was an error while re-subscribing ' +
    'the FCM token for push messaging. Will have to resubscribe the ' +
    'user on next visit. {$message}',
  [ERROR_CODES.NO_FCM_TOKEN_FOR_RESUBSCRIBE]:
    'Could not find an FCM token ' +
    'and as a result, unable to resubscribe. Will have to resubscribe the ' +
    'user on next visit.',
  [ERROR_CODES.FAILED_TO_DELETE_TOKEN]:
    'Unable to delete the currently saved token.',
  [ERROR_CODES.NO_SW_IN_REG]:
    'Even though the service worker registration was ' +
    'successful, there was a problem accessing the service worker itself.',
  [ERROR_CODES.INCORRECT_GCM_SENDER_ID]:
    "Please change your web app manifest's " +
    "'gcm_sender_id' value to '103953800507' to use Firebase messaging.",
  [ERROR_CODES.BAD_SCOPE]:
    'The service worker scope must be a string with at ' +
    'least one character.',
  [ERROR_CODES.BAD_VAPID_KEY]:
    'The public VAPID key is not a Uint8Array with 65 bytes.',
  [ERROR_CODES.BAD_SUBSCRIPTION]:
    'The subscription must be a valid ' + 'PushSubscription.',
  [ERROR_CODES.BAD_TOKEN]:
    'The FCM Token used for storage / lookup was not ' +
    'a valid token string.',
  [ERROR_CODES.BAD_PUSH_SET]:
    'The FCM push set used for storage / lookup was not ' +
    'not a valid push set string.',
  [ERROR_CODES.FAILED_DELETE_VAPID_KEY]: 'The VAPID key could not be deleted.',
  [ERROR_CODES.INVALID_PUBLIC_VAPID_KEY]:
    'The public VAPID key must be a string.',
  [ERROR_CODES.PUBLIC_KEY_DECRYPTION_FAILED]:
    'The public VAPID key did not equal ' + '65 bytes when decrypted.'
};
