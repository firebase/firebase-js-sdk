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
  DocFencedCode,
  DocNodeContainer,
  DocNode,
  DocBlock,
  DocComment,
  DocSection,
  DocCodeSpan,
  StandardTags,
  DocNodeKind,
  StringBuilder
} from '@microsoft/tsdoc';
import {
  ApiModel,
  ApiClass,
  ApiInterface,
  Excerpt,
  ApiDeclaredItem,
  ExcerptTokenKind,
  IResolveDeclarationReferenceResult,
  ApiItem,
  ApiItemKind,
  ApiParameterListMixin,
  ApiPackage,
  ApiReleaseTagMixin,
  ReleaseTag,
  ApiDocumentedItem,
  ApiNamespace,
  ApiEntryPoint,
  ApiStaticMixin,
  ApiPropertyItem,
  ApiReturnTypeMixin,
  ApiEnum
} from 'api-extractor-model-me';
import { DocEmphasisSpan } from '../nodes/DocEmphasisSpan';
import { DocHeading } from '../nodes/DocHeading';
import { DocTable } from '../nodes/DocTable';
import { Utilities } from '../utils/Utilities';
import {
  PackageName,
  FileSystem,
  NewlineKind
} from '@rushstack/node-core-library';
import { DocNoteBox } from '../nodes/DocNoteBox';
import { DocTableRow } from '../nodes/DocTableRow';
import { DocTableCell } from '../nodes/DocTableCell';
import * as path from 'path';
import { CustomMarkdownEmitter } from '../markdown/CustomMarkdownEmitter';
import { PluginLoader } from '../plugin/PluginLoader';
import { IMarkdownDocumenterFeatureOnBeforeWritePageArgs } from '../plugin/MarkdownDocumenterFeature';
import { DocumenterConfig } from './DocumenterConfig';

export function writeApiItemPage(
  apiItem: ApiItem,
  apiModel: ApiModel,
  configuration: TSDocConfiguration,
  outputFolder: string,
  markdownEmitter: CustomMarkdownEmitter,
  pluginLoader: PluginLoader,
  documenterConfig?: DocumenterConfig
): void {
  const output: DocSection = new DocSection({ configuration });
  output.appendNodes(
    createCompleteOutputForApiItem(
      apiItem,
      apiModel,
      configuration,
      outputFolder,
      markdownEmitter,
      pluginLoader,
      documenterConfig
    )
  );

  // write to file
  const filename: string = path.join(
    outputFolder,
    getFilenameForApiItem(apiItem)
  );
  const stringBuilder: StringBuilder = new StringBuilder();

  // devsite headers
  stringBuilder.append('{% extends "_internal/templates/reference.html" %}\n');
  stringBuilder.append('{% block title %}Title{% endblock title %}\n');
  stringBuilder.append('{% block body %}\n');

  markdownEmitter.emit(stringBuilder, output, {
    contextApiItem: apiItem,
    onGetFilenameForApiItem: (apiItemForFilename: ApiItem) => {
      return getLinkForApiItem(apiItemForFilename);
    }
  });

  stringBuilder.append('{% endblock body %}\n');

  let pageContent: string = stringBuilder.toString();

  if (pluginLoader.markdownDocumenterFeature) {
    // Allow the plugin to customize the pageContent
    const eventArgs: IMarkdownDocumenterFeatureOnBeforeWritePageArgs = {
      apiItem: apiItem,
      outputFilename: filename,
      pageContent: pageContent
    };
    pluginLoader.markdownDocumenterFeature.onBeforeWritePage(eventArgs);
    pageContent = eventArgs.pageContent;
  }

  FileSystem.writeFile(filename, pageContent, {
    convertLineEndings: NewlineKind.Lf
  });
}

