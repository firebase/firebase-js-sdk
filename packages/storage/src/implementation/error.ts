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
import { CONFIG_STORAGE_BUCKET_KEY } from './constants';

export class FirebaseStorageError implements Error {
  private code_: string;
  private message_: string;
  private serverResponse_: string | null;
  private name_: string;

  constructor(code: Code, message: string) {
    this.code_ = prependCode(code);
    this.message_ = 'Firebase Storage: ' + message;
    this.serverResponse_ = null;
    this.name_ = 'FirebaseError';
  }

  codeProp(): string {
    return this.code;
  }

  codeEquals(code: Code): boolean {
    return prependCode(code) === this.codeProp();
  }

  serverResponseProp(): string | null {
    return this.serverResponse_;
  }

  setServerResponseProp(serverResponse: string | null): void {
    this.serverResponse_ = serverResponse;
  }

  get name(): string {
    return this.name_;
  }

  get code(): string {
    return this.code_;
  }

  get message(): string {
    return this.message_;
  }

  get serverResponse(): null | string {
    return this.serverResponse_;
  }
}

export const errors = {};

/**
 * @enum {string}
 */
export type Code = string;
export const Code = {
  // Shared between all platforms
  UNKNOWN: 'unknown',
  OBJECT_NOT_FOUND: 'object-not-found',
  BUCKET_NOT_FOUND: 'bucket-not-found',
  PROJECT_NOT_FOUND: 'project-not-found',
  QUOTA_EXCEEDED: 'quota-exceeded',
  UNAUTHENTICATED: 'unauthenticated',
  UNAUTHORIZED: 'unauthorized',
  RETRY_LIMIT_EXCEEDED: 'retry-limit-exceeded',
  INVALID_CHECKSUM: 'invalid-checksum',
  CANCELED: 'canceled',
  // JS specific
  INVALID_EVENT_NAME: 'invalid-event-name',
  INVALID_URL: 'invalid-url',
  INVALID_DEFAULT_BUCKET: 'invalid-default-bucket',
  NO_DEFAULT_BUCKET: 'no-default-bucket',
  CANNOT_SLICE_BLOB: 'cannot-slice-blob',
  SERVER_FILE_WRONG_SIZE: 'server-file-wrong-size',
  NO_DOWNLOAD_URL: 'no-download-url',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_ARGUMENT_COUNT: 'invalid-argument-count',
  APP_DELETED: 'app-deleted',
  INVALID_ROOT_OPERATION: 'invalid-root-operation',
  INVALID_FORMAT: 'invalid-format',
  INTERNAL_ERROR: 'internal-error'
};

export function prependCode(code: Code): string {
  return 'storage/' + code;
}

export function unknown(): FirebaseStorageError {
  const message =
    'An unknown error occurred, please check the error payload for ' +
    'server response.';
  return new FirebaseStorageError(Code.UNKNOWN, message);
}

export function objectNotFound(path: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.OBJECT_NOT_FOUND,
    "Object '" + path + "' does not exist."
  );
}

export function bucketNotFound(bucket: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.BUCKET_NOT_FOUND,
    "Bucket '" + bucket + "' does not exist."
  );
}

export function projectNotFound(project: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.PROJECT_NOT_FOUND,
    "Project '" + project + "' does not exist."
  );
}

export function quotaExceeded(bucket: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.QUOTA_EXCEEDED,
    "Quota for bucket '" +
      bucket +
      "' exceeded, please view quota on " +
      'https://firebase.google.com/pricing/.'
  );
}

export function unauthenticated(): FirebaseStorageError {
  const message =
    'User is not authenticated, please authenticate using Firebase ' +
    'Authentication and try again.';
  return new FirebaseStorageError(Code.UNAUTHENTICATED, message);
}

export function unauthorized(path: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.UNAUTHORIZED,
    "User does not have permission to access '" + path + "'."
  );
}

export function retryLimitExceeded(): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.RETRY_LIMIT_EXCEEDED,
    'Max retry time for operation exceeded, please try again.'
  );
}

export function invalidChecksum(
  path: string,
  checksum: string,
  calculated: string
): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.INVALID_CHECKSUM,
    "Uploaded/downloaded object '" +
      path +
      "' has checksum '" +
      checksum +
      "' which does not match '" +
      calculated +
      "'. Please retry the upload/download."
  );
}

export function canceled(): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.CANCELED,
    'User canceled the upload/download.'
  );
}

export function invalidEventName(name: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.INVALID_EVENT_NAME,
    "Invalid event name '" + name + "'."
  );
}

export function invalidUrl(url: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.INVALID_URL,
    "Invalid URL '" + url + "'."
  );
}

export function invalidDefaultBucket(bucket: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.INVALID_DEFAULT_BUCKET,
    "Invalid default bucket '" + bucket + "'."
  );
}

export function noDefaultBucket(): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.NO_DEFAULT_BUCKET,
    'No default bucket ' +
      "found. Did you set the '" +
      CONFIG_STORAGE_BUCKET_KEY +
      "' property when initializing the app?"
  );
}

export function cannotSliceBlob(): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.CANNOT_SLICE_BLOB,
    'Cannot slice blob for upload. Please retry the upload.'
  );
}

export function serverFileWrongSize(): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.SERVER_FILE_WRONG_SIZE,
    'Server recorded incorrect upload file size, please retry the upload.'
  );
}

export function noDownloadURL(): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.NO_DOWNLOAD_URL,
    'The given file does not have any download URLs.'
  );
}

export function invalidArgument(
  index: number,
  fnName: string,
  message: string
): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.INVALID_ARGUMENT,
    'Invalid argument in `' + fnName + '` at index ' + index + ': ' + message
  );
}

export function invalidArgumentCount(
  argMin: number,
  argMax: number,
  fnName: string,
  real: number
): FirebaseStorageError {
  let countPart;
  let plural;
  if (argMin === argMax) {
    countPart = argMin;
    plural = argMin === 1 ? 'argument' : 'arguments';
  } else {
    countPart = 'between ' + argMin + ' and ' + argMax;
    plural = 'arguments';
  }
  return new FirebaseStorageError(
    Code.INVALID_ARGUMENT_COUNT,
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

export function appDeleted(): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.APP_DELETED,
    'The Firebase app was deleted.'
  );
}

/**
 * @param name The name of the operation that was invalid.
 */
export function invalidRootOperation(name: string): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.INVALID_ROOT_OPERATION,
    "The operation '" +
      name +
      "' cannot be performed on a root reference, create a non-root " +
      "reference using child, such as .child('file.png')."
  );
}

/**
 * @param format The format that was not valid.
 * @param message A message describing the format violation.
 */
export function invalidFormat(
  format: string,
  message: string
): FirebaseStorageError {
  return new FirebaseStorageError(
    Code.INVALID_FORMAT,
    "String does not match format '" + format + "': " + message
  );
}

/**
 * @param message A message describing the internal error.
 */
export function internalError(message: string): FirebaseStorageError {
  throw new FirebaseStorageError(
    Code.INTERNAL_ERROR,
    'Internal error: ' + message
  );
}
