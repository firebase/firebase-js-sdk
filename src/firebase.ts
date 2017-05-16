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
// Declare build time variable
declare const TARGET_ENVIRONMENT;

import firebase from "./app";
import './auth';
// Import instance of FirebaseApp from ./app

if (TARGET_ENVIRONMENT === 'node') {
  // TARGET_ENVIRONMENT is a build-time variable that is injected to create
  // all of the variable environment outputs
  require('./database-node');

  var Storage = require('dom-storage');
  var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

  firebase.INTERNAL.extendNamespace({
    'INTERNAL': {
      'node': {
        'localStorage': new Storage(null, { strict: true }),
        'sessionStorage': new Storage(null, { strict: true }),
        'XMLHttpRequest': XMLHttpRequest
      }
    }
  });
}

if (TARGET_ENVIRONMENT !== 'node') {
  require('./database');
  require('./storage');
}

if (TARGET_ENVIRONMENT === 'react-native') {
  var AsyncStorage = require('react-native').AsyncStorage;
  firebase.INTERNAL.extendNamespace({
    'INTERNAL': {
      'reactNative': {
        'AsyncStorage': AsyncStorage
      }
    }
  });
}


if (TARGET_ENVIRONMENT !== 'node' && TARGET_ENVIRONMENT !== 'react-native') {
  require('./messaging');
}

// Export the single instance of firebase
export default firebase;
