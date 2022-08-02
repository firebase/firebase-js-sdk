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

import {
  DocPlainText,
  DocLinkTag,
  TSDocConfiguration,
  DocParagraph,
  DocNode,
  DocBlock,
  DocComment,
  DocSection,
  DocCodeSpan,
  StandardTags,
  DocNodeKind
} from '@microsoft/tsdoc';
import {
  ApiItem,
  ApiItemKind,
  ApiParameterListMixin,
  ApiPackage,
  ApiReleaseTagMixin,
  ReleaseTag,
  ApiDocumentedItem,
  ApiEntryPoint,
  ApiStaticMixin,
  ApiEnum
} from 'api-extractor-model-me';
import { DocEmphasisSpan } from '../nodes/DocEmphasisSpan';
import { DocHeading } from '../nodes/DocHeading';
import { DocTable } from '../nodes/DocTable';
import { Utilities } from '../utils/Utilities';
import { PackageName } from '@rushstack/node-core-library';
import { DocNoteBox } from '../nodes/DocNoteBox';
import { DocTableRow } from '../nodes/DocTableRow';
import { DocTableCell } from '../nodes/DocTableCell';

export function getLinkForApiItem(
  apiItem: ApiItem,
  addFileNameSuffix: boolean
) {
  const fileName = getFilenameForApiItem(apiItem, addFileNameSuffix);
  const headingAnchor = getHeadingAnchorForApiItem(apiItem);
  return `./${fileName}#${headingAnchor}`;
}

export function getFilenameForApiItem(
  apiItem: ApiItem,
  addFileNameSuffix: boolean
): string {
  if (apiItem.kind === ApiItemKind.Model) {
    return 'index.md';
  }

  let baseName: string = '';
  let multipleEntryPoints: boolean = false;
  for (const hierarchyItem of apiItem.getHierarchy()) {
    // For overloaded methods, add a suffix such as "MyClass.myMethod_2".
    let qualifiedName: string = Utilities.getSafeFilenameForName(
      hierarchyItem.displayName
    );
    if (ApiParameterListMixin.isBaseClassOf(hierarchyItem)) {
      if (hierarchyItem.overloadIndex > 1) {
        // Subtract one for compatibility with earlier releases of API Documenter.
        // (This will get revamped when we fix GitHub issue #1308)
        qualifiedName += `_${hierarchyItem.overloadIndex - 1}`;
      }
    }

    switch (hierarchyItem.kind) {
      case ApiItemKind.Model:
        break;
      case ApiItemKind.EntryPoint:
        const packageName: string = hierarchyItem.parent!.displayName;
        let entryPointName: string = PackageName.getUnscopedName(packageName);
        if (multipleEntryPoints) {
          entryPointName = `${PackageName.getUnscopedName(packageName)}/${
            hierarchyItem.displayName
          }`;
        }
        baseName = Utilities.getSafeFilenameForName(entryPointName);
        break;
      case ApiItemKind.Package:
        baseName = Utilities.getSafeFilenameForName(
          PackageName.getUnscopedName(hierarchyItem.displayName)
        );
        if ((hierarchyItem as ApiPackage).entryPoints.length > 1) {
          multipleEntryPoints = true;
        }
        break;
      case ApiItemKind.Namespace:
        baseName += '.' + qualifiedName;
        if (addFileNameSuffix) {
          baseName += '_n';
        }
        break;
      case ApiItemKind.Class:
      case ApiItemKind.Interface:
        baseName += '.' + qualifiedName;
        break;
    }
  }
  return baseName + '.md';
}

