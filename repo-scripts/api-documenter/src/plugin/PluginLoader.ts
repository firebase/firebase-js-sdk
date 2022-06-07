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
import * as resolve from 'resolve';

import {
  IApiDocumenterPluginManifest,
  IFeatureDefinition
} from './IApiDocumenterPluginManifest';
import {
  MarkdownDocumenterFeature,
  MarkdownDocumenterFeatureContext
} from './MarkdownDocumenterFeature';
import { PluginFeatureInitialization } from './PluginFeature';
import { DocumenterConfig } from '../documenters/DocumenterConfig';

interface ILoadedPlugin {
  packageName: string;
  manifest: IApiDocumenterPluginManifest;
}

export class PluginLoader {
  public markdownDocumenterFeature: MarkdownDocumenterFeature | undefined;

  public load(
    documenterConfig: DocumenterConfig,
    createContext: () => MarkdownDocumenterFeatureContext
  ): void {
    const configFileFolder: string = path.dirname(
      documenterConfig.configFilePath
    );
    for (const configPlugin of documenterConfig.configFile.plugins || []) {
      try {
        // Look for the package name in the same place as the config file
        const resolvedEntryPointPath: string = resolve.sync(
          configPlugin.packageName,
          {
            basedir: configFileFolder
          }
        );

        // Load the package
        const entryPoint:
          | { apiDocumenterPluginManifest?: IApiDocumenterPluginManifest }
          | undefined = require(resolvedEntryPointPath);

        if (!entryPoint) {
          throw new Error('Invalid entry point');
        }

        if (!entryPoint.apiDocumenterPluginManifest) {
          throw new Error(
            `The package is not an API documenter plugin;` +
              ` the "apiDocumenterPluginManifest" export was not found`
          );
        }

        const manifest: IApiDocumenterPluginManifest =
          entryPoint.apiDocumenterPluginManifest;

        if (manifest.manifestVersion !== 1000) {
          throw new Error(
            `The plugin is not compatible with this version of API Documenter;` +
              ` unsupported manifestVersion`
          );
        }

        const loadedPlugin: ILoadedPlugin = {
          packageName: configPlugin.packageName,
          manifest
        };

        const featureDefinitionsByName: Map<string, IFeatureDefinition> =
          new Map<string, IFeatureDefinition>();
        for (const featureDefinition of manifest.features) {
          featureDefinitionsByName.set(
            featureDefinition.featureName,
            featureDefinition
          );
        }

        for (const featureName of configPlugin.enabledFeatureNames) {
          const featureDefinition: IFeatureDefinition | undefined =
            featureDefinitionsByName.get(featureName);
          if (!featureDefinition) {
            throw new Error(
              `The plugin ${loadedPlugin.packageName} does not have a feature with name "${featureName}"`
            );
          }

          if (featureDefinition.kind === 'MarkdownDocumenterFeature') {
            if (this.markdownDocumenterFeature) {
              throw new Error('A MarkdownDocumenterFeature is already loaded');
            }

            const initialization: PluginFeatureInitialization =
              new PluginFeatureInitialization();
            initialization._context = createContext();

            let markdownDocumenterFeature:
              | MarkdownDocumenterFeature
              | undefined = undefined;
            try {
              markdownDocumenterFeature = new featureDefinition.subclass(
                initialization
              );
            } catch (e) {
              throw new Error(
                `Failed to construct feature subclass:\n` +
                  (e as Error)?.toString()
              );
            }
            if (
              !(markdownDocumenterFeature instanceof MarkdownDocumenterFeature)
            ) {
              throw new Error(
                'The constructed subclass was not an instance of MarkdownDocumenterFeature'
              );
            }

            try {
              markdownDocumenterFeature.onInitialized();
            } catch (e) {
              throw new Error(
                'Error occurred during the onInitialized() event: ' +
                  (e as Error)?.toString()
              );
            }

            this.markdownDocumenterFeature = markdownDocumenterFeature;
          } else {
            throw new Error(
              `Unknown feature definition kind: "${featureDefinition.kind}"`
            );
          }
        }
      } catch (e) {
        throw new Error(
          `Error loading plugin ${configPlugin.packageName}: ` +
            (e as Error)?.message
        );
      }
    }
  }
}
