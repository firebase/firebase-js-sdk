/**
 * @license
 * Copyright 2022 Google LLC
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

/**
 * Specialized config only for internal deployment to google3 repo, adds required license header to
 * generated code.
 */

// When run in google3, original rollup.config.js will have been renamed to rollup-main.config.js.
import { cdnBuilds, plugins } from './rollup.config.js';
import license from 'rollup-plugin-license';
import typescript from 'typescript';
import rollupTypescriptPlugin from 'rollup-plugin-typescript2';
import dts from 'rollup-plugin-dts';
import { parse } from 'path';

const typescriptPluginCustom = rollupTypescriptPlugin({
  typescript,
  allowJs: true,
  include: ['*.ts', '**/*.ts', '*.js', '**/*.js'],
  tsconfigOverride: {
    compilerOptions: {
      declaration: true
    }
  }
});

const firebaseLicense = license({
  banner: `@license
  Copyright ${new Date().getFullYear()} Google LLC.
  SPDX-License-Identifier: Apache-2.0`
});

const buildsWithLicense = cdnBuilds.map(build => {
  return Object.assign({}, build, {
    plugins: build.plugins.concat(firebaseLicense)
  });
});

/**
 * Custom builds that include combinations of multiple products.
 */
const customBuilds = [
  { inputFile: 'custom/index.all.ts', outputFile: 'firebase.js' },
  {
    inputFile: 'custom/analytics-remote-config.ts',
    outputFile: 'firebase-analytics-rc.js'
  }
]
  .map(build => {
    const { dir, name } = parse(build.inputFile);
    console.log(`${dir}/${name}.d.ts`);
    console.log(`dist/${name}.global.d.ts`);
    return [
      {
        input: build.inputFile,
        output: {
          file: build.outputFile,
          sourcemap: true,
          format: 'es'
        },
        plugins: [...plugins, typescriptPluginCustom, firebaseLicense]
      },
      {
        input: `${dir}/${name}.d.ts`,
        output: {
          file: `dist/${name}.global.d.ts`,
          format: 'es'
        },
        plugins: [
          dts({
            respectExternal: true
          })
        ]
      }
    ];
  }).flat();

  console.log(customBuilds.length);

export default [/*...buildsWithLicense,*/ ...customBuilds];
