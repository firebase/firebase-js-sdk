/**
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
import typescript from 'rollup-plugin-typescript2';
import uglify from 'rollup-plugin-uglify';
import pkg from './package.json';

import authPkg from './auth/package.json';
import storagePkg from './storage/package.json';

const pkgsByName = {
  auth: authPkg,
  storage: storagePkg
};

const plugins = [
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
const GLOBAL_NAME = 'rxfire';

const components = [
  'auth',
  'storage'
];
const componentBuilds = components
  .map(component => {
    const pkg = pkgsByName[component];
    return [
      {
        input: `${component}/index.ts`,
        output: [
          { file: resolve(component, pkg.main), format: 'cjs' },
          { file: resolve(component, pkg.module), format: 'es' }
        ],
        plugins,
        external
      },
      {
        input: `${component}/index.ts`,
        output: {
          file: `rxfire-${component}.js`,
          format: 'iife',
          sourcemap: true,
          extend: true,
          name: GLOBAL_NAME,
          globals: {
            'rxfire': GLOBAL_NAME
          }
        },
        plugins: [...plugins, uglify()],
        external: ['firebase', 'rxjs']
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
      { file: pkg.browser, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins,
    external
  },
  {
    input: 'src/index.cdn.ts',
    output: {
      file: 'rxfire.js',
      format: 'umd',
      name: GLOBAL_NAME
    },
    plugins: [...plugins, uglify()]
  },
  /**
   * App Node.js Builds
   */
  {
    input: 'src/index.node.ts',
    output: { file: pkg.main, format: 'cjs' },
    plugins,
    external
  },
  /**
   * App React Native Builds
   */
  {
    input: 'src/index.rn.ts',
    output: { file: pkg['react-native'], format: 'cjs' },
    plugins,
    external
  }
];

export default [...componentBuilds ];
