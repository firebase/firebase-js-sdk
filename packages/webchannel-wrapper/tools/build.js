/**
 * @license
 * Copyright 2017 Google Inc.
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

const closureBuilder = require('closure-builder');
const rollup = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const hypothetical = require('rollup-plugin-hypothetical');

const glob = closureBuilder.globSupport();
const { resolve } = require('path');

// commonjs build
closureBuilder.build({
  name: 'firebase.webchannel.wrapper',
  srcs: glob([resolve(__dirname, '../src/**/*.js')]),
  externs: [resolve(__dirname, '../externs/overrides.js')],
  out: 'dist/index.js',
  options: {
    closure: {
      output_wrapper:
        "(function() {%output%}).call(typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {})",
      language_out: 'ECMASCRIPT5',
      compilation_level: 'ADVANCED',
      // Avoid unsafe eval() calls (https://github.com/firebase/firebase-js-sdk/issues/798)
      define: 'goog.json.USE_NATIVE_JSON=true'
    }
  }
});

// esm build
closureBuilder.build(
  {
    name: 'firebase.webchannel.wrapper',
    srcs: glob([resolve(__dirname, '../src/**/*.js')]),
    externs: [resolve(__dirname, '../externs/overrides.js')],
    options: {
      closure: {
        language_out: 'ECMASCRIPT5',
        compilation_level: 'ADVANCED',
        // Avoid unsafe eval() calls (https://github.com/firebase/firebase-js-sdk/issues/798)
        define: 'goog.json.USE_NATIVE_JSON=true'
      }
    }
  },
  async function(errors, warnings, files, results) {
    const filePath = resolve(__dirname, '../src/index.js');
    const inputOptions = {
      input: filePath,
      plugins: [
        commonjs(),
        hypothetical({
          files: {
            [filePath]: results // use the compiled code from memory
          }
        })
      ]
    };

    const outputOptions = {
      file: 'dist/index.esm.js',
      format: 'es'
    };

    const bundle = await rollup.rollup(inputOptions);
    return bundle.write(outputOptions);
  }
);