// TODO: handle method overloads and namespace?
function getHeadingAnchorForApiItem(apiItem: ApiItem): string {
  const scopedName: string = lowercaseAndRemoveSymbols(
    apiItem.getScopedNameWithinPackage()
  );

  switch (apiItem.kind) {
    case ApiItemKind.Function:
      return `${scopedName}`;
    case ApiItemKind.Variable:
      return `${scopedName}`;
    case ApiItemKind.TypeAlias:
      return `${scopedName}`;
    case ApiItemKind.Enum:
      return `${scopedName}`;
    case ApiItemKind.Method:
    case ApiItemKind.MethodSignature:
      return `${scopedName}`;
    case ApiItemKind.Property:
    case ApiItemKind.PropertySignature:
      return `${scopedName}`;
    case ApiItemKind.Constructor:
    case ApiItemKind.ConstructSignature:
      return `${scopedName}`;
    case ApiItemKind.Class:
      return `${scopedName}_class`;
    case ApiItemKind.Interface:
      return `${scopedName}_interface`;
    case ApiItemKind.Model:
      return `api-reference`;
    case ApiItemKind.Namespace:
      return `${scopedName}_namespace`;
    case ApiItemKind.Package:
      const unscopedPackageName: string = lowercaseAndRemoveSymbols(
        PackageName.getUnscopedName(apiItem.displayName)
      );
      return `${unscopedPackageName}_package`;
    case ApiItemKind.EntryPoint:
      const packageName: string = apiItem.parent!.displayName;
      return lowercaseAndRemoveSymbols(
        `${packageName}${apiItem.displayName && '/' + apiItem.displayName}`
      );
    case ApiItemKind.EnumMember:
      return `${scopedName}_enummember`;
    default:
      throw new Error(
        'Unsupported API item kind:3 ' + apiItem.kind + apiItem.displayName
      );
  }
}

function lowercaseAndRemoveSymbols(input: string): string {
  return input.replace(/[\.()]/g, '').toLowerCase();
}

export function createBetaWarning(configuration: TSDocConfiguration): DocNode {
  const betaWarning: string =
    'This API is provided as a preview for developers and may change' +
    ' based on feedback that we receive.  Do not use this API in a production environment.';
  return new DocNoteBox({ configuration }, [
    new DocParagraph({ configuration }, [
      new DocPlainText({ configuration, text: betaWarning })
    ])
  ]);
}

export function createRemarksSection(
  apiItem: ApiItem,
  configuration: TSDocConfiguration
): DocNode[] {
  const nodes: DocNode[] = [];
  if (apiItem instanceof ApiDocumentedItem) {
    const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

    if (tsdocComment) {
      // Write the @remarks block
      if (tsdocComment.remarksBlock) {
        nodes.push(...tsdocComment.remarksBlock.content.nodes);
      }
    }
  }

  return nodes;
}

export function createExampleSection(
  apiItem: ApiItem,
  configuration: TSDocConfiguration
): DocNode[] {
  const nodes: DocNode[] = [];
  if (apiItem instanceof ApiDocumentedItem) {
    const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

    if (tsdocComment) {
      // Write the @example blocks
      const exampleBlocks: DocBlock[] = tsdocComment.customBlocks.filter(
        x =>
          x.blockTag.tagNameWithUpperCase ===
          StandardTags.example.tagNameWithUpperCase
      );

      let exampleNumber: number = 1;
      for (const exampleBlock of exampleBlocks) {
        const heading: string =
          exampleBlocks.length > 1 ? `Example ${exampleNumber}` : 'Example';

        nodes.push(new DocHeading({ configuration, title: heading, level: 2 }));

        nodes.push(...exampleBlock.content.nodes);

        ++exampleNumber;
      }
    }
  }

  return nodes;
}

export function createTitleCell(
  apiItem: ApiItem,
  configuration: TSDocConfiguration,
  addFileNameSuffix: boolean
): DocTableCell {
  return new DocTableCell({ configuration }, [
    new DocParagraph({ configuration }, [
      new DocLinkTag({
        configuration,
        tagName: '@link',
        linkText: Utilities.getConciseSignature(apiItem),
        urlDestination: getLinkForApiItem(apiItem, addFileNameSuffix)
      })
    ])
  ]);
}

/**
 * This generates a DocTableCell for an ApiItem including the summary section and "(BETA)" annotation.
 *
 * @remarks
 * We mostly assume that the input is an ApiDocumentedItem, but it's easier to perform this as a runtime
 * check than to have each caller perform a type cast.
 */
