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

/** Sentinel value that sorts before any Mutation Batch ID. */
export const BATCHID_UNKNOWN = -1;

// An Object whose keys and values are strings.
export interface StringMap {
  [key: string]: string;
}

/**
 * Returns whether a variable is either undefined or null.
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** Returns whether the value represents -0. */
export function isNegativeZero(value: number): boolean {
  // Detect if the value is -0.0. Based on polyfill from
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  return value === 0 && 1 / value === 1 / -0;
}

/**
 * Returns whether a value is an integer and in the safe integer range
 * @param value - The value to test for being an integer and in the safe range
 */
export function isSafeInteger(value: unknown): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    !isNegativeZero(value) &&
    value <= Number.MAX_SAFE_INTEGER &&
    value >= Number.MIN_SAFE_INTEGER
  );
}

/** The subset of the browser's Window interface used by the SDK. */
export interface WindowLike {
  readonly localStorage: Storage;
  readonly indexedDB: IDBFactory | null;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

/** The subset of the browser's Document interface used by the SDK. */
export interface DocumentLike {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}
