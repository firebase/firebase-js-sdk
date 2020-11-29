import pkg from './package.json';
import path from 'path';
import memoryPkg from './memory/package.json';
import bundlePkg from './bundle/package.json';

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

const alias = require('@rollup/plugin-alias');
const util = require('./rollup.shared');

export default [
  {
    input: 'export.ts',
    output: {
      file: 'dist/prebuild.js',
      format: 'es',
      sourcemap: true
    },
    plugins: util.es2017Plugins('browser', /* mangled= */ true),
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    input: 'export.memory.ts',
    output: {
      file: 'dist/prebuild.memory.js',
      format: 'es',
      sourcemap: true
    },
    plugins: util.es2017Plugins('browser', /* mangled= */ true),
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    input: {
      index: 'index.ts',
      memory: 'index.memory.ts',
      bundle: 'index.bundle.ts'
    },
    output: {
      dir: 'dist/esm2017',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias({
        entries: [
          {
            find: /^(.*)\/export\.memory$/,
            replacement: `$1\/dist/prebuild.memory.js`
          },
          {
            find: /^(.*)\/export$/,
            replacement: `$1\/dist/prebuild.js`
          }
        ]
      }),
      ...util.es2017Plugins('browser', /* mangled= */ false)
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    input: {
      index: pkg['esm2017'],
      memory: path.resolve('./memory', memoryPkg['esm2017']),
      bundle: path.resolve('./bundle', bundlePkg['esm2017'])
    },
    output: [
      {
        dir: 'dist/esm5',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: util.es2017ToEs5Plugins(),
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];
