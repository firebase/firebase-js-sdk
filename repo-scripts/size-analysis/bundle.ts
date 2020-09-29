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

import * as rollup from 'rollup';
import resolve, { Options } from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
// @ts-ignore
import virtual from '@rollup/plugin-virtual';

/**
 *
 * @param fileContent
 * @param moduleDirectory - the path to the node_modules folder of the temporary project in npm mode.
 *                          undefined in local mode
 */
export async function bundleWithRollup(
  fileContent: string,
  moduleDirectory?: string
): Promise<string> {
  const resolveOptions: Options = {
    mainFields: ['esm2017', 'module', 'main']
  };

  if (moduleDirectory) {
    resolveOptions.customResolveOptions = {
      moduleDirectory
    };
  }

  const bundle = await rollup.rollup({
    input: 'entry',
    plugins: [
      virtual({
        entry: fileContent
      }),
      resolve(resolveOptions),
      commonjs()
    ]
  });

  const { output } = await bundle.generate({
    format: 'es'
  });
  return output[0].code;
}

export async function bundleWithWebpack(fileContent: string): Promise<string> {
  throw new Error('not implemented!');
}
