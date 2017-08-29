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
import * as errorsExports from './error';
import { errors } from './error';

/**
 * @enum {string}
 */
export type StringFormat = string;
export const StringFormat = {
  RAW: 'raw',
  BASE64: 'base64',
  BASE64URL: 'base64url',
  DATA_URL: 'data_url'
};

export function formatValidator(stringFormat: string) {
  switch (stringFormat) {
    case StringFormat.RAW:
    case StringFormat.BASE64:
    case StringFormat.BASE64URL:
    case StringFormat.DATA_URL:
      return;
    default:
      throw 'Expected one of the event types: [' +
        StringFormat.RAW +
        ', ' +
        StringFormat.BASE64 +
        ', ' +
        StringFormat.BASE64URL +
        ', ' +
        StringFormat.DATA_URL +
        '].';
  }
}

/**
 * @struct
 */
export class StringData {
  contentType: string | null;

  constructor(public data: Uint8Array, opt_contentType?: string | null) {
    this.contentType = opt_contentType || null;
  }
}

export function dataFromString(
  format: StringFormat,
  string: string
): StringData {
  switch (format) {
    case StringFormat.RAW:
      return new StringData(utf8Bytes_(string));
    case StringFormat.BASE64:
    case StringFormat.BASE64URL:
      return new StringData(base64Bytes_(format, string));
    case StringFormat.DATA_URL:
      return new StringData(dataURLBytes_(string), dataURLContentType_(string));
  }

  // assert(false);
  throw errorsExports.unknown();
}

export function utf8Bytes_(string: string): Uint8Array {
  let b = [];
  for (let i = 0; i < string.length; i++) {
    let c = string.charCodeAt(i);
    if (c <= 127) {
      b.push(c);
    } else {
      if (c <= 2047) {
        b.push(192 | (c >> 6), 128 | (c & 63));
      } else {
        if ((c & 64512) == 55296) {
          // The start of a surrogate pair.
          let valid =
            i < string.length - 1 &&
            (string.charCodeAt(i + 1) & 64512) == 56320;
          if (!valid) {
            // The second surrogate wasn't there.
            b.push(239, 191, 189);
          } else {
            let hi = c;
            let lo = string.charCodeAt(++i);
            c = 65536 | ((hi & 1023) << 10) | (lo & 1023);
            b.push(
              240 | (c >> 18),
              128 | ((c >> 12) & 63),
              128 | ((c >> 6) & 63),
              128 | (c & 63)
            );
          }
        } else {
          if ((c & 64512) == 56320) {
            // Invalid low surrogate.
            b.push(239, 191, 189);
          } else {
            b.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
          }
        }
      }
    }
  }
  return new Uint8Array(b);
}

export function percentEncodedBytes_(string: string): Uint8Array {
  let decoded;
  try {
    decoded = decodeURIComponent(string);
  } catch (e) {
    throw errorsExports.invalidFormat(
      StringFormat.DATA_URL,
      'Malformed data URL.'
    );
  }
  return utf8Bytes_(decoded);
}

export function base64Bytes_(format: StringFormat, string: string): Uint8Array {
  switch (format) {
    case StringFormat.BASE64: {
      let hasMinus = string.indexOf('-') !== -1;
      let hasUnder = string.indexOf('_') !== -1;
      if (hasMinus || hasUnder) {
        let invalidChar = hasMinus ? '-' : '_';
        throw errorsExports.invalidFormat(
          format,
          "Invalid character '" +
            invalidChar +
            "' found: is it base64url encoded?"
        );
      }
      break;
    }
    case StringFormat.BASE64URL: {
      let hasPlus = string.indexOf('+') !== -1;
      let hasSlash = string.indexOf('/') !== -1;
      if (hasPlus || hasSlash) {
        let invalidChar = hasPlus ? '+' : '/';
        throw errorsExports.invalidFormat(
          format,
          "Invalid character '" + invalidChar + "' found: is it base64 encoded?"
        );
      }
      string = string.replace(/-/g, '+').replace(/_/g, '/');
      break;
    }
  }
  let bytes;
  try {
    bytes = atob(string);
  } catch (e) {
    throw errorsExports.invalidFormat(format, 'Invalid character found');
  }
  let array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  return array;
}

/**
 * @struct
 */
class DataURLParts {
  base64: boolean = false;
  contentType: string | null = null;
  rest: string;

  constructor(dataURL: string) {
    let matches = dataURL.match(/^data:([^,]+)?,/);
    if (matches === null) {
      throw errorsExports.invalidFormat(
        StringFormat.DATA_URL,
        "Must be formatted 'data:[<mediatype>][;base64],<data>"
      );
    }
    let middle = matches[1] || null;
    if (middle != null) {
      this.base64 = endsWith(middle, ';base64');
      this.contentType = this.base64
        ? middle.substring(0, middle.length - ';base64'.length)
        : middle;
    }
    this.rest = dataURL.substring(dataURL.indexOf(',') + 1);
  }
}

export function dataURLBytes_(string: string): Uint8Array {
  let parts = new DataURLParts(string);
  if (parts.base64) {
    return base64Bytes_(StringFormat.BASE64, parts.rest);
  } else {
    return percentEncodedBytes_(parts.rest);
  }
}

export function dataURLContentType_(string: string): string | null {
  let parts = new DataURLParts(string);
  return parts.contentType;
}

function endsWith(s: string, end: string): boolean {
  const longEnough = s.length >= end.length;
  if (!longEnough) {
    return false;
  }

  return s.substring(s.length - end.length) === end;
}
