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
  DocNodeKind,
  DocDeclarationReference,
  DocMemberReference
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
  ApiEnum,
  ApiModel,
  IResolveDeclarationReferenceResult
} from '@microsoft/api-extractor-model';
import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { DocEmphasisSpan } from '../nodes/DocEmphasisSpan';
import { DocHeading } from '../nodes/DocHeading';
import { DocTable } from '../nodes/DocTable';
import { Utilities } from '../utils/Utilities';
import { PackageName } from '@rushstack/node-core-library';
import { DocNoteBox } from '../nodes/DocNoteBox';
import { DocTableRow } from '../nodes/DocTableRow';
import { DocTableCell } from '../nodes/DocTableCell';
import { createHash } from 'crypto';

/**
 * Metadata describing a subpackage and its relationship to its parent package.
 */
export interface ISubpackageInfo {
  /**
   * The dash-separated npm package name used in the ApiModel (e.g. '@firebase/firestore-lite').
   */
  npmPackageName: string;
  /**
   * The slash-separated canonical package name (e.g. '@firebase/firestore/lite').
   */
  canonicalName: string;
  /**
   * The parent package name (e.g. '@firebase/firestore').
   */
  parentPackageName: string;
  /**
   * The relative export subpath within the parent package (e.g. 'lite' or 'lite/pipelines').
   */
  subpath: string;
}

/**
 * Parses `--subpackage <npmPackageName>=<canonicalName>` CLI flag entries into
 * a map of subpackage metadata keyed by both full package name and unscoped name.
 */
export function parseSubpackageMapping(
  entries: readonly string[]
): Map<string, ISubpackageInfo> {
  const subpackages = new Map<string, ISubpackageInfo>();
  for (const entry of entries) {
    const [npmPackageName, canonicalName] = entry.split('=');
    if (!npmPackageName || !canonicalName) continue;
    let parentPackageName: string;
    let subpath: string;
    if (canonicalName.startsWith('@')) {
      const parts = canonicalName.split('/');
      parentPackageName = `${parts[0]}/${parts[1]}`;
      subpath = parts.slice(2).join('/');
    } else {
      const parts = canonicalName.split('/');
      parentPackageName = parts[0];
      subpath = parts.slice(1).join('/');
    }
    const info: ISubpackageInfo = {
      npmPackageName: npmPackageName.trim(),
      canonicalName: canonicalName.trim(),
      parentPackageName,
      subpath
    };
    subpackages.set(npmPackageName.trim(), info);
    subpackages.set(PackageName.getUnscopedName(npmPackageName.trim()), info);
  }
  return subpackages;
}

/**
 * Returns the subpackage metadata for an ApiPackage if it is registered in the subpackages map.
 */
export function getSubpackageInfo(
  pkg: ApiPackage,
  subpackages?: Map<string, ISubpackageInfo>
): ISubpackageInfo | undefined {
  if (!subpackages) return undefined;
  return (
    subpackages.get(pkg.displayName) ||
    subpackages.get(PackageName.getUnscopedName(pkg.displayName))
  );
}

/**
 * Collects candidate packages from the ApiModel, prioritizing packages that share
 * a common prefix with the contextual package.
 */
function getCandidatePackages(
  apiModel: ApiModel,
  contextPkg?: ApiPackage
): ApiPackage[] {
  const prefix = contextPkg?.displayName.split(/[-/]/)[0];
  const relatedPackages = prefix
    ? apiModel.packages.filter(
        apiPackage =>
          apiPackage !== contextPkg && apiPackage.displayName.startsWith(prefix)
      )
    : [];
  const remainingPackages = apiModel.packages.filter(
    apiPackage =>
      apiPackage !== contextPkg && !relatedPackages.includes(apiPackage)
  );
  return [...relatedPackages, ...remainingPackages];
}

export function resolveDeclarationReferenceWithAliases(
  apiModel: ApiModel,
  declarationReference: DocDeclarationReference | DeclarationReference,
  contextApiItem: ApiItem | undefined
): IResolveDeclarationReferenceResult {
  // Step 1: Perform the standard resolution attempt using ApiModel.
  let result: IResolveDeclarationReferenceResult =
    apiModel.resolveDeclarationReference(declarationReference, contextApiItem);

  // If initial resolution failed, search across candidate packages.
  if (!result.resolvedApiItem && declarationReference) {
    const contextPkg = contextApiItem
      ?.getHierarchy()
      ?.find(item => item.kind === ApiItemKind.Package) as
      ApiPackage | undefined;

    const candidatePackages = getCandidatePackages(apiModel, contextPkg);

    if (declarationReference instanceof DocDeclarationReference) {
      for (const candidatePackage of candidatePackages) {
        const candidateDocRef = new DocDeclarationReference({
          configuration: declarationReference.configuration,
          packageName: candidatePackage.displayName,
          memberReferences:
            declarationReference.memberReferences as DocMemberReference[]
        });
        const retry = apiModel.resolveDeclarationReference(
          candidateDocRef,
          candidatePackage
        );
        if (retry.resolvedApiItem) {
          result = retry;
          break;
        }
      }
    } else if (declarationReference instanceof DeclarationReference) {
      // Strip local/unexported scope '~' prefix (e.g. '~Bytes:class' -> 'Bytes:class')
      // so the member can be matched as an exported declaration in other packages.
      const rawStr = declarationReference.toString();
      const memberPart = rawStr.includes('!')
        ? rawStr.split('!')[1].replace(/^~/, '')
        : rawStr.replace(/^~/, '');

      for (const candidatePackage of candidatePackages) {
        try {
          const candidateRef = DeclarationReference.parse(
            `${candidatePackage.displayName}!${memberPart}`
          );
          const retry = apiModel.resolveDeclarationReference(
            candidateRef,
            candidatePackage
          );
          if (retry.resolvedApiItem) {
            result = retry;
            break;
          }
        } catch {
          // Ignore parse errors for unparseable references
        }
      }
    }
  }

  return result;
}

