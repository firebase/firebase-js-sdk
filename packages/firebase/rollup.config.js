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

import { resolve } from 'path';
import resolveModule from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { uglify } from 'rollup-plugin-uglify';
import { terser } from 'rollup-plugin-terser';
import json from 'rollup-plugin-json';
import pkg from './package.json';

import appPkg from './app/package.json';

function createUmdOutputConfig(output) {
  return {
    file: output,
    format: 'umd',
    sourcemap: true,
    extend: true,
    name: GLOBAL_NAME,
    globals: {
      '@firebase/app': GLOBAL_NAME
    },

    /**
     * use iife to avoid below error in the old Safari browser
     * SyntaxError: Functions cannot be declared in a nested block in strict mode
     * https://github.com/firebase/firebase-js-sdk/issues/1228
     *
     */
    intro: `
          try {
            (function() {`,
    outro: `
          }).apply(this, arguments);
        } catch(err) {
            console.error(err);
            throw new Error(
              'Cannot instantiate ${output} - ' +
              'be sure to load firebase-app.js first.'
            );
          }`
  };
}

const plugins = [
  sourcemaps(),
  resolveModule(),
  typescriptPlugin({
    typescript
  }),
  json(),
  commonjs()
];

const deps = Object.keys(pkg.dependencies || {});
const external = id => deps.some(dep => id === dep || id.startsWith(`${dep}/`));

/**
 * Global UMD Build
 */
const GLOBAL_NAME = 'firebase';

/**
 * Individual Component Builds
 */
const appBuilds = [
  /**
   * App Browser Builds
   */
  {
    input: 'app/index.ts',
    output: [
      { file: resolve('app', appPkg.main), format: 'cjs', sourcemap: true },
      { file: resolve('app', appPkg.module), format: 'es', sourcemap: true }
    ],
    plugins,
    external
  },
  /**
   * App UMD Builds
   */
  {
    input: 'app/index.ts',
    output: {
      file: 'firebase-app.js',
      sourcemap: true,
      format: 'umd',
      name: GLOBAL_NAME
    },
    plugins: [...plugins, uglify()]
  }
];

const componentBuilds = pkg.components
  // The "app" component is treated differently because it doesn't depend on itself.
  .filter(component => component !== 'app')
  .map(component => {
    const pkg = require(`./${component}/package.json`);
    return [
      {
        input: `${component}/index.ts`,
        output: [
          {
            file: resolve(component, pkg.main),
            format: 'cjs',
            sourcemap: true
          },
          {
            file: resolve(component, pkg.module),
            format: 'es',
            sourcemap: true
          }
        ],
        plugins,
        external
      },
      {
        input: `${component}/index.ts`,
        output: createUmdOutputConfig(`firebase-${component}.js`),
        plugins: [...plugins, uglify()],
        external: ['@firebase/app']
      }
    ];
  })
  .reduce((a, b) => a.concat(b), []);

const firestoreMemoryBuilds = [
  {
    input: `firestore/memory/index.ts`,
    output: [
      {
        file: resolve('firestore/memory', pkg.main),
        format: 'cjs',
        sourcemap: true
      },
      {
        file: resolve('firestore/memory', pkg.module),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins,
    external
  },
  {
    input: `firestore/memory/index.ts`,
    output: createUmdOutputConfig(`firebase-firestore.memory.js`),
    plugins: [...plugins, uglify()],
    external: ['@firebase/app']
  }
];

/**
 * Complete Package Builds
 */
const completeBuilds = [
  /**
   * App Browser Builds
   */
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.browser, format: 'cjs', sourcemap: true },
      { file: pkg.module, format: 'es', sourcemap: true }
    ],
    plugins,
    external
  },
  {
    input: 'src/index.cdn.ts',
    output: {
      file: 'firebase.js',
      format: 'umd',
      sourcemap: true,
      name: GLOBAL_NAME
    },
    plugins: [...plugins, uglify()]
  },
  /**
   * App Node.js Builds
   */
  {
    input: 'src/index.node.ts',
    output: { file: pkg.main, format: 'cjs', sourcemap: true },
    plugins,
    external
  },
  /**
   * App React Native Builds
   */
  {
    input: 'src/index.rn.ts',
    output: { file: pkg['react-native'], format: 'cjs', sourcemap: true },
    plugins,
    external
  },
  /**
   * Performance script Build
   */
  {
    input: 'src/index.perf.ts',
    output: {
      file: 'firebase-performance-standalone.js',
      format: 'umd',
      sourcemap: true,
      name: GLOBAL_NAME
    },
    plugins: [
      sourcemaps(),
      resolveModule({
        mainFields: ['lite', 'module', 'main']
      }),
      typescriptPlugin({
        typescript
      }),
      json(),
      commonjs(),
      uglify()
    ]
  },
  /**
   * Performance script Build in ES2017
   */
  {
    input: 'src/index.perf.ts',
    output: {
      file: 'firebase-performance-standalone.es2017.js',
      format: 'umd',
      sourcemap: true,
      name: GLOBAL_NAME
    },
    plugins: [
      sourcemaps(),
      resolveModule({
        mainFields: ['lite-esm2017', 'esm2017', 'module', 'main']
      }),
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
      }),
      commonjs(),
      terser()
    ]
  }
];

export default [
  ...appBuilds,
  ...componentBuilds,
  ...firestoreMemoryBuilds,
  ...completeBuilds
];
