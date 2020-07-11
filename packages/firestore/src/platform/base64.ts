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

import { isNode, isReactNative } from '@firebase/util';

import * as node from './node/base64';
import * as rn from './rn/base64';
import * as browser from './browser/base64';

/** Converts a Base64 encoded string to a binary string. */
export function decodeBase64(encoded: string): string {
  if (isNode()) {
    return node.decodeBase64(encoded);
  } else if (isReactNative()) {
    return rn.decodeBase64(encoded);
  } else {
    return browser.decodeBase64(encoded);
  }
}

/** Converts a binary string to a Base64 encoded string. */
export function encodeBase64(raw: string): string {
  if (isNode()) {
    return node.encodeBase64(raw);
  } else if (isReactNative()) {
    return rn.encodeBase64(raw);
  } else {
    return browser.encodeBase64(raw);
  }
}

/** True if and only if the Base64 conversion functions are available. */
export function isBase64Available(): boolean {
  if (isNode()) {
    return node.isBase64Available();
  } else if (isReactNative()) {
    return rn.isBase64Available();
  } else {
    return browser.isBase64Available();
  }
}
