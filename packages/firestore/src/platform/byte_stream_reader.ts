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

import { BundleSource } from '../util/bundle_reader';
import * as node from './node/byte_stream_reader';
import * as rn from './rn/byte_stream_reader';
import * as browser from './browser/byte_stream_reader';
import { isNode, isReactNative } from '@firebase/util';

export function toByteStreamReader(
  source: BundleSource,
  bytesPerRead: number = 10240
): ReadableStreamReader<Uint8Array> {
  if (isNode()) {
    return node.toByteStreamReader(source, bytesPerRead);
  } else if (isReactNative()) {
    return rn.toByteStreamReader(source, bytesPerRead);
  } else {
    return browser.toByteStreamReader(source, bytesPerRead);
  }
}
