/**
 * @license
 * Copyright 2019 Google LLC
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
import replace from 'rollup-plugin-replace';
import typescript from 'typescript';
import json from '@rollup/plugin-json';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';
import pkg from './package.json';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

const es5BuildPlugins = [
  typescriptPlugin({
    typescript
  }),
  json()
];

const es2017BuildPlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    }
  }),
  json({
    preferConst: true
  })
];

const esmBuilds = [
  /**
   * Browser Builds
   */
  {
    input: 'src/index.ts',
    output: [{ file: pkg.esm5, format: 'es', sourcemap: true }],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    plugins: [
      ...es5BuildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('esm', 5),
        '__RUNTIME_ENV__': ''
      }),
      emitModulePackageFile()
    ]
  },
  {
    input: 'src/index.ts',
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    plugins: [
      ...es2017BuildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('esm', 2017),
        '__RUNTIME_ENV__': ''
      }),
      emitModulePackageFile()
    ]
  }
];

const cjsBuilds = [
  {
    input: 'src/index.ts',
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    plugins: [
      ...es5BuildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('cjs', 5),
        '__RUNTIME_ENV__': 'node'
      })
    ]
  }
];

export default [...esmBuilds, ...cjsBuilds];
