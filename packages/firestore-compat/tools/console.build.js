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

/**
 * Firebase console uses firestore in its special way.
 * This file creates a build target for it.
 */
const rollup = require('rollup');
const { uglify } = require('rollup-plugin-uglify');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const typescriptPlugin = require('rollup-plugin-typescript2');
const typescript = require('typescript');
const json = require('@rollup/plugin-json');
const fs = require('fs');
const util = require('util');
const fs_writeFile = util.promisify(fs.writeFile);
const rollupUtil = require('../../firestore/rollup.shared');

const EXPORTNAME = '__firestore_exports__';
const OUTPUT_FOLDER = 'dist';
const OUTPUT_FILE = 'standalone.js';

const es5InputOptions = {
  input: 'src/index.console.ts',
  plugins: [
    nodeResolve(),
    typescriptPlugin({
      typescript,
      transformers: [rollupUtil.removeAssertTransformer]
    }),
    json({ preferConst: true }),
    uglify({
      output: {
        ascii_only: true // escape unicode chars
      }
    })
  ]
}

const es5OutputOptions = {
  file: `${OUTPUT_FOLDER}/${OUTPUT_FILE}`,
  name: EXPORTNAME,
  format: 'iife'
};

const PREFIX = `
goog.module('firestore');
exports = eval(`;

const POSTFIX = ` + '${EXPORTNAME};');`;

async function build() {
  const es5Bundle = await rollup.rollup(es5InputOptions);
  const {
    output: [{ code }]
  } = await es5Bundle.generate(es5OutputOptions);

  const output = `${PREFIX}${JSON.stringify(String(code))}${POSTFIX}`;

  if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER);
  }

  await fs_writeFile(es5OutputOptions.file, output, 'utf-8');
}

build();
