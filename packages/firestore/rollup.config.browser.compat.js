import pkg from './compat/package.json';
import path from 'path';
import { getImportPathTransformer } from '../../scripts/exp/ts-transform-import-path';

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

const util = require('./rollup.shared');

export default [
  // Create main build
  {
    input: {
      index: './compat/index.ts'
    },
    output: {
      dir: 'dist/compat/esm2017',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...util.es2017PluginsCompat(
        'browser',
        getImportPathTransformer({
          // ../../exp/index
          pattern: /^.*exp\/index$/,
          template: ['@firebase/firestore']
        }),
        /* mangled= */ false
      )
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert main build to ES5
  {
    input: {
      index: path.resolve('./compat', pkg['browser'])
    },
    output: [
      {
        dir: 'dist/compat/esm5',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: util.es2017ToEs5Plugins(/* mangled= */ true),
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];
