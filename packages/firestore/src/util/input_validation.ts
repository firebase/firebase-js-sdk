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
import { fail } from './assert';
import { Code, FirestoreError } from './error';
import * as obj from './obj';

/** Types accepted by validateType() and related methods for validation. */
export type ValidationType =
  | 'undefined'
  | 'object'
  | 'function'
  | 'boolean'
  | 'number'
  | 'string'
  | 'non-empty string';

/**
 * Validates that no arguments were passed in the invocation of functionName.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateNoArgs('myFunction', arguments);
 */
export function validateNoArgs(functionName: string, args: IArguments): void {
  if (args.length !== 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() does not support arguments, ` +
        'but was called with ' +
        formatPlural(args.length, 'argument') +
        '.'
    );
  }
}

/**
 * Validates the invocation of functionName has the exact number of arguments.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateExactNumberOfArgs('myFunction', arguments, 2);
 */
export function validateExactNumberOfArgs(
  functionName: string,
  args: IArguments,
  numberOfArgs: number
): void {
  if (args.length !== numberOfArgs) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires ` +
        formatPlural(numberOfArgs, 'argument') +
        ', but was called with ' +
        formatPlural(args.length, 'argument') +
        '.'
    );
  }
}

/**
 * Validates the invocation of functionName has at least the provided number of
 * arguments (but can have many more).
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
 */
export function validateAtLeastNumberOfArgs(
  functionName: string,
  args: IArguments,
  minNumberOfArgs: number
): void {
  if (args.length < minNumberOfArgs) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires at least ` +
        formatPlural(minNumberOfArgs, 'argument') +
        ', but was called with ' +
        formatPlural(args.length, 'argument') +
        '.'
    );
  }
}

/**
 * Validates the invocation of functionName has number of arguments between
 * the values provided.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
 */
export function validateBetweenNumberOfArgs(
  functionName: string,
  args: IArguments,
  minNumberOfArgs: number,
  maxNumberOfArgs: number
): void {
  if (args.length < minNumberOfArgs || args.length > maxNumberOfArgs) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires between ${minNumberOfArgs} and ` +
        `${maxNumberOfArgs} arguments, but was called with ` +
        formatPlural(args.length, 'argument') +
        '.'
    );
  }
}

/**
 * Validates the provided argument is an array and has as least the expected
 * number of elements.
 */
export function validateNamedArrayAtLeastNumberOfElements<T>(
  functionName: string,
  value: T[],
  name: string,
  minNumberOfElements: number
): void {
  if (!(value instanceof Array) || value.length < minNumberOfElements) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires its ${name} argument to be an ` +
        'array with at least ' +
        `${formatPlural(minNumberOfElements, 'element')}.`
    );
  }
}

/**
 * Validates the provided positional argument has the native JavaScript type
 * using typeof checks.
 */
export function validateArgType(
  functionName: string,
  type: ValidationType,
  position: number,
  argument: unknown
): void {
  validateType(functionName, type, `${ordinal(position)} argument`, argument);
}

/**
 * Validates the provided argument has the native JavaScript type using
 * typeof checks or is undefined.
 */
export function validateOptionalArgType(
  functionName: string,
  type: ValidationType,
  position: number,
  argument: unknown
): void {
  if (argument !== undefined) {
    validateArgType(functionName, type, position, argument);
  }
}

/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks.
 */
export function validateNamedType(
  functionName: string,
  type: ValidationType,
  optionName: string,
  argument: unknown
): void {
  validateType(functionName, type, `${optionName} option`, argument);
}

/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks or is undefined.
 */
export function validateNamedOptionalType(
  functionName: string,
  type: ValidationType,
  optionName: string,
  argument: unknown
): void {
  if (argument !== undefined) {
    validateNamedType(functionName, type, optionName, argument);
  }
}

export function validateArrayElements<T>(
  functionName: string,
  optionName: string,
  typeDescription: string,
  argument: T[],
  validator: (arg0: T) => boolean
): void {
  if (!(argument instanceof Array)) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires its ${optionName} ` +
        `option to be an array, but it was: ${valueDescription(argument)}`
    );
  }

  for (let i = 0; i < argument.length; ++i) {
    if (!validator(argument[i])) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Function ${functionName}() requires all ${optionName} ` +
          `elements to be ${typeDescription}, but the value at index ${i} ` +
          `was: ${valueDescription(argument[i])}`
      );
    }
  }
}

export function validateOptionalArrayElements<T>(
  functionName: string,
  optionName: string,
  typeDescription: string,
  argument: T[] | undefined,
  validator: (arg0: T) => boolean
): void {
  if (argument !== undefined) {
    validateArrayElements(
      functionName,
      optionName,
      typeDescription,
      argument,
      validator
    );
  }
}

/**
 * Validates that the provided named option equals one of the expected values.
 */
export function validateNamedPropertyEquals<T>(
  functionName: string,
  inputName: string,
  optionName: string,
  input: T,
  expected: T[]
): void {
  const expectedDescription: string[] = [];

  for (const val of expected) {
    if (val === input) {
      return;
    }
    expectedDescription.push(valueDescription(val));
  }

  const actualDescription = valueDescription(input);
  throw new FirestoreError(
    Code.INVALID_ARGUMENT,
    `Invalid value ${actualDescription} provided to function ${functionName}() for option ` +
      `"${optionName}". Acceptable values: ${expectedDescription.join(', ')}`
  );
}

/**
 * Validates that the provided named option equals one of the expected values or
 * is undefined.
 */
export function validateNamedOptionalPropertyEquals<T>(
  functionName: string,
  inputName: string,
  optionName: string,
  input: T,
  expected: T[]
): void {
  if (input !== undefined) {
    validateNamedPropertyEquals(
      functionName,
      inputName,
      optionName,
      input,
      expected
    );
  }
}

/**
 * Validates that the provided argument is a valid enum.
 *
 * @param functionName Function making the validation call.
 * @param enums Array containing all possible values for the enum.
 * @param position Position of the argument in `functionName`.
 * @param argument Arugment to validate.
 */
export function validateStringEnum<T>(
  functionName: string,
  enums: string[],
  position: number,
  argument: unknown
): void {
  if (!enums.some(element => element === argument)) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid value ${valueDescription(argument)} provided to function ` +
        `${functionName}() for its ${ordinal(position)} argument. Acceptable ` +
        `values: ${enums.join(', ')}`
    );
  }
}

