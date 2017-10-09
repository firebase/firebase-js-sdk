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
const replace = require('gulp-replace');
const { resolve } = require('path');
const webpackStream = require('webpack-stream');
const webpack = require('webpack');

function compileIntTests() {
  const config = require('../../config/webpack.test');
  return gulp
    .src(
      resolve(__dirname, '../../packages/firestore/test/integration/**/*.ts')
    )
    .pipe(
      replace(
        /import firebase from ('|")[^\1]+firebase_export\1;?/,
        'declare var firebase;'
      )
    )
    .pipe(
      webpackStream(
        Object.assign({}, config, {
          output: {
            filename: 'test-harness.js'
          }
        }),
        webpack
      )
    )
    .pipe(gulp.dest('dist'));
}

gulp.task('compile-tests', compileIntTests);
