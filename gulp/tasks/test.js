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
const mocha = require('gulp-mocha');
const setEnv = require('gulp-env').set;
const karma = require('karma');
const config = require('../config');
const buildTasks = require('./build');
const integrationTests = require('./test.integration');
const globalKarmaConf = require('../../karma.conf.js')

/**
 * Runs all of the node unit tests
 */
function runNodeUnitTests() {
  const envs = setEnv({
    TS_NODE_PROJECT: 'tsconfig.test.json'
  });
  return gulp.src(config.paths.test.unit, { read: false })
    .pipe(envs)
    .pipe(mocha({
      reporter: 'spec',
      compilers: 'ts:ts-node/register'
    }));
}

/**
 * Runs all of the browser unit tests in karma
 */
function runBrowserUnitTests(dev = false) {
  return done => {
    const karmaConfig = Object.assign({}, globalKarmaConf, {
      // list of files / patterns to load in the browser
      files: [
        './+(src|tests)/**/*.ts'
      ],
      
      // list of files to exclude from the included globs above
      exclude: [
        // we don't want this file as it references files that only exist once compiled
        `./src/firebase.ts`,

        // Don't include node test files
        './tests/**/node/**/*.test.ts',

        // Don't include binary test files
        './tests/**/binary/**/*.test.ts',
      ],

      browsers: dev ? [ 'Chrome' ] : globalKarmaConf.browsers
    });
    new karma.Server(karmaConfig, exitCode => {
      if (dev) return done();
      done(exitCode);
    }).start();
  };
}

/**
 * Runs all of the node binary tests
 */
function runNodeBinaryTests() {
  const envs = setEnv({
    TS_NODE_PROJECT: 'tsconfig.test.json'
  });
  return gulp.src(config.paths.test.binary, { read: false })
    .pipe(envs)
    .pipe(mocha({
      reporter: 'spec',
      compilers: 'ts:ts-node/register'
    }));
}

/**
 * Runs all of the browser binary tests in karma
 */
function runBrowserBinaryTests(done) {
  const karmaConfig = Object.assign({}, globalKarmaConf, {
    // list of files / patterns to load in the browser
    files: [
      './dist/browser/firebase.js',
      './tests/**/binary/**/*.ts',
      './tests/**/utils/**/*.ts'
    ],
    
    // list of files to exclude from the included globs above
    exclude: [
      // Don't include node test files
      './tests/**/node/**/*.test.ts',
    ],
  });
  new karma.Server(karmaConfig, done).start();
}

/**
 * Runs both the unit and binary tests in karma
 */
function runAllKarmaTests(done) {
  const karmaConfig = Object.assign({}, globalKarmaConf, {
    // list of files / patterns to load in the browser
    files: [
      './dist/browser/firebase.js',
      './+(src|tests)/**/*.ts'
    ],
    
    // list of files to exclude from the included globs above
    exclude: [
      // we don't want this file as it references files that only exist once compiled
      `./src/firebase.ts`,

      // Don't include node test files
      './tests/**/node/**/*.test.ts',
    ],
  });
  new karma.Server(karmaConfig, done).start();
}

gulp.task('test:unit:node', runNodeUnitTests);
gulp.task('test:unit:browser', runBrowserUnitTests());

const unitTestSuite = gulp.parallel(runNodeUnitTests, runBrowserUnitTests());
gulp.task('test:unit', unitTestSuite);

gulp.task('test:binary:browser', runBrowserBinaryTests);
gulp.task('test:binary:node', runNodeBinaryTests);

const binaryValidationSuite = gulp.parallel(runBrowserBinaryTests, runNodeBinaryTests);
gulp.task('test:binary', binaryValidationSuite);

gulp.task('test', gulp.parallel([
  runNodeUnitTests,
  runNodeBinaryTests,
  runAllKarmaTests
]));

exports.runBrowserUnitTests = runBrowserUnitTests;