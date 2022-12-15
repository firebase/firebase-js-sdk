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

import { ApiDocumenterCommandLine } from './ApiDocumenterCommandLine';
import { BaseAction } from './BaseAction';
import { MarkdownDocumenter } from '../documenters/MarkdownDocumenter';
import { CommandLineStringParameter } from '@rushstack/ts-command-line';

export class MarkdownAction extends BaseAction {
  private _sortFunctions!: CommandLineStringParameter;
  public constructor(parser: ApiDocumenterCommandLine) {
    super({
      actionName: 'markdown',
      summary: 'Generate documentation as Markdown files (*.md)',
      documentation:
        'Generates API documentation as a collection of files in' +
        ' Markdown format, suitable for example for publishing on a GitHub site.'
    });
  }

  protected onDefineParameters(): void {
    super.onDefineParameters();

    this._sortFunctions = this.defineStringParameter({
      parameterLongName: '--sort-functions',
      argumentName: 'PRIORITY_PARAMS',
      description:
        `Sorts functions tables and listings by first parameter. ` +
        `Provide comma-separated strings for preferred params to be ` +
        `ordered first. Alphabetical otherwise.`
    });
  }

  protected async onExecute(): Promise<void> {
    // override
    const { apiModel, outputFolder, addFileNameSuffix, projectName } =
      this.buildApiModel();
    const sortFunctions: string = this._sortFunctions.value || '';

    if (!projectName) {
      throw new Error('No project name provided. Use --project.');
    }

    const markdownDocumenter: MarkdownDocumenter = new MarkdownDocumenter({
      apiModel,
      documenterConfig: undefined,
      outputFolder,
      addFileNameSuffix,
      projectName,
      sortFunctions
    });
    markdownDocumenter.generateFiles();
  }
}
