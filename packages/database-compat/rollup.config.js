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
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolveModule from '@rollup/plugin-node-resolve';

import pkg from './package.json';
import standalonePkg from './standalone/package.json';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';

const deps = Object.keys({ ...pkg.peerDependencies, ...pkg.dependencies });

function onWarn(warning, defaultWarn) {
  if (warning.code === 'CIRCULAR_DEPENDENCY') {
    throw new Error(warning);
  }
  defaultWarn(warning);
}

const buildPlugins = [
  typescriptPlugin({
    typescript,
    abortOnError: false
  }),
  json({ preferConst: true })
];

const esmBuilds = [
  /**
   * Node.js Build
   */
  {
    input: 'src/index.node.ts',
    output: [
      {
        file: pkg.exports['.'].node.import,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [...buildPlugins, emitModulePackageFile()],
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  },
  /**
   * Browser Build
   */
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.browser,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: buildPlugins,
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  }
];

const cjsBuilds = [
  /**
   * Node.js Build
   */
  {
    input: 'src/index.node.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: buildPlugins,
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  },
  /**
   * Standalone Build (used by Admin SDK).
   * @firebase/database and only @firebase/database is bundled in this build.
   */
  {
    input: 'src/index.standalone.ts',
    output: [
      {
        file: standalonePkg.main.replace('../', ''),
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      ...buildPlugins,
      resolveModule({
        exportConditions: ['standalone'],
        preferBuiltins: true
      }),
      commonjs()
    ],
    treeshake: {
      moduleSideEffects: false
    },
    external: id =>
      deps
        .filter(dep => dep !== '@firebase/database')
        .some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  }
];

export default [...esmBuilds, ...cjsBuilds];
