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
import { FirebaseApp, FirebaseNamespace } from "./app/firebase_app";
import { Database } from "./database/api/Database";
import { Query } from "./database/api/Query";
import { Reference } from "./database/api/Reference";
import { enableLogging } from "./database/core/util/util";
import { RepoManager } from "./database/core/RepoManager";

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

/**
 * Extensions to the FirebaseApp and FirebaseNamespaces interfaces
 */
declare module './app/firebase_app' {
  interface FirebaseApp {
    database(): Database
  }
}

declare module './app/firebase_app' {
  interface FirebaseNamespace {
    database(app: FirebaseApp): Database
  }
}

registerDatabase(firebase);