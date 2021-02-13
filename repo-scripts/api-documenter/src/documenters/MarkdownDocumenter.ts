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

import { FileSystem } from '@rushstack/node-core-library';
import { TSDocConfiguration } from '@microsoft/tsdoc';
import { ApiModel, ApiItem } from 'api-extractor-model-me';

import { CustomDocNodes } from '../nodes/CustomDocNodeKind';
import { CustomMarkdownEmitter } from '../markdown/CustomMarkdownEmitter';
import { PluginLoader } from '../plugin/PluginLoader';
import { MarkdownDocumenterFeatureContext } from '../plugin/MarkdownDocumenterFeature';
import { DocumenterConfig } from './DocumenterConfig';
import { MarkdownDocumenterAccessor } from '../plugin/MarkdownDocumenterAccessor';
import {
  getLinkForApiItem,
  writeApiItemPage
} from './MarkdownDocumenterHelpers';

/**
 * Renders API documentation in the Markdown file format.
 * For more info:  https://en.wikipedia.org/wiki/Markdown
 */
export class MarkdownDocumenter {
  private readonly _apiModel: ApiModel;
  private readonly _documenterConfig: DocumenterConfig | undefined;
  private readonly _tsdocConfiguration: TSDocConfiguration;
  private readonly _markdownEmitter: CustomMarkdownEmitter;
  private _outputFolder!: string;
  private readonly _pluginLoader: PluginLoader;

  public constructor(
    apiModel: ApiModel,
    documenterConfig: DocumenterConfig | undefined
  ) {
    this._apiModel = apiModel;
    this._documenterConfig = documenterConfig;
    this._tsdocConfiguration = CustomDocNodes.configuration;
    this._markdownEmitter = new CustomMarkdownEmitter(this._apiModel);

    this._pluginLoader = new PluginLoader();
  }

  public generateFiles(outputFolder: string): void {
    this._outputFolder = outputFolder;

    if (this._documenterConfig) {
      this._pluginLoader.load(this._documenterConfig, () => {
        return new MarkdownDocumenterFeatureContext({
          apiModel: this._apiModel,
          outputFolder: outputFolder,
          documenter: new MarkdownDocumenterAccessor({
            getLinkForApiItem: (apiItem: ApiItem) => {
              return getLinkForApiItem(apiItem);
            }
          })
        });
      });
    }

    console.log();
    this._deleteOldOutputFiles();

    writeApiItemPage(
      this._apiModel,
      this._apiModel,
      this._tsdocConfiguration,
      this._outputFolder,
      this._markdownEmitter,
      this._pluginLoader,
      this._documenterConfig
    );

    if (this._pluginLoader.markdownDocumenterFeature) {
      this._pluginLoader.markdownDocumenterFeature.onFinished({});
    }
  }

  private _deleteOldOutputFiles(): void {
    console.log('Deleting old output from ' + this._outputFolder);
    FileSystem.ensureEmptyFolder(this._outputFolder);
  }
}
