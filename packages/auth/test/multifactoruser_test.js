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
goog.require('fireauth.MultiFactorAssertion');
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
var accountInfoWithUid1;
var singleFactorAccountInfo;
var updatedTokenResponse;
var tokenResponse;
var expiredTokenResponse;
var singleFactorTokenResponse;
var getAccountInfoResponse1;
var getAccountInfoResponse2;
var getAccountInfoResponseWithUid1;
var getAccountInfoResponseWithUid2;
var getAccountInfoResponseWithNoSecondFactors;


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
  accountInfoWithUid1 = {
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
        }
      ]
    }
  };
  // Single factor account info.
  singleFactorAccountInfo = {
    'uid': 'defaultUserId',
    'email': 'user@default.com',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'emailVerified': true
  };
  tokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'firebase': {
        'sign_in_provider': 'password',
        'sign_in_second_factor': 'phone'
      }
    }),
    'refreshToken': 'REFRESH_TOKEN1'
  };
  expiredTokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'firebase': {
        'sign_in_provider': 'password',
        'sign_in_second_factor': 'phone'
      }
    }, now - 1),
    'refreshToken': 'REFRESH_TOKEN1'
  };
  singleFactorTokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'firebase': {
        'sign_in_provider': 'password'
      }
    }),
    'refreshToken': 'REFRESH_TOKEN1'
  };
  updatedTokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'firebase': {
        'sign_in_provider': 'password',
        'sign_in_second_factor': 'phone'
      }
    }) + 'UPDATED', // Modify the JWT string so the idToken is different.
    'refreshToken': 'REFRESH_TOKEN2'
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
  getAccountInfoResponseWithUid1 = {
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
          'enrolledAt': now.toISOString(),
          'phoneInfo': '+16505551234'
        }
      ]
    }]
  };
  getAccountInfoResponseWithUid2 = {
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
          'mfaEnrollmentId': 'ENROLLMENT_UID2',
          'displayName': 'Spouse phone number',
          'enrolledAt': now.toISOString(),
          'phoneInfo': '+16505556789'
        }
      ]
    }]
  };
  getAccountInfoResponseWithNoSecondFactors = {
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
      'mfaInfo': [{}]
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
  accountInfoWithUid1 = null;
  singleFactorAccountInfo = null;
  tokenResponse = null;
  expiredTokenResponse = null;
  singleFactorTokenResponse = null;
  getAccountInfoResponse1 = null;
  getAccountInfoResponse2 = null;
  getAccountInfoResponseWithUid1 = null;
  getAccountInfoResponseWithNoSecondFactors = null;
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
      goog.Promise.resolve(getAccountInfoResponse2)).$once();
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
  assertEquals(2, multiFactorUser1.enrolledFactors.length);
  // Enrolled factors should be updated on multiFactorUser1 (copied from
  // multiFactorUser2).
  assertObjectEquals(info[2], multiFactorUser1['enrolledFactors'][0]);
  assertObjectEquals(info[3], multiFactorUser1['enrolledFactors'][1]);
  assertEquals(testUser, multiFactorUser1.getUser());
  assertEquals(testUser2, multiFactorUser2.getUser());

  // First user reload should still trigger changes to enrolledFactors as the
  // same user is still linked to multiFactorUser1.
  return testUser.reload()
      .then(function() {
        // Enrolled factors should be updated on multiFactorUser1.
        assertEquals(2, multiFactorUser1['enrolledFactors'].length);
        assertObjectEquals(info[0], multiFactorUser1['enrolledFactors'][0]);
        assertObjectEquals(info[1], multiFactorUser1['enrolledFactors'][1]);
        // Reload second user. This should not update the enrolled factors on
        // multiFactorUser1.
        return testUser2.reload();
      })
      .then(function() {
        // multiFactorUser1 is unchanged.
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
    'refresh_token': 'REFRESH_TOKEN1'
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
    'refresh_token': 'REFRESH_TOKEN1'
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


function testMultiFactorUser_enroll_singleFactorUser() {
  // Tests a single factor user enrolling a second factor without providing a
  // second factor display name.
  var expectedSession = new fireauth.MultiFactorSession(
      singleFactorTokenResponse.idToken);
  // Create a single-factor user.
  testUser = new fireauth.AuthUser(
      config, singleFactorTokenResponse, singleFactorAccountInfo);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  // Multi-factor info without display name.
  var expectedInfo = new fireauth.MultiFactorInfo.fromPlainObject({
    'uid': 'ENROLLMENT_UID1',
    'enrollmentTime': now.toUTCString(),
    'factorId': fireauth.constants.SecondFactorType.PHONE,
    'phoneNumber': '+16505551234'
  });
  var tokenChanged = 0;
  var stateChanged = 0;

  // Simulate assertion processing resolves with the successful token response.
  mockAssertion.process(testUser.getRpcHandler(), expectedSession, undefined)
      .$once()
      // New MFA token will be issued after enrollment.
      .$returns(goog.Promise.resolve(tokenResponse));
  getAccountInfoByIdToken(tokenResponse.idToken)
      .$returns(goog.Promise.resolve(getAccountInfoResponseWithUid1)).$once();
  mockControl.$replayAll();

  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, singleFactorAccountInfo);
  assertEquals(0, multiFactorUser['enrolledFactors'].length);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });

  // Enroll the second factor without providing a display name.
  return multiFactorUser.enroll(mockAssertion).then(function() {
    // The new second factor info should be added.
    assertEquals(1, multiFactorUser['enrolledFactors'].length);
    assertObjectEquals(expectedInfo, multiFactorUser['enrolledFactors'][0]);
    // Token changed listeners should be triggered.
    assertEquals(1, tokenChanged);
    assertEquals(1, stateChanged);
  });
}


