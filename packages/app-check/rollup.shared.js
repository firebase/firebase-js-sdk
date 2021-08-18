/**
 * @license
 * Copyright 2021 Google LLC
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
import pkg from './package.json';

const deps = [
  ...Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies)),
  '@firebase/app'
];

export const es5BuildsNoPlugin = [
  /**
   * Browser Builds
   */
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.main, format: 'cjs', sourcemap: true },
      { file: pkg.esm5, format: 'es', sourcemap: true }
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

/**
 * ES2017 Builds
 */
export const es2017BuildsNoPlugin = [
  {
    /**
     * Browser Build
     */
    input: 'src/index.ts',
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];
