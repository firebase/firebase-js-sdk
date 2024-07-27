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

import { version as grpcVersion } from '@grpc/grpc-js/package.json';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';
import typescriptPlugin from 'rollup-plugin-typescript2';
import tmp from 'tmp';
import typescript from 'typescript';

import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';

const sourcemaps = require('rollup-plugin-sourcemaps');
const util = require('./rollup.shared');

const outputFiles = util.getPackageJsonExportPaths();

const nodePlugins = function () {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      cacheDir: tmp.dirSync(),
      abortOnError: true,
      transformers: [util.removeAssertTransformer]
    }),
    json({ preferConst: true }),
    replace({
      '__GRPC_VERSION__': grpcVersion
    })
  ];
};

const browserPlugins = function () {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      cacheDir: tmp.dirSync(),
      abortOnError: true,
      transformers: [util.removeAssertAndPrefixInternalTransformer]
    }),
    json({ preferConst: true }),
    terser(util.manglePrivatePropertiesOptions)
  ];
};

const allBuilds = [
  // Intermediate Node ESM build without build target reporting
  // this is an intermediate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './src/index.node.ts',
    output: {
      file: outputFiles.main.node.import,
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('node')), ...nodePlugins()],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: util.onwarn
  },
  // Node CJS build
  {
    input: outputFiles.main.node.import,
    output: {
      file: outputFiles.main.node.require,
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      ...util.es2017ToEs5Plugins(/* mangled= */ false),
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node ESM build with build target reporting
  {
    input: outputFiles.main.node.import,
    output: {
      file: outputFiles.main.node.import,
      format: 'es',
      sourcemap: true
    },
    plugins: [
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Intermediate browser build without build target reporting
  // this is an intermediate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './src/index.ts',
    output: {
      file: outputFiles.main.browser.import,
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('browser')), ...browserPlugins()],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to ES5
  {
    input: outputFiles.main.browser.import,
    output: [
      {
        file: outputFiles.main.esm5,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      ...util.es2017ToEs5Plugins(/* mangled= */ true),
      replace(generateBuildTargetReplaceConfig('esm', 5))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to cjs
  {
    input: outputFiles.main.browser.import,
    output: [
      {
        file: './dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // es2017 build with build target reporting
  {
    input: outputFiles.main.browser.import,
    output: [
      {
        file: outputFiles.main.browser.import,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // RN build
  {
    input: './src/index.rn.ts',
    output: {
      file: outputFiles.main.rn,
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(util.generateAliasConfig('rn')),
      ...browserPlugins(),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    input: 'dist/firestore/src/index.d.ts',
    output: {
      file: 'dist/firestore/src/global_index.d.ts',
      format: 'es'
    },
    plugins: [
      dts({
        respectExternal: true
      })
    ]
  }
];

export default allBuilds;
