const concat = require('gulp-concat');
const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const { resolve } = require('path');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const merge = require('merge2');

function compileWebpack(watch = false) {
  return () => gulp.src([
    './app/index.js',
    './auth/index.js',
    './database/index.js',
    './firestore/index.js',
    './messaging/index.js',
    './storage/index.js'
  ])
    .pipe(webpackStream({
      watch,
      config: require('./webpack.config')
    }, webpack))
    .pipe(gulp.dest('.'));
}

function concatFiles() {
  return gulp.src([
    './firebase-app.js',
    './firebase-auth.js',
    './firebase-database.js',
    './firebase-messaging.js',
    './firebase-storage.js',
  ])
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(concat('firebase.js'))
  .pipe(sourcemaps.write())
  .pipe(gulp.dest('.'));
}

gulp.task('compile-webpack', compileWebpack());
gulp.task('concat-files', concatFiles);

const buildSdk = gulp.series(compileWebpack(), concatFiles);

gulp.task('build', buildSdk);
gulp.task('watch', () => {
    compileWebpack(true)(),
    gulp.watch([
      './firebase-app.js',
      './firebase-auth.js',
      './firebase-database.js',
      './firebase-messaging.js',
      './firebase-storage.js',
    ], concatFiles);
});
