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

import { randomBytes } from '../platform/random_bytes';

import { debugAssert } from './assert';

export type EventHandler<E> = (value: E) => void;
export interface Indexable {
  [k: string]: unknown;
}

/**
 * A utility class for generating unique alphanumeric IDs of a specified length.
 *
 * @internal
 * Exported internally for testing purposes.
 */
export class AutoId {
  static newId(): string {
    // Alphanumeric characters
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    // The largest byte value that is a multiple of `char.length`.
    const maxMultiple = Math.floor(256 / chars.length) * chars.length;
    debugAssert(
      0 < maxMultiple && maxMultiple < 256,
      `Expect maxMultiple to be (0, 256), but got ${maxMultiple}`
    );

    let autoId = '';
    const targetLength = 20;
    while (autoId.length < targetLength) {
      const bytes = randomBytes(40);
      for (let i = 0; i < bytes.length; ++i) {
        // Only accept values that are [0, maxMultiple), this ensures they can
        // be evenly mapped to indices of `chars` via a modulo operation.
        if (autoId.length < targetLength && bytes[i] < maxMultiple) {
          autoId += chars.charAt(bytes[i] % chars.length);
        }
      }
    }
    debugAssert(autoId.length === targetLength, 'Invalid auto ID: ' + autoId);

    return autoId;
  }
}

export function primitiveComparator<T>(left: T, right: T): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export interface Equatable<T> {
  isEqual(other: T): boolean;
}

export interface Iterable<V> {
  forEach: (cb: (v: V) => void) => void;
}

/** Helper to compare arrays using isEqual(). */
export function arrayEquals<T>(
  left: T[],
  right: T[],
  comparator: (l: T, r: T) => boolean
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => comparator(value, right[index]));
}
/**
 * Returns the immediate lexicographically-following string. This is useful to
 * construct an inclusive range for indexeddb iterators.
 */
export function immediateSuccessor(s: string): string {
  // Return the input string, with an additional NUL byte appended.
  return s + '\0';
}
