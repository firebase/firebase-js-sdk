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
const mochaBase = require('./mocha.base');

/** Tests in these packages are excluded due to flakiness or long run time. */
const excluded = ['integration/firestore/*', 'integration/messaging/*'];

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
  Chrome_Windows: seleniumLauncher('chrome', 'Windows 10', '66.0'),
  Firefox_Windows: seleniumLauncher('firefox', 'Windows 10', '60.0'),
  Safari_macOS: seleniumLauncher('safari', 'macOS 10.13', '11.0'),
  Edge_Windows: seleniumLauncher('MicrosoftEdge', 'Windows 10', '17.17134'),
  IE_Windows: seleniumLauncher('internet explorer', 'Windows 10', '11.103')

  // Mobile
  // Safari_iOS: appiumLauncher('Safari', 'iPhone Simulator', 'iOS', '11.2'),
  // Chrome_Android: appiumLauncher('Chrome', 'Android Emulator', 'Android', '6.0')
};

module.exports = function(config) {
  const karmaConfig = Object.assign({}, karmaBase, {
    basePath: '../',

    files: ['packages/polyfill/index.ts', ...getTestFiles()],

    logLevel: config.LOG_INFO,

    preprocessors: {
      'packages/polyfill/index.ts': ['webpack', 'sourcemap'],
      '**/test/**/*.ts': ['webpack', 'sourcemap'],
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

    retryLimit: 0,

    // concurrency: 10,

    client: {
      mocha: Object.assign({}, mochaBase, {
        // TODO(b/78474429, b/78473696): The tests matched by this regex
        // are currently failing in the saucelabs cross-browser tests. They
        // are disabled until we have a chance to investigate / fix them.
        grep:
          'Crawler Support' +
          '|Transaction Tests server values: local timestamp should eventually \\(but not immediately\\) match the server with txns' +
          '|QueryListener raises error event' +
          '|AsyncQueue handles failures',
        invert: true
      })
    },

    specReporter: {
      maxLogLines: 5,
      suppressErrorSummary: false,
      suppressFailed: false,
      suppressPassed: true,
      suppressSkipped: true,
      showSpecTiming: true,
      failFast: false
    },

    summaryReporter: {
      show: 'failed',
      specLength: 80,
      overviewColumn: false
    },

    sauceLabs: {
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER,
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
    }
  });

  config.set(karmaConfig);
};
