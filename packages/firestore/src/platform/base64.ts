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

import { isNode, isReactNative } from '@firebase/util';

import {
  decodeBase64 as nodeDecodeBase64,
  encodeBase64 as nodeEncodeBase64,
  isBase64Available as nodeIsBase64Available
} from './node/base64';
import {
  decodeBase64 as rnDecodeBase64,
  encodeBase64 as rnEncodeBase64,
  isBase64Available as rnIsBase64Available
} from './rn/base64';
import {
  decodeBase64 as browserDecodeBase64,
  encodeBase64 as browserEncodeBase64,
  isBase64Available as browserIsBase64Available
} from './browser/base64';

/** Converts a Base64 encoded string to a binary string. */
export function decodeBase64(encoded: string): string {
  if (isNode()) {
    return nodeDecodeBase64(encoded);
  } else if (isReactNative()) {
    return rnDecodeBase64(encoded);
  } else {
    return browserDecodeBase64(encoded);
  }
}

/** Converts a binary string to a Base64 encoded string. */
export function encodeBase64(raw: string): string {
  if (isNode()) {
    return nodeEncodeBase64(raw);
  } else if (isReactNative()) {
    return rnEncodeBase64(raw);
  } else {
    return browserEncodeBase64(raw);
  }
}

/** True if and only if the Base64 conversion functions are available. */
export function isBase64Available(): boolean {
  if (isNode()) {
    return nodeIsBase64Available();
  } else if (isReactNative()) {
    return rnIsBase64Available();
  } else {
    return browserIsBase64Available();
  }
}
