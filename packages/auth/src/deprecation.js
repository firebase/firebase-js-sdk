/**
 * @license
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
 * @fileoverview Provides utilities for displaying deprecation notices.
 */
goog.provide('fireauth.deprecation');
goog.provide('fireauth.deprecation.Deprecations');
goog.require('fireauth.util');


/**
 * An enum of valid notices to display. All deprecation notices must be in this
 * enum. Deprecation messages should be unique and provide the full context
 * of what is deprecated (e.g. the fully qualified path to a method).
 * @enum {string}
 */
fireauth.deprecation.Deprecations = {
  LINK_WITH_CREDENTIAL: 'firebase.User.prototype.linkAndRetrieveDataWithCrede' +
      'ntial is deprecated. Please use firebase.User.prototype.linkWithCreden' +
      'tial instead.',
  REAUTH_WITH_CREDENTIAL: 'firebase.User.prototype.reauthenticateAndRetrieveD' +
      'ataWithCredential is deprecated. Please use firebase.User.prototype.re' +
      'authenticateWithCredential instead.',
  SIGN_IN_WITH_CREDENTIAL: 'firebase.auth.Auth.prototype.signInAndRetrieveDat' +
      'aWithCredential is deprecated. Please use firebase.auth.Auth.prototype' +
      '.signInWithCredential instead.'
};


/**
 * Keeps track of notices that were already displayed.
 * @type {!Object<fireauth.deprecation.Deprecations, boolean>}
 * @private
 */
fireauth.deprecation.shownMessages_ = {};


/**
 * Logs a deprecation notice to the developer.
 * @param {!fireauth.deprecation.Deprecations} message
 */
fireauth.deprecation.log = function(message) {
  if (fireauth.deprecation.shownMessages_[message]) {
    return;
  }
  fireauth.deprecation.shownMessages_[message] = true;
  fireauth.util.consoleWarn(message);
};


/**
 * Resets the displayed deprecation notices.
 */
fireauth.deprecation.resetForTesting = function() {
  fireauth.deprecation.shownMessages_ =
      /** @type {!Object<fireauth.deprecation.Deprecations, boolean>} */ ({});
};
