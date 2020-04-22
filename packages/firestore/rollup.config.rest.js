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

import json from 'rollup-plugin-json';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { terser } from 'rollup-plugin-terser';

import { firestoreTransformers, resolveBrowserExterns } from './rollup.shared';

const defaultPlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    clean: true
  }),
  json({ preferConst: true })
];

const mangledPlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    clean: true,
    transformers: firestoreTransformers
  }),
  json({ preferConst: true }),
  terser({
    compress: true,
    output: {
      comments: false,
      beautify: false
    },
    mangle: {
      properties: {
        regex: /^__PRIVATE_/
      }
    }
  })
];

const browserBuilds = [
  {
    input: './rest/index.ts',
    output: {
      file: './rest/dist/index.esm2017.js',
      format: 'es'
    },
    plugins: defaultPlugins,
    external: resolveBrowserExterns,
    treeshake: {
      tryCatchDeoptimization: false
    }
  },
  // {
  //   input: './rest/index.ts',
  //   output: {
  //     file: './rest/dist/index.esm2017.min.js',
  //     format: 'es',
  //     sourcemap: true
  //   },
  //   plugins: mangledPlugins,
  //   external: resolveBrowserExterns
  // }
];

// MARK: Node builds

export default [...browserBuilds];
