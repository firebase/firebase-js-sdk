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

const LONG_TYPE = 'type.googleapis.com/google.protobuf.Int64Value';
const UNSIGNED_LONG_TYPE = 'type.googleapis.com/google.protobuf.UInt64Value';

function mapValues(o: object, f: (val: unknown) => unknown): object {
  const result = {};
  for (const key in o) {
    if (o.hasOwnProperty(key)) {
      result[key] = f(o[key]);
    }
  }
  return result;
}

export class Serializer {
  // Takes data and encodes it in a JSON-friendly way, such that types such as
  // Date are preserved.
  encode(data: unknown): unknown {
    if (data == null) {
      return null;
    }
    if (data instanceof Number) {
      data = data.valueOf();
    }
    if (typeof data === 'number' && isFinite(data)) {
      // Any number in JS is safe to put directly in JSON and parse as a double
      // without any loss of precision.
      return data;
    }
    if (data === true || data === false) {
      return data;
    }
    if (Object.prototype.toString.call(data) === '[object String]') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map(x => this.encode(x));
    }
    if (typeof data === 'function' || typeof data === 'object') {
      return mapValues(data as object, x => this.encode(x));
    }
    // If we got this far, the data is not encodable.
    throw new Error('Data cannot be encoded in JSON: ' + data);
  }

  // Takes data that's been encoded in a JSON-friendly form and returns a form
  // with richer datatypes, such as Dates, etc.
  decode(json: unknown): unknown {
    if (json == null) {
      return json;
    }
    if ((json as {})['@type']) {
      switch ((json as {})['@type']) {
        case LONG_TYPE:
        // Fall through and handle this the same as unsigned.
        case UNSIGNED_LONG_TYPE: {
          // Technically, this could work return a valid number for malformed
          // data if there was a number followed by garbage. But it's just not
          // worth all the extra code to detect that case.
          const value = Number((json as {})["value"]);
          if (isNaN(value)) {
            throw new Error('Data cannot be decoded from JSON: ' + json);
          }
          return value;
        }
        default: {
          throw new Error('Data cannot be decoded from JSON: ' + json);
        }
      }
    }
    if (Array.isArray(json)) {
      return json.map(x => this.decode(x));
    }
    if (typeof json === 'function' || typeof json === 'object') {
      return mapValues(json as object, x => this.decode(x));
    }
    // Anything else is safe to return.
    return json;
  }
}