function testMultiFactorUser_enroll_multiFactorUser() {
  // Tests a multi-factor user enrolling a new second factor with a display
  // name.
  var expectedSession = new fireauth.MultiFactorSession(
      tokenResponse.idToken);
  testUser = new fireauth.AuthUser(
      config, tokenResponse, accountInfoWithUid1);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  var info = [
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo['multiFactor']['enrolledFactors'][0]),
    fireauth.MultiFactorInfo.fromPlainObject(
        accountInfo['multiFactor']['enrolledFactors'][1])
  ];
  var newTokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'firebase': {
        'sign_in_provider': 'password',
        'sign_in_second_factor': 'phone'
      }
    }),
    'refreshToken': 'REFRESH_TOKEN1'
  };
  var tokenChanged = 0;
  var stateChanged = 0;

  // Simulate assertion processing resolves with the successful token response.
  mockAssertion.process(
      testUser.getRpcHandler(), expectedSession, 'Spouse phone number')
      .$once()
      // New token will be issued after enrollment.
      .$returns(goog.Promise.resolve(newTokenResponse));
  getAccountInfoByIdToken(newTokenResponse.idToken)
      .$returns(goog.Promise.resolve(getAccountInfoResponse1)).$once();
  mockControl.$replayAll();

  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, accountInfoWithUid1);
  assertEquals(1, multiFactorUser['enrolledFactors'].length);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });

  // Enroll a new second factor with a display name.
  return multiFactorUser.enroll(mockAssertion, 'Spouse phone number')
      .then(function() {
        // The new second factor info should be added.
        assertEquals(2, multiFactorUser['enrolledFactors'].length);
        assertObjectEquals(info[0], multiFactorUser['enrolledFactors'][0]);
        assertObjectEquals(info[1], multiFactorUser['enrolledFactors'][1]);
        // Token changed listeners should be triggered.
        assertEquals(1, tokenChanged);
        assertEquals(1, stateChanged);
      });
}


function testMultiFactorUser_enroll_tokenExpired() {
  // Tests that the token is expired when trying to enroll a second factor.
  var tokenChanged = 0;
  var stateChanged = 0;
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  var requestStsToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'requestStsToken');
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);

  requestStsToken({
    'grant_type': 'refresh_token',
    'refresh_token': 'REFRESH_TOKEN1'
  }).$returns(goog.Promise.reject(expectedError)).$once();
  mockAssertion.process(
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument)
      .$times(0);
  mockControl.$replayAll();

  // Create a single-factor user.
  testUser = new fireauth.AuthUser(
      config, expiredTokenResponse, singleFactorAccountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, singleFactorAccountInfo);
  assertEquals(0, multiFactorUser['enrolledFactors'].length);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });

  return multiFactorUser.enroll(mockAssertion)
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(0, multiFactorUser['enrolledFactors'].length);
        // TOKEN_EXPIRED error should be thrown and token changed listeners
        // should not be triggered.
        assertEquals(expectedError, error);
        assertEquals(0, tokenChanged);
        assertEquals(0, stateChanged);
      });
}


