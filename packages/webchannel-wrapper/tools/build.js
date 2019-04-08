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
const sourcemaps = require('rollup-plugin-sourcemaps');

const glob = closureBuilder.globSupport();
const { resolve } = require('path');
const { tmpdir } = require('os');

const closureDefines = [
  // Avoid unsafe eval() calls (https://github.com/firebase/firebase-js-sdk/issues/798)
  'goog.json.USE_NATIVE_JSON=true',
  // Disable debug logging (saves 8780 bytes).
  'goog.DEBUG=false',
  // Disable fallbacks for running async code (saves 1472 bytes).
  'goog.ASSUME_NATIVE_PROMISE=true',
  // Disables IE8-specific event fallback code (saves 523 bytes).
  'goog.events.CAPTURE_SIMULATION_MODE=0',
  // Disable IE-Specific ActiveX fallback for XHRs (saves 524 bytes).
  'goog.net.XmlHttpDefines.ASSUME_NATIVE_XHR=true'
];

// commonjs build
closureBuilder.build({
  name: 'firebase.webchannel.wrapper',
  srcs: glob([resolve(__dirname, '../src/**/*.js')]),
  externs: [resolve(__dirname, '../externs/overrides.js')],
  out: 'dist/index.js',
  out_source_map: 'dist/index.js.map',
  options: {
    closure: {
      output_wrapper:
        "(function() {%output%}).call(typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {})\n//# sourceMappingURL=index.js.map",
      language_out: 'ECMASCRIPT5',
      compilation_level: 'ADVANCED',
      define: closureDefines
    }
  }
});

// esm build
// We write the closure output to a temp file and then re-compile it with rollup.
const filePath = `${tmpdir()}/index.js`;
closureBuilder.build(
  {
    name: 'firebase.webchannel.wrapper',
    srcs: glob([resolve(__dirname, '../src/**/*.js')]),
    externs: [resolve(__dirname, '../externs/overrides.js')],
    out: filePath,
    out_source_map: `${filePath}.map`,
    options: {
      closure: {
        output_wrapper: '%output%\n//# sourceMappingURL=index.js.map',
        language_out: 'ECMASCRIPT5',
        compilation_level: 'ADVANCED',
        define: closureDefines
      }
    }
  },
  async function() {
    const inputOptions = {
      input: filePath,
      plugins: [sourcemaps(), commonjs()]
    };

    const outputOptions = {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    };

    const bundle = await rollup.rollup(inputOptions);
    return bundle.write(outputOptions);
  }
);
