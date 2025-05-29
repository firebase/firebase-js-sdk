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

/**
 *
 * @returns a rollup plugin that creates a package.json file in the output folder
 * The package.json contains only {"type":"module"} to make Nodejs parse files in the output folder as
 * ES modules without using the .mjs extension.
 *
 * This is useful for packages that support both Nodejs and Browser, so that they don't have to build 2
 * esm files with the same content but with different extensions.
 */
export function emitModulePackageFile() {
  return {
    generateBundle(options) {
      this.emitFile({
        fileName: 'package.json',
        source: `{"type":"module"}`,
        type: 'asset'
      });
    },
    name: 'emit-module-package-file'
  };
}
