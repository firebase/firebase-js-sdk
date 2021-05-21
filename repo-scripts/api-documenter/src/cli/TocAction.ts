/**
 * @license
 * Copyright 2021 Google LLC
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

import { CommandLineStringParameter } from '@rushstack/ts-command-line';
import { ApiDocumenterCommandLine } from './ApiDocumenterCommandLine';
import { BaseAction } from './BaseAction';
import { generateToc } from '../toc';

export class TocAction extends BaseAction {
  private _g3PathParameter!: CommandLineStringParameter;
  public constructor(parser: ApiDocumenterCommandLine) {
    super({
      actionName: 'toc',
      summary: 'Generate documentation as Markdown files (*.md)',
      documentation:
        'Generates API documentation as a collection of files in' +
        ' Markdown format, suitable for example for publishing on a GitHub site.'
    });
  }

  protected onDefineParameters(): void {
    super.onDefineParameters();

    this._g3PathParameter = this.defineStringParameter({
      parameterLongName: '--g3-path',
      parameterShortName: '-p',
      argumentName: 'G3PREFIX',
      description: `Specifies the path where the reference docs will be written to in g3.
                Used to generate paths in the toc`
    });
  }

  protected async onExecute(): Promise<void> {
    // override
    const { apiModel, outputFolder, addFileNameSuffix } = this.buildApiModel();
    const g3Path: string | undefined = this._g3PathParameter.value;

    if (!g3Path) {
      throw new Error(
        '--g3-path is a required to generate toc, but it is not provided'
      );
    }

    generateToc({
      apiModel,
      outputFolder,
      addFileNameSuffix,
      g3Path
    });
  }
}
