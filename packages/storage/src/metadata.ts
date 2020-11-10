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

import * as types from '@firebase/storage-types';
import { Reference } from './reference';

/**
 * @fileoverview Documentation for the metadata format.
 */

/**
 * The full set of object metadata, including read-only properties.
 */
interface Metadata extends types.FullMetadata {
  type: string | undefined;
  md5Hash: string | undefined;
  cacheControl: string | undefined;
  contentDisposition: string | undefined;
  contentEncoding: string | undefined;
  contentLanguage: string | undefined;
  contentType: string | undefined;
  downloadTokens: string[] | undefined;
  customMetadata: { [key: string]: string } | undefined;
  ref: Reference | undefined;

  [prop: string]: unknown;
}

export { Metadata };
