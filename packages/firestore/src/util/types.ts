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

// An Object whose keys and values are strings.
export interface StringMap {
  [key: string]: string;
}

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
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (value as number) <= Number.MAX_SAFE_INTEGER &&
    (value as number) >= Number.MIN_SAFE_INTEGER
  );
}