export function createCompleteOutputForApiItem(
  apiItem: ApiItem,
  apiModel: ApiModel,
  configuration: TSDocConfiguration,
  outputFolder: string,
  markdownEmitter: CustomMarkdownEmitter,
  pluginLoader: PluginLoader,
  documenterConfig?: DocumenterConfig
): DocNode[] {
  const output: DocNode[] = [];
  const scopedName: string = apiItem.getScopedNameWithinPackage();

  switch (apiItem.kind) {
    case ApiItemKind.Class:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} class` })
      );
      break;
    case ApiItemKind.Enum:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} enum` })
      );
      break;
    case ApiItemKind.Interface:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} interface` })
      );
      break;
    case ApiItemKind.Constructor:
    case ApiItemKind.ConstructSignature:
      output.push(new DocHeading({ configuration, title: scopedName }));
      break;
    case ApiItemKind.Method:
    case ApiItemKind.MethodSignature:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} method` })
      );
      break;
    case ApiItemKind.Function:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} function` })
      );
      break;
    case ApiItemKind.Model:
      output.push(new DocHeading({ configuration, title: `API Reference` }));
      break;
    case ApiItemKind.Namespace:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} namespace` })
      );
      break;
    case ApiItemKind.Package:
      const unscopedPackageName: string = PackageName.getUnscopedName(
        apiItem.displayName
      );
      output.push(
        new DocHeading({
          configuration,
          title: `${unscopedPackageName} package`
        })
      );
      break;
    case ApiItemKind.EntryPoint:
      const packageName: string = apiItem.parent!.displayName;
      output.push(
        new DocHeading({
          configuration,
          title: `${packageName}${
            apiItem.displayName && '/' + apiItem.displayName
          }`
        })
      );
      break;
    case ApiItemKind.Property:
    case ApiItemKind.PropertySignature:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} property` })
      );
      break;
    case ApiItemKind.TypeAlias:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} type` })
      );
      break;
    case ApiItemKind.Variable:
      output.push(
        new DocHeading({ configuration, title: `${scopedName} variable` })
      );
      break;
    default:
      throw new Error('Unsupported API item kind:1 ' + apiItem.kind);
  }

  if (ApiReleaseTagMixin.isBaseClassOf(apiItem)) {
    if (apiItem.releaseTag === ReleaseTag.Beta) {
      output.push(createBetaWarning(configuration));
    }
  }

  if (apiItem instanceof ApiDocumentedItem) {
    const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

    if (tsdocComment) {
      if (tsdocComment.deprecatedBlock) {
        output.push(
          new DocNoteBox({ configuration }, [
            new DocParagraph({ configuration }, [
              new DocPlainText({
                configuration,
                text: 'Warning: This API is now obsolete. '
              })
            ]),
            ...tsdocComment.deprecatedBlock.content.nodes
          ])
        );
      }

      output.push(...tsdocComment.summarySection.nodes);
    }
  }

  if (apiItem instanceof ApiDeclaredItem) {
    output.push(...createSignatureSection(apiItem, apiModel, configuration));
  }

  let appendRemarks: boolean = true;
  switch (apiItem.kind) {
    case ApiItemKind.Class:
    case ApiItemKind.Interface:
    case ApiItemKind.Namespace:
    case ApiItemKind.Package:
      output.push(...createRemarksSection(apiItem, configuration));
      appendRemarks = false;
      break;
  }

  switch (apiItem.kind) {
    case ApiItemKind.Class:
      output.push(
        ...createClassTables(
          apiItem as ApiClass,
          apiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        )
      );
      break;
    case ApiItemKind.Enum:
      output.push(...createEnumTables(apiItem as ApiEnum, configuration));
      break;
    case ApiItemKind.Interface:
      output.push(
        ...createInterfaceTables(
          apiItem as ApiInterface,
          apiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        )
      );
      break;
    case ApiItemKind.Constructor:
    case ApiItemKind.ConstructSignature:
    case ApiItemKind.Method:
    case ApiItemKind.MethodSignature:
    case ApiItemKind.Function:
      output.push(
        ...createParameterTables(
          apiItem as ApiParameterListMixin,
          apiModel,
          configuration
        )
      );
      output.push(...createThrowsSection(apiItem, configuration));
      break;
    case ApiItemKind.Namespace:
      // this._writeEntryPointOrNamespace(output, apiItem as ApiNamespace);
      break;
    case ApiItemKind.Model:
      output.push(
        ...createModelTable(
          apiItem as ApiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        )
      );
      break;
    case ApiItemKind.Package:
      output.push(
        ...createPackage(
          apiItem as ApiPackage,
          apiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        )
      );
      break;
    case ApiItemKind.EntryPoint:
      output.push(
        ...createEntryPointOrNamespace(
          apiItem as ApiEntryPoint,
          apiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        )
      );
      break;
    case ApiItemKind.Property:
    case ApiItemKind.PropertySignature:
      break;
    case ApiItemKind.TypeAlias:
      break;
    case ApiItemKind.Variable:
      break;
    default:
      throw new Error('Unsupported API item kind:2 ' + apiItem.kind);
  }

  if (appendRemarks) {
    output.push(...createRemarksSection(apiItem, configuration));
  }

  return output;
}

