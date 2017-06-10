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

import firebase from './app';
import { Database } from "./database-ts/api/Database";
import { Query } from "./database-ts/api/Query";
import { Reference } from "./database-ts/api/Reference";
import { enableLogging } from "./database-ts/core/util/util";
import { RepoManager } from "./database-ts/core/RepoManager";

export function registerDatabase(instance) {
  // Register the Database Service with the 'firebase' namespace.
  firebase.INTERNAL.registerService(
    'database',
    app => RepoManager.getInstance().databaseFromApp(app),
    // firebase.database namespace properties
    {
      Reference,
      Query,
      Database,
      enableLogging,
      ServerValue: Database.ServerValue,
    }
  );
}

registerDatabase(firebase);