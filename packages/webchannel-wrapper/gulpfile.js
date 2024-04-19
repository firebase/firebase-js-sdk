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

const gulp = require('gulp');
const concat = require('gulp-concat');

// A task to distribute bloom blobs into 'dist'
gulp.task('distributeBloomBlobs', () => {
  return gulp
    .src('closure-net/firebase/bloom_blob_*')
    .pipe(gulp.dest('dist/bloom-blob/'));
});

// A task to distribute bloom blobs into 'dist'
gulp.task('distributeWebChannelBlobs', () => {
  return gulp
    .src('closure-net/firebase/webchannel_blob_*')
    .pipe(gulp.dest('dist/webchannel-blob/'));
});

// A task to concatenate typings of all blobs into 'dist'
gulp.task('createAllTypings', () => {
  return gulp
    .src([
      'closure-net/firebase/bloom_blob_types.d.ts',
      'closure-net/firebase/webchannel_blob_types.d.ts'
    ])
    .pipe(concat('types.d.ts'))
    .pipe(gulp.dest('dist/'));
});

gulp.task(
  'default',
  gulp.series(
    'distributeBloomBlobs',
    'distributeWebChannelBlobs',
    'createAllTypings'
  )
);