export function createSignatureSection(
  apiItem: ApiDeclaredItem,
  apiModel: ApiModel,
  configuration: TSDocConfiguration
): DocNode[] {
  const nodes: DocNode[] = [];
  if (apiItem.excerpt.text.length > 0) {
    nodes.push(
      new DocParagraph({ configuration }, [
        new DocEmphasisSpan({ configuration, bold: true }, [
          new DocPlainText({ configuration, text: 'Signature:' })
        ])
      ])
    );
    nodes.push(
      new DocFencedCode({
        configuration,
        code: apiItem.getExcerptWithModifiers(),
        language: 'typescript'
      })
    );
  }

  nodes.push(...writeHeritageTypes(apiItem, apiModel, configuration));
  return nodes;
}

function writeHeritageTypes(
  apiItem: ApiDeclaredItem,
  apiModel: ApiModel,
  configuration: TSDocConfiguration
): DocNode[] {
  const nodes: DocNode[] = [];
  if (apiItem instanceof ApiClass) {
    if (apiItem.extendsType) {
      const extendsParagraph: DocParagraph = new DocParagraph(
        { configuration },
        [
          new DocEmphasisSpan({ configuration, bold: true }, [
            new DocPlainText({ configuration, text: 'Extends: ' })
          ])
        ]
      );
      appendExcerptWithHyperlinks(
        extendsParagraph,
        apiItem.extendsType.excerpt,
        apiModel,
        configuration
      );
      nodes.push(extendsParagraph);
    }
    if (apiItem.implementsTypes.length > 0) {
      const implementsParagraph: DocParagraph = new DocParagraph(
        { configuration },
        [
          new DocEmphasisSpan({ configuration, bold: true }, [
            new DocPlainText({ configuration, text: 'Implements: ' })
          ])
        ]
      );
      let needsComma: boolean = false;
      for (const implementsType of apiItem.implementsTypes) {
        if (needsComma) {
          implementsParagraph.appendNode(
            new DocPlainText({ configuration, text: ', ' })
          );
        }
        appendExcerptWithHyperlinks(
          implementsParagraph,
          implementsType.excerpt,
          apiModel,
          configuration
        );
        needsComma = true;
      }
      nodes.push(implementsParagraph);
    }
  }

  if (apiItem instanceof ApiInterface) {
    if (apiItem.extendsTypes.length > 0) {
      const extendsParagraph: DocParagraph = new DocParagraph(
        { configuration },
        [
          new DocEmphasisSpan({ configuration, bold: true }, [
            new DocPlainText({ configuration, text: 'Extends: ' })
          ])
        ]
      );
      let needsComma: boolean = false;
      for (const extendsType of apiItem.extendsTypes) {
        if (needsComma) {
          extendsParagraph.appendNode(
            new DocPlainText({ configuration, text: ', ' })
          );
        }
        appendExcerptWithHyperlinks(
          extendsParagraph,
          extendsType.excerpt,
          apiModel,
          configuration
        );
        needsComma = true;
      }
      nodes.push(extendsParagraph);
    }
  }

  return nodes;
}

function appendExcerptWithHyperlinks(
  docNodeContainer: DocNodeContainer,
  excerpt: Excerpt,
  apiModel: ApiModel,
  configuration: TSDocConfiguration
): void {
  for (const token of excerpt.spannedTokens) {
    // Markdown doesn't provide a standardized syntax for hyperlinks inside code spans, so we will render
    // the type expression as DocPlainText.  Instead of creating multiple DocParagraphs, we can simply
    // discard any newlines and let the renderer do normal word-wrapping.
    const unwrappedTokenText: string = token.text.replace(/[\r\n]+/g, ' ');

    // If it's hyperlinkable, then append a DocLinkTag
    if (token.kind === ExcerptTokenKind.Reference && token.canonicalReference) {
      const apiItemResult: IResolveDeclarationReferenceResult = apiModel.resolveDeclarationReference(
        token.canonicalReference,
        undefined
      );

      if (apiItemResult.resolvedApiItem) {
        docNodeContainer.appendNode(
          new DocLinkTag({
            configuration,
            tagName: '@link',
            linkText: unwrappedTokenText,
            urlDestination: getLinkForApiItem(apiItemResult.resolvedApiItem)
          })
        );
        continue;
      }
    }

    // Otherwise append non-hyperlinked text
    docNodeContainer.appendNode(
      new DocPlainText({ configuration, text: unwrappedTokenText })
    );
  }
}

