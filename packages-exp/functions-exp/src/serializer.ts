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
const LONG_TYPE = 'type.googleapis.com/google.protobuf.Int64Value';
const UNSIGNED_LONG_TYPE = 'type.googleapis.com/google.protobuf.UInt64Value';

function mapValues(
  // { [k: string]: unknown } is no longer a wildcard assignment target after typescript 3.5
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  o: { [key: string]: any },
  f: (arg0: unknown) => unknown
): object {
  const result: { [key: string]: unknown } = {};
  for (const key in o) {
    if (o.hasOwnProperty(key)) {
      result[key] = f(o[key]);
    }
  }
  return result;
}

/**
 * Takes data and encodes it in a JSON-friendly way, such that types such as
 * Date are preserved.
 * @internal
 * @param data - Data to encode.
 */
export function encode(data: unknown): unknown {
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
    return data.map(x => encode(x));
  }
  if (typeof data === 'function' || typeof data === 'object') {
    return mapValues(data!, x => encode(x));
  }
  // If we got this far, the data is not encodable.
  throw new Error('Data cannot be encoded in JSON: ' + data);
}

/**
 * Takes data that's been encoded in a JSON-friendly form and returns a form
 * with richer datatypes, such as Dates, etc.
 * @internal
 * @param json - JSON to convert.
 */
export function decode(json: unknown): unknown {
  if (json == null) {
    return json;
  }
  if ((json as { [key: string]: unknown })['@type']) {
    switch ((json as { [key: string]: unknown })['@type']) {
      case LONG_TYPE:
      // Fall through and handle this the same as unsigned.
      case UNSIGNED_LONG_TYPE: {
        // Technically, this could work return a valid number for malformed
        // data if there was a number followed by garbage. But it's just not
        // worth all the extra code to detect that case.
        const value = Number((json as { [key: string]: unknown })['value']);
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
    return json.map(x => decode(x));
  }
  if (typeof json === 'function' || typeof json === 'object') {
    return mapValues(json!, x => decode(x));
  }
  // Anything else is safe to return.
  return json;
}
