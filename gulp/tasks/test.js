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
const argv = require('yargs').argv;

function runNodeTest(suite = '**') {
  /**
   * Custom error handler for "No test files found" errors
   */
  return gulp.src([
    `tests/**/${suite}/**/*.test.ts`,
    '!tests/**/browser/**/*.test.ts',
    '!tests/**/binary/**/*.test.ts',
    '!src/firebase-*.ts',
  ], { read: false })
    .pipe(setEnv({
      TS_NODE_PROJECT: 'tsconfig.test.json'
    }))
    .pipe(mocha({
      reporter: 'spec',
      compilers: 'ts:ts-node/register',
      timeout: config.testConfig.timeout,
      retries: config.testConfig.retries
    }))
    .on('error', err => {
      if (err && err.message && ~err.message.indexOf('No test files found')) return;
      throw err;
    });
}

function runBrowserTest(suite = '**') {
  return new Promise((resolve, reject) => {
    const karmaConfig = Object.assign({}, config.karma, {
      // list of files / patterns to load in the browser
      files: [
        `./src/**/*.ts`,
        `./tests/**/${suite}/**/*.ts`
      ],
      
      // list of files to exclude from the included globs above
      exclude: [
        // we don't want this file as it references files that only exist once compiled
        `./src/firebase-*.ts`,

        // We don't want to load the node env
        `./src/utils/nodePatches.ts`,

        // Don't include node test files
        './tests/**/node/**/*.test.ts',

        // Don't include binary test files
        './tests/**/binary/**/*.test.ts',
      ],
    });
    new karma.Server(karmaConfig, exitcode => {
      if (exitcode) return reject(exitcode);
      resolve();
    }).start();
  });
}

function runTests() {
  const suite = argv.suite || '**';
  const env = argv.env || '*';
  console.log(`Values: ${suite}:${env}`);

  switch(env) {
    case 'node': return runNodeTest(suite);
    case 'browser': return runBrowserTest(suite);
    default:
      // Incidentally this works returning a stream and promise value
      return Promise.all([
        runNodeTest(suite),
        runBrowserTest(suite),
      ]);
  }
}

gulp.task('test', runTests);