export function getLinkForApiItem(apiItem: ApiItem) {
  const fileName = getFilenameForApiItem(apiItem);
  const headingAnchor = getHeadingAnchorForApiItem(apiItem);
  return `./${fileName}#${headingAnchor}`;
}

export function getFilenameForApiItem(apiItem: ApiItem): string {
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
      case ApiItemKind.Class:
      case ApiItemKind.Interface:
        baseName += '.' + qualifiedName;
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
      return `${scopedName}_function`;
    case ApiItemKind.Variable:
      return `${scopedName}_variable`;
    case ApiItemKind.TypeAlias:
      return `${scopedName}_type`;
    case ApiItemKind.Enum:
      return `${scopedName}_enum`;
    case ApiItemKind.Method:
    case ApiItemKind.MethodSignature:
      return `${scopedName}_method`;
    case ApiItemKind.Property:
    case ApiItemKind.PropertySignature:
      return `${scopedName}_property`;
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

function createBetaWarning(configuration: TSDocConfiguration): DocNode {
  const betaWarning: string =
    'This API is provided as a preview for developers and may change' +
    ' based on feedback that we receive.  Do not use this API in a production environment.';
  return new DocNoteBox({ configuration }, [
    new DocParagraph({ configuration }, [
      new DocPlainText({ configuration, text: betaWarning })
    ])
  ]);
}

function createRemarksSection(
  apiItem: ApiItem,
  configuration: TSDocConfiguration
): DocNode[] {
  const nodes: DocNode[] = [];
  if (apiItem instanceof ApiDocumentedItem) {
    const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

    if (tsdocComment) {
      // Write the @remarks block
      if (tsdocComment.remarksBlock) {
        nodes.push(new DocHeading({ configuration, title: 'Remarks' }));
        nodes.push(...tsdocComment.remarksBlock.content.nodes);
      }

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

        nodes.push(new DocHeading({ configuration, title: heading }));

        nodes.push(...exampleBlock.content.nodes);

        ++exampleNumber;
      }
    }
  }

  return nodes;
}

/**
 * GENERATE PAGE: CLASS
 *
 * TODO: generate member references in the same page
 */
function createClassTables(
  apiClass: ApiClass,
  apiModel: ApiModel,
  configuration: TSDocConfiguration,
  outputFolder: string,
  markdownEmitter: CustomMarkdownEmitter,
  pluginLoader: PluginLoader,
  documenterConfig?: DocumenterConfig
): DocNode[] {
  const output: DocNode[] = [];
  const eventsTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Property', 'Modifiers', 'Type', 'Description']
  });

  const constructorsTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Constructor', 'Modifiers', 'Description']
  });

  const propertiesTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Property', 'Modifiers', 'Type', 'Description']
  });

  const methodsTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Method', 'Modifiers', 'Description']
  });

  const constructorsDefinitions: DocNode[] = [];
  const methodsDefinitions: DocNode[] = [];
  const propertiesDefinitions: DocNode[] = [];
  const eventsDefinitions: DocNode[] = [];

  for (const apiMember of apiClass.members) {
    switch (apiMember.kind) {
      case ApiItemKind.Constructor: {
        constructorsTable.addRow(
          new DocTableRow({ configuration }, [
            createTitleCell(apiMember, configuration),
            createModifiersCell(apiMember, configuration),
            createDescriptionCell(apiMember, configuration)
          ])
        );

        constructorsDefinitions.push(
          ...createCompleteOutputForApiItem(
            apiMember,
            apiModel,
            configuration,
            outputFolder,
            markdownEmitter,
            pluginLoader,
            documenterConfig
          )
        );
        break;
      }
      case ApiItemKind.Method: {
        methodsTable.addRow(
          new DocTableRow({ configuration }, [
            createTitleCell(apiMember, configuration),
            createModifiersCell(apiMember, configuration),
            createDescriptionCell(apiMember, configuration)
          ])
        );

        methodsDefinitions.push(
          ...createCompleteOutputForApiItem(
            apiMember,
            apiModel,
            configuration,
            outputFolder,
            markdownEmitter,
            pluginLoader,
            documenterConfig
          )
        );
        break;
      }
      case ApiItemKind.Property: {
        if ((apiMember as ApiPropertyItem).isEventProperty) {
          eventsTable.addRow(
            new DocTableRow({ configuration }, [
              createTitleCell(apiMember, configuration),
              createModifiersCell(apiMember, configuration),
              createPropertyTypeCell(apiMember, apiModel, configuration),
              createDescriptionCell(apiMember, configuration)
            ])
          );

          eventsDefinitions.push(
            ...createCompleteOutputForApiItem(
              apiMember,
              apiModel,
              configuration,
              outputFolder,
              markdownEmitter,
              pluginLoader,
              documenterConfig
            )
          );
        } else {
          propertiesTable.addRow(
            new DocTableRow({ configuration }, [
              createTitleCell(apiMember, configuration),
              createModifiersCell(apiMember, configuration),
              createPropertyTypeCell(apiMember, apiModel, configuration),
              createDescriptionCell(apiMember, configuration)
            ])
          );
          propertiesDefinitions.push(
            ...createCompleteOutputForApiItem(
              apiMember,
              apiModel,
              configuration,
              outputFolder,
              markdownEmitter,
              pluginLoader,
              documenterConfig
            )
          );
        }
        break;
      }
    }
  }

  if (eventsTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Events' }));
    output.push(eventsTable);
  }

  if (constructorsTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Constructors' }));
    output.push(constructorsTable);
  }

  if (propertiesTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Properties' }));
    output.push(propertiesTable);
  }

  if (methodsTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Methods' }));
    output.push(methodsTable);
  }

  output.push(...eventsDefinitions);
  output.push(...constructorsDefinitions);
  output.push(...propertiesDefinitions);
  output.push(...methodsDefinitions);

  return output;
}

