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
goog.provide('fb.core.ServerActions');



/**
 * Interface defining the set of actions that can be performed against the Firebase server
 * (basically corresponds to our wire protocol).
 *
 * @interface
 */
fb.core.ServerActions = goog.defineClass(null, {

  /**
   * @param {!fb.api.Query} query
   * @param {function():string} currentHashFn
   * @param {?number} tag
   * @param {function(string, *)} onComplete
   */
  listen: goog.abstractMethod,

  /**
   * Remove a listen.
   *
   * @param {!fb.api.Query} query
   * @param {?number} tag
   */
  unlisten: goog.abstractMethod,

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} opt_onComplete
   * @param {string=} opt_hash
   */
  put: goog.abstractMethod,

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, ?string)} onComplete
   * @param {string=} opt_hash
   */
  merge: goog.abstractMethod,

  /**
   * Refreshes the auth token for the current connection.
   * @param {string} token The authentication token
   */
  refreshAuthToken: goog.abstractMethod,

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} opt_onComplete
   */
  onDisconnectPut: goog.abstractMethod,

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} opt_onComplete
   */
  onDisconnectMerge: goog.abstractMethod,

  /**
   * @param {string} pathString
   * @param {function(string, string)=} opt_onComplete
   */
  onDisconnectCancel: goog.abstractMethod,

  /**
   * @param {Object.<string, *>} stats
   */
  reportStats: goog.abstractMethod

}); // fb.core.ServerActions
