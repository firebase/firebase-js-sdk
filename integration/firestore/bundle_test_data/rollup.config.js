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

const tmp = require('tmp');
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy-assets';
const json = require('rollup-plugin-json');
const alias = require('@rollup/plugin-alias');
const typescriptPlugin = require('rollup-plugin-typescript2');
const typescript = require('typescript');
const sourcemaps = require('rollup-plugin-sourcemaps');
const pkg = require('./package.json');

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

const nodeDeps = [...deps, 'util', 'path'];

const resolveNodeExterns = function (id) {
  return nodeDeps.some(dep => id === dep || id.startsWith(`${dep}/`));
};

/**
 * Returns an replacement configuration for `@rollup/plugin-alias` that replaces
 * references to platform-specific files with implementations for the provided
 * target platform.
 */
function generateAliasConfig() {
  return {
    entries: [
      {
        find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
        replacement: `$1\/platform/node/$2.ts`
      }
    ]
  };
}

const es2017Plugins = function () {
  return [
    alias(generateAliasConfig()),
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      cacheDir: tmp.dirSync()
    }),
    json({ preferConst: true })
  ];
};

const es2017ToEs5Plugins = function () {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          allowJs: true
        }
      },
      include: ['dist/*.js']
    }),
    sourcemaps()
  ];
};

export default [
  {
    input: 'generate_test_bundle.ts',
    output: {
      file: 'dist/generate_test_bundle.em2017.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...es2017Plugins(),
      // Needed as we also use the *.proto files
      copy({
        assets: ['../../../packages/firestore/src/protos']
      }),
      replace({
        'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('protos')
      })
    ],
    external: resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    input: 'dist/generate_test_bundle.em2017.js',
    output: [
      {
        file: 'dist/generate_test_bundle.cjs.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: es2017ToEs5Plugins(),
    external: resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];
