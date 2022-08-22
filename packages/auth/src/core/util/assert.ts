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

import { Auth } from '../../model/public_types';
import { ErrorFactory, FirebaseError } from '@firebase/util';
import { AuthInternal } from '../../model/auth';
import {
  _DEFAULT_AUTH_ERROR_FACTORY,
  AuthErrorCode,
  AuthErrorParams,
  prodErrorMap,
  ErrorMapRetriever
} from '../errors';
import { _logError } from './log';

type AuthErrorListParams<K> = K extends keyof AuthErrorParams
  ? [AuthErrorParams[K]]
  : [];
type LessAppName<K extends AuthErrorCode> = Omit<AuthErrorParams[K], 'appName'>;

/**
 * Unconditionally fails, throwing a developer facing INTERNAL_ERROR
 *
 * @example
 * ```javascript
 * fail(auth, AuthErrorCode.MFA_REQUIRED);  // Error: the MFA_REQUIRED error needs more params than appName
 * fail(auth, AuthErrorCode.MFA_REQUIRED, {serverResponse});  // Compiles
 * fail(AuthErrorCode.INTERNAL_ERROR);  // Compiles; internal error does not need appName
 * fail(AuthErrorCode.USER_DELETED);  // Error: USER_DELETED requires app name
 * fail(auth, AuthErrorCode.USER_DELETED);  // Compiles; USER_DELETED _only_ needs app name
 * ```
 *
 * @param appName App name for tagging the error
 * @throws FirebaseError
 */
export function _fail<K extends AuthErrorCode>(
  code: K,
  ...data: {} extends AuthErrorParams[K]
    ? [AuthErrorParams[K]?]
    : [AuthErrorParams[K]]
): never;
export function _fail<K extends AuthErrorCode>(
  auth: Auth,
  code: K,
  ...data: {} extends LessAppName<K> ? [LessAppName<K>?] : [LessAppName<K>]
): never;
export function _fail<K extends AuthErrorCode>(
  authOrCode: Auth | K,
  ...rest: unknown[]
): never {
  throw createErrorInternal(authOrCode, ...rest);
}

export function _createError<K extends AuthErrorCode>(
  code: K,
  ...data: {} extends AuthErrorParams[K]
    ? [AuthErrorParams[K]?]
    : [AuthErrorParams[K]]
): FirebaseError;
export function _createError<K extends AuthErrorCode>(
  auth: Auth,
  code: K,
  ...data: {} extends LessAppName<K> ? [LessAppName<K>?] : [LessAppName<K>]
): FirebaseError;
export function _createError<K extends AuthErrorCode>(
  authOrCode: Auth | K,
  ...rest: unknown[]
): FirebaseError {
  return createErrorInternal(authOrCode, ...rest);
}

export function _errorWithCustomMessage(
  auth: Auth,
  code: AuthErrorCode,
  message: string
): FirebaseError {
  const errorMap = {
    ...(prodErrorMap as ErrorMapRetriever)(),
    [code]: message
  };
  const factory = new ErrorFactory<AuthErrorCode, AuthErrorParams>(
    'auth',
    'Firebase',
    errorMap
  );
  return factory.create(code, {
    appName: auth.name
  });
}

export function _assertInstanceOf(
  auth: Auth,
  object: object,
  instance: unknown
): void {
  const constructorInstance = instance as { new (...args: unknown[]): unknown };
  if (!(object instanceof constructorInstance)) {
    if (constructorInstance.name !== object.constructor.name) {
      _fail(auth, AuthErrorCode.ARGUMENT_ERROR);
    }

    throw _errorWithCustomMessage(
      auth,
      AuthErrorCode.ARGUMENT_ERROR,
      `Type of ${object.constructor.name} does not match expected instance.` +
        `Did you pass a reference from a different Auth SDK?`
    );
  }
}

