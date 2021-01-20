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
/**
 * @fileoverview Constants used in the Firebase Storage library.
 */

/**
 * @public
 * Error codes that can be attached to `FirebaseStorageError`s.
 */
export const enum StorageErrorCode {
  // Shared between all platforms
  UNKNOWN = 'unknown',
  OBJECT_NOT_FOUND = 'object-not-found',
  BUCKET_NOT_FOUND = 'bucket-not-found',
  PROJECT_NOT_FOUND = 'project-not-found',
  QUOTA_EXCEEDED = 'quota-exceeded',
  UNAUTHENTICATED = 'unauthenticated',
  UNAUTHORIZED = 'unauthorized',
  RETRY_LIMIT_EXCEEDED = 'retry-limit-exceeded',
  INVALID_CHECKSUM = 'invalid-checksum',
  CANCELED = 'canceled',
  // JS specific
  INVALID_EVENT_NAME = 'invalid-event-name',
  INVALID_URL = 'invalid-url',
  INVALID_DEFAULT_BUCKET = 'invalid-default-bucket',
  NO_DEFAULT_BUCKET = 'no-default-bucket',
  CANNOT_SLICE_BLOB = 'cannot-slice-blob',
  SERVER_FILE_WRONG_SIZE = 'server-file-wrong-size',
  NO_DOWNLOAD_URL = 'no-download-url',
  INVALID_ARGUMENT = 'invalid-argument',
  INVALID_ARGUMENT_COUNT = 'invalid-argument-count',
  APP_DELETED = 'app-deleted',
  INVALID_ROOT_OPERATION = 'invalid-root-operation',
  INVALID_FORMAT = 'invalid-format',
  INTERNAL_ERROR = 'internal-error',
  UNSUPPORTED_ENVIRONMENT = 'unsupported-environment'
}
/**
 * Domain name for firebase storage.
 */
export const DEFAULT_HOST = 'firebasestorage.googleapis.com';

/**
 * The key in Firebase config json for the storage bucket.
 */
export const CONFIG_STORAGE_BUCKET_KEY = 'storageBucket';

/**
 * 2 minutes
 *
 * The timeout for all operations except upload.
 */
export const DEFAULT_MAX_OPERATION_RETRY_TIME = 2 * 60 * 1000;

/**
 * 10 minutes
 *
 * The timeout for upload.
 */
export const DEFAULT_MAX_UPLOAD_RETRY_TIME = 10 * 60 * 1000;

/**
 * This is the value of Number.MIN_SAFE_INTEGER, which is not well supported
 * enough for us to use it directly.
 */
export const MIN_SAFE_INTEGER = -9007199254740991;
