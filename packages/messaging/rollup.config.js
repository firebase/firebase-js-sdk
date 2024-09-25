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

import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';
import typescript from 'typescript';
import replace from 'rollup-plugin-replace';
import typescriptPlugin from 'rollup-plugin-typescript2';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';

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
  json({ preferConst: true }),
  resolve()
];

const esmBuilds = [
  {
    input: 'src/index.ts',
    output: { file: pkg.esm5, format: 'es', sourcemap: true },
    plugins: [
      ...es5BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 5)),
      emitModulePackageFile()
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: 'src/index.ts',
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 2017)),
      emitModulePackageFile()
    ],
    external: id =>
      deps.some(
        dep => dep !== 'idb' && (id === dep || id.startsWith(`${dep}/`))
      )
  },
  // sw builds
  {
    input: 'src/index.sw.ts',
    output: { file: pkg.sw, format: 'es', sourcemap: true },
    plugins: es2017BuildPlugins,
    external: id =>
      deps.some(
        dep => dep !== 'idb' && (id === dep || id.startsWith(`${dep}/`))
      )
  }
];

const cjsBuilds = [
  {
    input: 'src/index.ts',
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    plugins: [
      ...es5BuildPlugins,
      replace(generateBuildTargetReplaceConfig('cjs', 5))
    ],
    external: id =>
      deps.some(
        dep => dep !== 'idb' && (id === dep || id.startsWith(`${dep}/`))
      )
  },
  // sw build
  // TODO: This may no longer be necessary when we can provide ESM Node
  // builds (contingent on updating the `idb` dependency). When we add
  // ESM Node builds, test with Nuxt and other SSR frameworks to see if
  // this can then be removed.
  {
    input: 'src/index.sw.ts',
    output: { file: pkg['sw-main'], format: 'cjs', sourcemap: true },
    plugins: [
      ...es5BuildPlugins,
      replace(generateBuildTargetReplaceConfig('cjs', 5))
    ],
    external: id =>
      deps.some(
        dep => dep !== 'idb' && (id === dep || id.startsWith(`${dep}/`))
      )
  }
];

export default [...esmBuilds, ...cjsBuilds];
