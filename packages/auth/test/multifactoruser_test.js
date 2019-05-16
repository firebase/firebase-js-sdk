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
 * @fileoverview Tests for multifactoruser.js
 */

goog.provide('fireauth.MultiFactorUserTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthUser');
goog.require('fireauth.MultiFactorInfo');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.MultiFactorUser');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.UserEventType');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.MultiFactorUserTest');


var mockControl;
var now = new Date();
var testUser;
var config;
var accountInfo;
var accountInfo2;
var tokenResponse;
var expiredTokenResponse;
var getAccountInfoResponse1;
var getAccountInfoResponse2;


function setUp() {
  config = {
    'apiKey': 'API_KEY',
    'appName': 'appId1'
  };
  accountInfo = {
    'uid': 'defaultUserId',
    'email': 'user@default.com',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'emailVerified': true,
    'multiFactor': {
      'enrolledFactors': [
        {
          'uid': 'ENROLLMENT_UID1',
          'displayName': 'Work phone number',
          'enrollmentTime': now.toUTCString(),
          'factorId': fireauth.constants.SecondFactorType.PHONE,
          'phoneNumber': '+16505551234'
        },
        {
          'uid': 'ENROLLMENT_UID2',
          'displayName': 'Spouse phone number',
          'enrollmentTime': now.toUTCString(),
          'factorId': fireauth.constants.SecondFactorType.PHONE,
          'phoneNumber': '+16505556789'
        }
      ]
    }
  };
  accountInfo2 = {
    'uid': 'defaultUserId',
    'email': 'user@default.com',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'emailVerified': true,
    'multiFactor': {
      'enrolledFactors': [
        {
          'uid': 'ENROLLMENT_UID3',
          'displayName': 'Backup phone',
          'enrollmentTime': now.toUTCString(),
          'factorId': fireauth.constants.SecondFactorType.PHONE,
          'phoneNumber': '+16505551111'
        },
        {
          'uid': 'ENROLLMENT_UID4',
          'displayName': 'Personal phone number',
          'enrollmentTime': now.toUTCString(),
          'factorId': fireauth.constants.SecondFactorType.PHONE,
          'phoneNumber': '+16505552222'
        },
      ]
    }
  };
  tokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'firebase': {
        'sign_in_provider': 'password',
        'sign_in_second_factor': 'phone'
      }
    }),
    'refreshToken': 'REFRESH_TOKEN'
  };
  expiredTokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'firebase': {
        'sign_in_provider': 'password',
        'sign_in_second_factor': 'phone'
      }
    }, now - 1),
    'refreshToken': 'REFRESH_TOKEN'
  };
  getAccountInfoResponse1 = {
    'users': [{
      'localId': 'defaultUserId',
      'email': 'user@default.com',
      'emailVerified': true,
      'displayName': 'defaultDisplayName',
      'providerUserInfo': [],
      'photoUrl': 'https://www.default.com/default/default.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false,
      'lastLoginAt': '1506050282000',
      'createdAt': '1506050282000',
      'mfaInfo': [
        {
          'mfaEnrollmentId': 'ENROLLMENT_UID1',
          'displayName': 'Work phone number',
          'enrolledAt': now.toISOString(),
          'phoneInfo': '+16505551234'
        },
        {
          'mfaEnrollmentId': 'ENROLLMENT_UID2',
          'displayName': 'Spouse phone number',
          'enrolledAt': now.toISOString(),
          'phoneInfo': '+16505556789'
        }
      ]
    }]
  };
  getAccountInfoResponse2 = {
    'users': [{
      'localId': 'defaultUserId',
      'email': 'user@default.com',
      'emailVerified': true,
      'displayName': 'defaultDisplayName',
      'providerUserInfo': [],
      'photoUrl': 'https://www.default.com/default/default.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false,
      'lastLoginAt': '1506050282000',
      'createdAt': '1506050282000',
      'mfaInfo': [
        {
          'mfaEnrollmentId': 'ENROLLMENT_UID3',
          'displayName': 'Backup phone',
          'enrolledAt': now.toISOString(),
          'phoneInfo': '+16505551111'
        },
        {
          'mfaEnrollmentId': 'ENROLLMENT_UID4',
          'displayName': 'Personal phone number',
          'enrolledAt': now.toISOString(),
          'phoneInfo': '+16505552222'
        }
      ]
    }]
  };
  testUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  mockControl = new goog.testing.MockControl();
}