function createTitleCell(
  apiItem: ApiItem,
  configuration: TSDocConfiguration
): DocTableCell {
  return new DocTableCell({ configuration }, [
    new DocParagraph({ configuration }, [
      new DocLinkTag({
        configuration,
        tagName: '@link',
        linkText: Utilities.getConciseSignature(apiItem),
        urlDestination: getLinkForApiItem(apiItem)
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
function createDescriptionCell(
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

function createModifiersCell(
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

function createPropertyTypeCell(
  apiItem: ApiItem,
  apiModel: ApiModel,
  configuration: TSDocConfiguration
): DocTableCell {
  const section: DocSection = new DocSection({ configuration });

  if (apiItem instanceof ApiPropertyItem) {
    section.appendNode(
      createParagraphForTypeExcerpt(
        apiItem.propertyTypeExcerpt,
        apiModel,
        configuration
      )
    );
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

function createParagraphForTypeExcerpt(
  excerpt: Excerpt,
  apiModel: ApiModel,
  configuration: TSDocConfiguration
): DocParagraph {
  const paragraph: DocParagraph = new DocParagraph({ configuration });

  if (!excerpt.text.trim()) {
    paragraph.appendNode(
      new DocPlainText({ configuration, text: '(not declared)' })
    );
  } else {
    appendExcerptWithHyperlinks(paragraph, excerpt, apiModel, configuration);
  }

  return paragraph;
}

/**
 * GENERATE PAGE: INTERFACE
 */
function createInterfaceTables(
  apiClass: ApiInterface,
  apiModel: ApiModel,
  configuration: TSDocConfiguration,
  outputFolder: string,
  markdownEmitter: CustomMarkdownEmitter,
  pluginLoader: PluginLoader,
  documenterConfig?: DocumenterConfig
): DocNode[] {
  const output: DocNode[] = [];
  const eventsTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Property', 'Type', 'Description']
  });

  const propertiesTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Property', 'Type', 'Description']
  });

  const methodsTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Method', 'Description']
  });

  const methodsDefinitions: DocNode[] = [];
  const propertiesDefinitions: DocNode[] = [];
  const eventsDefinitions: DocNode[] = [];

  for (const apiMember of apiClass.members) {
    switch (apiMember.kind) {
      case ApiItemKind.ConstructSignature:
      case ApiItemKind.MethodSignature: {
        methodsTable.addRow(
          new DocTableRow({ configuration }, [
            createTitleCell(apiMember, configuration),
            createDescriptionCell(apiMember, configuration)
          ])
        );

        methodsDefinitions.push(
          ...createCompleteOutputForApiItem(
            apiMember,
            apiModel,
            configuration,
            outputFolder,
            markdownEmitter,
            pluginLoader,
            documenterConfig
          )
        );
        break;
      }
      case ApiItemKind.PropertySignature: {
        if ((apiMember as ApiPropertyItem).isEventProperty) {
          eventsTable.addRow(
            new DocTableRow({ configuration }, [
              createTitleCell(apiMember, configuration),
              createPropertyTypeCell(apiMember, apiModel, configuration),
              createDescriptionCell(apiMember, configuration)
            ])
          );
          eventsDefinitions.push(
            ...createCompleteOutputForApiItem(
              apiMember,
              apiModel,
              configuration,
              outputFolder,
              markdownEmitter,
              pluginLoader,
              documenterConfig
            )
          );
        } else {
          propertiesTable.addRow(
            new DocTableRow({ configuration }, [
              createTitleCell(apiMember, configuration),
              createPropertyTypeCell(apiMember, apiModel, configuration),
              createDescriptionCell(apiMember, configuration)
            ])
          );
          propertiesDefinitions.push(
            ...createCompleteOutputForApiItem(
              apiMember,
              apiModel,
              configuration,
              outputFolder,
              markdownEmitter,
              pluginLoader,
              documenterConfig
            )
          );
        }
        break;
      }
    }
  }

  if (eventsTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Events' }));
    output.push(eventsTable);
  }

  if (propertiesTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Properties' }));
    output.push(propertiesTable);
  }

  if (methodsTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Methods' }));
    output.push(methodsTable);
  }

  output.push(...eventsDefinitions);
  output.push(...propertiesDefinitions);
  output.push(...methodsDefinitions);

  return output;
}

/**
 * GENERATE PAGE: FUNCTION-LIKE
 */
function createParameterTables(
  apiParameterListMixin: ApiParameterListMixin,
  apiModel: ApiModel,
  configuration: TSDocConfiguration
): DocNode[] {
  const output: DocNode[] = [];
  const parametersTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Parameter', 'Type', 'Description']
  });
  for (const apiParameter of apiParameterListMixin.parameters) {
    const parameterDescription: DocSection = new DocSection({ configuration });
    if (apiParameter.tsdocParamBlock) {
      parameterDescription.appendNodes(
        apiParameter.tsdocParamBlock.content.nodes
      );
    }

    parametersTable.addRow(
      new DocTableRow({ configuration }, [
        new DocTableCell({ configuration }, [
          new DocParagraph({ configuration }, [
            new DocPlainText({ configuration, text: apiParameter.name })
          ])
        ]),
        new DocTableCell({ configuration }, [
          createParagraphForTypeExcerpt(
            apiParameter.parameterTypeExcerpt,
            apiModel,
            configuration
          )
        ]),
        new DocTableCell({ configuration }, parameterDescription.nodes)
      ])
    );
  }

  if (parametersTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Parameters' }));
    output.push(parametersTable);
  }

  if (ApiReturnTypeMixin.isBaseClassOf(apiParameterListMixin)) {
    const returnTypeExcerpt: Excerpt = apiParameterListMixin.returnTypeExcerpt;
    output.push(
      new DocParagraph({ configuration }, [
        new DocEmphasisSpan({ configuration, bold: true }, [
          new DocPlainText({ configuration, text: 'Returns:' })
        ])
      ])
    );

    output.push(
      createParagraphForTypeExcerpt(returnTypeExcerpt, apiModel, configuration)
    );

    if (apiParameterListMixin instanceof ApiDocumentedItem) {
      if (
        apiParameterListMixin.tsdocComment &&
        apiParameterListMixin.tsdocComment.returnsBlock
      ) {
        output.push(
          ...apiParameterListMixin.tsdocComment.returnsBlock.content.nodes
        );
      }
    }
  }

  return output;
}

function createThrowsSection(
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

/**
 * GENERATE PAGE: MODEL
 */
function createModelTable(
  apiModel: ApiModel,
  configuration: TSDocConfiguration,
  outputFolder: string,
  markdownEmitter: CustomMarkdownEmitter,
  pluginLoader: PluginLoader,
  documenterConfig?: DocumenterConfig
): DocNode[] {
  const output: DocNode[] = [];

  const packagesTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Package', 'Description']
  });

  for (const apiMember of apiModel.members) {
    const row: DocTableRow = new DocTableRow({ configuration }, [
      createTitleCell(apiMember, configuration),
      createDescriptionCell(apiMember, configuration)
    ]);

    switch (apiMember.kind) {
      case ApiItemKind.Package:
        packagesTable.addRow(row);
        writeApiItemPage(
          apiMember,
          apiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        );
        break;
    }
  }

  if (packagesTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Packages' }));
    output.push(packagesTable);
  }

  return output;
}

/**´
 * Generate a table of entry points if there are more than one entry points.
 * Otherwise, generate the entry point directly in the package page.
 */
function createPackage(
  apiContainer: ApiPackage,
  apiModel: ApiModel,
  configuration: TSDocConfiguration,
  outputFolder: string,
  markdownEmitter: CustomMarkdownEmitter,
  pluginLoader: PluginLoader,
  documenterConfig?: DocumenterConfig
): DocNode[] {
  const output: DocNode[] = [];
  // If a package has a single entry point, generate entry point page in the package page directly
  if (apiContainer.entryPoints.length === 1) {
    return createEntryPointOrNamespace(
      apiContainer.members[0] as ApiEntryPoint,
      apiModel,
      configuration,
      outputFolder,
      markdownEmitter,
      pluginLoader,
      documenterConfig
    );
  }

  const entryPointsTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Entry Point', 'Description']
  });

  for (const entryPoint of apiContainer.entryPoints) {
    const row: DocTableRow = new DocTableRow({ configuration }, [
      createEntryPointTitleCell(entryPoint, configuration),
      createDescriptionCell(entryPoint, configuration)
    ]);

    entryPointsTable.addRow(row);
  }

  output.push(entryPointsTable);

  // write entry point pages
  for (const entryPoint of apiContainer.entryPoints) {
    writeApiItemPage(
      entryPoint,
      apiModel,
      configuration,
      outputFolder,
      markdownEmitter,
      pluginLoader,
      documenterConfig
    );
  }

  return output;
}

