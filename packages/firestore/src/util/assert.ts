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

import { SDK_VERSION } from '../core/version';
import { logError } from './log';

/**
 * Unconditionally fails, throwing an Error with the given message.
 * Messages are stripped in production builds.
 *
 * Returns `never` and can be used in expressions:
 * @example
 * let futureVar = fail('not implemented yet');
 */
export function fail(failure: string = 'Unexpected state'): never {
  // Log the failure in addition to throw an exception, just in case the
  // exception is swallowed.
  const message =
    `FIRESTORE (${SDK_VERSION}) INTERNAL ASSERTION FAILED: ` + failure;
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
 * Messages are stripped in production builds.
 */
export function hardAssert(
  assertion: boolean,
  message?: string
): asserts assertion {
  if (!assertion) {
    fail(message);
  }
}

/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * The code of callsites invoking this function are stripped out in production
 * builds. Any side-effects of code within the debugAssert() invocation will not
 * happen in this case.
 */
export function debugAssert(
  assertion: boolean,
  message: string
): asserts assertion {
  if (!assertion) {
    fail(message);
  }
}

/**
 * Casts `obj1` to `S` and `obj2` to `T`. In non-production builds,
 * verifies that `obj1` and `obj2` are instances of `S` and `T` before casting.
 */
export function debugCast<S, T>(
  obj1: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor1: { new (...args: any[]): S },
  obj2: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor2: { new (...args: any[]): T }
): [S, T] | never;
/**
 * Casts `obj` to `S`. In non-production builds, verifies that `obj` is an
 * instance of `S` before casting.
 */
export function debugCast<S>(
  obj: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor: { new (...args: any[]): S }
): S | never;
export function debugCast<S, T>(
  obj1: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor1: { new (...args: any[]): S },
  obj2?: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor2?: { new (...args: any[]): T }
): S | [S, T] | never {
  debugAssert(
    obj1 instanceof constructor1,
    `Expected type '${constructor1.name}', but was '${obj1.constructor.name}'`
  );
  if (!obj2 || !constructor2) {
    return obj1 as S;
  }
  debugAssert(
    obj2 instanceof constructor2,
    `Expected type '${constructor2.name}', but was '${obj2.constructor.name}'`
  );
  return [obj1 as S, obj2 as T];
}
