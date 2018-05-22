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

const karma = require('karma');
const path = require('path');
const mochaConfig = require('./mocha.base');
const webpackTestConfig = require('./webpack.test');
const { argv } = require('yargs');

/**
 * Custom SauceLabs Launchers
 */
const sauceLabsBrowsers = {
  desktop_Safari: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'OS X 10.11',
    version: '9.0'
  },
  iOS_Safari: {
    appiumVersion: '1.6.5',
    base: 'SauceLabs',
    browserName: 'Safari',
    deviceName: 'iPhone Simulator',
    deviceOrientation: 'portrait',
    platformName: 'iOS',
    platformVersion: '9.0'
  },
  IE_11: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 8.1',
    version: '11'
  }
};

const config = {
  // disable watcher
  autoWatch: false,

  // Doing 65 seconds to allow for the 20 second firestore tests
  browserNoActivityTimeout: 65000,

  // preprocess matching files before serving them to the browser
  // available preprocessors:
  // https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: { 'test/**/*.ts': ['webpack', 'sourcemap'] },

  mime: { 'text/x-typescript': ['ts', 'tsx'] },

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['spec', 'coverage-istanbul' /*, 'saucelabs' */],

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

  customLaunchers: sauceLabsBrowsers,

  // start these browsers
  // available browser launchers:
  // https://npmjs.org/browse/keyword/karma-launcher
  browsers: ['ChromeHeadless'],

  webpack: webpackTestConfig,

  webpackMiddleware: { quiet: true, stats: { colors: true } },

  sauceLabs: {
    tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER,
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    startConnect: false
  },

  singleRun: false,

  client: {
    mocha: mochaConfig,

    // Pass through --grep option to filter the tests that run.
    args: argv.grep ? ['--grep', argv.grep] : []
  },

  coverageIstanbulReporter: {
    dir: path.resolve(process.cwd(), 'coverage/browser/%browser%'),
    fixWebpackSourcePaths: true,
    reports: ['html', 'lcovonly']
  }
};

// In CI environment, use saucelabs to test
if (false /* process.env.TRAVIS */) {
  config.browsers = [...config.browsers, ...Object.keys(sauceLabsBrowsers)];
}

module.exports = config;
