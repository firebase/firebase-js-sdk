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
  FileSystem,
  NewlineKind,
  PackageName
} from '@rushstack/node-core-library';
import {
  DocSection,
  TSDocConfiguration,
  StringBuilder,
  DocNode,
  DocComment,
  DocParagraph,
  DocPlainText,
  DocNodeContainer,
  DocLinkTag,
  DocFencedCode
} from '@microsoft/tsdoc';
import {
  ApiModel,
  ApiItem,
  ApiItemKind,
  ApiReleaseTagMixin,
  ReleaseTag,
  ApiDocumentedItem,
  ApiDeclaredItem,
  ApiClass,
  ApiPropertyItem,
  ApiEnum,
  ApiInterface,
  ApiParameterListMixin,
  ApiReturnTypeMixin,
  Excerpt,
  ExcerptTokenKind,
  IResolveDeclarationReferenceResult,
  ApiPackage,
  ApiEntryPoint,
  ApiNamespace
} from 'api-extractor-model-me';

import { CustomDocNodes } from '../nodes/CustomDocNodeKind';
import { CustomMarkdownEmitter } from '../markdown/CustomMarkdownEmitter';
import { PluginLoader } from '../plugin/PluginLoader';
import {
  IMarkdownDocumenterFeatureOnBeforeWritePageArgs,
  MarkdownDocumenterFeatureContext
} from '../plugin/MarkdownDocumenterFeature';
import { DocumenterConfig } from './DocumenterConfig';
import { MarkdownDocumenterAccessor } from '../plugin/MarkdownDocumenterAccessor';
import {
  getLinkForApiItem,
  getFilenameForApiItem,
  createBetaWarning,
  createRemarksSection,
  createTitleCell,
  createModifiersCell,
  createDescriptionCell,
  createEnumTables,
  createThrowsSection,
  createEntryPointTitleCell,
  createExampleSection,
  getHeadingAnchorForApiItem,
} from './MarkdownDocumenterHelpers';
import * as path from 'path';
import { DocHeading } from '../nodes/DocHeading';
import { DocNoteBox } from '../nodes/DocNoteBox';
import { DocTable } from '../nodes/DocTable';
import { DocTableRow } from '../nodes/DocTableRow';
import { DocTableCell } from '../nodes/DocTableCell';
import { DocEmphasisSpan } from '../nodes/DocEmphasisSpan';
import { Utilities } from '../utils/Utilities';

export interface IMarkdownDocumenterOptions {
  apiModel: ApiModel;
  documenterConfig: DocumenterConfig | undefined;
  outputFolder: string;
  addFileNameSuffix: boolean;
  projectName: string;
  sortFunctions: string;
}

/**
 * Renders API documentation in the Markdown file format.
 * For more info:  https://en.wikipedia.org/wiki/Markdown
 */
export class MarkdownDocumenter {
  private readonly _apiModel: ApiModel;
  private readonly _documenterConfig: DocumenterConfig | undefined;
  private readonly _tsdocConfiguration: TSDocConfiguration;
  private readonly _markdownEmitter: CustomMarkdownEmitter;
  private readonly _outputFolder: string;
  private readonly _pluginLoader: PluginLoader;
  private readonly _addFileNameSuffix: boolean;
  private readonly _projectName: string;
  private readonly _sortFunctions: string;

  public constructor(options: IMarkdownDocumenterOptions) {
    this._apiModel = options.apiModel;
    this._documenterConfig = options.documenterConfig;
    this._outputFolder = options.outputFolder;
    this._addFileNameSuffix = options.addFileNameSuffix;
    this._projectName = options.projectName;
    this._sortFunctions = options.sortFunctions;
    this._tsdocConfiguration = CustomDocNodes.configuration;
    this._markdownEmitter = new CustomMarkdownEmitter(this._apiModel);

    this._pluginLoader = new PluginLoader();
  }

  public generateFiles(): void {
    if (this._documenterConfig) {
      this._pluginLoader.load(this._documenterConfig, () => {
        return new MarkdownDocumenterFeatureContext({
          apiModel: this._apiModel,
          outputFolder: this._outputFolder,
          documenter: new MarkdownDocumenterAccessor({
            getLinkForApiItem: (apiItem: ApiItem) => {
              return getLinkForApiItem(apiItem, this._addFileNameSuffix);
            }
          })
        });
      });
    }

    this._deleteOldOutputFiles();

    this._writeApiItemPage(this._apiModel);

    if (this._pluginLoader.markdownDocumenterFeature) {
      this._pluginLoader.markdownDocumenterFeature.onFinished({});
    }
  }

