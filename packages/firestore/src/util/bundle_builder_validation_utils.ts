/**
 * @license
 * Copyright 2025 Google LLC
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

import { FieldPath } from '../lite-api/field_path';
import { Timestamp } from '../lite-api/timestamp';

/**
 * Validates that 'value' is a string.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @param value The input to validate.
 * @param options Options that specify whether the string can be omitted.
 */
export function validateString(
  arg: string | number,
  value: unknown
): void {
  if (typeof value !== 'string') {
    throw new Error(invalidArgumentMessage(arg, 'string'));
  }
}

/**
 * Generates an error message to use with invalid arguments.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @param expectedType The expected input type.
 */
export function invalidArgumentMessage(
  arg: string | number,
  expectedType: string
): string {
  return `${formatArgumentName(arg)} is not a valid ${expectedType}.`;
}

/**
 * Formats the given word as plural conditionally given the preceding number.
 *
 * @private
 * @internal
 * @param num The number to use for formatting.
 * @param str The string to format.
 */
function formatPlural(num: number, str: string): string {
  return `${num} ${str}` + (num === 1 ? '' : 's');
}

/**
 * Creates a descriptive name for the provided argument name or index.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @return Either the argument name or its index description.
 */
function formatArgumentName(arg: string | number): string {
  return typeof arg === 'string'
    ? `Value for argument "${arg}"`
    : `Element at index ${arg}`;
}

/**
 * Verifies that 'args' has at least 'minSize' elements.
 *
 * @private
 * @internal
 * @param funcName The function name to use in the error message.
 * @param args The array (or array-like structure) to verify.
 * @param minSize The minimum number of elements to enforce.
 * @throws if the expectation is not met.
 */
export function validateMinNumberOfArguments(
  funcName: string,
  args: IArguments | unknown[],
  minSize: number
): void {
  if (args.length < minSize) {
    throw new Error(
      `Function "${funcName}()" requires at least ` +
        `${formatPlural(minSize, 'argument')}.`
    );
  }
}

/**
 * Verifies that 'args' has at most 'maxSize' elements.
 *
 * @private
 * @internal
 * @param funcName The function name to use in the error message.
 * @param args The array (or array-like structure) to verify.
 * @param maxSize The maximum number of elements to enforce.
 * @throws if the expectation is not met.
 */
export function validateMaxNumberOfArguments(
  funcName: string,
  args: IArguments,
  maxSize: number
): void {
  if (args.length > maxSize) {
    throw new Error(
      `Function "${funcName}()" accepts at most ` +
        `${formatPlural(maxSize, 'argument')}.`
    );
  }
}