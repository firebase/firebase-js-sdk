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

// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * A node in the navigation hierarchy for the table of contents.
 */
export interface IYamlTocItem {
  /**
   * The title to display
   */
  name: string;

  /**
   * If specified, the hyperlink will point to the API with this UID
   */
  uid?: string;

  /**
   * IF specified, the hyperlink will point to this URL, which may be a relative URL path
   */
  href?: string;

  /**
   * Child nodes in the hierarchy
   */
  items?: IYamlTocItem[];
}

/**
 * TypeScript interface describing the toc.yml file format, used to represent
 * the table of contents for a Universal Reference YAML documentation file.
 */
export interface IYamlTocFile {
  items: IYamlTocItem[];
  metadata?: { [key: string]: string };
}