  _writeApiItemPage(apiItem: ApiItem): void {
    const output: DocSection = new DocSection({
      configuration: this._tsdocConfiguration
    });
    const nodes = this._createCompleteOutputForApiItem(apiItem);

    /**
     * Remove the heading of the page from md output. (the first item is always a DocHeading)
     * Later we will add the heading to the devsite header {% block title %}
     */
    const headingNode: DocHeading = nodes[0] as DocHeading;
    const pageWithoutHeading = nodes.slice(1);
    output.appendNodes(pageWithoutHeading);

    // write to file
    const filename: string = path.join(
      this._outputFolder,
      getFilenameForApiItem(apiItem, this._addFileNameSuffix)
    );
    const stringBuilder: StringBuilder = new StringBuilder();

    // devsite headers
    stringBuilder.append(
      `Project: /docs/reference/${this._projectName}/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference
`
    );

    stringBuilder.append(`# ${headingNode.title}\n`);

    this._markdownEmitter.emit(stringBuilder, output, {
      contextApiItem: apiItem,
      onGetFilenameForApiItem: (apiItemForFilename: ApiItem) => {
        return getLinkForApiItem(apiItemForFilename, this._addFileNameSuffix);
      }
    });

    let pageContent: string = stringBuilder.toString();

    if (this._pluginLoader.markdownDocumenterFeature) {
      // Allow the plugin to customize the pageContent
      const eventArgs: IMarkdownDocumenterFeatureOnBeforeWritePageArgs = {
        apiItem: apiItem,
        outputFilename: filename,
        pageContent: pageContent
      };
      this._pluginLoader.markdownDocumenterFeature.onBeforeWritePage(eventArgs);
      pageContent = eventArgs.pageContent;
    }

    FileSystem.writeFile(filename, pageContent, {
      convertLineEndings: NewlineKind.Lf
    });
  }

  _functionHeadingLevel(): number {
    // If sorting functions by first parameter
    // then the function heading will be under
    // the parameter heading, so it will be level
    // 2. Otherwise, it will be level 1.
    return !!this._sortFunctions ? 2 : 1;
  }

