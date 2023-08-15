/**
 * @license
 * Copyright 2017 Google LLC
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

const karma = require('karma');
const path = require('path');
const webpackTestConfig = require('./webpack.test');
const { argv } = require('yargs');

const config = {
  // disable watcher
  autoWatch: false,

  // Doing 65 seconds to allow for the 20 second firestore tests
  browserNoActivityTimeout: 65000,

  // preprocess matching files before serving them to the browser
  // available preprocessors:
  // https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    'test/**/*.ts': ['webpack', 'sourcemap'],
    'src/**/*.test.ts': ['webpack', 'sourcemap']
  },

  mime: { 'text/x-typescript': ['ts', 'tsx'] },

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['mocha', 'coverage-istanbul'],

  // web server port
  port: 8089,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN
  // || config.LOG_INFO || config.LOG_DEBUG
  logLevel: karma.constants.LOG_INFO,

  // enable / disable watching file and executing tests whenever any file
  // changes
  autoWatch: false,

  // start these browsers
  // available browser launchers:
  // https://npmjs.org/browse/keyword/karma-launcher
  browsers: process.env?.BROWSERS?.split(',') ?? ['ChromeHeadless'],

  webpack: webpackTestConfig,

  webpackMiddleware: { quiet: true, stats: { colors: true } },

  singleRun: false,

  client: {
    mocha: {
      opts: `${__dirname}/mocha.browser.opts`
    },

    // Pass through --grep option to filter the tests that run.
    args: argv.grep ? ['--grep', argv.grep] : []
  },

  coverageIstanbulReporter: {
    dir: path.resolve(process.cwd(), 'coverage/browser/%browser%'),
    fixWebpackSourcePaths: true,
    reports: ['html', 'lcovonly']
  }
};

config.mochaReporter = {
  showDiff: true
};
// Make it easy to spot failed tests in CI
if (process.env.CI) {
  config.mochaReporter = {
    output: 'minimal'
  };
}

module.exports = config;
