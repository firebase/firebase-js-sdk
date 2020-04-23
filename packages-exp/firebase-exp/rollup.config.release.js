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

import { resolve } from 'path';
import resolveModule from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';
import rollupTypescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { uglify } from 'rollup-plugin-uglify';
import json from 'rollup-plugin-json';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';
import pkg from './package.json';
import appPkg from './app/package.json';

// remove -exp from dependencies name
const external = Object.keys(pkg.dependencies || {}).map(name =>
  name.replace('-exp', '')
);

/**
 * Global UMD Build
 */
const GLOBAL_NAME = 'firebase';

function createUmdOutputConfig(output, componentName) {
  return {
    file: output,
    format: 'umd',
    sourcemap: true,
    extend: true,
    name: `${GLOBAL_NAME}.${componentName}`,
    globals: {
      '@firebase/app': `${GLOBAL_NAME}.app`
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

const plugins = [sourcemaps(), resolveModule(), json(), commonjs()];

const typescriptPlugin = rollupTypescriptPlugin({
  typescript,
  transformers: [importPathTransformer]
});

const typescriptPluginUMD = rollupTypescriptPlugin({
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
      name: `${GLOBAL_NAME}.app`
    },
    plugins: [...plugins, typescriptPluginUMD, uglify()]
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
        external
      },
      {
        input: `${component}/index.ts`,
        output: createUmdOutputConfig(`firebase-${component}.js`, component),
        plugins: [...plugins, typescriptPluginUMD],
        external: ['@firebase/app']
      }
    ];
  })
  .reduce((a, b) => a.concat(b), []);

export default [...appBuilds, ...componentBuilds];
