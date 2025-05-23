/**
 * @license
 * Copyright 2024 Google LLC
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
import replace from 'rollup-plugin-replace';
import typescript from 'typescript';
import pkg from './package.json';
import tsconfig from './tsconfig.json';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

const buildPlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      exclude: [
        ...tsconfig.exclude,
        '**/*.test.ts',
        'test-utils',
        'integration'
      ],
      compilerOptions: {
        target: 'es2017'
      }
    }
  }),
  json()
];

const browserBuilds = [
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...buildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('esm', 2017),
        __PACKAGE_VERSION__: pkg.version
      }),
      emitModulePackageFile()
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: 'src/index.ts',
    output: {
      file: './dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      ...buildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('cjs', 2017),
        __PACKAGE_VERSION__: pkg.version
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const nodeBuilds = [
  {
    input: 'src/index.node.ts',
    output: {
      file: pkg.exports['.'].node.import,
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...buildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('esm', 2017)
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: 'src/index.node.ts',
    output: {
      file: pkg.exports['.'].node.require,
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      ...buildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('cjs', 2017)
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

export default [...browserBuilds, ...nodeBuilds];
