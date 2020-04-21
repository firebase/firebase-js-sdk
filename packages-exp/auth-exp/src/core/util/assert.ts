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

import { SDK_VERSION } from '@firebase/app-exp';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { logError } from './log';

/**
 * Unconditionally fails, throwing a developer facing INTERNAL_ERROR
 * 
 * @param appName App name for tagging the error
 * @throws FirebaseError
 */
export function fail(
  appName: string
): never {
  throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, { appName });
}

/**
 * Verifies the given condition and fails if false, throwing a developer facing error
 * 
 * @param assertion
 * @param appName 
 */
export function assert(assertion: boolean, appName: string): asserts assertion {
  if (!assertion) {
    fail(appName);
  }
}

export function assertStringOrUndefined(assertion: unknown, appName: string): asserts assertion is string | undefined {
  assert(typeof assertion === 'string' || typeof assertion === 'undefined', appName);
}

/**
 * Unconditionally fails, throwing an internal error with the given message.
 *
 * @param failure type of failure encountered
 * @throws Error
 */
export function debugFail(failure: string): never {
  // Log the failure in addition to throw an exception, just in case the
  // exception is swallowed.
  const message =
    `AUTH (${SDK_VERSION}) INTERNAL ASSERTION FAILED: ` + failure;
  logError(message);

  // NOTE: We don't use FirestoreError here because these are internal failures
  // that cannot be handled by the user. (Also it would create a circular
  // dependency between the error and assert modules which doesn't work.)
  throw new Error(message);
}

/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 * 
 * @param assertion
 * @param message
 */
export function debugAssert(assertion: boolean, message: string): asserts assertion {
  if (!assertion) {
    debugFail(message);
  }
}