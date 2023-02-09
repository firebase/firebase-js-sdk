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

import { FirebaseError } from '@firebase/util';

import { CONFIG_STORAGE_BUCKET_KEY } from './constants';

/**
 * An error returned by the Firebase Storage SDK.
 * @public
 */
export class StorageError extends FirebaseError {
  private readonly _baseMessage: string;
  /**
   * Stores custom error data unique to the `StorageError`.
   */
  customData: { serverResponse: string | null } = { serverResponse: null };

  /**
   * @param code - A `StorageErrorCode` string to be prefixed with 'storage/' and
   *  added to the end of the message.
   * @param message  - Error message.
   * @param status_ - Corresponding HTTP Status Code
   */
  constructor(code: StorageErrorCode, message: string, private status_ = 0) {
    super(
      prependCode(code),
      `Firebase Storage: ${message} (${prependCode(code)})`
    );
    this._baseMessage = this.message;
    // Without this, `instanceof StorageError`, in tests for example,
    // returns false.
    Object.setPrototypeOf(this, StorageError.prototype);
  }

  get status(): number {
    return this.status_;
  }

  set status(status: number) {
    this.status_ = status;
  }

  /**
   * Compares a `StorageErrorCode` against this error's code, filtering out the prefix.
   */
  _codeEquals(code: StorageErrorCode): boolean {
    return prependCode(code) === this.code;
  }

  /**
   * Optional response message that was added by the server.
   */
  get serverResponse(): null | string {
    return this.customData.serverResponse;
  }

  set serverResponse(serverResponse: string | null) {
    this.customData.serverResponse = serverResponse;
    if (this.customData.serverResponse) {
      this.message = `${this._baseMessage}\n${this.customData.serverResponse}`;
    } else {
      this.message = this._baseMessage;
    }
  }
}

export const errors = {};

/**
 * @public
 * Error codes that can be attached to `StorageError` objects.
 */
