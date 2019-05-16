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
 * @fileoverview Defines the multi-factor resolver class used to facilitate
 *     recovery when a multi-factor user tries to sign-in with a first factor.
 */

goog.provide('fireauth.MultiFactorResolver');

goog.require('fireauth.AuthError');
goog.require('fireauth.MultiFactorInfo');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.object');
goog.require('goog.array');
goog.require('goog.object');


/**
 * Initializes a `MultiFactorResolver` instance. This is used when a
 * multi-factor user signs in with the first factor but is required to provide
 * a second factor assertion before completing sign-in.
 *
 * @param {!fireauth.Auth} auth The Auth instance.
 * @param {!fireauth.MultiFactorResolver.ErrorResponse} errorResponse The server
 *     error response containing the pending multi-factor credential.
 * @param {function({idToken: string, refreshToken: string}):
 *         !goog.Promise<!fireauth.AuthEventManager.Result>} onIdTokenResolver
 *     A function that takes the assertion token response and any previous
 *     information returned with the error and completes sign in with a
 *     `UserCredential`.
 * @constructor
 */
fireauth.MultiFactorResolver = function(
    auth, errorResponse, onIdTokenResolver) {
  var pendingCredential = errorResponse && errorResponse[
      fireauth.MultiFactorResolver.SignInResponseField.MFA_PENDING_CREDENTIAL];
  if (!pendingCredential) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'Internal assert: Invalid MultiFactorResolver');
  }
  /** @const @private {!fireauth.Auth} The Auth instance. */
  this.auth_ = auth;
  /**
   * @const @private {!fireauth.MultiFactorResolver.ErrorResponse} The server
   *     error response with the pending credential.
   */
  this.errorResponse_ = goog.object.clone(errorResponse);
  /**
   * @const @private {function({idToken: string, refreshToken: string}):
   *                  !goog.Promise<!fireauth.AuthEventManager.Result>} The ID
   *     token resolver.
   */
  this.onIdTokenResolver_ = onIdTokenResolver;
  /**
   * @const @private {!fireauth.MultiFactorSession} The corresponding
   *     multi-factor session.
   */
  this.session_ = new fireauth.MultiFactorSession(
      null,
      pendingCredential);
  /**
   * @const @private {!Array<!fireauth.MultiFactorInfo>} The list of
   *     multi-factor hints corresponding to the current user session.
   */
  this.hints_ = [];
  var enrollmentList = errorResponse[
      fireauth.MultiFactorResolver.SignInResponseField.MFA_INFO] || [];
  var self = this;
  goog.array.forEach(enrollmentList, function(mfaEnrollment) {
    var info = fireauth.MultiFactorInfo.fromServerResponse(mfaEnrollment);
    if (info) {
      self.hints_.push(info);
    }
  });
  fireauth.object.setReadonlyProperty(this, 'auth', this.auth_);
  fireauth.object.setReadonlyProperty(this, 'session', this.session_);
  fireauth.object.setReadonlyProperty(
      this, 'hints', this.hints_);
};


/**
 * The server side error response on multi-factor sign-in.
 * @typedef {{
 *   mfaInfo: (?Array<!Object>|undefined),
 *   mfaPendingCredential: (?string|undefined)
 * }}
 */
fireauth.MultiFactorResolver.ErrorResponse;

/**
 * Sign in response fields for multi-factor sign-in.
 * @enum {string}
 */
fireauth.MultiFactorResolver.SignInResponseField = {
  MFA_INFO: 'mfaInfo',
  MFA_PENDING_CREDENTIAL: 'mfaPendingCredential'
};


/**
 * Completes the second factor sign-in with the multi-factor assertion provided
 * and returns a promise that resolves with the `UserCredential` object.
 *
 * @param {!fireauth.MultiFactorAssertion} assertion The multi-factor assertion
 *     to resolve sign-in with.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>} A promise that
 *     resolves with the `UserCredential` after ID token processing.
 */
fireauth.MultiFactorResolver.prototype.resolveSignIn = function(assertion) {
  var self = this;
  return assertion.process(this.auth_.getRpcHandler(), this.session_)
      .then(function(result) {
        var newSignInResponse = goog.object.clone(self.errorResponse_);
        // These fields are no longer needed.
        delete newSignInResponse[
            fireauth.MultiFactorResolver.SignInResponseField.MFA_INFO];
        delete newSignInResponse[fireauth.MultiFactorResolver
            .SignInResponseField.MFA_PENDING_CREDENTIAL];
        goog.object.extend(newSignInResponse, result);
        // Return ID token/refresh token result and the original error response.
        // This is needed as the original server response may contain additional
        // data such as OAuth credentials, raw user info, etc that needs to be
        // returned to the developer on successful sign-in.
        return self.onIdTokenResolver_(
            /** @type {{idToken: string, refreshToken: string}} */ (
                newSignInResponse));
      });
};
