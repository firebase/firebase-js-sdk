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
  const supportedBrowsers = ['ChromeHeadless', 'Safari', 'Firefox'];

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
    }

    if (browsers.includes('Safari') && process.platform !== 'darwin') {
      console.error(
        "The 'BROWSER' environment variable includes 'Safari', which is not supported on this platform. The only supported platform is darwin."
      );
      return [];
    }

    if (browsers.includes('Safari')) {
      console.log(
        "\x1b[38;2;255;165;0mSafari browser testing has been enabled. This requires Full Disk Access be granted to the executor. To grant Full Disk Access on macOS > 13, visit 'System Settings' > 'Privacy & Security' > 'Full Disk Access'.\x1b[0m"
      ); // Log in orange
    }

    return validBrowsers;
  } else {
    /**
     * By default we only run the Chrome tests locally since the Safari launcher has some quirks
     * that make local testing annoying:
     *  - Tabs from previous test runs are restored, causing the tests to be ran once on each tab.
     *    To prevent this, Safari has to be manually re-opened and then quit after every test run.
     *  - Full Disk Access has to be manually enabled
     *
     * Running the browser tests in Chrome should catch most browser bugs. If that's not the case,
     * the bugs will be caught when the browser tests are ran on Safari in CI.
     */
    console.log(
      "The 'BROWSER' environment variable is undefined. Defaulting to 'ChromeHeadless'."
    );
    return ['ChromeHeadless'];
  }
}

const config = {
  // See: https://karma-runner.github.io/6.4/config/plugins.html#loading-plugins
  plugins: [
    // We use our own custom Safari launcher plugin since https://github.com/karma-runner/karma-safari-launcher
    // does not work and is not maintained.
    require('../tools/karma-safari-launcher'),
    // Include all other plugins from our npm modules
    'karma-*'
  ],

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

  // Browsers to launch for testing
  // To use a custom set of browsers, define the BROWSERS environment variable as a comma-seperated list.
  // Supported browsers are 'ChromeHeadless', 'Safari', and 'Firefox'.
  // See: https://karma-runner.github.io/6.4/config/browsers.html
  browsers: determineBrowsers(),

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

module.exports = config;
