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
 * @fileoverview Defines the `fireauth.MultiFactorAuthCredential` interface.
 * This is used for `firebase.auth.AuthCredentials` that can be used for 2nd
 * factor sign-in too.
 */

goog.provide('fireauth.MultiFactorAuthCredential');
goog.provide('fireauth.MultiFactorEnrollmentRequestIdentifier');
goog.provide('fireauth.MultiFactorSignInRequestIdentifier');

goog.forwardDeclare('fireauth.AuthCredential');


/**
 * Type specifying the EnrollmentRequest interface to be passed along the
 * AuthCredential's verificationInfo. This is used to identify the user
 * enrolling the factor and additional 2nd factor information such as the
 * display name.
 * @typedef {{
 *   idToken: string,
 *   displayName: (?string|undefined)
 * }}
 */
fireauth.MultiFactorEnrollmentRequestIdentifier;


/**
 * Type specifying the SignInRequest interface to be passed along the
 * AuthCredential's verificationInfo. This is used to identify the user
 * who already verified the first factor.
 * @typedef {{
 *   mfaPendingCredential: string
 * }}
 */
fireauth.MultiFactorSignInRequestIdentifier;


/**
 * Interface representing AuthCredentials that can also be used as second factor
 * credentials.
 * @extends {fireauth.AuthCredential}
 * @interface
 */
fireauth.MultiFactorAuthCredential = function() {};


/**
 * The credential provider ID.
 * @type {string} The provider ID.
 */
fireauth.MultiFactorAuthCredential.prototype.providerId;


/**
 * Finalizes the 2nd factor enrollment flow with the current AuthCredential
 * using the enrollment request identifier.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorEnrollmentRequestIdentifier} enrollmentRequest
 *     The enrollment request identifying the user.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the updated ID and refresh tokens.
 */
fireauth.MultiFactorAuthCredential.prototype.finalizeMfaEnrollment =
    function(rpcHandler, enrollmentRequest) {};


/**
 * Finalizes the 2nd factor sign-in flow with the current AuthCredential
 * using the sign-in request identifier.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler instance.
 * @param {!fireauth.MultiFactorSignInRequestIdentifier} signInRequest
 *     The sign-in request identifying the user.
 * @return {!goog.Promise<{idToken: string, refreshToken: string}>} A promise
 *     that resolves with the signed in user's ID and refresh tokens.
 */
fireauth.MultiFactorAuthCredential.prototype.finalizeMfaSignIn =
    function(rpcHandler, signInRequest) {};
