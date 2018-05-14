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

const glob = require('glob');
const karma = require('karma');
const path = require('path');
const karmaBase = require('./karma.base');

/** Tests in these packages are excluded due to flakiness or long run time. */
const excluded = [
  'packages/database/*',
  'packages/firestore/*',
  'integration/firestore/*',
  'integration/messaging/*'
];

/**
 * Gets a list of file patterns for test, defined individually
 * in karma.conf.js in each package under worksapce packages or
 * integration.
 */
function getTestFiles() {
  let root = path.resolve(__dirname, '..');
  configs = glob.sync('{packages,integration}/*/karma.conf.js', {
    cwd: root,
    ignore: excluded
  });
  files = configs.map(x => {
    let patterns = require(path.join(root, x)).files;
    let dirname = path.dirname(x);
    return patterns.map(p => path.join(dirname, p));
  });
  return [].concat(...files);
}

function seleniumLauncher(browserName, platform, version) {
  return {
    base: 'SauceLabs',
    browserName: browserName,
    extendedDebugging: 'true',
    recordLogs: 'true',
    recordVideo: 'true',
    recordScreenshots: 'true',
    platform: platform,
    version: version
  };
}

function appiumLauncher(
  browserName,
  deviceName,
  platformName,
  platformVersion
) {
  return {
    base: 'SauceLabs',
    browserName: browserName,
    deviceName: deviceName,
    deviceOrientation: 'portrait',
    extendedDebugging: 'true',
    recordLogs: 'true',
    recordVideo: 'true',
    recordScreenshots: 'true',
    platformName: platformName,
    platformVersion: platformVersion,
    idleTimeout: 120
  };
}

/**
 * Custom SauceLabs Launchers
 */
const sauceLabsBrowsers = {
  // Desktop
  Chrome_Windows: seleniumLauncher('chrome', 'Windows 10', 'latest'),
  Firefox_Windows: seleniumLauncher('firefox', 'Windows 10', 'latest'),
  Safari_macOS: seleniumLauncher('safari', 'macOS 10.13', 'latest'),
  Edge_Windows: seleniumLauncher('MicrosoftEdge', 'Windows 10', 'latest')
  // IE_Windows: seleniumLauncher('internet explorer', 'Windows 10', 'latest'),

  // Mobile
  // Safari_iOS: appiumLauncher('Safari', 'iPhone Simulator', 'iOS', '11.2'),
  // Chrome_Android: appiumLauncher('Chrome', 'Android Emulator', 'Android', '6.0')
};

module.exports = function(config) {
  const karmaConfig = Object.assign({}, karmaBase, {
    basePath: '../',

    files: getTestFiles(),

    logLevel: config.LOG_INFO,

    preprocessors: { '**/test/**/*.ts': ['webpack', 'sourcemap'] },

    frameworks: ['mocha'],

    browserNoActivityTimeout: 900000,

    browserDisconnectTolerance: 3,

    captureTimeout: 120000,

    // browsers: ['ChromeHeadless'],
    browsers: Object.keys(sauceLabsBrowsers),

    customLaunchers: sauceLabsBrowsers,

    reporters: ['spec', 'saucelabs'],

    port: 9876,

    retryLimit: 3,

    // concurrency: 10,

    sauceLabs: {
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER,
      username: process.env.SAUCE_USERNAME,
      accessKey: process.env.SAUCE_ACCESS_KEY,
      startConnect: true
    }
  });

  config.set(karmaConfig);
};
