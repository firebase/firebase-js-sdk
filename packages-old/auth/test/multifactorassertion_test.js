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
 * @fileoverview Tests for multifactorassertion.js
 */

goog.provide('fireauth.MultiFactorAssertionTest');

goog.require('fireauth.AuthCredentialMultiFactorAssertion');
goog.require('fireauth.AuthError');
goog.require('fireauth.MultiFactorAuthCredential');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.PhoneMultiFactorAssertion');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('goog.Promise');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.MultiFactorAssertionTest');


var mockControl;
var jwt = fireauth.common.testHelper.createMockJwt({
  'firebase': {
    'sign_in_provider': 'password'
  }
});
var pendingCredential = 'MFA_PENDING_CREDENTIAL';
var verificationId = 'SESSION_INFO';
var verificationCode = '123456';
var factorDisplayName = 'Work phone number';
var enrollSession;
var signInSession;
var phoneAuthCredential;
var successTokenResponse = {
  'idToken': fireauth.common.testHelper.createMockJwt({
    'firebase': {
      'sign_in_provider': 'password',
      'sign_in_second_factor': 'phone'
    }
  }),
  'refreshToken': 'REFRESH_TOKEN'
};

function setUp() {
  phoneAuthCredential = fireauth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  enrollSession = new fireauth.MultiFactorSession(jwt);
  signInSession = new fireauth.MultiFactorSession(null, pendingCredential);
  mockControl = new goog.testing.MockControl();
}


function tearDown() {
  enrollSession = null;
  signInSession = null;
  mockControl.$verifyAll();
  mockControl.$tearDown();
}


function testAuthCredentialMultiFactorAssertion_process_enrollSuccess() {
  var expectedEnrollRequestIdentifier = {
    'idToken': jwt,
    'displayName': factorDisplayName
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  var authCredential = mockControl.createStrictMock(
      fireauth.MultiFactorAuthCredential);
  authCredential['providerId'] = 'PROVIDER_ID';
  authCredential.finalizeMfaEnrollment(
      rpcHandler, expectedEnrollRequestIdentifier).$once()
      .$returns(goog.Promise.resolve(successTokenResponse));

  mockControl.$replayAll();

  var assertion =
      new fireauth.AuthCredentialMultiFactorAssertion(authCredential);

  assertEquals(authCredential['providerId'], assertion['factorId']);
  return assertion.process(rpcHandler, enrollSession, factorDisplayName)
      .then(function(result) {
        assertObjectEquals(successTokenResponse, result);
      });
}


function testAuthCredentialMultiFactorAssertion_process_enrollSuccess_noName() {
  var expectedEnrollRequestIdentifier = {
    'idToken': jwt
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  var authCredential = mockControl.createStrictMock(
      fireauth.MultiFactorAuthCredential);
  authCredential['providerId'] = 'PROVIDER_ID';
  authCredential.finalizeMfaEnrollment(
      rpcHandler, expectedEnrollRequestIdentifier).$once()
      .$returns(goog.Promise.resolve(successTokenResponse));

  mockControl.$replayAll();

  var assertion =
      new fireauth.AuthCredentialMultiFactorAssertion(authCredential);

  assertEquals(authCredential['providerId'], assertion['factorId']);
  return assertion.process(rpcHandler, enrollSession)
      .then(function(result) {
        assertObjectEquals(successTokenResponse, result);
      });
}


function testAuthCredentialMultiFactorAssertion_process_enrollError() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CREDENTIAL_TOO_OLD_LOGIN_AGAIN);
  var expectedEnrollRequestIdentifier = {
    'idToken': jwt,
    'displayName': factorDisplayName
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  var authCredential = mockControl.createStrictMock(
      fireauth.MultiFactorAuthCredential);
  authCredential['providerId'] = 'PROVIDER_ID';
  authCredential.finalizeMfaEnrollment(
      rpcHandler, expectedEnrollRequestIdentifier).$once()
      .$returns(goog.Promise.reject(expectedError));

  mockControl.$replayAll();

  var assertion =
      new fireauth.AuthCredentialMultiFactorAssertion(authCredential);

  assertEquals(authCredential['providerId'], assertion['factorId']);
  return assertion.process(rpcHandler, enrollSession, factorDisplayName)
      .then(fail)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      });
}


