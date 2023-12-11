/**
 * @license
 * Copyright 2019 Google LLC
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

const karmaBase = require('../../config/karma.base');
const webpackBase = require('../../config/webpack.test');
const { argv } = require('yargs');

module.exports = function (config) {
  const karmaConfig = Object.assign({}, karmaBase, {
    browsers: getTestBrowsers(argv),
    // files to load into karma
    files: getTestFiles(argv),
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],
    // undici is a fetch polyfill that test helpers call for Node tests, and browser tests should
    // ingore its import to avoid compilation errors in those test helpers.
    webpack: {
      ...webpackBase,
      resolve: {
        ...webpackBase.resolve,
        alias: {
          'undici': false,
          '@firebase/auth': '@unstoppabledomains/firebase-auth'
        }
      }
    },
    client: Object.assign({}, karmaBase.client, getClientConfig(argv))
  });

  config.set(karmaConfig);
};

function getTestFiles(argv) {
  if (argv.unit) {
    return ['src/**/*.test.ts', 'test/helpers/**/*.test.ts'];
  } else if (argv.integration) {
    if (argv.prodbackend) {
      return [
        'test/integration/flows/totp.test.ts',
        'test/integration/flows/password_policy.test.ts'
      ];
    }
    return argv.local
      ? ['test/integration/flows/*.test.ts']
      : ['test/integration/flows/*!(local).test.ts'];
  } else if (argv.cordova) {
    return ['src/platform_cordova/**/*.test.ts'];
  } else {
    // For the catch-all yarn:test, ignore the phone integration test
    return [
      'src/**/*.test.ts',
      'test/helpers/**/*.test.ts',
      'test/integration/flows/anonymous.test.ts',
      'test/integration/flows/email.test.ts'
    ];
  }
}

function getTestBrowsers(argv) {
  let browsers = ['ChromeHeadless'];
  if (process.env?.BROWSERS && argv.unit) {
    browsers = process.env?.BROWSERS?.split(',');
  }
  return browsers;
}

function getClientConfig(argv) {
  if (!argv.local) {
    return {};
  }

  if (!process.env.GCLOUD_PROJECT || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.error(
      'Local testing against emulator requested, but ' +
        'GCLOUD_PROJECT and FIREBASE_AUTH_EMULATOR_HOST env variables ' +
        'are missing'
    );
    process.exit(1);
  }

  return {
    authAppConfig: {
      apiKey: 'local-api-key',
      projectId: process.env.GCLOUD_PROJECT,
      authDomain: 'local-auth-domain'
    },
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST
  };
}

module.exports.files = getTestFiles(argv);
