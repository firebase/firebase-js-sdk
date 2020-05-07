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
 * @fileoverview Tests for multifactorerror.js
 */

goog.provide('fireauth.MultiFactorErrorTest');

goog.require('fireauth.Auth');
goog.require('fireauth.MultiFactorError');
goog.require('fireauth.MultiFactorResolver');
goog.require('fireauth.authenum.Error');
goog.require('goog.Promise');
goog.require('goog.object');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.MultiFactorErrorTest');


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
}


function tearDown() {
  onIdTokenResolver = null;
  mockUserCredential = null;
  enrollmentList = null;
  pendingCredential = null;
}


function testMultiFactorError_defaultMessage() {
  var expectedResolver =
      new fireauth.MultiFactorResolver(auth, serverResponse, onIdTokenResolver);

  var error = new fireauth.MultiFactorError(
      auth, serverResponse, onIdTokenResolver);

  assertEquals('auth/' + fireauth.authenum.Error.MFA_REQUIRED, error.code);
  assertEquals(
      'Proof of ownership of a second factor is required to complete sign-in.',
      error.message);
  assertObjectEquals(serverResponse, error.serverResponse);
  assertObjectEquals(expectedResolver, error.resolver);
}


function testMultiFactorError_customMessage() {
  var expectedResolver = new fireauth.MultiFactorResolver(
      auth, serverResponseWithOtherInfo, onIdTokenResolver);

  var error = new fireauth.MultiFactorError(
      auth, serverResponseWithOtherInfo, onIdTokenResolver, 'custom message');

  assertEquals('auth/' + fireauth.authenum.Error.MFA_REQUIRED, error.code);
  assertEquals(
      'custom message',
      error.message);
  assertObjectEquals(serverResponseWithOtherInfo, error.serverResponse);
  assertObjectEquals(expectedResolver, error.resolver);
}


function testMultiFactorError_toPlainObject() {
  var errorWithDefaultMessage = new fireauth.MultiFactorError(
      auth, serverResponse, onIdTokenResolver);
  var errorWithCustomMessage = new fireauth.MultiFactorError(
      auth, serverResponse, onIdTokenResolver, 'custom message');
  var errorWithOtherInfo = new fireauth.MultiFactorError(
      auth, serverResponseWithOtherInfo, onIdTokenResolver);

  assertObjectEquals(
      {
        'code': 'auth/' + fireauth.authenum.Error.MFA_REQUIRED,
        'message': 'Proof of ownership of a second factor is required to ' +
                   'complete sign-in.',
        'serverResponse': serverResponse
      },
      errorWithDefaultMessage.toPlainObject());
  assertObjectEquals(
      {
        'code': 'auth/' + fireauth.authenum.Error.MFA_REQUIRED,
        'message': 'custom message',
        'serverResponse': serverResponse
      },
      errorWithCustomMessage.toPlainObject());
  assertObjectEquals(
      {
        'code': 'auth/' + fireauth.authenum.Error.MFA_REQUIRED,
        'message': 'Proof of ownership of a second factor is required to ' +
                   'complete sign-in.',
        'serverResponse': serverResponseWithOtherInfo
      },
      errorWithOtherInfo.toPlainObject());
}


function testMultiFactorError_fromPlainObject() {
  var customMessage = 'custom message';
  var expectedError = new fireauth.MultiFactorError(
      auth, serverResponse, onIdTokenResolver);
  var expectedErrorWithMessage = new fireauth.MultiFactorError(
      auth, serverResponse, onIdTokenResolver, customMessage);
  var responseWithCredential = {
    'serverResponse': goog.object.clone(serverResponse)
  };
  responseWithCredential['code'] = 'auth/multi-factor-auth-required';
  var responseWithoutCredential = {
    'serverResponse': goog.object.clone(serverResponse)
  };
  delete responseWithoutCredential['serverResponse']['mfaPendingCredential'];
  responseWithoutCredential['code'] = 'auth/multi-factor-auth-required';
  var responseWithCredentialAndMessage =
      goog.object.clone(responseWithCredential);
  responseWithCredentialAndMessage['message'] = customMessage;
  var responseWithIncorrectCode = goog.object.clone(responseWithCredential);
  responseWithIncorrectCode['code'] = 'auth/internal-error';
  var errorWithOtherInfo = new fireauth.MultiFactorError(
      auth, serverResponseWithOtherInfo, onIdTokenResolver);

  // null response.
  assertNull(
      fireauth.MultiFactorError.fromPlainObject(null, auth, onIdTokenResolver));
  // Empty object response.
  assertNull(
      fireauth.MultiFactorError.fromPlainObject({}, auth, onIdTokenResolver));
  // undefined object response.
  assertNull(
      fireauth.MultiFactorError.fromPlainObject(
          undefined, auth, onIdTokenResolver));
  // Response with just code.
  assertNull(
      fireauth.MultiFactorError.fromPlainObject(
          {'code': 'auth/multi-factor-auth-required'},
          auth, onIdTokenResolver));
  // Response with code and no credential.
  assertNull(
      fireauth.MultiFactorError.fromPlainObject(
          responseWithoutCredential, auth, onIdTokenResolver));
  // Response with credential but incorrect code.
  assertNull(
      fireauth.MultiFactorError.fromPlainObject(
          responseWithIncorrectCode, auth, onIdTokenResolver));

  // Valid response with default message.
  assertObjectEquals(
      expectedError,
      fireauth.MultiFactorError.fromPlainObject(
          responseWithCredential, auth, onIdTokenResolver));
  // Valid response with custom message.
  assertObjectEquals(
      expectedErrorWithMessage,
      fireauth.MultiFactorError.fromPlainObject(
          responseWithCredentialAndMessage, auth, onIdTokenResolver));
  // Using toPlainObject representation.
  assertObjectEquals(
      expectedError,
      fireauth.MultiFactorError.fromPlainObject(
          expectedError.toPlainObject(), auth, onIdTokenResolver));
  // Using toPlainObject representation with other info in server response.
  assertObjectEquals(
      errorWithOtherInfo,
      fireauth.MultiFactorError.fromPlainObject(
          errorWithOtherInfo.toPlainObject(), auth, onIdTokenResolver));
}
