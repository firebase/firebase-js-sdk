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
import typescriptPlugin from 'rollup-plugin-typescript2';
import replace from 'rollup-plugin-replace';
import typescript from 'typescript';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';
import pkg from './package.json';

const deps = [
  ...Object.keys({ ...pkg.peerDependencies, ...pkg.dependencies }),
  '@firebase/app'
];

function onWarn(warning, defaultWarn) {
  if (warning.code === 'CIRCULAR_DEPENDENCY') {
    throw new Error(warning);
  }
  defaultWarn(warning);
}

const es5BuildPlugins = [
  typescriptPlugin({
    typescript,
    abortOnError: false
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
    },
    abortOnError: false
  }),
  json({ preferConst: true })
];

const browserBuilds = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.esm5,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      ...es5BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 5))
    ],
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  }
];

const nodeBuilds = [
  {
    input: 'src/index.node.ts',
    output: { file: pkg.main, format: 'cjs', sourcemap: true },
    plugins: [
      ...es5BuildPlugins,
      replace(generateBuildTargetReplaceConfig('cjs', 5))
    ],
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  },
  {
    input: 'src/index.node.ts',
    output: {
      file: pkg.exports['.'].node.import,
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...es2017BuildPlugins,
      replace(generateBuildTargetReplaceConfig('esm', 2017)),
      emitModulePackageFile()
    ],
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  }
  /**
   * Standalone Build for Admin SDK
   */
  // {
  //   input: 'src/index.standalone.ts',
  //   output: [{ file: pkg.standalone, format: 'cjs', sourcemap: true }],
  //   plugins: es5BuildPlugins,
  //   treeshake: {
  //     moduleSideEffects: false
  //   },
  //   external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
  //   onwarn: onWarn
  // }
];

export default [...browserBuilds, ...nodeBuilds];
