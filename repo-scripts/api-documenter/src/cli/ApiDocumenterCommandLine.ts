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

import { CommandLineParser } from '@rushstack/ts-command-line';
import { MarkdownAction } from './MarkdownAction';
import { TocAction } from './TocAction';

export class ApiDocumenterCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: 'api-documenter',
      toolDescription:
        'Reads *.api.json files produced by api-extractor, ' +
        ' and generates API documentation in various output formats.'
    });
    this._populateActions();
  }

  protected onDefineParameters(): void {
    // override
    // No parameters
  }

  private _populateActions(): void {
    this.addAction(new MarkdownAction(this));
    this.addAction(new TocAction(this));
  }
}
