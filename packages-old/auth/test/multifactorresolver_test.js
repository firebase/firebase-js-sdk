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
 * @fileoverview Tests for multifactorresolver.js
 */

goog.provide('fireauth.MultiFactorResolverTest');

goog.require('fireauth.Auth');
goog.require('fireauth.AuthError');
goog.require('fireauth.MultiFactorAssertion');
goog.require('fireauth.MultiFactorInfo');
goog.require('fireauth.MultiFactorResolver');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('goog.Promise');
goog.require('goog.object');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.MultiFactorResolverTest');


var mockControl;
var app = firebase.initializeApp({
  apiKey: 'myApiKey'
});
var auth = new fireauth.Auth(app);
var enrollmentList;
var pendingCredential;
var serverResponse;
var serverResponseWithOtherInfo;
var mockUserCredential;
var onIdTokenResolver;
var successTokenResponse;
var now = new Date();

function setUp() {
  pendingCredential = 'PENDING_CREDENTIAL';
  enrollmentList = [
    {
      'mfaEnrollmentId': 'ENROLLMENT_UID1',
      'enrolledAt': now.toISOString(),
      'phoneInfo': '+*******1234'
    },
    {
      'mfaEnrollmentId': 'ENROLLMENT_UID2',
      'displayName': 'Spouse phone number',
      'enrolledAt': now.toISOString(),
      'phoneInfo': '+*******6789'
    }
  ];
  serverResponse = {
    'mfaInfo': enrollmentList,
    'mfaPendingCredential': pendingCredential
  };
  serverResponseWithOtherInfo = goog.object.clone(serverResponse);
  goog.object.extend(serverResponseWithOtherInfo, {
    // Credential returned.
    'providerId': 'google.com',
    'oauthAccessToken': 'googleAccessToken',
    'oauthIdToken': 'googleIdToken',
    'oauthExpireIn': 3600,
    // Additional user info data.
    'rawUserInfo': '{"kind":"plus#person","displayName":"John Doe",' +
        '"name":{"givenName":"John","familyName":"Doe"}}'
  });
  mockUserCredential = {
    'user': 'User',
    'credential': 'Credential'
  };
  onIdTokenResolver = function(signInResponse) {
    return goog.Promise.resolve(mockUserCredential);
  };
  successTokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'firebase': {
        'sign_in_provider': 'password',
        'sign_in_second_factor': 'phone'
      }
    }),
    'refreshToken': 'REFRESH_TOKEN'
  };
  mockControl = new goog.testing.MockControl();
}


function tearDown() {
  onIdTokenResolver = null;
  mockUserCredential = null;
  enrollmentList = null;
  pendingCredential = null;
  successTokenResponse = null;
  mockControl.$verifyAll();
  mockControl.$tearDown();
}


function testMultiFactorResolver_valid() {
  var expectedHints = [
    fireauth.MultiFactorInfo.fromServerResponse(enrollmentList[0]),
    fireauth.MultiFactorInfo.fromServerResponse(enrollmentList[1])
  ];
  var expectedSession = new fireauth.MultiFactorSession(
      null, pendingCredential);

  var resolver = assertNotThrows(function() {
    return new fireauth.MultiFactorResolver(
        auth, serverResponse, onIdTokenResolver);
  });

  assertEquals(auth, resolver.auth);
  assertArrayEquals(expectedHints, resolver.hints);
  assertObjectEquals(expectedSession, resolver.session);
}


function testMultiFactorResolver_invalid() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR,
      'Internal assert: Invalid MultiFactorResolver');

  var error = assertThrows(function() {
    // Pending credential must be provided.
    return new fireauth.MultiFactorResolver(
        auth, {'mfaInfo': enrollmentList}, onIdTokenResolver);
  });

  fireauth.common.testHelper.assertErrorEquals(
      expectedError,
      error);
}


function testMultiFactorResolver_resolveSignIn_success() {
  var newSignInResponse = goog.object.clone(serverResponseWithOtherInfo);
  goog.object.extend(newSignInResponse, successTokenResponse);
  delete newSignInResponse['mfaInfo'];
  delete newSignInResponse['mfaPendingCredential'];

  var onIdTokenResolver = mockControl.createFunctionMock('onIdTokenResolver');
  var resolver = new fireauth.MultiFactorResolver(
      auth, serverResponseWithOtherInfo, onIdTokenResolver);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);

  // Simulate assertion processing resolves with the successful token response.
  mockAssertion.process(auth.getRpcHandler(), resolver.session)
      .$once()
      .$returns(goog.Promise.resolve(successTokenResponse));
  // Simulate ID token resolver resolves with the mock UserCredential.
  onIdTokenResolver(newSignInResponse)
      .$once()
      .$returns(goog.Promise.resolve(mockUserCredential));

  mockControl.$replayAll();

  return resolver.resolveSignIn(mockAssertion)
      .then(function(actualUserCredential) {
        assertEquals(mockUserCredential, actualUserCredential);
      });
}


function testMultiFactorResolver_resolveSignIn_assertionError() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CODE_EXPIRED);
  var onIdTokenResolver = mockControl.createFunctionMock('onIdTokenResolver');
  var resolver = new fireauth.MultiFactorResolver(
      auth, serverResponseWithOtherInfo, onIdTokenResolver);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);

  // Simulate assertion processing rejects with an error.
  mockAssertion.process(auth.getRpcHandler(), resolver.session)
      .$once()
      .$returns(goog.Promise.reject(expectedError));
  // onIdTokenResolver should not be called.
  onIdTokenResolver(goog.testing.mockmatchers.ignoreArgument).$times(0);

  mockControl.$replayAll();

  return resolver.resolveSignIn(mockAssertion)
      .then(fail)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
      });
}


function testMultiFactorResolver_resolveSignIn_onIdTokenResolverError() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_MISMATCH);
  var newSignInResponse = goog.object.clone(serverResponseWithOtherInfo);
  goog.object.extend(newSignInResponse, successTokenResponse);
  delete newSignInResponse['mfaInfo'];
  delete newSignInResponse['mfaPendingCredential'];

  var onIdTokenResolver = mockControl.createFunctionMock('onIdTokenResolver');
  var resolver = new fireauth.MultiFactorResolver(
      auth, serverResponseWithOtherInfo, onIdTokenResolver);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);

  // Simulate assertion processing resolves with the successful token response.
  mockAssertion.process(auth.getRpcHandler(), resolver.session)
      .$once()
      .$returns(goog.Promise.resolve(successTokenResponse));
  // Simulate onIdTokenResolver fails with a network error.
  onIdTokenResolver(newSignInResponse)
      .$once()
      .$returns(goog.Promise.reject(expectedError));

  mockControl.$replayAll();

  return resolver.resolveSignIn(mockAssertion)
      .then(fail)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
      });
}
