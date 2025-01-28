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

import pkg from './package.json';

const sourcemaps = require('rollup-plugin-sourcemaps');
const util = require('./rollup.shared');

const nodePlugins = [
  typescriptPlugin({
    typescript,
    cacheDir: tmp.dirSync(),
    abortOnError: true,
    transformers: [util.removeAssertTransformer]
  }),
  json({ preferConst: true }),
  replace({
    '__GRPC_VERSION__': grpcVersion
  })
];

const browserPlugins = [
  typescriptPlugin({
    typescript,
    cacheDir: tmp.dirSync(),
    abortOnError: true,
    transformers: [util.removeAssertAndPrefixInternalTransformer]
  }),
  json({ preferConst: true }),
  terser(util.manglePrivatePropertiesOptions)
];

const allBuilds = [
  // Intermediate Node ESM build without build target reporting
  // this is an intermediate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: ['./src/index.node.ts', './pipelines/pipelines.node.ts'],
    output: {
      dir: 'dist/intermediate',
      entryFileNames: '[name].mjs',
      chunkFileNames: 'common-[hash].node.mjs',
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('node')), ...nodePlugins],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: util.onwarn
  },
  // Node CJS build
  {
    input: [
      'dist/intermediate/index.node.mjs',
      'dist/intermediate/pipelines.node.mjs'
    ],
    output: {
      dir: 'dist/',
      entryFileNames: '[name].cjs.js',
      chunkFileNames: 'common-[hash].node.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            allowJs: true
          }
        },
        include: ['dist/**/*.js'],
        cacheDir: tmp.dirSync()
      }),
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node ESM build with build target reporting
  {
    input: [
      'dist/intermediate/index.node.mjs',
      'dist/intermediate/pipelines.node.mjs'
    ],
    output: {
      dir: 'dist/',
      entryFileNames: '[name].mjs',
      chunkFileNames: 'common-[hash].node.mjs',
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
    input: ['./src/index.ts', './pipelines/pipelines.ts'],
    output: {
      dir: 'dist/intermediate',
      entryFileNames: '[name].js',
      chunkFileNames: 'common-[hash].js',
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('browser')), ...browserPlugins],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to cjs
  {
    input: ['dist/intermediate/index.js', 'dist/intermediate/pipelines.js'],
    output: [
      {
        dir: 'dist/',
        entryFileNames: '[name].cjs.js',
        chunkFileNames: 'common-[hash].cjs.js',
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
    input: ['dist/intermediate/index.js', 'dist/intermediate/pipelines.js'],
    output: [
      {
        dir: 'dist/',
        entryFileNames: '[name].esm2017.js',
        chunkFileNames: 'common-[hash].esm2017.js',
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
    input: ['./src/index.rn.ts', './pipelines/pipelines.rn.ts'],
    output: {
      dir: 'dist/',
      entryFileNames: '[name].js',
      chunkFileNames: 'common-[hash].rn.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(util.generateAliasConfig('rn')),
      ...browserPlugins,
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
