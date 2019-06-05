/**
 * @license
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

import { ErrorFactory, ErrorMap } from '@firebase/util';

export const enum ErrorCode {
  AVAILABLE_IN_WINDOW = 'only-available-in-window',
  AVAILABLE_IN_SW = 'only-available-in-sw',
  SHOULD_BE_INHERITED = 'should-be-overriden',
  BAD_SENDER_ID = 'bad-sender-id',
  INCORRECT_GCM_SENDER_ID = 'incorrect-gcm-sender-id',
  PERMISSION_DEFAULT = 'permission-default',
  PERMISSION_BLOCKED = 'permission-blocked',
  UNSUPPORTED_BROWSER = 'unsupported-browser',
  NOTIFICATIONS_BLOCKED = 'notifications-blocked',
  FAILED_DEFAULT_REGISTRATION = 'failed-serviceworker-registration',
  SW_REGISTRATION_EXPECTED = 'sw-registration-expected',
  GET_SUBSCRIPTION_FAILED = 'get-subscription-failed',
  INVALID_SAVED_TOKEN = 'invalid-saved-token',
  SW_REG_REDUNDANT = 'sw-reg-redundant',
  TOKEN_SUBSCRIBE_FAILED = 'token-subscribe-failed',
  TOKEN_SUBSCRIBE_NO_TOKEN = 'token-subscribe-no-token',
  TOKEN_SUBSCRIBE_NO_PUSH_SET = 'token-subscribe-no-push-set',
  TOKEN_UNSUBSCRIBE_FAILED = 'token-unsubscribe-failed',
  TOKEN_UPDATE_FAILED = 'token-update-failed',
  TOKEN_UPDATE_NO_TOKEN = 'token-update-no-token',
  USE_SW_BEFORE_GET_TOKEN = 'use-sw-before-get-token',
  INVALID_DELETE_TOKEN = 'invalid-delete-token',
  DELETE_TOKEN_NOT_FOUND = 'delete-token-not-found',
  DELETE_SCOPE_NOT_FOUND = 'delete-scope-not-found',
  BG_HANDLER_FUNCTION_EXPECTED = 'bg-handler-function-expected',
  NO_WINDOW_CLIENT_TO_MSG = 'no-window-client-to-msg',
  UNABLE_TO_RESUBSCRIBE = 'unable-to-resubscribe',
  NO_FCM_TOKEN_FOR_RESUBSCRIBE = 'no-fcm-token-for-resubscribe',
  FAILED_TO_DELETE_TOKEN = 'failed-to-delete-token',
  NO_SW_IN_REG = 'no-sw-in-reg',
  BAD_SCOPE = 'bad-scope',
  BAD_VAPID_KEY = 'bad-vapid-key',
  BAD_SUBSCRIPTION = 'bad-subscription',
  BAD_TOKEN = 'bad-token',
  BAD_PUSH_SET = 'bad-push-set',
  FAILED_DELETE_VAPID_KEY = 'failed-delete-vapid-key',
  INVALID_PUBLIC_VAPID_KEY = 'invalid-public-vapid-key',
  USE_PUBLIC_KEY_BEFORE_GET_TOKEN = 'use-public-key-before-get-token',
  PUBLIC_KEY_DECRYPTION_FAILED = 'public-vapid-key-decryption-failed'
}

export const ERROR_MAP: ErrorMap<ErrorCode> = {
  [ErrorCode.AVAILABLE_IN_WINDOW]:
    'This method is available in a Window context.',
  [ErrorCode.AVAILABLE_IN_SW]:
    'This method is available in a service worker context.',
  [ErrorCode.SHOULD_BE_INHERITED]:
    'This method should be overriden by extended classes.',
  [ErrorCode.BAD_SENDER_ID]:
    "Please ensure that 'messagingSenderId' is set " +
    'correctly in the options passed into firebase.initializeApp().',
  [ErrorCode.PERMISSION_DEFAULT]:
    'The required permissions were not granted and dismissed instead.',
  [ErrorCode.PERMISSION_BLOCKED]:
    'The required permissions were not granted and blocked instead.',
  [ErrorCode.UNSUPPORTED_BROWSER]:
    "This browser doesn't support the API's " +
    'required to use the firebase SDK.',
  [ErrorCode.NOTIFICATIONS_BLOCKED]: 'Notifications have been blocked.',
  [ErrorCode.FAILED_DEFAULT_REGISTRATION]:
    'We are unable to register the ' +
    'default service worker. {$browserErrorMessage}',
  [ErrorCode.SW_REGISTRATION_EXPECTED]:
    'A service worker registration was the expected input.',
  [ErrorCode.GET_SUBSCRIPTION_FAILED]:
    'There was an error when trying to get ' +
    'any existing Push Subscriptions.',
  [ErrorCode.INVALID_SAVED_TOKEN]:
    'Unable to access details of the saved token.',
  [ErrorCode.SW_REG_REDUNDANT]:
    'The service worker being used for push was made redundant.',
  [ErrorCode.TOKEN_SUBSCRIBE_FAILED]:
    'A problem occured while subscribing the user to FCM: {$errorInfo}',
  [ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN]:
    'FCM returned no token when subscribing the user to push.',
  [ErrorCode.TOKEN_SUBSCRIBE_NO_PUSH_SET]:
    'FCM returned an invalid response when getting an FCM token.',
  [ErrorCode.TOKEN_UNSUBSCRIBE_FAILED]:
    'A problem occured while unsubscribing the ' +
    'user from FCM: {$errorInfo}',
  [ErrorCode.TOKEN_UPDATE_FAILED]:
    'A problem occured while updating the user from FCM: {$errorInfo}',
  [ErrorCode.TOKEN_UPDATE_NO_TOKEN]:
    'FCM returned no token when updating the user to push.',
  [ErrorCode.USE_SW_BEFORE_GET_TOKEN]:
    'The useServiceWorker() method may only be called once and must be ' +
    'called before calling getToken() to ensure your service worker is used.',
  [ErrorCode.INVALID_DELETE_TOKEN]:
    'You must pass a valid token into ' +
    'deleteToken(), i.e. the token from getToken().',
  [ErrorCode.DELETE_TOKEN_NOT_FOUND]:
    'The deletion attempt for token could not ' +
    'be performed as the token was not found.',
  [ErrorCode.DELETE_SCOPE_NOT_FOUND]:
    'The deletion attempt for service worker ' +
    'scope could not be performed as the scope was not found.',
  [ErrorCode.BG_HANDLER_FUNCTION_EXPECTED]:
    'The input to setBackgroundMessageHandler() must be a function.',
  [ErrorCode.NO_WINDOW_CLIENT_TO_MSG]:
    'An attempt was made to message a non-existant window client.',
  [ErrorCode.UNABLE_TO_RESUBSCRIBE]:
    'There was an error while re-subscribing ' +
    'the FCM token for push messaging. Will have to resubscribe the ' +
    'user on next visit. {$errorInfo}',
  [ErrorCode.NO_FCM_TOKEN_FOR_RESUBSCRIBE]:
    'Could not find an FCM token ' +
    'and as a result, unable to resubscribe. Will have to resubscribe the ' +
    'user on next visit.',
  [ErrorCode.FAILED_TO_DELETE_TOKEN]:
    'Unable to delete the currently saved token.',
  [ErrorCode.NO_SW_IN_REG]:
    'Even though the service worker registration was ' +
    'successful, there was a problem accessing the service worker itself.',
  [ErrorCode.INCORRECT_GCM_SENDER_ID]:
    "Please change your web app manifest's " +
    "'gcm_sender_id' value to '103953800507' to use Firebase messaging.",
  [ErrorCode.BAD_SCOPE]:
    'The service worker scope must be a string with at ' +
    'least one character.',
  [ErrorCode.BAD_VAPID_KEY]:
    'The public VAPID key is not a Uint8Array with 65 bytes.',
  [ErrorCode.BAD_SUBSCRIPTION]:
    'The subscription must be a valid PushSubscription.',
  [ErrorCode.BAD_TOKEN]:
    'The FCM Token used for storage / lookup was not ' +
    'a valid token string.',
  [ErrorCode.BAD_PUSH_SET]:
    'The FCM push set used for storage / lookup was not ' +
    'not a valid push set string.',
  [ErrorCode.FAILED_DELETE_VAPID_KEY]: 'The VAPID key could not be deleted.',
  [ErrorCode.INVALID_PUBLIC_VAPID_KEY]:
    'The public VAPID key must be a string.',
  [ErrorCode.USE_PUBLIC_KEY_BEFORE_GET_TOKEN]:
    'The usePublicVapidKey() method may only be called once and must be ' +
    'called before calling getToken() to ensure your VAPID key is used.',
  [ErrorCode.PUBLIC_KEY_DECRYPTION_FAILED]:
    'The public VAPID key did not equal 65 bytes when decrypted.'
};

interface ErrorParams {
  [ErrorCode.FAILED_DEFAULT_REGISTRATION]: { browserErrorMessage: string };
  [ErrorCode.TOKEN_SUBSCRIBE_FAILED]: { errorInfo: string };
  [ErrorCode.TOKEN_UNSUBSCRIBE_FAILED]: { errorInfo: string };
  [ErrorCode.TOKEN_UPDATE_FAILED]: { errorInfo: string };
  [ErrorCode.UNABLE_TO_RESUBSCRIBE]: { errorInfo: string };
}

export const errorFactory = new ErrorFactory<ErrorCode, ErrorParams>(
  'messaging',
  'Messaging',
  ERROR_MAP
);
