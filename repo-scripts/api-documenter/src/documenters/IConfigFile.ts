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

/**
 * Describes plugin packages to be loaded, and which features to enable.
 */
export interface IConfigPlugin {
  /**
   * Specifies the name of an API Documenter plugin package to be loaded.  By convention, the NPM package name
   * should have the prefix `doc-plugin-`.  Its main entry point should export an object named
   * `apiDocumenterPluginManifest` which implements the {@link IApiDocumenterPluginManifest} interface.
   */
  packageName: string;

  /**
   * A list of features to be enabled.  The features are defined in {@link IApiDocumenterPluginManifest.features}.
   * The `enabledFeatureNames` strings are matched with {@link IFeatureDefinition.featureName}.
   */
  enabledFeatureNames: string[];
}

/**
 * This interface represents the api-documenter.json file format.
 */
export interface IConfigFile {
  /**
   * Specifies the output target.
   */
  outputTarget: 'markdown';

  /**
   * Specifies what type of newlines API Documenter should use when writing output files.
   *
   * @remarks
   * By default, the output files will be written with Windows-style newlines.
   * To use POSIX-style newlines, specify "lf" instead.
   * To use the OS's default newline kind, specify "os".
   */
  newlineKind?: 'crlf' | 'lf' | 'os';

  /** {@inheritDoc IConfigPlugin} */
  plugins?: IConfigPlugin[];
}
