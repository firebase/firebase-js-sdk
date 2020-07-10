/**
 * @license
 * Copyright 2020 Google LLC
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

var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');

const OUTPUT_FILE = 'firebase.js';
const pkgJson = require('./package.json');
const files = [
  ...pkgJson.components.map(component => `firebase-${component}.js`)
];

gulp.task('firebase-js', function () {
  return gulp
    .src(files)
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(concat(OUTPUT_FILE))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
});