/** Helper to validate the type of a provided input. */
function validateType(
  functionName: string,
  type: ValidationType,
  inputName: string,
  input: unknown
): void {
  let valid = false;
  if (type === 'object') {
    valid = isPlainObject(input);
  } else if (type === 'non-empty string') {
    valid = typeof input === 'string' && input !== '';
  } else {
    valid = typeof input === type;
  }

  if (!valid) {
    const description = valueDescription(input);
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires its ${inputName} ` +
        `to be of type ${type}, but it was: ${description}`
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

/** Hacky method to try to get the constructor name for an object. */
export function tryGetCustomObjectType(input: object): string | null {
  if (input.constructor) {
    const funcNameRegex = /function\s+([^\s(]+)\s*\(/;
    const results = funcNameRegex.exec(input.constructor.toString());
    if (results && results.length > 1) {
      return results[1];
    }
  }
  return null;
}

/** Validates the provided argument is defined. */
export function validateDefined(
  functionName: string,
  position: number,
  argument: unknown
): void {
  if (argument === undefined) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires a valid ${ordinal(position)} ` +
        `argument, but it was undefined.`
    );
  }
}

/**
 * Validates the provided positional argument is an object, and its keys and
 * values match the expected keys and types provided in optionTypes.
 */
export function validateOptionNames(
  functionName: string,
  options: object,
  optionNames: string[]
): void {
  obj.forEach(options as obj.Dict<unknown>, (key, _) => {
    if (optionNames.indexOf(key) < 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Unknown option '${key}' passed to function ${functionName}(). ` +
          'Available options: ' +
          optionNames.join(', ')
      );
    }
  });
}

/**
 * Helper method to throw an error that the provided argument did not pass
 * an instanceof check.
 */
export function invalidClassError(
  functionName: string,
  type: string,
  position: number,
  argument: unknown
): Error {
  const description = valueDescription(argument);
  return new FirestoreError(
    Code.INVALID_ARGUMENT,
    `Function ${functionName}() requires its ${ordinal(position)} ` +
      `argument to be a ${type}, but it was: ${description}`
  );
}

/** Converts a number to its english word representation */
function ordinal(num: number): string {
  switch (num) {
    case 1:
      return 'first';
    case 2:
      return 'second';
    case 3:
      return 'third';
    default:
      return num + 'th';
  }
}

/**
 * Formats the given word as plural conditionally given the preceding number.
 */
function formatPlural(num: number, str: string): string {
  return `${num} ${str}` + (num === 1 ? '' : 's');
}
