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

/** Compare strings in UTF-8 encoded byte order */
export function compareUtf8Strings(left: string, right: string): number {
  // Find the first differing character (a.k.a. "UTF-16 code unit") in the two strings and,
  // if found, use that character to determine the relative ordering of the two strings as a
  // whole. Comparing UTF-16 strings in UTF-8 byte order can be done simply and efficiently by
  // comparing the UTF-16 code units (chars). This serendipitously works because of the way UTF-8
  // and UTF-16 happen to represent Unicode code points.
  //
  // After finding the first pair of differing characters, there are two cases:
  //
  // Case 1: Both characters are non-surrogates (code points less than or equal to 0xFFFF) or
  // both are surrogates from a surrogate pair (that collectively represent code points greater
  // than 0xFFFF). In this case their numeric order as UTF-16 code units is the same as the
  // lexicographical order of their corresponding UTF-8 byte sequences. A direct comparison is
  // sufficient.
  //
  // Case 2: One character is a surrogate and the other is not. In this case the surrogate-
  // containing string is always ordered after the non-surrogate. This is because surrogates are
  // used to represent code points greater than 0xFFFF which have 4-byte UTF-8 representations
  // and are lexicographically greater than the 1, 2, or 3-byte representations of code points
  // less than or equal to 0xFFFF.
  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const leftChar = left.charAt(i);
    const rightChar = right.charAt(i);
    if (leftChar !== rightChar) {
      return isSurrogate(leftChar) === isSurrogate(rightChar)
        ? primitiveComparator(leftChar, rightChar)
        : isSurrogate(leftChar)
        ? 1
        : -1;
    }
  }

  // Use the lengths of the strings to determine the overall comparison result since either the
  // strings were equal or one is a prefix of the other.
  return primitiveComparator(left.length, right.length);
}

const MIN_SURROGATE = 0xd800;
const MAX_SURROGATE = 0xdfff;

export function isSurrogate(s: string): boolean {
  debugAssert(s.length === 1, `s.length == ${s.length}, but expected 1`);
  const c = s.charCodeAt(0);
  return c >= MIN_SURROGATE && c <= MAX_SURROGATE;
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
