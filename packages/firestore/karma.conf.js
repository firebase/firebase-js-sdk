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
const karmaBase = require('../../config/karma.base');
const { argv } = require('yargs');

module.exports = function(config) {
  const karmaConfig = Object.assign({}, karmaBase, {
    // files to load into karma
    files: getTestFiles(argv),

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],

    client: Object.assign({}, karmaBase.client, {
      firestoreSettings: getFirestoreSettings(argv)
    })
  });

  config.set(karmaConfig);
};

/**
 * Gets the list of files to execute, based on existence of the
 * --unit and --integration command-line arguments.
 */
function getTestFiles(argv) {
  const unitTests = 'test/unit/bootstrap.ts';
  const integrationTests = 'test/integration/bootstrap.ts';
  if (argv.unit) {
    return [unitTests];
  } else if (argv.integration) {
    return [integrationTests];
  } else {
    return [unitTests, integrationTests];
  }
}

/**
 * If the --local argument is passed, returns a {host, ssl} FirestoreSettings
 * object that point to localhost instead of production.
 */
function getFirestoreSettings(argv) {
  if (argv.local) {
    return {
      host: 'localhost:8080',
      ssl: false,
      timestampsInSnapshots: true
    };
  } else {
    return {
      host: 'firestore.googleapis.com',
      ssl: true,
      timestampsInSnapshots: true
    };
  }
}
