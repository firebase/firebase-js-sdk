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

/**
 * API Documenter generates an API reference website from the .api.json files created by API Extractor.
 * The `@microsoft/api-documenter` package provides the command-line tool.  It also exposes a developer API that you
 * can use to create plugins that customize how API Documenter generates documentation.
 *
 * @packageDocumentation
 */

export {
  IFeatureDefinition,
  IApiDocumenterPluginManifest
} from './plugin/IApiDocumenterPluginManifest';
export { MarkdownDocumenterAccessor } from './plugin/MarkdownDocumenterAccessor';
export {
  MarkdownDocumenterFeatureContext,
  IMarkdownDocumenterFeatureOnBeforeWritePageArgs,
  IMarkdownDocumenterFeatureOnFinishedArgs,
  MarkdownDocumenterFeature
} from './plugin/MarkdownDocumenterFeature';
export {
  PluginFeature,
  PluginFeatureContext,
  PluginFeatureInitialization
} from './plugin/PluginFeature';
