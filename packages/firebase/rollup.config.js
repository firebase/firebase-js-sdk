/**
 * @license
 * Copyright 2018 Google Inc.
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
import typescript from 'rollup-plugin-typescript2';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

import appPkg from './app/package.json';
import authPkg from './auth/package.json';
import databasePkg from './database/package.json';
import firestorePkg from './firestore/package.json';
import functionsPkg from './functions/package.json';
import messagingPkg from './messaging/package.json';
import storagePkg from './storage/package.json';

const pkgsByName = {
  app: appPkg,
  auth: authPkg,
  database: databasePkg,
  firestore: firestorePkg,
  functions: functionsPkg,
  messaging: messagingPkg,
  storage: storagePkg
};

const plugins = [
  sourcemaps(),
  resolveModule(),
  typescript({
    typescript: require('typescript')
  }),
  commonjs()
];

const external = Object.keys(pkg.dependencies || {});

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

const components = [
  'auth',
  'database',
  'firestore',
  'functions',
  'messaging',
  'storage'
];
const componentBuilds = components
  .map(component => {
    const pkg = pkgsByName[component];
    return [
      {
        input: `${component}/index.ts`,
        output: [
          { file: resolve(component, pkg.main), format: 'cjs', sourcemap: true },
          { file: resolve(component, pkg.module), format: 'es', sourcemap: true }
        ],
        plugins,
        external
      },
      {
        input: `${component}/index.ts`,
        output: {
          file: `firebase-${component}.js`,
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
                'Cannot instantiate firebase-${component} - ' +
                'be sure to load firebase-app.js first.'
              );
            }`
        },
        plugins: [...plugins, uglify()],
        external: ['@firebase/app']
      }
    ];
  })
  .reduce((a, b) => a.concat(b), []);

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
  }
];

export default [...appBuilds, ...componentBuilds, ...completeBuilds];
