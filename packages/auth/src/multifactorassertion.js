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
 * @fileoverview Defines the `firebase.auth.MultiFactorAssertion` abstract class
 * and all its subclasses, such as PhoneMultiFactorAssertion.
 */

goog.provide('fireauth.AuthCredentialMultiFactorAssertion');
goog.provide('fireauth.MultiFactorAssertion');
goog.provide('fireauth.PhoneMultiFactorAssertion');

goog.require('fireauth.AuthError');
goog.require('fireauth.MultiFactorAuthCredential');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.object');


/**
 * Abstract class representing a `firebase.auth.MultiFactorAssertion` interface.
 * This is used to facilitate enrollment of a second factor on an existing user
 * or sign-in of a user who already verified the first factor.
 * @abstract
 * @constructor
 */
fireauth.MultiFactorAssertion = function() {};


/**
 * Finalizes the 2nd factor enrollment flow with the current
 * MultiFactorAssertion.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorEnrollmentRequestIdentifier} enrollmentRequest
 *     The enrollment request identifying the user.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the updated ID and refresh tokens.
 * @protected
 */
fireauth.MultiFactorAssertion.prototype.finalizeEnrollmentWithVerificationInfo =
    goog.abstractMethod;


/**
 * Finalizes the 2nd factor sign-in flow with the current MultiFactorAssertion.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorSignInRequestIdentifier} signInRequest
 *     The sign-in request identifying the user.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the signed in user's ID and refresh tokens.
 * @protected
 */
fireauth.MultiFactorAssertion.prototype.finalizeSignInWithVerificationInfo =
    goog.abstractMethod;


/**
 * Processes the `MultiFactorAssertion` instance using the `MultiFactorSession`
 * provided and optional display name for enrollment flows.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorSession} session The multi-factor session
 *     instance.
 * @param {?string=} displayName The optional display name for a multi-factor
 *     enrollment.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the signed in or enrolled user's ID and refresh
 *     tokens.
 */
fireauth.MultiFactorAssertion.prototype.process =
    function(rpcHandler, session, displayName) {
  // Session obtained from user in enroll.
  // It is obtained from error in resolver.
  if (session.type == fireauth.MultiFactorSession.Type.ENROLL) {
    return this.finalizeMfaEnrollment_(rpcHandler, session, displayName);
  } else {
    return this.finalizeMfaSignIn_(rpcHandler, session);
  }
};


/**
 * Finalizes the multi-factor enrollment.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorSession} session The multi-factor session for
 *     the current signed in user.
 * @param {?string=} displayName The optional display name for a multi-factor
 *     enrollment.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the enrolled user's ID and refresh tokens.
 * @private
 */
fireauth.MultiFactorAssertion.prototype.finalizeMfaEnrollment_ =
    function(rpcHandler, session, displayName) {
  var self = this;
  return session.getRawSession().then(function(rawSession) {
    var request = {
      'idToken': rawSession
    };
    if (typeof displayName !== 'undefined') {
      request['displayName'] = displayName;
    }
    return self.finalizeEnrollmentWithVerificationInfo(rpcHandler, request);
  });
};


/**
 * Finalizes the multi-factor sign-in.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorSession} session The multi-factor session for
 *     the multi-factor enrolled user trying to sign-in.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the signed in user's ID and refresh tokens.
 * @private
 */
fireauth.MultiFactorAssertion.prototype.finalizeMfaSignIn_ =
    function(rpcHandler, session) {
  var self = this;
  return session.getRawSession().then(function(rawSession) {
    var request = {
      'mfaPendingCredential': rawSession,
    };
    return self.finalizeSignInWithVerificationInfo(rpcHandler, request);
  });
};


/**
 * Defines a class for handling MultiFactorAssertions based on
 * `MultiFactorAuthCredentials`.
 * @param {!fireauth.MultiFactorAuthCredential} multiFactorAuthCredential The
 *     multi-factor AuthCredential.
 * @constructor
 * @extends {fireauth.MultiFactorAssertion}
 */
fireauth.AuthCredentialMultiFactorAssertion =
    function(multiFactorAuthCredential) {
  // This assumes the factor ID matches the credential providerId.
  // If this is ever not true, the subclass can overwrite that.
  fireauth.object.setReadonlyProperty(
      this, 'factorId', multiFactorAuthCredential.providerId);
  /**
   * @protected {!fireauth.MultiFactorAuthCredential} The underlying
   *     multi-factor AuthCredential.
   */
  this.multiFactorAuthCredential = multiFactorAuthCredential;
};
goog.inherits(
    fireauth.AuthCredentialMultiFactorAssertion, fireauth.MultiFactorAssertion);


/**
 * Finalizes the 2nd factor enrollment flow with the current
 * MultiFactorAssertion.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorEnrollmentRequestIdentifier} enrollmentRequest
 *     The enrollment request identifying the user.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the updated ID and refresh tokens.
 * @protected
 * @override
 */
fireauth.AuthCredentialMultiFactorAssertion.prototype
    .finalizeEnrollmentWithVerificationInfo = function(rpcHandler,
                                                       enrollmentRequest) {
  return this.multiFactorAuthCredential.finalizeMfaEnrollment(
      rpcHandler, enrollmentRequest);
};


/**
 * Finalizes the 2nd factor sign-in flow with the current MultiFactorAssertion.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorSignInRequestIdentifier} signInRequest
 *     The sign-in request identifying the user.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the signed in user's ID and refresh tokens.
 * @protected
 * @override
 */
fireauth.AuthCredentialMultiFactorAssertion.prototype
    .finalizeSignInWithVerificationInfo = function(rpcHandler,
                                                   signInRequest) {
  return this.multiFactorAuthCredential.finalizeMfaSignIn(
      rpcHandler, signInRequest);
};


/**
 * Defines a class for handling MultiFactorAssertions based on
 * PhoneAuthCredentials. This class extends `AuthCredentialMultiFactorAssertion`
 * but for `PhoneAuthCredentials` only.
 * @param {!fireauth.PhoneAuthCredential} phoneAuthCredential
 * @constructor
 * @extends {fireauth.AuthCredentialMultiFactorAssertion}
 */
fireauth.PhoneMultiFactorAssertion = function(phoneAuthCredential) {
  fireauth.PhoneMultiFactorAssertion.base(
      this, 'constructor', phoneAuthCredential);
  // This class supports phone credentials only.
  if (this.multiFactorAuthCredential.providerId !=
      fireauth.PhoneAuthProvider['PROVIDER_ID']) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'firebase.auth.PhoneMultiFactorAssertion requires a valid ' +
        'firebase.auth.PhoneAuthCredential');
  }
};
goog.inherits(
    fireauth.PhoneMultiFactorAssertion,
    fireauth.AuthCredentialMultiFactorAssertion);
