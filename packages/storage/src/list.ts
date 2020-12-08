/**
 * @license
 * Copyright 2019 Google LLC
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
import { StorageReference } from './reference';

/**
 * @fileoverview Documentation for ListOptions and ListResult format.
 */

/**
 * The options `list()` accepts.
 * @public
 */
export interface ListOptions extends types.ListOptions {}

/**
 * Result returned by `list()`.
 * @public
 */
export interface ListResult {
  /**
   * References to prefixes (sub-folders). You can call list() on them to
   * get its contents.
   *
   * Folders are implicit based on '/' in the object paths.
   * For example, if a bucket has two objects '/a/b/1' and '/a/b/2', list('/a')
   * will return '/a/b' as a prefix.
   */
  prefixes: StorageReference[];
  /**
   * Objects in this directory.
   * You can call getMetadata() and getDownloadUrl() on them.
   */
  items: StorageReference[];
  /**
   * If set, there might be more results for this list. Use this token to resume the list.
   */
  nextPageToken?: string;
}
