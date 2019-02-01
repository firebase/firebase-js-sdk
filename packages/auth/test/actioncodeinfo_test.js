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
 * @fileoverview Tests for actioncodeinfo.js.
 */

goog.provide('fireauth.ActionCodeInfoTest');

goog.require('fireauth.ActionCodeInfo');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.ActionCodeInfoTest');



var verifyEmailServerResponse = {
  'kind': 'identitytoolkit#ResetPasswordResponse',
  'email': 'user@example.com',
  'requestType': 'VERIFY_EMAIL'
};
var passwordResetServerResponse = {
  'kind': 'identitytoolkit#ResetPasswordResponse',
  'email': 'user@example.com',
  'requestType': 'PASSWORD_RESET'
};
var recoverEmailServerResponse = {
  'kind': 'identitytoolkit#ResetPasswordResponse',
  'email': 'user@example.com',
  'newEmail': 'newUser@example.com',
  'requestType': 'RECOVER_EMAIL'
};
var signInWithEmailLinkServerResponse = {
  'kind': 'identitytoolkit#ResetPasswordResponse',
  'requestType': 'EMAIL_SIGNIN'
};


function testActionCodeInfo_invalid_missingOperation() {
  assertThrows(function() {
    new fireauth.ActionCodeInfo({'email': 'user@example.com'});
  });
}


function testActionCodeInfo_invalid_missingEmail() {
  assertThrows(function() {
    new fireauth.ActionCodeInfo({'requestType': 'PASSWORD_RESET'});
  });
}


function testActionCodeInfo_verifyEmail() {
  var expectedData = {email: 'user@example.com', fromEmail: null};
  var actionCodeInfo = new fireauth.ActionCodeInfo(verifyEmailServerResponse);

  // Check operation.
  assertEquals('VERIFY_EMAIL', actionCodeInfo['operation']);
  // Property should be read-only.
  actionCodeInfo['operation'] = 'BLA';
  assertEquals('VERIFY_EMAIL', actionCodeInfo['operation']);

  // Check data.
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
  // Property should be read-only.
  actionCodeInfo['data']['email'] = 'other@example.com';
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
  actionCodeInfo['data'] = 'BLA';
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
}


function testActionCodeInfo_passwordReset() {
  var expectedData = {email: 'user@example.com', fromEmail: null};
  var actionCodeInfo = new fireauth.ActionCodeInfo(passwordResetServerResponse);

  // Check operation.
  assertEquals('PASSWORD_RESET', actionCodeInfo['operation']);
  // Property should be read-only.
  actionCodeInfo['operation'] = 'BLA';
  assertEquals('PASSWORD_RESET', actionCodeInfo['operation']);

  // Check data.
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
  // Property should be read-only.
  actionCodeInfo['data']['email'] = 'other@example.com';
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
  actionCodeInfo['data'] = 'BLA';
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
}


function testActionCodeInfo_recoverEmail() {
  var expectedData = {
    email: 'user@example.com',
    fromEmail: 'newUser@example.com'
  };
  var actionCodeInfo = new fireauth.ActionCodeInfo(recoverEmailServerResponse);

  // Check operation.
  assertEquals('RECOVER_EMAIL', actionCodeInfo['operation']);
  // Property should be read-only.
  actionCodeInfo['operation'] = 'BLA';
  assertEquals('RECOVER_EMAIL', actionCodeInfo['operation']);

  // Check data.
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
  // Property should be read-only.
  actionCodeInfo['data']['email'] = 'other@example.com';
  actionCodeInfo['data']['fromEmail'] = 'unknown@example.com';
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
  actionCodeInfo['data'] = 'BLA';
  assertObjectEquals(
      expectedData,
      actionCodeInfo['data']);
}


function testActionCodeInfo_signInWithEmailLink() {
  var expectedData = {email: null, fromEmail: null};
  var actionCodeInfo =
      new fireauth.ActionCodeInfo(signInWithEmailLinkServerResponse);

  // Check operation.
  assertEquals('EMAIL_SIGNIN', actionCodeInfo['operation']);
  // Property should be read-only.
  actionCodeInfo['operation'] = 'BLA';
  assertEquals('EMAIL_SIGNIN', actionCodeInfo['operation']);

  // Check data.
  assertObjectEquals(expectedData, actionCodeInfo['data']);
  // Property should be read-only.
  actionCodeInfo['data']['email'] = 'other@example.com';
  assertObjectEquals(expectedData, actionCodeInfo['data']);
  actionCodeInfo['data'] = 'BLA';
  assertObjectEquals(expectedData, actionCodeInfo['data']);
}
