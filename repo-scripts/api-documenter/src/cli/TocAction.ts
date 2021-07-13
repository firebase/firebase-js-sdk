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

import {
  CommandLineFlagParameter,
  CommandLineStringParameter
} from '@rushstack/ts-command-line';
import { ApiDocumenterCommandLine } from './ApiDocumenterCommandLine';
import { BaseAction } from './BaseAction';
import { generateToc } from '../toc';

export class TocAction extends BaseAction {
  private _g3PathParameter!: CommandLineStringParameter;
  private _jsSDKParameter!: CommandLineFlagParameter;
  public constructor(parser: ApiDocumenterCommandLine) {
    super({
      actionName: 'toc',
      summary: 'Generate TOC(table of content) for Firebase devsite.',
      documentation: 'Generate TOC(table of content) for Firebase devsite.'
    });
  }

  protected onDefineParameters(): void {
    super.onDefineParameters();

    this._g3PathParameter = this.defineStringParameter({
      parameterLongName: '--host-path',
      parameterShortName: '-p',
      argumentName: 'HOSTPATH',
      description: `Specifies the path where the reference docs resides (e.g. g3).
                Used to generate paths in the toc`
    });

    this._jsSDKParameter = this.defineFlagParameter({
      parameterLongName: '--js-sdk',
      parameterShortName: '-j',
      description:
        `Generating toc for the Firebase JS SDK.` +
        `It will create an artificial top level toc item "firebase".`
    });
  }

  protected async onExecute(): Promise<void> {
    // override
    const { apiModel, outputFolder, addFileNameSuffix } = this.buildApiModel();
    const g3Path: string | undefined = this._g3PathParameter.value;
    const jsSdk: boolean = this._jsSDKParameter.value;

    if (!g3Path) {
      throw new Error(
        '--g3-path is a required to generate toc, but it is not provided'
      );
    }

    generateToc({
      apiModel,
      outputFolder,
      addFileNameSuffix,
      g3Path,
      jsSdk
    });
  }
}