/**
 * GENERATE PAGE: ENTRYPOINT or NAMESPACE
 */
function createEntryPointOrNamespace(
  apiContainer: ApiEntryPoint | ApiNamespace,
  apiModel: ApiModel,
  configuration: TSDocConfiguration,
  outputFolder: string,
  markdownEmitter: CustomMarkdownEmitter,
  pluginLoader: PluginLoader,
  documenterConfig?: DocumenterConfig
): DocNode[] {
  const output: DocNode[] = [];

  const classesTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Class', 'Description']
  });

  const enumerationsTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Enumeration', 'Description']
  });

  const functionsTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Function', 'Description']
  });

  const interfacesTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Interface', 'Description']
  });

  const namespacesTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Namespace', 'Description']
  });

  const variablesTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Variable', 'Description']
  });

  const typeAliasesTable: DocTable = new DocTable({
    configuration,
    headerTitles: ['Type Alias', 'Description']
  });

  const functionsDefinitions: DocNode[] = [];
  const variablesDefinitions: DocNode[] = [];
  const typeAliasDefinitions: DocNode[] = [];
  const enumsDefinitions: DocNode[] = [];

  const apiMembers: ReadonlyArray<ApiItem> =
    apiContainer.kind === ApiItemKind.EntryPoint
      ? (apiContainer as ApiEntryPoint).members
      : (apiContainer as ApiNamespace).members;

  for (const apiMember of apiMembers) {
    const row: DocTableRow = new DocTableRow({ configuration }, [
      createTitleCell(apiMember, configuration),
      createDescriptionCell(apiMember, configuration)
    ]);

    switch (apiMember.kind) {
      case ApiItemKind.Class:
        classesTable.addRow(row);
        writeApiItemPage(
          apiMember,
          apiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        );
        break;

      case ApiItemKind.Enum:
        enumerationsTable.addRow(row);
        enumsDefinitions.push(
          ...createCompleteOutputForApiItem(
            apiMember,
            apiModel,
            configuration,
            outputFolder,
            markdownEmitter,
            pluginLoader,
            documenterConfig
          )
        );
        break;

      case ApiItemKind.Interface:
        interfacesTable.addRow(row);
        writeApiItemPage(
          apiMember,
          apiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        );
        break;

      case ApiItemKind.Namespace:
        namespacesTable.addRow(row);
        writeApiItemPage(
          apiMember,
          apiModel,
          configuration,
          outputFolder,
          markdownEmitter,
          pluginLoader,
          documenterConfig
        );
        break;

      case ApiItemKind.Function:
        functionsTable.addRow(row);
        functionsDefinitions.push(
          ...createCompleteOutputForApiItem(
            apiMember,
            apiModel,
            configuration,
            outputFolder,
            markdownEmitter,
            pluginLoader,
            documenterConfig
          )
        );
        break;

      case ApiItemKind.TypeAlias:
        typeAliasesTable.addRow(row);
        typeAliasDefinitions.push(
          ...createCompleteOutputForApiItem(
            apiMember,
            apiModel,
            configuration,
            outputFolder,
            markdownEmitter,
            pluginLoader,
            documenterConfig
          )
        );
        break;

      case ApiItemKind.Variable:
        variablesTable.addRow(row);
        variablesDefinitions.push(
          ...createCompleteOutputForApiItem(
            apiMember,
            apiModel,
            configuration,
            outputFolder,
            markdownEmitter,
            pluginLoader,
            documenterConfig
          )
        );
        break;
    }
  }

  if (classesTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Classes' }));
    output.push(classesTable);
  }

  if (enumerationsTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Enumerations' }));
    output.push(enumerationsTable);
  }
  if (functionsTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Functions' }));
    output.push(functionsTable);
  }

  if (interfacesTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Interfaces' }));
    output.push(interfacesTable);
  }

  if (namespacesTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Namespaces' }));
    output.push(namespacesTable);
  }

  if (variablesTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Variables' }));
    output.push(variablesTable);
  }

  if (typeAliasesTable.rows.length > 0) {
    output.push(new DocHeading({ configuration, title: 'Type Aliases' }));
    output.push(typeAliasesTable);
  }

  if (functionsDefinitions.length > 0) {
    output.push(...functionsDefinitions);
  }

  if (variablesDefinitions.length > 0) {
    output.push(...variablesDefinitions);
  }

  if (typeAliasDefinitions.length > 0) {
    output.push(...typeAliasDefinitions);
  }

  if (enumsDefinitions.length > 0) {
    output.push(...enumsDefinitions);
  }

  return output;
}

