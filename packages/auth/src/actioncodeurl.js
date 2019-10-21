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
 * @fileoverview Defines firebase.auth.ActionCodeURL class which is the utility
 * to parse action code URLs.
 */

goog.provide('fireauth.ActionCodeURL');

goog.require('fireauth.ActionCodeInfo');
goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.object');
goog.require('goog.Uri');


/**
 * The utility class to help parse action code URLs used for out of band email
 * flows such as password reset, email verification, email link sign in, etc.
 * @param {string} actionLink The action link string.
 * @constructor
 */
fireauth.ActionCodeURL = function(actionLink) {
  var uri = goog.Uri.parse(actionLink);
  var apiKey = uri.getParameterValue(
      fireauth.ActionCodeURL.QueryField.API_KEY) || null;
  var code = uri.getParameterValue(
      fireauth.ActionCodeURL.QueryField.CODE) || null;
  var mode = uri.getParameterValue(
      fireauth.ActionCodeURL.QueryField.MODE) || null;
  var operation = fireauth.ActionCodeURL.getOperation(mode);
  // Validate API key, code and mode.
  if (!apiKey || !code || !operation) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        fireauth.ActionCodeURL.QueryField.API_KEY + ', ' +
        fireauth.ActionCodeURL.QueryField.CODE + 'and ' +
        fireauth.ActionCodeURL.QueryField.MODE +
        ' are required in a valid action code URL.');
  }
  fireauth.object.setReadonlyProperties(this, {
    'apiKey': apiKey,
    'operation': operation,
    'code': code,
    'continueUrl': uri.getParameterValue(
        fireauth.ActionCodeURL.QueryField.CONTINUE_URL) || null,
    'languageCode': uri.getParameterValue(
        fireauth.ActionCodeURL.QueryField.LANGUAGE_CODE) || null,
    'tenantId': uri.getParameterValue(
        fireauth.ActionCodeURL.QueryField.TENANT_ID) || null
  });
};

/**
 * Enums for fields in URL query string.
 * @enum {string}
 */
fireauth.ActionCodeURL.QueryField = {
  API_KEY: 'apiKey',
  CODE: 'oobCode',
  CONTINUE_URL: 'continueUrl',
  LANGUAGE_CODE: 'languageCode',
  MODE: 'mode',
  TENANT_ID: 'tenantId'
};


/**
 * Map of mode string to Action Code Info operation.
 * @const @private {!Object<string, !fireauth.ActionCodeInfo.Operation>}
 */
fireauth.ActionCodeURL.ModeToOperationMap_ = {
  'recoverEmail': fireauth.ActionCodeInfo.Operation.RECOVER_EMAIL,
  'resetPassword': fireauth.ActionCodeInfo.Operation.PASSWORD_RESET,
  'revertSecondFactorAddition':
      fireauth.ActionCodeInfo.Operation.REVERT_SECOND_FACTOR_ADDITION,
  'signIn': fireauth.ActionCodeInfo.Operation.EMAIL_SIGNIN,
  'verifyAndChangeEmail':
      fireauth.ActionCodeInfo.Operation.VERIFY_AND_CHANGE_EMAIL,
  'verifyEmail': fireauth.ActionCodeInfo.Operation.VERIFY_EMAIL
};


/**
 * Maps the mode string in action code URL to Action Code Info operation.
 * @param {?string} mode The mode string in the URL.
 * @return {?fireauth.ActionCodeInfo.Operation}
 */
fireauth.ActionCodeURL.getOperation = function(mode) {
  if (!mode) {
    return null;
  }
  return fireauth.ActionCodeURL.ModeToOperationMap_[mode] || null;

};


/**
 * Returns an ActionCodeURL instance if the link is valid, otherwise null.
 * @param {string} actionLink The action code link string.
 * @return {?fireauth.ActionCodeURL}
 */
fireauth.ActionCodeURL.parseLink = function(actionLink) {
  try {
    return new fireauth.ActionCodeURL(actionLink);
  } catch(e) {
    return null;
  }
};