export enum StorageErrorCode {
  // Shared between all platforms
  UNKNOWN = 'unknown',
  OBJECT_NOT_FOUND = 'object-not-found',
  BUCKET_NOT_FOUND = 'bucket-not-found',
  PROJECT_NOT_FOUND = 'project-not-found',
  QUOTA_EXCEEDED = 'quota-exceeded',
  UNAUTHENTICATED = 'unauthenticated',
  UNAUTHORIZED = 'unauthorized',
  UNAUTHORIZED_APP = 'unauthorized-app',
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

export function prependCode(code: StorageErrorCode): string {
  return 'storage/' + code;
}

export function unknown(): StorageError {
  const message =
    'An unknown error occurred, please check the error payload for ' +
    'server response.';
  return new StorageError(StorageErrorCode.UNKNOWN, message);
}

export function objectNotFound(path: string): StorageError {
  return new StorageError(
    StorageErrorCode.OBJECT_NOT_FOUND,
    "Object '" + path + "' does not exist."
  );
}

export function bucketNotFound(bucket: string): StorageError {
  return new StorageError(
    StorageErrorCode.BUCKET_NOT_FOUND,
    "Bucket '" + bucket + "' does not exist."
  );
}

export function projectNotFound(project: string): StorageError {
  return new StorageError(
    StorageErrorCode.PROJECT_NOT_FOUND,
    "Project '" + project + "' does not exist."
  );
}

export function quotaExceeded(bucket: string): StorageError {
  return new StorageError(
    StorageErrorCode.QUOTA_EXCEEDED,
    "Quota for bucket '" +
      bucket +
      "' exceeded, please view quota on " +
      'https://firebase.google.com/pricing/.'
  );
}

export function unauthenticated(): StorageError {
  const message =
    'User is not authenticated, please authenticate using Firebase ' +
    'Authentication and try again.';
  return new StorageError(StorageErrorCode.UNAUTHENTICATED, message);
}

export function unauthorizedApp(): StorageError {
  return new StorageError(
    StorageErrorCode.UNAUTHORIZED_APP,
    'This app does not have permission to access Firebase Storage on this project.'
  );
}

export function unauthorized(path: string): StorageError {
  return new StorageError(
    StorageErrorCode.UNAUTHORIZED,
    "User does not have permission to access '" + path + "'."
  );
}

export function retryLimitExceeded(): StorageError {
  return new StorageError(
    StorageErrorCode.RETRY_LIMIT_EXCEEDED,
    'Max retry time for operation exceeded, please try again.'
  );
}

export function invalidChecksum(
  path: string,
  checksum: string,
  calculated: string
): StorageError {
  return new StorageError(
    StorageErrorCode.INVALID_CHECKSUM,
    "Uploaded/downloaded object '" +
      path +
      "' has checksum '" +
      checksum +
      "' which does not match '" +
      calculated +
      "'. Please retry the upload/download."
  );
}

export function canceled(): StorageError {
  return new StorageError(
    StorageErrorCode.CANCELED,
    'User canceled the upload/download.'
  );
}

export function invalidEventName(name: string): StorageError {
  return new StorageError(
    StorageErrorCode.INVALID_EVENT_NAME,
    "Invalid event name '" + name + "'."
  );
}

export function invalidUrl(url: string): StorageError {
  return new StorageError(
    StorageErrorCode.INVALID_URL,
    "Invalid URL '" + url + "'."
  );
}

export function invalidDefaultBucket(bucket: string): StorageError {
  return new StorageError(
    StorageErrorCode.INVALID_DEFAULT_BUCKET,
    "Invalid default bucket '" + bucket + "'."
  );
}

export function noDefaultBucket(): StorageError {
  return new StorageError(
    StorageErrorCode.NO_DEFAULT_BUCKET,
    'No default bucket ' +
      "found. Did you set the '" +
      CONFIG_STORAGE_BUCKET_KEY +
      "' property when initializing the app?"
  );
}

export function cannotSliceBlob(): StorageError {
  return new StorageError(
    StorageErrorCode.CANNOT_SLICE_BLOB,
    'Cannot slice blob for upload. Please retry the upload.'
  );
}

export function serverFileWrongSize(): StorageError {
  return new StorageError(
    StorageErrorCode.SERVER_FILE_WRONG_SIZE,
    'Server recorded incorrect upload file size, please retry the upload.'
  );
}

export function noDownloadURL(): StorageError {
  return new StorageError(
    StorageErrorCode.NO_DOWNLOAD_URL,
    'The given file does not have any download URLs.'
  );
}

export function missingPolyFill(polyFill: string): StorageError {
  return new StorageError(
    StorageErrorCode.UNSUPPORTED_ENVIRONMENT,
    `${polyFill} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`
  );
}

/**
 * @internal
 */
export function invalidArgument(message: string): StorageError {
  return new StorageError(StorageErrorCode.INVALID_ARGUMENT, message);
}

export function invalidArgumentCount(
  argMin: number,
  argMax: number,
  fnName: string,
  real: number
): StorageError {
  let countPart;
  let plural;
  if (argMin === argMax) {
    countPart = argMin;
    plural = argMin === 1 ? 'argument' : 'arguments';
  } else {
    countPart = 'between ' + argMin + ' and ' + argMax;
    plural = 'arguments';
  }
  return new StorageError(
    StorageErrorCode.INVALID_ARGUMENT_COUNT,
    'Invalid argument count in `' +
      fnName +
      '`: Expected ' +
      countPart +
      ' ' +
      plural +
      ', received ' +
      real +
      '.'
  );
}

export function appDeleted(): StorageError {
  return new StorageError(
    StorageErrorCode.APP_DELETED,
    'The Firebase app was deleted.'
  );
}

/**
 * @param name - The name of the operation that was invalid.
 *
 * @internal
 */
export function invalidRootOperation(name: string): StorageError {
  return new StorageError(
    StorageErrorCode.INVALID_ROOT_OPERATION,
    "The operation '" +
      name +
      "' cannot be performed on a root reference, create a non-root " +
      "reference using child, such as .child('file.png')."
  );
}

/**
 * @param format - The format that was not valid.
 * @param message - A message describing the format violation.
 */
export function invalidFormat(format: string, message: string): StorageError {
  return new StorageError(
    StorageErrorCode.INVALID_FORMAT,
    "String does not match format '" + format + "': " + message
  );
}

/**
 * @param message - A message describing the internal error.
 */
export function unsupportedEnvironment(message: string): StorageError {
  throw new StorageError(StorageErrorCode.UNSUPPORTED_ENVIRONMENT, message);
}

/**
 * @param message - A message describing the internal error.
 */
export function internalError(message: string): StorageError {
  throw new StorageError(
    StorageErrorCode.INTERNAL_ERROR,
    'Internal error: ' + message
  );
}
