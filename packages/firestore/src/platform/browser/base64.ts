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

import { Base64DecodeError } from '../../util/base64_decode_error';

/** Converts a Base64 encoded string to a binary string. */
export function decodeBase64(encoded: string): string {
  try {
    return atob(encoded);
  } catch (e) {
    // Check that `DOMException` is defined before using it to avoid
    // "ReferenceError: Property 'DOMException' doesn't exist" in react-native.
    // (https://github.com/firebase/firebase-js-sdk/issues/7115)
    if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
      throw new Base64DecodeError('Invalid base64 string: ' + e);
    } else {
      throw e;
    }
  }
}

/** Converts a binary string to a Base64 encoded string. */
export function encodeBase64(raw: string): string {
  return btoa(raw);
}

/** True if and only if the Base64 conversion functions are available. */
export function isBase64Available(): boolean {
  return typeof atob !== 'undefined';
}
