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
// Storage Service namespace
//
export const storageSpec: NamespaceSpec = {
  Storage: { is: Function },
  Reference: { is: Function },
  // Enums:
  TaskEvent: {
    STATE_CHANGED: { is: String }
  },
  TaskState: {
    RUNNING: { is: String },
    PAUSED: { is: String },
    SUCCESS: { is: String },
    CANCELED: { is: String },
    ERROR: { is: String }
  },
  StringFormat: {
    RAW: { is: String },
    BASE64: { is: String },
    BASE64URL: { is: String },
    DATA_URL: { is: String }
  }
};

//
// Storage Service instance
//
export const storageInstanceSpec: NamespaceSpec = {
  app: { is: Object, isName: 'App' },
  INTERNAL: {
    delete: { is: Function }
  },

  ref: { is: Function, args: 1 },
  refFromURL: { is: Function, args: 1 }
};

// Incremental properties on firebase namespace.
export const firebaseSpec: NamespaceSpec = {
  INTERNAL: {
    factories: {
      storage: { is: Function }
    }
  },
  storage: { is: Function, args: 1 }
};

// Incremental properties on firebase App instance.
export const appInstanceSpec: NamespaceSpec = {
  storage: { is: Function, args: 1 }
};
