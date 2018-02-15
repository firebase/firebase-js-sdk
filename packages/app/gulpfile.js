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
const { resolve } = require('path');
const replace = require('gulp-replace');
const sourcemaps = require('gulp-sourcemaps');
const tools = require('../../tools/build');

function postProcess() {
  return gulp
    .src(resolve(__dirname, 'dist/**/*.js'), { base: '.' })
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(
      replace('${JSCORE_VERSION}', require('../firebase/package.json').version)
    )
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
}

const buildModule = gulp.series(
  gulp.parallel([tools.buildCjs(__dirname), tools.buildEsm(__dirname)]),
  postProcess
);

const setupWatcher = () => {
  gulp.watch(['./index.ts', 'src/**/*'], buildModule);
};

gulp.task('build', buildModule);

gulp.task('dev', gulp.parallel([setupWatcher]));
