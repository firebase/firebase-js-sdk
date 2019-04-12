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
const closureCompiler = require('google-closure-compiler').gulp();
const del = require('del');
const express = require('express');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');

// The optimization level for the JS compiler.
// Valid levels: WHITESPACE_ONLY, SIMPLE_OPTIMIZATIONS, ADVANCED_OPTIMIZATIONS.
// TODO: Add ability to pass this in as a flag.
const OPTIMIZATION_LEVEL = 'ADVANCED_OPTIMIZATIONS';

// For minified builds, wrap the output so we avoid leaking global variables.
const CJS_WRAPPER_PREFIX =
  `(function() {var firebase = require('@firebase/app').default;`;
const ESM_WRAPPER_PREFIX = `import firebase from '@firebase/app';(function() {`;
const WRAPPER_SUFFIX =
  `}).apply(typeof global !== 'undefined' ? ` +
  `global : typeof self !== 'undefined' ? ` +
  `self : typeof window !== 'undefined' ? window : {});`;

const closureLibRoot = path.dirname(
  require.resolve('google-closure-library/package.json')
);

/**
 * Builds the core Firebase-auth JS.
 * @param {string} filename name of the generated file
 * @param {string} prefix prefix to the compiled code
 * @param {string} suffix suffix to the compiled code
 */
function createBuildTask(filename, prefix, suffix) {
  return () =>
    gulp
      .src([
        `${closureLibRoot}/closure/goog/**/*.js`,
        `${closureLibRoot}/third_party/closure/goog/**/*.js`,
        'src/**/*.js'
      ], { base: '.' })
      .pipe(sourcemaps.init())
      .pipe(
        closureCompiler({
          js_output_file: filename,
          output_wrapper: `${prefix}%output%${suffix}`,
          entry_point: 'fireauth.exports',
          compilation_level: OPTIMIZATION_LEVEL,
          externs: [
            'externs/externs.js',
            'externs/grecaptcha.js',
            'externs/gapi.iframes.js',
            path.resolve(
              __dirname,
              '../firebase/externs/firebase-app-externs.js'
            ),
            path.resolve(
              __dirname,
              '../firebase/externs/firebase-error-externs.js'
            ),
            path.resolve(
              __dirname,
              '../firebase/externs/firebase-app-internal-externs.js'
            )
          ],
          language_out: 'ES5',
          only_closure_dependencies: true
        })
      )
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('dist'));
}

// commonjs build
const cjsBuild = createBuildTask('auth.js', CJS_WRAPPER_PREFIX, WRAPPER_SUFFIX);
gulp.task('cjs', cjsBuild);

// esm build
const esmBuild = createBuildTask('auth.esm.js', ESM_WRAPPER_PREFIX, WRAPPER_SUFFIX);
gulp.task('esm', esmBuild);

// build without wrapper
const unwrappedBuild = createBuildTask('unwrapped.js', '', '');
gulp.task('build-firebase-auth-js', unwrappedBuild);

// Deletes intermediate files.
gulp.task('clean', done => del(['dist/*', 'dist'], done));

// Creates a webserver that serves all files from the root of the package.
gulp.task('serve', () => {
  const app = express();

  app.use(
    '/node_modules',
    express.static(path.resolve(__dirname, '../../node_modules'))
  );
  app.use(express.static(__dirname));

  app.listen(4000);
});

gulp.task('default', gulp.parallel('cjs', 'esm'));