function createErrorInternal<K extends AuthErrorCode>(
  authOrCode: Auth | K,
  ...rest: unknown[]
): FirebaseError {
  if (typeof authOrCode !== 'string') {
    const code = rest[0] as K;
    const fullParams = [...rest.slice(1)] as AuthErrorListParams<K>;
    if (fullParams[0]) {
      fullParams[0].appName = authOrCode.name;
    }

    return (authOrCode as AuthInternal)._errorFactory.create(
      code,
      ...fullParams
    );
  }

  return _DEFAULT_AUTH_ERROR_FACTORY.create(
    authOrCode,
    ...(rest as AuthErrorListParams<K>)
  );
}

export function _assert<K extends AuthErrorCode>(
  assertion: unknown,
  code: K,
  ...data: {} extends AuthErrorParams[K]
    ? [AuthErrorParams[K]?]
    : [AuthErrorParams[K]]
): asserts assertion;
export function _assert<K extends AuthErrorCode>(
  assertion: unknown,
  auth: Auth,
  code: K,
  ...data: {} extends LessAppName<K> ? [LessAppName<K>?] : [LessAppName<K>]
): asserts assertion;
export function _assert<K extends AuthErrorCode>(
  assertion: unknown,
  authOrCode: Auth | K,
  ...rest: unknown[]
): asserts assertion {
  if (!assertion) {
    throw createErrorInternal(authOrCode, ...rest);
  }
}

// We really do want to accept literally any function type here
// eslint-disable-next-line @typescript-eslint/ban-types
type TypeExpectation = Function | string | MapType;

interface MapType extends Record<string, TypeExpectation | Optional> {}

class Optional {
  constructor(readonly type: TypeExpectation) {}
}

export function opt(type: TypeExpectation): Optional {
  return new Optional(type);
}

/**
 * Asserts the runtime types of arguments. The 'expected' field can be one of
 * a class, a string (representing a "typeof" call), or a record map of name
 * to type. Furthermore, the opt() function can be used to mark a field as
 * optional. For example:
 *
 * function foo(auth: Auth, profile: {displayName?: string}, update = false) {
 *   assertTypes(arguments, [AuthImpl, {displayName: opt('string')}, opt('boolean')]);
 * }
 *
 * opt() can be used for any type:
 * function foo(auth?: Auth) {
 *   assertTypes(arguments, [opt(AuthImpl)]);
 * }
 *
 * The string types can be or'd together, and you can use "null" as well (note
 * that typeof null === 'object'; this is an edge case). For example:
 *
 * function foo(profile: {displayName?: string | null}) {
 *   assertTypes(arguments, [{displayName: opt('string|null')}]);
 * }
 *
 * @param args
 * @param expected
 */
export function assertTypes(
  args: Omit<IArguments, 'callee'>,
  ...expected: Array<TypeExpectation | Optional>
): void {
  if (args.length > expected.length) {
    _fail(AuthErrorCode.ARGUMENT_ERROR, {});
  }

  for (let i = 0; i < expected.length; i++) {
    let expect = expected[i];
    const arg = args[i];

    if (expect instanceof Optional) {
      // If the arg is undefined, then it matches "optional" and we can move to
      // the next arg
      if (typeof arg === 'undefined') {
        continue;
      }
      expect = expect.type;
    }

    if (typeof expect === 'string') {
      // Handle the edge case for null because typeof null === 'object'
      if (expect.includes('null') && arg === null) {
        continue;
      }

      const required = expect.split('|');
      _assert(required.includes(typeof arg), AuthErrorCode.ARGUMENT_ERROR, {});
    } else if (typeof expect === 'object') {
      // Recursively check record arguments
      const record = arg as Record<string, unknown>;
      const map = expect as MapType;
      const keys = Object.keys(expect);

      assertTypes(
        keys.map(k => record[k]),
        ...keys.map(k => map[k])
      );
    } else {
      _assert(arg instanceof expect, AuthErrorCode.ARGUMENT_ERROR, {});
    }
  }
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
  const message = `INTERNAL ASSERTION FAILED: ` + failure;
  _logError(message);

  // NOTE: We don't use FirebaseError here because these are internal failures
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
export function debugAssert(
  assertion: unknown,
  message: string
): asserts assertion {
  if (!assertion) {
    debugFail(message);
  }
}
