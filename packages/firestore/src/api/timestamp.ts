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

import { Code, FirestoreError } from '../util/error';
import { primitiveComparator } from '../util/misc';

// The earlist date supported by Firestore timestamps (0001-01-01T00:00:00Z).
const MIN_SECONDS = -62135596800;

export class Timestamp {
  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(milliseconds: number): Timestamp {
    const seconds = Math.floor(milliseconds / 1000);
    const nanos = (milliseconds - seconds * 1000) * 1e6;
    return new Timestamp(seconds, nanos);
  }

  constructor(readonly seconds: number, readonly nanoseconds: number) {
    if (nanoseconds < 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Timestamp nanoseconds out of range: ' + nanoseconds
      );
    }
    if (nanoseconds >= 1e9) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Timestamp nanoseconds out of range: ' + nanoseconds
      );
    }
    if (seconds < MIN_SECONDS) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Timestamp seconds out of range: ' + seconds
      );
    }
    // This will break in the year 10,000.
    if (seconds >= 253402300800) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Timestamp seconds out of range: ' + seconds
      );
    }
  }

  toDate(): Date {
    return new Date(this.toMillis());
  }

  toMillis(): number {
    return this.seconds * 1000 + this.nanoseconds / 1e6;
  }

  _compareTo(other: Timestamp): number {
    if (this.seconds === other.seconds) {
      return primitiveComparator(this.nanoseconds, other.nanoseconds);
    }
    return primitiveComparator(this.seconds, other.seconds);
  }

  isEqual(other: Timestamp): boolean {
    return (
      other.seconds === this.seconds && other.nanoseconds === this.nanoseconds
    );
  }

  toString(): string {
    return (
      'Timestamp(seconds=' +
      this.seconds +
      ', nanoseconds=' +
      this.nanoseconds +
      ')'
    );
  }

  valueOf(): string {
    // This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is
    // translated to have a non-negative value and both <seconds> and <nanoseconds> are left-padded
    // with zeroes to be a consistent length. Strings with this format then have a lexiographical
    // ordering that matches the expected ordering. The <seconds> translation is done to avoid
    // having a leading negative sign (i.e. a leading '-' character) in its string representation,
    // which would affect its lexiographical ordering.
    const adjustedSeconds = this.seconds - MIN_SECONDS;
    // Note: Up to 12 decimal digits are required to represent all valid 'seconds' values.
    const formattedSeconds = String(adjustedSeconds).padStart(12, '0');
    const formattedNanoseconds = String(this.nanoseconds).padStart(9, '0');
    return formattedSeconds + '.' + formattedNanoseconds;
  }
}