function testAuthCredentialMultiFactorAssertion_process_signInSuccess() {
  var expectedSignInRequestIdentifier = {
    'mfaPendingCredential': pendingCredential
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  var authCredential = mockControl.createStrictMock(
      fireauth.MultiFactorAuthCredential);
  authCredential['providerId'] = 'PROVIDER_ID';
  authCredential.finalizeMfaSignIn(
      rpcHandler, expectedSignInRequestIdentifier).$once()
      .$returns(goog.Promise.resolve(successTokenResponse));

  mockControl.$replayAll();

  var assertion =
      new fireauth.AuthCredentialMultiFactorAssertion(authCredential);

  assertEquals(authCredential['providerId'], assertion['factorId']);
  return assertion.process(rpcHandler, signInSession)
      .then(function(result) {
        assertObjectEquals(successTokenResponse, result);
      });
}


function testAuthCredentialMultiFactorAssertion_process_signInError() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CODE_EXPIRED);
  var expectedSignInRequestIdentifier = {
    'mfaPendingCredential': pendingCredential
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  var authCredential = mockControl.createStrictMock(
      fireauth.MultiFactorAuthCredential);
  authCredential['providerId'] = 'PROVIDER_ID';
  authCredential.finalizeMfaSignIn(
      rpcHandler, expectedSignInRequestIdentifier).$once()
      .$returns(goog.Promise.reject(expectedError));

  mockControl.$replayAll();

  var assertion =
      new fireauth.AuthCredentialMultiFactorAssertion(authCredential);

  assertEquals(authCredential['providerId'], assertion['factorId']);
  return assertion.process(rpcHandler, signInSession)
      .then(fail)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      });
}


function testPhoneMultiFactorAssertion_invalid() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR,
      'firebase.auth.PhoneMultiFactorAssertion requires a valid ' +
      'firebase.auth.PhoneAuthCredential');
  var authCredential = mockControl.createStrictMock(
      fireauth.MultiFactorAuthCredential);
  // Simulate non-phone AuthCredential.
  authCredential['providerId'] = 'PROVIDER_ID';

  var error = assertThrows(function() {
    return new fireauth.PhoneMultiFactorAssertion(authCredential);
  });

  fireauth.common.testHelper.assertErrorEquals(
      expectedError,
      error);
}


function testPhoneMultiFactorAssertion_process_enrollSuccess() {
  var expectedEnrollRequest = {
    'idToken': jwt,
    'displayName': factorDisplayName,
    'phoneVerificationInfo': {
      'sessionInfo': verificationId,
      'code': verificationCode
    }
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.finalizePhoneMfaEnrollment(expectedEnrollRequest).$once()
      .$returns(goog.Promise.resolve(successTokenResponse));

  mockControl.$replayAll();

  var assertion = new fireauth.PhoneMultiFactorAssertion(phoneAuthCredential);

  assertEquals('phone', assertion['factorId']);
  return assertion.process(rpcHandler, enrollSession, factorDisplayName)
      .then(function(result) {
        assertObjectEquals(successTokenResponse, result);
      });
}


function testPhoneMultiFactorAssertion_process_enrollError() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CREDENTIAL_TOO_OLD_LOGIN_AGAIN);
  var expectedEnrollRequest = {
    'idToken': jwt,
    'displayName': factorDisplayName,
    'phoneVerificationInfo': {
      'sessionInfo': verificationId,
      'code': verificationCode
    }
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.finalizePhoneMfaEnrollment(expectedEnrollRequest).$once()
      .$returns(goog.Promise.reject(expectedError));

  mockControl.$replayAll();

  var assertion = new fireauth.PhoneMultiFactorAssertion(phoneAuthCredential);

  assertEquals('phone', assertion['factorId']);
  return assertion.process(rpcHandler, enrollSession, factorDisplayName)
      .then(fail)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      });
}


function testPhoneMultiFactorAssertion_process_signInSuccess() {
  var expectedSignInRequest = {
    'mfaPendingCredential': pendingCredential,
    'phoneVerificationInfo': {
      'sessionInfo': verificationId,
      'code': verificationCode
    }
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.finalizePhoneMfaSignIn(expectedSignInRequest).$once()
      .$returns(goog.Promise.resolve(successTokenResponse));

  mockControl.$replayAll();

  var assertion = new fireauth.PhoneMultiFactorAssertion(phoneAuthCredential);

  assertEquals('phone', assertion['factorId']);
  return assertion.process(rpcHandler, signInSession)
      .then(function(result) {
        assertObjectEquals(successTokenResponse, result);
      });
}


function testPhoneMultiFactorAssertion_process_signInError() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CODE_EXPIRED);
  var expectedSignInRequest = {
    'mfaPendingCredential': pendingCredential,
    'phoneVerificationInfo': {
      'sessionInfo': verificationId,
      'code': verificationCode
    }
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.finalizePhoneMfaSignIn(expectedSignInRequest).$once()
      .$returns(goog.Promise.reject(expectedError));

  mockControl.$replayAll();

  var assertion = new fireauth.PhoneMultiFactorAssertion(phoneAuthCredential);

  assertEquals('phone', assertion['factorId']);
  return assertion.process(rpcHandler, signInSession)
      .then(fail)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      });
}
