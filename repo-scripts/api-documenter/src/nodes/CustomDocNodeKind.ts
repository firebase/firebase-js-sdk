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

import { TSDocConfiguration, DocNodeKind } from '@microsoft/tsdoc';
import { DocEmphasisSpan } from './DocEmphasisSpan';
import { DocHeading } from './DocHeading';
import { DocNoteBox } from './DocNoteBox';
import { DocTable } from './DocTable';
import { DocTableCell } from './DocTableCell';
import { DocTableRow } from './DocTableRow';

// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * Identifies custom subclasses of {@link DocNode}.
 */
export const enum CustomDocNodeKind {
  EmphasisSpan = 'EmphasisSpan',
  Heading = 'Heading',
  NoteBox = 'NoteBox',
  Table = 'Table',
  TableCell = 'TableCell',
  TableRow = 'TableRow'
}

export class CustomDocNodes {
  private static _configuration: TSDocConfiguration | undefined;

  public static get configuration(): TSDocConfiguration {
    if (CustomDocNodes._configuration === undefined) {
      const configuration: TSDocConfiguration = new TSDocConfiguration();

      configuration.docNodeManager.registerDocNodes(
        '@micrososft/api-documenter',
        [
          {
            docNodeKind: CustomDocNodeKind.EmphasisSpan,
            constructor: DocEmphasisSpan
          },
          { docNodeKind: CustomDocNodeKind.Heading, constructor: DocHeading },
          { docNodeKind: CustomDocNodeKind.NoteBox, constructor: DocNoteBox },
          { docNodeKind: CustomDocNodeKind.Table, constructor: DocTable },
          {
            docNodeKind: CustomDocNodeKind.TableCell,
            constructor: DocTableCell
          },
          { docNodeKind: CustomDocNodeKind.TableRow, constructor: DocTableRow }
        ]
      );

      configuration.docNodeManager.registerAllowableChildren(
        CustomDocNodeKind.EmphasisSpan,
        [DocNodeKind.PlainText, DocNodeKind.SoftBreak]
      );

      configuration.docNodeManager.registerAllowableChildren(
        DocNodeKind.Section,
        [
          CustomDocNodeKind.Heading,
          CustomDocNodeKind.NoteBox,
          CustomDocNodeKind.Table
        ]
      );

      configuration.docNodeManager.registerAllowableChildren(
        DocNodeKind.Paragraph,
        [CustomDocNodeKind.EmphasisSpan]
      );

      CustomDocNodes._configuration = configuration;
    }
    return CustomDocNodes._configuration;
  }
}
