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

import { ErrorFactory, ErrorMap } from '@firebase/util';

export const enum AppCheckError {
  ALREADY_INITIALIZED = 'already-initialized',
  USE_BEFORE_ACTIVATION = 'use-before-activation',
  FETCH_NETWORK_ERROR = 'fetch-network-error',
  FETCH_PARSE_ERROR = 'fetch-parse-error',
  FETCH_STATUS_ERROR = 'fetch-status-error',
  STORAGE_OPEN = 'storage-open',
  STORAGE_GET = 'storage-get',
  STORAGE_WRITE = 'storage-set',
  RECAPTCHA_ERROR = 'recaptcha-error',
  THROTTLED = 'throttled'
}

const ERRORS: ErrorMap<AppCheckError> = {
  [AppCheckError.ALREADY_INITIALIZED]:
    'You have already called initializeAppCheck() for FirebaseApp {$appName} with ' +
    'different options. To avoid this error, call initializeAppCheck() with the ' +
    'same options as when it was originally called. This will return the ' +
    'already initialized instance.',
  [AppCheckError.USE_BEFORE_ACTIVATION]:
    'App Check is being used before initializeAppCheck() is called for FirebaseApp {$appName}. ' +
    'Call initializeAppCheck() before instantiating other Firebase services.',
  [AppCheckError.FETCH_NETWORK_ERROR]:
    'Fetch failed to connect to a network. Check Internet connection. ' +
    'Original error: {$originalErrorMessage}.',
  [AppCheckError.FETCH_PARSE_ERROR]:
    'Fetch client could not parse response.' +
    ' Original error: {$originalErrorMessage}.',
  [AppCheckError.FETCH_STATUS_ERROR]:
    'Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.',
  [AppCheckError.STORAGE_OPEN]:
    'Error thrown when opening storage. Original error: {$originalErrorMessage}.',
  [AppCheckError.STORAGE_GET]:
    'Error thrown when reading from storage. Original error: {$originalErrorMessage}.',
  [AppCheckError.STORAGE_WRITE]:
    'Error thrown when writing to storage. Original error: {$originalErrorMessage}.',
  [AppCheckError.RECAPTCHA_ERROR]: 'ReCAPTCHA error.',
  [AppCheckError.THROTTLED]: `Requests throttled due to {$httpStatus} error. Attempts allowed again after {$time}`
};

interface ErrorParams {
  [AppCheckError.ALREADY_INITIALIZED]: { appName: string };
  [AppCheckError.USE_BEFORE_ACTIVATION]: { appName: string };
  [AppCheckError.FETCH_NETWORK_ERROR]: { originalErrorMessage: string };
  [AppCheckError.FETCH_PARSE_ERROR]: { originalErrorMessage: string };
  [AppCheckError.FETCH_STATUS_ERROR]: { httpStatus: number };
  [AppCheckError.STORAGE_OPEN]: { originalErrorMessage?: string };
  [AppCheckError.STORAGE_GET]: { originalErrorMessage?: string };
  [AppCheckError.STORAGE_WRITE]: { originalErrorMessage?: string };
  [AppCheckError.THROTTLED]: { time: string; httpStatus: number };
}

export const ERROR_FACTORY = new ErrorFactory<AppCheckError, ErrorParams>(
  'appCheck',
  'AppCheck',
  ERRORS
);
