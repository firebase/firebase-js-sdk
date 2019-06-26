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

// Untyped Number alias we can use to check for ES6 methods / properties.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NumberAsAny = Number as any;

// An Object whose keys and values are strings.
export interface StringMap {
  [key: string]: string;
}

/**
 * Minimum safe integer in Javascript because of floating point precision.
 * Added to not rely on ES6 features.
 */
export const MIN_SAFE_INTEGER: number =
  NumberAsAny.MIN_SAFE_INTEGER || -(Math.pow(2, 53) - 1);

/**
 * Maximum safe integer in Javascript because of floating point precision.
 * Added to not rely on ES6 features.
 */
export const MAX_SAFE_INTEGER: number =
  NumberAsAny.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;

/**
 * Returns whether an number is an integer, uses native implementation if
 * available.
 * Added to not rely on ES6 features.
 * @param value The value to test for being an integer
 */
export const isInteger: (value: unknown) => boolean =
  NumberAsAny.isInteger ||
  (value =>
    typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value);

/**
 * Returns whether a variable is either undefined or null.
 */
export function isNullOrUndefined(value: unknown): boolean {
  return value === null || value === undefined;
}

/**
 * Returns whether a value is an integer and in the safe integer range
 * @param value The value to test for being an integer and in the safe range
 */
export function isSafeInteger(value: unknown): boolean {
  return (
    isInteger(value) &&
    (value as number) <= MAX_SAFE_INTEGER &&
    (value as number) >= MIN_SAFE_INTEGER
  );
}

/**
 * Safely checks if the number is NaN.
 */
export function safeIsNaN(value: unknown): boolean {
  if (NumberAsAny.IsNaN) {
    return NumberAsAny.IsNaN(value);
  } else {
    return typeof value === 'number' && isNaN(value);
  }
}
