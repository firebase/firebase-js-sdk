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
// firebase namespace.
//
export const firebaseSpec: NamespaceSpec = {
  initializeApp: { is: Function, args: 2 },
  //
  // App namespace and accessor
  //
  app: {
    is: Function,
    args: 1,
    App: { is: Function }
  },
  SDK_VERSION: { is: String },
  apps: { is: Array },
  Promise: {
    is: Function,
    resolve: { is: Function },
    reject: { is: Function },
    all: { is: Function },
    prototype: {
      then: { is: Function, args: 2 },
      catch: { is: Function, args: 1 }
    }
  },
  INTERNAL: {
    registerService: { is: Function, args: 5 },
    extendNamespace: { is: Function, args: 1 },
    createFirebaseNamespace: { is: Function, args: 0 },
    createSubscribe: { is: Function, args: 2 },
    removeApp: { is: Function, args: 1 },
    factories: { is: Object },
    ErrorFactory: { is: Function, args: 3 },
    deepExtend: { is: Function, args: 2 },
    // goog.Promise implementation (Browser only)
    Promise: {
      is: Function,
      resolve: { is: Function },
      reject: { is: Function },
      all: { is: Function },
      prototype: {
        // goog.Promise adds extra context argment to these methods
        then: { is: Function, args: 2 },
        catch: { is: Function, args: 1 }
      }
    }
  }
};
