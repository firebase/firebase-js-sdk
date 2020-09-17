/**
 * @license
 * Copyright 2019 Google LLC
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
const typescriptPlugin = require('rollup-plugin-typescript2');
const typescript = require('typescript');
const json = require('rollup-plugin-json');
const alias = require('@rollup/plugin-alias');
const resolve = require('rollup-plugin-node-resolve');
const { uglify } = require('rollup-plugin-uglify');
const fs = require('fs');
const util = require('util');
const fs_writeFile = util.promisify(fs.writeFile);

const rollupUtil = require('../rollup.shared');

const plugins = [
  alias(rollupUtil.generateAliasConfig('browser')),
  resolve(),
  typescriptPlugin({
    typescript
  }),
  json(),
  uglify({
    output: {
      ascii_only: true // escape unicode chars
    }
  })
];

const EXPORTNAME = '__firestore_exports__';

const inputOptions = {
  input: 'index.console.ts',
  plugins
};
const outputOptions = {
  file: 'dist/standalone.js',
  name: EXPORTNAME,
  format: 'iife'
};

const PREFIX = `
goog.module('firestore');
exports = eval(`;

const POSTFIX = ` + '${EXPORTNAME};');`;

async function build() {
  // create a bundle
  const bundle = await rollup.rollup(inputOptions);

  // generate code
  const {
    output: [{ code }]
  } = await bundle.generate(outputOptions);

  const output = `${PREFIX}${JSON.stringify(String(code))}${POSTFIX}`;

  await fs_writeFile(outputOptions.file, output, 'utf-8');
}

build();
