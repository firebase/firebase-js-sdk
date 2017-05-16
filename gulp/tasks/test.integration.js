const browserify = require('gulp-browserify');
const buildTasks = require('./build');
const config = require('../config');
const gulp = require('gulp');
const karma = require('karma');
const merge = require('merge2');
const mocha = require('gulp-mocha');
const named = require('vinyl-named');
const ts = require("gulp-typescript");
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const rename = require('gulp-rename');
const tsProject = ts.createProject({
  lib: [
    "es5",
    "es2015",
    "es2015.promise",
    "dom"
  ],
  module: "UMD",
  outDir: "temp/typescript",
  target: "es5",
  rootDir: '.',
  allowJs: true
});

function copyNonCompiledFiles() {
  return gulp.src([
    'tests-integration/bundlers/**/*.js',
    '!tests-integration/bundlers/**/*.test.js',
  ])
  .pipe(gulp.dest('temp/bundlers'));
}

function compileTypescript() {
  const stream = gulp.src('tests-integration/typescript/**/*.ts')
    .pipe(tsProject());
  
  // Return a merged stream
  return merge([
    stream.dts
      .pipe(gulp.dest(`${config.paths.tempDir}/typescript`)),
    stream.js
      .pipe(gulp.dest(`${config.paths.tempDir}/typescript`))
  ]);
};

function compileWebpack() {
  return gulp.src('tests-integration/bundlers/**/*.test.js')
    .pipe(named())
    .pipe(webpackStream())
    .pipe(rename(path => {
      const rawPath = path.basename.replace('.test', '');
      path.basename = `${rawPath}.webpack.test`;
      return path;
    }))
    .pipe(gulp.dest(`${config.paths.tempDir}/bundlers/browser`));
}

function compileBrowserify() {
  return gulp.src('tests-integration/bundlers/**/*.test.js')
    .pipe(named())
    .pipe(browserify())
    .pipe(rename(path => {
      const rawPath = path.basename.replace('.test', '');
      path.basename = `${rawPath}.browserify.test`;
      return path;
    }))
    .pipe(gulp.dest(`${config.paths.tempDir}/bundlers`));
}

function runNodeIntTests() {
  return gulp.src(config.paths.test.integration, { read: false })
    .pipe(mocha({
      reporter: 'spec',
    }));
}

function runBrowserIntTests(done) {
  /**
   * Runs all of the browser binary tests in karma
   */
  const karmaConfig = Object.assign({}, config.karma, {
    // list of files / patterns to load in the browser
    files: [
      './temp/**/*.test.js',
      { pattern: './temp/**/*.js', included: false },
      { pattern: './dist/package/**/*', included: false },
    ],
    
    // list of files to exclude from the included globs above
    exclude: [
      // Don't include node test files
      './temp/**/node/**/*.test.ts',
      './dist/package/**/*.ts'
    ],
    singleRun: true
  });
  new karma.Server(karmaConfig, done).start();
}

const buildIntegrationTests = exports.buildIntegrationTests = gulp.parallel([
  compileTypescript,
  compileWebpack,
  compileBrowserify,
  copyNonCompiledFiles
]);

gulp.task('build:tests', buildIntegrationTests);
gulp.task('test:integration:node', runNodeIntTests);
gulp.task('test:integration:browser', runBrowserIntTests);

const runIntegrationTests = exports.runIntegrationTests = gulp.parallel(runNodeIntTests, runBrowserIntTests);

gulp.task('test:integration', gulp.series(runIntegrationTests));