export function getLinkForApiItem(
  apiItem: ApiItem,
  addFileNameSuffix: boolean,
  subpackages?: Map<string, ISubpackageInfo>
) {
  const fileName = getFilenameForApiItem(
    apiItem,
    addFileNameSuffix,
    subpackages
  );
  const headingAnchor = getHeadingAnchorForApiItem(apiItem);
  return `./${fileName}#${headingAnchor}`;
}

export function getFilenameForApiItem(
  apiItem: ApiItem,
  addFileNameSuffix: boolean,
  subpackages?: Map<string, ISubpackageInfo>
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
        const entryInfo = getSubpackageInfo(
          hierarchyItem.parent as ApiPackage,
          subpackages
        );
        if (entryInfo) {
          const parentUnscoped = PackageName.getUnscopedName(
            entryInfo.parentPackageName
          );
          entryPointName = `${parentUnscoped}_${entryInfo.subpath.replace(/\//g, '_')}`;
        }
        baseName = Utilities.getSafeFilenameForName(entryPointName);
        break;
      case ApiItemKind.Package:
        let pkgName = PackageName.getUnscopedName(hierarchyItem.displayName);
        const pkgInfo = getSubpackageInfo(
          hierarchyItem as ApiPackage,
          subpackages
        );
        if (pkgInfo) {
          const parentUnscoped = PackageName.getUnscopedName(
            pkgInfo.parentPackageName
          );
          pkgName = `${parentUnscoped}_${pkgInfo.subpath.replace(/\//g, '_')}`;
        }
        baseName = Utilities.getSafeFilenameForName(pkgName);
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

// TODO: handle namespace?
export function getHeadingAnchorForApiItem(apiItem: ApiItem): string {
  const scopedName: string = lowercaseAndRemoveSymbols(
    apiItem.getScopedNameWithinPackage()
  );

  switch (apiItem.kind) {
    case ApiItemKind.Function:
      return lowercaseAndRemoveSymbols(getFunctionOverloadAnchor(apiItem));
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

/**
 * Generates a unique link for a function.  Example: "getArea_paramhashhere"
 */
function getFunctionOverloadAnchor(apiItem: ApiItem): string {
  if (
    ApiParameterListMixin.isBaseClassOf(apiItem) &&
    apiItem.parameters.length > 0
  ) {
    // Create a sha256 hash from the parameter names and types.
    const hash = createHash('sha256');
    apiItem.parameters.forEach(param =>
      hash.update(`${param.name}:${param.parameterTypeExcerpt.text}`)
    );
    // Use the first 7 characters of the hash for an easier to read URL.
    const paramHash = hash.digest('hex').substring(0, 7);

    // Suffix the API item name with the paramHash to generate a unique
    // anchor for function overloads
    return apiItem.getScopedNameWithinPackage() + '_' + paramHash;
  }
  return apiItem.getScopedNameWithinPackage();
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
  addFileNameSuffix: boolean,
  subpackages?: Map<string, ISubpackageInfo>
): DocTableCell {
  let linkText: string = Utilities.getConciseSignature(apiItem);
  if (apiItem.kind === ApiItemKind.Package) {
    const info = getSubpackageInfo(apiItem as ApiPackage, subpackages);
    if (info) {
      linkText = info.canonicalName;
    }
  }

  return new DocTableCell({ configuration }, [
    new DocParagraph({ configuration }, [
      new DocLinkTag({
        configuration,
        tagName: '@link',
        linkText,
        urlDestination: getLinkForApiItem(
          apiItem,
          addFileNameSuffix,
          subpackages
        )
      })
    ])
  ]);
}

/**
 * This generates a DocTableCell for an ApiItem. This includes the summary section, and release
 * annotations for public preview APIs.
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
          new DocPlainText({ configuration, text: '(Public Preview)' })
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
  configuration: TSDocConfiguration,
  parentHeadingLevel: number
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
        output.push(
          new DocHeading({
            configuration,
            title: heading,
            level: parentHeadingLevel + 1
          })
        );

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
  addFileNameSuffix: boolean,
  subpackages?: Map<string, ISubpackageInfo>
): DocTableCell {
  return new DocTableCell({ configuration }, [
    new DocParagraph({ configuration }, [
      new DocLinkTag({
        configuration,
        tagName: '@link',
        linkText: `/${apiItem.displayName}`,
        urlDestination: getLinkForApiItem(
          apiItem,
          addFileNameSuffix,
          subpackages
        )
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
              code: apiEnumMember.initializerExcerpt?.text ?? ''
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
