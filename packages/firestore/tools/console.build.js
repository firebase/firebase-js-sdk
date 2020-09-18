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
const { uglify } = require('rollup-plugin-uglify');
const fs = require('fs');
const util = require('util');
const fs_writeFile = util.promisify(fs.writeFile);

const rollupUtil = require('../rollup.shared');

const EXPORTNAME = '__firestore_exports__';

const esm2017OutputFile = 'dist/standalone.esm2017.js';
const esm5OutputFile = 'dist/standalone.js';

const es2017InputOptions = {
  input: 'index.console.ts',
  plugins: rollupUtil.es2017Plugins('browser', /* mangled= */ true),
  external: rollupUtil.resolveBrowserExterns,
  treeshake: {
    moduleSideEffects: false
  }
};

const es2017OutputOptions = {
  file: esm2017OutputFile,
  format: 'es'
};

const es2017toEs5InputOptions = {
  input: esm2017OutputFile,
  plugins: [
    ...rollupUtil.es2017ToEs5Plugins(/* mangled= */ true),
    uglify({
      output: {
        ascii_only: true // escape unicode chars
      }
    })
  ],
  external: rollupUtil.resolveBrowserExterns,
  treeshake: {
    moduleSideEffects: false
  }
};

const es2017toEs5OutputOptions = {
  file: esm5OutputFile,
  name: EXPORTNAME,
  format: 'iife'
};

const PREFIX = `
goog.module('firestore');
exports = eval(`;

const POSTFIX = ` + '${EXPORTNAME};');`;

async function build() {
  // Create an ES2017 bundle
  const es2017Bundle = await rollup.rollup(es2017InputOptions);
  await es2017Bundle.write(es2017OutputOptions);

  // Transpile down to ES5
  const es5Bundle = await rollup.rollup(es2017toEs5InputOptions);
  const {
    output: [{ code }]
  } = await es5Bundle.generate(es2017toEs5OutputOptions);

  const output = `${PREFIX}${JSON.stringify(String(code))}${POSTFIX}`;
  await fs_writeFile(es2017toEs5OutputOptions.file, output, 'utf-8');
}

build();
