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
 * @fileoverview Tests for multifactorgenerator.js
 */

goog.provide('fireauth.MultiFactorGeneratorTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.PhoneMultiFactorAssertion');
goog.require('fireauth.PhoneMultiFactorGenerator');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.MultiFactorGeneratorTest');


var verificationId = 'SESSION_INFO';
var verificationCode = '123456';


function testPhoneMultiFactorGenerator() {
  assertEquals(
      fireauth.constants.SecondFactorType.PHONE,
      fireauth.PhoneMultiFactorGenerator.FACTOR_ID);
}


function testPhoneMultiFactorGenerator_assertion_success() {
  var phoneAuthCredential = fireauth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  var assertion =
      fireauth.PhoneMultiFactorGenerator.assertion(phoneAuthCredential);

  assertTrue(assertion instanceof fireauth.PhoneMultiFactorAssertion);
  assertObjectEquals(
      new fireauth.PhoneMultiFactorAssertion(phoneAuthCredential),
      assertion);
}


function testPhoneMultiFactorGenerator_assertion_error() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR,
      'firebase.auth.PhoneMultiFactorAssertion requires a valid ' +
      'firebase.auth.PhoneAuthCredential');
  var authCredential = fireauth.EmailAuthProvider.credential(
      'user@example.com', 'password');

  var error = assertThrows(function() {
    return fireauth.PhoneMultiFactorGenerator.assertion(authCredential);
  });

  fireauth.common.testHelper.assertErrorEquals(
      expectedError,
      error);
}
