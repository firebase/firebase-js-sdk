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

import { StorageReference } from './public-types';
import { Reference, getStreamInternal } from '../src/reference';
import { getModularInstance } from '@firebase/util';

/**
 * Downloads the data at the object's location. Raises an error event if the
 * object is not found.
 *
 * This API is only available in Node.
 *
 * @public
 * @param ref - StorageReference where data should be download.
 * @param maxDownloadSizeBytes - If set, the maximum allowed size in bytes to
 * retrieve.
 * @returns A stream with the object's data as bytes
 */
export function getStream(
  ref: StorageReference,
  maxDownloadSizeBytes?: number
): NodeJS.ReadableStream {
  ref = getModularInstance(ref);
  return getStreamInternal(ref as Reference, maxDownloadSizeBytes);
}
