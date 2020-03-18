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
 * @fileoverview Tests for multifactorinfo.js
 */

goog.provide('fireauth.MultiFactorInfoTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.MultiFactorInfo');
goog.require('fireauth.PhoneMultiFactorInfo');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.MultiFactorInfoTest');


var now = new Date();
var phoneServerResponse = {
  'mfaEnrollmentId': 'ENROLLMENT_UID',
  'displayName': 'DISPLAY_NAME',
  'enrolledAt': now.toISOString(),
  'phoneInfo': '+16505551234'
};


function testPhoneMultiFactorInfo_valid() {
  var info = new fireauth.PhoneMultiFactorInfo(phoneServerResponse);

  assertEquals(phoneServerResponse['mfaEnrollmentId'], info['uid']);
  assertEquals(phoneServerResponse['displayName'], info['displayName']);
  assertEquals(fireauth.constants.SecondFactorType.PHONE, info['factorId']);
  assertEquals(now.toUTCString(), info['enrollmentTime']);
  assertEquals(phoneServerResponse['phoneInfo'], info['phoneNumber']);

  assertObjectEquals(
      {
        'uid': phoneServerResponse['mfaEnrollmentId'],
        'displayName': phoneServerResponse['displayName'],
        'factorId': fireauth.constants.SecondFactorType.PHONE,
        'enrollmentTime': now.toUTCString(),
        'phoneNumber': phoneServerResponse['phoneInfo']
      },
      info.toPlainObject());
}


function testPhoneMultiFactorInfo_valid_missingFields() {
  // Remove all non-required fields.
  var serverResponse = {
    'mfaEnrollmentId': phoneServerResponse['mfaEnrollmentId'],
    'phoneInfo': phoneServerResponse['phoneInfo']
  };
  var info = new fireauth.PhoneMultiFactorInfo(serverResponse);

  assertEquals(phoneServerResponse['mfaEnrollmentId'], info['uid']);
  assertNull(info['displayName']);
  assertEquals(fireauth.constants.SecondFactorType.PHONE, info['factorId']);
  assertNull(info['enrollmentTime']);
  assertEquals(phoneServerResponse['phoneInfo'], info['phoneNumber']);

  assertObjectEquals(
      {
        'uid': phoneServerResponse['mfaEnrollmentId'],
        'displayName': null,
        'factorId': fireauth.constants.SecondFactorType.PHONE,
        'enrollmentTime': null,
        'phoneNumber': phoneServerResponse['phoneInfo']
      },
      info.toPlainObject());
}


function testPhoneMultiFactorInfo_invalidMultiFactorInfo() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'Internal assert: invalid MultiFactorInfo object');

  var error = assertThrows(function() {
    return new fireauth.PhoneMultiFactorInfo({});
  });

  fireauth.common.testHelper.assertErrorEquals(
      expectedError,
      error);
}


function testPhoneMultiFactorInfo_invalidPhoneMultiFactorInfo() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'Internal assert: invalid MultiFactorInfo object');

  var error = assertThrows(function() {
    return new fireauth.PhoneMultiFactorInfo({
      'mfaEnrollmentId': 'ENROLLMENT_UID'
    });
  });

  fireauth.common.testHelper.assertErrorEquals(
      expectedError,
      error);
}


function testMultiFactorInfo_fromServerResponse_phoneMultiFactorInfo() {
  var expectedPhoneInfo =
      new fireauth.PhoneMultiFactorInfo(phoneServerResponse);

  var info = fireauth.MultiFactorInfo.fromServerResponse(phoneServerResponse);

  assertTrue(info instanceof fireauth.PhoneMultiFactorInfo);
  assertObjectEquals(expectedPhoneInfo, info);
}


function testMultiFactorInfo_fromServerResponse_invalid() {
  assertNull(fireauth.MultiFactorInfo.fromServerResponse(null));
  assertNull(fireauth.MultiFactorInfo.fromServerResponse({}));
  assertNull(fireauth.MultiFactorInfo.fromServerResponse({
    'mfaEnrollmentId': 'ENROLLMENT_UID'
  }));
}


function testMultiFactorInfo_fromPlainObject_phoneMultiFactorInfo() {
  var expectedPhoneInfo =
      new fireauth.PhoneMultiFactorInfo(phoneServerResponse);

  var info = fireauth.MultiFactorInfo.fromPlainObject(
      expectedPhoneInfo.toPlainObject());

  assertTrue(info instanceof fireauth.PhoneMultiFactorInfo);
  assertObjectEquals(expectedPhoneInfo, info);
}


function testMultiFactorInfo_fromPlainObject_invalid() {
  assertNull(fireauth.MultiFactorInfo.fromPlainObject(null));
  assertNull(fireauth.MultiFactorInfo.fromPlainObject({}));
  assertNull(fireauth.MultiFactorInfo.fromPlainObject({
    'uid': 'ENROLLMENT_UID'
  }));
}
