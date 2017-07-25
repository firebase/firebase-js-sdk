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
// App instance
//
export const appInstanceSpec: NamespaceSpec = {
  name: { is: String },
  options: { is: Object },
  delete: { is: Function },

  // Patched methods from Auth service
  INTERNAL: {
    getToken: { is: Function },
    addAuthTokenListener: { is: Function },
    removeAuthTokenListener: { is: Function }
  }
};

export const firebaseErrorSpec: NamespaceSpec = {
  code: { is: String },
  message: { is: String },
  name: { is: String },
  stack: { is: String }
};
