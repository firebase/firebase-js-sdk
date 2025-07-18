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

import * as path from 'path';
import * as tsdoc from '@microsoft/tsdoc';
import colors from 'colors';

import {
  CommandLineAction,
  CommandLineFlagParameter,
  CommandLineStringParameter
} from '@rushstack/ts-command-line';
import { FileSystem } from '@rushstack/node-core-library';
import {
  ApiModel,
  ApiItem,
  ApiItemContainerMixin,
  ApiDocumentedItem,
  IResolveDeclarationReferenceResult
} from 'api-extractor-model-me';

export interface IBuildApiModelResult {
  apiModel: ApiModel;
  inputFolder: string;
  outputFolder: string;
  addFileNameSuffix: boolean;
  projectName?: string;
}

export abstract class BaseAction extends CommandLineAction {
  private _inputFolderParameter!: CommandLineStringParameter;
  private _outputFolderParameter!: CommandLineStringParameter;
  private _fileNameSuffixParameter!: CommandLineFlagParameter;
  private _projectNameParameter!: CommandLineStringParameter;

  protected onDefineParameters(): void {
    // override
    this._inputFolderParameter = this.defineStringParameter({
      parameterLongName: '--input-folder',
      parameterShortName: '-i',
      argumentName: 'FOLDER1',
      description:
        `Specifies the input folder containing the *.api.json files to be processed.` +
        ` If omitted, the default is "./input"`
    });

    this._outputFolderParameter = this.defineStringParameter({
      parameterLongName: '--output-folder',
      parameterShortName: '-o',
      argumentName: 'FOLDER2',
      description:
        `Specifies the output folder where the documentation will be written.` +
        ` ANY EXISTING CONTENTS WILL BE DELETED!` +
        ` If omitted, the default is "./${this.actionName}"`
    });

    this._fileNameSuffixParameter = this.defineFlagParameter({
      parameterLongName: '--name-suffix',
      parameterShortName: '-s',
      description:
        `Add suffix to interface and class names in the file path.` +
        `For example, packageA.myinterface_i.md for MyInterface interface, ` +
        `Add packageA.myclass_c.md for MyClass class.` +
        `This is to avoid name conflict in case packageA also has, for example, an entry point with the same name in lowercase.` +
        `This option is specifically designed for the Admin SDK where such case occurs.`
    });

    this._projectNameParameter = this.defineStringParameter({
      parameterLongName: '--project',
      argumentName: 'PROJECT',
      description:
        `Name of the project (js, admin, functions, etc.). This will be ` +
        `used in the devsite header path to the _project.yaml file.`
    });
  }

  protected buildApiModel(): IBuildApiModelResult {
    const apiModel: ApiModel = new ApiModel();

    const inputFolder: string = this._inputFolderParameter.value || './input';
    if (!FileSystem.exists(inputFolder)) {
      throw new Error('The input folder does not exist: ' + inputFolder);
    }

    const outputFolder: string =
      this._outputFolderParameter.value || `./${this.actionName}`;
    FileSystem.ensureFolder(outputFolder);

    const addFileNameSuffix: boolean = this._fileNameSuffixParameter.value;

    for (const file of FileSystem.readFolderItems(inputFolder)) {
      if (!file.isFile()) continue;
      const filename = file.name;
      if (filename.match(/\.api\.json$/i)) {
        console.log(`Reading ${filename}`);
        const filenamePath: string = path.join(inputFolder, filename);
        apiModel.loadPackage(filenamePath);
      }
    }

    this._applyInheritDoc(apiModel, apiModel);

    return {
      apiModel,
      inputFolder,
      outputFolder,
      addFileNameSuffix,
      projectName: this._projectNameParameter.value
    };
  }

  // TODO: This is a temporary workaround.  The long term plan is for API Extractor's DocCommentEnhancer
  // to apply all @inheritDoc tags before the .api.json file is written.
  // See DocCommentEnhancer._applyInheritDoc() for more info.
  private _applyInheritDoc(apiItem: ApiItem, apiModel: ApiModel): void {
    if (apiItem instanceof ApiDocumentedItem) {
      if (apiItem.tsdocComment) {
        const inheritDocTag: tsdoc.DocInheritDocTag | undefined =
          apiItem.tsdocComment.inheritDocTag;

        if (inheritDocTag && inheritDocTag.declarationReference) {
          // Attempt to resolve the declaration reference
          const result: IResolveDeclarationReferenceResult =
            apiModel.resolveDeclarationReference(
              inheritDocTag.declarationReference,
              apiItem
            );

          if (result.errorMessage) {
            console.log(
              colors.yellow(
                `Warning: Unresolved @inheritDoc tag for ${apiItem.displayName}: ` +
                  result.errorMessage
              )
            );
          } else {
            if (
              result.resolvedApiItem instanceof ApiDocumentedItem &&
              result.resolvedApiItem.tsdocComment &&
              result.resolvedApiItem !== apiItem
            ) {
              this._copyInheritedDocs(
                apiItem.tsdocComment,
                result.resolvedApiItem.tsdocComment
              );
            }
          }
        }
      }
    }

    // Recurse members
    if (ApiItemContainerMixin.isBaseClassOf(apiItem)) {
      for (const member of apiItem.members) {
        this._applyInheritDoc(member, apiModel);
      }
    }
  }

  /**
   * Copy the content from `sourceDocComment` to `targetDocComment`.
   * This code is borrowed from DocCommentEnhancer as a temporary workaround.
   */
  private _copyInheritedDocs(
    targetDocComment: tsdoc.DocComment,
    sourceDocComment: tsdoc.DocComment
  ): void {
    targetDocComment.summarySection = sourceDocComment.summarySection;
    targetDocComment.remarksBlock = sourceDocComment.remarksBlock;

    targetDocComment.params.clear();
    for (const param of sourceDocComment.params) {
      targetDocComment.params.add(param);
    }
    for (const typeParam of sourceDocComment.typeParams) {
      targetDocComment.typeParams.add(typeParam);
    }
    targetDocComment.returnsBlock = sourceDocComment.returnsBlock;

    targetDocComment.inheritDocTag = undefined;
  }
}
