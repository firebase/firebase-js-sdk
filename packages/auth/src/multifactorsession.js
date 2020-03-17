/**
 * @license
 * Copyright 2019 Google Inc.
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
 * @fileoverview Defines the multi-factor session object used for enrolling a
 * second factor on a user or helping sign in an enrolled user with a second
 * factor.
 */

goog.provide('fireauth.MultiFactorSession');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('goog.Promise');


/**
 * Initializes an instance of a multi-factor session object used for enrolling
 * a second factor on a user or helping sign in an enrolled user with a second
 * factor.
 * This will be constructed either after calling `user.getIdToken()` or from the
 * error containing the pending MFA credential after sign-in.
 * @param {?string} idToken The ID token for an enroll flow. This has to be
 *     retrieved after recent authentication.
 * @param {?string=} mfaPendingCredential The pending credential after an
 *     enrolled second factor user signs in successfully with the first factor.
 * @constructor
 */
fireauth.MultiFactorSession = function(idToken, mfaPendingCredential) {
  if (!idToken && !mfaPendingCredential) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'Internal assert: no raw session string available');
  }
  // Both fields should never be passed at the same time.
  if (idToken && mfaPendingCredential) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'Internal assert: unable to determine the session type');
  }
  /** @const @private {?string} The ID token for an enroll flow. */
  this.idToken_ = idToken || null;
  /** @const @private {?string} The pending credential for a sign-in flow. */
  this.mfaPendingCredential_ = mfaPendingCredential || null;
  /** @const @public {!fireauth.MultiFactorSession.Type} The session type.*/
  this.type = this.idToken_ ?
      fireauth.MultiFactorSession.Type.ENROLL :
      fireauth.MultiFactorSession.Type.SIGN_IN;
};


/**
 * Enum representing the type of multi-factor session.
 * @enum {string}
 */
fireauth.MultiFactorSession.Type = {
  ENROLL: 'enroll',
  SIGN_IN: 'signin'
};


/**
 * Returns a promise that resolves with the raw session string.
 * @return {!goog.Promise<string>} A promise that resolves with the raw session
 *     string.
 */
fireauth.MultiFactorSession.prototype.getRawSession = function() {
  return this.idToken_ ?
      goog.Promise.resolve(this.idToken_) :
      goog.Promise.resolve(this.mfaPendingCredential_);
};


/**
 * Returns the plain object representation of the session object.
 * @return {!Object} The plain object representation of the session object.
 */
fireauth.MultiFactorSession.prototype.toPlainObject = function() {
  if (this.type == fireauth.MultiFactorSession.Type.ENROLL) {
    return {
      'multiFactorSession': {
        'idToken': this.idToken_
      }
    };
  } else {
    return {
      'multiFactorSession': {
        'pendingCredential': this.mfaPendingCredential_
      }
    };
  }
};


/**
 * Converts a plain object to a `fireauth.MultiFactorSession` if applicable.
 * @param {?Object} obj The plain object to convert to a
 *     `fireauth.MultiFactorSession`.
 * @return {?fireauth.MultiFactorSession} The corresponding
 *     `fireauth.MultiFactorSession` representation, null otherwise.
 */
fireauth.MultiFactorSession.fromPlainObject = function(obj) {
  if (obj && obj['multiFactorSession']) {
    if (obj['multiFactorSession']['pendingCredential']) {
      return new fireauth.MultiFactorSession(
          null, obj['multiFactorSession']['pendingCredential']);
    } else if (obj['multiFactorSession']['idToken']) {
      return new fireauth.MultiFactorSession(
          obj['multiFactorSession']['idToken'], null);
    }
  }
  return null;
};
