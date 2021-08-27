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

import pkg from './package.json';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import json from '@rollup/plugin-json';

const util = require('../firestore/rollup.shared');

const deps = Object.keys({ ...pkg.peerDependencies, ...pkg.dependencies });

const es2017Plugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    transformers: [util.removeAssertTransformer]
  }),
  json({ preferConst: true })
];

const es5Plugings = [
  typescriptPlugin({
    typescript,
    transformers: [util.removeAssertTransformer]
  }),
  json({ preferConst: true })
];

const browserBuilds = [
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
    plugins: es5Plugings,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const nodeBuilds = [
  {
    input: './src/index.node.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: es2017Plugins,
    external: deps
  }
];

const rnBuilds = [
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