function tearDown() {
  testUser = null;
  config = null;
  accountInfo = null;
  accountInfo2 = null;
  tokenResponse = null;
  expiredTokenResponse = null;
  getAccountInfoResponse1 = null;
  getAccountInfoResponse2 = null;
  mockControl.$verifyAll();
  mockControl.$tearDown();
}


function testMultiFactorUser() {
  var info = [
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo['multiFactor']['enrolledFactors'][0]),
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo['multiFactor']['enrolledFactors'][1])
  ];
  testUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(testUser, accountInfo);

  assertEquals(2, multiFactorUser['enrolledFactors'].length);
  assertObjectEquals(info[0], multiFactorUser['enrolledFactors'][0]);
  assertObjectEquals(info[1], multiFactorUser['enrolledFactors'][1]);
  assertEquals(testUser, multiFactorUser.getUser());
}


function testMultiFactorUser_copy() {
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(tokenResponse.idToken).$returns(
      goog.Promise.resolve(getAccountInfoResponse1)).$once();
  getAccountInfoByIdToken(tokenResponse.idToken).$returns(
      goog.Promise.resolve(getAccountInfoResponse1)).$once();
  mockControl.$replayAll();
  var info = [
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo['multiFactor']['enrolledFactors'][0]),
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo['multiFactor']['enrolledFactors'][1]),
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo2['multiFactor']['enrolledFactors'][0]),
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo2['multiFactor']['enrolledFactors'][1]),
  ];
  testUser = new fireauth.AuthUser(config, tokenResponse);
  var testUser2 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  var multiFactorUser1 = new fireauth.MultiFactorUser(testUser, accountInfo);
  var multiFactorUser2 = new fireauth.MultiFactorUser(testUser2, accountInfo2);

  // Confirm multiFactorUser1 and multiFactorUser2 initialized with correct
  // factors.
  assertEquals(2, multiFactorUser1['enrolledFactors'].length);
  assertObjectEquals(info[0], multiFactorUser1['enrolledFactors'][0]);
  assertObjectEquals(info[1], multiFactorUser1['enrolledFactors'][1]);
  assertEquals(2, multiFactorUser2['enrolledFactors'].length);
  assertObjectEquals(info[2], multiFactorUser2['enrolledFactors'][0]);
  assertObjectEquals(info[3], multiFactorUser2['enrolledFactors'][1]);

  // Copy multiFactorUser2 to multiFactorUser1.
  multiFactorUser1.copy(multiFactorUser2);
  assertObjectEquals(multiFactorUser2, multiFactorUser1);
  // Enrolled factors should be updated on multiFactorUser1.
  assertObjectEquals(info[2], multiFactorUser1['enrolledFactors'][0]);
  assertObjectEquals(info[3], multiFactorUser1['enrolledFactors'][1]);

  // First user reload should not trigger changes to enrolledFactors anymore.
  return testUser.reload()
      .then(function() {
        // Enrolled factors should not be updated on multiFactorUser1.
        assertEquals(2, multiFactorUser1['enrolledFactors'].length);
        assertObjectEquals(info[2], multiFactorUser1['enrolledFactors'][0]);
        assertObjectEquals(info[3], multiFactorUser1['enrolledFactors'][1]);
        // Reload second user. This should update the enrolled factors.
        return testUser2.reload();
      })
      .then(function() {
        // Enrolled factors should be updated on multiFactorUser1.
        assertEquals(2, multiFactorUser1['enrolledFactors'].length);
        assertObjectEquals(info[0], multiFactorUser1['enrolledFactors'][0]);
        assertObjectEquals(info[1], multiFactorUser1['enrolledFactors'][1]);
      });
}


