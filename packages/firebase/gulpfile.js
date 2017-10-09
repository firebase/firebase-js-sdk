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

const concat = require('gulp-concat');
const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const { resolve } = require('path');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const merge = require('merge2');

function compileWebpack(watch = false) {
  return () =>
    gulp
      .src([
        './app/index.js',
        './auth/index.js',
        './database/index.js',
        './firestore/index.js',
        './messaging/index.js',
        './storage/index.js'
      ])
      .pipe(
        webpackStream(
          {
            watch,
            config: require('./webpack.config')
          },
          webpack
        )
      )
      .pipe(gulp.dest('.'));
}

function concatFiles() {
  return gulp
    .src([
      './firebase-app.js',
      './firebase-auth.js',
      './firebase-database.js',
      './firebase-messaging.js',
      './firebase-storage.js'
    ])
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(concat('firebase.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
}

gulp.task('compile-webpack', compileWebpack());
gulp.task('concat-files', concatFiles);

const buildSdk = gulp.series(compileWebpack(), concatFiles);

gulp.task('build', buildSdk);
gulp.task('watch', () => {
  compileWebpack(true)();
  gulp.watch(
    [
      './firebase-app.js',
      './firebase-auth.js',
      './firebase-database.js',
      './firebase-messaging.js',
      './firebase-storage.js'
    ],
    concatFiles
  );
});
