/**
 * @license
 * Copyright 2024 Google LLC
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

// Validate that required environment variables are defined
if (!process.env.VERTEXAI_INTEGRATION_FIREBASE_CONFIG_JSON) {
  throw new Error('VERTEXAI_INTEGRATION_FIREBASE_CONFIG_JSON is not defined in env. Set this env variable to be the JSON of a Firebase project config to run the integration tests with.')
}

module.exports = function (config) {
  const karmaConfig = {
    ...karmaBase,

    // files to load into karma
    files: (() => {
      if (argv.integration) {
        return ['integration/**'];
      } else {
        return ['src/**/*.test.ts'];
      }
    })(),

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha']

  };

  config.client.args.push(process.env.VERTEXAI_INTEGRATION_FIREBASE_CONFIG_JSON);

  config.set(karmaConfig);
};
