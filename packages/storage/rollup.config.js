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

import json from '@rollup/plugin-json';
import typescriptPlugin from 'rollup-plugin-typescript2';
import replace from 'rollup-plugin-replace';
import typescript from 'typescript';
import alias from '@rollup/plugin-alias';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';
import pkg from './package.json';

function generateAliasConfig(platform) {
  return {
    entries: [
      {
        find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
        replacement: `$1\/platform/${platform}/$2.ts`
      }
    ]
  };
}

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

const nodeDeps = [...deps, 'util'];

const es5Plugins = [
  typescriptPlugin({
    typescript,
    abortOnError: false
  }),
  json()
];

const es5Builds = [
  // Browser
  {
    input: './src/index.ts',
    output: [
      { file: 'dist/index.browser.cjs.js', format: 'cjs', sourcemap: true },
      { file: pkg.esm5, format: 'es', sourcemap: true }
    ],
    plugins: [
      alias(generateAliasConfig('browser')),
      ...es5Plugins,
      replace({
        ...generateBuildTargetReplaceConfig('esm', 5),
        '__RUNTIME_ENV__': ''
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    // needed by Emulator UI
    input: './src/index.ts',
    output: [
      { file: 'dist/index.browser.cjs.js', format: 'cjs', sourcemap: true }
    ],
    plugins: [
      alias(generateAliasConfig('browser')),
      ...es5Plugins,
      replace({
        ...generateBuildTargetReplaceConfig('cjs', 5),
        '__RUNTIME_ENV__': ''
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  }
];

const es2017Plugins = [
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

const es2017Builds = [
  // Node
  {
    input: './src/index.node.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('node')),
      ...es2017Plugins,
      replace({
        ...generateBuildTargetReplaceConfig('cjs', 2017),
        '__RUNTIME_ENV__': 'node'
      })
    ],
    external: id =>
      nodeDeps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  },

  // Browser
  {
    input: './src/index.ts',
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('browser')),
      ...es2017Plugins,
      replace({
        ...generateBuildTargetReplaceConfig('esm', 2017),
        '__RUNTIME_ENV__': ''
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  }
];

// eslint-disable-next-line import/no-default-export
export default [...es5Builds, ...es2017Builds];