function testMultiFactorUser_userReload() {
  var info = [
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo['multiFactor']['enrolledFactors'][0]),
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo['multiFactor']['enrolledFactors'][1]),
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo2['multiFactor']['enrolledFactors'][0]),
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo2['multiFactor']['enrolledFactors'][1]),
  ];
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(tokenResponse.idToken).$returns(
      goog.Promise.resolve(getAccountInfoResponse1)).$once();
  getAccountInfoByIdToken(tokenResponse.idToken).$returns(
      goog.Promise.resolve(getAccountInfoResponse2)).$once();
  mockControl.$replayAll();

  testUser = new fireauth.AuthUser(config, tokenResponse);
  var multiFactorUser = new fireauth.MultiFactorUser(testUser);

  assertEquals(0, multiFactorUser['enrolledFactors'].length);
  // Trigger user reloaded.
  return testUser.reload()
      .then(function() {
        // Enrolled factors should be updated with first GetAccountInfo result.
        assertEquals(2, multiFactorUser['enrolledFactors'].length);
        assertObjectEquals(info[0], multiFactorUser['enrolledFactors'][0]);
        assertObjectEquals(info[1], multiFactorUser['enrolledFactors'][1]);
        // Reload again.
        return testUser.reload();
      }).then(function() {
        // Enrolled factors should be updated with second GetAccountInfo result.
        assertEquals(2, multiFactorUser['enrolledFactors'].length);
        assertObjectEquals(info[2], multiFactorUser['enrolledFactors'][0]);
        assertObjectEquals(info[3], multiFactorUser['enrolledFactors'][1]);
      });
}


function testMultiFactorUser_toPlainObject() {
  testUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(testUser, accountInfo);
  var emptyMultiFactorUser = new fireauth.MultiFactorUser(testUser);

  assertObjectEquals(
      {
        'multiFactor': {
          'enrolledFactors': goog.array.clone(
              accountInfo['multiFactor']['enrolledFactors'])
        }
      },
      multiFactorUser.toPlainObject());

  assertObjectEquals(
      {
        'multiFactor': {'enrolledFactors': []}
      },
      emptyMultiFactorUser.toPlainObject());
}


function testMultiFactorUser_getSession_cached() {
  var requestStsToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'requestStsToken');
  requestStsToken().$times(0);
  mockControl.$replayAll();

  var expectedSession = new fireauth.MultiFactorSession(
      tokenResponse.idToken, null);
  var multiFactorUser = new fireauth.MultiFactorUser(testUser);

  return multiFactorUser.getSession()
      .then(function(actualSession) {
        assertObjectEquals(expectedSession, actualSession);
      });
}


function testMultiFactorUser_getSession_expired() {
  var tokenChanges = 0;
  var newJwt = fireauth.common.testHelper.createMockJwt({
    'firebase': {
      'sign_in_provider': 'password',
      'sign_in_second_factor': 'phone'
    }
  });
  var requestStsToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'requestStsToken');
  requestStsToken({
    'grant_type': 'refresh_token',
    'refresh_token': 'REFRESH_TOKEN'
  }).$returns(goog.Promise.resolve({
    'access_token': newJwt,
    'refresh_token': 'REFRESH_TOKEN2',
    'expires_in': '3600'
  })).$once();
  mockControl.$replayAll();

  testUser = new fireauth.AuthUser(config, expiredTokenResponse, accountInfo);
  var expectedSession = new fireauth.MultiFactorSession(newJwt, null);
  var multiFactorUser = new fireauth.MultiFactorUser(testUser);

  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanges++;
      });
  return multiFactorUser.getSession()
      .then(function(actualSession) {
        assertEquals(1, tokenChanges);
        assertObjectEquals(expectedSession, actualSession);
        // Refresh token updated on user.
        assertEquals('REFRESH_TOKEN2', testUser['refreshToken']);
        return testUser.getIdToken();
      })
      .then(function(idToken) {
        // ID token updated on user.
        assertEquals(newJwt, idToken);
      });
}


function testMultiFactorUser_getSession_error() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  var requestStsToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'requestStsToken');
  requestStsToken({
    'grant_type': 'refresh_token',
    'refresh_token': 'REFRESH_TOKEN'
  }).$returns(goog.Promise.reject(expectedError)).$once();
  mockControl.$replayAll();

  testUser = new fireauth.AuthUser(config, expiredTokenResponse, accountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(testUser);

  return multiFactorUser.getSession()
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(expectedError, error);
      });
}
