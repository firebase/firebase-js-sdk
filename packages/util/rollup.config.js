/**
 * @license
 * Copyright 2018 Google LLC
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

import typescriptPlugin from 'rollup-plugin-typescript2';
import replacePlugin from '@rollup/plugin-replace';
import typescript from 'typescript';
import pkg from './package.json';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';

const deps = [
  ...Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies)),
  './autoinit_env'
];

const buildPlugins = [
  typescriptPlugin({ typescript }),
  replacePlugin({
    './src/autoinit_env': '"@firebase/util/autoinit_env"',
    delimiters: ["'", "'"],
    preventAssignment: true
  })
];

const browserBuilds = [
  {
    input: 'index.ts',
    output: {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    },
    plugins: buildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: 'index.ts',
    output: {
      file: './dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: buildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const nodeBuilds = [
  {
    input: 'index.node.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: buildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: 'index.node.ts',
    output: {
      file: pkg.exports['.'].node.import,
      format: 'es',
      sourcemap: true
    },
    plugins: [...buildPlugins, emitModulePackageFile()],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const autoinitBuild = [
  {
    input: './src/autoinit_env.ts',
    output: {
      file: './dist/autoinit_env.js',
      format: 'cjs'
    },
    plugins: buildPlugins
  },
  {
    input: './src/autoinit_env.ts',
    output: {
      file: './dist/autoinit_env.mjs',
      format: 'es'
    },
    plugins: buildPlugins
  }
];

export default [...browserBuilds, ...nodeBuilds, ...autoinitBuild];
