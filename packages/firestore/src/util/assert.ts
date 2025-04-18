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
 *
 * @param code generate a new unique value with `yarn assertion-id:generate`
 * Search for an existing value using `yarn assertion-id:find X`
 */
export function fail(
  code: number,
  message: string,
  context?: Record<string, unknown>
): never;

/**
 * Unconditionally fails, throwing an Error with the given message.
 * Messages are stripped in production builds.
 *
 * Returns `never` and can be used in expressions:
 * @example
 * let futureVar = fail('not implemented yet');
 *
 * @param id generate a new unique value with `yarn assertion-id:generate`
 * Search for an existing value using `yarn assertion-id:find X`
 */
export function fail(id: number, context?: Record<string, unknown>): never;

export function fail(
  id: number,
  messageOrContext?: string | Record<string, unknown>,
  context?: Record<string, unknown>
): never {
  let message = 'Unexpected state';
  if (typeof messageOrContext === 'string') {
    message = messageOrContext;
  } else {
    context = messageOrContext;
  }
  _fail(id, message, context);
}

function _fail(
  id: number,
  failure: string,
  context?: Record<string, unknown>
): never {
  // Log the failure in addition to throw an exception, just in case the
  // exception is swallowed.
  let message = `FIRESTORE (${SDK_VERSION}) INTERNAL ASSERTION FAILED: ${failure} (ID: ${id.toString(
    16
  )})`;
  if (context !== undefined) {
    try {
      const stringContext = JSON.stringify(context);
      message += ' CONTEXT: ' + stringContext;
    } catch (e) {
      message += ' CONTEXT: ' + context;
    }
  }
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
 *
 * @param id generate a new unique value with `yarn assertion-idgenerate`.
 * Search for an existing value using `yarn assertion-id:find X`
 */
export function hardAssert(
  assertion: boolean,
  id: number,
  message: string,
  context?: Record<string, unknown>
): asserts assertion;

/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * Messages are stripped in production builds.
 *
 * @param id generate a new unique value with `yarn assertion-id:generate`.
 * Search for an existing value using `yarn assertion-id:find X`
 */
export function hardAssert(
  assertion: boolean,
  id: number,
  context?: Record<string, unknown>
): asserts assertion;

export function hardAssert(
  assertion: boolean,
  id: number,
  messageOrContext?: string | Record<string, unknown>,
  context?: Record<string, unknown>
): asserts assertion {
  let message = 'Unexpected state';
  if (typeof messageOrContext === 'string') {
    message = messageOrContext;
  } else {
    context = messageOrContext;
  }

  if (!assertion) {
    _fail(id, message, context);
  }
}

/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * The code of callsites invoking this function are stripped out in production
 * builds. Any side-effects of code within the debugAssert() invocation will not
 * happen in this case.
 *
 * @internal
 */
export function debugAssert(
  assertion: boolean,
  message: string
): asserts assertion {
  if (!assertion) {
    fail(0xdeb6, message);
  }
}

/**
 * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
 * instance of `T` before casting.
 */
export function debugCast<T>(
  obj: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor: { new (...args: any[]): T }
): T | never {
  debugAssert(
    obj instanceof constructor,
    `Expected type '${constructor.name}', but was '${obj.constructor.name}'`
  );
  return obj as T;
}
