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

import appPkg from './app/package.json';
import commonjs from '@rollup/plugin-commonjs';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';
import json from '@rollup/plugin-json';
import pkg from './package.json';
import { resolve } from 'path';
import resolveModule from '@rollup/plugin-node-resolve';
import rollupTypescriptPlugin from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';
import typescript from 'typescript';
import alias from '@rollup/plugin-alias';
import { terser } from 'rollup-plugin-terser';

// remove -exp from dependencies name
const deps = Object.keys(pkg.dependencies || {}).map(name =>
  name.replace('-exp', '')
);

const plugins = [sourcemaps(), resolveModule(), json(), commonjs()];

const typescriptPlugin = rollupTypescriptPlugin({
  typescript,
  transformers: [importPathTransformer]
});

const typescriptPluginCDN = rollupTypescriptPlugin({
  typescript,
  tsconfigOverride: {
    compilerOptions: {
      declaration: false
    }
  }
});

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
    plugins: [...plugins, typescriptPlugin],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
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
        plugins: [...plugins, typescriptPlugin],
        external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
      }
    ];
  })
  .reduce((a, b) => a.concat(b), []);

/**
 * CDN script builds
 */
const FIREBASE_APP_URL = `https://www.gstatic.com/firebasejs/${pkg.version}/firebase-app.js`;
const cdnBuilds = [
  {
    input: 'app/index.cdn.ts',
    output: {
      file: 'firebase-app.js',
      sourcemap: true,
      format: 'es'
    },
    plugins: [
      ...plugins,
      typescriptPluginCDN,
      terser({
        format: {
          comments: false
        }
      })
    ]
  },
  ...pkg.components
    .filter(component => component !== 'app')
    .map(component => {
      const pkg = require(`./${component}/package.json`);
      // It is needed for handling sub modules, for example firestore/lite which should produce firebase-firestore-lite.js
      // Otherwise, we will create a directory with '/' in the name.
      const componentName = component.replace('/', '-');

      return {
        input: `${component}/index.ts`,
        output: {
          file: `firebase-${componentName}.js`,
          sourcemap: true,
          format: 'es'
        },
        plugins: [
          ...plugins,
          typescriptPluginCDN,
          alias({
            entries: {
              '@firebase/app': FIREBASE_APP_URL,
              '@firebase/installations': '@firebase/installations-exp'
            }
          }),
          terser({
            format: {
              comments: false
            }
          })
        ],
        external: [FIREBASE_APP_URL]
      };
    })
];
export default [...appBuilds, ...componentBuilds, ...cdnBuilds];
