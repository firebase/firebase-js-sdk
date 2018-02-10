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

const del = require('del');
const gulp = require('gulp');
const replace = require('gulp-replace');
const { resolve } = require('path');
const webpackStream = require('webpack-stream');
const webpack = require('webpack');
const filter = require('gulp-filter');

function clean() {
  return del(['temp/**/*', 'dist/**/*']);
}

function copyTests() {
  /**
   * NOTE: We intentionally don't copy src/ files (to make sure we are only
   * testing the minified client and don't mix in classes loaded from src/).
   * Therefore these tests and helpers cannot have any src/ dependencies.
   */
  const testBase = resolve(__dirname, '../../packages/firestore/test');
  return gulp
    .src(
      [
        testBase + '/integration/api/*.ts',
        testBase + '/integration/util/events_accumulator.ts',
        testBase + '/integration/util/helpers.ts',
        testBase + '/util/equality_matcher.ts',
        testBase + '/util/promise.ts'
      ],
      { base: '../../packages/firestore' }
    )
    .pipe(
      replace(
        /**
         * This regex is designed to match the following statement used in our
         * firestore integration test suites:
         *
         * import firebase from '../../util/firebase_export';
         *
         * It will handle variations in whitespace, single/double quote
         * differences, as well as different paths to a valid firebase_export
         */
        /import\s+firebase\s+from\s+('|")[^\1]+firebase_export\1;?/,
        'declare var firebase;'
      )
    )
    .pipe(
      /**
       * Fixing the project.json require to properly reference the file
       */
      replace(
        '../../../../../config/project.json',
        '../../../../../../config/project.json'
      )
    )
    .pipe(gulp.dest('temp'));
}

function compileWebpack() {
  const config = require('../../config/webpack.test');
  return gulp
    .src('./temp/test/integration/**/*.ts')
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
    .pipe(filter(['**', '!**/*.d.ts']))
    .pipe(gulp.dest('dist'));
}

gulp.task('compile-tests', gulp.series(clean, copyTests, compileWebpack));