  _createCompleteOutputForApiItem(apiItem: ApiItem): DocNode[] {
    const configuration = this._tsdocConfiguration;
    const output: DocNode[] = [];
    const scopedName: string = apiItem.getScopedNameWithinPackage();

    switch (apiItem.kind) {
      case ApiItemKind.Class:
        output.push(
          new DocHeading({ configuration, title: `${scopedName} class` })
        );
        break;
      case ApiItemKind.Enum:
        output.push(new DocHeading({ configuration, title: `${scopedName}` }));
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
        output.push(new DocHeading({ configuration, title: `${scopedName}` }));
        break;
      case ApiItemKind.Function:
        const anchor = getHeadingAnchorForApiItem(apiItem);
        output.push(
          new DocHeading({
            configuration,
            title: Utilities.getConciseSignature(apiItem),
            anchor: anchor,
            level: this._functionHeadingLevel()
          })
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
        output.push(new DocHeading({ configuration, title: `${scopedName}` }));
        break;
      case ApiItemKind.TypeAlias:
        output.push(new DocHeading({ configuration, title: `${scopedName}` }));
        break;
      case ApiItemKind.Variable:
        output.push(new DocHeading({ configuration, title: `${scopedName}` }));
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

    // render remark sections
    output.push(...createRemarksSection(apiItem, configuration));

    if (apiItem instanceof ApiDeclaredItem) {
      output.push(...this._createSignatureSection(apiItem));
    }

    switch (apiItem.kind) {
      case ApiItemKind.Class:
        output.push(...this._createClassTables(apiItem as ApiClass));
        break;
      case ApiItemKind.Enum:
        output.push(...createEnumTables(apiItem as ApiEnum, configuration));
        break;
      case ApiItemKind.Interface:
        output.push(...this._createInterfaceTables(apiItem as ApiInterface));
        break;
      case ApiItemKind.Constructor:
      case ApiItemKind.ConstructSignature:
      case ApiItemKind.Method:
      case ApiItemKind.MethodSignature:
      case ApiItemKind.Function:
        output.push(
          ...this._createParameterTables(
            apiItem as ApiParameterListMixin,
            this._functionHeadingLevel()
          )
        );
        output.push(
          ...createThrowsSection(
            apiItem,
            configuration,
            this._functionHeadingLevel()
          )
        );
        break;
      case ApiItemKind.Namespace:
        output.push(
          ...this._createEntryPointOrNamespace(apiItem as ApiNamespace)
        );
        break;
      case ApiItemKind.Model:
        output.push(...this._createModelTable(apiItem as ApiModel));
        break;
      case ApiItemKind.Package:
        output.push(...this._createPackage(apiItem as ApiPackage));
        break;
      case ApiItemKind.EntryPoint:
        output.push(
          ...this._createEntryPointOrNamespace(apiItem as ApiEntryPoint)
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

    output.push(...createExampleSection(apiItem, configuration));

    return output;
  }

  /**
   * GENERATE PAGE: CLASS
   *
   * TODO: generate member references in the same page
   */
  private _createClassTables(apiClass: ApiClass): DocNode[] {
    const configuration = this._tsdocConfiguration;
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
              createTitleCell(
                apiMember,
                configuration,
                this._addFileNameSuffix
              ),
              createModifiersCell(apiMember, configuration),
              createDescriptionCell(apiMember, configuration)
            ])
          );

          constructorsDefinitions.push(
            ...this._createCompleteOutputForApiItem(apiMember)
          );
          break;
        }
        case ApiItemKind.Method: {
          methodsTable.addRow(
            new DocTableRow({ configuration }, [
              createTitleCell(
                apiMember,
                configuration,
                this._addFileNameSuffix
              ),
              createModifiersCell(apiMember, configuration),
              createDescriptionCell(apiMember, configuration)
            ])
          );

          methodsDefinitions.push(
            ...this._createCompleteOutputForApiItem(apiMember)
          );
          break;
        }
        case ApiItemKind.Property: {
          if ((apiMember as ApiPropertyItem).isEventProperty) {
            eventsTable.addRow(
              new DocTableRow({ configuration }, [
                createTitleCell(
                  apiMember,
                  configuration,
                  this._addFileNameSuffix
                ),
                createModifiersCell(apiMember, configuration),
                this._createPropertyTypeCell(apiMember),
                createDescriptionCell(apiMember, configuration)
              ])
            );

            eventsDefinitions.push(
              ...this._createCompleteOutputForApiItem(apiMember)
            );
          } else {
            propertiesTable.addRow(
              new DocTableRow({ configuration }, [
                createTitleCell(
                  apiMember,
                  configuration,
                  this._addFileNameSuffix
                ),
                createModifiersCell(apiMember, configuration),
                this._createPropertyTypeCell(apiMember),
                createDescriptionCell(apiMember, configuration)
              ])
            );
            propertiesDefinitions.push(
              ...this._createCompleteOutputForApiItem(apiMember)
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

  /**
   * GENERATE PAGE: INTERFACE
   */
  private _createInterfaceTables(apiClass: ApiInterface): DocNode[] {
    const configuration = this._tsdocConfiguration;
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
              createTitleCell(
                apiMember,
                configuration,
                this._addFileNameSuffix
              ),
              createDescriptionCell(apiMember, configuration)
            ])
          );

          methodsDefinitions.push(
            ...this._createCompleteOutputForApiItem(apiMember)
          );
          break;
        }
        case ApiItemKind.PropertySignature: {
          if ((apiMember as ApiPropertyItem).isEventProperty) {
            eventsTable.addRow(
              new DocTableRow({ configuration }, [
                createTitleCell(
                  apiMember,
                  configuration,
                  this._addFileNameSuffix
                ),
                this._createPropertyTypeCell(apiMember),
                createDescriptionCell(apiMember, configuration)
              ])
            );
            eventsDefinitions.push(
              ...this._createCompleteOutputForApiItem(apiMember)
            );
          } else {
            propertiesTable.addRow(
              new DocTableRow({ configuration }, [
                createTitleCell(
                  apiMember,
                  configuration,
                  this._addFileNameSuffix
                ),
                this._createPropertyTypeCell(apiMember),
                createDescriptionCell(apiMember, configuration)
              ])
            );
            propertiesDefinitions.push(
              ...this._createCompleteOutputForApiItem(apiMember)
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
  private _createParameterTables(
    apiParameterListMixin: ApiParameterListMixin,
    parentHeadingLevel: number
  ): DocNode[] {
    const configuration = this._tsdocConfiguration;
    const output: DocNode[] = [];
    const parametersTable: DocTable = new DocTable({
      configuration,
      headerTitles: ['Parameter', 'Type', 'Description']
    });
    for (const apiParameter of apiParameterListMixin.parameters) {
      const parameterDescription: DocSection = new DocSection({
        configuration
      });
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
            this._createParagraphForTypeExcerpt(
              apiParameter.parameterTypeExcerpt
            )
          ]),
          new DocTableCell({ configuration }, parameterDescription.nodes)
        ])
      );
    }

