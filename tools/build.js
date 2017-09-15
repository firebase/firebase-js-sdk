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
