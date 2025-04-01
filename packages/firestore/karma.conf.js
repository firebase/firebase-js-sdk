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

const karmaBase = require('../../config/karma.base');
const { argv } = require('yargs');

module.exports = function (config) {
  const karmaConfig = {
    ...karmaBase,
    // files to load into karma
    files: getTestFiles(argv),

    preprocessors: {
      'test/**/*.ts': ['webpack', 'sourcemap']
    },

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha']
  };

  if (argv.targetBackend) {
    karmaConfig.client = {
      ...karmaConfig.client,
      targetBackend: argv.targetBackend
    };
  } else if (argv.local) {
    karmaConfig.client = {
      ...karmaConfig.client,
      targetBackend: 'emulator'
    };
  }

  if (argv.databaseId) {
    karmaConfig.client = {
      ...karmaConfig.client,
      databaseId: argv.databaseId
    };
  }

  config.set(karmaConfig);
};

/**
 * Gets the list of files to execute, based on existence of the
 * --unit and --integration command-line arguments.
 */
function getTestFiles(argv) {
  const unitTests = 'test/unit/bootstrap.ts';
  const legacyIntegrationTests = 'test/integration/bootstrap.ts';
  const liteIntegrationTests = 'test/lite/bootstrap.ts';
  if (argv.unit) {
    return [unitTests];
  } else if (argv.integration) {
    return [legacyIntegrationTests];
  } else if (argv.lite) {
    process.env.TEST_PLATFORM = 'browser_lite';
    return [liteIntegrationTests];
  } else {
    return [unitTests, legacyIntegrationTests];
  }
}

module.exports.files = getTestFiles(argv);
