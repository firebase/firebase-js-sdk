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
// Auth Service namespace
//
export const authSpec: NamespaceSpec = {
  Auth: { is: Function },
  Error: { is: Function },
  EmailAuthProvider: { is: Function },
  FacebookAuthProvider: { is: Function },
  GithubAuthProvider: { is: Function },
  GoogleAuthProvider: { is: Function },
  TwitterAuthProvider: { is: Function }
};

//
// Auth Service instance
//
export const authInstanceSpec: NamespaceSpec = {
  app: { is: Object, isName: 'App' },
  INTERNAL: {
    delete: { is: Function }
  }
};

//
// firebase namespace.
//
export const firebaseSpec: NamespaceSpec = {
  INTERNAL: {
    factories: {
      auth: { is: Function }
    }
  },

  User: { is: Function },

  // Service namespaces are also accessor functions
  auth: { is: Function, args: 1 }
};

//
// App instance
//
export const appInstanceSpec: NamespaceSpec = {
  // App-specific, service accessors
  auth: { is: Function, args: 1 }
};
