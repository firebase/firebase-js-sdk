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

import strip from '@rollup/plugin-strip';
import typescriptPlugin from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import typescript from 'typescript';
import pkg from './package.json';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

/**
 * Common plugins for all builds
 */
const commonPlugins = [
  json(),
  strip({
    functions: ['debugAssert.*']
  })
];

export function getConfig({ isReleaseBuild }) {
  /**
   * ES5 Builds
   */
  const es5BuildPlugins = [
    ...commonPlugins,
    getTypesScriptPlugin({ isReleaseBuild })
  ];

  const es5Builds = [
    /**
     * Browser Builds
     */
    {
      input: {
        index: 'index.ts',
        internal: 'internal/index.ts'
      },
      output: [{ dir: 'dist/esm5', format: 'esm', sourcemap: true }],
      plugins: es5BuildPlugins,
      external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
    },
    /**
     * Web Worker Build (compiled without DOM)
     */
    {
      input: 'index.webworker.ts',
      output: [{ file: pkg.webworker, format: 'es', sourcemap: true }],
      plugins: [
        ...commonPlugins,
        getTypesScriptPlugin({
          isReleaseBuild,
          compilerOptions: {
            lib: [
              // Remove dom after we figure out why navigator stuff doesn't exist
              'dom',
              'es2015',
              'webworker'
            ]
          }
        })
      ],
      external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
    },
    /**
     * Node.js Build
     */
    {
      input: {
        index: 'index.node.ts',
        internal: 'internal/index.ts'
      },
      output: [{ dir: 'dist/node', format: 'cjs', sourcemap: true }],
      plugins: es5BuildPlugins,
      external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
    },
    /**
     * React Native Builds
     */
    {
      input: {
        index: 'index.rn.ts',
        internal: 'internal/index.ts'
      },
      output: [{ dir: 'dist/rn', format: 'cjs', sourcemap: true }],
      plugins: es5BuildPlugins,
      external: id =>
        [...deps, 'react-native'].some(
          dep => id === dep || id.startsWith(`${dep}/`)
        )
    }
  ];

  /**
   * ES2017 Builds
   */
  const es2017BuildPlugins = [
    ...commonPlugins,
    getTypesScriptPlugin({
      isReleaseBuild,
      compilerOptions: { target: 'es2017' }
    })
  ];

  const es2017Builds = [
    /**
     *  Browser Builds
     */
    {
      input: {
        index: 'index.ts',
        internal: 'internal/index.ts'
      },
      output: {
        dir: 'dist/esm2017',
        format: 'es',
        sourcemap: true
      },
      plugins: es2017BuildPlugins,
      external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
    }
  ];

  const allBuilds = [...es5Builds, ...es2017Builds];

  if (isReleaseBuild) {
    for (const build of allBuilds) {
      build.treeshake = {
        moduleSideEffects: false
      };
    }
  }

  return allBuilds;
}

function getTypesScriptPlugin({ compilerOptions, isReleaseBuild }) {
  let options = {
    typescript,
    tsconfigOverride: {
      compilerOptions
    }
  };

  if (isReleaseBuild) {
    options = {
      ...options,
      clean: true,
      abortOnError: false,
      transformers: [importPathTransformer]
    };
  }

  return typescriptPlugin(options);
}