    if (parametersTable.rows.length > 0) {
      output.push(
        new DocHeading({
          configuration,
          title: 'Parameters',
          level: parentHeadingLevel + 1
        })
      );
      output.push(parametersTable);
    }

    if (ApiReturnTypeMixin.isBaseClassOf(apiParameterListMixin)) {
      const returnTypeExcerpt: Excerpt =
        apiParameterListMixin.returnTypeExcerpt;
      output.push(
        new DocParagraph({ configuration }, [
          new DocEmphasisSpan({ configuration, bold: true }, [
            new DocPlainText({ configuration, text: 'Returns:' })
          ])
        ])
      );

      output.push(this._createParagraphForTypeExcerpt(returnTypeExcerpt));

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

  private _createParagraphForTypeExcerpt(excerpt: Excerpt): DocParagraph {
    const configuration = this._tsdocConfiguration;
    const paragraph: DocParagraph = new DocParagraph({ configuration });

    if (!excerpt.text.trim()) {
      paragraph.appendNode(
        new DocPlainText({ configuration, text: '(not declared)' })
      );
    } else {
      this._appendExcerptWithHyperlinks(paragraph, excerpt);
    }

    return paragraph;
  }

  private _appendExcerptWithHyperlinks(
    docNodeContainer: DocNodeContainer,
    excerpt: Excerpt
  ): void {
    const configuration = this._tsdocConfiguration;
    for (const token of excerpt.spannedTokens) {
      // Markdown doesn't provide a standardized syntax for hyperlinks inside code spans, so we will render
      // the type expression as DocPlainText.  Instead of creating multiple DocParagraphs, we can simply
      // discard any newlines and let the renderer do normal word-wrapping.
      const unwrappedTokenText: string = token.text.replace(/[\r\n]+/g, ' ');

      // If it's hyperlinkable, then append a DocLinkTag
      if (
        token.kind === ExcerptTokenKind.Reference &&
        token.canonicalReference
      ) {
        const apiItemResult: IResolveDeclarationReferenceResult =
          this._apiModel.resolveDeclarationReference(
            token.canonicalReference,
            undefined
          );

        if (apiItemResult.resolvedApiItem) {
          docNodeContainer.appendNode(
            new DocLinkTag({
              configuration,
              tagName: '@link',
              linkText: unwrappedTokenText,
              urlDestination: getLinkForApiItem(
                apiItemResult.resolvedApiItem,
                this._addFileNameSuffix
              )
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

  /**
   * GENERATE PAGE: MODEL
   */
  private _createModelTable(apiModel: ApiModel): DocNode[] {
    const configuration = this._tsdocConfiguration;
    const output: DocNode[] = [];

    const packagesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ['Package', 'Description']
    });

    for (const apiMember of apiModel.members) {
      const row: DocTableRow = new DocTableRow({ configuration }, [
        createTitleCell(apiMember, configuration, this._addFileNameSuffix),
        createDescriptionCell(apiMember, configuration)
      ]);

      switch (apiMember.kind) {
        case ApiItemKind.Package:
          packagesTable.addRow(row);
          this._writeApiItemPage(apiMember);
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
  private _createPackage(apiContainer: ApiPackage): DocNode[] {
    const configuration = this._tsdocConfiguration;
    const output: DocNode[] = [];
    // If a package has a single entry point, generate entry point page in the package page directly
    if (apiContainer.entryPoints.length === 1) {
      return this._createEntryPointOrNamespace(
        apiContainer.members[0] as ApiEntryPoint
      );
    }

    const entryPointsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ['Entry Point', 'Description']
    });

    for (const entryPoint of apiContainer.entryPoints) {
      const row: DocTableRow = new DocTableRow({ configuration }, [
        createEntryPointTitleCell(
          entryPoint,
          configuration,
          this._addFileNameSuffix
        ),
        createDescriptionCell(entryPoint, configuration)
      ]);

      entryPointsTable.addRow(row);
    }

    output.push(entryPointsTable);

    // write entry point pages
    for (const entryPoint of apiContainer.entryPoints) {
      this._writeApiItemPage(entryPoint);
    }

    return output;
  }

  /**
   * GENERATE PAGE: ENTRYPOINT or NAMESPACE
   */
  private _createEntryPointOrNamespace(
    apiContainer: ApiEntryPoint | ApiNamespace
  ): DocNode[] {
    const configuration = this._tsdocConfiguration;
    const output: DocNode[] = [];

    const classesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ['Class', 'Description']
    });

    const enumerationsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ['Enumeration', 'Description']
    });

    const finalFunctionsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ['Function', 'Description']
    });

    const functionsRowGroup: Record<string, DocTableRow[]> = {};

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

    const functionsDefinitionsGroup: Record<string, DocNode[]> = {};
    const finalFunctionsDefinitions: DocNode[] = [];
    const variablesDefinitions: DocNode[] = [];
    const typeAliasDefinitions: DocNode[] = [];
    const enumsDefinitions: DocNode[] = [];

    const apiMembers: ReadonlyArray<ApiItem> =
      apiContainer.kind === ApiItemKind.EntryPoint
        ? (apiContainer as ApiEntryPoint).members
        : (apiContainer as ApiNamespace).members;

    for (const apiMember of apiMembers) {
      const row: DocTableRow = new DocTableRow({ configuration }, [
        createTitleCell(apiMember, configuration, this._addFileNameSuffix),
        createDescriptionCell(apiMember, configuration)
      ]);

      switch (apiMember.kind) {
        case ApiItemKind.Class:
          classesTable.addRow(row);
          this._writeApiItemPage(apiMember);
          break;

        case ApiItemKind.Enum:
          enumerationsTable.addRow(row);
          enumsDefinitions.push(
            ...this._createCompleteOutputForApiItem(apiMember)
          );
          break;

        case ApiItemKind.Interface:
          interfacesTable.addRow(row);
          this._writeApiItemPage(apiMember);
          break;

        case ApiItemKind.Namespace:
          namespacesTable.addRow(row);
          this._writeApiItemPage(apiMember);
          break;

        case ApiItemKind.Function:
          /**
           * If this option is set, group functions by first param.
           * Organize using a map where the key is the first param.
           */
          if (this._sortFunctions) {
            const firstParam = (apiMember as ApiParameterListMixin)
              .parameters[0] || { name: '' };
            if (!functionsRowGroup[firstParam.name]) {
              functionsRowGroup[firstParam.name] = [];
            }
            if (!functionsDefinitionsGroup[firstParam.name]) {
              functionsDefinitionsGroup[firstParam.name] = [];
            }
            functionsRowGroup[firstParam.name].push(row);
            functionsDefinitionsGroup[firstParam.name].push(
              ...this._createCompleteOutputForApiItem(apiMember)
            );
          } else {
            finalFunctionsTable.addRow(row);
            finalFunctionsDefinitions.push(
              ...this._createCompleteOutputForApiItem(apiMember)
            );
          }
          break;

        case ApiItemKind.TypeAlias:
          typeAliasesTable.addRow(row);
          typeAliasDefinitions.push(
            ...this._createCompleteOutputForApiItem(apiMember)
          );
          break;

        case ApiItemKind.Variable:
          variablesTable.addRow(row);
          variablesDefinitions.push(
            ...this._createCompleteOutputForApiItem(apiMember)
          );
          break;
      }
    }

    /**
     * Sort the functions groups by first param. If priority params were
     * provided to --sort-functions, will put them first in the order
     * given.
     */
    if (this._sortFunctions) {
      let priorityParams: string[] = [];
      if (this._sortFunctions.includes(',')) {
        priorityParams = this._sortFunctions.split(',');
      } else {
        priorityParams = [this._sortFunctions];
      }
      const sortedFunctionsFirstParamKeys = Object.keys(functionsRowGroup).sort(
        (a, b) => {
          if (priorityParams.includes(a) && priorityParams.includes(b)) {
            return priorityParams.indexOf(a) - priorityParams.indexOf(b);
          } else if (priorityParams.includes(a)) {
            return -1;
          } else if (priorityParams.includes(b)) {
            return 1;
          }
          return a.localeCompare(b);
        }
      );

      for (const paramKey of sortedFunctionsFirstParamKeys) {
        // Header for each group of functions grouped by first param.
        // Doesn't make sense if there's only one group.
        const headerText = paramKey
          ? `function(${paramKey}, ...)`
          : 'function()';
        if (sortedFunctionsFirstParamKeys.length > 1) {
          finalFunctionsTable.addRow(
            new DocTableRow({ configuration }, [
              new DocTableCell({ configuration }, [
                new DocParagraph({ configuration }, [
                  new DocEmphasisSpan({ configuration, bold: true }, [
                    new DocPlainText({ configuration, text: headerText })
                  ])
                ])
              ])
            ])
          );
        }
        for (const functionsRow of functionsRowGroup[paramKey]) {
          finalFunctionsTable.addRow(functionsRow);
        }

        // Create a heading that groups functions by the first param
        finalFunctionsDefinitions.push(
          new DocHeading({
            configuration,
            title: headerText
          })
        );

        for (const functionDefinition of functionsDefinitionsGroup[paramKey]) {
          // const originalDocHeading = functionDefinition as DocHeading;

          // // Increase the doc heading level so that this is a sub-section
          // // of the function grouping heading
          // const newDocHeading = new DocHeading({
          //   configuration: originalDocHeading.configuration,
          //   title: originalDocHeading.title,
          //   level: originalDocHeading.level + 1,
          //   anchor: originalDocHeading.anchor
          // })
          // finalFunctionsDefinitions.push(newDocHeading);
          finalFunctionsDefinitions.push(functionDefinition);
        }
      }
    }

    if (finalFunctionsTable.rows.length > 0) {
      output.push(new DocHeading({ configuration, title: 'Functions' }));
      output.push(finalFunctionsTable);
    }

    if (classesTable.rows.length > 0) {
      output.push(new DocHeading({ configuration, title: 'Classes' }));
      output.push(classesTable);
    }

    if (enumerationsTable.rows.length > 0) {
      output.push(new DocHeading({ configuration, title: 'Enumerations' }));
      output.push(enumerationsTable);
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

    if (finalFunctionsDefinitions.length > 0) {
      output.push(...finalFunctionsDefinitions);
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

  private _createPropertyTypeCell(apiItem: ApiItem): DocTableCell {
    const section: DocSection = new DocSection({
      configuration: this._tsdocConfiguration
    });

    if (apiItem instanceof ApiPropertyItem) {
      section.appendNode(
        this._createParagraphForTypeExcerpt(apiItem.propertyTypeExcerpt)
      );
    }

    return new DocTableCell(
      { configuration: this._tsdocConfiguration },
      section.nodes
    );
  }

  private _createSignatureSection(apiItem: ApiDeclaredItem): DocNode[] {
    const configuration = this._tsdocConfiguration;
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

    nodes.push(...this._writeHeritageTypes(apiItem));
    return nodes;
  }

  private _writeHeritageTypes(apiItem: ApiDeclaredItem): DocNode[] {
    const configuration = this._tsdocConfiguration;
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
        this._appendExcerptWithHyperlinks(
          extendsParagraph,
          apiItem.extendsType.excerpt
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
          this._appendExcerptWithHyperlinks(
            implementsParagraph,
            implementsType.excerpt
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
          this._appendExcerptWithHyperlinks(
            extendsParagraph,
            extendsType.excerpt
          );
          needsComma = true;
        }
        nodes.push(extendsParagraph);
      }
    }

    return nodes;
  }

  private _deleteOldOutputFiles(): void {
    console.log('Deleting old output from ' + this._outputFolder);
    FileSystem.ensureEmptyFolder(this._outputFolder);
  }
}
