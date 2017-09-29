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
const through2 = require('through2');

function buildModule() {
  return gulp
    .src('src/auth.js')
    .pipe(
      through2.obj(function(file, encoding, callback) {
        file.contents = Buffer.concat([
          new Buffer(
            `var firebase = require('@firebase/app').default; (function(){`
          ),
          file.contents,
          new Buffer(
            `}).call(typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {});`
          )
        ]);

        return callback(null, file);
      })
    )
    .pipe(gulp.dest('dist'));
}

gulp.task('build', buildModule);
