/**
 * Copyright 2018 Google Inc.
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

import typescript from 'rollup-plugin-typescript2';
import replace from 'rollup-plugin-replace';
import pkg from './package.json';

import firebasePkg from '../firebase/package.json';

const plugins = [
  typescript({
    typescript: require('typescript')
  }),
  replace({
    delimiters: ['${', '}'],
    values: {
      JSCORE_VERSION: firebasePkg.version
    }
  })
];

const external = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);
export default [
  {
    input: 'index.ts',
    output: [
      { file: pkg.browser, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins,
    external
  },
  {
    input: 'index.node.ts',
    output: {
      file: pkg.main,
      format: 'cjs'
    },
    plugins,
    external
  },
  {
    input: 'index.rn.ts',
    output: {
      file: pkg['react-native'],
      format: 'cjs'
    },
    plugins,
    external: [...external, 'react-native']
  }
];
