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
 * @fileoverview Tests for actioncodeurl.js.
 */

goog.provide('fireauth.ActionCodeUrlTest');

goog.require('fireauth.ActionCodeInfo');
goog.require('fireauth.ActionCodeURL');
goog.require('goog.testing.jsunit');

goog.setTestOnly();


function testActionCodeURL_success() {
  var continueUrl = 'https://www.example.com/path/to/file?a=1&b=2#c=3';
  var actionLink = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
      'continueUrl=' + encodeURIComponent(continueUrl) +
      '&languageCode=en&tenantId=TENANT_ID&state=bla';
  var actionCodeUrl = fireauth.ActionCodeURL.parseLink(actionLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.EMAIL_SIGNIN,
               actionCodeUrl['operation']);
  assertEquals('CODE', actionCodeUrl['code']);
  assertEquals('API_KEY', actionCodeUrl['apiKey']);
  // ContinueUrl should be decoded.
  assertEquals(continueUrl, actionCodeUrl['continueUrl']);
  assertEquals('TENANT_ID', actionCodeUrl['tenantId']);
  assertEquals('en', actionCodeUrl['languageCode']);
}


function testActionCodeURL_getOperation() {
  // EMAIL_SIGNIN email action.
  var signInLink = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
      'languageCode=en';
  var actionCodeUrl = fireauth.ActionCodeURL.parseLink(signInLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.EMAIL_SIGNIN,
               actionCodeUrl['operation']);

  // VERIFY_AND_CHANGE_EMAIL email action.
  var verifyAndChangeEmailLink = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=verifyAndChangeEmail&apiKey=API_KEY&' +
      'languageCode=en';
  actionCodeUrl = fireauth.ActionCodeURL.parseLink(verifyAndChangeEmailLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.VERIFY_AND_CHANGE_EMAIL,
               actionCodeUrl['operation']);

  // VERIFY_EMAIL email action.
  var verifyEmailLink = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=verifyEmail&apiKey=API_KEY&' +
      'languageCode=en';
  actionCodeUrl = fireauth.ActionCodeURL.parseLink(verifyEmailLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.VERIFY_EMAIL,
               actionCodeUrl['operation']);

  // RECOVER_EMAIL email action.
  var recoverEmailLink = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=recoverEmail&apiKey=API_KEY&' +
      'languageCode=en';
  actionCodeUrl = fireauth.ActionCodeURL.parseLink(recoverEmailLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.RECOVER_EMAIL,
               actionCodeUrl['operation']);

  // PASSWORD_RESET email action.
  var resetPasswordLink = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=resetPassword&apiKey=API_KEY&' +
      'languageCode=en';
  actionCodeUrl = fireauth.ActionCodeURL.parseLink(resetPasswordLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.PASSWORD_RESET,
               actionCodeUrl['operation']);

  // REVERT_SECOND_FACTOR_ADDITION email action.
  var revertSeconFactorLink = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=revertSecondFactorAddition&apiKey=API_KEY&' +
      'languageCode=en';
  actionCodeUrl = fireauth.ActionCodeURL.parseLink(revertSeconFactorLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.REVERT_SECOND_FACTOR_ADDITION,
               actionCodeUrl['operation']);
}


function testActionCodeURL_success_portNumberInUrl() {
  var actionLink = 'https://www.example.com:8080/finishSignIn?' +
      'oobCode=CODE&mode=signIn&apiKey=API_KEY&state=bla';
  var actionCodeUrl = fireauth.ActionCodeURL.parseLink(actionLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.EMAIL_SIGNIN,
               actionCodeUrl['operation']);
  assertEquals('CODE', actionCodeUrl['code']);
  assertEquals('API_KEY', actionCodeUrl['apiKey']);
  assertNull(actionCodeUrl['continueUrl']);
  assertNull(actionCodeUrl['tenantId']);
  assertNull(actionCodeUrl['languageCode']);
}


function testActionCodeURL_success_hashParameters() {
  var actionLink = 'https://www.example.com/finishSignIn?' +
            'oobCode=CODE1&mode=signIn&apiKey=API_KEY1&state=bla' +
            '#oobCode=CODE2&mode=signIn&apiKey=API_KEY2&state=bla';
  var actionCodeUrl = fireauth.ActionCodeURL.parseLink(actionLink);
  assertEquals(fireauth.ActionCodeInfo.Operation.EMAIL_SIGNIN,
               actionCodeUrl['operation']);
  assertEquals('CODE1', actionCodeUrl['code']);
  assertEquals('API_KEY1', actionCodeUrl['apiKey']);
  assertNull(actionCodeUrl['continueUrl']);
  assertNull(actionCodeUrl['tenantId']);
  assertNull(actionCodeUrl['languageCode']);
}


function testActionCodeURL_invalidLink() {
  // Missing API key, oob code and mode.
  var invalidLink1 = 'https://www.example.com/finishSignIn';
  // Invalid mode.
  var invalidLink2 = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=INVALID_MODE&apiKey=API_KEY';
  // Missing oob code.
  var invalidLink3 = 'https://www.example.com/finishSignIn?' +
      'mode=signIn&apiKey=API_KEY';
  // Missing API key.
  var invalidLink4 = 'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=signIn';
  // Missing mode.
  var invalidLink5 = 'https://www.example.com/finishSignIn' +
      'oobCode=CODE&apiKey=API_KEY';
  assertNull(fireauth.ActionCodeURL.parseLink(invalidLink1));
  assertNull(fireauth.ActionCodeURL.parseLink(invalidLink2));
  assertNull(fireauth.ActionCodeURL.parseLink(invalidLink3));
  assertNull(fireauth.ActionCodeURL.parseLink(invalidLink4));
  assertNull(fireauth.ActionCodeURL.parseLink(invalidLink5));
}
