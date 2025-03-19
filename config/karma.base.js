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

function determineBrowsers() {
  const supportedBrowsers = ['ChromeHeadless', 'WebkitHeadless', 'Firefox'];

  if (process.env.BROWSERS) {
    const browsers = process.env.BROWSERS.split(',');

    const validBrowsers = browsers.filter(browser =>
      supportedBrowsers.includes(browser)
    );
    if (validBrowsers.length === 0) {
      console.error(
        `The \'BROWSER\' environment variable was set, but no supported browsers were listed. The supported browsers are ${JSON.stringify(
          supportedBrowsers
        )}.`
      );
      return [];
    } else {
      return validBrowsers;
    }
  } else {
    console.log(
      "The 'BROWSER' environment variable is undefined. Defaulting to 'ChromeHeadless'."
    );
    return ['ChromeHeadless'];
  }
}

const config = {
  // disable watcher
  autoWatch: false,

  // Doing 65 seconds to allow for the 20 second firestore tests
  browserNoActivityTimeout: 65000,

  // Preprocess matching files before serving them to the browser.
  // Available preprocessors:
  // https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    'test/**/*.ts': ['webpack', 'sourcemap'],
    'src/**/*.test.ts': ['webpack', 'sourcemap'],
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

  // Browsers to launch for testing
  // To use a custom set of browsers, define the BROWSERS environment variable as a comma-seperated list.
  // Supported browsers are 'ChromeHeadless', 'WebkitHeadless', and 'Firefox'.
  // See: https://karma-runner.github.io/6.4/config/browsers.html
  browsers: determineBrowsers(),

  webpack: webpackTestConfig,

  webpackMiddleware: { quiet: true, stats: { colors: true } },

  // Exit with an exit code of 0 if any of the tests fail.
  singleRun: true,

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

module.exports = config;
