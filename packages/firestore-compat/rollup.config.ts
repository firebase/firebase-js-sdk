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

import json from '@rollup/plugin-json';
import type { Plugin, RollupOptions } from 'rollup';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';

import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';
import { removeAssertTransformer } from '../firestore/rollup.shared';

import pkg from './package.json';

const deps: string[] = Object.keys({
  ...pkg.peerDependencies,
  ...pkg.dependencies
});

const es2017Plugins: Plugin[] = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    transformers: [removeAssertTransformer]
  }),
  json({ preferConst: true })
];

const es5Plugins: Plugin[] = [
  typescriptPlugin({
    typescript,
    transformers: [removeAssertTransformer]
  }),
  json({ preferConst: true })
];

const browserBuilds: RollupOptions[] = [
  {
    input: './src/index.ts',
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true
    },
    plugins: es2017Plugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: './src/index.ts',
    output: [
      {
        file: pkg.esm5,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: es5Plugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: './src/index.ts',
    output: [
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: es2017Plugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const nodeBuilds: RollupOptions[] = [
  {
    input: './src/index.node.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: es2017Plugins,
    external: deps
  },
  {
    input: './src/index.node.ts',
    output: {
      file: pkg.exports['.'].node.import,
      format: 'es',
      sourcemap: true
    },
    plugins: [...es2017Plugins, emitModulePackageFile()],
    external: deps
  }
];

const rnBuilds: RollupOptions[] = [
  {
    input: './src/index.rn.ts',
    output: {
      file: pkg['react-native'],
      format: 'es',
      sourcemap: true
    },
    plugins: es2017Plugins,
    external: deps
  }
];

export default [...browserBuilds, ...nodeBuilds, ...rnBuilds];
