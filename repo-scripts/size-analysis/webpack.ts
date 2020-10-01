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

import webpack from 'webpack';
// @ts-ignore
import virtualModulesPlugin from 'webpack-virtual-modules';
import { createFsFromVolume, Volume } from 'memfs';
import path from 'path';
import { projectRoot } from './util';

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
  const entryFileName = '/virtual_path_to_in_memory_file/index.js';
  const outputFileName = 'o.js';

  let resolveConfig: webpack.Resolve = {
    mainFields: ['esm2017', 'module', 'main']
  };

  if (moduleDirectory) {
    resolveConfig.modules = [moduleDirectory];
  } else {
    // local mode
    resolveConfig.modules = [`${projectRoot}/node_modules`];
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

  // use virtual file system for output to save on I/O
  const fs = getMemoryFileSystem();
  (fs as any).join = path.join.bind(path);
  compiler.outputFileSystem = (fs as unknown) as webpack.OutputFileSystem;

  return new Promise<string>((res, rej) => {
    compiler.run((err, stats) => {
      if (err) {
        rej(err);
        return;
      }

      // Hack to get string output without reading the output file using an internal API from webpack
      res(stats.compilation.assets[outputFileName]._value);
    });
  });
}

function getMemoryFileSystem() {
  return createFsFromVolume(new Volume());
}
