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

import tmp from 'tmp';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';

import pkg from './package.json';

// This rollup configuration creates a single non-minified build for browser
// testing. You can test code changes by running `yarn build:debug`. This
// creates the file "dist/index.esm2017.js" that you can use in your sample
// app as a replacement for
// "node_modules/@firebase/firestore/dist/index.esm2017.js".

const browserPlugins = function () {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      cacheDir: tmp.dirSync(),
      clean: true,
      abortOnError: true
    }),
    json({ preferConst: true })
  ];
};

const aliasConfig = {
  entries: [
    {
      find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
      replacement: `$1\/platform/browser/$2.ts`
    }
  ]
};

const browserDeps = [
  ...Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies)),
  '@firebase/app'
];

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm2017.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(aliasConfig), ...browserPlugins()],
    external: id => {
      return [...browserDeps, '@firebase/firestore'].some(
        dep => id === dep || id.startsWith(`${dep}/`)
      );
    },
    treeshake: {
      moduleSideEffects: false
    }
  }
];
