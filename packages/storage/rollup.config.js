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
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';
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

const buildPlugins = [
  typescriptPlugin({
    typescript,
    abortOnError: false
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
    plugins: [
      alias(generateAliasConfig('browser')),
      ...buildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('esm', 2017),
        '__RUNTIME_ENV__': ''
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('browser')),
      ...buildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('cjs', 2017),
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
      ...buildPlugins,
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

const nodeBuilds = [
  {
    input: './src/index.node.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('node')),
      ...buildPlugins,
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
  {
    input: './src/index.node.ts',
    output: {
      file: pkg.exports['.'].node.import,
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      alias(generateAliasConfig('node')),
      ...buildPlugins,
      replace({
        ...generateBuildTargetReplaceConfig('esm', 2017),
        '__RUNTIME_ENV__': 'node'
      }),
      emitModulePackageFile()
    ],
    external: id =>
      nodeDeps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  }
];

// eslint-disable-next-line import/no-default-export
export default [...browserBuilds, ...nodeBuilds];
