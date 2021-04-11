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

import { ApiItem } from 'api-extractor-model-me';

/** @internal */
export interface IMarkdownDocumenterAccessorImplementation {
  getLinkForApiItem(apiItem: ApiItem): string | undefined;
}

/**
 * Provides access to the documenter that is generating the output.
 *
 * @privateRemarks
 * This class is wrapper that provides access to the underlying MarkdownDocumenter, while hiding the implementation
 * details to ensure that the plugin API contract is stable.
 *
 * @public
 */
export class MarkdownDocumenterAccessor {
  private _implementation: IMarkdownDocumenterAccessorImplementation;

  /** @internal */
  public constructor(
    implementation: IMarkdownDocumenterAccessorImplementation
  ) {
    this._implementation = implementation;
  }

  /**
   * For a given `ApiItem`, return its markdown hyperlink.
   *
   * @returns The hyperlink, or `undefined` if the `ApiItem` object does not have a hyperlink.
   */
  public getLinkForApiItem(apiItem: ApiItem): string | undefined {
    return this._implementation.getLinkForApiItem(apiItem);
  }
}
