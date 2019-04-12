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
 * @fileoverview Defines the Auth errors that include emails and an Auth
 * credential, a subclass of fireauth.AuthError.
 */


goog.provide('fireauth.AuthErrorWithCredential');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthProvider');
goog.require('fireauth.object');
goog.require('goog.object');


/**
 * Error with email and credential that can be returned to the developer.
 * @param {fireauth.authenum.Error} code The error code.
 * @param {?fireauth.AuthErrorWithCredential.CredentialInfo=} opt_credentialInfo
 *     Additional credential information to associate with the error.
 * @param {string=} opt_message The human-readable message.
 * @constructor
 * @extends {fireauth.AuthError}
 */
fireauth.AuthErrorWithCredential =
    function(code, opt_credentialInfo, opt_message) {
  fireauth.AuthErrorWithCredential.base(
      this, 'constructor', code, opt_message);
  var credentialInfo = opt_credentialInfo || {};

  // These properties are public.
  if (credentialInfo.email) {
    fireauth.object.setReadonlyProperty(this, 'email', credentialInfo.email);
  }
  if (credentialInfo.phoneNumber) {
    fireauth.object.setReadonlyProperty(this, 'phoneNumber',
        credentialInfo.phoneNumber);
  }
  if (credentialInfo.credential) {
    fireauth.object.setReadonlyProperty(this, 'credential',
        credentialInfo.credential);
  }
};
goog.inherits(fireauth.AuthErrorWithCredential, fireauth.AuthError);


/**
 * Additional credential information to associate with an error, so that the
 * user does not have to execute the Auth flow again on linking errors.
 * @typedef {{
 *   email: (?string|undefined),
 *   phoneNumber: (?string|undefined),
 *   credential: (?fireauth.AuthCredential|undefined),
 * }}
 */
fireauth.AuthErrorWithCredential.CredentialInfo;


/**
 * @return {!Object} The plain object form of the error.
 * @override
 */
fireauth.AuthErrorWithCredential.prototype.toPlainObject = function() {
  var obj = {
    'code': this['code'],
    'message': this.message
  };
  if (this['email']) {
    obj['email'] = this['email'];
  }
  if (this['phoneNumber']) {
    obj['phoneNumber'] = this['phoneNumber'];
  }

  var credential = this['credential'] && this['credential'].toPlainObject();
  if (credential){
    goog.object.extend(obj, credential);
  }
  return obj;
};


/**
 * @return {!Object} The plain object form of the error. This is used by
 *     JSON.toStringify() to return the stringified representation of the error;
 * @override
 */
fireauth.AuthErrorWithCredential.prototype.toJSON = function() {
  // Return the plain object representation in case JSON.stringify is called on
  // an Auth error instance.
  return this.toPlainObject();
};


/**
 * @param {?Object|undefined} response The object response to convert to a
 *     fireauth.AuthErrorWithCredential.
 * @return {?fireauth.AuthError} The error representation of the response.
 * @override
 */
fireauth.AuthErrorWithCredential.fromPlainObject = function(response) {
  // Code included.
  if (response['code']) {
    var code = response['code'] || '';
    // Remove prefix from name if available.
    if (code.indexOf(fireauth.AuthError.ERROR_CODE_PREFIX) == 0) {
      code = code.substring(fireauth.AuthError.ERROR_CODE_PREFIX.length);
    }

    // Credentials in response.
    var credentialInfo = {
      credential: fireauth.AuthProvider.getCredentialFromResponse(response)
    };
    if (response['email']) {
      credentialInfo.email = response['email'];
    } else if (response['phoneNumber']) {
      credentialInfo.phoneNumber = response['phoneNumber'];
    } else if (!credentialInfo.credential) {
      // Neither email, phone number or credentials are set; return a generic
      // error.
      return new fireauth.AuthError(code, response['message'] || undefined);
    }

    return new fireauth.AuthErrorWithCredential(code, credentialInfo,
        response['message']);
  }
  // No error or invalid response.
  return null;
};
