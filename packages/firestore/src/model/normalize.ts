/**
 * @license
 * Copyright 2020 Google LLC
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

import { Timestamp } from '../protos/firestore_proto_api';
import { hardAssert } from '../util/assert';
import { ByteString } from '../util/byte_string';

// A RegExp matching ISO 8601 UTC timestamps with optional fraction.
const ISO_TIMESTAMP_REG_EXP = new RegExp(
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/
);

/**
 * Converts the possible Proto values for a timestamp value into a "seconds and
 * nanos" representation.
 */
export function normalizeTimestamp(date: Timestamp): {
  seconds: number;
  nanos: number;
} {
  hardAssert(!!date, 'Cannot normalize null or undefined timestamp.');

  // The json interface (for the browser) will return an iso timestamp string,
  // while the proto js library (for node) will return a
  // google.protobuf.Timestamp instance.
  if (typeof date === 'string') {
    // The date string can have higher precision (nanos) than the Date class
    // (millis), so we do some custom parsing here.

    // Parse the nanos right out of the string.
    let nanos = 0;
    const fraction = ISO_TIMESTAMP_REG_EXP.exec(date);
    hardAssert(!!fraction, 'invalid timestamp: ' + date);
    if (fraction[1]) {
      // Pad the fraction out to 9 digits (nanos).
      let nanoStr = fraction[1];
      nanoStr = (nanoStr + '000000000').substr(0, 9);
      nanos = Number(nanoStr);
    }

    // Parse the date to get the seconds.
    const parsedDate = new Date(date);
    const seconds = Math.floor(parsedDate.getTime() / 1000);

    return { seconds, nanos };
  } else {
    // TODO(b/37282237): Use strings for Proto3 timestamps
    // assert(!this.options.useProto3Json,
    //   'The timestamp instance format requires Proto JS.');
    const seconds = normalizeNumber(date.seconds);
    const nanos = normalizeNumber(date.nanos);
    return { seconds, nanos };
  }
}

/**
 * Converts the possible Proto types for numbers into a JavaScript number.
 * Returns 0 if the value is not numeric.
 */
export function normalizeNumber(value: number | string | undefined): number {
  // TODO(bjornick): Handle int64 greater than 53 bits.
  if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    return Number(value);
  } else {
    return 0;
  }
}

/** Converts the possible Proto types for Blobs into a ByteString. */
export function normalizeByteString(blob: string | Uint8Array): ByteString {
  if (typeof blob === 'string') {
    return ByteString.fromBase64String(blob);
  } else {
    return ByteString.fromUint8Array(blob);
  }
}
