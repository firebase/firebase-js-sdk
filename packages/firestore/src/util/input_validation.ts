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

import { DocumentKey } from '../model/document_key';
import { ResourcePath } from '../model/path';

import { fail } from './assert';
import { Code, FirestoreError } from './error';

/** Types accepted by validateType() and related methods for validation. */
export type ValidationType =
  | 'undefined'
  | 'object'
  | 'function'
  | 'boolean'
  | 'number'
  | 'string'
  | 'non-empty string';

export function validateNonEmptyArgument(
  functionName: string,
  argumentName: string,
  argument?: string
): asserts argument is string {
  if (!argument) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() cannot be called with an empty ${argumentName}.`
    );
  }
}

/**
 * Validates that two boolean options are not set at the same time.
 * @internal
 */
export function validateIsNotUsedTogether(
  optionName1: string,
  argument1: boolean | undefined,
  optionName2: string,
  argument2: boolean | undefined
): void {
  if (argument1 === true && argument2 === true) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `${optionName1} and ${optionName2} cannot be used together.`
    );
  }
}

/**
 * Validates that `path` refers to a document (indicated by the fact it contains
 * an even numbers of segments).
 */
export function validateDocumentPath(path: ResourcePath): void {
  if (!DocumentKey.isDocumentKey(path)) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid document reference. Document references must have an even number of segments, but ${path} has ${path.length}.`
    );
  }
}

/**
 * Validates that `path` refers to a collection (indicated by the fact it
 * contains an odd numbers of segments).
 */
export function validateCollectionPath(path: ResourcePath): void {
  if (DocumentKey.isDocumentKey(path)) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid collection reference. Collection references must have an odd number of segments, but ${path} has ${path.length}.`
    );
  }
}

/**
 * Returns true if it's a non-null object without a custom prototype
 * (i.e. excludes Array, Date, etc.).
 */
export function isPlainObject(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    (Object.getPrototypeOf(input) === Object.prototype ||
      Object.getPrototypeOf(input) === null)
  );
}

/** Returns a string describing the type / value of the provided input. */
export function valueDescription(input: unknown): string {
  if (input === undefined) {
    return 'undefined';
  } else if (input === null) {
    return 'null';
  } else if (typeof input === 'string') {
    if (input.length > 20) {
      input = `${input.substring(0, 20)}...`;
    }
    return JSON.stringify(input);
  } else if (typeof input === 'number' || typeof input === 'boolean') {
    return '' + input;
  } else if (typeof input === 'object') {
    if (input instanceof Array) {
      return 'an array';
    } else {
      const customObjectName = tryGetCustomObjectType(input!);
      if (customObjectName) {
        return `a custom ${customObjectName} object`;
      } else {
        return 'an object';
      }
    }
  } else if (typeof input === 'function') {
    return 'a function';
  } else {
    return fail('Unknown wrong type: ' + typeof input);
  }
}

/** try to get the constructor name for an object. */
export function tryGetCustomObjectType(input: object): string | null {
  if (input.constructor) {
    return input.constructor.name;
  }
  return null;
}

/**
 * Casts `obj` to `T`, optionally unwrapping Compat types to expose the
 * underlying instance. Throws if  `obj` is not an instance of `T`.
 *
 * This cast is used in the Lite and Full SDK to verify instance types for
 * arguments passed to the public API.
 * @internal
 */
export function cast<T>(
  obj: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor: { new (...args: any[]): T }
): T | never {
  if ('_delegate' in obj) {
    // Unwrap Compat types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj = (obj as any)._delegate;
  }

  if (!(obj instanceof constructor)) {
    if (constructor.name === obj.constructor.name) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Type does not match the expected instance. Did you pass a ' +
          `reference from a different Firestore SDK?`
      );
    } else {
      const description = valueDescription(obj);
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Expected type '${constructor.name}', but it was: ${description}`
      );
    }
  }
  return obj as T;
}

export function validatePositiveNumber(functionName: string, n: number): void {
  if (n <= 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires a positive number, but it was: ${n}.`
    );
  }
}
