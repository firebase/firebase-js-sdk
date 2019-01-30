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
 * @fileoverview Defines the firebase.auth.IdTokenResult class that is obtained
 * from getIdTokenResult. It contains the ID token JWT string and other helper
 * properties for getting different data associated with the token as well as
 * all the decoded payload claims.
 */

goog.provide('fireauth.IdTokenResult');

goog.require('fireauth.AuthError');
goog.require('fireauth.IdToken');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.object');
goog.require('fireauth.util');



/**
 * This is the ID token result object obtained from getIdTokenResult. It
 * contains the ID token JWT string and other helper properties for getting
 * different data associated with the token as well as all the decoded payload
 * claims.
 * @param {string} tokenString The JWT token.
 * @constructor
 */
fireauth.IdTokenResult = function(tokenString) {
  var idToken = fireauth.IdToken.parseIdTokenClaims(tokenString);
  if (!idToken || !idToken['exp'] || !idToken['auth_time'] || !idToken['iat']) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'An internal error occurred. The token obtained by Firebase appears ' +
        'to be malformed. Please retry the operation.');
  }
  fireauth.object.setReadonlyProperties(this, {
    'token': tokenString,
    'expirationTime': fireauth.util.utcTimestampToDateString(
        idToken['exp'] * 1000),
    'authTime': fireauth.util.utcTimestampToDateString(
        idToken['auth_time'] * 1000),
    'issuedAtTime': fireauth.util.utcTimestampToDateString(
        idToken['iat'] * 1000),
    'signInProvider': (idToken['firebase'] &&
                       idToken['firebase']['sign_in_provider']) ?
                      idToken['firebase']['sign_in_provider'] : null,
    'claims': idToken
  });
};
