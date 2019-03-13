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
/**
 * @fileoverview Constants used in the Firebase Storage library.
 */

export const DOMAIN_NAME: string = 'firebasestorage.googleapis.com';

/**
 * Domain and scheme for API calls.
 */
export const API_DOMAIN: string = `https://${DOMAIN_NAME}`;

/**
 * Domain and scheme for object downloads.
 */
export const API_DOWNLOAD_DOMAIN: string = `https://${DOMAIN_NAME}`;

/**
 * Base URL for non-upload calls to the API.
 */
export const API_BASE_URL: string = '/v0';

/**
 * Base URL for upload calls to the API.
 */
export const API_UPLOAD_BASE_URL: string = '/v0';

export const configOption: string = 'storageBucket';

/**
 * 1 minute
 */
export const SHORT_MAX_OPERATION_RETRY_TIME: number = 1 * 60 * 1000;

/**
 * 2 minutes
 */
export const DEFAULT_MAX_OPERATION_RETRY_TIME: number = 2 * 60 * 1000;

/**
 * 10 minutes
 */
export const DEFAULT_MAX_UPLOAD_RETRY_TIME: number = 10 * 60 * 100;

/**
 * This is the value of Number.MIN_SAFE_INTEGER, which is not well supported
 * enough for us to use it directly.
 */
export const MIN_SAFE_INTEGER: number = -9007199254740991;
