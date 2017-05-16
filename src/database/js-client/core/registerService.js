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
goog.provide('fb.core.registerService');
goog.provide('fb.core.exportPropGetter');

goog.require('Firebase');
goog.require('fb.api.Database');
goog.require('fb.api.INTERNAL');
goog.require('fb.api.Query');
goog.require('fb.api.TEST_ACCESS');
goog.require('fb.constants');
goog.require('fb.core.RepoManager');
goog.require('fb.core.util.enableLogging');

if (typeof firebase === 'undefined') {
  throw new Error("Cannot install Firebase Database - " +
                  "be sure to load firebase-app.js first.");
}

// Register the Database Service with the 'firebase' namespace.
try {
  var databaseNamespace = firebase.INTERNAL.registerService(
    'database',
    function(app) {
      return fb.core.RepoManager.getInstance().databaseFromApp(app);
    },
    // firebase.database namespace properties
    {
      'Reference': Firebase,
      'Query': fb.api.Query,
      'Database': fb.api.Database,

      'enableLogging': fb.core.util.enableLogging,
      'INTERNAL': fb.api.INTERNAL,
      'TEST_ACCESS': fb.api.TEST_ACCESS,

      'ServerValue': fb.api.Database.ServerValue,
    }
  );
  if (fb.login.util.environment.isNodeSdk()) {
    module.exports = databaseNamespace;
  }
} catch (e) {
  fb.core.util.fatal("Failed to register the Firebase Database Service (" + e + ")");
}
