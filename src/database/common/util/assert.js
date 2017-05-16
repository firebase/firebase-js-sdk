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
goog.provide('fb.util.assert');
goog.provide('fb.util.assertionError');

goog.require('fb.constants');


/**
 * Throws an error if the provided assertion is falsy
 * @param {*} assertion The assertion to be tested for falsiness
 * @param {!string} message The message to display if the check fails
 */
fb.util.assert = function(assertion, message) {
  if (!assertion) {
    throw fb.util.assertionError(message);
  }
};


/**
 * Returns an Error object suitable for throwing.
 * @param {string} message
 * @return {!Error}
 */
fb.util.assertionError = function(message) {
  return new Error('Firebase Database (' + firebase.SDK_VERSION + ') INTERNAL ASSERT FAILED: ' + message);
};
