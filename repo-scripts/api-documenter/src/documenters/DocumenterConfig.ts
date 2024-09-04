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
import {
  JsonSchema,
  JsonFile,
  NewlineKind
} from '@rushstack/node-core-library';
import { IConfigFile } from './IConfigFile';

/**
 * Helper for loading the api-documenter.json file format.  Later when the schema is more mature,
 * this class will be used to represent the validated and normalized configuration, whereas `IConfigFile`
 * represents the raw JSON file structure.
 */
export class DocumenterConfig {
  public readonly configFilePath: string;
  public readonly configFile: IConfigFile;

  /**
   * Specifies what type of newlines API Documenter should use when writing output files.  By default, the output files
   * will be written with Windows-style newlines.
   */
  public readonly newlineKind: NewlineKind;

  /**
   * The JSON Schema for API Extractor config file (api-extractor.schema.json).
   */
  public static readonly jsonSchema: JsonSchema = JsonSchema.fromFile(
    path.join(__dirname, '..', 'schemas', 'api-documenter.schema.json')
  );

  /**
   * The config file name "api-extractor.json".
   */
  public static readonly FILENAME: string = 'api-documenter.json';

  private constructor(filePath: string, configFile: IConfigFile) {
    this.configFilePath = filePath;
    this.configFile = configFile;

    switch (configFile.newlineKind) {
      case 'lf':
        this.newlineKind = NewlineKind.Lf;
        break;
      case 'os':
        this.newlineKind = NewlineKind.OsDefault;
        break;
      default:
        this.newlineKind = NewlineKind.CrLf;
        break;
    }
  }

  /**
   * Load and validate an api-documenter.json file.
   */
  public static loadFile(configFilePath: string): DocumenterConfig {
    const configFile: IConfigFile = JsonFile.loadAndValidate(
      configFilePath,
      DocumenterConfig.jsonSchema
    );

    return new DocumenterConfig(path.resolve(configFilePath), configFile);
  }
}
