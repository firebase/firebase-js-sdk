/**
 * @license
 * Copyright 2021 Google LLC
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

import {
  decodeUint8Array as nodeDecodeUint8Array,
  decodeBase64 as nodeDecodeBase64
} from './node/base64';

/** Converts a Base64 encoded string to a binary string. */
export function decodeBase64(encoded: string): string {
  // This file is only used under ts-node.
  return nodeDecodeBase64(encoded);
}

/** Converts a Uint8Array to a string. */
export function decodeUint8Array(data: Uint8Array): string {
  // This file is only used under ts-node.
  return nodeDecodeUint8Array(data);
}
