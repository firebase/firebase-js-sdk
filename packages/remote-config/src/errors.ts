/**
 * @license
 * Copyright 2019 Google LLC
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

import { ErrorFactory, FirebaseError } from '@firebase/util';

export const enum ErrorCode {
  REGISTRATION_WINDOW = 'registration-window',
  REGISTRATION_PROJECT_ID = 'registration-project-id',
  REGISTRATION_API_KEY = 'registration-api-key',
  REGISTRATION_APP_ID = 'registration-app-id',
  STORAGE_OPEN = 'storage-open',
  STORAGE_GET = 'storage-get',
  STORAGE_SET = 'storage-set',
  STORAGE_DELETE = 'storage-delete',
  FETCH_NETWORK = 'fetch-client-network',
  FETCH_TIMEOUT = 'fetch-timeout',
  FETCH_THROTTLE = 'fetch-throttle',
  FETCH_PARSE = 'fetch-client-parse',
  FETCH_STATUS = 'fetch-status'
}

const ERROR_DESCRIPTION_MAP: { readonly [key in ErrorCode]: string } = {
  [ErrorCode.REGISTRATION_WINDOW]:
    'Undefined window object. This SDK only supports usage in a browser environment.',
  [ErrorCode.REGISTRATION_PROJECT_ID]:
    'Undefined project identifier. Check Firebase app initialization.',
  [ErrorCode.REGISTRATION_API_KEY]:
    'Undefined API key. Check Firebase app initialization.',
  [ErrorCode.REGISTRATION_APP_ID]:
    'Undefined app identifier. Check Firebase app initialization.',
  [ErrorCode.STORAGE_OPEN]:
    'Error thrown when opening storage. Original error: {$originalErrorMessage}.',
  [ErrorCode.STORAGE_GET]:
    'Error thrown when reading from storage. Original error: {$originalErrorMessage}.',
  [ErrorCode.STORAGE_SET]:
    'Error thrown when writing to storage. Original error: {$originalErrorMessage}.',
  [ErrorCode.STORAGE_DELETE]:
    'Error thrown when deleting from storage. Original error: {$originalErrorMessage}.',
  [ErrorCode.FETCH_NETWORK]:
    'Fetch client failed to connect to a network. Check Internet connection.' +
    ' Original error: {$originalErrorMessage}.',
  [ErrorCode.FETCH_TIMEOUT]:
    'The config fetch request timed out. ' +
    ' Configure timeout using "fetchTimeoutMillis" SDK setting.',
  [ErrorCode.FETCH_THROTTLE]:
    'The config fetch request timed out while in an exponential backoff state.' +
    ' Configure timeout using "fetchTimeoutMillis" SDK setting.' +
    ' Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.',
  [ErrorCode.FETCH_PARSE]:
    'Fetch client could not parse response.' +
    ' Original error: {$originalErrorMessage}.',
  [ErrorCode.FETCH_STATUS]:
    'Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.'
};

// Note this is effectively a type system binding a code to params. This approach overlaps with the
// role of TS interfaces, but works well for a few reasons:
// 1) JS is unaware of TS interfaces, eg we can't test for interface implementation in JS
// 2) callers should have access to a human-readable summary of the error and this interpolates
//    params into an error message;
// 3) callers should be able to programmatically access data associated with an error, which
//    ErrorData provides.
interface ErrorParams {
  [ErrorCode.STORAGE_OPEN]: { originalErrorMessage: string | undefined };
  [ErrorCode.STORAGE_GET]: { originalErrorMessage: string | undefined };
  [ErrorCode.STORAGE_SET]: { originalErrorMessage: string | undefined };
  [ErrorCode.STORAGE_DELETE]: { originalErrorMessage: string | undefined };
  [ErrorCode.FETCH_NETWORK]: { originalErrorMessage: string };
  [ErrorCode.FETCH_THROTTLE]: { throttleEndTimeMillis: number };
  [ErrorCode.FETCH_PARSE]: { originalErrorMessage: string };
  [ErrorCode.FETCH_STATUS]: { httpStatus: number };
}

export const ERROR_FACTORY = new ErrorFactory<ErrorCode, ErrorParams>(
  'remoteconfig' /* service */,
  'Remote Config' /* service name */,
  ERROR_DESCRIPTION_MAP
);

// Note how this is like typeof/instanceof, but for ErrorCode.
export function hasErrorCode(e: Error, errorCode: ErrorCode): boolean {
  return e instanceof FirebaseError && e.code.indexOf(errorCode) !== -1;
}
