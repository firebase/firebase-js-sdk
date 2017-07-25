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

/**
 * Namepsace definitions for the firebase namespace and firebase App.
 */
import { NamespaceSpec } from '../namespace';

//
// Database Service namespace
//
export const databaseSpec: NamespaceSpec = {
  Database: { is: Function },
  Reference: { is: Function },
  Query: { is: Function },
  enableLogging: { is: Function, args: 2 },
  ServerValue: {
    TIMESTAMP: { is: Object }
  }
};

//
// Database Service instance
//
export const databaseInstanceSpec: NamespaceSpec = {
  app: { is: Object, isName: 'App' },
  INTERNAL: {
    delete: { is: Function }
  },

  ref: { is: Function, args: 1 },
  refFromURL: { is: Function, args: 1 },
  goOnline: { is: Function, args: 0 },
  goOffline: { is: Function, args: 0 }
};

// Incremental properties on firebase namespace.
export const firebaseSpec: NamespaceSpec = {
  INTERNAL: {
    factories: {
      database: { is: Function }
    }
  },
  database: { is: Function, args: 1 }
};

// Incremental properties on App instance.
export const appInstanceSpec: NamespaceSpec = {
  database: { is: Function, args: 1 }
};