function testMultiFactorUser_enroll_codeExpiredError() {
  // Tests that error is thrown when enrolling the second factor.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CODE_EXPIRED);
  var expectedSession = new fireauth.MultiFactorSession(
      singleFactorTokenResponse.idToken);
  // Create a single-factor user.
  testUser = new fireauth.AuthUser(
      config, singleFactorTokenResponse, singleFactorAccountInfo);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  var tokenChanged = 0;
  var stateChanged = 0;

  // Simulate assertion processing rejects with error.
  mockAssertion.process(
      testUser.getRpcHandler(), expectedSession, undefined)
      .$once()
      .$returns(goog.Promise.reject(expectedError));
  // GetAccountInfo should not be called.
  getAccountInfoByIdToken(goog.testing.mockmatchers.ignoreArgument).$times(0);
  mockControl.$replayAll();

  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, singleFactorAccountInfo);
  assertEquals(0, multiFactorUser['enrolledFactors'].length);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });

  return multiFactorUser.enroll(mockAssertion)
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(0, multiFactorUser['enrolledFactors'].length);
        assertEquals(expectedError, error);
        assertEquals(0, tokenChanged);
        assertEquals(0, stateChanged);
      });
}


function testMultiFactorUser_enroll_userDeleted() {
  // Tests that enrollment should fail if the user is deleted.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.MODULE_DESTROYED);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var tokenChanged = 0;
  var stateChanged = 0;

  mockAssertion.process(
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument)
      .$times(0);
  mockControl.$replayAll();

  testUser = new fireauth.AuthUser(
      config, singleFactorTokenResponse, singleFactorAccountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, singleFactorAccountInfo);
  assertEquals(0, multiFactorUser['enrolledFactors'].length);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });
  assertEquals(0, multiFactorUser['enrolledFactors'].length);

  testUser.destroy();
  return multiFactorUser.enroll(mockAssertion)
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(0, multiFactorUser['enrolledFactors'].length);
        assertEquals(expectedError.code, error.code);
        assertEquals(0, tokenChanged);
        assertEquals(0, stateChanged);
      });
}


function testMultiFactorUser_unenroll_success() {
  // Tests that a second factor can be successfully unenrolled.
  var tokenChanged = 0;
  var stateChanged = 0;
  var userInvalidated = 0;

  // Set up mocks.
  var withdrawMfa = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'withdrawMfa');
  // First, expect withdrawMfa to be called with the original tokens, then
  // it will return the updated pair.
  withdrawMfa(tokenResponse.idToken, 'ENROLLMENT_UID1')
      .$returns({
        'idToken': updatedTokenResponse.idToken,
        'refreshToken': updatedTokenResponse.refreshToken
      }).$once();
  // Next, expect getAccountInfoByToken to be called with the updated idToken.
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(updatedTokenResponse.idToken)
      .$returns(goog.Promise.resolve(getAccountInfoResponseWithUid2)).$once();
  mockControl.$replayAll();

  // Create the user with the intital pair of tokens and listen for events.
  testUser = new fireauth.AuthUser(
    config, tokenResponse, accountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, accountInfo);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  goog.events.listen(
      testUser, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidated++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });
  assertEquals(2, multiFactorUser['enrolledFactors'].length);

  // Run test.
  return multiFactorUser.unenroll('ENROLLMENT_UID1')
      .then(function(){
        // The tokens should have been updated.
        var tokens = testUser.getStsTokenManager().toPlainObject();
        assertEquals(updatedTokenResponse.idToken, tokens['accessToken']);
        assertEquals(updatedTokenResponse.refreshToken, tokens['refreshToken']);
        assertEquals(1, tokenChanged);
        // The first enrolled factor should have been removed.
        assertEquals(1, multiFactorUser['enrolledFactors'].length);
        assertObjectEquals(
            fireauth.MultiFactorInfo.fromPlainObject(
                accountInfo['multiFactor']['enrolledFactors'][1]),
            multiFactorUser['enrolledFactors'][0]);
        assertEquals(1, stateChanged);
        // The user should not be invalidated.
        assertEquals(0, userInvalidated);
      });
}


