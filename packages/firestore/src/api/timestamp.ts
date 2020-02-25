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

import { Code, FirestoreError } from '../util/error';
import { primitiveComparator } from '../util/misc';

// The lowest valid timestamp is 0001-01-01T00:00:00Z (January 01, 0001).
const MIN_SECONDS = -62135596800;
// The highest valid timestamp is 9999-12-31T23:59:59.999999999Z (Dec 31, 9999).
const MAX_SECONDS = 253402300799;

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
    if (nanoseconds < 0 || nanoseconds >= 1e9) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Timestamp nanoseconds out of range: ' + nanoseconds
      );
    }
    if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
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

  // Overriding valueOf() allows Timestamp objects to be compared in JavaScript using the
  // arithmetic comparison operators, such as < and >.
  // https://github.com/firebase/firebase-js-sdk/issues/2632
  //
  // This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is translated
  // to have a non-negative value and both <seconds> and <nanoseconds> are left-padded with zeroes
  // to be a consistent length. Strings with this format then have a lexiographical ordering that
  // matches the relative ordering of the Timestamp objects whose valueOf() method returned them.
  // The <seconds> translation is done to avoid having a leading negative sign (i.e. a leading '-'
  // character) in its string representation, which would affect its lexiographical ordering.
  valueOf(): string {
    const adjustedSeconds = this.seconds - MIN_SECONDS;
    const formattedSeconds = adjustedSeconds.toString().padStart(12, '0');
    const formattedNanoseconds = this.nanoseconds.toString().padStart(9, '0');
    return formattedSeconds + '.' + formattedNanoseconds;
  }
}
