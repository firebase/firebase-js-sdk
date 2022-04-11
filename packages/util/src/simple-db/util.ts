/**
 * @license
 * Copyright 2022 Google LLC
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

import { getUA } from '../environment';
import { FirebaseError } from '../errors';
import { PersistencePromise } from '../persistence_promise';

export const LOG_TAG = 'SimpleDb';

/**
 * Duplicate of some Firestore error codes.
 * @internal
 */
export const enum Code {
  FAILED_PRECONDITION = 'failed-precondition',
  UNAVAILABLE = 'unavailable'
}

/**
 * Wraps an IDBRequest in a PersistencePromise, using the onsuccess / onerror
 * handlers to resolve / reject the PersistencePromise as appropriate.
 */

export function wrapRequest<R>(request: IDBRequest): PersistencePromise<R> {
  return new PersistencePromise<R>((resolve, reject) => {
    request.onsuccess = (event: Event) => {
      const result = (event.target as IDBRequest).result;
      resolve(result);
    };

    request.onerror = (event: Event) => {
      const error = checkForAndReportiOSError(
        (event.target as IDBRequest).error!
      );
      reject(error);
    };
  });
}

/**
 * An error that wraps exceptions that thrown during IndexedDB execution.
 * @internal
 */
export class IndexedDbTransactionError extends FirebaseError {
  name = 'IndexedDbTransactionError';

  constructor(actionName: string, cause: Error | string) {
    super(
      Code.UNAVAILABLE,
      `IndexedDB transaction '${actionName}' failed: ${cause}`
    );
  }
}

/**
 * Verifies whether `e` is an IndexedDbTransactionError.
 * @internal
 */
export function isIndexedDbTransactionError(e: Error): boolean {
  // Use name equality, as instanceof checks on errors don't work with errors
  // that wrap other errors.
  return e.name === 'IndexedDbTransactionError';
}

// Guard so we only report the error once.
let reportedIOSError = false;
/**
 * @internal
 */
export function checkForAndReportiOSError(error: DOMException): Error {
  const iOSVersion = getIOSVersion(getUA());
  if (iOSVersion >= 12.2 && iOSVersion < 13) {
    const IOS_ERROR =
      'An internal error was encountered in the Indexed Database server';
    if (error.message.indexOf(IOS_ERROR) >= 0) {
      // Wrap error in a more descriptive one.
      const newError = new FirebaseError(
        'internal',
        `IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${IOS_ERROR}'. This is likely ` +
          `due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 ` +
          `for details and a potential workaround.`
      );
      if (!reportedIOSError) {
        reportedIOSError = true;
        // Throw a global exception outside of this promise chain, for the user to
        // potentially catch.
        setTimeout(() => {
          throw newError;
        }, 0);
      }
      return newError;
    }
  }
  return error;
}

// visible for testing
/** Parse User Agent to determine iOS version. Returns -1 if not found. */
export function getIOSVersion(ua: string): number {
  const iOSVersionRegex = ua.match(/i(?:phone|pad|pod) os ([\d_]+)/i);
  const version = iOSVersionRegex
    ? iOSVersionRegex[1].split('_').slice(0, 2).join('.')
    : '-1';
  return Number(version);
}

// visible for testing
/** Parse User Agent to determine Android version. Returns -1 if not found. */
export function getAndroidVersion(ua: string): number {
  const androidVersionRegex = ua.match(/Android ([\d.]+)/i);
  const version = androidVersionRegex
    ? androidVersionRegex[1].split('.').slice(0, 2).join('.')
    : '-1';
  return Number(version);
}