function testMultiFactorUser_unenroll_successWithMultiFactorInfo() {
  // Tests that a second factor can be successfully unenrolled when passed
  // as a MultiFactorInfo object instead of as a string.
  var tokenChanged = 0;
  var stateChanged = 0;
  var userInvalidated = 0;

  // Set up mocks.
  var withdrawMfa = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'withdrawMfa');
  // First, expect withdrawMfa to be called with the original tokens, then
  // it will return the updated pair.
  withdrawMfa(tokenResponse.idToken, 'ENROLLMENT_UID1')
      .$returns({
        'idToken': updatedTokenResponse.idToken,
        'refreshToken': updatedTokenResponse.refreshToken
      }).$once();
  // Next, expect getAccountInfoByToken to be called with the updated idToken.
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(updatedTokenResponse.idToken)
      .$returns(goog.Promise.resolve(getAccountInfoResponseWithUid2)).$once();
  mockControl.$replayAll();

  // Create the user with the intital pair of tokens and listen for events.
  testUser = new fireauth.AuthUser(
    config, tokenResponse, accountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, accountInfo);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  goog.events.listen(
      testUser, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidated++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });
  assertEquals(2, multiFactorUser['enrolledFactors'].length);

  // Run test.
  var multiFactorInfo = fireauth.MultiFactorInfo.fromPlainObject({
    'uid': 'ENROLLMENT_UID1',
    'displayName': 'Work phone number',
    'enrollmentTime': now.toUTCString(),
    'phoneNumber': '+16505551234'
  });
  return multiFactorUser.unenroll(multiFactorInfo)
      .then(function(){
        // The tokens should have been updated.
        var tokens = testUser.getStsTokenManager().toPlainObject();
        assertEquals(updatedTokenResponse.idToken, tokens['accessToken']);
        assertEquals(updatedTokenResponse.refreshToken, tokens['refreshToken']);
        assertEquals(1, tokenChanged);
        // The first enrolled factor should have been removed.
        assertEquals(1, multiFactorUser['enrolledFactors'].length);
        assertObjectEquals(
            fireauth.MultiFactorInfo.fromPlainObject(
                accountInfo['multiFactor']['enrolledFactors'][1]),
            multiFactorUser['enrolledFactors'][0]);
        assertEquals(1, stateChanged);
        // The user should not be invalidated.
        assertEquals(0, userInvalidated);
      });
}


function testMultiFactorUser_unenroll_successRemovingAllSecondFactors() {
  // Tests that the user can be downgraded to a single factor (all second
  // factors on a user can be removed).
  var tokenChanged = 0;
  var stateChanged = 0;
  var userInvalidated = 0;

  // Set up mocks.
  var withdrawMfa = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'withdrawMfa');
  // First, expect withdrawMfa to be called with the original tokens, then
  // it will return a single factor token response.
  withdrawMfa(tokenResponse.idToken, 'ENROLLMENT_UID1')
      .$returns({
        'idToken': singleFactorTokenResponse.idToken,
        'refreshToken': singleFactorTokenResponse.refreshToken
      }).$once();
  // Next, expect getAccountInfoByToken to be called with the updated idToken.
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(singleFactorTokenResponse.idToken)
      .$returns(goog.Promise.resolve(getAccountInfoResponseWithNoSecondFactors))
      .$once();
  mockControl.$replayAll();

  // Create the user with the intital pair of tokens and listen for events.
  testUser = new fireauth.AuthUser(
      config, tokenResponse, accountInfoWithUid1);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, accountInfoWithUid1);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  goog.events.listen(
      testUser, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidated++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });
  assertEquals(1, multiFactorUser['enrolledFactors'].length);

  // Run test.
  return multiFactorUser.unenroll('ENROLLMENT_UID1')
      .then(function(){
        // The tokens should have been updated.
        var tokens = testUser.getStsTokenManager().toPlainObject();
        assertEquals(
            singleFactorTokenResponse.idToken,
            tokens['accessToken']);
        assertEquals(
            singleFactorTokenResponse.refreshToken,
            tokens['refreshToken']);
        assertEquals(1, tokenChanged);
        // All enrolled factors should be removed.
        assertEquals(0, multiFactorUser['enrolledFactors'].length);
        assertEquals(1, stateChanged);
        // The user should not be invalidated.
        assertEquals(0, userInvalidated);
      });
}


function testMultiFactorUser_unenroll_successWithEmptyTokenResponse() {
  // Tests the situation where the backend decides to revoke the user's session
  // because they unenrolled the factor that they used to login with. In this
  // case an empty object is returned instead of new tokens. The unenroll call
  // should succeed, but the user should be invalidated.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  var tokenChanged = 0;
  var stateChanged = 0;
  var userInvalidated = 0;

  // Set up mocks.
  var withdrawMfa = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'withdrawMfa');
  withdrawMfa(tokenResponse.idToken, 'ENROLLMENT_UID1')
      .$returns({}).$once(); // The empty token response.
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(tokenResponse.idToken)
      .$returns(goog.Promise.reject(expectedError)).$once();
  mockControl.$replayAll();

  // Create user.
  testUser = new fireauth.AuthUser(
    config, tokenResponse, accountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, accountInfo);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  goog.events.listen(
      testUser, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidated++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });
  assertEquals(2, multiFactorUser['enrolledFactors'].length);

  // Run test.
  return multiFactorUser.unenroll('ENROLLMENT_UID1')
      .then(function() {
        assertEquals(0, tokenChanged);
        assertEquals(0, stateChanged);
        // The first enrolled factor should have been removed.
        assertEquals(1, multiFactorUser['enrolledFactors'].length);
        // The user should be invalidated.
        assertEquals(1, userInvalidated);
      });
}


