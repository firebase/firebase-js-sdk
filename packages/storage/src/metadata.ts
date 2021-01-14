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

import { FullMetadata } from '@firebase/storage-types';
import { Reference } from './reference';

/**
 * @fileoverview Documentation for the metadata format.
 */

/**
 * The full set of object metadata, including read-only properties.
 * @public
 */
interface Metadata extends FullMetadata {
  type: string | undefined;

  /**
   * A Base64-encoded MD5 hash of the object being uploaded.
   */
  md5Hash: string | undefined;

  /**
   * Served as the 'Cache-Control' header on object download.
   */
  cacheControl: string | undefined;

  /**
   * Served as the 'Content-Disposition' header on object download.
   */
  contentDisposition: string | undefined;

  /**
   * Served as the 'Content-Encoding' header on object download.
   */
  contentEncoding: string | undefined;

  /**
   * Served as the 'Content-Language' header on object download.
   */
  contentLanguage: string | undefined;

  /**
   * Served as the 'Content-Type' header on object download.
   */
  contentType: string | undefined;

  /**
   * Tokens to allow access to the downloatd URL.
   */
  downloadTokens: string[] | undefined;

  /**
   * Additional user-defined custom metadata.
   */
  customMetadata: { [key: string]: string } | undefined;

  /**
   * `StorageReference` associated with this upload.
   */
  ref: Reference | undefined;

  [prop: string]: unknown;
}

export { Metadata };
