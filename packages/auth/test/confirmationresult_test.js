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
 * @fileoverview Tests for confirmationresult.js
 */

goog.provide('fireauth.ConfirmationResultTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.ConfirmationResult');
goog.require('fireauth.PhoneAuthCredential');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.authenum.Error');
/** @suppress {extraRequire} Needed for firebase.app().auth() */
goog.require('fireauth.exports');
goog.require('goog.Promise');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.TestCase');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.ConfirmationResultTest');


var mockControl;
var app;
var auth;


function setUp() {
  mockControl = new goog.testing.MockControl();
  mockControl.$resetAll();
}


function tearDown() {
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
}


/**
 * Install the test to run and runs it.
 * @param {string} id The test identifier.
 * @param {function():!goog.Promise} func The test function to run.
 * @return {!goog.Promise} The result of the test.
 */
function installAndRunTest(id, func) {
  // Initialize App and Auth before running the test.
  app = firebase.initializeApp({
    apiKey: 'API_KEY'
  }, 'test');
  auth = app.auth();
  var testCase = new goog.testing.TestCase();
  testCase.addNewTest(id, func);
  return testCase.runTestsReturningPromise().then(function(result) {
    assertTrue(result.complete);
    // Display error detected.
    if (result.errors.length) {
      fail(result.errors.join('\n'));
    }
    assertEquals(1, result.totalCount);
    assertEquals(1, result.runCount);
    assertEquals(1, result.successCount);
    assertEquals(0, result.errors.length);
    // Delete App and Auth instances before resolving.
    auth.delete();
    return app.delete();
  });
}


function testConfirmationResult() {
  var expectedVerificationId = 'VERIFICATION_ID';
  var expectedCode = '123456';
  var expectedPromise = new goog.Promise(function(resolve, reject) {});
  var credentialInstance =
      mockControl.createStrictMock(fireauth.PhoneAuthCredential);
  var credential =
      mockControl.createMethodMock(fireauth.PhoneAuthProvider, 'credential');
  var credentialResolver = mockControl.createFunctionMock('credentialResolver');
  // Phone Auth credential will be initialized first.
  credential(expectedVerificationId, expectedCode)
      .$returns(credentialInstance).$once();
  // Credential resolver will be caled with the initialized credential instance.
  // Return expected pending promise.
  credentialResolver(credentialInstance).$returns(expectedPromise).$once();
  mockControl.$replayAll();

  // Initialize a confirmation result with the expected parameters.
  var confirmationResult = new fireauth.ConfirmationResult(
      expectedVerificationId, credentialResolver);
  // Check verificationId property.
  assertEquals(expectedVerificationId, confirmationResult['verificationId']);
  // Confirm read-only.
  confirmationResult['verificationId'] = 'not readonly';
  assertEquals(expectedVerificationId, confirmationResult['verificationId']);
  // Confirm expected credential resolver promise returned on confirmation.
  assertEquals(expectedPromise, confirmationResult.confirm(expectedCode));
}


function testConfirmationResult_initialize_success() {
  return installAndRunTest('confirmationResult_initialize_success', function() {
    var expectedVerificationId = 'VERIFICATION_ID';
    var expectedPhoneNumber = '+16505550101';
    var expectedRecaptchaToken = 'RECAPTCHA_TOKEN';
    var appVerifier = {
      'type': 'recaptcha',
      'verify': function() {
        return goog.Promise.resolve(expectedRecaptchaToken);
      }
    };
    var phoneAuthProviderInstance =
        mockControl.createStrictMock(fireauth.PhoneAuthProvider);
    var phoneAuthProviderConstructor = mockControl.createConstructorMock(
        fireauth, 'PhoneAuthProvider');
    var confirmationResultInstance =
        mockControl.createStrictMock(fireauth.ConfirmationResult);
    var confirmationResultConstructor = mockControl.createConstructorMock(
        fireauth, 'ConfirmationResult');
    var credentialResolver =
        mockControl.createFunctionMock('credentialResolver');
    // Provider instance should be initialized with the expected Auth instance.
    phoneAuthProviderConstructor(auth)
        .$returns(phoneAuthProviderInstance).$once();
    // verifyPhoneNumber called on provider instance with the expected phone
    // number and appVerifier. This would resolve with the expected verification
    // ID.
    phoneAuthProviderInstance.verifyPhoneNumber(
        expectedPhoneNumber, appVerifier)
        .$returns(goog.Promise.resolve(expectedVerificationId)).$once();
    // ConfirmationResult instance should be initialized with the expected
    // verification ID and the credential resolver.
    confirmationResultConstructor(expectedVerificationId, credentialResolver)
        .$returns(confirmationResultInstance).$once();
    mockControl.$replayAll();

    // Initialize a confirmation result.
    return fireauth.ConfirmationResult.initialize(
        auth, expectedPhoneNumber, appVerifier, credentialResolver)
        .then(function(result) {
          // Expected confirmation result instance returned.
          assertEquals(confirmationResultInstance, result);
        });
  });
}


function testConfirmationResult_initialize_error() {
  return installAndRunTest('confirmationResult_initialize_error', function() {
    var expectedPhoneNumber = '+16505550101';
    var expectedRecaptchaToken = 'RECAPTCHA_TOKEN';
    var expectedError =
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
    var appVerifier = {
      'type': 'recaptcha',
      'verify': function() {
        return goog.Promise.resolve(expectedRecaptchaToken);
      }
    };
    var phoneAuthProviderInstance =
        mockControl.createStrictMock(fireauth.PhoneAuthProvider);
    var phoneAuthProviderConstructor = mockControl.createConstructorMock(
        fireauth, 'PhoneAuthProvider');
    var credentialResolver =
        mockControl.createFunctionMock('credentialResolver');
    // Provider instance should be initialized with the expected Auth instance.
    phoneAuthProviderConstructor(auth)
        .$returns(phoneAuthProviderInstance).$once();
    // verifyPhoneNumber called on provider instance with the expected phone
    // number and appVerifier. This would reject with the expected error.
    phoneAuthProviderInstance.verifyPhoneNumber(
        expectedPhoneNumber, appVerifier)
        .$returns(goog.Promise.reject(expectedError)).$once();
    mockControl.$replayAll();

    // Initialize a confirmation result.
    return fireauth.ConfirmationResult.initialize(
        auth, expectedPhoneNumber, appVerifier, credentialResolver)
        .then(fail, function(error) {
          // Expected error returned.
          assertEquals(expectedError, error);
        });
  });
}