function createEntryPointTitleCell(
  apiItem: ApiEntryPoint,
  configuration: TSDocConfiguration
): DocTableCell {
  return new DocTableCell({ configuration }, [
    new DocParagraph({ configuration }, [
      new DocLinkTag({
        configuration,
        tagName: '@link',
        linkText: `/${apiItem.displayName}`,
        urlDestination: getLinkForApiItem(apiItem)
      })
    ])
  ]);
}

/**
 * GENERATE PAGE: ENUM
 */
function createEnumTables(
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

// function writeBreadcrumb(output: DocSection, apiItem: ApiItem, apiModel: ApiModel, configuration: TSDocConfiguration): void {
//   output.appendNodeInParagraph(
//     new DocLinkTag({
//       configuration,
//       tagName: '@link',
//       linkText: 'Home',
//       urlDestination: getLinkForApiItem(apiModel)
//     })
//   );

//   let multipleEntryPoints: boolean = false;
//   for (const hierarchyItem of apiItem.getHierarchy()) {
//     let customDisplayName: string = '';

//     if (hierarchyItem.kind === ApiItemKind.Model) {
//       // We don't show the model as part of the breadcrumb because it is the root-level container.
//       continue;
//     } else if (hierarchyItem.kind === ApiItemKind.EntryPoint) {
//       // In case the package has a single entry point, we don't generate entry point pages.
//       if (!multipleEntryPoints) {
//         continue;
//       } else {
//         // In case of the root entry point, display is empty string, so we just show '/'
//         // TODO: change api-extractor to generate '/' as the name for the root entry point
//         customDisplayName = hierarchyItem.displayName || '/';
//       }
//     } else if (hierarchyItem.kind === ApiItemKind.Package) {
//       if ((hierarchyItem as ApiPackage).entryPoints.length > 1) {
//         multipleEntryPoints = true;
//       }
//     }

//     output.appendNodesInParagraph([
//       new DocPlainText({
//         configuration,
//         text: ' > '
//       }),
//       new DocLinkTag({
//         configuration,
//         tagName: '@link',
//         linkText: customDisplayName || hierarchyItem.displayName,
//         urlDestination: getLinkForApiItem(hierarchyItem)
//       })
//     ]);
//   }
// }
