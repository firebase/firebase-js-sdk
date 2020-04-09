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

const gulp = require('gulp');
const rollup = require('rollup');
const closureCompiler = require('google-closure-compiler').gulp();
const del = require('del');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const { resolve } = require('path');
const commonjs = require('rollup-plugin-commonjs');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');

// The optimization level for the JS compiler.
// Valid levels: WHITESPACE_ONLY, SIMPLE_OPTIMIZATIONS, ADVANCED_OPTIMIZATIONS.
// TODO: Add ability to pass this in as a flag.
const OPTIMIZATION_LEVEL = 'ADVANCED_OPTIMIZATIONS';

// For minified builds, wrap the output so we avoid leaking global variables.
// For minified builds, wrap the output so we avoid leaking global variables.
const CJS_WRAPPER_PREFIX = `(function() {var firebase = require('@firebase/app').default;`;
const CJS_WRAPPER_SUFFIX =
  `}).apply(typeof global !== 'undefined' ? ` +
  `global : typeof self !== 'undefined' ? ` +
  `self : typeof window !== 'undefined' ? window : {});`;

const closureLibRoot = path.dirname(
  require.resolve('google-closure-library/package.json')
);

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

/**
 * Builds the core Firebase-auth JS.
 * @param {string} filename name of the generated file
 * @param {string} prefix prefix to the compiled code
 * @param {string} suffix suffix to the compiled code
 */
function createBuildTask(filename, prefix, suffix) {
  return function closureBuild () {
    return gulp
      .src(
        [
          `${closureLibRoot}/closure/goog/**/*.js`,
          `${closureLibRoot}/third_party/closure/goog/**/*.js`,
          'src/**/*.js'
        ],
        { base: '.' }
      )
      .pipe(sourcemaps.init())
      .pipe(
        closureCompiler({
          js_output_file: filename,
          output_wrapper: `${prefix}%output%${suffix}`,
          entry_point: 'firebase.webchannel.wrapper',
          compilation_level: OPTIMIZATION_LEVEL,
          externs: [
            resolve(__dirname, './externs/overrides.js'),
            resolve(__dirname, './externs/module.js')
          ],
          language_out: 'ES5',
          dependency_mode: 'PRUNE',
          define: closureDefines
          // process_common_js_modules: true,
          // module_resolution: 'NODE'
        })
      )
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('dist'));
  }
}

function createRollupTask(inputPath) {
  return async function rollupBuild() {
    console.log('inputPath', inputPath);
    const inputOptions = {
      input: inputPath,
      plugins: [rollupSourcemaps(), commonjs()]
    };

    const outputOptions = {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    };

    const bundle = await rollup.rollup(inputOptions);
    return bundle.write(outputOptions);
  };
}

async function deleteIntermediateFiles() {
  await del('dist/temp');
}

// commonjs build
const cjsBuild = createBuildTask(
  'index.js',
  CJS_WRAPPER_PREFIX,
  CJS_WRAPPER_SUFFIX
);
gulp.task('cjs', cjsBuild);

// esm build
const intermediateEsmFile = 'temp/esm.js';
const intermediateEsmPath = resolve(__dirname, 'dist/', intermediateEsmFile);
const esmBuild = createBuildTask(
  intermediateEsmFile, '', ''
);
const rollupTask = createRollupTask(intermediateEsmPath);
gulp.task(
  'esm',
  gulp.series(esmBuild, rollupTask, deleteIntermediateFiles)
);

// Deletes intermediate files.
gulp.task('clean', done => del([resolve(__dirname, intermediateEsmFile)], done));

gulp.task('default', gulp.parallel('cjs', 'esm'));
