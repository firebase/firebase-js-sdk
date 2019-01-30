/**
 * @license
 * Copyright 2018 Google Inc.
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
 * @fileoverview Defines the firebase.auth.AuthSettings structure.
 */

goog.provide('fireauth.AuthSettings');


/**
 * The class used to initialize an Auth settings object currently used to
 * enable or disable app verification for testing.
 * @constructor
 */
fireauth.AuthSettings = function() {
  this.appVerificationDisabledForTesting_ = false;
  Object.defineProperty(
      /** @type {!Object} */ (this),
      'appVerificationDisabled',
      {
        /**
         * @this {!Object}
         * @return {boolean} The current status.
         */
        get: function() {
          return this.getAppVerificationDisabledForTesting();
        },
        /**
         * @this {!Object}
         * @param {boolean} value The new status.
         */
        set: function(value) {
          this.setAppVerificationDisabledForTesting(value);
        },
        enumerable: false
      });
};


/**
 * Sets whether app verification is disable for testing.
 * @param {boolean} status App verification status for testing.
 */
fireauth.AuthSettings.prototype.setAppVerificationDisabledForTesting =
    function(status) {
  this.appVerificationDisabledForTesting_ = status;
};


/**
 * @return {boolean} Whether app verification is enabled or disabled for
 *     testing.
 */
fireauth.AuthSettings.prototype.getAppVerificationDisabledForTesting =
    function() {
  return this.appVerificationDisabledForTesting_;
};
