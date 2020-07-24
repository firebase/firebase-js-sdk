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

import * as yargs from 'yargs';
import { rollup } from 'rollup';

const typescriptPlugin = require('rollup-plugin-typescript2');
const alias = require('@rollup/plugin-alias');
const json = require('rollup-plugin-json');

import {
  removeAssertTransformer,
  resolveNodeExterns,
  generateAliasConfig
} from '../rollup.shared';

const argv = yargs.options({
  input: {
    type: 'string',
    demandOption: true,
    desc: 'The location of the index.ts file'
  },
  output: {
    type: 'string',
    demandOption: true,
    desc: 'The location for the transpiled JavaScript bundle'
  }
}).argv;

/**
 * Builds an ESM bundle for the Typescript file at `index` and writes it the
 * file located at `output`.
 *
 * This is used in the `gendeps` build and does not minify or mangle property
 * names.
 */
async function buildBundle(input: string, output: string): Promise<void> {
  const bundle = await rollup({
    input,
    plugins: [
      alias(generateAliasConfig('node')),
      typescriptPlugin({
        tsconfigOverride: {
          compilerOptions: {
            target: 'es2017'
          }
        },
        transformers: removeAssertTransformer
      }),
      json({ preferConst: true })
    ],
    external: resolveNodeExterns
  });
  await bundle.write({ file: output, format: 'es' });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
buildBundle(argv.input, argv.output);
