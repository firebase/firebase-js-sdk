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

import {
  DocNode,
  DocNodeContainer,
  IDocNodeContainerParameters
} from '@microsoft/tsdoc';
import { CustomDocNodeKind } from './CustomDocNodeKind';

/**
 * Constructor parameters for {@link DocEmphasisSpan}.
 */
export interface IDocEmphasisSpanParameters
  extends IDocNodeContainerParameters {
  bold?: boolean;
  italic?: boolean;
}

/**
 * Represents a span of text that is styled with CommonMark emphasis (italics), strong emphasis (boldface),
 * or both.
 */
export class DocEmphasisSpan extends DocNodeContainer {
  public readonly bold: boolean;
  public readonly italic: boolean;

  public constructor(
    parameters: IDocEmphasisSpanParameters,
    children?: DocNode[]
  ) {
    super(parameters, children);
    this.bold = !!parameters.bold;
    this.italic = !!parameters.italic;
  }

  /** @override */
  public get kind(): string {
    return CustomDocNodeKind.EmphasisSpan;
  }
}
