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

const argv = require('yargs').argv;
const path = require('path');
const karmaBase = require('./karma.base');

// karma.conf.js test configuration file to run.
const testConfigFile = argv['testConfigFile'];
if (!testConfigFile) {
  console.error('No test file path provided.');
  process.exit(1);
}

/**
 * Custom SauceLabs Launchers
 */
const browserMap = {
  // Desktop
  // Chrome_Windows: seleniumLauncher('chrome', 'Windows 10', 'latest'),
  // Firefox_Windows: seleniumLauncher('firefox', 'Windows 10', 'latest'),
  // Safari_macOS: seleniumLauncher('safari', 'macOS 10.13', 'latest'),
  // Edge_Windows: seleniumLauncher('MicrosoftEdge', 'Windows 10', 'latest'),
  IE_Windows: seleniumLauncher('internet explorer', 'Windows 10', 'latest')

  // Mobile
  // Safari_iOS: appiumLauncher('Safari', 'iPhone Simulator', 'iOS', '11.2'),
  // Chrome_Android: appiumLauncher('Chrome', 'Android Emulator', 'Android', '6.0')
};

/**
 * Any special options per package.
 */
const packageConfigs = {
  messaging: {
    // Messaging currently only supports these browsers.
    browsers: ['Chrome_Windows', 'Firefox_Windows', 'Edge_Windows']
  }
};

/**
 * Gets the browser/launcher map for this package.
 *
 * @param {string} packageName Name of package being tested (e.g., "firestore")
 */
function getSauceLabsBrowsers(packageName) {
  if (packageConfigs[packageName]) {
    const filteredBrowserMap = {};
    for (const browserKey in browserMap) {
      if (packageConfigs[packageName].browsers.includes(browserKey)) {
        filteredBrowserMap[browserKey] = browserMap[browserKey];
      }
    }
    return filteredBrowserMap;
  } else {
    return browserMap;
  }
}

/**
 * Get package name from package path command line arg.
 */
function getPackageLabels() {
  const match = testConfigFile.match(
    /([a-zA-Z]+)\/([a-zA-Z-]+)\/karma\.conf\.js/
  );
  return {
    type: match[1],
    name: match[2]
  };
}

/**
 * Gets a list of file patterns for test, defined individually
 * in karma.conf.js in each package under worksapce packages or
 * integration.
 */
function getTestFiles() {
  let root = path.resolve(__dirname, '..');
  const { name: packageName } = getPackageLabels();
  let patterns = require(path.join(root, testConfigFile)).files;
  let dirname = path.dirname(testConfigFile);
  return { packageName, files: patterns.map(p => path.join(dirname, p)) };
}

function seleniumLauncher(browserName, platform, version) {
  const { name, type } = getPackageLabels();
  const testName =
    type === 'integration'
      ? `${type}-${name}-${browserName}`
      : `${name}-${browserName}`;
  return {
    base: 'SauceLabs',
    browserName: browserName,
    extendedDebugging: 'true',
    name: testName,
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

module.exports = function(config) {
  const { packageName, files: testFiles } = getTestFiles();
  const sauceLabsBrowsers = getSauceLabsBrowsers(packageName);

  const sauceLabsConfig = {
    tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER + '-' + packageName,
    build: process.env.TRAVIS_BUILD_NUMBER || argv['buildNumber'],
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    startConnect: true,
    connectOptions: {
      // Realtime Database uses WebSockets to connect to firebaseio.com
      // so we have to set noSslBumpDomains. Theoretically SSL Bumping
      // only needs to be disabled for 'firebaseio.com'. However, we are
      // seeing much longer test time with that configuration, so leave
      // it as 'all' for now.
      // See https://wiki.saucelabs.com/display/DOCS/Troubleshooting+Sauce+Connect
      // for more details.
      noSslBumpDomains: 'all'
    }
  };

  const karmaConfig = Object.assign({}, karmaBase, {
    basePath: '../',

    files: ['packages/polyfill/index.ts', ...testFiles],

    logLevel: config.LOG_INFO,

    preprocessors: {
      'packages/polyfill/index.ts': ['webpack', 'sourcemap'],
      '**/test/**/*.ts': ['webpack', 'sourcemap'],
      '**/*.test.ts': ['webpack', 'sourcemap'],
      'packages/firestore/test/**/bootstrap.ts': ['webpack', 'babel'],
      'integration/**/namespace.*': ['webpack', 'babel', 'sourcemap']
    },

    babelPreprocessor: { options: { presets: ['@babel/preset-env'] } },

    frameworks: ['mocha'],

    browserNoActivityTimeout: 900000,

    browserDisconnectTolerance: 3,

    captureTimeout: 120000,

    // browsers: ['ChromeHeadless'],
    browsers: Object.keys(sauceLabsBrowsers),

    customLaunchers: sauceLabsBrowsers,

    reporters: ['spec', 'summary', 'saucelabs'],

    port: 9876,

    retryLimit: 3,

    // concurrency: 10,

    specReporter: {
      maxLogLines: 5,
      suppressErrorSummary: false,
      suppressFailed: false,
      suppressPassed: false,
      suppressSkipped: true,
      showSpecTiming: true,
      failFast: false
    },

    summaryReporter: {
      show: 'failed',
      specLength: 80,
      overviewColumn: false
    },

    sauceLabs: sauceLabsConfig
  });

  config.set(karmaConfig);
};
