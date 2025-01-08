/**
 * @license
 * Copyright 2025 Google LLC
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

import { normalizeByteString } from './normalize';

function stringValueToUint8Array(stringValue: string): Uint8Array {
  // Use TextEncoder to convert the string to UTF-8 encoded bytes
  const encoder = new TextEncoder();
  return encoder.encode(stringValue);
}

export function compareUtf8Strings(left: string, right: string): number {
  const leftBytes = stringValueToUint8Array(left);
  const rightBytes = stringValueToUint8Array(right);
  return compareBlobs(leftBytes, rightBytes);
}

export function compareBlobs(
  left: string | Uint8Array,
  right: string | Uint8Array
): number {
  const leftBytes = normalizeByteString(left);
  const rightBytes = normalizeByteString(right);
  return leftBytes.compareTo(rightBytes);
}
