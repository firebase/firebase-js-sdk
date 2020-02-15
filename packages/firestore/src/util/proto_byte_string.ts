/**
 * @license
 * Copyright 2020 Google Inc.
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

import { ProtoByteString } from '../core/types';
import { PlatformSupport } from '../platform/platform';
import { Blob } from '../api/blob';

/**
 * Returns the representation of an empty "proto" byte string for the
 * platform.
 */
export function emptyByteString(): ProtoByteString {
  return Blob.fromBase64String('');
}

/**
 * Returns the representation of a "proto" byte string (in base64) for the
 * platform from the given hexadecimal string.
 */
export function byteStringFromString(value: string): ProtoByteString {
  const base64 = PlatformSupport.getPlatform().btoa(value);
  return Blob.fromBase64String(base64);
}
