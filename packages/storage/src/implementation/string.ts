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

import { unknown, invalidFormat } from './error';
import { decodeBase64 } from '../platform/base64';

/**
 * An enumeration of the possible string formats for upload.
 * @public
 */
export type StringFormat = (typeof StringFormat)[keyof typeof StringFormat];
/**
 * An enumeration of the possible string formats for upload.
 * @public
 */
export const StringFormat = {
  /**
   * Indicates the string should be interpreted "raw", that is, as normal text.
   * The string will be interpreted as UTF-16, then uploaded as a UTF-8 byte
   * sequence.
   * Example: The string 'Hello! \\ud83d\\ude0a' becomes the byte sequence
   * 48 65 6c 6c 6f 21 20 f0 9f 98 8a
   */
  RAW: 'raw',
  /**
   * Indicates the string should be interpreted as base64-encoded data.
   * Padding characters (trailing '='s) are optional.
   * Example: The string 'rWmO++E6t7/rlw==' becomes the byte sequence
   * ad 69 8e fb e1 3a b7 bf eb 97
   */
  BASE64: 'base64',
  /**
   * Indicates the string should be interpreted as base64url-encoded data.
   * Padding characters (trailing '='s) are optional.
   * Example: The string 'rWmO--E6t7_rlw==' becomes the byte sequence
   * ad 69 8e fb e1 3a b7 bf eb 97
   */
  BASE64URL: 'base64url',
  /**
   * Indicates the string is a data URL, such as one obtained from
   * canvas.toDataURL().
   * Example: the string 'data:application/octet-stream;base64,aaaa'
   * becomes the byte sequence
   * 69 a6 9a
   * (the content-type "application/octet-stream" is also applied, but can
   * be overridden in the metadata object).
   */
  DATA_URL: 'data_url'
} as const;

export class StringData {
  contentType: string | null;

  constructor(public data: Uint8Array, contentType?: string | null) {
    this.contentType = contentType || null;
  }
}

/**
 * @internal
 */
export function dataFromString(
  format: StringFormat,
  stringData: string
): StringData {
  switch (format) {
    case StringFormat.RAW:
      return new StringData(utf8Bytes_(stringData));
    case StringFormat.BASE64:
    case StringFormat.BASE64URL:
      return new StringData(base64Bytes_(format, stringData));
    case StringFormat.DATA_URL:
      return new StringData(
        dataURLBytes_(stringData),
        dataURLContentType_(stringData)
      );
    default:
    // do nothing
  }

  // assert(false);
  throw unknown();
}

export function utf8Bytes_(value: string): Uint8Array {
  const b: number[] = [];
  for (let i = 0; i < value.length; i++) {
    let c = value.charCodeAt(i);
    if (c <= 127) {
      b.push(c);
    } else {
      if (c <= 2047) {
        b.push(192 | (c >> 6), 128 | (c & 63));
      } else {
        if ((c & 64512) === 55296) {
          // The start of a surrogate pair.
          const valid =
            i < value.length - 1 && (value.charCodeAt(i + 1) & 64512) === 56320;
          if (!valid) {
            // The second surrogate wasn't there.
            b.push(239, 191, 189);
          } else {
            const hi = c;
            const lo = value.charCodeAt(++i);
            c = 65536 | ((hi & 1023) << 10) | (lo & 1023);
            b.push(
              240 | (c >> 18),
              128 | ((c >> 12) & 63),
              128 | ((c >> 6) & 63),
              128 | (c & 63)
            );
          }
        } else {
          if ((c & 64512) === 56320) {
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

export function percentEncodedBytes_(value: string): Uint8Array {
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch (e) {
    throw invalidFormat(StringFormat.DATA_URL, 'Malformed data URL.');
  }
  return utf8Bytes_(decoded);
}

export function base64Bytes_(format: StringFormat, value: string): Uint8Array {
  switch (format) {
    case StringFormat.BASE64: {
      const hasMinus = value.indexOf('-') !== -1;
      const hasUnder = value.indexOf('_') !== -1;
      if (hasMinus || hasUnder) {
        const invalidChar = hasMinus ? '-' : '_';
        throw invalidFormat(
          format,
          "Invalid character '" +
            invalidChar +
            "' found: is it base64url encoded?"
        );
      }
      break;
    }
    case StringFormat.BASE64URL: {
      const hasPlus = value.indexOf('+') !== -1;
      const hasSlash = value.indexOf('/') !== -1;
      if (hasPlus || hasSlash) {
        const invalidChar = hasPlus ? '+' : '/';
        throw invalidFormat(
          format,
          "Invalid character '" + invalidChar + "' found: is it base64 encoded?"
        );
      }
      value = value.replace(/-/g, '+').replace(/_/g, '/');
      break;
    }
    default:
    // do nothing
  }
  let bytes;
  try {
    bytes = decodeBase64(value);
  } catch (e) {
    if ((e as Error).message.includes('polyfill')) {
      throw e;
    }
    throw invalidFormat(format, 'Invalid character found');
  }
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  return array;
}

class DataURLParts {
  base64: boolean = false;
  contentType: string | null = null;
  rest: string;

  constructor(dataURL: string) {
    const matches = dataURL.match(/^data:([^,]+)?,/);
    if (matches === null) {
      throw invalidFormat(
        StringFormat.DATA_URL,
        "Must be formatted 'data:[<mediatype>][;base64],<data>"
      );
    }
    const middle = matches[1] || null;
    if (middle != null) {
      this.base64 = endsWith(middle, ';base64');
      this.contentType = this.base64
        ? middle.substring(0, middle.length - ';base64'.length)
        : middle;
    }
    this.rest = dataURL.substring(dataURL.indexOf(',') + 1);
  }
}

export function dataURLBytes_(dataUrl: string): Uint8Array {
  const parts = new DataURLParts(dataUrl);
  if (parts.base64) {
    return base64Bytes_(StringFormat.BASE64, parts.rest);
  } else {
    return percentEncodedBytes_(parts.rest);
  }
}

export function dataURLContentType_(dataUrl: string): string | null {
  const parts = new DataURLParts(dataUrl);
  return parts.contentType;
}

function endsWith(s: string, end: string): boolean {
  const longEnough = s.length >= end.length;
  if (!longEnough) {
    return false;
  }

  return s.substring(s.length - end.length) === end;
}
