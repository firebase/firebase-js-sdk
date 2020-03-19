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

import { assert } from './assert';
import { Platform } from '../platform/platform';

export type EventHandler<E> = (value: E) => void;
export interface Indexable {
  [k: string]: unknown;
}

export class AutoId {
  static newId(platform: Platform): string {
    // Alphanumeric characters
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let autoId = '';
    for (let i = 0; i < 20; i++) {
      // Length of `chars` is 62. We generate random values between 0 and 247.
      // Each value maps to an 4-element interval of `chars`, for example:
      // 0..3 -> 0, 4..7 -> 1, etc. This ensures a uniform distribution of
      // probability for all candidates.
      const v = platform.randomByte(247);
      autoId += chars.charAt(Math.floor(v / 4));
    }
    assert(autoId.length === 20, 'Invalid auto ID: ' + autoId);
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

/** Duck-typed interface for objects that have an isEqual() method. */
export interface Equatable<T> {
  isEqual(other: T): boolean;
}

/** Helper to compare nullable (or undefined-able) objects using isEqual(). */
export function equals<T>(
  left: Equatable<T> | null | undefined,
  right: T | null | undefined
): boolean {
  if (left !== null && left !== undefined) {
    return !!(right && left.isEqual(right));
  } else {
    // HACK: Explicitly cast since TypeScript's type narrowing apparently isn't
    // smart enough.
    return (left as null | undefined) === right;
  }
}

/** Helper to compare arrays using isEqual(). */
export function arrayEquals<T>(left: Array<Equatable<T>>, right: T[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i++) {
    if (!left[i].isEqual(right[i])) {
      return false;
    }
  }

  return true;
}
/**
 * Returns the immediate lexicographically-following string. This is useful to
 * construct an inclusive range for indexeddb iterators.
 */
export function immediateSuccessor(s: string): string {
  // Return the input string, with an additional NUL byte appended.
  return s + '\0';
}
