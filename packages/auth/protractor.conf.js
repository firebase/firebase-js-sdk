/**
 * @license
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

/**
 * Stores the configuration of Protractor. It is loaded by protractor to run
 * tests.
 *
 * Usage:
 *
 * Run locally:
 * $ npm test
 * It will start a local Selenium Webdriver server as well as the HTTP server
 * that serves test files.
 *
 * Run locally using SauceLabs:
 * Go to your SauceLab account, under "My Account", and copy paste the
 * access key. Now export the following variables:
 * $ export SAUCE_USERNAME=<your username>
 * $ export SAUCE_ACCESS_KEY=<the copy pasted access key>
 * Then, start SauceConnect:
 * $ ./buildtools/sauce_connect.sh
 * Take note of the "Tunnel Identifier" value logged in the terminal.
 * Run the tests:
 * $ npm test -- --saucelabs --tunnelIdentifier=<the tunnel identifier>
 * This will start the HTTP Server locally, and connect through SauceConnect
 * to SauceLabs remote browsers instances.
 *
 * Travis will run `npm test -- --saucelabs`.
 */

// Common configuration.
config = {
  // Using jasmine to wrap Closure JSUnit tests.
  framework: 'jasmine',
  // The jasmine specs to run.
  specs: ['protractor_spec.js'],
  // Jasmine options. Increase the timeout to 5min instead of the default 30s.
  jasmineNodeOpts: {
    // Default time to wait in ms before a test fails.
    defaultTimeoutInterval: 5 * 60 * 1000
  }
};

// Read arguments to the protractor command.
// The first 3 arguments are something similar to:
// [ '.../bin/node',
//  '.../node_modules/.bin/protractor',
//  'protractor.conf.js' ]
var arguments = process.argv.slice(3);

// Default options: run tests locally (saucelabs false) and use the env variable
// TRAVIS_JOB_NUMBER to get the tunnel identifier, when using saucelabs.
var options = {
  saucelabs: false,
  tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER
};

for (var i = 0; i < arguments.length; i++) {
  var arg = arguments[i];
  if (arg == '--saucelabs') {
    options.saucelabs = true;
  } else if (arg.indexOf('--tunnelIdentifier') == 0) {
    options.tunnelIdentifier = arg.split('=')[1];
  }
}

if (options.saucelabs) {
  if (!options.tunnelIdentifier) {
    throw 'No tunnel identifier given! Either the TRAVIS_JOB_NUMBER is not ' +
        'set, or you haven\'t passed the --tunnelIdentifier=xxx argument.';
  }
  // SauceLabs configuration.
  config.sauceUser = process.env.SAUCE_USERNAME;
  config.sauceKey = process.env.SAUCE_ACCESS_KEY;
  if (!config.sauceKey || !config.sauceUser) {
    throw 'The SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables have '+
        ' to be set.';
  }
  // Avoid going over the SauceLabs concurrency limit (5).
  config.maxSessions = 5;
  // List of browsers configurations tested.
  var sauceBrowsers = require('./sauce_browsers.json');
  // Configuration for SauceLabs browsers.
  config.multiCapabilities = sauceBrowsers.map(function(browser) {
    browser['tunnel-identifier'] = options.tunnelIdentifier;
    return browser;
  });
} else {
  // Configuration for local Chrome and Firefox.
  config.seleniumAddress = 'http://localhost:4444/wd/hub';
  config.multiCapabilities = [
    {
      'browserName': 'chrome'
    },
    {
      'browserName': 'firefox'
    }
  ];
}

exports.config = config;
