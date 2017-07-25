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
// Messaging Service namespace
//
export const messagingSpec: NamespaceSpec = {
  // Message: {is: Function},
};

//
// Messaging Service instance
//
export const messagingInstanceSpec: NamespaceSpec = {
  app: { is: Object, isName: 'App' },
  INTERNAL: {
    delete: { is: Function }
  },

  getToken: { is: Function, args: 0 },
  onMessage: { is: Function, args: 3 },

  onTokenRefresh: { is: Function, args: 3 },
  requestPermission: { is: Function, args: 0 },
  deleteToken: { is: Function, args: 1 },

  setBackgroundMessageHandler: { is: Function, args: 1 }
};

export const compiledMessagingInstanceSpec: NamespaceSpec = {
  app: { is: Object, isName: 'App' },
  INTERNAL: {
    delete: { is: Function }
  },

  getToken: { is: Function, args: 0 },
  onMessage: { is: Function, args: 3 },

  onTokenRefresh: { is: Function, args: 3 },
  requestPermission: { is: Function, args: 0 },
  deleteToken: { is: Function, args: 1 },

  setBackgroundMessageHandler: { is: Function, args: 0 }
};

// Incremental properties on firebase namespace.
export const firebaseSpec: NamespaceSpec = {
  INTERNAL: {
    factories: {
      messaging: { is: Function }
    }
  },
  messaging: { is: Function, args: 1 }
};

// Incremental properties on firebase App instance.
export const appInstanceSpec: NamespaceSpec = {
  messaging: { is: Function, args: 1 }
};
