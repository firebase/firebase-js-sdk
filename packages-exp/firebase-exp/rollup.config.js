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
import json from '@rollup/plugin-json';
import pkg from './package.json';
import { resolve } from 'path';
import resolveModule from '@rollup/plugin-node-resolve';
import rollupTypescriptPlugin from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';
import typescript from 'typescript';

const external = Object.keys(pkg.dependencies || {});
const plugins = [sourcemaps(), resolveModule(), json(), commonjs()];

const typescriptPlugin = rollupTypescriptPlugin({
  typescript
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
      }
    ];
  })
  .reduce((a, b) => a.concat(b), []);

export default [...appBuilds, ...componentBuilds];
