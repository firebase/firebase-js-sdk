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
