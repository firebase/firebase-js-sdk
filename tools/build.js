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
const merge = require('merge2');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');

function buildCjs(root = '') {
  return function buildCjsBundle() {
    const tsProject = ts.createProject(path.resolve(root, 'tsconfig.json'));
    const tsResult = tsProject
      .src()
      .pipe(sourcemaps.init())
      .pipe(tsProject());

    const jsPipe = tsResult.js
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('dist/cjs'));
    const dtsPipe = tsResult.dts.pipe(gulp.dest('dist/cjs'));

    return merge([jsPipe, dtsPipe]);
  };
}

function buildEsm(root = '') {
  return function buildEsmBundle() {
    const tsProject = ts.createProject(path.resolve(root, 'tsconfig.json'), {
      module: 'esnext'
    });
    const tsResult = tsProject
      .src()
      .pipe(sourcemaps.init())
      .pipe(tsProject());

    const jsPipe = tsResult.js
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('dist/esm'));
    const dtsPipe = tsResult.dts.pipe(gulp.dest('dist/esm'));

    return merge([jsPipe, dtsPipe]);
  };
}

exports.buildCjs = buildCjs;
exports.buildEsm = buildEsm;
