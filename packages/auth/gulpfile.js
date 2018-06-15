/**
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
const closureCompiler = require('gulp-closure-compiler');
const del = require('del');
const express = require('express');
const path = require('path');
const { through } = require('event-stream');
const File = require('vinyl');

// The optimization level for the JS compiler.
// Valid levels: WHITESPACE_ONLY, SIMPLE_OPTIMIZATIONS, ADVANCED_OPTIMIZATIONS.
// TODO: Add ability to pass this in as a flag.
const OPTIMIZATION_LEVEL = 'ADVANCED_OPTIMIZATIONS';

// For minified builds, wrap the output so we avoid leaking global variables.
const CJS_WRAPPER_PREFIX =
    `(function() {var firebase = require('@firebase/app').default;`;
const EMS_WRAPPER_PREFIX = `import firebase from '@firebase/app';(function() {`;
const WRAPPER_SUFFIX =
    `}).call(typeof global !== 'undefined' ? ` +
    `global : typeof self !== 'undefined' ? ` +
    `self : typeof window !== 'undefined' ? window : {});`;

/*
 * Re-emits file variations surrounding a content of an input file with
 * CommonJS and EcmaScript modules wrappers.
 */
const wrap = through(function(file) {
  const makeFile = (prefix, path) =>
    new File({
      path,
      contents: Buffer.concat([
        Buffer.from(prefix),
        file.contents,
        Buffer.from(WRAPPER_SUFFIX)
      ])
    });

  this.emit('data', makeFile(CJS_WRAPPER_PREFIX, 'auth.js'));
  this.emit('data', makeFile(EMS_WRAPPER_PREFIX, 'auth.esm.js'));
});

// The path to Closure Compiler.
const COMPILER_PATH = `${path.dirname(
    require.resolve('google-closure-compiler/package.json')
)}/compiler.jar`;

const closureLibRoot = path.dirname(
    require.resolve('google-closure-library/package.json')
);

// Builds the core Firebase-auth JS.
const buildFirebaseAuth = () =>
  gulp
    .src([
      `${closureLibRoot}/closure/goog/**/*.js`,
      `${closureLibRoot}/third_party/closure/goog/**/*.js`,
      'src/**/*.js'
    ])
    .pipe(
        closureCompiler({
          compilerPath: COMPILER_PATH,
          fileName: 'unwrapped.js',
          compilerFlags: {
            closure_entry_point: 'fireauth.exports',
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
          }
        })
    )
    .pipe(wrap)
    .pipe(gulp.dest('dist'));

gulp.task('build-firebase-auth-js', buildFirebaseAuth);

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

gulp.task('default', buildFirebaseAuth);
