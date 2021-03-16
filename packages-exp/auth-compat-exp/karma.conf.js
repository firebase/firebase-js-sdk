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
const { argv } = require('yargs');

const files = ['src/**/*.test.ts'];

module.exports = function (config) {
  const karmaConfig = Object.assign({}, karmaBase, {
    // files to load into karma
    files: getTestFiles(),
    preprocessors: { '**/*.ts': ['webpack', 'sourcemap'] },
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],

    client: Object.assign({}, karmaBase.client, getClientConfig())
  });

  config.set(karmaConfig);
};

function getTestFiles() {
  if (argv.integration) {
    return ['test/**/*.test.ts'];
  } else {
    return ['src/**/*.test.ts'];
  }
}

function getClientConfig() {
  if (!argv.integration) {
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

module.exports.files = getTestFiles();
