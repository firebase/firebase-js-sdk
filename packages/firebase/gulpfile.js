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
var sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');

const pkgJson = require('./package.json');
const files = pkgJson.components.map(component => {
  const componentName = component.replace('/', '-');
  return `firebase-${componentName}.js`;
});
const FIREBASE_APP_URL = `https://www.gstatic.com/firebasejs/${pkgJson.version}/firebase-app.js`;

gulp.task('cdn-type-module-path', function () {
  return (
    gulp
      .src(files)
      .pipe(sourcemaps.init({ loadMaps: true }))
      // gulp-replace doesn't work with gulp-sourcemaps, so no change is made to the existing sourcemap.
      // Therefore the sourcemap become slightly inaccurate
      .pipe(replace(/(['"])@firebase\/app(['"])/g, `$1${FIREBASE_APP_URL}$2`))
      .pipe(replace(/(['"])@firebase\/auth(['"])/g, `$1@unstoppabledomains/firebase-auth$2`))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('.'))
  );
});

//google3 does not allow imports from absolute URLs, so we cannot use the gstatic link
gulp.task('cdn-type-module-path-internal', function () {
  return gulp
    .src(files)
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(replace(/(['"])@firebase\/app(['"])/g, "'./firebase-app.js'"))
    .pipe(replace(/(['"])@firebase\/auth(['"])/g, `$1@unstoppabledomains/firebase-auth$2`))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
});
