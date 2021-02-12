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

import { ApiDocumenterCommandLine } from './ApiDocumenterCommandLine';
import { BaseAction } from './BaseAction';
import { DocumenterConfig } from '../documenters/DocumenterConfig';
import { ExperimentalYamlDocumenter } from '../documenters/ExperimentalYamlDocumenter';

import { ApiModel } from 'api-extractor-model-me';
import { FileSystem } from '@rushstack/node-core-library';
import { MarkdownDocumenter } from '../documenters/MarkdownDocumenter';

export class GenerateAction extends BaseAction {
  public constructor(parser: ApiDocumenterCommandLine) {
    super({
      actionName: 'generate',
      summary: 'EXPERIMENTAL',
      documentation:
        'EXPERIMENTAL - This action is a prototype of a new config file driven mode of operation for' +
        ' API Documenter.  It is not ready for general usage yet.  Its design may change in the future.'
    });
  }

  protected onExecute(): Promise<void> {
    // override
    // Look for the config file under the current folder

    let configFilePath: string = path.join(
      process.cwd(),
      DocumenterConfig.FILENAME
    );

    // First try the current folder
    if (!FileSystem.exists(configFilePath)) {
      // Otherwise try the standard "config" subfolder
      configFilePath = path.join(
        process.cwd(),
        'config',
        DocumenterConfig.FILENAME
      );
      if (!FileSystem.exists(configFilePath)) {
        throw new Error(
          `Unable to find ${DocumenterConfig.FILENAME} in the current folder or in a "config" subfolder`
        );
      }
    }

    const documenterConfig: DocumenterConfig = DocumenterConfig.loadFile(
      configFilePath
    );

    const apiModel: ApiModel = this.buildApiModel();

    if (documenterConfig.configFile.outputTarget === 'markdown') {
      const markdownDocumenter: MarkdownDocumenter = new MarkdownDocumenter(
        apiModel,
        documenterConfig
      );
      markdownDocumenter.generateFiles(this.outputFolder);
    } else {
      const yamlDocumenter: ExperimentalYamlDocumenter = new ExperimentalYamlDocumenter(
        apiModel,
        documenterConfig
      );
      yamlDocumenter.generateFiles(this.outputFolder);
    }

    return Promise.resolve();
  }
}