function testMultiFactorUser_unenroll_tokenExpired() {
  // Tests that unenroll will fail when the user's token is expired.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  var tokenChanged = 0;
  var stateChanged = 0;
  var userInvalidated = 0;

  // Set up mocks.
  var requestStsToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'requestStsToken');
  requestStsToken({
    'grant_type': 'refresh_token',
    'refresh_token': 'REFRESH_TOKEN1'
  }).$returns(goog.Promise.reject(expectedError)).$once();
  mockControl.$replayAll();

  // Create user.
  testUser = new fireauth.AuthUser(
    config, expiredTokenResponse, accountInfoWithUid1);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, accountInfo);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  goog.events.listen(
      testUser, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidated++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });
  assertEquals(2, multiFactorUser['enrolledFactors'].length);

  // Run test.
  return multiFactorUser.unenroll('ENROLLMENT_UID1')
      .then(fail)
      .thenCatch(function(error){
        assertEquals(expectedError, error);
        // The enrolled factors should be unchanged.
        assertEquals(2, multiFactorUser['enrolledFactors'].length);
        assertEquals(0, tokenChanged);
        assertEquals(0, stateChanged);
        // The user should be invalidated.
        assertEquals(1, userInvalidated);
      });
}


function testMultiFactorUser_unenroll_requiresRecentLogin() {
  // Tests that unenroll will fail when the user's credentials are too old and
  // they need to reauthenticate.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CREDENTIAL_TOO_OLD_LOGIN_AGAIN);
  var tokenChanged = 0;
  var stateChanged = 0;
  var userInvalidated = 0;

  // Set up mocks.
  var withdrawMfa = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'withdrawMfa');
  withdrawMfa(tokenResponse.idToken, 'ENROLLMENT_UID1')
      .$returns(goog.Promise.reject(expectedError)).$once();
  mockControl.$replayAll();

  // Create user.
  testUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, accountInfo);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  goog.events.listen(
      testUser, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidated++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });
  assertEquals(2, multiFactorUser['enrolledFactors'].length);

  // Run test.
  return multiFactorUser.unenroll('ENROLLMENT_UID1')
      .then(fail)
      .thenCatch(function(error){
        assertEquals(expectedError, error);
        // Tokens should be unchanged.
        var tokens = testUser.getStsTokenManager().toPlainObject();
        assertEquals(tokenResponse.idToken, tokens['accessToken']);
        assertEquals(tokenResponse.refreshToken, tokens['refreshToken']);
        // The enrolled factors should be unchanged.
        assertEquals(2, multiFactorUser['enrolledFactors'].length);
        assertEquals(0, tokenChanged);
        assertEquals(0, stateChanged);
        // The user should not be invalidated (since TOKEN_EXPIRED was not
        // thrown).
        assertEquals(0, userInvalidated);
      });
}


function testMultiFactorUser_unenroll_userDeleted() {
  // Tests that unenroll will fail when the user's account has been deleted.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.MODULE_DESTROYED);
  var tokenChanged = 0;
  var stateChanged = 0;
  var userInvalidated = 0;

  // Create user.
  testUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  var multiFactorUser = new fireauth.MultiFactorUser(
      testUser, accountInfo);
  goog.events.listen(
      testUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        tokenChanged++;
      });
  goog.events.listen(
      testUser, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidated++;
      });
  testUser.addStateChangeListener(function(user) {
    stateChanged++;
  });
  assertEquals(2, multiFactorUser['enrolledFactors'].length);

  // Run test.
  testUser.destroy();
  return multiFactorUser.unenroll('ENROLLMENT_UID1')
      .then(fail)
      .thenCatch(function(error){
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        // Tokens should be unchanged.
        var tokens = testUser.getStsTokenManager().toPlainObject();
        assertEquals(tokenResponse.idToken, tokens['accessToken']);
        assertEquals(tokenResponse.refreshToken, tokens['refreshToken']);
        // The enrolled factors should be unchanged.
        assertEquals(2, multiFactorUser['enrolledFactors'].length);
        assertEquals(0, tokenChanged);
        assertEquals(0, stateChanged);
        // The user should not be invalidated (since TOKEN_EXPIRED was not
        // thrown).
        assertEquals(0, userInvalidated);
      });
}
