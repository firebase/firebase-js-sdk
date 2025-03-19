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
const { existsSync } = require('fs');

const files = [`src/**/*.test.ts`];

// Validate that the file that defines the Firebase config to be used in the integration tests exists.
if (argv.integration) {
  if (!existsSync('integration/firebase-config.ts')) {
    throw new Error(`integration/firebase-config.ts does not exist. This file must contain a Firebase config for a project with Vertex AI enabled.`)
  }
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

  config.set(karmaConfig);
};

module.exports.files = files;
