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
 * @fileoverview Defines the firebase.auth.ConfirmationResult. This is needed
 * to provide first class support for phone Auth API: signInWithPhoneNumber,
 * linkWithPhoneNumber and reauthenticateWithPhoneNumber.
 */

goog.provide('fireauth.ConfirmationResult');

goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.object');
goog.require('goog.Promise');


/**
 * The confirmation result class. This takes in the verification ID returned
 * from the phone Auth provider and the credential resolver to run when
 * confirming with a verification code.
 * @param {string} verificationId The verification ID returned from the Phone
 *     Auth provider after sending the verification code.
 * @param {!function(!fireauth.AuthCredential):
 *     !goog.Promise<!fireauth.AuthEventManager.Result>} credentialResolver a
 *     function that takes in an AuthCredential and returns a promise that
 *     resolves with a UserCredential object.
 * @constructor
 */
fireauth.ConfirmationResult = function(verificationId, credentialResolver) {
  /**
   * @const @private {!function(!fireauth.AuthCredential):
   *     !goog.Promise<!fireauth.AuthEventManager.Result>} A function that takes
   *     in an AuthCredential and returns a promise that resolves with a
   *     UserCredential object.
   */
  this.credentialResolver_ = credentialResolver;
  // Set verificationId as read-only property.
  fireauth.object.setReadonlyProperty(this, 'verificationId', verificationId);
};


/**
 * Confirms the verification code and returns a promise that resolves with the
 * User Credential object.
 * @param {string} verificationCode The phone Auth verification code to use to
 *     complete the Auth flow.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.ConfirmationResult.prototype.confirm = function(verificationCode) {
  // Initialize a phone Auth credential with the verification ID and code.
  var credential = fireauth.PhoneAuthProvider.credential(
      this['verificationId'], verificationCode);
  // Run the credential resolver with the phone Auth credential and return its
  // result.
  return this.credentialResolver_(credential);
};


/**
 * Initializes a ConfirmationResult using the provided phone number, app
 * verifier and returns it asynchronously. On code confirmation, the result will
 * resolve using the credential resolver provided.
 * @param {!fireauth.Auth} auth The corresponding Auth instance.
 * @param {string} phoneNumber The phone number to authenticate with.
 * @param {!firebase.auth.ApplicationVerifier} appVerifier The application
 *     verifier.
 * @param {!function(!fireauth.AuthCredential):
 *     !goog.Promise<!fireauth.AuthEventManager.Result>} credentialResolver a
 *     function that takes in an AuthCredential and returns a promise that
 *     resolves with a UserCredential object.
 * @return {!goog.Promise<!fireauth.ConfirmationResult>}
 */
fireauth.ConfirmationResult.initialize =
    function(auth, phoneNumber, appVerifier, credentialResolver) {
  // Initialize a phone Auth provider instance using the provided Auth
  // instance.
  var phoneAuthProvider = new fireauth.PhoneAuthProvider(auth);
  // Verify the phone number.
  return phoneAuthProvider.verifyPhoneNumber(phoneNumber, appVerifier)
      .then(function(verificationId) {
        // When code is sent and verification ID is returned, initialize a
        // ConfirmationResult with the returned verification ID and credential
        // resolver, and return that instance.
        return new fireauth.ConfirmationResult(
            verificationId, credentialResolver);
      });
};
