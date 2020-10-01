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

import rollup from 'rollup';
import resolve, { Options } from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
// @ts-ignore
import virtual from '@rollup/plugin-virtual';

import webpack from 'webpack';
// @ts-ignore
import virtualModulesPlugin from 'webpack-virtual-modules';
import { createFsFromVolume, Volume } from 'memfs';
import path from 'path';

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

/**
 *
 * @param fileContent
 * @param moduleDirectory - the path to the node_modules folder of the temporary project in npm mode.
 *                          undefined in local mode
 */
export async function bundleWithWebpack(
  fileContent: string,
  moduleDirectory?: string
): Promise<string> {
  const entryFileName = '/haha/something.js';
  const outputFileName = 'o.js';

  let resolveConfig: webpack.Resolve | undefined;

  if (moduleDirectory) {
    resolveConfig = {
      modules: [moduleDirectory]
    };
  }

  const compiler = webpack({
    entry: entryFileName,
    output: {
      filename: outputFileName
    },
    resolve: resolveConfig,
    plugins: [
      new virtualModulesPlugin({
        [entryFileName]: fileContent
      })
    ],
    mode: 'production'
  });

  const fs = getMemoryFileSystem();
  (fs as any).join = path.join.bind(path);
  compiler.outputFileSystem = (fs as unknown) as webpack.OutputFileSystem;

  return new Promise<string>((res, rej) => {
    compiler.run((err, stats) => {
      if (err) {
        rej(err);
        return;
      }

      // Hack to get string output without reading the output file  using an internal API from webpack
      res(stats.compilation.assets[outputFileName]._value);
    });
  });
}

function getMemoryFileSystem() {
  return createFsFromVolume(new Volume());
}
