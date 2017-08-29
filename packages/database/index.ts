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

import firebase, { FirebaseApp, FirebaseNamespace } from '@firebase/app';
import { Database } from './src/api/Database';
import { Query } from './src/api/Query';
import { Reference } from './src/api/Reference';
import { enableLogging } from './src/core/util/util';
import { RepoManager } from './src/core/RepoManager';
import * as INTERNAL from './src/api/internal';
import * as TEST_ACCESS from './src/api/test_access';
import { isNodeSdk } from '@firebase/util';

export function registerDatabase(instance: FirebaseNamespace) {
  // Register the Database Service with the 'firebase' namespace.
  const namespace = instance.INTERNAL.registerService(
    'database',
    (app, unused, url) => RepoManager.getInstance().databaseFromApp(app, url),
    // firebase.database namespace properties
    {
      Reference,
      Query,
      Database,
      enableLogging,
      INTERNAL,
      ServerValue: Database.ServerValue,
      TEST_ACCESS
    },
    null,
    true
  );

  if (isNodeSdk()) {
    module.exports = namespace;
  }
}

registerDatabase(firebase);
