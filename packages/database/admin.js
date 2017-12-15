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

const { Database } = require('./dist/cjs/src/api/Database');
const { Query } = require('./dist/cjs/src/api/Query');
const { Reference } = require('./dist/cjs/src/api/Reference');
const { enableLogging } = require('./dist/cjs/src/core/util/util');
const { RepoManager } = require('./dist/cjs/src/core/RepoManager');
const { CONSTANTS } = require('@firebase/util/dist/cjs/src/constants');
const INTERNAL = require('./dist/cjs/src/api/internal');
const TEST_ACCESS = require('./dist/cjs/src/api/test_access');
const firebaseApp = require('@firebase/app').default;
require('./dist/cjs/src/nodePatches');

exports.initStandalone = function(app, url, version) {
  const instance = RepoManager.getInstance().databaseFromApp(app, url);

  /**
   * Ensure that the Admin flags get properly set here
   */
  CONSTANTS.NODE_ADMIN = true;

  if (version) {
    /**
     * We are patching the version info in @firebase/app as
     * the database SDK sends this version back to our backend
     */
    firebaseApp.SDK_VERSION = version;
  }

  return {
    instance,
    namespace: {
      Reference,
      Query,
      Database,
      enableLogging,
      INTERNAL,
      ServerValue: Database.ServerValue,
      TEST_ACCESS
    }
  };
};
