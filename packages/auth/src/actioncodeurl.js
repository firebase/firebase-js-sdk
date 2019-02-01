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
 * @fileoverview Defines firebase.auth.ActionCodeUrl class which is the utility
 * to parse action code URLs.
 */

goog.provide('fireauth.ActionCodeUrl');

goog.require('goog.Uri');


/**
 * The utility class to help parse action code URLs used for out of band email
 * flows such as password reset, email verification, email link sign in, etc.
 * @param {string} actionCodeUrl The action code URL.
 * @constructor
 */
fireauth.ActionCodeUrl = function(actionCodeUrl) {
   /** @private {!goog.Uri} The action code URL components.*/
  this.uri_ = goog.Uri.parse(actionCodeUrl);
};


/**
 * Enums for fields in URL query string.
 * @enum {string}
 */
fireauth.ActionCodeUrl.QueryField = {
  API_KEY: 'apiKey',
  CODE: 'oobCode',
  MODE: 'mode'
};


/**
 * Enums for action code modes.
 * @enum {string}
 */
fireauth.ActionCodeUrl.Mode = {
  RESET_PASSWORD: 'resetPassword',
  REVOKE_EMAIL: 'recoverEmail',
  SIGN_IN: 'signIn',
  VERIFY_EMAIL: 'verifyEmail'
};


/**
 * Returns the API key parameter of action code URL.
 * @return {?string} The first API key value in action code URL or
 *     undefined if apiKey does not appear in the URL.
 */
fireauth.ActionCodeUrl.prototype.getApiKey = function() {
  return this.uri_.getParameterValue(
      fireauth.ActionCodeUrl.QueryField.API_KEY) || null;
};


/**
 * Returns the action code parameter of action code URL.
 * @return {?string} The first oobCode value in action code URL or
 *     undefined if oobCode does not appear in the URL.
 */
fireauth.ActionCodeUrl.prototype.getCode = function() {
  return this.uri_.getParameterValue(
      fireauth.ActionCodeUrl.QueryField.CODE) || null;
};


/**
 * Returns the mode parameter of action code URL.
 * @return {?string} The first mode value in action code URL or
 *     undefined if mode does not appear in the URL.
 */
fireauth.ActionCodeUrl.prototype.getMode = function() {
  return this.uri_.getParameterValue(
      fireauth.ActionCodeUrl.QueryField.MODE) || null;
};