export function createDescriptionCell(
  apiItem: ApiItem,
  configuration: TSDocConfiguration
): DocTableCell {
  const section: DocSection = new DocSection({ configuration });

  if (ApiReleaseTagMixin.isBaseClassOf(apiItem)) {
    if (apiItem.releaseTag === ReleaseTag.Beta) {
      section.appendNodesInParagraph([
        new DocEmphasisSpan({ configuration, bold: true, italic: true }, [
          new DocPlainText({ configuration, text: '(BETA)' })
        ]),
        new DocPlainText({ configuration, text: ' ' })
      ]);
    }
  }

  if (apiItem instanceof ApiDocumentedItem) {
    if (apiItem.tsdocComment !== undefined) {
      appendAndMergeSection(section, apiItem.tsdocComment.summarySection);
    }
  }

  return new DocTableCell({ configuration }, section.nodes);
}

export function createModifiersCell(
  apiItem: ApiItem,
  configuration: TSDocConfiguration
): DocTableCell {
  const section: DocSection = new DocSection({ configuration });

  if (ApiStaticMixin.isBaseClassOf(apiItem)) {
    if (apiItem.isStatic) {
      section.appendNodeInParagraph(
        new DocCodeSpan({ configuration, code: 'static' })
      );
    }
  }

  return new DocTableCell({ configuration }, section.nodes);
}

function appendAndMergeSection(
  output: DocSection,
  docSection: DocSection
): void {
  let firstNode: boolean = true;
  for (const node of docSection.nodes) {
    if (firstNode) {
      if (node.kind === DocNodeKind.Paragraph) {
        output.appendNodesInParagraph(node.getChildNodes());
        firstNode = false;
        continue;
      }
    }
    firstNode = false;

    output.appendNode(node);
  }
}

export function createThrowsSection(
  apiItem: ApiItem,
  configuration: TSDocConfiguration
): DocNode[] {
  const output: DocNode[] = [];
  if (apiItem instanceof ApiDocumentedItem) {
    const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

    if (tsdocComment) {
      // Write the @throws blocks
      const throwsBlocks: DocBlock[] = tsdocComment.customBlocks.filter(
        x =>
          x.blockTag.tagNameWithUpperCase ===
          StandardTags.throws.tagNameWithUpperCase
      );

      if (throwsBlocks.length > 0) {
        const heading: string = 'Exceptions';
        output.push(new DocHeading({ configuration, title: heading }));

        for (const throwsBlock of throwsBlocks) {
          output.push(...throwsBlock.content.nodes);
        }
      }
    }
  }

  return output;
}

export function createEntryPointTitleCell(
  apiItem: ApiEntryPoint,
  configuration: TSDocConfiguration,
  addFileNameSuffix: boolean
): DocTableCell {
  return new DocTableCell({ configuration }, [
    new DocParagraph({ configuration }, [
      new DocLinkTag({
        configuration,
        tagName: '@link',
        linkText: `/${apiItem.displayName}`,
        urlDestination: getLinkForApiItem(apiItem, addFileNameSuffix)
      })
    ])
  ]);
}

/**
 * GENERATE PAGE: ENUM
 */
export function createEnumTables(
  apiEnum: ApiEnum,
  configuration: TSDocConfiguration
): DocNode[] {
  const output: DocNode[] = [];
  const enumMembersTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Member', 'Value', 'Description']
  });

  for (const apiEnumMember of apiEnum.members) {
    enumMembersTable.addRow(
      new DocTableRow({ configuration }, [
        new DocTableCell({ configuration }, [
          new DocParagraph({ configuration }, [
            new DocPlainText({
              configuration,
              text: Utilities.getConciseSignature(apiEnumMember)
            })
          ])
        ]),

        new DocTableCell({ configuration }, [
          new DocParagraph({ configuration }, [
            new DocCodeSpan({
              configuration,
              code: apiEnumMember.initializerExcerpt.text
            })
          ])
        ]),

        createDescriptionCell(apiEnumMember, configuration)
      ])
    );
  }

  if (enumMembersTable.rows.length > 0) {
    output.push(
      new DocHeading({ configuration, title: 'Enumeration Members' })
    );
    output.push(enumMembersTable);
  }

  return output;
}
