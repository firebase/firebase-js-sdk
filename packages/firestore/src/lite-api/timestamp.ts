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

// The earliest date supported by Firestore timestamps (0001-01-01T00:00:00Z).
const MIN_SECONDS = -62135596800;

// Number of nanoseconds in a millisecond.
const MS_TO_NANOS = 1e6;

/**
 * A `Timestamp` represents a point in time independent of any time zone or
 * calendar, represented as seconds and fractions of seconds at nanosecond
 * resolution in UTC Epoch time.
 *
 * It is encoded using the Proleptic Gregorian Calendar which extends the
 * Gregorian calendar backwards to year one. It is encoded assuming all minutes
 * are 60 seconds long, i.e. leap seconds are "smeared" so that no leap second
 * table is needed for interpretation. Range is from 0001-01-01T00:00:00Z to
 * 9999-12-31T23:59:59.999999999Z.
 *
 * For examples and further specifications, refer to the
 * {@link https://github.com/google/protobuf/blob/master/src/google/protobuf/timestamp.proto | Timestamp definition}.
 */
export class Timestamp {
  /**
   * Creates a new timestamp with the current date, with millisecond precision.
   *
   * @returns a new timestamp representing the current date.
   */
  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }

  /**
   * Creates a new timestamp from the given date.
   *
   * @param date - The date to initialize the `Timestamp` from.
   * @returns A new `Timestamp` representing the same point in time as the given
   *     date.
   */
  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }

  /**
   * Creates a new timestamp from the given number of milliseconds.
   *
   * @param milliseconds - Number of milliseconds since Unix epoch
   *     1970-01-01T00:00:00Z.
   * @returns A new `Timestamp` representing the same point in time as the given
   *     number of milliseconds.
   */
  static fromMillis(milliseconds: number): Timestamp {
    const seconds = Math.floor(milliseconds / 1000);
    const nanos = Math.floor((milliseconds - seconds * 1000) * MS_TO_NANOS);
    return new Timestamp(seconds, nanos);
  }

  /**
   * Creates a new timestamp.
   *
   * @param seconds - The number of seconds of UTC time since Unix epoch
   *     1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
   *     9999-12-31T23:59:59Z inclusive.
   * @param nanoseconds - The non-negative fractions of a second at nanosecond
   *     resolution. Negative second values with fractions must still have
   *     non-negative nanoseconds values that count forward in time. Must be
   *     from 0 to 999,999,999 inclusive.
   */
  constructor(
    /**
     * The number of seconds of UTC time since Unix epoch 1970-01-01T00:00:00Z.
     */
    readonly seconds: number,
    /**
     * The fractions of a second at nanosecond resolution.*
     */
    readonly nanoseconds: number
  ) {
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

  /**
   * Converts a `Timestamp` to a JavaScript `Date` object. This conversion
   * causes a loss of precision since `Date` objects only support millisecond
   * precision.
   *
   * @returns JavaScript `Date` object representing the same point in time as
   *     this `Timestamp`, with millisecond precision.
   */
  toDate(): Date {
    return new Date(this.toMillis());
  }

  /**
   * Converts a `Timestamp` to a numeric timestamp (in milliseconds since
   * epoch). This operation causes a loss of precision.
   *
   * @returns The point in time corresponding to this timestamp, represented as
   *     the number of milliseconds since Unix epoch 1970-01-01T00:00:00Z.
   */
  toMillis(): number {
    return this.seconds * 1000 + this.nanoseconds / MS_TO_NANOS;
  }

  _compareTo(other: Timestamp): number {
    if (this.seconds === other.seconds) {
      return primitiveComparator(this.nanoseconds, other.nanoseconds);
    }
    return primitiveComparator(this.seconds, other.seconds);
  }

  /**
   * Returns true if this `Timestamp` is equal to the provided one.
   *
   * @param other - The `Timestamp` to compare against.
   * @returns true if this `Timestamp` is equal to the provided one.
   */
  isEqual(other: Timestamp): boolean {
    return (
      other.seconds === this.seconds && other.nanoseconds === this.nanoseconds
    );
  }

  /** Returns a textual representation of this `Timestamp`. */
  toString(): string {
    return (
      'Timestamp(seconds=' +
      this.seconds +
      ', nanoseconds=' +
      this.nanoseconds +
      ')'
    );
  }

  /** Returns a JSON-serializable representation of this `Timestamp`. */
  toJSON(): { seconds: number; nanoseconds: number } {
    return { seconds: this.seconds, nanoseconds: this.nanoseconds };
  }

  /**
   * Converts this object to a primitive string, which allows `Timestamp` objects
   * to be compared using the `>`, `<=`, `>=` and `>` operators.
   */
  valueOf(): string {
    // This method returns a string of the form <seconds>.<nanoseconds> where
    // <seconds> is translated to have a non-negative value and both <seconds>
    // and <nanoseconds> are left-padded with zeroes to be a consistent length.
    // Strings with this format then have a lexiographical ordering that matches
    // the expected ordering. The <seconds> translation is done to avoid having
    // a leading negative sign (i.e. a leading '-' character) in its string
    // representation, which would affect its lexiographical ordering.
    const adjustedSeconds = this.seconds - MIN_SECONDS;
    // Note: Up to 12 decimal digits are required to represent all valid
    // 'seconds' values.
    const formattedSeconds = String(adjustedSeconds).padStart(12, '0');
    const formattedNanoseconds = String(this.nanoseconds).padStart(9, '0');
    return formattedSeconds + '.' + formattedNanoseconds;
  }
}
