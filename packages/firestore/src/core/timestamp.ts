/**
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

import { assert } from '../util/assert';
import { primitiveComparator } from '../util/misc';

// A RegExp matching ISO 8601 UTC timestamps with optional fraction.
const isoRegExp = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

export class Timestamp {
  static now(): Timestamp {
    return Timestamp.fromEpochMilliseconds(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return Timestamp.fromEpochMilliseconds(date.getTime());
  }

  static fromEpochMilliseconds(milliseconds: number): Timestamp {
    const seconds = Math.floor(milliseconds / 1000);
    const nanos = (milliseconds - seconds * 1000) * 1e6;
    return new Timestamp(seconds, nanos);
  }

  static fromISOString(utc: string): Timestamp {
    // The date string can have higher precision (nanos) than the Date class
    // (millis), so we do some custom parsing here.

    // Parse the nanos right out of the string.
    let nanos = 0;
    const fraction = isoRegExp.exec(utc);
    assert(!!fraction, 'invalid timestamp: ' + utc);
    if (fraction![1]) {
      // Pad the fraction out to 9 digits (nanos).
      let nanoStr = fraction![1];
      nanoStr = (nanoStr + '000000000').substr(0, 9);
      nanos = Number(nanoStr);
    }

    // Parse the date to get the seconds.
    const date = new Date(utc);
    const seconds = Math.floor(date.getTime() / 1000);

    return new Timestamp(seconds, nanos);
  }

  constructor(readonly seconds: number, readonly nanos: number) {
    assert(nanos >= 0, 'timestamp nanoseconds out of range: ' + nanos);
    assert(nanos < 1e9, 'timestamp nanoseconds out of range' + nanos);
    // Midnight at the beginning of 1/1/1 is the earliest Firestore supports.
    assert(
      seconds >= -62135596800,
      'timestamp seconds out of range: ' + seconds
    );
    // This will break in the year 10,000.
    assert(seconds < 253402300800, 'timestamp seconds out of range' + seconds);
  }

  toDate(): Date {
    return new Date(this.toEpochMilliseconds());
  }

  toEpochMilliseconds(): number {
    return this.seconds * 1000 + this.nanos / 1e6;
  }

  compareTo(other: Timestamp): number {
    if (this.seconds === other.seconds) {
      return primitiveComparator(this.nanos, other.nanos);
    }
    return primitiveComparator(this.seconds, other.seconds);
  }

  isEqual(other: Timestamp): boolean {
    return other.seconds === this.seconds && other.nanos === this.nanos;
  }

  toString(): string {
    return 'Timestamp(seconds=' + this.seconds + ', nanos=' + this.nanos + ')';
  }
}
