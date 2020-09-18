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
 * @fileoverview Tests for authuser.js
 */

goog.provide('fireauth.AuthUserTest');

goog.require('fireauth.ActionCodeSettings');
goog.require('fireauth.Auth');
goog.require('fireauth.AuthCredential');
goog.require('fireauth.AuthError');
goog.require('fireauth.AuthErrorWithCredential');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.AuthEventManager');
goog.require('fireauth.AuthUser');
goog.require('fireauth.AuthUserInfo');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.MultiFactorAssertion');
goog.require('fireauth.MultiFactorInfo');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.MultiFactorUser');
goog.require('fireauth.OAuthSignInHandler');
goog.require('fireauth.PhoneAuthCredential');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.ProactiveRefresh');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.SAMLAuthProvider');
goog.require('fireauth.StsTokenManager');
goog.require('fireauth.TokenRefreshTime');
goog.require('fireauth.UserEventType');
goog.require('fireauth.UserMetadata');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('fireauth.deprecation');
goog.require('fireauth.idp');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.object');
goog.require('fireauth.storage.PendingRedirectManager');
goog.require('fireauth.storage.RedirectUserManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.object');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.AuthUserTest');

var config = {
  apiKey: 'apiKey1'
};
var user = null;
var accountInfo = null;
var accountInfoWithPhone = null;
var providerData1 = null;
var providerData2 = null;
var providerDataPhone = null;
var config1 = null;
var config2 = null;
var rpcHandler = null;
var token = null;
var tokenResponse = null;
var accountInfo2 = null;
var getAccountInfoResponse = null;
var getAccountInfoResponseProviderData1 = null;
var getAccountInfoResponseProviderData2 = null;
// A sample JWT, along with its decoded contents.
var idTokenGmail = {
  data: {
    iss: 'https://securetoken.google.com/projectId',
    auth_time: 1522715325,
    sub: '679',
    aud: 'projectId',
    iat: 1522776807,
    provider_id: 'gmail.com',
    email: 'test123456@gmail.com',
    federated_id: 'https://www.google.com/accounts/123456789',
    firebase: {
      identities: {
        email: [
          'test123456@gmail.com'
        ]
      },
      sign_in_provider: 'password'
    }
  }
};
var idTokenSaml = {
  data: {
    iss: 'https://securetoken.google.com/projectId',
    sub: '679',
    aud: 'projectId',
    federated_id: 'https://www.example.com/saml/1234567890',
    provider_id: 'saml.provider',
    email: 'test123456@gmail.com'
  }
};
var idTokenCustomClaims = {
  data: {
    iss: 'https://securetoken.google.com/projectId',
    name: 'John Doe',
    admin: true,
    aud: 'projectId',
    auth_time: 1522715325,
    sub: 'nep2uwNCK4PqjvoKjb0InVJHlGi1',
    iat: 1522776807,
    email: "testuser@gmail.com",
    email_verified: true,
    firebase: {
      identities: {
        email: [
          'testuser@gmail.com'
        ]
      },
      sign_in_provider: 'password'
    }
  }
};
var expectedTokenResponseWithIdPData;
var expectedAdditionalUserInfo;
var expectedGoogleCredential;
var expectedReauthenticateTokenResponse;
var now = goog.now();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();

var stubs = new goog.testing.PropertyReplacer();
var ignoreArgument;
var mockControl;

var app;
var auth;
var getAccountInfoResponseGoogleProviderData;
var getAccountInfoResponsePhoneAuthProviderData;
var expectedPhoneNumber;
var appVerifier;
var expectedRecaptchaToken;
var actionCodeSettings = {
  'url': 'https://www.example.com/?state=abc',
  'iOS': {
    'bundleId': 'com.example.ios'
  },
  'android': {
    'packageName': 'com.example.android',
    'installApp': true,
    'minimumVersion': '12'
  },
  'handleCodeInApp': true,
  'dynamicLinkDomain': 'example.page.link'
};
var lastLoginAt = '1506050282000';
var createdAt = '1506044998000';
var lastLoginAt2 = '1506053999000';
var createdAt2 = '1505980145000';
var expectedSamlTokenResponseWithIdPData;
var expectedSamlAdditionalUserInfo;
var jwt;
var newJwt;
var userReloadedEventHandler;
var multiFactor;
var mfaInfo;
var multiFactorErrorServerResponse;
var multiFactorTokenResponse;
var multiFactorGetAccountInfoResponse;
var nonMultiFactorTokenResponse;


function setUp() {
  // Disable Auth event manager by default unless needed for a specific test.
  fireauth.AuthEventManager.ENABLED = false;
  config1 = {
    apiKey: 'apiKey1',
    appName: 'appId1'
  };
  config2 = {
    apiKey: 'apiKey2',
    appName: 'appId2'
  };
  idTokenGmail.data.exp = now / 1000 + 3600;
  idTokenGmail.jwt =
      fireauth.common.testHelper.createMockJwt(idTokenGmail.data);
  idTokenSaml.data.exp = now / 1000 + 3600;
  idTokenSaml.jwt = fireauth.common.testHelper.createMockJwt(idTokenSaml.data);
  idTokenCustomClaims.data.exp = now / 1000 + 3600;
  idTokenCustomClaims.jwt =
      fireauth.common.testHelper.createMockJwt(idTokenCustomClaims.data);
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  // Simulate tab can run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return true;
      });
  // In case the tests are run from an iframe.
  stubs.replace(
      fireauth.util,
      'isIframe',
      function() {
        return false;
      });
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  multiFactor = {
    'enrolledFactors': [
      {
        'uid': 'ENROLLMENT_UID1',
        'displayName': 'Work phone number',
        'enrollmentTime': new Date(now).toUTCString(),
        'factorId': fireauth.constants.SecondFactorType.PHONE,
        'phoneNumber': '+16505551234'
      },
      {
        'uid': 'ENROLLMENT_UID2',
        'displayName': null,
        'enrollmentTime': new Date(now).toUTCString(),
        'factorId': fireauth.constants.SecondFactorType.PHONE,
        'phoneNumber': '+16505556789'
      }
    ]
  };
  mfaInfo = [
    {
      'mfaEnrollmentId': 'ENROLLMENT_UID1',
      'displayName': 'Work phone number',
      'enrolledAt': new Date(now).toISOString(),
      'phoneInfo': '+16505551234'
    },
    {
      'mfaEnrollmentId': 'ENROLLMENT_UID2',
      'enrolledAt': new Date(now).toISOString(),
      'phoneInfo': '+16505556789'
    }
  ];
  accountInfo = {
    'uid': 'defaultUserId',
    'email': 'user@default.com',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'emailVerified': true,
    'lastLoginAt': lastLoginAt,
    'createdAt': createdAt
  };
  accountInfoWithPhone = {
    'uid': 'defaultUserId',
    'email': 'user@default.com',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'emailVerified': true,
    'phoneNumber': '+16505550101',
    'lastLoginAt': lastLoginAt,
    'createdAt': createdAt
  };
  accountInfoWithEnrolledFactors = {
    'uid': 'defaultUserId',
    'email': 'user@default.com',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'emailVerified': true,
    'lastLoginAt': lastLoginAt,
    'createdAt': createdAt,
    'multiFactor': multiFactor
  };
  accountInfo2 = {
    'uid': '14584746072031976743',
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    // common_typos_disable.
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true,
    'lastLoginAt': lastLoginAt2,
    'createdAt': createdAt2
  };

  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      'user1',
      'https://www.example.com/user1/photo.png');
  providerData2 = new fireauth.AuthUserInfo(
      'providerUserId2',
      'providerId2',
      'user2@example.com',
      'user2',
      'https://www.example.com/user2/photo.png');
  providerDataPhone = new fireauth.AuthUserInfo(
      '+16505550101', 'phone', undefined, undefined, undefined, '+16505550101');
  rpcHandler = new fireauth.RpcHandler('apiKey1');
  token = new fireauth.StsTokenManager(rpcHandler);
  token.setRefreshToken('refreshToken');
  jwt = fireauth.common.testHelper.createMockJwt(
      {'group': '1'}, now + 3600 * 1000);
  newJwt = fireauth.common.testHelper.createMockJwt(
      {'group': '2'}, now + 3600 * 1000);
  token.setAccessToken(jwt);
  tokenResponse = {
    'idToken': jwt,
    'refreshToken': 'refreshToken'
  };

  // accountInfo in the format of a getAccountInfo response.
  getAccountInfoResponse = {
    'users': [{
      'localId': 'defaultUserId',
      'email': 'user@default.com',
      'emailVerified': true,
      'phoneNumber': '+16505550101',
      'displayName': 'defaultDisplayName',
      'providerUserInfo': [],
      'photoUrl': 'https://www.default.com/default/default.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false,
      'lastLoginAt': lastLoginAt,
      'createdAt': createdAt
    }]
  };
  // providerData1 and providerData2 in the format of a getAccountInfo response.
  getAccountInfoResponseProviderData1 = {
    'providerId': 'providerId1',
    'displayName': 'user1',
    'email': 'user1@example.com',
    'photoUrl': 'https://www.example.com/user1/photo.png',
    'rawId': 'providerUserId1'
  };
  getAccountInfoResponseProviderData2 = {
    'providerId': 'providerId2',
    'displayName': 'user2',
    'email': 'user2@example.com',
    'photoUrl': 'https://www.example.com/user2/photo.png',
    'rawId': 'providerUserId2'
  };
  getAccountInfoResponseGoogleProviderData = {
    'providerId': 'google.com',
    'displayName': 'My Google Name',
    'email': 'me@gmail.com',
    'photoUrl': 'https://www.google.com/me.png',
    'rawId': 'myGoogleId'
  };
  getAccountInfoResponsePhoneAuthProviderData = {
    'providerId': 'phone',
    'rawId': '+16505550101',
    'phoneNumber': '+16505550101'
  };
  expectedTokenResponseWithIdPData = {
    'idToken': newJwt,
    'refreshToken': 'newRefreshToken',
    // Credential returned.
    'providerId': 'google.com',
    'oauthAccessToken': 'googleAccessToken',
    'oauthIdToken': 'googleIdToken',
    'oauthExpireIn': 3600,
    // Additional user info data.
    'rawUserInfo': '{"kind":"plus#person","displayName":"John Doe","na' +
    'me":{"givenName":"John","familyName":"Doe"}}'
  };
  expectedReauthenticateTokenResponse = {
    'idToken': idTokenGmail.jwt,
    'refreshToken': 'myRefreshToken',
    // Credential returned.
    'providerId': 'google.com',
    'oauthAccessToken': 'googleAccessToken',
    'oauthIdToken': 'googleIdToken',
    'oauthExpireIn': 3600,
    // Additional user info data.
    'rawUserInfo': '{"kind":"plus#person","displayName":"John Doe","na' +
    'me":{"givenName":"John","familyName":"Doe"}}'
  };
  expectedAdditionalUserInfo = {
    'profile': {
      'kind': 'plus#person',
      'displayName': 'John Doe',
      'name': {
        'givenName': 'John',
        'familyName': 'Doe'
      }
    },
    'providerId': 'google.com',
    'isNewUser': false
  };
  expectedGoogleCredential = fireauth.GoogleAuthProvider.credential(
      'googleIdToken', 'googleAccessToken');
  expectedSamlTokenResponseWithIdPData = {
    'idToken': newJwt,
    'refreshToken': 'newRefreshToken',
    'providerId': 'saml.provider',
    // Additional user info data.
    'rawUserInfo': '{"kind":"plus#person","displayName":"John Doe","na' +
    'me":{"givenName":"John","familyName":"Doe"}}'
  };
  expectedSamlAdditionalUserInfo = {
    'profile': {
      'kind': 'plus#person',
      'displayName': 'John Doe',
      'name': {
        'givenName': 'John',
        'familyName': 'Doe'
      }
    },
    'providerId': 'saml.provider',
    'isNewUser': false
  };
  expectedPhoneNumber = '+16505550101';
  expectedRecaptchaToken = 'RECAPTCHA_TOKEN';
  appVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      return goog.Promise.resolve(expectedRecaptchaToken);
    }
  };
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl = new goog.testing.MockControl();
  mockControl.$resetAll();
  nonMultiFactorTokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'sub': 'defaultUserId',
      'firebase': {
        'sign_in_provider': 'password'
      }
    }),
    'refreshToken': 'SINGLE_FACTOR_REFRESH_TOKEN'
  };
  multiFactorTokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt({
      'sub': 'defaultUserId',
      'firebase': {
        'sign_in_provider': 'password',
        'sign_in_second_factor': 'phone'
      }
    }),
    'refreshToken': 'MULTI_FACTOR_REFRESH_TOKEN'
  };
  multiFactorErrorServerResponse = {
    'mfaInfo': [
      {
        'mfaEnrollmentId': 'ENROLLMENT_UID1',
        'enrolledAt': new Date(now).toISOString(),
        'phoneInfo': '+*******1234'
      },
      {
        'mfaEnrollmentId': 'ENROLLMENT_UID2',
        'displayName': 'Spouse phone number',
        'enrolledAt': new Date(now).toISOString(),
        'phoneInfo': '+*******6789'
      }
    ],
    'mfaPendingCredential': 'PENDING_CREDENTIAL',
    // Credential returned.
    'providerId': 'google.com',
    'oauthAccessToken': 'googleAccessToken',
    'oauthIdToken': 'googleIdToken',
    'oauthExpireIn': 3600,
    // Additional user info data.
    'rawUserInfo': '{"kind":"plus#person","displayName":"John Doe",' +
        '"name":{"givenName":"John","familyName":"Doe"}}'
  };
  multiFactorGetAccountInfoResponse = {
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
          'enrolledAt': new Date(now).toISOString(),
          'phoneInfo': '+16505551234'
        },
        {
          'mfaEnrollmentId': 'ENROLLMENT_UID2',
          'displayName': 'Spouse phone number',
          'enrolledAt': new Date(now).toISOString(),
          'phoneInfo': '+16505556789'
        }
      ]
    }]
  };
}


function tearDown() {
  for (var i = 0; i < firebase.apps.length; i++) {
    asyncTestCase.waitForSignals(1);
    firebase.apps[i].delete().then(function() {
      asyncTestCase.signal();
    });
  }
  if (auth) {
    auth.delete();
  }
  // Reset already initialized Auth event managers.
  fireauth.AuthEventManager.manager_ = {};
  user = null;
  accountInfo = null;
  accountInfoWithPhone = null;
  accountInfoWithEnrolledFactors = null;
  accountInfo2 = null;
  getAccountInfoResponse = null;
  getAccountInfoResponseProviderData1 = null;
  getAccountInfoResponseProviderData2 = null;
  providerData1 = null;
  providerData2 = null;
  providerDataPhone = null;
  rpcHandler = null;
  token = null;
  tokenResponse = null;
  config1 = null;
  config2 = null;
  multiFactor = null;
  mfaInfo = null;
  multiFactorErrorServerResponse = null;
  multiFactorTokenResponse = null;
  multiFactorGetAccountInfoResponse = null;
  nonMultiFactorTokenResponse = null;
  window.localStorage.clear();
  window.sessionStorage.clear();
  stubs.reset();
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
}


/** @return {!goog.events.EventTarget} The event dispatcher test object. */
function createEventDispatcher() {
  return new goog.events.EventTarget();
}


/**
 * Asserts that token events do not trigger.
 * @param {!fireauth.AuthUser} user
 */
function assertNoTokenEvents(user) {
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        fail('Token change should not trigger due to token being unchanged!');
      });
}


/**
 * Asserts that user invalidated events do not trigger.
 * @param {!fireauth.AuthUser} user
 */
function assertNoUserInvalidatedEvents(user) {
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        fail('User invalidate event should not trigger!');
      });
}


/**
 * Asserts that state events do not trigger.
 * @param {!fireauth.AuthUser} user
 */
function assertNoStateEvents(user) {
  user.addStateChangeListener(function(userTemp) {
    fail('State change listener should not trigger!');
  });
}


/**
 * Asserts that delete events do not trigger.
 * @param {!fireauth.AuthUser} user
 */
function assertNoDeleteEvents(user) {
  goog.events.listen(
      user, fireauth.UserEventType.USER_DELETED, function(event) {
        fail('User deleted listener should not trigger!');
      });
}


/**
 * Asserts that a method should fail when user is destroyed and no listeners
 * are triggered.
 * @param {string} methodName The name of the method of AuthUser that should
 *     fail if the user is destroyed.
 * @param {!Array} parameters The arguments to pass to the method.
 */
function assertFailsWhenUserIsDestroyed(methodName, parameters) {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoDeleteEvents(user);
  assertNoUserInvalidatedEvents(user);

  user.destroy();
  user[methodName].apply(user, parameters).then(fail, function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.MODULE_DESTROYED),
        error);
    asyncTestCase.signal(1);
  });
}


function testProviderData() {
  assertEquals('providerUserId1', providerData1['uid']);
  assertEquals('providerId1', providerData1['providerId']);
  assertEquals('user1@example.com', providerData1['email']);
  assertEquals('user1', providerData1['displayName']);
  assertEquals(
      'https://www.example.com/user1/photo.png', providerData1['photoURL']);
}


function testUser() {
  accountInfo['email'] = null;
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);

  assertObjectEquals(
      new fireauth.UserMetadata(createdAt, lastLoginAt), user.metadata);
  assertEquals(jwt, user.lastAccessToken_);
  assertEquals('defaultUserId', user['uid']);
  assertEquals('defaultDisplayName', user['displayName']);
  assertNull(user['email']);
  assertEquals('https://www.default.com/default/default.png', user['photoURL']);
  assertEquals('firebase', user['providerId']);
  assertEquals(false, user['isAnonymous']);
  assertNull(user['tenantId']);
  assertArrayEquals(['providerId1', 'providerId2'], user.getProviderIds());
  assertObjectEquals(
      {
        'uid': 'providerUserId1',
        'displayName': null,
        'photoURL': 'https://www.example.com/user1/photo.png',
        'email': 'user1@example.com',
        'providerId': 'providerId1',
        'phoneNumber': null
      },
      user['providerData'][0]);
  assertObjectEquals(
      {
        'uid': 'providerUserId2',
        'displayName': 'user2',
        'photoURL': 'https://www.example.com/user2/photo.png',
        'email': 'user2@example.com',
        'providerId': 'providerId2',
        'phoneNumber': null
      },
      user['providerData'][1]);

  // Test popup event ID setters and getters.
  assertNull(user.getPopupEventId());
  user.setPopupEventId('1234');
  assertEquals('1234', user.getPopupEventId());
  user.setPopupEventId('5678');
  assertEquals('5678', user.getPopupEventId());

  // Test redirect event ID setters and getters.
  assertNull(user.getRedirectEventId());
  user.setRedirectEventId('1234');
  assertEquals('1234', user.getRedirectEventId());
  user.setRedirectEventId('5678');
  assertEquals('5678', user.getRedirectEventId());

  // Test ApiKey getter.
  assertEquals('apiKey1', user.getApiKey());
}


function testUser_multiFactor() {
  user = new fireauth.AuthUser(
      config1, tokenResponse, accountInfoWithEnrolledFactors);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);

  assertTrue(user.multiFactor instanceof fireauth.MultiFactorUser);
  assertObjectEquals(
      new fireauth.MultiFactorUser(user, accountInfoWithEnrolledFactors),
      user.multiFactor);
}


function testUser_copyUser() {
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  config2['authDomain'] = 'subdomain.firebaseapp.com';
  asyncTestCase.waitForSignals(1);
  // Sets the tenant ID on user to be copied.
  accountInfo['tenantId'] = 'TENANT_ID';
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      goog.testing.recordFunction(function(idToken) {
        // Mocks that tenant ID is returned in getAccountInfo response.
        getAccountInfoResponse['users'][0]['tenantId'] = 'TENANT_ID';
        return goog.Promise.resolve(getAccountInfoResponse);
      }));
  var expectedEventId = '1234';
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config2['apiKey'], config2['appName']));
  var frameworks = ['firebaseui', 'angularfire'];

  fireauth.AuthEventManager.ENABLED = true;
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.LINK_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(false);
  mockControl.$replayAll();

  var copiedUser = fireauth.AuthUser.copyUser(
      user, config2, storageManager, frameworks);
  // Verifies that user is not reloaded on copying.
  assertEquals(
      0, fireauth.RpcHandler.prototype.getAccountInfoByIdToken.getCallCount());
  fireauth.common.testHelper.assertUserEqualsInWithDiffApikey(
      user, copiedUser, config1['apiKey'], config2['apiKey']);
  assertFalse(copiedUser['isAnonymous']);
  assertEquals('TENANT_ID', copiedUser['tenantId']);
  // Confirm frameworks set on created user.
  assertArrayEquals(frameworks, copiedUser.getFramework());

  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  copiedUser.enablePopupRedirect();
  copiedUser.linkWithRedirect(expectedProvider).then(function() {
    assertEquals(1,
        fireauth.RpcHandler.prototype.getAccountInfoByIdToken.getCallCount());
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, copiedUser.getRedirectEventId());
    // Redirect user should be saved in storage with correct redirect event ID.
    storageManager.getRedirectUser().then(function(user) {
      assertEquals(expectedEventId, user.getRedirectEventId());
      assertObjectEquals(copiedUser.toPlainObject(), user.toPlainObject());
      asyncTestCase.signal();
    });
  });
}


function testUser_copyUser_defaultConfig() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);

  var copiedUser = fireauth.AuthUser.copyUser(user);
  assertObjectEquals(copiedUser.toPlainObject(), user.toPlainObject());
  assertNull(user.getPopupEventId());
  assertNull(user.getRedirectEventId());
}


function testUser_copyUser_expiredToken() {
  // Mock the expired token.
  tokenResponse['idToken'] =
      fireauth.common.testHelper.createMockJwt(null, now - 5);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'requestStsToken',
      function(data) {
        // Copying user should not trigger token refresh even if the token
        // expires.
        fail('The token should not be refreshed!');
      });
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  var copiedUser = fireauth.AuthUser.copyUser(user);
  assertObjectEquals(copiedUser.toPlainObject(), user.toPlainObject());
}


function testUser_copyUser_multiFactor() {
  user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user2 = new fireauth.AuthUser(
      config1, tokenResponse, accountInfoWithEnrolledFactors);
  user3 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  var multiFactorUser1 = user1.multiFactor;

  user1.copy(user2);
  // Same reference should be kept.
  assertEquals(user1.multiFactor, multiFactorUser1);
  assertObjectEquals(
      new fireauth.MultiFactorUser(user2, accountInfoWithEnrolledFactors)
          .toPlainObject(),
      user1.multiFactor.toPlainObject());
  // user1.multiFactor user reference should keep pointing to user1.
  assertEquals(user1, user1.multiFactor.getUser());

  user1.copy(user3);
  // Same reference should be kept.
  assertEquals(user1.multiFactor, multiFactorUser1);
  assertObjectEquals(
      new fireauth.MultiFactorUser(user3, accountInfo).toPlainObject(),
      user1.multiFactor.toPlainObject());
  assertEquals(0, user1.multiFactor.enrolledFactors.length);
  // user1.multiFactor user reference should keep pointing to user1.
  assertEquals(user1, user1.multiFactor.getUser());
}


function testUser_rpcHandlerEndpoints() {
  // Confirm expected endpoint config passed to underlying RPC handler.
  var endpoint = fireauth.constants.Endpoint.STAGING;
  var endpointConfig = {
    'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
    'secureTokenEndpoint': endpoint.secureTokenEndpoint,
    'identityPlatformEndpoint': endpoint.identityPlatformEndpoint
  };
  stubs.replace(
      fireauth.constants,
      'getEndpointConfig',
      function(opt_id) {
        return endpointConfig;
      });
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  var rpcHandlerConstructor = mockControl.createConstructorMock(
      fireauth, 'RpcHandler');
  rpcHandlerConstructor(config1['apiKey'], endpointConfig, ignoreArgument)
      .$returns(rpcHandler);
  rpcHandler.updateTenantId(null);
  mockControl.$replayAll();
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
}


function testUser_rpcHandlerEndpoints_tenantId() {
  // Confirm expected endpoint config passed to underlying RPC handler.
  var endpoint = fireauth.constants.Endpoint.STAGING;
  var endpointConfig = {
    'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
    'secureTokenEndpoint': endpoint.secureTokenEndpoint
  };
  stubs.replace(
      fireauth.constants,
      'getEndpointConfig',
      function(opt_id) {
        return endpointConfig;
      });
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  var rpcHandlerConstructor = mockControl.createConstructorMock(
      fireauth, 'RpcHandler');
  rpcHandlerConstructor(config1['apiKey'], endpointConfig, ignoreArgument)
      .$returns(rpcHandler);
  // Tenant ID of RPC handler should be updated.
  rpcHandler.updateTenantId('TENANT_ID');
  mockControl.$replayAll();
  // Sets the tenant ID on user.
  accountInfo['tenantId'] = 'TENANT_ID';
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertEquals('TENANT_ID', user['tenantId']);
}


function testUser_stateChangeListeners() {
  // Test user state change listeners: adding, removing and their execution.
  asyncTestCase.waitForSignals(3);
  var listener1 = goog.testing.recordFunction(function(userTemp) {
    assertEquals(user, userTemp);
    // Whether it resolves or rejects, it shouldn't affect the outcome.
    return goog.Promise.resolve();
  });
  var listener2 = goog.testing.recordFunction(function(userTemp) {
    assertEquals(user, userTemp);
    // Whether it resolves or rejects, it shouldn't affect the outcome.
    return goog.Promise.reject();
  });
  // Listener that does not return a promise.
  var listener3 = goog.testing.recordFunction();
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Add all listeners.
  user.addStateChangeListener(listener1);
  user.addStateChangeListener(listener2);
  user.addStateChangeListener(listener3);
  // Notify listeners.
  user.notifyStateChangeListeners_().then(function(userTemp) {
    assertEquals(user, userTemp);
    // All should run.
    assertEquals(1, listener1.getCallCount());
    assertEquals(1, listener2.getCallCount());
    assertEquals(1, listener3.getCallCount());
    // Remove second and third listener.
    user.removeStateChangeListener(listener2);
    user.removeStateChangeListener(listener3);
    asyncTestCase.signal();
    // Notify listeners.
    user.notifyStateChangeListeners_().then(function(userTemp) {
      assertEquals(user, userTemp);
      // Only first listener should run.
      assertEquals(2, listener1.getCallCount());
      assertEquals(1, listener2.getCallCount());
      assertEquals(1, listener3.getCallCount());
      // Remove remaining listener.
      user.removeStateChangeListener(listener1);
      asyncTestCase.signal();
      // Notify listeners.
      user.notifyStateChangeListeners_().then(function(userTemp) {
        assertEquals(user, userTemp);
        // No listener should run.
        assertEquals(2, listener1.getCallCount());
        assertEquals(1, listener2.getCallCount());
        assertEquals(1, listener3.getCallCount());
        asyncTestCase.signal();
      });
    });
  });
}


function testGetRpcHandler() {
  user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user2 = new fireauth.AuthUser(config2, tokenResponse, accountInfo);

  assertTrue(user1.getRpcHandler() instanceof fireauth.RpcHandler);
  assertTrue(user2.getRpcHandler() instanceof fireauth.RpcHandler);
  assertEquals(config1['apiKey'], user1.getRpcHandler().getApiKey());
  assertEquals(config2['apiKey'], user2.getRpcHandler().getApiKey());
}


function testAddProviderData_sameProviderId() {
  var providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'theProviderId',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  var providerData2 = new fireauth.AuthUserInfo(
      'providerUserId2',
      'theProviderId',
      'user2@example.com',
      null,
      'https://www.example.com/user2/photo.png');
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);

  assertArrayEquals(['theProviderId'], user.getProviderIds());
  assertArrayEquals([{
    'uid': 'providerUserId2',
    'displayName': null,
    'photoURL': 'https://www.example.com/user2/photo.png',
    'email': 'user2@example.com',
    'providerId': 'theProviderId',
    'phoneNumber': null
  }], user['providerData']);
}



function testUser_removeProviderData() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);

  assertArrayEquals(['providerId1', 'providerId2'], user.getProviderIds());
  user.removeProviderData('providerId1');
  assertArrayEquals(['providerId2'], user.getProviderIds());
}


function testUser_setUserAccountInfoFromToken_success() {
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'providerUserInfo': [
        {
          'email': 'user@gmail.com',
          'providerId': 'google.com',
          'displayName': 'John G. Doe',
          'photoUrl': 'https://lh5.googleusercontent.com/123456789/photo.jpg',
          'federatedId': 'https://accounts.google.com/123456789',
          'rawId': '123456789'
        },
        {
          'providerId': 'twitter.com',
          'displayName': 'John Gammell Doe',
          'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/' +
              'default_profile_3_normal.png',
          'federatedId': 'http://twitter.com/987654321',
          'rawId': '987654321'
        }
      ],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/' +
          'default_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  var expectedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true
  });
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '123456789',
      'google.com',
      'user@gmail.com',
      'John G. Doe',
      'https://lh5.googleusercontent.com/123456789/photo.jpg'));
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '987654321',
      'twitter.com',
      null,
      'John Gammell Doe',
      'http://abs.twimg.com/sticky/default_profile_images/default_profile_' +
      '3_normal.png'));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          assertEquals(jwt, data);
          resolve(response);
        });
      });
  asyncTestCase.waitForSignals(1);
  // Initialize user with no account info or provider data.
  user = new fireauth.AuthUser(config1, tokenResponse);
  // Record event triggers on USER_RELOADED.
  var userReloadedEventHandler = goog.testing.recordFunction();
  goog.events.listen(
      user, fireauth.UserEventType.USER_RELOADED, userReloadedEventHandler);
  var stateChangedCounter = 0;
  user.addStateChangeListener(function(user) {
    stateChangedCounter++;
    return goog.Promise.resolve();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  assertEquals(0, userReloadedEventHandler.getCallCount());
  user.reload().then(function() {
    assertEquals(1, stateChangedCounter);
    fireauth.common.testHelper.assertUserEquals(expectedUser, user);
    // Confirm event triggered on reload with the expected properties.
    assertEquals(1, userReloadedEventHandler.getCallCount());
    var event = userReloadedEventHandler.getLastCall().getArgument(0);
    assertObjectEquals(response.users[0], event.userServerResponse);
    asyncTestCase.signal();
  });
}


function testSetUserAccountInfoFromToken_success_emailAndPassword() {
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'passwordHash': 'PASSWORD_HASH',
      'providerUserInfo': [],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/' +
          'default_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  var expectedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true
  });
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          assertEquals(jwt, data);
          resolve(response);
        });
      });
  user = new fireauth.AuthUser(config1, tokenResponse);
  // Record event triggers on USER_RELOADED.
  var userReloadedEventHandler = goog.testing.recordFunction();
  goog.events.listen(
      user, fireauth.UserEventType.USER_RELOADED, userReloadedEventHandler);
  asyncTestCase.waitForSignals(1);
  assertEquals(0, userReloadedEventHandler.getCallCount());
  user.reload().then(function() {
    fireauth.common.testHelper.assertUserEquals(expectedUser, user);
    // Confirm event triggered on reload with the expected properties.
    assertEquals(1, userReloadedEventHandler.getCallCount());
    var event = userReloadedEventHandler.getLastCall().getArgument(0);
    assertObjectEquals(response.users[0], event.userServerResponse);
    asyncTestCase.signal();
  });
}


function testSetUserAccountInfoFromToken_success_emailNoPassword() {
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'providerUserInfo': [],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  var expectedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true,
    'isAnonymous': false
  });
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          assertEquals(jwt, data);
          resolve(response);
        });
      });
  user = new fireauth.AuthUser(config1, tokenResponse);
  asyncTestCase.waitForSignals(1);
  user.reload().then(function() {
    assertObjectEquals(expectedUser.toPlainObject(), user.toPlainObject());
    asyncTestCase.signal();
  });
}


function testSetUserAccountInfoFromToken_success_passwordNoEmail() {
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': '',
      'displayName': 'John Doe',
      'passwordHash': 'PASSWORD_HASH',
      'providerUserInfo': [],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  var expectedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': '',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'isAnonymous': false
  });
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          assertEquals(jwt, data);
          resolve(response);
        });
      });

  user = new fireauth.AuthUser(config1, tokenResponse);
  asyncTestCase.waitForSignals(1);
  user.reload().then(function() {
    fireauth.common.testHelper.assertUserEquals(expectedUser, user);
    asyncTestCase.signal();
  });
}


function testUser_setUserAccountInfoFromToken_multiFactor_success() {
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'providerUserInfo': [
        {
          'email': 'user@gmail.com',
          'providerId': 'google.com',
          'displayName': 'John G. Doe',
          'photoUrl': 'https://lh5.googleusercontent.com/123456789/photo.jpg',
          'federatedId': 'https://accounts.google.com/123456789',
          'rawId': '123456789'
        },
        {
          'providerId': 'twitter.com',
          'displayName': 'John Gammell Doe',
          'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/' +
              'default_profile_3_normal.png',
          'federatedId': 'http://twitter.com/987654321',
          'rawId': '987654321'
        }
      ],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/' +
          'default_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false,
      'mfaInfo': mfaInfo
    }]
  };
  var expectedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true,
    'multiFactor': multiFactor
  });
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '123456789',
      'google.com',
      'user@gmail.com',
      'John G. Doe',
      'https://lh5.googleusercontent.com/123456789/photo.jpg'));
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '987654321',
      'twitter.com',
      null,
      'John Gammell Doe',
      'http://abs.twimg.com/sticky/default_profile_images/default_profile_' +
      '3_normal.png'));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          assertEquals(jwt, data);
          resolve(response);
        });
      });
  asyncTestCase.waitForSignals(1);
  // Initialize user with no account info or provider data.
  user = new fireauth.AuthUser(config1, tokenResponse);
  var multiFactorUser = user.multiFactor;
  assertEquals(0, user.multiFactor.enrolledFactors.length);
  // Record event triggers on USER_RELOADED.
  var userReloadedEventHandler = goog.testing.recordFunction();
  goog.events.listen(
      user, fireauth.UserEventType.USER_RELOADED, userReloadedEventHandler);
  var stateChangedCounter = 0;
  user.addStateChangeListener(function(user) {
    stateChangedCounter++;
    return goog.Promise.resolve();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  assertEquals(0, userReloadedEventHandler.getCallCount());

  user.reload().then(function() {
    assertEquals(1, stateChangedCounter);
    fireauth.common.testHelper.assertUserEquals(expectedUser, user);
    // Confirm event triggered on reload with the expected properties.
    assertEquals(1, userReloadedEventHandler.getCallCount());
    var event = userReloadedEventHandler.getLastCall().getArgument(0);
    assertObjectEquals(response.users[0], event.userServerResponse);
    // Confirm enrolled factors updated.
    assertEquals(mfaInfo.length, user.multiFactor.enrolledFactors.length);
    assertObjectEquals(
        fireauth.MultiFactorInfo.fromServerResponse(mfaInfo[0]),
        user.multiFactor.enrolledFactors[0]);
    assertObjectEquals(
        fireauth.MultiFactorInfo.fromServerResponse(mfaInfo[1]),
        user.multiFactor.enrolledFactors[1]);
    // Multifactor reference should not be updated.
    assertEquals(multiFactorUser, user.multiFactor);
    asyncTestCase.signal();
  });
}


function testSetUserAccountInfoFromToken_success_tenantId() {
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'passwordHash': 'PASSWORD_HASH',
      'providerUserInfo': [],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/' +
          'default_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false,
      'tenantId': 'TENANT_ID'
    }]
  };
  var updateTenantId = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'updateTenantId');
  // Tenant ID of RPC handler should be initialized to null.
  updateTenantId(null).$once();
  // Tenant ID of RPC handler should be updated by setAccountInfo.
  updateTenantId('TENANT_ID').$once();
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        assertEquals(jwt, data);
        return goog.Promise.resolve(response);
      });
  mockControl.$replayAll();
  user = new fireauth.AuthUser(config1, tokenResponse);
  asyncTestCase.waitForSignals(1);
  user.reload().then(function() {
    assertEquals('TENANT_ID', user['tenantId']);
    asyncTestCase.signal();
  });
}


function testUser_setUserAccountInfoFromToken_error() {
  var error = {
    'error': fireauth.authenum.Error.INTERNAL_ERROR
  };
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return goog.Promise.reject(error);
      });
  asyncTestCase.waitForSignals(1);
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.reload().thenCatch(function(e) {
    // User data unchanged.
    for (var key in accountInfo) {
      // Metadata is structured differently in user compared to accountInfo.
      if (key == 'lastLoginAt') {
        assertEquals(
            fireauth.util.utcTimestampToDateString(accountInfo[key]),
            user['metadata']['lastSignInTime']);
      } else if (key == 'createdAt') {
        assertEquals(
            fireauth.util.utcTimestampToDateString(accountInfo[key]),
            user['metadata']['creationTime']);
      } else {
        assertEquals(accountInfo[key], user[key]);
      }
    }
    assertObjectEquals(error, e);
    asyncTestCase.signal();
  });
}


function testUser_setUserAccountInfoFromToken_invalidResponse() {
  // Test with invalid server response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        // Resolve getAccountInfo with invalid server response.
        return goog.Promise.resolve({});
      });
  asyncTestCase.waitForSignals(1);
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.reload().thenCatch(function(error) {
    var expected = new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR);
    assertEquals(expected.code, error.code);
    // User data unchanged.
    for (var key in accountInfo) {
      // Metadata is structured differently in user compared to accountInfo.
      if (key == 'lastLoginAt') {
        assertEquals(
            fireauth.util.utcTimestampToDateString(accountInfo[key]),
            user['metadata']['lastSignInTime']);
      } else if (key == 'createdAt') {
        assertEquals(
            fireauth.util.utcTimestampToDateString(accountInfo[key]),
            user['metadata']['creationTime']);
      } else {
        assertEquals(accountInfo[key], user[key]);
      }
    }
    asyncTestCase.signal();
  });
}


function testUser_reload_success() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  user.addStateChangeListener(function(user) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        assertEquals(jwt, idToken);
        user.copy(updatedUser);
        asyncTestCase.signal();
        return goog.Promise.resolve(myAccountInfo);
      });
  var myAccountInfo = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'new_uid123@fake.com',
      'emailVerified': true,
      'displayName': 'Fabrice',
      'providerUserInfo': [],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  var updatedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'new_uid123@fake.com',
    'displayName': 'Fabrice',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true
  });
  asyncTestCase.waitForSignals(3);
  user.reload().then(function() {
    assertObjectEquals(updatedUser.toPlainObject(), user.toPlainObject());
    asyncTestCase.signal();
  });
}


/**
 * Tests the case where a user currently stored in local storage as not
 * anonymous reloads its data and has no more credential (for instance, it has
 * unlinked all its providers). The isAnonymous flag should remain false.
 */
function testUser_reload_success_noCredentialUserLocallyNotAnonymous() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  user.addStateChangeListener(function(user) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': '',
      'displayName': 'John Doe',
      'providerUserInfo': [],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'disabled': false
    }]
  };
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          assertEquals(jwt, data);
          asyncTestCase.signal();
          resolve(response);
        });
      });
  var updatedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': '',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'isAnonymous': false
  });
  asyncTestCase.waitForSignals(3);
  user.reload().then(function() {
    assertObjectEquals(updatedUser.toPlainObject(), user.toPlainObject());
    asyncTestCase.signal();
  });
}


/**
 * Tests that an anonymous user remains anonymous when no credential in the
 * GetAccountInfo response.
 */
function testUser_reload_success_noCredentialUserLocallyAnonymous() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  user.updateProperty('isAnonymous', true);
  user.addStateChangeListener(function(user) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': '',
      'displayName': 'John Doe',
      'providerUserInfo': [],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'disabled': false
    }]
  };
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          assertEquals(jwt, data);
          asyncTestCase.signal();
          resolve(response);
        });
      });
  var updatedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': '',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'isAnonymous': true
  });
  asyncTestCase.waitForSignals(3);
  user.reload().then(function() {
    assertObjectEquals(updatedUser.toPlainObject(), user.toPlainObject());
    asyncTestCase.signal();
  });
}


function testUser_reload_success_tenantId() {
  accountInfo2['tenantId'] = 'TENANT_ID';
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  assertEquals('TENANT_ID', user['tenantId']);
  user.addStateChangeListener(function(user) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        assertEquals(jwt, idToken);
        user.copy(updatedUser);
        asyncTestCase.signal();
        return goog.Promise.resolve(myAccountInfo);
      });
  var myAccountInfo = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'new_uid123@fake.com',
      'emailVerified': true,
      'displayName': 'Fabrice',
      'providerUserInfo': [],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false,
      'tenantId': 'TENANT_ID'
    }]
  };
  var updatedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'new_uid123@fake.com',
    'displayName': 'Fabrice',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true,
    'tenantId': 'TENANT_ID'
  });
  asyncTestCase.waitForSignals(3);
  user.reload().then(function() {
    assertObjectEquals(updatedUser.toPlainObject(), user.toPlainObject());
    assertEquals('TENANT_ID', user['tenantId']);
    asyncTestCase.signal();
  });
}


function testUser_reload_general_error() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        asyncTestCase.signal();
        return goog.Promise.reject(expectedError);
      });
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  assertNoDeleteEvents(user);
  asyncTestCase.waitForSignals(2);
  user.reload().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_reload_userNotFound_error() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        asyncTestCase.signal();
        return goog.Promise.reject(expectedError);
      });
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(3);
  user.reload().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testExtractLinkedAccounts() {
  var resp = {
    'localId': '14584746072031976743',
    'email': 'uid123@fake.com',
    'emailVerified': true,
    'displayName': 'John Doe',
    'providerUserInfo': [
      {
        'email': 'user@gmail.com',
        'providerId': 'google.com',
        'displayName': 'John Doe',
        'photoUrl': 'https://lh5.googleusercontent.com/123456789/photo.jpg',
        'federatedId': 'https://accounts.google.com/123456789',
        'rawId': '123456789'
      },
      {
        'providerId': 'twitter.com',
        'displayName': 'John Doe',
        'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defa' +
            'ult_profile_3_normal.png',
        'federatedId': 'http://twitter.com/987654321',
        'rawId': '987654321'
      }
    ],
    'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'passwordUpdatedAt': 0.0,
    'disabled': false
  };
  var expectedProviders = [
    new fireauth.AuthUserInfo(
        '123456789',
        'google.com',
        'user@gmail.com',
        'John Doe',
        'https://lh5.googleusercontent.com/123456789/photo.jpg'),
    new fireauth.AuthUserInfo(
        '987654321',
        'twitter.com',
        null,
        'John Doe',
        'http://abs.twimg.com/sticky/default_profile_images/default_profile_' +
        '3_normal.png')];
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertObjectEquals(
      expectedProviders,
      user.extractLinkedAccounts_(resp));
}


function testExtractLinkedAccounts_withoutEmail() {
  var resp = {
    'localId': '14584746072031976743',
    'email': '',
    'emailVerified': false,
    'displayName': 'John Doe',
    'providerUserInfo': [
      {
        'providerId': 'twitter.com',
        'displayName': 'John Doe',
        'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defa' +
            'ult_profile_3_normal.png',
        'federatedId': 'http://twitter.com/987654321',
        'rawId': '987654321'
      }
    ],
    'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'passwordUpdatedAt': 0.0,
    'disabled': false
  };
  var expectedProviders = [
    new fireauth.AuthUserInfo(
        '987654321',
        'twitter.com',
        null,
        'John Doe',
        'http://abs.twimg.com/sticky/default_profile_images/default_profile_' +
        '3_normal.png')];
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertObjectEquals(
      expectedProviders,
      user.extractLinkedAccounts_(resp));
}


function testUser_getIdTokenResult() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  asyncTestCase.waitForSignals(1);
  // Test with available token.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'getIdToken',
      function(opt_forceRefresh) {
        return goog.Promise.resolve(idTokenCustomClaims.jwt);
      });
  user.getIdTokenResult().then(function(idTokenResult) {
    fireauth.common.testHelper.assertIdTokenResult(
        idTokenResult,
        idTokenCustomClaims.jwt,
        idTokenCustomClaims.data.exp,
        idTokenCustomClaims.data.auth_time,
        idTokenCustomClaims.data.iat,
        'password',
        null,
        idTokenCustomClaims.data);
    asyncTestCase.signal();
  });
}


function testUser_getIdTokenResult_forceRefresh() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  asyncTestCase.waitForSignals(1);
  // Test with available token.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'getIdToken',
      function(opt_forceRefresh) {
        assertTrue(opt_forceRefresh);
        return goog.Promise.resolve(idTokenCustomClaims.jwt);
      });
  user.getIdTokenResult(true).then(function(idTokenResult) {
    fireauth.common.testHelper.assertIdTokenResult(
        idTokenResult,
        idTokenCustomClaims.jwt,
        idTokenCustomClaims.data.exp,
        idTokenCustomClaims.data.auth_time,
        idTokenCustomClaims.data.iat,
        'password',
        null,
        idTokenCustomClaims.data);
    asyncTestCase.signal();
  });
}


function testUser_getIdTokenResult_error() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  asyncTestCase.waitForSignals(1);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  stubs.replace(
      fireauth.AuthUser.prototype,
      'getIdToken',
      function(opt_forceRefresh) {
        return goog.Promise.reject(expectedError);
      });
  user.getIdTokenResult().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_getIdTokenResult_invalidToken() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  asyncTestCase.waitForSignals(1);
  stubs.replace(
      fireauth.AuthUser.prototype,
      'getIdToken',
      function(opt_forceRefresh) {
        return goog.Promise.resolve('gegege.invalid.ggrgheh');
      });
  user.getIdTokenResult().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
            'An internal error occurred. The token obtained by Firebase '+
            'appears to be malformed. Please retry the operation.'),
        error);
    asyncTestCase.signal();
  });
}


function testUser_getIdTokenResult_expiredToken_reauth() {
  // Test when token is expired and user is reauthenticated.
  // User should be validated after, even though user invalidation event is
  // triggered.
  var validTokenResponse = {
    'idToken': expectedReauthenticateTokenResponse['idToken'],
    'accessToken': expectedReauthenticateTokenResponse['idToken'],
    'refreshToken': expectedReauthenticateTokenResponse['refreshToken']
  };
  var credential = /** @type {!fireauth.AuthCredential} */ ({
    matchIdTokenWithUid: function() {
      stubs.replace(
          fireauth.RpcHandler.prototype,
          'getAccountInfoByIdToken',
          function(idToken) {
            return goog.Promise.resolve(getAccountInfoResponse);
          });
      return goog.Promise.resolve(expectedReauthenticateTokenResponse);
    }
  });
  // Expected token expired error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  // Event trackers.
  var stateChangeCounter = 0;
  var authChangeCounter = 0;
  var userInvalidateCounter = 0;
  accountInfo['uid'] = '679';
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Track token changes.
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        authChangeCounter++;
      });
  // Track user invalidation events.
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidateCounter++;
      });
  // State change should be triggered.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  asyncTestCase.waitForSignals(1);
  // Stub token manager.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Resolve if new refresh token provided.
        if (this.getRefreshToken() == validTokenResponse['refreshToken']) {
          return goog.Promise.resolve(validTokenResponse);
        }
        // Reject otherwise.
        return goog.Promise.reject(expectedError);
      });
  // Confirm expected initial refresh token set on user.
  assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
  // Call getIdToken, it should trigger the expected error and a state change
  // event.
  user.getIdTokenResult().thenCatch(function(error) {
    // Refresh token nullified.
    assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
    // Confirm expected error.
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // No state change.
    assertEquals(0, stateChangeCounter);
    // No Auth change.
    assertEquals(0, authChangeCounter);
    // User invalidated change.
    assertEquals(1, userInvalidateCounter);
    // Call again, it should not trigger another state change or any other
    // event.
    user.getIdTokenResult().thenCatch(function(error) {
      // Resolves with same error.
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      // No additional change.
      assertEquals(0, stateChangeCounter);
      assertEquals(0, authChangeCounter);
      assertEquals(1, userInvalidateCounter);
      // Assume user reauthenticated.
      // This should resolve.
      user.reauthenticateWithCredential(credential)
          .then(function(result) {
            // Set via reauthentication.
            assertEquals(
                validTokenResponse['refreshToken'], user['refreshToken']);
            // Auth token change triggered.
            assertEquals(1, authChangeCounter);
            // State change triggers, after reauthentication.
            assertEquals(1, stateChangeCounter);
            // Shouldn't trigger again.
            assertEquals(1, userInvalidateCounter);
            // This should return cached token set via reauthentication.
            user.getIdTokenResult().then(function(idTokenResult) {
              // Shouldn't trigger again.
              assertEquals(1, authChangeCounter);
              assertEquals(1, stateChangeCounter);
              assertEquals(1, userInvalidateCounter);
              // Refresh token should be updated along with ID token.
              assertEquals(
                  validTokenResponse['refreshToken'], user['refreshToken']);
              fireauth.common.testHelper.assertIdTokenResult(
                  idTokenResult,
                  idTokenGmail.jwt,
                  idTokenGmail.data.exp,
                  idTokenGmail.data.auth_time,
                  idTokenGmail.data.iat,
                  'password',
                  null,
                  idTokenGmail.data);
              asyncTestCase.signal();
           });
      });
    });
  });
}


function testUser_getIdToken() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        asyncTestCase.signal();
      });
  assertNoStateEvents(user);
  assertNoUserInvalidatedEvents(user);
  asyncTestCase.waitForSignals(2);
  // Test with available token.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        return goog.Promise.resolve({
          accessToken: 'accessToken1',
          refreshToken: 'refreshToken1',
          expirationTime: now + 3600 * 1000
        });
      });
  user.getIdToken().then(function(stsAccessToken) {
    assertEquals('accessToken1', stsAccessToken);
    asyncTestCase.signal();
  });
}


function testUser_getIdToken_expiredToken_reauthAfterInvalidation() {
  // Test when token is expired and user is reauthenticated.
  // User should be validated after, even though user invalidation event is
  // triggered.
  var validTokenResponse = {
    'idToken': expectedReauthenticateTokenResponse['idToken'],
    'accessToken': expectedReauthenticateTokenResponse['idToken'],
    'refreshToken': expectedReauthenticateTokenResponse['refreshToken']
  };
  var credential = /** @type {!fireauth.AuthCredential} */ ({
    matchIdTokenWithUid: function() {
      stubs.replace(
          fireauth.RpcHandler.prototype,
          'getAccountInfoByIdToken',
          function(idToken) {
            return goog.Promise.resolve(getAccountInfoResponse);
          });
      return goog.Promise.resolve(expectedReauthenticateTokenResponse);
    }
  });
  // Expected token expired error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  // Event trackers.
  var stateChangeCounter = 0;
  var authChangeCounter = 0;
  var userInvalidateCounter = 0;
  accountInfo['uid'] = '679';
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Track token changes.
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        authChangeCounter++;
      });
  // Track user invalidation events.
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidateCounter++;
      });
  // State change should be triggered.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  asyncTestCase.waitForSignals(1);
  // Stub token manager.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Resolve if new refresh token provided.
        if (this.getRefreshToken() == validTokenResponse['refreshToken']) {
          return goog.Promise.resolve(validTokenResponse);
        }
        // Reject otherwise.
        return goog.Promise.reject(expectedError);
      });
  // Confirm expected initial refresh token set on user.
  assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
  // Call getIdToken, it should trigger the expected error and a state change
  // event.
  user.getIdToken().thenCatch(function(error) {
    // Refresh token nullified.
    assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
    // Confirm expected error.
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // No state change.
    assertEquals(0, stateChangeCounter);
    // No Auth change.
    assertEquals(0, authChangeCounter);
    // User invalidated change.
    assertEquals(1, userInvalidateCounter);
    // Call again, it should not trigger another state change or any other
    // event.
    user.getIdToken().thenCatch(function(error) {
      // Resolves with same error.
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      // No additional change.
      assertEquals(0, stateChangeCounter);
      assertEquals(0, authChangeCounter);
      assertEquals(1, userInvalidateCounter);
      // Assume user reauthenticated.
      // This should resolve.
      user.reauthenticateWithCredential(credential)
          .then(function(result) {
            // Set via reauthentication.
            assertEquals(
                validTokenResponse['refreshToken'], user['refreshToken']);
            // Auth token change triggered.
            assertEquals(1, authChangeCounter);
            // State change triggers, after reauthentication.
            assertEquals(1, stateChangeCounter);
            // Shouldn't trigger again.
            assertEquals(1, userInvalidateCounter);
            // This should return cached token set via reauthentication.
            user.getIdToken().then(function(idToken) {
              // Shouldn't trigger again.
              assertEquals(1, authChangeCounter);
              assertEquals(1, stateChangeCounter);
              assertEquals(1, userInvalidateCounter);
              // Refresh token should be updated along with ID token.
              assertEquals(
                  validTokenResponse['refreshToken'], user['refreshToken']);
              assertEquals(idTokenGmail.jwt, idToken);
              asyncTestCase.signal();
           });
      });
    });
  });
}


function testUser_getIdToken_expiredToken_reauthWithPopupAfterInvalidation() {
  // Test when token is expired and user is reauthenticated with popup.
  // User should be validated after, even though user invalidation event is
  // triggered.
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  var validTokenResponse = {
    'idToken': expectedReauthenticateTokenResponse['idToken'],
    'accessToken': expectedReauthenticateTokenResponse['idToken'],
    'refreshToken': expectedReauthenticateTokenResponse['refreshToken']
  };
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Simulate Auth email credential error thrown by verifyAssertionForExisting.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'http://www.example.com/#response',
          'sessionId': 'SESSION_ID',
          'postBody': null,
          'tenantId': null
        },
        data);
        return goog.Promise.resolve(expectedReauthenticateTokenResponse);
      });
  // Expected token expired error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  // Event trackers.
  var stateChangeCounter = 0;
  var authChangeCounter = 0;
  var userInvalidateCounter = 0;
  // Match the token UID.
  accountInfo['uid'] = '679';
  user = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Track token changes.
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        authChangeCounter++;
      });
  // Track user invalidation events.
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidateCounter++;
      });
  // State change should be triggered.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  asyncTestCase.waitForSignals(1);
  // Stub token manager.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Resolve if new refresh token provided.
        if (this.getRefreshToken() == validTokenResponse['refreshToken']) {
          return goog.Promise.resolve(validTokenResponse);
        }
        // Reject otherwise.
        return goog.Promise.reject(expectedError);
      });
  // Confirm expected initial refresh token set on user.
  assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
  var provider = new fireauth.GoogleAuthProvider();
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user.enablePopupRedirect();
  // Confirm expected initial refresh token set on user.
  assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
  // Call getIdToken, it should trigger the expected error and a state change
  // event.
  user.getIdToken().thenCatch(function(error) {
    // Refresh token remains the same.
    assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
    // Confirm expected error.
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // No state change.
    assertEquals(0, stateChangeCounter);
    // No Auth change.
    assertEquals(0, authChangeCounter);
    // User invalidated change.
    assertEquals(1, userInvalidateCounter);
    // Call again, it should not trigger another state change or any other
    // event.
    user.getIdToken().thenCatch(function(error) {
      // Resolves with same error.
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      // No additional change.
      assertEquals(0, stateChangeCounter);
      assertEquals(0, authChangeCounter);
      assertEquals(1, userInvalidateCounter);
      // Assume user reauthenticated.
      // This should resolve.
      user.reauthenticateWithPopup(provider).then(function(result) {
        // Set via reauthentication.
        assertEquals(validTokenResponse['refreshToken'], user['refreshToken']);
        // Auth token change triggered.
        assertEquals(1, authChangeCounter);
        // State change triggers, after reauthentication.
        assertEquals(1, stateChangeCounter);
        // Shouldn't trigger again.
        assertEquals(1, userInvalidateCounter);
        // This should return cached token set via reauthentication.
        user.getIdToken().then(function(idToken) {
          // Shouldn't trigger again.
          assertEquals(1, authChangeCounter);
          assertEquals(1, stateChangeCounter);
          assertEquals(1, userInvalidateCounter);
          // Refresh token should be updated along with ID token.
          assertEquals(
              validTokenResponse['refreshToken'], user['refreshToken']);
          assertEquals(idTokenGmail.jwt, idToken);
          asyncTestCase.signal();
        });
      });
    });
  });
}


function testUser_getIdToken_expiredToken_reauthBeforeInvalidation() {
  // Test when token is expired and user is reauthenticated before invalidation
  // is detected.
  var validTokenResponse = {
    'idToken': expectedReauthenticateTokenResponse['idToken'],
    'accessToken': expectedReauthenticateTokenResponse['idToken'],
    'refreshToken': expectedReauthenticateTokenResponse['refreshToken']
  };
  var credential = /** @type {!fireauth.AuthCredential} */ ({
    matchIdTokenWithUid: function() {
      stubs.replace(
          fireauth.RpcHandler.prototype,
          'getAccountInfoByIdToken',
          function(idToken) {
            return goog.Promise.resolve(getAccountInfoResponse);
          });
      return goog.Promise.resolve(expectedReauthenticateTokenResponse);
    }
  });
  // Expected token expired error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  // Event trackers.
  var stateChangeCounter = 0;
  var authChangeCounter = 0;
  var userInvalidateCounter = 0;
  // Match token UID.
  accountInfo['uid'] = '679';
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Track token changes.
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        authChangeCounter++;
      });
  // Track user invalidation events.
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidateCounter++;
      });
  // State change should be triggered.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  asyncTestCase.waitForSignals(1);
  // Stub token manager.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Resolve if new refresh token provided.
        if (this.getRefreshToken() == validTokenResponse['refreshToken']) {
          return goog.Promise.resolve(validTokenResponse);
        }
        // Reject otherwise.
        return goog.Promise.reject(expectedError);
      });
  // Confirm expected initial refresh token set on user.
  assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
  // Call reauthenticate, this should succeed and not trigger user invalidation
  // event.
  user.reauthenticateWithCredential(credential)
      .then(function(result) {
        // Set via reauthentication.
        assertEquals(validTokenResponse['refreshToken'], user['refreshToken']);
        // Auth token change triggered.
        assertEquals(1, authChangeCounter);
        // State change triggered.
        assertEquals(1, stateChangeCounter);
        // Externally user should not be invalidated.
        assertEquals(0, userInvalidateCounter);
        // This should return cached token set via reauthentication.
        user.getIdToken().then(function(idToken) {
          // No additional listeners should retrigger.
          assertEquals(1, authChangeCounter);
          assertEquals(1, stateChangeCounter);
          assertEquals(0, userInvalidateCounter);
          // Refresh token should be updated along with ID token.
          assertEquals(
              validTokenResponse['refreshToken'], user['refreshToken']);
          assertEquals(idTokenGmail.jwt, idToken);
          asyncTestCase.signal();
        });
      });
}


function testUser_getIdToken_expiredToken_reauthWithPopupBeforeInvalidation() {
  // Test when token is expired and user is reauthenticated with popup before
  // invalidation is detected.
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  var validTokenResponse = {
    'idToken': expectedReauthenticateTokenResponse['idToken'],
    'accessToken': expectedReauthenticateTokenResponse['idToken'],
    'refreshToken': expectedReauthenticateTokenResponse['refreshToken']
  };
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Simulate verifyAssertionForExisting returns a token with the same UID.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'http://www.example.com/#response',
          'sessionId': 'SESSION_ID',
          'postBody': null,
          'tenantId': null
        },
        data);
        return goog.Promise.resolve(expectedReauthenticateTokenResponse);
      });
  // Expected token expired error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  // Event trackers.
  var stateChangeCounter = 0;
  var authChangeCounter = 0;
  var userInvalidateCounter = 0;
  accountInfo['uid'] = '679';
  user = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Track token changes.
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        authChangeCounter++;
      });
  // Track user invalidation events.
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidateCounter++;
      });
  // State change should be triggered.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  asyncTestCase.waitForSignals(1);
  // Stub token manager.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Resolve if new refresh token provided.
        if (this.getRefreshToken() == validTokenResponse['refreshToken']) {
          return goog.Promise.resolve(validTokenResponse);
        }
        // Reject otherwise.
        return goog.Promise.reject(expectedError);
      });
  // Confirm expected initial refresh token set on user.
  assertEquals(tokenResponse['refreshToken'], user['refreshToken']);
  var provider = new fireauth.GoogleAuthProvider();
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user.enablePopupRedirect();
  // Call reauthenticate, this should succeed and not trigger user invalidation
  // event.
  user.reauthenticateWithPopup(provider).then(function(result) {
    // Set via reauthentication.
    assertEquals(validTokenResponse['refreshToken'], user['refreshToken']);
    // Auth token change triggered.
    assertEquals(1, authChangeCounter);
    // State change triggered.
    assertEquals(1, stateChangeCounter);
    // Externally user should not be invalidated.
    assertEquals(0, userInvalidateCounter);
    // This should return cached token set via reauthentication.
    user.getIdToken().then(function(idToken) {
      // No additional listeners should retrigger.
      assertEquals(1, authChangeCounter);
      assertEquals(1, stateChangeCounter);
      assertEquals(0, userInvalidateCounter);
      // Refresh token should be updated along with ID token.
      assertEquals(validTokenResponse['refreshToken'], user['refreshToken']);
      assertEquals(idTokenGmail.jwt, idToken);
      asyncTestCase.signal();
    });
  });
}


function testUser_getIdToken_otherError() {
  // Test when any error other than expired token is returned that no state
  // change or token change is triggered.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // No token change.
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  // No state change.
  assertNoStateEvents(user);
  asyncTestCase.waitForSignals(1);
  // Test with some unexpected error.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        return goog.Promise.reject(expectedError);
      });
  user.getIdToken().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_getIdToken_tokenManagerReturnsNull() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  asyncTestCase.waitForSignals(1);
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        return goog.Promise.resolve(null);
      });
  user.getIdToken().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR), error);
    asyncTestCase.signal();
  });
}



function testUser_getIdToken_unchanged() {
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  assertNoStateEvents(user);
  asyncTestCase.waitForSignals(1);
  // Test with available token.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Token unchanged.
        return goog.Promise.resolve({
          accessToken: jwt,
          refreshToken: 'refreshToken'
        });
      });
  user.getIdToken().then(function(stsAccessToken) {
    // Token unchanged.
    assertEquals(jwt, stsAccessToken);
    asyncTestCase.signal();
  });
}


function testUser_refreshToken() {
  asyncTestCase.waitForSignals(1);
  var refreshToken = 'myRefreshToken';
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  assertEquals('refreshToken', user['refreshToken']);
  // Test available token with refresh token to expected one above.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        this.setRefreshToken(refreshToken);
        this.setAccessToken('accessToken1', now + 3600 * 1000);
        return goog.Promise.resolve({
          accessToken: 'accessToken1',
          refreshToken: refreshToken,
          expirationTime: now + 3600 * 1000
        });
      });
  user.getIdToken().then(function(stsAccessToken) {
    assertEquals('accessToken1', stsAccessToken);
    assertEquals(refreshToken, user['refreshToken']);
    asyncTestCase.signal();
  });
}


function testUpdateTokensIfPresent_newTokens() {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoUserInvalidatedEvents(user);
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        // Checks the tokens stored.
        user.getIdToken().then(function(idToken) {
          assertEquals(newJwt, idToken);
          assertEquals(newJwt, user.lastAccessToken_);
          asyncTestCase.signal();
        });
      });

  user.updateTokensIfPresent({
    'idToken': newJwt,
    'refreshToken': 'newRefreshToken'
  });
}


function testUpdateTokensIfPresent_identicalTokens() {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);

  user.updateTokensIfPresent(tokenResponse);
  user.getIdToken().then(function(idToken) {
    assertEquals(tokenResponse['idToken'], idToken);
    asyncTestCase.signal();
  });
}


function testUpdateTokensIfPresent_noTokens() {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);

  user.updateTokensIfPresent({
    'email': 'user@default.com'
  });
  user.getIdToken().then(function(idToken) {
    assertEquals(tokenResponse['idToken'], idToken);
    asyncTestCase.signal();
  });
}


function testUpdateProperty() {
  user = new fireauth.AuthUser(config1, tokenResponse, {'uid': 'userId1'});
  user.updateProperty('uid', '12345678');
  assertEquals(user['uid'], '12345678');
  user.updateProperty('uid', null);
  assertEquals(user['uid'], '12345678');
  user.updateProperty('displayName', 'Jack Smith');
  assertEquals(user['displayName'], 'Jack Smith');
  user.updateProperty('photoURL', 'http://www.example.com/photo/photo.png');
  assertEquals(user['photoURL'], 'http://www.example.com/photo/photo.png');
  user.updateProperty('email', 'user@example.com');
  assertEquals(user['email'], 'user@example.com');
  user.updateProperty('isAnonymous', true);
  assertEquals(true, user['isAnonymous']);
  user.updateProperty('invalid', 'something');
  assertUndefined(user['invalid']);
}


function testUpdateEmail_success() {
  asyncTestCase.waitForSignals(2);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addStateChangeListener(function(userTemp) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });

  // Simulates successful rpcHandler updateEmail.
  var expectedResponse = {
    'email': 'newuser@example.com'
  };
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateEmail',
      function(idToken, newEmail) {
        assertEquals(jwt, idToken);
        assertEquals('newuser@example.com', newEmail);
        return goog.Promise.resolve(expectedResponse);
      });
  // Simulates the update by the server of the email and emailVerified
  // properties.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        assertEquals(jwt, idToken);
        return goog.Promise.resolve({
          'users': [{
            'email': 'newuser@example.com',
            'emailVerified': false
          }]
        });
      });

  user.updateEmail('newuser@example.com').then(function() {
    assertEquals('newuser@example.com', user['email']);
    assertFalse(user['emailVerified']);
    asyncTestCase.signal();
  });
}


function testUpdateEmail_error() {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);

  // Simulates rpcHandler updateEmail error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_SIGNED_OUT);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateEmail',
      function(idToken, newEmail) {
        assertEquals(jwt, idToken);
        assertEquals('newuser@example.com', newEmail);
        return goog.Promise.reject(expectedError);
      });
  // User should not be reloaded.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        fail('The user should not be reloaded!');
      });

  user.updateEmail('newuser@example.com').then(fail, function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // No update.
    assertEquals('user@default.com', user['email']);
    assertTrue(user['emailVerified']);
    asyncTestCase.signal();
  });
}


function testUpdateEmail_userDestroyed() {
  assertFailsWhenUserIsDestroyed('updateEmail', ['newuser@example.com']);
}


function testUpdatePhoneNumber_success() {
  var expectedResponse = {
   'idToken': newJwt,
   'refreshToken': 'myRefreshToken',
   'localId': 'myLocalId',
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var phoneAuthCredential = mockControl.createStrictMock(
      fireauth.PhoneAuthCredential);
  phoneAuthCredential.linkToIdToken(ignoreArgument, tokenResponse['idToken'])
      .$once()
      .$returns(goog.Promise.resolve(expectedResponse));

  var getAccountInfoResponse = {
    'users': [{
      'localId': 'defaultUserId',
      'displayName': 'defaultDisplayName',
      'phoneNumber': '+16505550101',
      'providerUserInfo': [{
        'providerId': 'phone',
        'rawId': '+16505550101',
        'phoneNumber': '+16505550101'
      }],
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  // New STS token should be used.
  getAccountInfoByIdToken(newJwt).$returns(
      goog.Promise.resolve(getAccountInfoResponse)).$once();

  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.updatePhoneNumber(phoneAuthCredential)
      .then(function() {
        // User properties should be updated.
        assertEquals('+16505550101', user['phoneNumber']);
        assertEquals(1, user['providerData'].length);
        assertObjectEquals({
          'uid': '+16505550101',
          'displayName': null,
          'photoURL': null,
          'email': null,
          'phoneNumber': '+16505550101',
          'providerId': 'phone'
        }, user['providerData'][0]);
        asyncTestCase.signal();
      });
}


function testUpdatePhoneNumber_error() {
  asyncTestCase.waitForSignals(1);

  // Simulates error from backend.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var credential = fireauth.PhoneAuthProvider.credential('id', 'code');
  stubs.replace(credential, 'linkToIdToken', function(rpcHandler, idToken) {
    assertEquals(jwt, idToken);
    return goog.Promise.reject(expectedError);
  });

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.updatePhoneNumber(credential).then(fail, function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUpdatePhoneNumber_userDestroyed() {
  var credential = fireauth.PhoneAuthProvider.credential('id', 'code');
  assertFailsWhenUserIsDestroyed('updatePhoneNumber', [credential]);
}


function testUser_sessionInvalidation_updatePhoneNumber_tokenExpired() {
  // Test user invalidation with token expired error on
  // user.updatePhoneNumber.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'updatePhoneNumber',
      [
        fireauth.PhoneAuthProvider.credential('foo', 'bar')
      ],
      invalidationError);
}


function testUser_sessionInvalidation_reload_userDisabled() {
  // Test user invalidation with user disabled error on user.updatePhoneNumber.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation('updatePhoneNumber',
      [fireauth.PhoneAuthProvider.credential('foo', 'bar')],
      invalidationError);
}


function testUpdatePassword_success() {
  asyncTestCase.waitForSignals(2);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addStateChangeListener(function(userTemp) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });

  // Simulates successful rpcHandler updatePassword.
  var expectedResponse = {
    'email': 'newuser@example.com'
  };
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updatePassword',
      function(idToken, newPassword) {
        assertEquals(jwt, idToken);
        assertEquals('newPassword', newPassword);
        return goog.Promise.resolve(expectedResponse);
      });
  // Simulates the reload.
  var reloaded = 0;
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        reloaded++;
        assertEquals(jwt, idToken);
        return goog.Promise.resolve({
          'users': [{
            'email': 'newuser@example.com'
          }]
        });
      });

  user.updatePassword('newPassword').then(function() {
    assertEquals(1, reloaded);
    asyncTestCase.signal();
  });
}


function testUpdatePassword_error() {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);

  // Simulates rpcHandler updatePassword error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updatePassword',
      function(idToken, newPassword) {
        assertEquals(jwt, idToken);
        assertEquals('newPassword', newPassword);
        return goog.Promise.reject(expectedError);
      });

  user.updatePassword('newPassword').then(fail, function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUpdatePassword_userDestroyed() {
  assertFailsWhenUserIsDestroyed('updatePassword', ['newPassword']);
}


function testUpdateProfile_success() {
  asyncTestCase.waitForSignals(2);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addStateChangeListener(function(userTemp) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });

  var expectedResponse = {
    'email': 'uid123@fake.com',
    'displayName': 'Jack Smith',
    'photoUrl': 'http://www.example.com/photo/photo.png'
  };
  // Ignore reload for this test.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  // Simulates updateProfile.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateProfile',
      function(idToken, profileData) {
        assertEquals(jwt, idToken);
        assertObjectEquals({
          'displayName': 'Jack Smith',
          'photoUrl': 'http://www.example.com/photo/photo.png'
        }, profileData);
        return goog.Promise.resolve(expectedResponse);
      });
  // Records calls to updateTokensIfPresent.
  stubs.replace(
      user,
      'updateTokensIfPresent',
      goog.testing.recordFunction());

  user.updateProfile({
    'displayName': 'Jack Smith',
    'photoURL': 'http://www.example.com/photo/photo.png'
  }).then(function() {
    assertEquals('Jack Smith', user['displayName']);
    assertEquals('http://www.example.com/photo/photo.png', user['photoURL']);
    assertEquals(1, user.updateTokensIfPresent.getCallCount());
    assertEquals(
        expectedResponse,
        user.updateTokensIfPresent.getLastCall().getArgument(0));
    asyncTestCase.signal();
  });
}


function testUpdateProfile_success_withPasswordProvider() {
  asyncTestCase.waitForSignals(1);
  var expectedDisplayName = 'Test User';
  var expectedPhotoUrl = 'http://www.example.com/photo/photo.png';
  var expectedResponse = {
    'displayName': expectedDisplayName,
    'photoUrl': expectedPhotoUrl
  };
  // Mocks updateProfile.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateProfile',
      function(idToken, profileData) {
        assertEquals(jwt, idToken);
        assertObjectEquals({
          'displayName': expectedDisplayName,
          'photoUrl': expectedPhotoUrl
        }, profileData);
        return goog.Promise.resolve(expectedResponse);
      });
  var providerData1 = new fireauth.AuthUserInfo(
      'UID1',
      'google.com',
      'uid1@example.com',
      null,
      null);
  var providerData2 = new fireauth.AuthUserInfo(
      'UID2',
      'password',
      'uid2@example.com',
      null,
      null);
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);
  user.updateProfile({
    'displayName': expectedDisplayName,
    'photoURL': expectedPhotoUrl
  }).then(function() {
    // Confirm top level changes.
    assertEquals(user['displayName'], expectedDisplayName);
    assertEquals(user['photoURL'], expectedPhotoUrl);
    // Confirm update on password provider display name and photo URL.
    assertEquals(2, user['providerData'].length);
    assertObjectEquals(
        user['providerData'][0],
        {
          'uid': 'UID1',
          'displayName': null,
          'photoURL': null,
          'email': 'uid1@example.com',
          'providerId': 'google.com',
          'phoneNumber': null
        });
    assertObjectEquals(
        user['providerData'][1],
        {
          'uid': 'UID2',
          'displayName': expectedDisplayName,
          'photoURL': expectedPhotoUrl,
          'email': 'uid2@example.com',
          'providerId': 'password',
          'phoneNumber': null
        });
    asyncTestCase.signal();
  });
}


function testUpdateProfile_success_withoutPasswordProvider() {
  asyncTestCase.waitForSignals(1);
  var expectedDisplayName = 'Test User';
  var expectedPhotoUrl = 'http://www.example.com/photo/photo.png';
  var expectedResponse = {
    'displayName': expectedDisplayName,
    'photoUrl': expectedPhotoUrl
  };
  // Mocks updateProfile.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateProfile',
      function(idToken, profileData) {
        assertEquals(jwt, idToken);
        assertObjectEquals({
          'displayName': expectedDisplayName,
          'photoUrl': expectedPhotoUrl
        }, profileData);
        return goog.Promise.resolve(expectedResponse);
      });
  var providerData1 = new fireauth.AuthUserInfo(
      'UID1',
      'google.com',
      'uid1@example.com',
      null,
      null);
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);
  user.updateProfile({
    'displayName': expectedDisplayName,
    'photoURL': expectedPhotoUrl
  }).then(function() {
    // Confirm top level changes.
    assertEquals(user['displayName'], expectedDisplayName);
    assertEquals(user['photoURL'], expectedPhotoUrl);
    // Confirm no changes on providerData array as no password provider is
    // found.
    assertEquals(1, user['providerData'].length);
    assertObjectEquals(
        user['providerData'][0],
        {
          'uid': 'UID1',
          'displayName': null,
          'photoURL': null,
          'email': 'uid1@example.com',
          'providerId': 'google.com',
          'phoneNumber': null
        });
    asyncTestCase.signal();
  });
}


function testUpdateProfile_emptyChange() {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  // Ensures updateProfile isn't called.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateProfile',
      function(idToken, profileData) {
        fail('updateProfile should not be called!');
      });

  user.updateProfile({
    'wrongKey': 'whatever'
  }).then(function() {
    asyncTestCase.signal();
  });
}


function testUpdateProfile_error() {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);

  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  // Simulates updateProfile.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateProfile',
      function(idToken, profileData) {
        assertEquals(jwt, idToken);
        assertObjectEquals({
          'displayName': 'Jack Smith',
          'photoUrl': 'http://www.example.com/photo/photo.png'
        }, profileData);
        return goog.Promise.reject(expectedError);
      });

  user.updateProfile({
    'displayName': 'Jack Smith',
    'photoURL': 'http://www.example.com/photo/photo.png'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    assertEquals(accountInfo['displayName'], user['displayName']);
    assertEquals(accountInfo['photoURL'], user['photoURL']);
    asyncTestCase.signal();
  });
}


function testUpdateProfile_userDestroyed() {
  assertFailsWhenUserIsDestroyed('updateProfile', [{
    'displayName': 'Jack Smith',
    'photoURL': 'http://www.example.com/photo/photo.png'
  }]);
}


function testReauthenticateAndRetrieveDataWithCredential_success() {
  // Test that reauthenticateAndRetrieveDataWithCredential calls
  // reauthenticateWithCredential underneath.
  // Record deprecation warning calls.
  stubs.replace(
      fireauth.deprecation,
      'log',
      goog.testing.recordFunction());
  // Stub reauthenticateWithCredential.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reauthenticateWithCredential',
      function(cred) {
        assertEquals(expectedGoogleCredential, cred);
        return goog.Promise.resolve(expectedResponse);
      });
  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Expected response. Only the user will be returned.
  var expectedResponse = {
    'user': user,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  // reauthenticateAndRetrieveDataWithCredential using Google OAuth credential.
  user.reauthenticateAndRetrieveDataWithCredential(expectedGoogleCredential)
      .then(function(result) {
        // Confirm expected response returned.
        assertEquals(expectedResponse, result);
        asyncTestCase.signal();
      });
  // Confirm warning shown.
  /** @suppress {missingRequire} */
  assertEquals(1, fireauth.deprecation.log.getCallCount());
  /** @suppress {missingRequire} */
  assertEquals(
      fireauth.deprecation.Deprecations.REAUTH_WITH_CREDENTIAL,
      fireauth.deprecation.log.getLastCall().getArgument(0));
}


function testReauthenticateAndRetrieveDataWithCredential_error() {
  // Test that reauthenticateAndRetrieveDataWithCredential calls
  // reauthenticateWithCredential underneath and funnels any
  // underlying error thrown.
  // Record deprecation warning calls.
  stubs.replace(
      fireauth.deprecation,
      'log',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reauthenticateWithCredential',
      function(cred) {
        assertEquals(expectedGoogleCredential, cred);
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(1);
  // Expected error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // reauthenticateAndRetrieveDataWithCredential using Google OAuth credential.
  user.reauthenticateAndRetrieveDataWithCredential(expectedGoogleCredential)
      .thenCatch(function(error) {
        // Confirm expected error.
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  // Confirm warning shown.
  /** @suppress {missingRequire} */
  assertEquals(1, fireauth.deprecation.log.getCallCount());
  /** @suppress {missingRequire} */
  assertEquals(
      fireauth.deprecation.Deprecations.REAUTH_WITH_CREDENTIAL,
      fireauth.deprecation.log.getLastCall().getArgument(0));
}


function testReauthenticateWithCredential() {
  var credential = /** @type {!fireauth.AuthCredential} */ ({
    matchIdTokenWithUid: function() {
      return goog.Promise.resolve(expectedReauthenticateTokenResponse);
    }
  });
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        assertEquals(idTokenGmail.jwt, idToken);
        return goog.Promise.resolve({
          'users': [{
            'localId': '679'
          }]
        });
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '679'
  });
  user.addStateChangeListener(function(userTemp) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        asyncTestCase.signal();
      });
  assertNoUserInvalidatedEvents(user);
  user.reauthenticateWithCredential(credential)
      .then(function(result) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            user,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            // operationType not implemented yet.
            fireauth.constants.OperationType.REAUTHENTICATE,
            result);

        assertEquals('679', user['uid']);
        return user.getIdToken();
      })
      .then(function(idToken) {
        assertEquals(idTokenGmail.jwt, idToken);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(3);
}


function testReauthenticateWithCredential_userMismatch() {
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH);
  var credential = /** @type {!fireauth.AuthCredential} */ ({
    matchIdTokenWithUid: function() {
      return goog.Promise.reject(expectedError);
    }
  });
  var user = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '679'
  });
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.reauthenticateWithCredential(credential)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testReauthenticateWithCredential_fail() {
  var error = new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var credential = /** @type {!fireauth.AuthCredential} */ ({
    matchIdTokenWithUid: function() {
      return goog.Promise.reject(error);
    }
  });
  var user = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '679'
  });
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.reauthenticateWithCredential(credential)
      .thenCatch(function(actualError) {
        fireauth.common.testHelper.assertErrorEquals(error, actualError);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testLinkAndRetrieveDataWithCredential_success() {
  // Test that linkAndRetrieveDataWithCredential calls linkWithCredential
  // underneath.
  // Record deprecation warning calls.
  stubs.replace(
      fireauth.deprecation,
      'log',
      goog.testing.recordFunction());
  // Stub linkAndRetrieveDataWithCredential and confirm same response is used
  // for linkWithCredential with only the user returned.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'linkWithCredential',
      function(cred) {
        assertEquals(expectedGoogleCredential, cred);
        return goog.Promise.resolve(expectedResponse);
      });
  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Expected response. Only the user will be returned.
  var expectedResponse = {
    'user': user,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  // linkAndRetrieveDataWithCredential using Google OAuth credential.
  user.linkAndRetrieveDataWithCredential(expectedGoogleCredential)
      .then(function(result) {
        // Confirm expected response returned.
        assertEquals(expectedResponse, result);
        asyncTestCase.signal();
      });
  // Confirm warning shown.
  /** @suppress {missingRequire} */
  assertEquals(1, fireauth.deprecation.log.getCallCount());
  /** @suppress {missingRequire} */
  assertEquals(
      fireauth.deprecation.Deprecations.LINK_WITH_CREDENTIAL,
      fireauth.deprecation.log.getLastCall().getArgument(0));
}


function testLinkAndRetrieveDataWithCredential_error() {
  // Test that linkAndRetrieveDataWithCredential calls linkWithCredential
  // underneath and funnels any underlying error thrown.
  // Record deprecation warning calls.
  stubs.replace(
      fireauth.deprecation,
      'log',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.AuthUser.prototype,
      'linkWithCredential',
      function(cred) {
        assertEquals(expectedGoogleCredential, cred);
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(1);
  // Expected error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // linkAndRetrieveDataWithCredential using Google OAuth credential.
  user.linkAndRetrieveDataWithCredential(expectedGoogleCredential)
      .thenCatch(function(error) {
        // Confirm expected error.
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  // Confirm warning shown.
  /** @suppress {missingRequire} */
  assertEquals(1, fireauth.deprecation.log.getCallCount());
  /** @suppress {missingRequire} */
  assertEquals(
      fireauth.deprecation.Deprecations.LINK_WITH_CREDENTIAL,
      fireauth.deprecation.log.getLastCall().getArgument(0));
}


function testLinkWithCredential_emailAndPassword() {
  var email = 'me@foo.com';
  var password = 'myPassword';
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateEmailAndPassword',
      function(actualIdToken, actualEmail, actualPassword) {
        asyncTestCase.signal();
        assertEquals(jwt, actualIdToken);
        assertEquals(email, actualEmail);
        assertEquals(password, actualPassword);
        // No credential or additional user info returned when linking an email
        // and password credential.
        return goog.Promise.resolve({
          'email': email,
          'idToken': newJwt,
          'refreshToken': 'newRefreshToken'
        });
      });

  // The updated information from the backend after linking.
  var updatedUserResponse = {
    'users': [{
      'localId': 'defaultUserId',
      'email': email,
      'emailVerified': false,
      'providerUserInfo': [],
      'photoUrl': '',
      'passwordHash': 'myPasswordHash',
      'passwordUpdatedAt': now,
      'disabled': false
    }]
  };
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return goog.Promise.resolve(updatedUserResponse);
      });

  var user = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': 'defaultUserId',
    'isAnonymous': true
  });
  user.addStateChangeListener(function(userTemp) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        asyncTestCase.signal();
      });
  assertNoUserInvalidatedEvents(user);
  var credential = fireauth.EmailAuthProvider.credential(email,
      password);
  user.linkWithCredential(credential)
      .then(function(result) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            user,
            // Expected null credential returned.
            null,
            // Expected null additional user info.
            null,
            // operationType not implemented yet.
            fireauth.constants.OperationType.LINK,
            result);

        // Email should be updated.
        assertEquals(email, user['email']);

        // Should not be anonymous
        assertFalse(user['isAnonymous']);

        // Tokens should be updated.
        assertEquals('newRefreshToken', user['refreshToken']);
        return user.getIdToken();
      })
      .then(function(returnedToken) {
        assertEquals(newJwt, returnedToken);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(4);
}


function testLinkWithCredential_federatedIdP() {
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(request) {
        asyncTestCase.signal();
        assertEquals(
            'id_token=googleIdToken&access_token=googleAccessToken&' +
            'providerId=google.com',
            request['postBody']);
        assertEquals(jwt, request['idToken']);

        // Update the backend user data.
        getAccountInfoResponse['users'][0]['providerUserInfo']
            .push(getAccountInfoResponseGoogleProviderData);
        // Return token response with credential and additional IdP data.
        return goog.Promise.resolve(expectedTokenResponseWithIdPData);
      });

  var user = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': 'defaultUserId'
  });
  user.addStateChangeListener(function(userTemp) {
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        asyncTestCase.signal();
      });
  assertNoUserInvalidatedEvents(user);
  user.linkWithCredential(expectedGoogleCredential)
      .then(function(result) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            user,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            // operationType not implemented yet.
            fireauth.constants.OperationType.LINK,
            result);

        // Should have Google as a provider.
        assertEquals('google.com', user['providerData'][0]['providerId']);

        // Tokens should be updated.
        assertEquals('newRefreshToken', user['refreshToken']);
        return user.getIdToken();
      })
      .then(function(returnedToken) {
        assertEquals(newJwt, returnedToken);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(4);
}


function testLinkWithCredential_alreadyLinked() {
  // User on server has the federated provider linked already.
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponseGoogleProviderData);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  var error = new fireauth.AuthError(
      fireauth.authenum.Error.PROVIDER_ALREADY_LINKED);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(request) {
        fail('verifyAssertionForLinking RPC should not be called.');
      });

  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  var credential = fireauth.GoogleAuthProvider.credential(null,
      'googleAccessToken');
  user.linkWithCredential(credential)
      .thenCatch(function(actualError) {
        fireauth.common.testHelper.assertErrorEquals(error, actualError);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testLinkWithCredential_fail() {
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  var error = new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(request) {
        return goog.Promise.reject(error);
      });

  var user = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': 'defaultUserId'
  });
  var credential = fireauth.GoogleAuthProvider.credential({
    'idToken': 'googleIdToken'
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.linkWithCredential(credential)
      .thenCatch(function(actualError) {
        fireauth.common.testHelper.assertErrorEquals(error, actualError);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testUnlink_success() {
  // User on server has two federated providers and one phone provider linked.
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponseProviderData1);
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponseProviderData2);
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponsePhoneAuthProviderData);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // Simulate update linked account.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'deleteLinkedAccounts',
      function(idToken, providersToDelete) {
        assertEquals(jwt, idToken);
        // providerId2 should be removed from user's original providers.
        assertArrayEquals(providersToDelete, ['providerId2']);
        var response = {
          'email': 'user@default.com',
          'providerUserInfo': [
            {'providerId': 'providerId1'},
            {'providerId': 'phone'}
          ]
        };
        return goog.Promise.resolve(response);
      });
  var user = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithPhone);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);
  user.addProviderData(providerDataPhone);

  var userWithoutProvider2 = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithPhone);
  userWithoutProvider2.addProviderData(providerData1);
  userWithoutProvider2.addProviderData(providerDataPhone);

  user.addStateChangeListener(function(event) {
    asyncTestCase.signal();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);

  user.unlink('providerId2')
      .then(function(passedUser) {
        // Update user in Auth state.
        assertObjectEquals(userWithoutProvider2.toPlainObject(),
            user.toPlainObject());
        // Should be same instance.
        assertEquals(user, passedUser);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(2);
}


function testUnlink_alreadyDeleted() {
  // User on server has only one federated provider linked despite the local
  // copy having two.
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponseProviderData1);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  stubs.replace(
      fireauth.RpcHandler.prototype,
      'deleteLinkedAccounts',
      function(idToken, providersToDelete) {
        fail('deleteLinkedAccounts RPC should not be called when the linked ' +
            'account is already deleted.');
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);
  user.addProviderData(providerData2);

  var userWithoutProvider2 = new fireauth.AuthUser(config1, tokenResponse,
      accountInfo);
  userWithoutProvider2.addProviderData(providerData1);

  user.addStateChangeListener(function(event) {
    asyncTestCase.signal();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);

  user.unlink('providerId2')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.NO_SUCH_PROVIDER),
            error);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(2);
}


function testUnlink_failure() {
  var error = new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);

  // User on server has one federated provider linked.
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponseProviderData1);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  stubs.replace(
      fireauth.RpcHandler.prototype,
      'deleteLinkedAccounts',
      function(idToken, providersToDelete) {
        return goog.Promise.reject(error);
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.addProviderData(providerData1);

  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);

  user.unlink('providerId1')
      .thenCatch(function(actualError) {
        fireauth.common.testHelper.assertErrorEquals(error, actualError);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testUnlink_phone() {
  // User on server has a federated provider and a phone number linked.
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponseProviderData1);
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponsePhoneAuthProviderData);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // Simulate update linked account.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'deleteLinkedAccounts',
      function(idToken, providersToDelete) {
        assertEquals(jwt, idToken);
        // phone should be removed from user's original providers.
        assertArrayEquals(providersToDelete, ['phone']);
        var response = {
          'email': 'user@default.com',
          'providerUserInfo': [
            {'providerId': 'providerId1'}
          ]
        };
        return goog.Promise.resolve(response);
      });

  var user = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithPhone);
  user.addProviderData(providerData1);
  user.addProviderData(providerDataPhone);

  var userWithoutPhone = new fireauth.AuthUser(config1, tokenResponse,
      accountInfo);
  userWithoutPhone.addProviderData(providerData1);

  user.addStateChangeListener(function(event) {
    asyncTestCase.signal();
  });
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);

  user.unlink(fireauth.PhoneAuthProvider['PROVIDER_ID'])
      .then(function(passedUser) {
        // Update user in Auth state.
        assertObjectEquals(userWithoutPhone.toPlainObject(),
            user.toPlainObject());

        // Explicitly test that phone number is null.
        assertNull(user['phoneNumber']);

        // Should be same instance.
        assertEquals(user, passedUser);

        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(2);
}


function testDelete_success() {
  asyncTestCase.waitForSignals(2);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  goog.events.listen(
      user, fireauth.UserEventType.USER_DELETED, function(event) {
        asyncTestCase.signal();
      });

  // Simulate rpcHandler deleteAccount.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'deleteAccount',
      function(idToken) {
        assertEquals(jwt, idToken);
        return goog.Promise.resolve();
      });
  // Checks that destroy is called.
  stubs.replace(
      user,
      'destroy',
      goog.testing.recordFunction(goog.bind(user.destroy, user)));
  user['delete']().then(function() {
    assertEquals(1, user.destroy.getCallCount());
    asyncTestCase.signal();
  });
}


function testDelete_error() {
  asyncTestCase.waitForSignals(1);

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  goog.events.listen(
      user, fireauth.UserEventType.USER_DELETED, function(event) {
        fail('Auth change listener should not trigger!');
      });

  // Simulate rpcHandler deleteAccount.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'deleteAccount',
      function(idToken) {
        assertEquals(jwt, idToken);
        return goog.Promise.reject(expectedError);
      });
  // Checks that destroy is not called.
  stubs.replace(
      user,
      'destroy',
      function() {
        fail('User destroy should not be called!');
      });
  user['delete']().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testDelete_userDestroyed() {
  assertFailsWhenUserIsDestroyed('delete', []);
}


function testSendEmailVerification_success() {
  // Simulate successful RpcHandler sendEmailVerification.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendEmailVerification',
      function(idToken, actualActionCodeSettings) {
        assertEquals(jwt, idToken);
        assertObjectEquals({}, actualActionCodeSettings);
        return goog.Promise.resolve('user@default.com');
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.sendEmailVerification().then(function() {
    asyncTestCase.signal();
  });
  asyncTestCase.waitForSignals(1);
}


function testSendEmailVerification_localCopyWrongEmail() {
  var expectedEmail = 'user@email.com';

  // The backend has the email user@email.com associated with the account.
  var updatedUserResponse = {
    'users': [{
      'localId': 'userId1',
      'email': expectedEmail,
      'emailVerified': true,
      'providerUserInfo': [],
      'photoUrl': '',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return goog.Promise.resolve(updatedUserResponse);
      });

  // The RPC should still succeed and return user@email.com.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendEmailVerification',
      function(idToken, actualActionCodeSettings) {
        assertEquals(jwt, idToken);
        assertObjectEquals({}, actualActionCodeSettings);
        return goog.Promise.resolve(expectedEmail);
      });

  // This user does not have an email.
  var user = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': 'userId1'
  });
  assertNull(user['email']);
  user.sendEmailVerification().then(function() {
    assertEquals(expectedEmail, user['email']);
    asyncTestCase.signal();
  });

  // This user has the wrong email.
  var user2 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': 'userId1',
    'email': 'wrong@email.com'
  });
  user2.sendEmailVerification().then(function() {
    assertEquals(expectedEmail, user2['email']);
    asyncTestCase.signal();
  });

  asyncTestCase.waitForSignals(2);
}


function testSendEmailVerification_error() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  // Simulate unsuccessful RpcHandler sendEmailVerification.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendEmailVerification',
      function(idToken, actualActionCodeSettings) {
        assertObjectEquals({}, actualActionCodeSettings);
        return goog.Promise.reject(expectedError);
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.sendEmailVerification()
      .then(function() {
        fail('sendEmailVerification should not resolve!');
      })
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testSendEmailVerification_actionCodeSettings_success() {
  // Simulate successful RpcHandler sendEmailVerification with action code
  // settings.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendEmailVerification',
      function(idToken, actualActionCodeSettings) {
        assertObjectEquals(
            new fireauth.ActionCodeSettings(actionCodeSettings).buildRequest(),
            actualActionCodeSettings);
        assertEquals(jwt, idToken);
        return goog.Promise.resolve('user@default.com');
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.sendEmailVerification(actionCodeSettings).then(function() {
    asyncTestCase.signal();
  });
  asyncTestCase.waitForSignals(1);
}


function testSendEmailVerification_actionCodeSettings_error() {
  // Simulate sendEmailVerification with invalid action code settings.
  var settings = {
    'url': ''
  };
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_CONTINUE_URI);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.sendEmailVerification(settings).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
  asyncTestCase.waitForSignals(1);
}


function testVerifyBeforeUpdateEmail_success() {
  var newEmail = 'newUser@example.com';
  // Simulate successful RpcHandler verifyBeforeUpdateEmail.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyBeforeUpdateEmail',
      function(idToken, email, actualActionCodeSettings) {
        assertEquals(jwt, idToken);
        assertEquals(newEmail, email);
        assertObjectEquals({}, actualActionCodeSettings);
        // Returns the user's current email.
        return goog.Promise.resolve('user@default.com');
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.verifyBeforeUpdateEmail(newEmail).then(function() {
    asyncTestCase.signal();
  });
  asyncTestCase.waitForSignals(1);
}


function testVerifyBeforeUpdateEmail_localCopyWrongEmail() {
  var expectedEmail = 'user@email.com';
  var newEmail = 'newUser@example.com';
  // The backend has the email user@email.com associated with the account.
  var updatedUserResponse = {
    'users': [{
      'localId': 'userId1',
      'email': expectedEmail,
      'emailVerified': true,
      'providerUserInfo': [],
      'photoUrl': '',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return goog.Promise.resolve(updatedUserResponse);
      });

  // The RPC should still succeed and return user@email.com.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyBeforeUpdateEmail',
      function(idToken, email, actualActionCodeSettings) {
        assertEquals(jwt, idToken);
        assertEquals(newEmail, email);
        assertObjectEquals({}, actualActionCodeSettings);
        return goog.Promise.resolve(expectedEmail);
      });

  // This user does not have an email.
  var user = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': 'userId1'
  });
  // User state change listener should be triggered on user reload.
  var stateChangedCounter1 = 0;
  user.addStateChangeListener(function(user) {
    stateChangedCounter1++;
    return goog.Promise.resolve();
  });
  assertNull(user['email']);
  user.verifyBeforeUpdateEmail(newEmail).then(function() {
    assertEquals(expectedEmail, user['email']);
    assertEquals(1, stateChangedCounter1);
    asyncTestCase.signal();
  });

  // This user has the wrong email.
  var user2 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': 'userId1',
    'email': 'wrong@email.com'
  });
  // User state change listener should be triggered on user reload.
  var stateChangedCounter2 = 0;
  user2.addStateChangeListener(function(user) {
    stateChangedCounter2++;
    return goog.Promise.resolve();
  });
  user2.verifyBeforeUpdateEmail(newEmail).then(function() {
    assertEquals(expectedEmail, user2['email']);
    assertEquals(1, stateChangedCounter2);
    asyncTestCase.signal();
  });

  asyncTestCase.waitForSignals(2);
}


function testVerifyBeforeUpdateEmail_error() {
  var newEmail = 'newUser@example.com';
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  // Simulate unsuccessful RpcHandler verifyBeforeUpdateEmail.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyBeforeUpdateEmail',
      function(idToken, email, actualActionCodeSettings) {
        assertEquals(jwt, idToken);
        assertEquals(newEmail, email);
        assertObjectEquals({}, actualActionCodeSettings);
        return goog.Promise.reject(expectedError);
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.verifyBeforeUpdateEmail(newEmail)
      .then(function() {
        fail('verifyBeforeUpdateEmail should not resolve!');
      })
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testVerifyBeforeUpdateEmail_actionCodeSettings_success() {
  var newEmail = 'newUser@example.com';
  // Simulate successful RpcHandler verifyBeforeUpdateEmail with action code
  // settings.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyBeforeUpdateEmail',
      function(idToken, email, actualActionCodeSettings) {
        assertObjectEquals(
            new fireauth.ActionCodeSettings(actionCodeSettings).buildRequest(),
            actualActionCodeSettings);
        assertEquals(jwt, idToken);
        assertEquals(newEmail, email);
        return goog.Promise.resolve('user@default.com');
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.verifyBeforeUpdateEmail(newEmail, actionCodeSettings).then(function() {
    asyncTestCase.signal();
  });
  asyncTestCase.waitForSignals(1);
}


function testVerifyBeforeUpdateEmail_actionCodeSettings_error() {
  var newEmail = 'newUser@example.com';
  // Simulate verifyBeforeUpdateEmail with invalid action code settings.
  var settings = {
    'url': ''
  };
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_CONTINUE_URI);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  assertNoStateEvents(user);
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  user.verifyBeforeUpdateEmail(newEmail, settings).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
  asyncTestCase.waitForSignals(1);
}


function testDestroy() {
  var config = {
    'apiKey': 'apiKey1',
    'appName': 'appId1',
    'authDomain': 'subdomain.firebaseapp.com'
  };
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  mockControl.$replayAll();
  // Confirm a user is subscribed to Auth event manager.
  stubs.replace(
      fireauth.AuthEventManager.prototype,
      'subscribe',
      goog.testing.recordFunction());
  // Confirm a user is unsubscribed from Auth event manager.
  stubs.replace(
      fireauth.AuthEventManager.prototype,
      'unsubscribe',
      goog.testing.recordFunction());
  fireauth.AuthEventManager.ENABLED = true;
  var user = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  user.enablePopupRedirect();
  // User should be subscribed after enabling popup and redirect.
  assertEquals(1, fireauth.AuthEventManager.prototype.subscribe.getCallCount());
  assertEquals(
      user,
      fireauth.AuthEventManager.prototype.subscribe.getLastCall().
          getArgument(0));
  assertEquals(
      0, fireauth.AuthEventManager.prototype.unsubscribe.getCallCount());
  // Destroy user.
  user.destroy();
  // User should be unsubscribed from Auth event manager.
  assertEquals(1, fireauth.AuthEventManager.prototype.subscribe.getCallCount());
  assertEquals(
      1, fireauth.AuthEventManager.prototype.unsubscribe.getCallCount());
  assertEquals(
      user,
      fireauth.AuthEventManager.prototype.unsubscribe.getLastCall().
          getArgument(0));
  assertNull(user['refreshToken']);
  return user.reload()
      .then(fail, function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.MODULE_DESTROYED),
            error);
      });
}


function testHasSameUserIdAs() {
  var user1 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '07478372139011515641',
    'displayName': 'John Doe'
  });
  var user2 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid' : '07478372139011515641',
    'displayName' : 'Definitely Not John Doe'
  });
  assertTrue(user1.hasSameUserIdAs(user2));
}


function testHasSameUserIdAs_differentUser() {
  var user1 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '07478372139011515641',
    'displayName': 'John Doe'
  });
  var user2 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid' : '1231231223123112313',
    'displayName' : 'John Doe'
  });
  assertFalse(user1.hasSameUserIdAs(user2));
}


function testHasSameUserIdAs_noUserId() {
  var user1 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': undefined
  });
  var user2 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid' : '07478372139011515641'
  });
  assertFalse(user1.hasSameUserIdAs(user2));
  assertFalse(user2.hasSameUserIdAs(user1));
}


function testHasSameUserIdAs_falsyId() {
  var user1 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': 0,
    'displayName': 'John Doe'
  });
  var user2 = new fireauth.AuthUser(config1, tokenResponse, {
    'uid' : 0,
    'displayName': 'Dohn Joe'
  });
  assertTrue(user1.hasSameUserIdAs(user2));
}


function testUser_copy() {
  var accountInfo1 = {
    'uid': 'accountUserId1',
    'email': null,
    'displayName': 'DefaultUser1',
    'photoURL': 'https://www.example.com/default1/photo.png',
    'emailVerified': true,
    'lastLoginAt': lastLoginAt,
    'createdAt': createdAt
  };
  var providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      null);
  var accountInfo2 = {
    'uid': 'accountUserId2',
    'email': 'user2@default.com',
    'displayName': null,
    'photoURL': null,
    'emailVerified': false,
    'isAnonymous': true,
    'lastLoginAt': lastLoginAt2,
    'createdAt': createdAt2
  };
  var providerData2 = new fireauth.AuthUserInfo(
      'providerUserId2',
      'providerId2',
      'user2@example.com',
      null,
      null);
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo1);
  user1.addProviderData(providerData1);
  var user2 = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  user1.addProviderData(providerData2);
  assertObjectNotEquals(user1, user2);
  user1.copy(user2);
  // user1 should now be equal to user2.
  fireauth.common.testHelper.assertUserEquals(user1, user2);
}


function testUser_toPlainObject() {
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png',
      '+11234567890');
  config1['authDomain'] = 'www.example.com';
  config1['appName'] = 'appId1';
  accountInfoWithPhone['tenantId'] = 'TENANT_ID';
  var user1 = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithPhone);
  user1.addProviderData(providerData1);
  // Confirm redirect event ID is added to plain object.
  user1.setRedirectEventId('5678');
  assertObjectEquals(
      {
        'uid': 'defaultUserId',
        'displayName': 'defaultDisplayName',
        'photoURL': 'https://www.default.com/default/default.png',
        'email': 'user@default.com',
        'emailVerified': true,
        'phoneNumber': '+16505550101',
        'isAnonymous': false,
        'providerData': [
          {
            'uid': 'providerUserId1',
            'displayName': null,
            'photoURL': 'https://www.example.com/user1/photo.png',
            'email': 'user1@example.com',
            'providerId': 'providerId1',
            'phoneNumber': '+11234567890'
          }
        ],
        'apiKey': 'apiKey1',
        'authDomain': 'www.example.com',
        'appName': 'appId1',
        'stsTokenManager': {
          'apiKey': 'apiKey1',
          'refreshToken': 'refreshToken',
          'accessToken': jwt,
          'expirationTime': now + 3600 * 1000
        },
        'redirectEventId': '5678',
        'lastLoginAt': lastLoginAt,
        'createdAt': createdAt,
        'tenantId': 'TENANT_ID',
        'multiFactor': {
          'enrolledFactors': []
        }
      },
      user1.toPlainObject());
}


function testUser_toPlainObject_noMetadata() {
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png',
      '+11234567890');
  config1['authDomain'] = 'www.example.com';
  config1['appName'] = 'appId1';
  // Remove metadata from account info.
  delete accountInfoWithPhone['lastLoginAt'];
  delete accountInfoWithPhone['createdAt'];
  var user1 = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithPhone);
  user1.addProviderData(providerData1);
  // Confirm redirect event ID is added to plain object.
  user1.setRedirectEventId('5678');
  assertObjectEquals(
      {
        'uid': 'defaultUserId',
        'displayName': 'defaultDisplayName',
        'photoURL': 'https://www.default.com/default/default.png',
        'email': 'user@default.com',
        'emailVerified': true,
        'phoneNumber': '+16505550101',
        'isAnonymous': false,
        'providerData': [
          {
            'uid': 'providerUserId1',
            'displayName': null,
            'photoURL': 'https://www.example.com/user1/photo.png',
            'email': 'user1@example.com',
            'providerId': 'providerId1',
            'phoneNumber': '+11234567890'
          }
        ],
        'apiKey': 'apiKey1',
        'authDomain': 'www.example.com',
        'appName': 'appId1',
        'stsTokenManager': {
          'apiKey': 'apiKey1',
          'refreshToken': 'refreshToken',
          'accessToken': jwt,
          'expirationTime': now + 3600 * 1000
        },
        'redirectEventId': '5678',
        'tenantId': null,
        // Metadata should be null.
        'lastLoginAt': null,
        'createdAt': null,
        'multiFactor': {
          'enrolledFactors': []
        }
      },
      user1.toPlainObject());
}


function testUser_toPlainObject_enrolledFactors() {
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png',
      '+11234567890');
  config1['authDomain'] = 'www.example.com';
  config1['appName'] = 'appId1';
  var user1 = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithEnrolledFactors);
  user1.addProviderData(providerData1);
  // Confirm redirect event ID is added to plain object.
  user1.setRedirectEventId('5678');
  assertObjectEquals(
      {
        'uid': 'defaultUserId',
        'displayName': 'defaultDisplayName',
        'photoURL': 'https://www.default.com/default/default.png',
        'email': 'user@default.com',
        'emailVerified': true,
        'isAnonymous': false,
        'phoneNumber': null,
        'providerData': [
          {
            'uid': 'providerUserId1',
            'displayName': null,
            'photoURL': 'https://www.example.com/user1/photo.png',
            'email': 'user1@example.com',
            'providerId': 'providerId1',
            'phoneNumber': '+11234567890'
          }
        ],
        'apiKey': 'apiKey1',
        'authDomain': 'www.example.com',
        'appName': 'appId1',
        'stsTokenManager': {
          'apiKey': 'apiKey1',
          'refreshToken': 'refreshToken',
          'accessToken': jwt,
          'expirationTime': now + 3600 * 1000
        },
        'redirectEventId': '5678',
        'tenantId': null,
        'lastLoginAt': lastLoginAt,
        'createdAt': createdAt,
        'multiFactor': multiFactor
      },
      user1.toPlainObject());
}


function testToJson() {
  config1['authDomain'] = 'www.example.com';
  config1['appName'] = 'appId1';
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user1.addProviderData(providerData1);
  assertObjectEquals(user1.toPlainObject(), user1.toJSON());
  // Make sure JSON.stringify works and uses underlying toJSON.
  assertEquals(JSON.stringify(user1), JSON.stringify(user1.toPlainObject()));
}


function testUser_fromPlainObject() {
  accountInfoWithPhone['isAnonymous'] = true;
  accountInfoWithPhone['tenantId'] = 'TENANT_ID';
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  config1['authDomain'] = 'www.example.com';
  config1['appName'] = 'appId1';
  var user1 = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithPhone);
  user1.addProviderData(providerData1);
  user1.addProviderData(providerDataPhone);
  // Confirm redirect event ID is populated from plain object.
  user1.setRedirectEventId('5678');
  // Missing API key.
  assertNull(fireauth.AuthUser.fromPlainObject(accountInfo));
  accountInfo['apiKey'] = 'apiKey1';
  // Missing STS token response.
  assertNull(fireauth.AuthUser.fromPlainObject(accountInfo));
  fireauth.common.testHelper.assertUserEquals(
      user1,
      fireauth.AuthUser.fromPlainObject({
        'uid': 'defaultUserId',
        'displayName': 'defaultDisplayName',
        'photoURL': 'https://www.default.com/default/default.png',
        'email': 'user@default.com',
        'emailVerified': true,
        'phoneNumber': '+16505550101',
        'isAnonymous': true,
        'providerData': [
          {
            'uid': 'providerUserId1',
            'displayName': null,
            'photoURL': 'https://www.example.com/user1/photo.png',
            'email': 'user1@example.com',
            'providerId': 'providerId1',
            'phoneNumber': null
          },
          {
            'uid': '+16505550101',
            'displayName': null,
            'photoURL': null,
            'email': null,
            'providerId': 'phone',
            'phoneNumber': '+16505550101'
          }
        ],
        'apiKey': 'apiKey1',
        'authDomain': 'www.example.com',
        'appName': 'appId1',
        'stsTokenManager': {
          'apiKey': 'apiKey1',
          'refreshToken': 'refreshToken',
          'accessToken': jwt,
          'expirationTime': now + 3600 * 1000
        },
        'redirectEventId': '5678',
        'lastLoginAt': lastLoginAt,
        'createdAt': createdAt,
        'tenantId': 'TENANT_ID'
      }));
}


function testUser_fromPlainObject_noMetadata() {
  // User previously saved with older version without metadata.
  accountInfoWithPhone['isAnonymous'] = true;
  delete accountInfoWithPhone['lastLoginAt'];
  delete accountInfoWithPhone['createdAt'];
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  config1['authDomain'] = 'www.example.com';
  config1['appName'] = 'appId1';
  var user1 = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithPhone);
  user1.addProviderData(providerData1);
  user1.addProviderData(providerDataPhone);
  // Confirm redirect event ID is populated from plain object.
  user1.setRedirectEventId('5678');
  // Missing API key.
  assertNull(fireauth.AuthUser.fromPlainObject(accountInfo));
  accountInfo['apiKey'] = 'apiKey1';
  // Missing STS token response.
  assertNull(fireauth.AuthUser.fromPlainObject(accountInfo));
  fireauth.common.testHelper.assertUserEquals(
      user1,
      fireauth.AuthUser.fromPlainObject({
        'uid': 'defaultUserId',
        'displayName': 'defaultDisplayName',
        'photoURL': 'https://www.default.com/default/default.png',
        'email': 'user@default.com',
        'emailVerified': true,
        'phoneNumber': '+16505550101',
        'isAnonymous': true,
        'providerData': [
          {
            'uid': 'providerUserId1',
            'displayName': null,
            'photoURL': 'https://www.example.com/user1/photo.png',
            'email': 'user1@example.com',
            'providerId': 'providerId1',
            'phoneNumber': null
          },
          {
            'uid': '+16505550101',
            'displayName': null,
            'photoURL': null,
            'email': null,
            'providerId': 'phone',
            'phoneNumber': '+16505550101'
          }
        ],
        'apiKey': 'apiKey1',
        'authDomain': 'www.example.com',
        'appName': 'appId1',
        'stsTokenManager': {
          'apiKey': 'apiKey1',
          'refreshToken': 'refreshToken',
          'accessToken': jwt,
          'expirationTime': now + 3600 * 1000
        },
        'redirectEventId': '5678',
        'tenantId': null
      }));
}


function testUser_fromPlainObject_tokenExpired() {
  // This will simulate a user with an expired refresh token being loaded from
  // storage. getIdToken should reject with the expected token expired error and
  // should not trigger state or Auth change event.
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png',
      '+11234567890');
  config1['authDomain'] = 'www.example.com';
  config1['appName'] = 'appId1';
  // Simulate the user has an expired token.
  tokenResponse['refreshToken'] = null;
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user1.addProviderData(providerData1);
  accountInfo['apiKey'] = 'apiKey1';
  var parsedUser = fireauth.AuthUser.fromPlainObject({
    'uid': 'defaultUserId',
    'displayName': 'defaultDisplayName',
    'photoURL': 'https://www.default.com/default/default.png',
    'email': 'user@default.com',
    'emailVerified': true,
    'phoneNumber':  null,
    'isAnonymous': false,
    'providerData': [
      {
        'uid': 'providerUserId1',
        'displayName': null,
        'photoURL': 'https://www.example.com/user1/photo.png',
        'email': 'user1@example.com',
        'providerId': 'providerId1',
        'phoneNumber': '+11234567890'
      }
    ],
    'apiKey': 'apiKey1',
    'authDomain': 'www.example.com',
    'appName': 'appId1',
    'stsTokenManager': {
      'apiKey': 'apiKey1',
      // Expired refresh token.
      'refreshToken': null,
      'accessToken': jwt,
      'expirationTime': now + 3600 * 1000
    },
    'lastLoginAt': lastLoginAt,
    'createdAt': createdAt
  });
  // Confirm matching users with expired refresh token.
  fireauth.common.testHelper.assertUserEquals(user1, parsedUser);
  assertNull(parsedUser['refreshToken']);
  // No state or token changes should be triggered.
  assertNoStateEvents(parsedUser);
  assertNoTokenEvents(parsedUser);
  assertNoUserInvalidatedEvents(user1);
  // Get token on parsed user should triggered expired token error with no state
  // change.
  parsedUser.getIdToken().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_fromPlainObject_enrolledFactors() {
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'providerId1',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  config1['authDomain'] = 'www.example.com';
  config1['appName'] = 'appId1';
  var user1 = new fireauth.AuthUser(config1, tokenResponse,
      accountInfoWithEnrolledFactors);
  user1.addProviderData(providerData1);
  user1.addProviderData(providerDataPhone);
  // Confirm redirect event ID is populated from plain object.
  user1.setRedirectEventId('5678');
  // Missing API key.
  assertNull(fireauth.AuthUser.fromPlainObject(accountInfo));
  accountInfo['apiKey'] = 'apiKey1';
  // Missing STS token response.
  assertNull(fireauth.AuthUser.fromPlainObject(accountInfo));
  fireauth.common.testHelper.assertUserEquals(
      user1,
      fireauth.AuthUser.fromPlainObject({
        'uid': 'defaultUserId',
        'displayName': 'defaultDisplayName',
        'photoURL': 'https://www.default.com/default/default.png',
        'email': 'user@default.com',
        'emailVerified': true,
        'isAnonymous': false,
        'providerData': [
          {
            'uid': 'providerUserId1',
            'displayName': null,
            'photoURL': 'https://www.example.com/user1/photo.png',
            'email': 'user1@example.com',
            'providerId': 'providerId1',
            'phoneNumber': null
          },
          {
            'uid': '+16505550101',
            'displayName': null,
            'photoURL': null,
            'email': null,
            'providerId': 'phone',
            'phoneNumber': '+16505550101'
          }
        ],
        'apiKey': 'apiKey1',
        'authDomain': 'www.example.com',
        'appName': 'appId1',
        'stsTokenManager': {
          'apiKey': 'apiKey1',
          'refreshToken': 'refreshToken',
          'accessToken': jwt,
          'expirationTime': now + 3600 * 1000
        },
        'redirectEventId': '5678',
        'lastLoginAt': lastLoginAt,
        'createdAt': createdAt,
        'multiFactor': multiFactor
      }));
}


function testUser_initializeFromIdTokenResponse() {
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'providerUserInfo': [
        {
          'email': 'user@gmail.com',
          'providerId': 'google.com',
          'displayName': 'John G. Doe',
          'photoUrl': 'https://lh5.googleusercontent.com/123456789/photo.jpg',
          'federatedId': 'https://accounts.google.com/123456789',
          'rawId': '123456789'
        },
        {
          'providerId': 'twitter.com',
          'displayName': 'John Gammell Doe',
          'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/def' +
              'ault_profile_3_normal.png',
          'federatedId': 'http://twitter.com/987654321',
          'rawId': '987654321'
        }
      ],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  var expectedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true
  });
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '123456789',
      'google.com',
      'user@gmail.com',
      'John G. Doe',
      'https://lh5.googleusercontent.com/123456789/photo.jpg'));
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '987654321',
      'twitter.com',
      null,
      'John Gammell Doe',
      'http://abs.twimg.com/sticky/default_profile_images/default_profile_' +
      '3_normal.png'));
  var frameworks = ['firebaseui', 'angularfire'];
  // Listen to all calls on setFramework.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'setFramework',
      goog.testing.recordFunction(fireauth.AuthUser.prototype.setFramework));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          // Confirm setFramework called with expected parameters before
          // getAccountInfo call.
          assertEquals(
              1,
              fireauth.AuthUser.prototype.setFramework.getCallCount());
          assertArrayEquals(
              frameworks,
              fireauth.AuthUser.prototype.setFramework.getLastCall()
                  .getArgument(0));
          assertEquals(jwt, data);
          resolve(response);
        });
      });
  asyncTestCase.waitForSignals(1);
  assertEquals(0, fireauth.AuthUser.prototype.setFramework.getCallCount());
  fireauth.AuthUser.initializeFromIdTokenResponse(
      config1, tokenResponse, null, frameworks).then(function(createdUser) {
        // Confirm no additional calls on setFramework.
        assertEquals(
              1,
              fireauth.AuthUser.prototype.setFramework.getCallCount());
        // Confirm frameworks set on created user.
        assertArrayEquals(frameworks, createdUser.getFramework());
        assertObjectEquals(
            expectedUser.toPlainObject(), createdUser.toPlainObject());
        assertEquals('refreshToken', createdUser['refreshToken']);
        // Confirm STS token manager instance properly created.
        assertTrue(
            createdUser.stsTokenManager_ instanceof fireauth.StsTokenManager);
        assertEquals(
            jwt,
            createdUser.stsTokenManager_.accessToken_.toString());
        assertEquals(
            'refreshToken', createdUser.stsTokenManager_.refreshToken_);
        asyncTestCase.signal();
      });
}


function testUser_initializeFromIdTokenResponse_multiFactor() {
  // GetAccountInfo response with multi-factor response.
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'providerUserInfo': [
        {
          'email': 'user@gmail.com',
          'providerId': 'google.com',
          'displayName': 'John G. Doe',
          'photoUrl': 'https://lh5.googleusercontent.com/123456789/photo.jpg',
          'federatedId': 'https://accounts.google.com/123456789',
          'rawId': '123456789'
        },
        {
          'providerId': 'twitter.com',
          'displayName': 'John Gammell Doe',
          'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/def' +
              'ault_profile_3_normal.png',
          'federatedId': 'http://twitter.com/987654321',
          'rawId': '987654321'
        }
      ],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false,
      'mfaInfo': mfaInfo
    }]
  };
  var expectedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true,
    'multiFactor': multiFactor
  });
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '123456789',
      'google.com',
      'user@gmail.com',
      'John G. Doe',
      'https://lh5.googleusercontent.com/123456789/photo.jpg'));
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '987654321',
      'twitter.com',
      null,
      'John Gammell Doe',
      'http://abs.twimg.com/sticky/default_profile_images/default_profile_' +
      '3_normal.png'));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        assertEquals(jwt, data);
        return goog.Promise.resolve(response);
      });
  asyncTestCase.waitForSignals(1);
  fireauth.AuthUser.initializeFromIdTokenResponse(config1, tokenResponse, null)
      .then(function(createdUser) {
        assertObjectEquals(
            expectedUser.toPlainObject(), createdUser.toPlainObject());
        asyncTestCase.signal();
      });
}


function testUser_initializeFromIdTokenResponse_tenantId() {
  // GetAccountInfo response with tenant ID.
  var response = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'providerUserInfo': [
        {
          'email': 'user@gmail.com',
          'providerId': 'google.com',
          'displayName': 'John G. Doe',
          'photoUrl': 'https://lh5.googleusercontent.com/123456789/photo.jpg',
          'federatedId': 'https://accounts.google.com/123456789',
          'rawId': '123456789'
        },
        {
          'providerId': 'twitter.com',
          'displayName': 'John Gammell Doe',
          'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/def' +
              'ault_profile_3_normal.png',
          'federatedId': 'http://twitter.com/987654321',
          'rawId': '987654321'
        }
      ],
      'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
          't_profile_3_normal.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false,
      'tenantId': 'TENANT_ID'
    }]
  };
  var expectedUser = new fireauth.AuthUser(config1, tokenResponse, {
    'uid': '14584746072031976743',
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/defaul' +
        't_profile_3_normal.png',
    'emailVerified': true,
    // Tenant ID shoud be set.
    'tenantId': 'TENANT_ID'
  });
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '123456789',
      'google.com',
      'user@gmail.com',
      'John G. Doe',
      'https://lh5.googleusercontent.com/123456789/photo.jpg'));
  expectedUser.addProviderData(new fireauth.AuthUserInfo(
      '987654321',
      'twitter.com',
      null,
      'John Gammell Doe',
      'http://abs.twimg.com/sticky/default_profile_images/default_profile_' +
      '3_normal.png'));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(data) {
        assertEquals(jwt, data);
        return goog.Promise.resolve(response);
      });
  asyncTestCase.waitForSignals(1);
  fireauth.AuthUser.initializeFromIdTokenResponse(config1, tokenResponse, null)
      .then(function(createdUser) {
        assertObjectEquals(
            expectedUser.toPlainObject(), createdUser.toPlainObject());
        assertEquals('refreshToken', createdUser['refreshToken']);
        // Confirm STS token manager instance properly created.
        assertTrue(
            createdUser.stsTokenManager_ instanceof fireauth.StsTokenManager);
        assertEquals(jwt, createdUser.stsTokenManager_.accessToken_.toString());
        assertEquals(
            'refreshToken', createdUser.stsTokenManager_.refreshToken_);
        assertEquals('TENANT_ID', createdUser['tenantId']);
        asyncTestCase.signal();
      });
}


function testUser_authEventManager_noAuthDomain() {
  // When no Auth domain provided, all popup and redirect operations should
  // throw the relevant error.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.MISSING_AUTH_DOMAIN);
  // Test no Auth domain and call getAuthEventManager.
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user1.enablePopupRedirect();
  try {
    user1.getAuthEventManager();
    fail('getAuthEventManager should throw missing Auth domain error.');
  } catch (error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  }
}


function testUser_authEventManager_authDomainProvided() {
  // Confirm getAuthEventManager when authDomain provided.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedManager = {
    'subscribe': goog.testing.recordFunction(),
    'unsubscribe': goog.testing.recordFunction()
  };
  // Return a manager with recorded subscribe and unsubscribe operations.
  stubs.replace(
      fireauth.AuthEventManager,
      'getManager',
      function(authDomain, apiKey, appName) {
        assertEquals('subdomain.firebaseapp.com', authDomain);
        assertEquals('apiKey1', apiKey);
        assertEquals('appId1', appName);
        return expectedManager;
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect operaitons.
  user1.enablePopupRedirect();
  // This should resolve with the manager instance.
  assertEquals(expectedManager, user1.getAuthEventManager());
  // User should be subscribed.
  assertEquals(0, expectedManager.unsubscribe.getCallCount());
  assertEquals(1, expectedManager.subscribe.getCallCount());
  assertEquals(user1, expectedManager.subscribe.getLastCall().getArgument(0));
  // Destroy user.
  user1.destroy();
  // User should be now unsubscribed.
  assertEquals(1, expectedManager.subscribe.getCallCount());
  assertEquals(1, expectedManager.unsubscribe.getCallCount());
  assertEquals(user1, expectedManager.unsubscribe.getLastCall().getArgument(0));
}


function testUser_authEventManager_unsubscribed() {
  // Test getAuthEventManager on an unsubscribed user.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedManager = {
    'subscribe': goog.testing.recordFunction(),
    'unsubscribe': goog.testing.recordFunction()
  };
  stubs.replace(
      fireauth.AuthEventManager,
      'getManager',
      function(authDomain, apiKey, appName) {
        assertEquals('subdomain.firebaseapp.com', authDomain);
        assertEquals('apiKey1', apiKey);
        assertEquals('appId1', appName);
        return expectedManager;
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // User not subscribed yet. This should throw an error.
  try {
    user1.getAuthEventManager();
    fail('getAuthEventManager should throw an error.');
  } catch (error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  }
}


function testUser_finishPopupAndRedirectLink_success_withoutPostBody() {
  asyncTestCase.waitForSignals(5);
  // This should be populated from verifyAssertionForLinking response.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      null, 'ACCESS_TOKEN');
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'REQUEST_URI',
          'sessionId': 'SESSION_ID',
          'idToken': jwt,
          'postBody': null
        },
        data);
        asyncTestCase.signal();
        return goog.Promise.resolve({
          'idToken': newJwt,
          'refreshToken': 'newRefreshToken',
          'providerId': 'google.com',
          'oauthAccessToken': 'ACCESS_TOKEN',
          'rawUserInfo': expectedTokenResponseWithIdPData['rawUserInfo']
        });
      });
  // Reload should be called.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        asyncTestCase.signal();
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Token change should be triggered.
  goog.events.listen(
      user1, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        asyncTestCase.signal();
      });
  assertNoUserInvalidatedEvents(user1);
  // Finish popup and redirect linking.
  user1.finishPopupAndRedirectLink('REQUEST_URI', 'SESSION_ID', null, null)
      .then(function(response) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            user1, expectedCred, expectedAdditionalUserInfo,
            fireauth.constants.OperationType.LINK, response);
        // It should have updated the tokens.
        assertEquals(newJwt, user1['_lat']);
        assertEquals('newRefreshToken', user1.refreshToken);
        asyncTestCase.signal();
      });
}


function testUser_finishPopupAndRedirectLink_success_withPostBody() {
  asyncTestCase.waitForSignals(5);
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'REQUEST_URI',
          'sessionId': 'SESSION_ID',
          'idToken': jwt,
          'postBody': 'POST_BODY'
        },
        data);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedSamlTokenResponseWithIdPData);
      });
  // Reload should be called.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        asyncTestCase.signal();
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Token change should be triggered.
  goog.events.listen(
      user1, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        asyncTestCase.signal();
      });
  assertNoUserInvalidatedEvents(user1);
  // Finish popup and redirect linking.
  user1.finishPopupAndRedirectLink(
      'REQUEST_URI', 'SESSION_ID', null, 'POST_BODY')
      .then(function(response) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            user1, null, expectedSamlAdditionalUserInfo,
            fireauth.constants.OperationType.LINK, response);
        // It should have updated the tokens.
        assertEquals(newJwt, user1['_lat']);
        assertEquals('newRefreshToken', user1.refreshToken);
        asyncTestCase.signal();
      });
}


function testUser_finishPopupAndRedirectReauth_success_withoutPostBody() {
  asyncTestCase.waitForSignals(5);
  // This should be populated from verifyAssertion response.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      null, 'ACCESS_TOKEN');
  // Simulate successful RpcHandler verifyAssertionForExisting.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'REQUEST_URI',
          'sessionId': 'SESSION_ID',
          'postBody': null,
          'tenantId': null
        },
        data);
        asyncTestCase.signal();
        return goog.Promise.resolve({
          'idToken': idTokenGmail.jwt,
          'accessToken': idTokenGmail.jwt,
          'refreshToken': 'newRefreshToken',
          'providerId': 'google.com',
          'oauthAccessToken': 'ACCESS_TOKEN',
          'rawUserInfo': expectedTokenResponseWithIdPData['rawUserInfo']
        });
      });
  // Reload should be called.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        asyncTestCase.signal();
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  // Modify accountInfo UID to match the token UID.
  accountInfo['uid'] = 679;
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Token change should be triggered.
  goog.events.listen(
      user1, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        asyncTestCase.signal();
      });
  assertNoUserInvalidatedEvents(user1);
  // Finish popup and redirect reauth.
  user1.finishPopupAndRedirectReauth('REQUEST_URI', 'SESSION_ID', null, null)
      .then(function(response) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            user1, expectedCred, expectedAdditionalUserInfo,
            fireauth.constants.OperationType.REAUTHENTICATE, response);
        // It should have updated the tokens.
        assertEquals(idTokenGmail.jwt, user1['_lat']);
        assertEquals('newRefreshToken', user1.refreshToken);
        asyncTestCase.signal();
      });
}


function testUser_finishPopupAndRedirectReauth_success_withPostBody() {
  asyncTestCase.waitForSignals(5);
  // Simulate successful RpcHandler verifyAssertionForExisting.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'REQUEST_URI',
          'sessionId': 'SESSION_ID',
          'postBody': 'POST_BODY',
          'tenantId': null
        },
        data);
        asyncTestCase.signal();
        return goog.Promise.resolve({
          'idToken': idTokenSaml.jwt,
          'accessToken': idTokenSaml.jwt,
          'refreshToken': 'newRefreshToken',
          'providerId': 'saml.provider',
          'rawUserInfo': expectedSamlTokenResponseWithIdPData['rawUserInfo']
        });
      });
  // Reload should be called.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        asyncTestCase.signal();
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  // Modify accountInfo UID to match the token UID.
  accountInfo['uid'] = 679;
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Token change should be triggered.
  goog.events.listen(
      user1, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        asyncTestCase.signal();
      });
  assertNoUserInvalidatedEvents(user1);
  // Finish popup and redirect reauth.
  user1.finishPopupAndRedirectReauth(
      'REQUEST_URI', 'SESSION_ID', null, 'POST_BODY')
      .then(function(response) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            user1, null, expectedSamlAdditionalUserInfo,
            fireauth.constants.OperationType.REAUTHENTICATE, response);
        // It should have updated the tokens.
        assertEquals(idTokenSaml.jwt, user1['_lat']);
        assertEquals('newRefreshToken', user1.refreshToken);
        asyncTestCase.signal();
      });
}


function testUser_finishPopupAndRedirectReauth_success_tenantId() {
  // Verify that the tenant ID is passed to RPC handler and the user with tenant
  // ID is returned.
  asyncTestCase.waitForSignals(5);
  // This should be populated from verifyAssertion response.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      null, 'ACCESS_TOKEN');
  var expectedTenantId = 'TENANT_ID';
  // Simulate successful RpcHandler verifyAssertionForExisting.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'REQUEST_URI',
          'sessionId': 'SESSION_ID',
          'postBody': null,
          'tenantId': expectedTenantId
        },
        data);
        asyncTestCase.signal();
        return goog.Promise.resolve({
          'idToken': idTokenGmail.jwt,
          'accessToken': idTokenGmail.jwt,
          'refreshToken': 'newRefreshToken',
          'expiresIn': '3600',
          'providerId': 'google.com',
          'oauthAccessToken': 'ACCESS_TOKEN',
          'rawUserInfo': expectedTokenResponseWithIdPData['rawUserInfo']
        });
      });
  getAccountInfoResponse['users'][0]['tenantId'] = expectedTenantId;
  // Reload should be called.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        asyncTestCase.signal();
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  // Modify accountInfo UID to match the token UID.
  accountInfo['uid'] = 679;
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect.
  tenantUser.enablePopupRedirect();
  tenantUser.addStateChangeListener(function(user) {
    // User state change should be triggered.
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Token change should be triggered.
  goog.events.listen(
      tenantUser, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        asyncTestCase.signal();
      });
  assertNoUserInvalidatedEvents(tenantUser);
  // Finish popup and redirect reauth.
  tenantUser.finishPopupAndRedirectReauth(
      'REQUEST_URI', 'SESSION_ID', expectedTenantId, null)
      .then(function(response) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            tenantUser, expectedCred, expectedAdditionalUserInfo,
            fireauth.constants.OperationType.REAUTHENTICATE, response);
        // It should have updated the tokens.
        assertEquals(idTokenGmail.jwt, tenantUser['_lat']);
        assertEquals('newRefreshToken', tenantUser.refreshToken);
        asyncTestCase.signal();
      });
}


function testUser_finishPopupAndRedirectLink_error() {
  asyncTestCase.waitForSignals(2);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Simulate error in RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'REQUEST_URI',
          'sessionId': 'SESSION_ID',
          'idToken': jwt,
          'postBody': null
        },
        data);
        asyncTestCase.signal();
        return goog.Promise.reject(expectedError);
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // No state or token changes should be triggered.
  assertNoStateEvents(user1);
  assertNoTokenEvents(user1);
  assertNoUserInvalidatedEvents(user1);
  // Finish popup and redirect linking. This should throw the same error above.
  user1.finishPopupAndRedirectLink('REQUEST_URI', 'SESSION_ID', null, null)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testUser_finishPopupAndRedirectReauth_error() {
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Simulate error in RpcHandler verifyAssertionForExisting.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      goog.testing.recordFunction(function(data) {
        assertObjectEquals(
        {
          'requestUri': 'REQUEST_URI',
          'sessionId': 'SESSION_ID',
          'postBody': null,
          'tenantId': null
        },
        data);
        return goog.Promise.reject(expectedError);
      }));
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // No state or token changes should be triggered.
  assertNoStateEvents(user1);
  assertNoTokenEvents(user1);
  assertNoUserInvalidatedEvents(user1);
  // Finish popup and redirect reauth. This should throw the same error above.
  user1.finishPopupAndRedirectReauth('REQUEST_URI', 'SESSION_ID', null, null)
      .thenCatch(function(error) {
        assertEquals(
            1,
            fireauth.RpcHandler.prototype.verifyAssertionForExisting
                .getCallCount());
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testUser_finishPopupAndRedirectLink_noCredential() {
  asyncTestCase.waitForSignals(2);
  // Test when for some reason OAuth response is not returned.
  var expectedCred = null;
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'REQUEST_URI',
          'sessionId': 'SESSION_ID',
          'idToken': jwt,
          'postBody': null
        },
        data);
        asyncTestCase.signal();
        return goog.Promise.resolve({
          'idToken': newJwt,
          'refreshToken': 'newRefreshToken',
          'providerId': 'google.com',
          'rawUserInfo': expectedTokenResponseWithIdPData['rawUserInfo']
        });
      });
  // Successful linking should trigger reload.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        asyncTestCase.signal();
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  config1['authDomain'] = 'subdomain.firebaseapp.com';
  var user1 = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // Finish popup and redirect linking. No credential should be returned.
  user1.finishPopupAndRedirectLink('REQUEST_URI', 'SESSION_ID', null, null)
      .then(function(response) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            user1, expectedCred, expectedAdditionalUserInfo,
            fireauth.constants.OperationType.LINK, response);
        // It should have updated the tokens.
        assertEquals(
            newJwt, user1.getStsTokenManager().accessToken_.toString());
        assertEquals(
            'newRefreshToken',
            user1.getStsTokenManager().refreshToken_);
        asyncTestCase.signal();
      });
}


function testUser_linkWithRedirect_success_unloadsOnRedirect() {
  // Test successful request for link with redirect when page unloads on
  // redirect.
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.LINK_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Redirect event ID should be saved.
            assertEquals(expectedEventId, user1.getRedirectEventId());
            // Redirect user should be saved in storage with correct redirect
            // event ID.
            storageManager.getRedirectUser().then(function(user) {
              assertEquals(expectedEventId, user.getRedirectEventId());
              assertObjectEquals(user1.toPlainObject(), user.toPlainObject());
              asyncTestCase.signal();
            });
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(true);
  mockControl.$replayAll();

  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // Link with redirect should succeed and remain pending.
  user1.linkWithRedirect(expectedProvider).then(function() {
    fail('LinkWithRedirect should remain pending in environment where ' +
        'OAuthSignInHandler unloads the page.');
  });
}


function testUser_reauthenticateWithRedirect_success_unloadsOnRedirect() {
  // Test successful request for reauth with redirect when page unloads on
  // redirect.
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Redirect event ID should be saved.
            assertEquals(expectedEventId, user1.getRedirectEventId());
            // Redirect user should be saved in storage with correct redirect
            // event ID.
            storageManager.getRedirectUser().then(function(user) {
              assertEquals(expectedEventId, user.getRedirectEventId());
              assertObjectEquals(user1.toPlainObject(), user.toPlainObject());
              asyncTestCase.signal();
            });
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(true);
  mockControl.$replayAll();

  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // Reauth with redirect should succeed and remain pending.
  user1.reauthenticateWithRedirect(expectedProvider).then(function() {
    fail('ReauthenticateWithRedirect should remain pending in environment ' +
        'where OAuthSignInHandler unloads the page.');
  });
}


function testUser_linkWithRedirect_success_unloadsOnRedirect_tenantId() {
  // Test successful request for link with redirect when page unloads on
  // redirect and tenant ID is set on user.
  // Verify that tenant ID is passed to OAuth sign in handler.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedTenantId = 'TENANT_ID';
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId,
          actualTenantId) {
            assertEquals(
                fireauth.AuthEvent.Type.LINK_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Redirect event ID should be saved.
            assertEquals(expectedEventId, tenantUser.getRedirectEventId());
            // User's tenant ID should be passed to OAuth handler.
            assertEquals(expectedTenantId, actualTenantId);
            // Redirect user should be saved in storage with correct redirect
            // event ID.
            storageManager.getRedirectUser().then(function(user) {
              assertEquals(expectedEventId, user.getRedirectEventId());
              assertObjectEquals(
                  tenantUser.toPlainObject(), user.toPlainObject());
              asyncTestCase.signal();
            });
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(true);
  mockControl.$replayAll();

  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        // Mock tenant ID is returned in getAccountInfo response.
        getAccountInfoResponse['users'][0]['tenantId'] = expectedTenantId;
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // Create a user in tenant project scope.
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  tenantUser.setRedirectStorageManager(storageManager);
  tenantUser.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  tenantUser.enablePopupRedirect();
  // Link with redirect should succeed and remain pending.
  tenantUser.linkWithRedirect(expectedProvider).then(function() {
    fail('LinkWithRedirect should remain pending in environment where ' +
        'OAuthSignInHandler unloads the page.');
  });
}


function testUser_reauthWithRedirect_success_unloadsOnRedirect_tenantId() {
  // Test successful request for reauth with redirect when page unloads on
  // redirect and tenant ID is set on user.
  // Verify that tenant ID is passed to OAuth sign in handler.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedTenantId = 'TENANT_ID';
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId,
          actualTenantId) {
            assertEquals(
                fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Redirect event ID should be saved.
            assertEquals(expectedEventId, tenantUser.getRedirectEventId());
            // User's tenant ID should be passed to OAuth handler.
            assertEquals(expectedTenantId, actualTenantId);
            // Redirect user should be saved in storage with correct redirect
            // event ID.
            storageManager.getRedirectUser().then(function(user) {
              assertEquals(expectedEventId, user.getRedirectEventId());
              assertObjectEquals(
                  tenantUser.toPlainObject(), user.toPlainObject());
              asyncTestCase.signal();
            });
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(true);
  mockControl.$replayAll();

  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // Create a user in tenant project scope.
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  tenantUser.setRedirectStorageManager(storageManager);
  tenantUser.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  tenantUser.enablePopupRedirect();
  // Reauth with redirect should succeed and remain pending.
  tenantUser.reauthenticateWithRedirect(expectedProvider).then(function() {
    fail('ReauthenticateWithRedirect should remain pending in environment ' +
        'where OAuthSignInHandler unloads the page.');
  });
}


function testUser_linkWithRedirect_success_doesNotUnloadOnRedirect() {
  // Test successful request for link with redirect when page does not unload
  // on redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.LINK_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(false);
  mockControl.$replayAll();

  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // Link with redirect should succeed and resolve in this case.
  user1.linkWithRedirect(expectedProvider).then(function() {
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user1.getRedirectEventId());
    // Redirect user should be saved in storage with correct redirect event ID.
    storageManager.getRedirectUser().then(function(user) {
      assertEquals(expectedEventId, user.getRedirectEventId());
      assertObjectEquals(user1.toPlainObject(), user.toPlainObject());
      asyncTestCase.signal();
    });
  });
}


function testUser_reauthenticateWithRedirect_success_doesNotUnloadOnRedirect() {
  // Test successful request for reauth with redirect when page does not unload
  // on redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(false);
  mockControl.$replayAll();
  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // Reauth with redirect should succeed and resolve in this case.
  user1.reauthenticateWithRedirect(expectedProvider).then(function() {
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user1.getRedirectEventId());
    // Redirect user should be saved in storage with correct redirect event ID.
    storageManager.getRedirectUser().then(function(user) {
      assertEquals(expectedEventId, user.getRedirectEventId());
      assertObjectEquals(user1.toPlainObject(), user.toPlainObject());
      asyncTestCase.signal();
    });
  });
}


function testUser_linkWithRedirect_success_doesNotUnloadOnRedirect_tenantId() {
  // Test successful request for link with redirect when page does not unload
  // on redirect and tenant ID is set on user.
  // Verify that tenant ID is passed to OAuth sign in handler.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedTenantId = 'TENANT_ID';
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId,
          actualTenantId) {
            assertEquals(
                fireauth.AuthEvent.Type.LINK_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // User's tenant ID should be passed to OAuth handler.
            assertEquals(expectedTenantId, actualTenantId);
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(false);
  mockControl.$replayAll();

  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        // Mock tenant ID is returned in getAccountInfo response.
        getAccountInfoResponse['users'][0]['tenantId'] = expectedTenantId;
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // Create a user in tenant project scope.
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  tenantUser.setRedirectStorageManager(storageManager);
  tenantUser.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  tenantUser.enablePopupRedirect();
  // Link with redirect should succeed and resolve in this case.
  tenantUser.linkWithRedirect(expectedProvider).then(function() {
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, tenantUser.getRedirectEventId());
    // Redirect user should be saved in storage with correct redirect event ID.
    storageManager.getRedirectUser().then(function(user) {
      assertEquals(expectedEventId, user.getRedirectEventId());
      assertObjectEquals(tenantUser.toPlainObject(), user.toPlainObject());
      asyncTestCase.signal();
    });
  });
}


function testUser_reauthWithRedirect_success_doesNotUnload_tenantId() {
  // Test successful request for reauth with redirect when page does not unload
  // on redirect and tenant ID is set on user.
  // Verify that tenant ID is passed to OAuth sign in handler.
  var expectedTenantId = 'TENANT_ID';
  fireauth.AuthEventManager.ENABLED = true;
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId,
          actualTenantId) {
            assertEquals(
                fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // User's tenant ID should be passed to OAuth handler.
            assertEquals(expectedTenantId, actualTenantId);
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(false);
  mockControl.$replayAll();
  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // Create a user in tenant project scope.
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  tenantUser.setRedirectStorageManager(storageManager);
  tenantUser.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  tenantUser.enablePopupRedirect();
  // Reauth with redirect should succeed and resolve in this case.
  tenantUser.reauthenticateWithRedirect(expectedProvider).then(function() {
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, tenantUser.getRedirectEventId());
    // Redirect user should be saved in storage with correct redirect event ID.
    storageManager.getRedirectUser().then(function(user) {
      assertEquals(expectedEventId, user.getRedirectEventId());
      assertObjectEquals(tenantUser.toPlainObject(), user.toPlainObject());
      asyncTestCase.signal();
    });
  });
}


function testUser_linkWithRedirect_success_noStorageManager() {
  // Test when no storage manager supplied.
  fireauth.AuthEventManager.ENABLED = true;
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.LINK_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Redirect event ID should be saved.
            assertEquals(expectedEventId, user1.getRedirectEventId());
            // Redirect user should be saved in storage with correct redirect
            // event ID.
            storageManager.getRedirectUser().then(function(user) {
              assertNull(user);
              asyncTestCase.signal();
            });
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(true);
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // Link with redirect should never resolve.
  user1.linkWithRedirect(expectedProvider).then(function() {
    fail('LinkWithRedirect should remain pending in environment where ' +
        'OAuthSignInHandler unloads the page.');
  });
}


function testUser_reauthenticateWithRedirect_success_noStorageManager() {
  // Test when no storage manager supplied.
  fireauth.AuthEventManager.ENABLED = true;
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Redirect event ID should be saved.
            assertEquals(expectedEventId, user1.getRedirectEventId());
            // Redirect user should be saved in storage with correct redirect
            // event ID.
            storageManager.getRedirectUser().then(function(user) {
              assertNull(user);
              asyncTestCase.signal();
            });
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.unloadsOnRedirect().$returns(true);
  mockControl.$replayAll();
  var expectedEventId = '1234';
  asyncTestCase.waitForSignals(2);
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // An event ID should be generated.
        return expectedEventId;
      });
  var expectedProvider = new fireauth.GoogleAuthProvider();
  expectedProvider.addScope('scope1');
  expectedProvider.addScope('scope2');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  user1.addStateChangeListener(function(user) {
    // User state change should be triggered.
    // Redirect event ID should be saved.
    assertEquals(expectedEventId, user.getRedirectEventId());
    asyncTestCase.signal();
    return goog.Promise.resolve();
  });
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // Reauth with redirect should never resolve.
  user1.reauthenticateWithRedirect(expectedProvider).then(function() {
    fail('ReauthenticateWithRedirect should remain pending in environment ' +
         'where OAuthSignInHandler unloads the page.');
  });
}


function testLinkWithRedirect_missingAuthDomain() {
  // Link with redirect should fail when Auth domain is missing.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(2);

  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  var provider = new fireauth.GoogleAuthProvider();
  var config = {
    'apiKey': 'apiKey1',
    'appName': 'appId1'
  };
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  user1.enablePopupRedirect();
  // linkWithRedirect should fail with missing Auth domain error.
  user1.linkWithRedirect(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.MISSING_AUTH_DOMAIN),
        error);
    // Redirect user should not be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testReauthenticateWithRedirect_missingAuthDomain() {
  // Reauth with redirect should fail when Auth domain is missing.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(1);

  var provider = new fireauth.GoogleAuthProvider();
  var config = {
    'apiKey': 'apiKey1',
    'appName': 'appId1'
  };
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  user1.enablePopupRedirect();
  // reauthenticateWithRedirect should fail with missing Auth domain error.
  user1.reauthenticateWithRedirect(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.MISSING_AUTH_DOMAIN),
        error);
    // Redirect user should not be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_linkWithRedirect_invalidProvider() {
  // Link with redirect should fail when provider is an OAuth provider.
  fireauth.AuthEventManager.ENABLED = true;
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processRedirect(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualMode,
          actualProvider,
          actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.LINK_VIA_REDIRECT, actualMode);
            assertEquals(provider, actualProvider);
            return goog.Promise.reject(expectedError);
          });
  mockControl.$replayAll();
  asyncTestCase.waitForSignals(2);

  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  // Email and password Auth provider.
  var provider = new fireauth.EmailAuthProvider();
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  // Enabled popup and redirect.
  user1.enablePopupRedirect();
  // linkWithRedirect should fail with an invalid OAuth provider error.
  user1.linkWithRedirect(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // Redirect user should not be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithRedirect_invalidProvider() {
  // Reauth with redirect should fail when provider is not an OAuth provider.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(1);

  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);

  // Email and password Auth provider.
  var provider = new fireauth.EmailAuthProvider();
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  // Enabled popup and redirect.
  user1.enablePopupRedirect();
  // reauthenticateWithRedirect should fail with an invalid OAuth provider
  // error.
  user1.reauthenticateWithRedirect(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // Redirect user should not be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_linkWithRedirect_alreadyLinked() {
  // User on server has the federated provider linked already.
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponseGoogleProviderData);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.linkWithRedirect(new fireauth.GoogleAuthProvider())
      .thenCatch(function(actualError) {
        fireauth.common.testHelper.assertErrorEquals(new fireauth.AuthError(
            fireauth.authenum.Error.PROVIDER_ALREADY_LINKED), actualError);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testUser_linkWithPopup_success_slowIframeEmbed() {
  // Test successful link with popup with delay in embedding the iframe.
  asyncTestCase.waitForSignals(3);
  var clock = new goog.testing.MockClock(true);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        // Simulate popup closed.
        expectedPopup.closed = true;
        // Simulate the iframe took a while to embed. This should not
        // trigger a popup timeout.
        clock.tick(10000);
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful link via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(data) {
        // Now that popup timer is cleared, a delay in verify assertion should
        // not trigger popup closed error.
        clock.tick(10000);
        // Resolve with expected token response.
        return goog.Promise.resolve(expectedTokenResponseWithIdPData);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // linkWithPopup should not trigger popup closed error and should resolve
  // successfully.
  user1.linkWithPopup(provider).then(function(popupResult) {
    // Expected result returned.
    fireauth.common.testHelper.assertUserCredentialResponse(
        // Expected current user returned.
        user1,
        // Expected credential returned.
        expectedGoogleCredential,
        // Expected additional user info.
        expectedAdditionalUserInfo,
        // operationType not implemented yet.
        fireauth.constants.OperationType.LINK,
        popupResult);
    goog.dispose(clock);
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_success_slowIframeEmbed() {
  // Test successful reauth with popup with delay in embedding the iframe.
  asyncTestCase.waitForSignals(1);
  var clock = new goog.testing.MockClock(true);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        // Simulate popup closed.
        expectedPopup.closed = true;
        // Simulate the iframe took a while to embed. This should not
        // trigger a popup timeout.
        clock.tick(10000);
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Stub getAccountInfoByIdToken which is called on reload.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Simulate successful RpcHandler verifyAssertionForExisting.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      function(data) {
        // Now that popup timer is cleared, a delay in verify assertion should
        // not trigger popup closed error.
        clock.tick(10000);
        // Resolve with expected token response.
        return goog.Promise.resolve(expectedReauthenticateTokenResponse);
      });
  accountInfo['uid'] = '679';
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // reauthenticateWithPopup should not trigger popup closed error and should
  // resolve successfully.
  user1.reauthenticateWithPopup(provider).then(function(popupResult) {
    // Expected result returned.
    fireauth.common.testHelper.assertUserCredentialResponse(
        // Expected current user returned.
        user1,
        // Expected credential returned.
        expectedGoogleCredential,
        // Expected additional user info.
        expectedAdditionalUserInfo,
        // operationType not implemented yet.
        fireauth.constants.OperationType.REAUTHENTICATE,
        popupResult);
    goog.dispose(clock);
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_error_popupClosed() {
  // Test when the popup is closed without completing sign in that the expected
  // popup closed error is triggered.
  asyncTestCase.waitForSignals(3);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        // Trigger popup closed by user error.
        onError(expectedError);
        // This should be ignored.
        recordedHandler(delayedPopupAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // Expected popup closed error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.POPUP_CLOSED_BY_USER);
  // The expected popup event ID.
  var expectedEventId = '1234';
  // Delayed expected popup Auth event.
  var delayedPopupAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // linkWithPopup should fail with the popup closed error.
  user1.linkWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_error_popupClosed() {
  // Test when the popup is closed without completing sign in that the expected
  // popup closed error is triggered.
  asyncTestCase.waitForSignals(1);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        // Trigger popup closed by user error.
        onError(expectedError);
        // This should be ignored.
        recordedHandler(delayedPopupAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // Expected popup closed error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.POPUP_CLOSED_BY_USER);
  // The expected popup event ID.
  var expectedEventId = '1234';
  // Delayed expected popup Auth event.
  var delayedPopupAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      goog.testing.recordFunction(function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      }));
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      goog.testing.recordFunction(function(win) {
        assertEquals(expectedPopup, win);
      }));
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // reauthenticateWithPopup should fail with the popup closed error.
  user1.reauthenticateWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_error_iframeWebStorageNotSupported() {
  // Test when the web storage is not supported in the iframe.
  asyncTestCase.waitForSignals(1);
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.iframeclient.IfcHandler);
  mockControl.createConstructorMock(fireauth.iframeclient, 'IfcHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        // Trigger web storage not supported error.
        onError(expectedError);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // Expected web storage not supported error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  // The expected popup event ID.
  var expectedEventId = '1234';
  // Keep track when the popup is closed.
  var isClosed = false;
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // Record when the popup is closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        isClosed = true;
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // linkWithPopup should fail with the web storage no supported error.
  user1.linkWithPopup(provider).thenCatch(function(error) {
    // Popup should be closed.
    assertTrue(isClosed);
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_reauthWithPopup_error_iframeWebStorageNotSupported() {
  // Test when the web storage is not supported in the iframe.
  asyncTestCase.waitForSignals(1);
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.iframeclient.IfcHandler);
  mockControl.createConstructorMock(fireauth.iframeclient, 'IfcHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        // Trigger web storage not supported error.
        onError(expectedError);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // Expected web storage not supported error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  // The expected popup event ID.
  var expectedEventId = '1234';
  // Keep track when the popup is closed.
  var isClosed = false;
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // Record when the popup is closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        isClosed = true;
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // reauthenticateWithPopup should fail with the web storage no supported
  // error.
  user1.reauthenticateWithPopup(provider).thenCatch(function(error) {
    // Popup should be closed.
    assertTrue(isClosed);
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_success_withoutPostBody() {
  asyncTestCase.waitForSignals(3);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful link via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  var provider = new fireauth.GoogleAuthProvider();
  // linkWithPopup should succeed with the expected popup result.
  user1.linkWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_success_withPostBody() {
  asyncTestCase.waitForSignals(3);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful link via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      'POST_BODY');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertNull(width);
        assertNull(height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/callback', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertEquals('POST_BODY', postBody);
        assertNull(tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': expectedSamlAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  var provider = new fireauth.SAMLAuthProvider('saml.provider');
  // linkWithPopup should succeed with the expected popup result.
  user1.linkWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_success_tenantId() {
  // Test successful request for link with pop when tenant ID is set on user.
  // Verify that tenant ID is passed to OAuth sign in handler and
  // finishPopupAndRedirectLink is called with expected tenantId.
  asyncTestCase.waitForSignals(3);
  var expectedTenantId = 'TENANT_ID';
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected,
          actualTenantId) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            assertEquals(expectedTenantId, actualTenantId);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        // Mock tenant ID is returned in getAccountInfo response.
        getAccountInfoResponse['users'][0]['tenantId'] = expectedTenantId;
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful link via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  // Create a user in tenant project scope.
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  tenantUser.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  tenantUser.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': tenantUser,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  var provider = new fireauth.GoogleAuthProvider();
  // linkWithPopup should succeed with the expected popup result.
  tenantUser.linkWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_success_withoutPostBody() {
  asyncTestCase.waitForSignals(1);

  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      goog.testing.recordFunction(function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      }));
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      goog.testing.recordFunction(function(win) {
        assertEquals(expectedPopup, win);
      }));
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  // Add Google as linked provider to confirm that reauth does not fail like
  // linking does when called with an already linked provider.
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'google.com',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  user1.addProviderData(providerData1);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  var provider = new fireauth.GoogleAuthProvider();
  // reauthenticateWithPopup should succeed with the expected popup result.
  user1.reauthenticateWithPopup(provider).then(function(popupResult) {
    // Confirm popup and closeWindow called in the process.
    /** @suppress {missingRequire} */
    assertEquals(1, fireauth.util.popup.getCallCount());
    /** @suppress {missingRequire} */
    assertEquals(1, fireauth.util.closeWindow.getCallCount());
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_reauthenticateWithPopup_success_withPostBody() {
  asyncTestCase.waitForSignals(1);

  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      'POST_BODY');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      goog.testing.recordFunction(function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertNull(width);
        assertNull(height);
        return expectedPopup;
      }));
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      goog.testing.recordFunction(function(win) {
        assertEquals(expectedPopup, win);
      }));
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/callback', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertEquals('POST_BODY', postBody);
        assertNull(tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  // Add Google as linked provider to confirm that reauth does not fail like
  // linking does when called with an already linked provider.
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'google.com',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  user1.addProviderData(providerData1);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': expectedSamlAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  var provider = new fireauth.SAMLAuthProvider('saml.provider');
  // reauthenticateWithPopup should succeed with the expected popup result.
  user1.reauthenticateWithPopup(provider).then(function(popupResult) {
    // Confirm popup and closeWindow called in the process.
    /** @suppress {missingRequire} */
    assertEquals(1, fireauth.util.popup.getCallCount());
    /** @suppress {missingRequire} */
    assertEquals(1, fireauth.util.closeWindow.getCallCount());
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_linkWithPopup_emailCredentialError() {
  // Test when link with popup verifyAssertion throws an Auth email credential
  // error.
  asyncTestCase.waitForSignals(1);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  var credential =
      fireauth.GoogleAuthProvider.credential({'accessToken': 'ACCESS_TOKEN'});
  // Expected Auth email credential error.
  var expectedError = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        email: 'user@example.com',
        credential: credential
      });
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful link via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Simulate Auth email credential error thrown by verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'http://www.example.com/#response',
          'sessionId': 'SESSION_ID',
          'idToken': jwt,
          'postBody': null
        },
        data);
        return goog.Promise.reject(expectedError);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // linkWithPopup should fail with the expected Auth email credential error.
  user1.linkWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_userMismatchError() {
  // Test when reauth with popup verifyAssertion returns an ID token with a
  // different user ID.
  asyncTestCase.waitForSignals(1);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // Expected Auth email credential error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_MISMATCH);
  // This response will contain an ID token with a UID that does not match the
  // current user's UID.
  var expectedUserMismatchResponse = {
    'idToken': idTokenGmail.jwt,
    'accessToken': idTokenGmail.jwt,
    'refreshToken': 'REFRESH_TOKEN',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE'
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Simulate verifyAssertionForExisting returns a token with a different UID.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'http://www.example.com/#response',
          'sessionId': 'SESSION_ID',
          'postBody': null,
          'tenantId': null
        },
        data);
        return goog.Promise.resolve(expectedUserMismatchResponse);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  // Set redirect storage manager.
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // reauthenticateWithPopup should fail with the user mismatch error.
  user1.reauthenticateWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_unsupportedEnvironment() {
  // Test linkWithPopup in unsupported environment.
  // Simulate popup and redirect not supported in current environment.
  stubs.replace(
      fireauth.util,
      'isPopupRedirectSupported',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Expected error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.linkWithPopup(new fireauth.GoogleAuthProvider())
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testUser_reauthenticateWithPopup_unsupportedEnvironment() {
  // Test reauthenticateWithPopup in unsupported environment.
  // Simulate popup and redirect not supported in current environment.
  stubs.replace(
      fireauth.util,
      'isPopupRedirectSupported',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Expected error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.reauthenticateWithPopup(new fireauth.GoogleAuthProvider())
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testUser_linkWithRedirect_unsupportedEnvironment() {
  // Test linkWithRedirect in unsupported environment.
  // Simulate popup and redirect not supported in current environment.
  stubs.replace(
      fireauth.util,
      'isPopupRedirectSupported',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Expected error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.linkWithRedirect(new fireauth.GoogleAuthProvider())
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testUser_reauthenticateWithRedirect_unsupportedEnvironment() {
  // Test reauthenticateWithRedirect in unsupported environment.
  // Simulate popup and redirect not supported in current environment.
  stubs.replace(
      fireauth.util,
      'isPopupRedirectSupported',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Expected error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.reauthenticateWithRedirect(new fireauth.GoogleAuthProvider())
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testUser_linkWithPopup_success_cannotRunInBackground() {
  asyncTestCase.waitForSignals(4);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful link via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config['authDomain'],
      config['apiKey'],
      config['appName'],
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION);
  // Simulate tab cannot run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
         // Destination URL popped directly without the second redirect.
        assertEquals(expectedUrl, url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config['authDomain'], domain);
        assertEquals(config['apiKey'], apiKey);
        assertEquals(config['appName'], name);
        assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  // linkWithPopup should succeed with the expected popup result.
  user1.linkWithPopup(expectedProvider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_success_cannotRunInBackground_tenantId() {
  asyncTestCase.waitForSignals(4);
  var expectedTenantId = 'TENANT_ID';
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected,
          actualTenantId) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            assertEquals(expectedTenantId, actualTenantId);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        // Mock tenant ID is returned in getAccountInfo response.
        getAccountInfoResponse['users'][0]['tenantId'] = expectedTenantId;
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful link via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config['authDomain'],
      config['apiKey'],
      config['appName'],
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION,
      null,
      null,
      expectedTenantId);
  // Simulate tab cannot run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
         // Destination URL popped directly without the second redirect.
        assertEquals(expectedUrl, url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId,
               clientVerison, additionalParams, endpointId, tenantId) {
        assertEquals(config['authDomain'], domain);
        assertEquals(config['apiKey'], apiKey);
        assertEquals(config['appName'], name);
        assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        assertEquals(expectedTenantId, tenantId);
        return expectedUrl;
      });
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  // Set tenant ID on user.
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  tenantUser.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  tenantUser.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': tenantUser,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  // linkWithPopup should succeed with the expected popup result.
  tenantUser.linkWithPopup(expectedProvider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_success_cannotRunInBackground() {
  asyncTestCase.waitForSignals(1);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config['authDomain'],
      config['apiKey'],
      config['appName'],
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION);
  // Simulate tab cannot run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
         // Destination URL popped directly without the second redirect.
        assertEquals(expectedUrl, url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config['authDomain'], domain);
        assertEquals(config['apiKey'], apiKey);
        assertEquals(config['appName'], name);
        assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  // reauthenticateWithPopup should succeed with the expected popup result.
  user1.reauthenticateWithPopup(expectedProvider)
      .then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_reauthenticateWithPopup_success_cannotRunInBkg_tenantId() {
  asyncTestCase.waitForSignals(1);
  var expectedTenantId = 'TENANT_ID';
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected,
          actualTenantId) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            assertEquals(expectedTenantId, actualTenantId);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config['authDomain'],
      config['apiKey'],
      config['appName'],
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION,
      null,
      null,
      expectedTenantId);
  // Simulate tab cannot run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
         // Destination URL popped directly without the second redirect.
        assertEquals(expectedUrl, url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId,
               clientVerison, additionalParams, endpointId, tenantId) {
        assertEquals(config['authDomain'], domain);
        assertEquals(config['apiKey'], apiKey);
        assertEquals(config['appName'], name);
        assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        assertEquals(expectedTenantId, tenantId);
        return expectedUrl;
      });
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  tenantUser.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  tenantUser.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': tenantUser,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  // reauthenticateWithPopup should succeed with the expected popup result.
  tenantUser.reauthenticateWithPopup(expectedProvider)
      .then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_linkWithPopup_success_iframeCanRunInBackground() {
  // Test successful link with popup when tab can run in background but is an
  // iframe. This should behave the same as the
  // testUser_linkWithPopup_success_cannotRunInBackground test.
  asyncTestCase.waitForSignals(4);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Should already be redirected.
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful link via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config['authDomain'],
      config['apiKey'],
      config['appName'],
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION);
  // Simulate tab can run in the background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return true;
      });
  // Simulate app is running in an iframe. This should open the popup with the
  // OAuth helper redirect directly. No additional redirect is needed as it
  // could be blocked due to iframe sandboxing settings.
  stubs.replace(
      fireauth.util,
      'isIframe',
      function() {
        return true;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
         // Destination URL popped directly without the second redirect.
        assertEquals(expectedUrl, url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config['authDomain'], domain);
        assertEquals(config['apiKey'], apiKey);
        assertEquals(config['appName'], name);
        assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  // linkWithPopup should succeed with the expected popup result.
  user1.linkWithPopup(expectedProvider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_success_iframeCanRunInBackground() {
  // Test successful reauth with popup when tab can run in background but is an
  // iframe. This should behave the same as the
  // testUser_reauthenticateWithPopup_success_cannotRunInBackground test.
  asyncTestCase.waitForSignals(1);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Should already be redirected.
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config['authDomain'],
      config['apiKey'],
      config['appName'],
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION);
  // Simulate tab can run in the background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return true;
      });
  // Simulate app is running in an iframe. This should open the popup with the
  // OAuth helper redirect directly. No additional redirect is needed as it
  // could be blocked due to iframe sandboxing settings.
  stubs.replace(
      fireauth.util,
      'isIframe',
      function() {
        return true;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
         // Destination URL popped directly without the second redirect.
        assertEquals(expectedUrl, url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config['authDomain'], domain);
        assertEquals(config['apiKey'], apiKey);
        assertEquals(config['appName'], name);
        assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // The expected popup result should be returned.
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  // reauthenticateWithPopup should succeed with the expected popup result.
  user1.reauthenticateWithPopup(expectedProvider)
      .then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_linkWithPopup_webStorageUnsupported_cannotRunInBackground() {
  // Test link with popup when the web storage is not supported in the iframe
  // and the tab cannot run in background.
  asyncTestCase.waitForSignals(1);
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        onError(expectedError);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  // Keep track when the popup is closed.
  var isClosed = false;
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // Expected web storage not supported error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config['authDomain'],
      config['apiKey'],
      config['appName'],
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION);
  // Simulate tab cannot run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
         // Destination URL popped directly without the second redirect.
        assertEquals(expectedUrl, url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // Check when the popup will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        isClosed = true;
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config['authDomain'], domain);
        assertEquals(config['apiKey'], apiKey);
        assertEquals(config['appName'], name);
        assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // linkWithPopup should reject with the expected error.
  user1.linkWithPopup(expectedProvider).thenCatch(function(error) {
    // Popup should be closed.
    assertTrue(isClosed);
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_reauthWithPopup_webStorageUnsupported_cantRunInBackground() {
  // Test reauth with popup when the web storage is not supported in the iframe
  // and the tab cannot run in background.
  asyncTestCase.waitForSignals(1);
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.iframeclient.IfcHandler);
  mockControl.createConstructorMock(fireauth.iframeclient, 'IfcHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        onError(expectedError);
        return goog.Promise.resolve();
      });
  mockControl.$replayAll();
  // Keep track when the popup is closed.
  var isClosed = false;
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // Expected web storage not supported error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config['authDomain'],
      config['apiKey'],
      config['appName'],
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION);
  // Simulate tab cannot run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
         // Destination URL popped directly without the second redirect.
        assertEquals(expectedUrl, url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // Check when the popup will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        isClosed = true;
        assertEquals(expectedPopup, win);
      });
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config['authDomain'], domain);
        assertEquals(config['apiKey'], apiKey);
        assertEquals(config['appName'], name);
        assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Set redirect storage manager.
  storageManager = new fireauth.storage.RedirectUserManager(
      fireauth.util.createStorageKey(config['apiKey'], config['appName']));
  user1.setRedirectStorageManager(storageManager);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  // reauthenticateWithPopup should reject with the expected error.
  user1.reauthenticateWithPopup(expectedProvider)
      .thenCatch(function(error) {
    // Popup should be closed.
    assertTrue(isClosed);
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // Popup user should never be saved in storage.
    storageManager.getRedirectUser().then(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testUser_linkWithPopup_multipleUsers_success() {
  // Test link with popup on multiple users.
  asyncTestCase.waitForSignals(6);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertObjectEquals(provider, actualProvider);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertObjectEquals(provider, actualProvider);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        startPopupTimeoutCalls++;
        // Both users already ready, handle events for both.
        if (startPopupTimeoutCalls == 2) {
          recordedHandler(expectedAuthEvent1);
          recordedHandler(expectedAuthEvent2);
          // User one can only handle first event.
          assertTrue(user1.canHandleAuthEvent(
              fireauth.AuthEvent.Type.LINK_VIA_POPUP, '1234'));
          assertFalse(user1.canHandleAuthEvent(
              fireauth.AuthEvent.Type.LINK_VIA_POPUP, '5678'));
          // User two can only handle second event.
          assertTrue(user2.canHandleAuthEvent(
              fireauth.AuthEvent.Type.LINK_VIA_POPUP, '5678'));
          assertFalse(user2.canHandleAuthEvent(
              fireauth.AuthEvent.Type.LINK_VIA_POPUP, '1234'));
        }
        return new goog.Promise(function(resolve, reject) {});
      }).$times(2);
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  // The expected successful link via popup Auth event for first user.
  var expectedAuthEvent1 = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  // The expected successful link via popup Auth event for second user.
  var expectedAuthEvent2 = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      '5678',
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // Number of popup timeout calls.
  var startPopupTimeoutCalls = 0;
  fireauth.AuthEventManager.ENABLED = true;
  var firstCall = true;
  // Generate event ID depending on user calling it.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function(prefix) {
        // Skip other calls for generateEventId.
        // This is used for testing that popup and redirects are supported.
        if (!prefix) {
          return 'random';
        }
        if (firstCall) {
          firstCall = false;
          return '1234';
        } else {
          return '5678';
        }
      });
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // Finish popup and redirect link should be called for each user.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        if (this == user1) {
          // Resolve with first expected result for first user.
          return goog.Promise.resolve(expectedPopupResult1);
        } else {
          // Resolve with second expected result for second user.
          return goog.Promise.resolve(expectedPopupResult2);
        }
      });
  // Create 2 users, it doesn't matter if they have same parameters.
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  var user2 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // The expected popup results.
  var expectedPopupResult1 = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  var expectedPopupResult2 = {
    'user': user2,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  var provider = new fireauth.GoogleAuthProvider();
  // Enable popup and redirect on the first user.
  user1.enablePopupRedirect();
  // linkWithPopup should succeed with the first expected popup result.
  user1.linkWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult1, popupResult);
    asyncTestCase.signal();
  });
  var provider = new fireauth.GoogleAuthProvider();
  // Enable popup and redirect on the first user.
  user2.enablePopupRedirect();
  // linkWithPopup should succeed with the second expected popup result.
  user2.linkWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult2, popupResult);
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_multipleUsers_success() {
  // Test reauth with popup on multiple users.
  asyncTestCase.waitForSignals(2);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertObjectEquals(provider, actualProvider);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertObjectEquals(provider, actualProvider);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        startPopupTimeoutCalls++;
        if (startPopupTimeoutCalls == 2) {
          recordedHandler(expectedAuthEvent1);
          recordedHandler(expectedAuthEvent2);
          // User one can only handle first event.
          assertTrue(user1.canHandleAuthEvent(
              fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, '1234'));
          assertFalse(user1.canHandleAuthEvent(
              fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, '5678'));
          // User two can only handle second event.
          assertTrue(user2.canHandleAuthEvent(
              fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, '5678'));
          assertFalse(user2.canHandleAuthEvent(
              fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, '1234'));
        }
        return new goog.Promise(function(resolve, reject) {});
      }).$times(2);
  mockControl.$replayAll();
  var recordedHandler = null;
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
      });
  // The expected successful reauth via popup Auth event for first user.
  var expectedAuthEvent1 = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  // The expected successful reauth via popup Auth event for second user.
  var expectedAuthEvent2 = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      '5678',
      'http://www.example.com/#response',
      'SESSION_ID');
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // Number of popup timeout calls.
  var startPopupTimeoutCalls = 0;
  fireauth.AuthEventManager.ENABLED = true;
  var firstCall = true;
  // Generate event ID depending on user calling it.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function(prefix) {
        // Skip other calls for generateEventId.
        // This is used for testing that popup and redirects are supported.
        if (!prefix) {
          return 'random';
        }
        if (firstCall) {
          firstCall = false;
          return '1234';
        } else {
          return '5678';
        }
      });
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // Finish popup and redirect reauth should be called for each user.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        if (this == user1) {
          // Resolve with first expected result for first user.
          return goog.Promise.resolve(expectedPopupResult1);
        } else {
          // Resolve with second expected result for second user.
          return goog.Promise.resolve(expectedPopupResult2);
        }
      });
  // Create 2 users, it doesn't matter if they have same parameters.
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  var user2 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // The expected popup results.
  var expectedPopupResult1 = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  var expectedPopupResult2 = {
    'user': user2,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  var provider = new fireauth.GoogleAuthProvider();
  // Enable popup and redirect on the first user.
  user1.enablePopupRedirect();
  // reauthenticateWithPopup should succeed with the first expected popup
  // result.
  user1.reauthenticateWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult1, popupResult);
    asyncTestCase.signal();
  });
  var provider = new fireauth.GoogleAuthProvider();
  // Enable popup and redirect on the first user.
  user2.enablePopupRedirect();
  // reauthenticateWithPopup should succeed with the second expected popup
  // result.
  user2.reauthenticateWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult2, popupResult);
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_timeout() {
  fireauth.AuthEventManager.ENABLED = true;
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        // Do nothing on first call to simulate timeout.
        return new goog.Promise(function(resolve, reject) {});
      }).$once();
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return new goog.Promise(function(resolve, reject) {});
      }).$once();
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected expire error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.EXPIRED_POPUP_REQUEST);
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.LINK
  };
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // This will resolve only for the second link with popup operation.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      '5678',
      'http://www.example.com/#response',
      'SESSION_ID');
  // The expected event IDs for each operation.
  var expectedEventId = ['1234', '5678'];
  // expectedEventId current index.
  var index = 0;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        // Called twice.
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // Popup may try to close on resolution if still open (called twice).
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        // Called twice.
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  // A popup event ID should be generated.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function(prefix) {
        // Skip other calls for generateEventId.
        // This is used for testing that popup and redirects are supported.
        if (!prefix) {
          return 'random';
        }
        // Return the next available event ID.
        return expectedEventId[index++];
      });
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        return goog.Promise.resolve(expectedPopupResult);
      });
  asyncTestCase.waitForSignals(6);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Enable popup and redirect on user.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // Call link with popup first. This will be expired after the second call.
  user1.linkWithPopup(provider).thenCatch(function(error) {
    // The second call should force this call to expire.
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
  // Call link with popup second.
  user1.linkWithPopup(provider).then(function(popupResult) {
    // This will cancel the previous popup operation and eventually resolve.
    assertObjectEquals(expectedPopupResult, popupResult);
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_timeout() {
  fireauth.AuthEventManager.ENABLED = true;
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        // Do nothing on first call to simulate timeout.
        return new goog.Promise(function(resolve, reject) {});
      }).$once();
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return new goog.Promise(function(resolve, reject) {});
      }).$once();
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected expire error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.EXPIRED_POPUP_REQUEST);
  // The expected popup result.
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.REAUTHENTICATE
  };
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // This will resolve only for the second reauth with popup operation.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      '5678',
      'http://www.example.com/#response',
      'SESSION_ID');
  // The expected event IDs for each operation.
  var expectedEventId = ['1234', '5678'];
  // expectedEventId current index.
  var index = 0;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        // Called twice.
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      });
  // Popup may try to close on resolution if still open (called twice).
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        // Called twice.
        assertEquals(expectedPopup, win);
      });
  // A popup event ID should be generated.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function(prefix) {
        // Skip other calls for generateEventId.
        // This is used for testing that popup and redirects are supported.
        if (!prefix) {
          return 'random';
        }
        // Return the next available event ID.
        return expectedEventId[index++];
      });
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        return goog.Promise.resolve(expectedPopupResult);
      });
  asyncTestCase.waitForSignals(2);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Enable popup and redirect on user.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // Call reauth with popup first. This will be expired after the second call.
  user1.reauthenticateWithPopup(provider).thenCatch(function(error) {
    // The second call should force this call to expire.
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
  // Call reauth with popup second.
  user1.reauthenticateWithPopup(provider).then(function(popupResult) {
    // This will cancel the previous popup operation and eventually resolve.
    assertObjectEquals(expectedPopupResult, popupResult);
    asyncTestCase.signal();
  });
}


function testUser_linkWithPopup_error() {
  asyncTestCase.waitForSignals(3);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.LINK_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return new goog.Promise(function(resolve, reject) {});
      });
  mockControl.$replayAll();
  // Set the backend user info with no linked providers.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });

  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected error reported in expected Auth event.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // The expected Auth event with the error.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      '1234',
      null,
      null,
      expectedError);
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        asyncTestCase.signal();
        return expectedPopup;
      });
  // Popup may try to close due to error if still open.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  // A popup event ID should be generated.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Since the expected Auth event already has an error, this should not be
  // called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('Auth error should not trigger finishPopupAndRedirectLink!');
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // linkWithPopup should throw the expected error.
  user1.linkWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUser_reauthenticateWithPopup_error() {
  asyncTestCase.waitForSignals(1);
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return new goog.Promise(function(resolve, reject) {});
      });
  mockControl.$replayAll();
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected error reported in expected Auth event.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // The expected Auth event with the error.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      '1234',
      null,
      null,
      expectedError);
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  fireauth.AuthEventManager.ENABLED = true;
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      goog.testing.recordFunction(function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      }));
  // Popup may try to close due to error if still open.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      goog.testing.recordFunction(function(win) {
        assertEquals(expectedPopup, win);
      }));
  // A popup event ID should be generated.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Since the expected Auth event already has an error, this should not be
  // called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('Auth error should not trigger finishPopupAndRedirectReauth!');
      });
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Enable popup and redirect.
  user1.enablePopupRedirect();
  var provider = new fireauth.GoogleAuthProvider();
  // reauthenticateWithPopup should throw the expected error.
  user1.reauthenticateWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}



function testUser_linkWithPopup_alreadyLinked() {
  // User on server has the federated provider linked already.
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponseGoogleProviderData);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  // Don't actually open the popup.
  stubs.replace(fireauth.util, 'popup', function(url, name) {
    return {'close': function() {}};
  });

  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.linkWithPopup(new fireauth.GoogleAuthProvider())
      .thenCatch(function(actualError) {
        fireauth.common.testHelper.assertErrorEquals(new fireauth.AuthError(
            fireauth.authenum.Error.PROVIDER_ALREADY_LINKED), actualError);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testUser_returnFromLinkWithRedirect_success_withoutPostBody() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // The expected credential.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      {'accessToken': 'ACCESS_TOKEN'});
  // The expected link via redirect Auth event for the current user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // Return the expected result.
        var result = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.LINK
        });
        return goog.Promise.resolve(result);
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(1);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID matching the dispatched one.
  user1.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user1.enablePopupRedirect();
    // Get redirect result should return expected result with current user and
    // the expected credential.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          user1, expectedCred, expectedAdditionalUserInfo,
          fireauth.constants.OperationType.LINK, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromLinkWithRedirect_success_withPostBody() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // The expected link via redirect Auth event for the current user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      '1234',
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      'POST_BODY');
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/callback', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertEquals('POST_BODY', postBody);
        assertNull(tenantId);
        // Return the expected result.
        var result = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': null,
          'additionalUserInfo': expectedSamlAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.LINK
        });
        return goog.Promise.resolve(result);
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(1);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID matching the dispatched one.
  user1.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user1.enablePopupRedirect();
    // Get redirect result should return expected result with current user and
    // the expected credential.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          user1, null, expectedSamlAdditionalUserInfo,
          fireauth.constants.OperationType.LINK, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromLinkWithRedirect_success_tenantId() {
  // Verify that if tenant ID is in the redirect Auth event, it will be passed
  // to finishPopupAndRedirectLink handler and the redirect result with the
  // tenant user will be returned.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedTenantId = 'TENANT_ID';
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // The expected credential.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      {'accessToken': 'ACCESS_TOKEN'});
  // The expected link via redirect Auth event for the current user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        // Return the expected result.
        var result = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.LINK
        });
        return goog.Promise.resolve(result);
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(1);
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID matching the dispatched one.
  tenantUser.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    tenantUser.enablePopupRedirect();
    // Get redirect result should return expected result with current user and
    // the expected credential.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          tenantUser, expectedCred, expectedAdditionalUserInfo,
          fireauth.constants.OperationType.LINK, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromReauthenticateWithRedirect_success_noPostBody() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // The expected credential.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      {'accessToken': 'ACCESS_TOKEN'});
  // The expected reauth via redirect Auth event for the current user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // Return the expected result.
        var result = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.REAUTHENTICATE
        });
        return goog.Promise.resolve(result);
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(1);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID matching the dispatched one.
  user1.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user1.enablePopupRedirect();
    // Get redirect result should return expected result with current user and
    // the expected credential.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          user1, expectedCred, expectedAdditionalUserInfo,
          fireauth.constants.OperationType.REAUTHENTICATE, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromReauthenticateWithRedirect_success_postBody() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // The expected reauth via redirect Auth event for the current user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      '1234',
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      'POST_BODY');
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/callback', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertEquals('POST_BODY', postBody);
        assertNull(tenantId);
        // Return the expected result.
        var result = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': null,
          'additionalUserInfo': expectedSamlAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.REAUTHENTICATE
        });
        return goog.Promise.resolve(result);
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(1);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID matching the dispatched one.
  user1.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user1.enablePopupRedirect();
    // Get redirect result should return expected result with current user and
    // the expected credential.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          user1, null, expectedSamlAdditionalUserInfo,
          fireauth.constants.OperationType.REAUTHENTICATE, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromReauthenticateWithRedirect_success_tenantId() {
  // Verify that if tenant ID is in the redirect Auth event, it will be passed
  // to finishPopupAndRedirectReauth handler and the redirect result with the
  // tenant user will be returned.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedTenantId = 'TENANT_ID';
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // The expected credential.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      {'accessToken': 'ACCESS_TOKEN'});
  // The expected reauth via redirect Auth event for the current user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        // Return the expected result.
        var result = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.REAUTHENTICATE
        });
        return goog.Promise.resolve(result);
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(1);
  accountInfo['tenantId'] = expectedTenantId;
  var tenantUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID matching the dispatched one.
  tenantUser.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    tenantUser.enablePopupRedirect();
    // Get redirect result should return expected result with current user and
    // the expected credential.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          tenantUser, expectedCred, expectedAdditionalUserInfo,
          fireauth.constants.OperationType.REAUTHENTICATE, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromLinkWithRedirect_success_multipleUsers() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Both users should be subscribed.
        var manager = fireauth.AuthEventManager.getManager(
            config['authDomain'], config['apiKey'], config['appName']);
        assertTrue(manager.isSubscribed(user1));
        assertTrue(manager.isSubscribed(user2));
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve()).$times(2);
  mockControl.$replayAll();
  // The expected credential.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      {'accessToken': 'ACCESS_TOKEN'});
  // The expected link via redirect Auth event for the first user only.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  // Finish popup and redirect link should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        // User1 will handle this only.
        assertEquals(user1, this);
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        // Return the expected result.
        var result = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.LINK
        });
        asyncTestCase.signal();
        return goog.Promise.resolve(result);
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(3);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID matching the dispatched one.
  user1.setRedirectEventId('1234');
  var user2 = new fireauth.AuthUser(config, tokenResponse, accountInfo2);
  user2.setRedirectEventId('5678');
  // Enable popup and redirect on both.
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    user1.enablePopupRedirect();
    user2.enablePopupRedirect();
    // Get redirect result should return expected result with first user and
    // the expected credential.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          user1, expectedCred, expectedAdditionalUserInfo,
          fireauth.constants.OperationType.LINK, response);
      asyncTestCase.signal();
    });
    // This should also resolve to the same result.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          user1, expectedCred, expectedAdditionalUserInfo,
          fireauth.constants.OperationType.LINK, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromReauthenticateWithRedirect_success_multipleUsers() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Both users should be subscribed.
        var manager = fireauth.AuthEventManager.getManager(
            config['authDomain'], config['apiKey'], config['appName']);
        assertTrue(manager.isSubscribed(user1));
        assertTrue(manager.isSubscribed(user2));
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve()).$times(2);
  mockControl.$replayAll();
  // The expected credential.
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      {'accessToken': 'ACCESS_TOKEN'});
  // The expected reauth via redirect Auth event for the first user only.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  // Finish popup and redirect reauth should be called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      goog.testing.recordFunction(
          function(requestUri, sessionId, tenantId, postBody) {
            // User1 will handle this only.
            assertEquals(user1, this);
            assertEquals('http://www.example.com/#response', requestUri);
            assertEquals('SESSION_ID', sessionId);
            assertNull(postBody);
            // Return the expected result.
            var result = fireauth.object.makeReadonlyCopy({
              'user': this,
              'credential': expectedCred,
              'additionalUserInfo': expectedAdditionalUserInfo,
              'operationType': fireauth.constants.OperationType.REAUTHENTICATE
            });
            return goog.Promise.resolve(result);
          }));
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(1);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID matching the dispatched one.
  user1.setRedirectEventId('1234');
  var user2 = new fireauth.AuthUser(config, tokenResponse, accountInfo2);
  user2.setRedirectEventId('5678');
  // Enable popup and redirect on both.
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    user1.enablePopupRedirect();
    user2.enablePopupRedirect();
    // Get redirect result should return expected result with first user and
    // the expected credential.
    authEventManager.getRedirectResult().then(function(response) {
      assertEquals(
          1,
          fireauth.AuthUser.prototype.finishPopupAndRedirectReauth
              .getCallCount());
      fireauth.common.testHelper.assertUserCredentialResponse(
          user1, expectedCred, expectedAdditionalUserInfo,
          fireauth.constants.OperationType.REAUTHENTICATE, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromLinkWithRedirect_invalidUser() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // Successful link via redirect for a different user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      'OTHER_EVENT_ID',
      'http://www.example.com/#response',
      'SESSION_ID');
  // Since the expected Auth event already has an error, this should not be
  // called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectLink should not call due to UID mismatch!');
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  asyncTestCase.waitForSignals(1);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID that does not match the event's.
  user1.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user1.enablePopupRedirect();
    // Get redirect result should resolve to null as the user does not match the
    // redirect Auth event's. Keep in mind if the Auth event's user exists in
    // the current window, this should return that user in the response.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, null, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromReauthenticateWithRedirect_invalidUser() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // Successful reauth via redirect for a different user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      'OTHER_EVENT_ID',
      'http://www.example.com/#response',
      'SESSION_ID');
  // Since the expected Auth event already has an error, this should not be
  // called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectReauth should not call due to UID ' +
             'mismatch!');
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);
  asyncTestCase.waitForSignals(1);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID that does not match the event's.
  user1.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user1.enablePopupRedirect();
    // Get redirect result should resolve to null as the user does not match the
    // redirect Auth event's. Keep in mind if the Auth event's user exists in
    // the current window, this should return that user in the response.
    authEventManager.getRedirectResult().then(function(response) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, null, response);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromLinkWithRedirect_error() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
        asyncTestCase.signal();
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // The link with redirect expected error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // The expected Auth event with the redirect error.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      '1234',
      null,
      null,
      expectedError);
  // Since the expected Auth event already has an error, this should not be
  // called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectLink should not call due to event error!');
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(2);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID that matches Auth event's.
  user1.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user1.enablePopupRedirect();
    // Get redirect result should throw the expected error.
    var manager = fireauth.AuthEventManager.getManager(
       config['authDomain'], config['apiKey'], config['appName']);
    manager.getRedirectResult().thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      asyncTestCase.signal();
    });
  });
}


function testUser_returnFromReauthenticateWithRedirect_error() {
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
        asyncTestCase.signal();
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  mockControl.$replayAll();
  // The reauth with redirect expected error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // The expected Auth event with the redirect error.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      '1234',
      null,
      null,
      expectedError);
  // Since the expected Auth event already has an error, this should not be
  // called.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectReauth',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectReauth should not call due to event ' +
             'error!');
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  asyncTestCase.waitForSignals(1);
  var user1 = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Assume pending redirect event ID that matches Auth event's.
  user1.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user1.enablePopupRedirect();
    // Get redirect result should throw the expected error.
    var manager = fireauth.AuthEventManager.getManager(
       config['authDomain'], config['apiKey'], config['appName']);
    manager.getRedirectResult().thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      asyncTestCase.signal();
    });
  });
}


/**
 * Helper function to simulate session invalidation for a specific user public
 * operation.
 * @param {string} fn The user specific function name to test.
 * @param {!Array<*>} args The array of arguments to pass to apply on the user
 *     function.
 * @param {!fireauth.AuthError} invalidationError The specific invalidation
 *     error to simulate.
 */
function simulateSessionInvalidation(fn, args, invalidationError) {
  asyncTestCase.waitForSignals(1);
  // Event trackers.
  var stateChangeCounter = 0;
  var authChangeCounter = 0;
  var userInvalidateCounter = 0;
  var userDeletedCounter = 0;
  accountInfo['uid'] = '679';
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // Track token change.
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        authChangeCounter++;
      });
  // Track user invalidation.
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidateCounter++;
      });
  // Track user deletion.
  goog.events.listen(
      user, fireauth.UserEventType.USER_DELETED, function(event) {
        userDeletedCounter++;
      });
  // State change should be triggered.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  // Simulate invalidation error via getIdToken.
  // This error could be triggered via other RPC when old token is still cached,
  // but should behave the same as calls are chained to getIdToken and in this
  // case, it is easier to test with getIdToken error as all APIs call that
  // before calling other backend APIs.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        return goog.Promise.reject(invalidationError);
      });
  // Apply the user function with the provided arguments.
  user[fn].apply(user, args).thenCatch(function(error) {
    // Only user invalidation event should be triggered.
    assertEquals(0, stateChangeCounter);
    assertEquals(0, authChangeCounter);
    assertEquals(0, userDeletedCounter);
    assertEquals(1, userInvalidateCounter);
    // Expected error should be thrown.
    fireauth.common.testHelper.assertErrorEquals(invalidationError, error);
    // Retry. The cached error should be thrown.
    user[fn].apply(user, args).thenCatch(function(error) {
      // Should be cached and no new events triggered.
      assertEquals(0, stateChangeCounter);
      assertEquals(0, authChangeCounter);
      assertEquals(0, userDeletedCounter);
      assertEquals(1, userInvalidateCounter);
      // Expected error should be thrown.
      fireauth.common.testHelper.assertErrorEquals(invalidationError, error);
      asyncTestCase.signal();
    });
  });
}


function testUser_sessionInvalidation_reload_tokenExpired() {
  // Test user invalidation with token expired error on user.reload.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation('reload', [], invalidationError);
}


function testUser_sessionInvalidation_reload_userDisabled() {
  // Test user invalidation with user disabled error on user.reload.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation('reload', [], invalidationError);
}


function testUser_sessionInvalidation_getIdToken_tokenExpired() {
  // Test user invalidation with token expired error on user.getIdToken.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation('getIdToken', [], invalidationError);
}


function testUser_sessionInvalidation_getIdToken_userDisabled() {
  // Test user invalidation with user disabled error on user.getIdToken.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation('getIdToken', [], invalidationError);
}


function testUser_sessionInvalidation_link_tokenExpired() {
  // Test user invalidation with token expired error on user.link.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'link',
      [
        fireauth.GoogleAuthProvider.credential(null, 'googleAccessToken')
      ],
      invalidationError);
}


function testUser_sessionInvalidation_link_tokenExpired() {
  // Test user invalidation with token expired error on user.linkWithCredential.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'linkWithCredential',
      [
        fireauth.GoogleAuthProvider.credential(null, 'googleAccessToken')
      ],
      invalidationError);
}


function testUser_sessionInvalidation_link_userDisabled() {
  // Test user invalidation with user disabled error on user.link.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'link',
      [
        fireauth.GoogleAuthProvider.credential(null, 'googleAccessToken')
      ],
      invalidationError);
}


function testUser_sessionInvalidation_link_userDisabled() {
  // Test user invalidation with user disabled error on user.linkWithCredential.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'linkWithCredential',
      [
        fireauth.GoogleAuthProvider.credential(null, 'googleAccessToken')
      ],
      invalidationError);
}


function testUser_sessInvalid_linkAndRetrieveDataWithCredential_tokenExpired() {
  // Test user invalidation with token expired error on
  // user.linkAndRetrieveDataWithCredential.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'linkAndRetrieveDataWithCredential',
      [
        fireauth.GoogleAuthProvider.credential(null, 'googleAccessToken')
      ],
      invalidationError);
}


function testUser_sessInvalid_linkAndRetrieveDataWithCredential_userDisabled() {
  // Test user invalidation with user disabled error on
  // user.linkAndRetrieveDataWithCredential.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'linkAndRetrieveDataWithCredential',
      [
        fireauth.GoogleAuthProvider.credential(null, 'googleAccessToken')
      ],
      invalidationError);
}


function testUser_sessionInvalidation_updateEmail_tokenExpired() {
  // Test user invalidation with token expired error on user.updateEmail.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'updateEmail', ['user@example.com'], invalidationError);
}


function testUser_sessionInvalidation_updateEmail_userDisabled() {
  // Test user invalidation with user disabled error on user.updateEmail.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'updateEmail', ['user@example.com'], invalidationError);
}


function testUser_sessionInvalidation_updatePassword_tokenExpired() {
  // Test user invalidation with token expired error on user.updatePassword.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'updatePassword', ['password'], invalidationError);
}


function testUser_sessionInvalidation_updatePassword_userDisabled() {
  // Test user invalidation with user disabled error on user.updatePassword.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'updatePassword', ['password'], invalidationError);
}


function testUser_sessionInvalidation_updateProfile_tokenExpired() {
  // Test user invalidation with token expired error on user.updateProfile.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'updateProfile',
      [
        {
          displayName: 'John Doe'
        }
      ],
      invalidationError);
}


function testUser_sessionInvalidation_updateProfile_userDisabled() {
  // Test user invalidation with user disabled error on user.updateProfile.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'updateProfile',
      [
        {
          displayName: 'John Doe'
        }
      ],
      invalidationError);
}


function testUser_sessionInvalidation_unlink_tokenExpired() {
  // Test user invalidation with token expired error on user.unlink.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation('unlink', ['password'], invalidationError);
}


function testUser_sessionInvalidation_unlink_userDisabled() {
  // Test user invalidation with user disabled error on user.unlink.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation('unlink', ['password'], invalidationError);
}


function testUser_sessionInvalidation_delete_tokenExpired() {
  // Test user invalidation with token expired error on user.delete.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation('delete', [], invalidationError);
}


function testUser_sessionInvalidation_delete_userDisabled() {
  // Test user invalidation with user disabled error on user.delete.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation('delete', [], invalidationError);
}


function testUser_sessionInvalidation_linkWithPopup_tokenExpired() {
  // Test user invalidation with token expired error on user.linkWithPopup.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  var popupCalls  = 0;
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        popupCalls++;
        if (popupCalls > 1) {
          fail('The second call to linkWithPopup should fail without openin' +
              'g the popup!');
        }
        return expectedPopup;
      });
  simulateSessionInvalidation(
      'linkWithPopup', [new fireauth.GoogleAuthProvider()], invalidationError);
}


function testUser_sessionInvalidation_linkWithPopup_userDisabled() {
  // Test user invalidation with user disabled error on user.linkWithPopup.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      function(url, name, width, height) {
        return expectedPopup;
      });
  simulateSessionInvalidation(
      'linkWithPopup', [new fireauth.GoogleAuthProvider()], invalidationError);
}


function testUser_sessionInvalidation_linkWithRedirect_tokenExpired() {
  // Test user invalidation with token expired error on user.linkWithRedirect.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'linkWithRedirect',
      [new fireauth.GoogleAuthProvider()],
      invalidationError);
}


function testUser_sessionInvalidation_linkWithRedirect_userDisabled() {
  // Test user invalidation with user disabled error on user.linkWithRedirect.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'linkWithRedirect',
      [new fireauth.GoogleAuthProvider()],
      invalidationError);
}


function testUser_sessionInvalidation_sendEmailVerification_tokenExpired() {
  // Test user invalidation with token expired error on
  // user.sendEmailVerification.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'sendEmailVerification', [], invalidationError);
}


function testUser_sessionInvalidation_sendEmailVerification_userDisabled() {
  // Test user invalidation with user disabled error on
  // user.sendEmailVerification.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'sendEmailVerification', [], invalidationError);
}


function testUser_sessionInvalidation_linkWithPhoneNumber_tokenExpired() {
  // Test user invalidation with token expired error on
  // user.linkWithPhoneNumber.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  simulateSessionInvalidation(
      'linkWithPhoneNumber',
      [expectedPhoneNumber, appVerifier],
      invalidationError);
}


function testUser_sessionInvalidation_linkWithPhoneNumber_userDisabled() {
  // Test user invalidation with user disabled error on
  // user.linkWithPhoneNumber.
  var invalidationError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  simulateSessionInvalidation(
      'linkWithPhoneNumber',
      [expectedPhoneNumber, appVerifier],
      invalidationError);
}


function testUser_sessionInvalidation_otherRpc() {
  // Confirm if session invalidation thrown in other RPC, it is caught and
  // cached.
  // Expected session invalidation error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  // Event trackers.
  var stateChangeCounter = 0;
  var authChangeCounter = 0;
  var userInvalidateCounter = 0;
  var userDeletedCounter = 0;
  // Track RPC call.
  rpcTriggered = 0;
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  // Track token change.
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        authChangeCounter++;
      });
  // Track user invalidation.
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidateCounter++;
      });
  // Track user deletion.
  goog.events.listen(
      user, fireauth.UserEventType.USER_DELETED, function(event) {
        userDeletedCounter++;
      });
  // State change should be triggered.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  // Simulate error in this RPC.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        rpcTriggered++;
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(1);
  // This should throw expected error. No event should trigger.
  user.reload().thenCatch(function(error) {
    // RPC called.
    assertEquals(1, rpcTriggered);
    // Only user invalidation event should be triggered.
    assertEquals(0, stateChangeCounter);
    assertEquals(0, authChangeCounter);
    assertEquals(0, userDeletedCounter);
    assertEquals(1, userInvalidateCounter);
    // Expected error should be thrown.
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // This will succeed with only state change triggering.
    user.reload().thenCatch(function() {
      // Should be cached and no new events triggered.
      assertEquals(0, stateChangeCounter);
      assertEquals(0, authChangeCounter);
      assertEquals(0, userDeletedCounter);
      assertEquals(1, userInvalidateCounter);
      // RPC should not be called again.
      assertEquals(1, rpcTriggered);
      // Expected error should be thrown.
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      asyncTestCase.signal();
    });
  });
}


function testUser_reload_nonSessionInvalidationErrors() {
  // Confirm non session invalidation errors are ignored and no error caching
  // happens in that case.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Whether to trigger the error.
  var triggerError = true;
  // Track state changed
  var stateChangeCounter = 0;
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  // Listen to state changes.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  // No other events should be triggered.
  assertNoTokenEvents(user);
  assertNoUserInvalidatedEvents(user);
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function(idToken) {
        // Throw error initially.
        if (triggerError) {
          return goog.Promise.reject(expectedError);
        }
        // Resolve on next call.
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  asyncTestCase.waitForSignals(1);
  // This should throw expected error. No event should trigger.
  user.reload().thenCatch(function(error) {
    assertEquals(0, stateChangeCounter);
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // Do not trigger error on next call.
    triggerError = false;
    // This will succeed with only state change triggering.
    user.reload().then(function() {
      assertEquals(1, stateChangeCounter);
      asyncTestCase.signal();
    });
  });
}


function testUser_proactiveRefresh_startAndStop() {
  // Test proactive token refresh called with expected configurations.
  // Record getIdToken calls.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'getIdToken',
      goog.testing.recordFunction());
  var proactiveRefreshInstance = mockControl.createStrictMock(
      fireauth.ProactiveRefresh);
  var proactiveRefreshConstructor = mockControl.createConstructorMock(
      fireauth, 'ProactiveRefresh');
  // Listen to proactive refresh initialization and confirm arguments passed.
  proactiveRefreshConstructor(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      fireauth.TokenRefreshTime.RETRIAL_MIN_WAIT,
      fireauth.TokenRefreshTime.RETRIAL_MAX_WAIT,
      false).$does(
          function(operation, retryPolicy, getWaitDuration, lowerBound,
                   upperBound, runsInBackground) {
            // Confirm operation forces refresh of token.
            assertEquals(
                0, fireauth.AuthUser.prototype.getIdToken.getCallCount());
            // Run operation.
            operation();
            // getIdToken(true) should be called underneath.
            assertEquals(
                1, fireauth.AuthUser.prototype.getIdToken.getCallCount());
            assertTrue(
                fireauth.AuthUser.prototype.getIdToken.getLastCall()
                    .getArgument(0));
            // Confirm retry policy only returns true for network errors.
            assertTrue(retryPolicy(new fireauth.AuthError(
                fireauth.authenum.Error.NETWORK_REQUEST_FAILED)));
            // Do not retry for all other common errors.
            assertFalse(retryPolicy(new fireauth.AuthError(
                fireauth.authenum.Error.INTERNAL_ERROR)));
            assertFalse(retryPolicy(new fireauth.AuthError(
                fireauth.authenum.Error.TOKEN_EXPIRED)));
            assertFalse(retryPolicy(new fireauth.AuthError(
                fireauth.authenum.Error.USER_DISABLED)));
            // Confirm getWaitDuration returns expected value.
            assertEquals(
                3600 * 1000 - fireauth.TokenRefreshTime.OFFSET_DURATION,
                getWaitDuration());
            return proactiveRefreshInstance;
          }).$once();
  // Confirm proactive refresh start and stop called.
  proactiveRefreshInstance.isRunning().$returns(false);
  proactiveRefreshInstance.start().$once();
  proactiveRefreshInstance.stop().$once();
  mockControl.$replayAll();

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  user.startProactiveRefresh();
  user.stopProactiveRefresh();
}


function testUser_proactiveRefresh_externalTokenRefresh() {
  // Test proactive token refresh is reset on each external token refresh call.
  var proactiveRefreshInstance = mockControl.createStrictMock(
      fireauth.ProactiveRefresh);
  var proactiveRefreshConstructor = mockControl.createConstructorMock(
      fireauth, 'ProactiveRefresh');
  proactiveRefreshConstructor(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      fireauth.TokenRefreshTime.RETRIAL_MIN_WAIT,
      fireauth.TokenRefreshTime.RETRIAL_MAX_WAIT,
      false).$returns(proactiveRefreshInstance);
  proactiveRefreshInstance.isRunning().$returns(false);
  proactiveRefreshInstance.start();
  // Token change event.
  proactiveRefreshInstance.isRunning().$returns(true);
  proactiveRefreshInstance.stop();
  proactiveRefreshInstance.start();
  // Second token change event.
  proactiveRefreshInstance.isRunning().$returns(true);
  proactiveRefreshInstance.stop();
  proactiveRefreshInstance.start();
  mockControl.$replayAll();

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  user.startProactiveRefresh();
  // Force an external token refresh and confirm the proactive refresh is reset.
  user.dispatchEvent(
      fireauth.UserEventType.TOKEN_CHANGED);
  // Force another token change event.
  user.dispatchEvent(
      fireauth.UserEventType.TOKEN_CHANGED);
}


function testUser_proactiveRefresh_destroy() {
  // Test proactive token refresh stopped on user destruction.
  var proactiveRefreshInstance = mockControl.createStrictMock(
      fireauth.ProactiveRefresh);
  var proactiveRefreshConstructor = mockControl.createConstructorMock(
      fireauth, 'ProactiveRefresh');
  proactiveRefreshConstructor(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      fireauth.TokenRefreshTime.RETRIAL_MIN_WAIT,
      fireauth.TokenRefreshTime.RETRIAL_MAX_WAIT,
      false).$returns(proactiveRefreshInstance);
  proactiveRefreshInstance.isRunning().$returns(false);
  proactiveRefreshInstance.start().$once();
  // Should be called on user.destroy().
  proactiveRefreshInstance.stop().$once();
  mockControl.$replayAll();

  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo2);
  user.startProactiveRefresh();
  // This should stop proactive refresh.
  user.destroy();
}


function testLinkWithPhoneNumber_success() {
  app = firebase.initializeApp(config1, config1['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  var expectedVerificationId = 'VERIFICATION_ID';
  var expectedCode = '123456';
  var expectedCredential = fireauth.PhoneAuthProvider.credential(
      expectedVerificationId, expectedCode);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  // Expected promise to be returned by linkAndRetrieveDataWithCredential.
  var expectedPromise = new goog.Promise(function(resolve, reject) {});
  // Phone Auth provider instance.
  var phoneAuthProviderInstance =
      mockControl.createStrictMock(fireauth.PhoneAuthProvider);
  // Phone Auth provider constructor mock.
  var phoneAuthProviderConstructor = mockControl.createConstructorMock(
      fireauth, 'PhoneAuthProvider');
  getAccountInfoByIdToken(tokenResponse['idToken']).$returns(
      goog.Promise.resolve(getAccountInfoResponse)).$once();
  // Provider instance should be initialized with the expected Auth instance
  // and return the expected phone Auth provider instance.
  phoneAuthProviderConstructor(auth)
      .$returns(phoneAuthProviderInstance).$once();
  // verifyPhoneNumber called on provider instance with the expected phone
  // number and appVerifier. This would resolve with the expected verification
  // ID.
  phoneAuthProviderInstance.verifyPhoneNumber(
      expectedPhoneNumber, appVerifier)
      .$returns(goog.Promise.resolve(expectedVerificationId)).$once();
  // Code confirmation should call linkWithCredential with the
  // expected credential.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'linkWithCredential',
      goog.testing.recordFunction(function(cred) {
        // Confirm expected credential passed.
        assertObjectEquals(
            expectedCredential.toPlainObject(),
            cred.toPlainObject());
        // Return expected promise.
        return expectedPromise;
      }));
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.linkWithPhoneNumber(expectedPhoneNumber, appVerifier)
      .then(function(confirmationResult) {
        // Confirmation result returned should contain expected verification ID.
        assertEquals(
            expectedVerificationId, confirmationResult['verificationId']);
        // Code confirmation should return the same response as the underlying
        // linkWithCredential.
        assertEquals(expectedPromise, confirmationResult.confirm(expectedCode));
        // Confirm linkWithCredential called once.
        assertEquals(
            1,
            fireauth.AuthUser.prototype.linkWithCredential
                .getCallCount());
        // Confirm linkWithCredential is bound to current user.
        assertEquals(
            user,
            fireauth.AuthUser.prototype.linkWithCredential
                .getLastCall().getThis());
        asyncTestCase.signal();
      });
}


function testLinkWithPhoneNumber_error_noAuthInstance() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'No firebase.auth.Auth instance is available for the Firebase App ' +
      '\'' + config1['appName'] + '\'!');
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(tokenResponse['idToken']).$returns(
      goog.Promise.resolve(getAccountInfoResponse)).$once();
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // This should fail since no corresponding Auth instance is found.
  user.linkWithPhoneNumber(expectedPhoneNumber, appVerifier)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        asyncTestCase.signal();
      });
}


function testLinkWithPhoneNumber_error_alreadyLinked() {
  app = firebase.initializeApp(config1, config1['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.PROVIDER_ALREADY_LINKED);
  // Add a phone Auth provider to the current user to trigger the provider
  // already linked error.
  getAccountInfoResponse['users'][0]['providerUserInfo']
      .push(getAccountInfoResponsePhoneAuthProviderData);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(tokenResponse['idToken']).$returns(
      goog.Promise.resolve(getAccountInfoResponse)).$once();
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // No provider data linked yet.
  assertEquals(0, user.providerData.length);
  // This should fail since there is already a phone number provider on the
  // current user.
  user.linkWithPhoneNumber(expectedPhoneNumber, appVerifier)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        asyncTestCase.signal();
      });
}


function testReauthenticateWithPhoneNumber_success() {
  app = firebase.initializeApp(config1, config1['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  var expectedVerificationId = 'VERIFICATION_ID';
  var expectedCode = '123456';
  var expectedCredential = fireauth.PhoneAuthProvider.credential(
      expectedVerificationId, expectedCode);
  // Expected promise to be returned by reauthenticateWithCredential.
  var expectedPromise = new goog.Promise(function(resolve, reject) {});
  // Phone Auth provider instance.
  var phoneAuthProviderInstance =
      mockControl.createStrictMock(fireauth.PhoneAuthProvider);
  // Phone Auth provider constructor mock.
  var phoneAuthProviderConstructor = mockControl.createConstructorMock(
      fireauth, 'PhoneAuthProvider');
  // Provider instance should be initialized with the expected Auth instance
  // and return the expected phone Auth provider instance.
  phoneAuthProviderConstructor(auth)
      .$returns(phoneAuthProviderInstance).$once();
  // verifyPhoneNumber called on provider instance with the expected phone
  // number and appVerifier. This would resolve with the expected verification
  // ID.
  phoneAuthProviderInstance.verifyPhoneNumber(
      expectedPhoneNumber, appVerifier)
      .$returns(goog.Promise.resolve(expectedVerificationId)).$once();
  // Code confirmation should call reauthenticateWithCredential
  // with the expected credential.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reauthenticateWithCredential',
      goog.testing.recordFunction(function(cred) {
        // Confirm expected credential passed.
        assertObjectEquals(
            expectedCredential.toPlainObject(),
            cred.toPlainObject());
        // Return expected promise.
        return expectedPromise;
      }));
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.reauthenticateWithPhoneNumber(expectedPhoneNumber, appVerifier)
      .then(function(confirmationResult) {
        // Confirmation result returned should contain expected verification ID.
        assertEquals(
            expectedVerificationId, confirmationResult['verificationId']);
        // Code confirmation should return the same response as the underlying
        // reauthenticateWithCredential.
        assertEquals(expectedPromise, confirmationResult.confirm(expectedCode));
        // Confirm reauthenticateWithCredential called once.
        assertEquals(
            1,
            fireauth.AuthUser.prototype
                .reauthenticateWithCredential.getCallCount());
        // Confirm reauthenticateWithCredential is bound to current user.
        assertEquals(
            user,
            fireauth.AuthUser.prototype
                .reauthenticateWithCredential
                .getLastCall()
                .getThis());
        asyncTestCase.signal();
      });
}


function testReauthenticateWithPhoneNumber_success_skipInvalidation() {
  // Test that reauthenticateWithPhoneNumber will be allowed to run after token
  // expiration.
  app = firebase.initializeApp(config1, config1['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  // Expected token expired error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  var expectedVerificationId = 'VERIFICATION_ID';
  var expectedCode = '123456';
  var expectedCredential = fireauth.PhoneAuthProvider.credential(
      expectedVerificationId, expectedCode);
  // Expected promise to be returned by reauthenticateWithCredential.
  var expectedPromise = new goog.Promise(function(resolve, reject) {});
  // Mock StsTokenManager.prototype.getToken.
  var getToken = mockControl.createMethodMock(
      fireauth.StsTokenManager.prototype, 'getToken');
  // Phone Auth provider instance.
  var phoneAuthProviderInstance =
      mockControl.createStrictMock(fireauth.PhoneAuthProvider);
  // Phone Auth provider constructor mock.
  var phoneAuthProviderConstructor = mockControl.createConstructorMock(
      fireauth, 'PhoneAuthProvider');
  // Initial call to getToken should return token expired.
  getToken(true).$does(function(opt_forceRefresh) {
    return goog.Promise.reject(expectedError);
  }).$once();
  // Provider instance should be initialized with the expected Auth instance
  // and return the expected phone Auth provider instance.
  phoneAuthProviderConstructor(auth)
      .$returns(phoneAuthProviderInstance).$once();
  // verifyPhoneNumber called on provider instance with the expected phone
  // number and appVerifier. This would resolve with the expected verification
  // ID.
  phoneAuthProviderInstance.verifyPhoneNumber(
      expectedPhoneNumber, appVerifier)
      .$returns(goog.Promise.resolve(expectedVerificationId)).$once();
  // Code confirmation should call reauthenticateWithCredential
  // with the expected credential.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reauthenticateWithCredential',
      goog.testing.recordFunction(function(cred) {
        // Confirm expected credential passed.
        assertObjectEquals(
            expectedCredential.toPlainObject(),
            cred.toPlainObject());
        // Return expected promise.
        return expectedPromise;
      }));
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  user.getIdToken(true).thenCatch(function(error) {
    // Expected token expired error.
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    // This should be allowed to run even though the token is expired.
    // All other non reauth operation will fail immediately and throw the cached
    // error.
    return user.reauthenticateWithPhoneNumber(expectedPhoneNumber, appVerifier);
  }).then(function(confirmationResult) {
    // Confirmation result returned should contain expected verification ID.
    assertEquals(
        expectedVerificationId, confirmationResult['verificationId']);
    // Code confirmation should return the same response as the underlying
    // reauthenticateWithCredential.
    assertEquals(expectedPromise, confirmationResult.confirm(expectedCode));
    // Confirm reauthenticateWithCredential called once.
    assertEquals(
        1,
        fireauth.AuthUser.prototype.reauthenticateWithCredential
            .getCallCount());
    // Confirm reauthenticateWithCredential is bound to current
    // user.
    assertEquals(
        user,
        fireauth.AuthUser.prototype.reauthenticateWithCredential
            .getLastCall().getThis());
    asyncTestCase.signal();
  });
}


function testReauthenticateWithPhoneNumber_error_noAuthInstance() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'No firebase.auth.Auth instance is available for the Firebase App ' +
      '\'' + config1['appName'] + '\'!');

  asyncTestCase.waitForSignals(1);
  var user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  // This should fail since no corresponding Auth instance is found.
  user.reauthenticateWithPhoneNumber(expectedPhoneNumber, appVerifier)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        asyncTestCase.signal();
      });
}


function testUser_customLocaleChanges() {
  // Listen to all custom locale header calls on RpcHandler.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateCustomLocaleHeader',
      goog.testing.recordFunction());
  // Dummy event dispatchers.
  var dispatcher1 = createEventDispatcher();
  var dispatcher2 = createEventDispatcher();
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);

  // Set language to German.
  user.setLanguageCode('de');
  // User language should be updated.
  assertEquals('de', user.getLanguageCode());
  // Rpc handler language should be updated.
  assertEquals(
      1, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertEquals(
      'de',
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));

  // Set language to null.
  user.setLanguageCode(null);
  assertEquals(
      2, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertNull(
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));
  assertNull(user.getLanguageCode());

  // Set dispatcher1 as language code dispatcher.
  user.setLanguageCodeChangeDispatcher(dispatcher1);
  dispatcher1.dispatchEvent(new fireauth.Auth.LanguageCodeChangeEvent('fr'));
  dispatcher2.dispatchEvent(new fireauth.Auth.LanguageCodeChangeEvent('ru'));
  // Only first dispatcher should be detected.
  assertEquals(
      3, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertEquals(
      'fr',
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));
  assertEquals('fr', user.getLanguageCode());

  // Set dispatcher2 as language code dispatcher.
  user.setLanguageCodeChangeDispatcher(dispatcher2);
  dispatcher1.dispatchEvent(new fireauth.Auth.LanguageCodeChangeEvent('fr'));
  dispatcher2.dispatchEvent(new fireauth.Auth.LanguageCodeChangeEvent('ru'));
  // Only second dispatcher should be detected.
  assertEquals(
      4, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertEquals(
      'ru',
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));
  assertEquals('ru', user.getLanguageCode());

  // Remove all dispatchers.
  user.setLanguageCodeChangeDispatcher(null);
  dispatcher1.dispatchEvent(new fireauth.Auth.LanguageCodeChangeEvent('fr'));
  dispatcher2.dispatchEvent(new fireauth.Auth.LanguageCodeChangeEvent('ru'));
  // No additional events detected.
  assertEquals(
      4, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  // Last set language remains.
  assertEquals('ru', user.getLanguageCode());

  // Set dispatcher2 as language code change dispatcher and destroy the user.
  user.setLanguageCodeChangeDispatcher(dispatcher2);
  user.destroy();
  dispatcher2.dispatchEvent(new fireauth.Auth.LanguageCodeChangeEvent('ar'));
  // No additional events detected.
  assertEquals(
      4, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
}


function testUser_emulatorConfigChanges() {
  // Listen to all custom locale header calls on RpcHandler.
  stubs.replace(
    fireauth.RpcHandler.prototype,
    'updateEmulatorConfig',
    goog.testing.recordFunction());
  // Dummy event dispatchers.
  var dispatcher1 = createEventDispatcher();
  var dispatcher2 = createEventDispatcher();
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);
  var emulatorConfig = {
    hostname: 'emulator.test.domain',
    port: 1234
  };

  var otherEmulatorConfig = {
    hostname: 'other.emulator.host',
    port: 9876
  };

  // Set emulator config.
  user.setEmulatorConfig(emulatorConfig);
  // Rpc handler emulator config should be updated.
  assertEquals(
    1,
    fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount()
  );
  assertObjectEquals(
    emulatorConfig,
    fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
      .getArgument(0)
  );

  // Set dispatcher1 as language code dispatcher.
  user.setEmulatorConfigChangeDispatcher(dispatcher1);
  dispatcher1.dispatchEvent(
    new fireauth.Auth.EmulatorConfigChangeEvent(emulatorConfig));
  dispatcher2.dispatchEvent(
    new fireauth.Auth.EmulatorConfigChangeEvent(otherEmulatorConfig));
  // Only first dispatcher should be detected.
  assertEquals(
    2,
    fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount()
  );
  assertObjectEquals(
    emulatorConfig,
    fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
      .getArgument(0)
  );
}


function testUser_frameworkLoggingChanges() {
  // Helper function to get the client version for the test.
  var getVersion = function(frameworks) {
    return fireauth.util.getClientVersion(
        fireauth.util.ClientImplementation.JSCORE, firebase.SDK_VERSION,
        frameworks);
  };
  // Pipe through all framework IDs.
  stubs.replace(
      fireauth.util,
      'getFrameworkIds',
      function(providedFrameworks) {
        return providedFrameworks;
      });
  // Listen to all client version header update calls on RpcHandler.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateClientVersion',
      goog.testing.recordFunction());
  // Dummy event dispatchers.
  var dispatcher1 = createEventDispatcher();
  var dispatcher2 = createEventDispatcher();
  user = new fireauth.AuthUser(config1, tokenResponse, accountInfo);

  // Set framework to version1.
  user.setFramework(['v1']);
  // Framework version should be updated.
  assertArrayEquals(['v1'], user.getFramework());
  // Rpc handler language should be updated.
  assertEquals(
      1, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());
  assertEquals(
      getVersion(['v1']),
      fireauth.RpcHandler.prototype.updateClientVersion.getLastCall()
          .getArgument(0));

  // Set framework to empty array.
  user.setFramework([]);
  assertEquals(
      2, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());
  assertEquals(
      getVersion([]),
      fireauth.RpcHandler.prototype.updateClientVersion.getLastCall()
          .getArgument(0));
  assertArrayEquals([], user.getFramework());

  // Set dispatcher1 as framework change dispatcher.
  user.setFrameworkChangeDispatcher(dispatcher1);
  dispatcher1.dispatchEvent(
      new fireauth.Auth.FrameworkChangeEvent(['v1', 'v2']));
  dispatcher2.dispatchEvent(
      new fireauth.Auth.FrameworkChangeEvent(['v3', 'v4']));
  // Only first dispatcher should be detected.
  assertEquals(
      3, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());
  assertEquals(
      getVersion(['v1', 'v2']),
      fireauth.RpcHandler.prototype.updateClientVersion.getLastCall()
          .getArgument(0));
  assertArrayEquals(['v1', 'v2'], user.getFramework());

  // Set dispatcher2 as framework change dispatcher.
  user.setFrameworkChangeDispatcher(dispatcher2);
  dispatcher1.dispatchEvent(
      new fireauth.Auth.FrameworkChangeEvent(['v1', 'v2']));
  dispatcher2.dispatchEvent(
      new fireauth.Auth.FrameworkChangeEvent(['v3', 'v4']));
  // Only second dispatcher should be detected.
  assertEquals(
      4, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());
  assertEquals(
      getVersion(['v3', 'v4']),
      fireauth.RpcHandler.prototype.updateClientVersion.getLastCall()
          .getArgument(0));
  assertArrayEquals(['v3', 'v4'], user.getFramework());

  // Remove all dispatchers.
  user.setFrameworkChangeDispatcher(null);
  dispatcher1.dispatchEvent(
      new fireauth.Auth.FrameworkChangeEvent(['v1', 'v2']));
  dispatcher2.dispatchEvent(
      new fireauth.Auth.FrameworkChangeEvent(['v3', 'v4']));
  // No additional events detected.
  assertEquals(
      4, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());
  // Last framework list remains.
  assertArrayEquals(['v3', 'v4'], user.getFramework());

  // Set dispatcher2 as framework change dispatcher and destroy the user.
  user.setFrameworkChangeDispatcher(dispatcher2);
  user.destroy();
  dispatcher2.dispatchEvent(
      new fireauth.Auth.FrameworkChangeEvent(['v1', 'v2']));
  // No additional events detected.
  assertEquals(
      4, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());
}


function testUserMetadata() {
  // Test initialization.
  var userMetadata1 = new fireauth.UserMetadata(createdAt, lastLoginAt);
  assertEquals(
      fireauth.util.utcTimestampToDateString(lastLoginAt),
      userMetadata1['lastSignInTime']);
  assertEquals(
      fireauth.util.utcTimestampToDateString(createdAt),
      userMetadata1['creationTime']);
  // Confirm read-only.
  userMetadata1['lastSignInTime'] = 'bla';
  userMetadata1['creationTime'] = 'bla';
  assertEquals(
      fireauth.util.utcTimestampToDateString(lastLoginAt),
      userMetadata1['lastSignInTime']);
  assertEquals(
      fireauth.util.utcTimestampToDateString(createdAt),
      userMetadata1['creationTime']);

  var userMetadata2 = new fireauth.UserMetadata(createdAt);
  assertEquals(
      fireauth.util.utcTimestampToDateString(createdAt),
      userMetadata2['creationTime']);
  assertNull(userMetadata2['lastSignInTime']);

  var userMetadata3 = new fireauth.UserMetadata();
  assertNull(userMetadata3['creationTime']);
  assertNull(userMetadata3['lastSignInTime']);

  // Test cloning.
  assertObjectEquals(userMetadata1, userMetadata1.clone());
  assertObjectEquals(userMetadata2, userMetadata2.clone());
  assertObjectEquals(userMetadata3, userMetadata3.clone());

  // Test toPlainObject.
  assertObjectEquals(
      {
        'lastLoginAt': lastLoginAt,
        'createdAt': createdAt
      },
      userMetadata1.toPlainObject());
  assertObjectEquals(
      {
        'lastLoginAt': null,
        'createdAt': createdAt
      },
      userMetadata2.toPlainObject());
  assertObjectEquals(
      {
        'lastLoginAt': null,
        'createdAt': null
      },
      userMetadata3.toPlainObject());
}


/**
 * Tests when a 2-factor user reauthenticates with a first factor credential
 * and then recovers with a second factor assertion.
 * @return {!goog.Promise<void>} A promise that resolves when the test
 *     completes.
 */
function testReauthenticateWithCredential_multiFactor_success() {
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  app = firebase.initializeApp(config, config['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  // Second factor requirement error.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var stateChangeCounter = 0;
  var tokenChangeCounter = 0;
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  var mockCredential = mockControl.createStrictMock(
      fireauth.AuthCredential);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  // Simulate first factor re-auth triggers second factor requirement.
  mockCredential.matchIdTokenWithUid(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, uid) {
        assertObjectEquals(user.getRpcHandler(), rpcHandler);
        assertEquals(user['uid'], uid);
        return goog.Promise.reject(serverResponseError);
      });
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(user.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      });
  // User reload will return the enrolled factors.
  getAccountInfoByIdToken(multiFactorTokenResponse.idToken)
      .$once()
      .$returns(goog.Promise.resolve(multiFactorGetAccountInfoResponse));
  mockControl.$replayAll();

  // Simulate user who upgraded to a second factor on a different device and is
  // re-authenticated in the current stale session.
  var user = new fireauth.AuthUser(
      config1, nonMultiFactorTokenResponse, accountInfo);
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        tokenChangeCounter++;
      });
  assertNoUserInvalidatedEvents(user);
  asyncTestCase.waitForSignals(1);

  return user.reauthenticateAndRetrieveDataWithCredential(mockCredential)
      .then(fail, function(error) {
        // Error should be intercepted and repackaged.
        assertEquals('auth/multi-factor-auth-required', error['code']);
        assertEquals(auth, error.resolver.auth);
        assertEquals(0, tokenChangeCounter);
        assertEquals(0, stateChangeCounter);
        return error.resolver.resolveSignIn(mockAssertion);
      })
      .then(function(result) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            user,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            fireauth.constants.OperationType.REAUTHENTICATE,
            result);

        // Enrolled factors updated.
        assertArrayEquals(
            [
              fireauth.MultiFactorInfo.fromServerResponse(
                  multiFactorGetAccountInfoResponse['users'][0].mfaInfo[0]),
              fireauth.MultiFactorInfo.fromServerResponse(
                  multiFactorGetAccountInfoResponse['users'][0].mfaInfo[1])
            ],
            user.multiFactor.enrolledFactors);
        assertEquals('defaultUserId', user['uid']);
        // Token and state change triggered.
        assertEquals(1, stateChangeCounter);
        assertEquals(1, tokenChangeCounter);
        return user.getIdToken();
      })
      .then(function(idToken) {
        // Confirm tokens updated.
        assertEquals(multiFactorTokenResponse.idToken, idToken);
        assertEquals('MULTI_FACTOR_REFRESH_TOKEN', user.refreshToken);
        asyncTestCase.signal();
      });
}


/**
 * Tests when a 2-factor user reauthenticates with a first factor credential
 * and then fails to recover with a second factor assertion.
 * @return {!goog.Promise<void>} A promise that resolves when the test
 *     completes.
 */
function testReauthenticateWithCredential_multiFactor_assertionError() {
  // Expected assertion processing error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CODE_EXPIRED);
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  app = firebase.initializeApp(config, config['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  // Second factor requirement error.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var stateChangeCounter = 0;
  var tokenChangeCounter = 0;
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  var mockCredential = mockControl.createStrictMock(
      fireauth.AuthCredential);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  // Simulate first factor re-auth triggers second factor requirement.
  mockCredential.matchIdTokenWithUid(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, uid) {
        assertObjectEquals(user.getRpcHandler(), rpcHandler);
        assertEquals(user['uid'], uid);
        return goog.Promise.reject(serverResponseError);
      });
  // Second factor assertion processing fails.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(user.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.reject(expectedError);
      });
  mockControl.$replayAll();

  // Simulate user who upgraded to a second factor on a different device and is
  // re-authenticated in the current stale session.
  var user = new fireauth.AuthUser(
      config1, nonMultiFactorTokenResponse, accountInfo);
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        tokenChangeCounter++;
      });
  assertNoUserInvalidatedEvents(user);
  asyncTestCase.waitForSignals(1);

  return user.reauthenticateAndRetrieveDataWithCredential(mockCredential)
      .then(fail, function(error) {
        // Error should be intercepted and repackaged.
        assertEquals('auth/multi-factor-auth-required', error['code']);
        assertEquals(auth, error.resolver.auth);
        assertEquals(0, tokenChangeCounter);
        assertEquals(0, stateChangeCounter);
        return error.resolver.resolveSignIn(mockAssertion);
      })
      .then(fail, function(error) {
        // Assertion error should be caught.
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        // Token and state change should not be triggered.
        assertEquals(0, stateChangeCounter);
        assertEquals(0, tokenChangeCounter);
        asyncTestCase.signal();
      });
}


/**
 * Tests when a 2-factor user with an expired token re-authenticates.
 * @return {!goog.Promise<void>} A promise that resolves when the test
 *     completes.
 */
function testUser_getIdTokenResult_expiredToken_reauth_multiFactor() {
  // Test when token is expired and user is reauthenticated.
  // User should be validated after, even though user invalidation event is
  // triggered.
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  app = firebase.initializeApp(config, config['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  multiFactorTokenResponse['accessToken'] = multiFactorTokenResponse.idToken;
  // Second factor requirement error.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  // Expected token expired error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  // Event trackers.
  var stateChangeCounter = 0;
  var authChangeCounter = 0;
  var userInvalidateCounter = 0;
  var mockCredential = mockControl.createStrictMock(
      fireauth.AuthCredential);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  var getToken = mockControl.createMethodMock(
      fireauth.StsTokenManager.prototype, 'getToken');
  getToken(true).$once().$does(function() {
    return goog.Promise.reject(expectedError);
  });
  // Simulate first factor re-auth triggers second factor requirement.
  mockCredential.matchIdTokenWithUid(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, uid) {
        assertObjectEquals(user.getRpcHandler(), rpcHandler);
        assertEquals(user['uid'], uid);
        return goog.Promise.reject(serverResponseError);
      });
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(user.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      });
  getToken(undefined).$once().$does(function() {
    return goog.Promise.resolve(multiFactorTokenResponse);
  });
  // User reload will return the enrolled factors.
  getAccountInfoByIdToken(multiFactorTokenResponse.idToken)
      .$once()
      .$returns(goog.Promise.resolve(multiFactorGetAccountInfoResponse));
  getToken(undefined).$once().$does(function() {
    return goog.Promise.resolve(multiFactorTokenResponse);
  });
  mockControl.$replayAll();

  user = new fireauth.AuthUser(
      config, nonMultiFactorTokenResponse, accountInfo);
  // Track token changes.
  goog.events.listen(
      user, fireauth.UserEventType.TOKEN_CHANGED, function(event) {
        authChangeCounter++;
      });
  // Track user invalidation events.
  goog.events.listen(
      user, fireauth.UserEventType.USER_INVALIDATED, function(event) {
        userInvalidateCounter++;
      });
  // State change should be triggered.
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  asyncTestCase.waitForSignals(1);

  // Call getIdToken, it should trigger the expected error.
  return user.getIdToken(true)
      .then(fail, function(error) {
        // Refresh token nullified.
        assertEquals(
            nonMultiFactorTokenResponse['refreshToken'], user['refreshToken']);
        // Confirm expected error.
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        // No state change.
        assertEquals(0, stateChangeCounter);
        // No Auth change.
        assertEquals(0, authChangeCounter);
        // User invalidated change.
        assertEquals(1, userInvalidateCounter);
        // Call again, it should not trigger any other event.
        return user.getIdToken();
      }).then(fail, function(error) {
        // Resolves with same error.
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        // No additional change.
        assertEquals(0, stateChangeCounter);
        assertEquals(0, authChangeCounter);
        assertEquals(1, userInvalidateCounter);
        // Assume user reauthenticated.
        return user.reauthenticateAndRetrieveDataWithCredential(mockCredential);
      }).then(fail, function(error) {
        // Error should be intercepted and repackaged.
        assertEquals('auth/multi-factor-auth-required', error['code']);
        assertEquals(auth, error.resolver.auth);
        // No additional event triggered.
        assertEquals(0, stateChangeCounter);
        assertEquals(0, authChangeCounter);
        assertEquals(1, userInvalidateCounter);
        return error.resolver.resolveSignIn(mockAssertion);
      }).then(function(result) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            user,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            fireauth.constants.OperationType.REAUTHENTICATE,
            result);

        // Enrolled factors updated.
        assertArrayEquals(
            [
              fireauth.MultiFactorInfo.fromServerResponse(
                  multiFactorGetAccountInfoResponse['users'][0].mfaInfo[0]),
              fireauth.MultiFactorInfo.fromServerResponse(
                  multiFactorGetAccountInfoResponse['users'][0].mfaInfo[1])
            ],
            user.multiFactor.enrolledFactors);

        // Set via reauthentication.
        assertEquals(
            multiFactorTokenResponse['refreshToken'], user['refreshToken']);
        // Auth token change triggered.
        assertEquals(1, authChangeCounter);
        // State change triggers, after reauthentication.
        assertEquals(1, stateChangeCounter);
        // Shouldn't trigger again.
        assertEquals(1, userInvalidateCounter);
        // This should return cached token set via reauthentication.
        return user.getIdToken();
      }).then(function(idToken) {
        // Shouldn't trigger again.
        assertEquals(1, authChangeCounter);
        assertEquals(1, stateChangeCounter);
        assertEquals(1, userInvalidateCounter);
        // Refresh token should be updated along with ID token.
        assertEquals(
            multiFactorTokenResponse['idToken'], idToken);
        assertEquals(
            multiFactorTokenResponse['refreshToken'], user['refreshToken']);
        asyncTestCase.signal();
      });
}


/**
 * Tests when a 2-factor user re-authenticates and the second factor assertion
 * returns tokens for a different user.
 * @return {!goog.Promise<void>} A promise that resolves when the test
 *     completes.
 */
function testReauthenticateWithCredential_multiFactor_mismatchError() {
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  app = firebase.initializeApp(config, config['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  // Expected user mismatch error at the end of the reauthentication operation.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH);
  // Second factor requirement error.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var stateChangeCounter = 0;
  var tokenChangeCounter = 0;
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  var mockCredential = mockControl.createStrictMock(
      fireauth.AuthCredential);
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  // Simulate first factor re-auth triggers second factor requirement.
  mockCredential.matchIdTokenWithUid(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, uid) {
        assertObjectEquals(user.getRpcHandler(), rpcHandler);
        assertEquals(user['uid'], uid);
        return goog.Promise.reject(serverResponseError);
      });
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(user.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      });
  mockControl.$replayAll();

  // In this case, the original user re-authenticates with a credential that
  // belongs to a different multi-factor account.
  var accountInfoWithDifferentUid = goog.object.clone(accountInfo);
  accountInfoWithDifferentUid['uid'] = 'MISMATCHED_UID';
  var user = new fireauth.AuthUser(
      config, nonMultiFactorTokenResponse, accountInfoWithDifferentUid);
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        tokenChangeCounter++;
      });
  assertNoUserInvalidatedEvents(user);
  asyncTestCase.waitForSignals(1);

  return user.reauthenticateAndRetrieveDataWithCredential(mockCredential)
      .then(fail, function(error) {
        // Error should be intercepted and repackaged.
        assertEquals('auth/multi-factor-auth-required', error['code']);
        assertEquals(auth, error.resolver.auth);
        assertEquals(0, tokenChangeCounter);
        assertEquals(0, stateChangeCounter);
        return error.resolver.resolveSignIn(mockAssertion);
      })
      .then(fail, function(error) {
        // User mismatch error should be triggered on sign-in completion.
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        // Token and state change should not be triggered.
        assertEquals(0, stateChangeCounter);
        assertEquals(0, tokenChangeCounter);
        asyncTestCase.signal();
      });
}


/**
 * Tests when a 2-factor user reauthenticates with a popup and then recovers
 * with a second factor assertion.
 * @return {!goog.Promise<void>} A promise that resolves when the test
 *     completes.
 */
function testReauthenticateWithPopup_multiFactor_success() {
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      goog.testing.recordFunction(function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      }));
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      goog.testing.recordFunction(function(win) {
        assertEquals(expectedPopup, win);
      }));
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  var config = {
    'apiKey': 'apiKey1',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  app = firebase.initializeApp(config, config['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  fireauth.AuthEventManager.ENABLED = true;
  // Second factor requirement error.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var stateChangeCounter = 0;
  var tokenChangeCounter = 0;
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Add Google as linked provider to confirm that reauth does not fail like
  // linking does when called with an already linked provider.
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'google.com',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  var verifyAssertionForExisting = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'verifyAssertionForExisting');
  // Simulate first factor re-auth triggers second factor requirement.
  verifyAssertionForExisting({
    'requestUri': 'http://www.example.com/#response',
    'sessionId': 'SESSION_ID',
    'postBody': null,
    'tenantId': null
  }).$does(function(request) {
    return goog.Promise.reject(serverResponseError);
  });
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$does(function(rpcHandler, session) {
        assertObjectEquals(user.getRpcHandler(), rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      })
      .$once();
  // User reload will return the enrolled factors.
  getAccountInfoByIdToken(multiFactorTokenResponse.idToken)
      .$once()
      .$returns(goog.Promise.resolve(multiFactorGetAccountInfoResponse));
  mockControl.$replayAll();

  // Simulate user who upgraded to a second factor on a different device and is
  // re-authenticated in the current stale session.
  var user = new fireauth.AuthUser(
      config, nonMultiFactorTokenResponse, accountInfo);
  user.addProviderData(providerData1);
  // Enable popup and redirect.
  user.enablePopupRedirect();

  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        tokenChangeCounter++;
      });
  assertNoUserInvalidatedEvents(user);
  asyncTestCase.waitForSignals(1);

  var provider = new fireauth.GoogleAuthProvider();
  return user.reauthenticateWithPopup(provider)
      .then(fail, function(error) {
        // Confirm popup and closeWindow called in the process.
        /** @suppress {missingRequire} */
        assertEquals(1, fireauth.util.popup.getCallCount());
        /** @suppress {missingRequire} */
        assertEquals(1, fireauth.util.closeWindow.getCallCount());
        // Error should be intercepted and repackaged.
        assertEquals('auth/multi-factor-auth-required', error['code']);
        assertEquals(auth, error.resolver.auth);
        assertEquals(0, tokenChangeCounter);
        assertEquals(0, stateChangeCounter);
        return error.resolver.resolveSignIn(mockAssertion);
      })
      .then(function(result) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            user,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            fireauth.constants.OperationType.REAUTHENTICATE,
            result);

        // Enrolled factors updated.
        assertArrayEquals(
            [
              fireauth.MultiFactorInfo.fromServerResponse(
                  multiFactorGetAccountInfoResponse['users'][0].mfaInfo[0]),
              fireauth.MultiFactorInfo.fromServerResponse(
                  multiFactorGetAccountInfoResponse['users'][0].mfaInfo[1])
            ],
            user.multiFactor.enrolledFactors);
        assertEquals('defaultUserId', user['uid']);
        // Token and state change triggered.
        assertEquals(1, stateChangeCounter);
        assertEquals(1, tokenChangeCounter);
        return user.getIdToken();
      })
      .then(function(idToken) {
        // Confirm tokens updated.
        assertEquals(multiFactorTokenResponse.idToken, idToken);
        assertEquals('MULTI_FACTOR_REFRESH_TOKEN', user.refreshToken);
        asyncTestCase.signal();
      });
}


/**
 * Tests when a 2-factor user re-authenticates with a popup and the second
 * factor assertion returns tokens for a different user.
 * @return {!goog.Promise<void>} A promise that resolves when the test
 *     completes.
 */
function testReauthenticateWithPopup_multiFactor_mismatchError() {
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Simulate popup.
  stubs.replace(
      fireauth.util,
      'popup',
      goog.testing.recordFunction(function(url, name, width, height) {
        assertNull(url);
        assertEquals('87654321', name);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupWidth, width);
        assertEquals(fireauth.idp.Settings.GOOGLE.popupHeight, height);
        return expectedPopup;
      }));
  // On success if popup is still opened, it will be closed.
  stubs.replace(
      fireauth.util,
      'closeWindow',
      goog.testing.recordFunction(function(win) {
        assertEquals(expectedPopup, win);
      }));
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        // A popup event ID should be generated.
        return expectedEventId;
      });
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  app = firebase.initializeApp(config, config['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  // Expected user mismatch error at the end of the reauthentication operation.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH);
  fireauth.AuthEventManager.ENABLED = true;
  // Second factor requirement error.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var stateChangeCounter = 0;
  var tokenChangeCounter = 0;
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  // The expected popup event ID.
  var expectedEventId = '1234';
  // The expected successful reauth via popup Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Add Google as linked provider to confirm that reauth does not fail like
  // linking does when called with an already linked provider.
  providerData1 = new fireauth.AuthUserInfo(
      'providerUserId1',
      'google.com',
      'user1@example.com',
      null,
      'https://www.example.com/user1/photo.png');
  var recordedHandler = null;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.processPopup(
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument,
      ignoreArgument).$does(function(
          actualPopupWin,
          actualMode,
          actualProvider,
          actualOnInit,
          actualOnError,
          actualEventId,
          actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.REAUTH_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          });
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        recordedHandler = handler;
      });
  oAuthSignInHandlerInstance.shouldBeInitializedEarly().$returns(false);
  oAuthSignInHandlerInstance.hasVolatileStorage().$returns(false);
  oAuthSignInHandlerInstance.startPopupTimeout(
      ignoreArgument, ignoreArgument, ignoreArgument)
      .$does(function(popupWin, onError, delay) {
        recordedHandler(expectedAuthEvent);
        return goog.Promise.resolve();
      });
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var verifyAssertionForExisting = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'verifyAssertionForExisting');
  // Simulate first factor re-auth triggers second factor requirement.
  verifyAssertionForExisting({
    'requestUri': 'http://www.example.com/#response',
    'sessionId': 'SESSION_ID',
    'postBody': null,
    'tenantId': null
  }).$does(function(request) {
    return goog.Promise.reject(serverResponseError);
  });
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(user.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      });
  mockControl.$replayAll();

  // In this case, the original user re-authenticates with a credential that
  // belongs to a different multi-factor account.
  var accountInfoWithDifferentUid = goog.object.clone(accountInfo);
  accountInfoWithDifferentUid['uid'] = 'MISMATCHED_UID';
  var user = new fireauth.AuthUser(
      config, nonMultiFactorTokenResponse, accountInfoWithDifferentUid);
  user.addProviderData(providerData1);
  // Enable popup and redirect.
  user.enablePopupRedirect();

  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        tokenChangeCounter++;
      });
  assertNoUserInvalidatedEvents(user);
  asyncTestCase.waitForSignals(1);

  var provider = new fireauth.GoogleAuthProvider();
  return user.reauthenticateWithPopup(provider)
      .then(fail, function(error) {
        // Confirm popup and closeWindow called in the process.
        /** @suppress {missingRequire} */
        assertEquals(1, fireauth.util.popup.getCallCount());
        /** @suppress {missingRequire} */
        assertEquals(1, fireauth.util.closeWindow.getCallCount());
        // Error should be intercepted and repackaged.
        assertEquals('auth/multi-factor-auth-required', error['code']);
        assertEquals(auth, error.resolver.auth);
        assertEquals(0, tokenChangeCounter);
        assertEquals(0, stateChangeCounter);
        return error.resolver.resolveSignIn(mockAssertion);
      })
      .then(fail, function(error) {
        // User mismatch error should be triggered on sign-in completion.
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        // Token and state change should not be triggered.
        assertEquals(0, stateChangeCounter);
        assertEquals(0, tokenChangeCounter);
        asyncTestCase.signal();
      });
}


/**
 * Tests when a 2-factor user returns from a reauthenticate with redirect
 * operation and then recovers with a second factor assertion.
 * @return {!goog.Promise<void>} A promise that resolves when the test
 *     completes.
 */
function testReturnFromReauthenticateWithRedirect_multiFactor_success() {
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  app = firebase.initializeApp(config, config['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  var stateChangeCounter = 0;
  var tokenChangeCounter = 0;
  // Second factor requirement error.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
 // The expected reauth via redirect Auth event for the current user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  var verifyAssertionForExisting = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'verifyAssertionForExisting');
  // Simulate first factor re-auth triggers second factor requirement.
  verifyAssertionForExisting({
    'requestUri': 'http://www.example.com/#response',
    'sessionId': 'SESSION_ID',
    'postBody': null,
    'tenantId': null
  }).$does(function(request) {
    return goog.Promise.reject(serverResponseError);
  });
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$does(function(rpcHandler, session) {
        assertObjectEquals(user.getRpcHandler(), rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      })
      .$once();
  // User reload will return the enrolled factors.
  getAccountInfoByIdToken(multiFactorTokenResponse.idToken)
      .$once()
      .$returns(goog.Promise.resolve(multiFactorGetAccountInfoResponse));
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);

  // Simulate user who upgraded to a second factor on a different device and is
  // re-authenticated in the current stale session.
  var user = new fireauth.AuthUser(
      config, nonMultiFactorTokenResponse, accountInfo);
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        tokenChangeCounter++;
      });
  assertNoUserInvalidatedEvents(user);
  // Assume pending redirect event ID matching the dispatched one.
  user.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);

  return pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user.enablePopupRedirect();
    // Get redirect result should reject with multi-factor error.
    return authEventManager.getRedirectResult()
        .then(fail, function(error) {
          // Error should be intercepted and repackaged.
          assertEquals('auth/multi-factor-auth-required', error['code']);
          assertEquals(auth, error.resolver.auth);
          assertEquals(0, tokenChangeCounter);
          assertEquals(0, stateChangeCounter);
          return error.resolver.resolveSignIn(mockAssertion);
        })
        .then(function(result) {
          // Expected result returned.
          fireauth.common.testHelper.assertUserCredentialResponse(
              // Expected current user returned.
              user,
              // Expected credential returned.
              expectedGoogleCredential,
              // Expected additional user info.
              expectedAdditionalUserInfo,
              fireauth.constants.OperationType.REAUTHENTICATE,
              result);

          // Enrolled factors updated.
          assertArrayEquals(
              [
                fireauth.MultiFactorInfo.fromServerResponse(
                    multiFactorGetAccountInfoResponse['users'][0].mfaInfo[0]),
                fireauth.MultiFactorInfo.fromServerResponse(
                    multiFactorGetAccountInfoResponse['users'][0].mfaInfo[1])
              ],
              user.multiFactor.enrolledFactors);
          assertEquals('defaultUserId', user['uid']);
          // Token and state change triggered.
          assertEquals(1, stateChangeCounter);
          assertEquals(1, tokenChangeCounter);
          return user.getIdToken();
        })
        .then(function(idToken) {
          // Confirm tokens updated.
          assertEquals(multiFactorTokenResponse.idToken, idToken);
          assertEquals('MULTI_FACTOR_REFRESH_TOKEN', user.refreshToken);
          asyncTestCase.signal();
        });
  });
}


/**
 * Tests when a 2-factor user returns from a reauthenticate with redirect
 * operation and the second factor assertion returns tokens for a different
 * user.
 * @return {!goog.Promise<void>} A promise that resolves when the test
 *     completes.
 */
function testReturnFromReauthenticateWithRedirect_multiFactor_mismatchError() {
  // Expected user mismatch error at the end of the reauthentication operation.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH);
  var config = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  app = firebase.initializeApp(config, config['appName']);
  auth = new fireauth.Auth(app);
  // Stub Auth on the App instance above.
  stubs.set(app, 'auth', function() {
    return auth;
  });
  var stateChangeCounter = 0;
  var tokenChangeCounter = 0;
  // Second factor requirement error.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  // The expected reauth via redirect Auth event for the current user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  fireauth.AuthEventManager.ENABLED = true;
  // Mock OAuth sign in handler.
  var oAuthSignInHandlerInstance =
      mockControl.createStrictMock(fireauth.OAuthSignInHandler);
  mockControl.createConstructorMock(fireauth, 'OAuthSignInHandler');
  var instantiateOAuthSignInHandler = mockControl.createMethodMock(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler');
  instantiateOAuthSignInHandler(
      ignoreArgument, ignoreArgument, ignoreArgument, ignoreArgument,
      ignoreArgument).$returns(oAuthSignInHandlerInstance);
  oAuthSignInHandlerInstance.addAuthEventListener(ignoreArgument)
      .$does(function(handler) {
        // Dispatch expected Auth event immediately to simulate return from
        // redirect operation.
        handler(expectedAuthEvent);
      });
  oAuthSignInHandlerInstance.initializeAndWait()
      .$returns(goog.Promise.resolve());
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var verifyAssertionForExisting = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'verifyAssertionForExisting');
  // Simulate first factor re-auth triggers second factor requirement.
  verifyAssertionForExisting({
    'requestUri': 'http://www.example.com/#response',
    'sessionId': 'SESSION_ID',
    'postBody': null,
    'tenantId': null
  }).$does(function(request) {
    return goog.Promise.reject(serverResponseError);
  });
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$does(function(rpcHandler, session) {
        assertObjectEquals(user.getRpcHandler(), rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      })
      .$once();
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);

  // In this case, the original user re-authenticates with a credential that
  // belongs to a different multi-factor account.
  var accountInfoWithDifferentUid = goog.object.clone(accountInfo);
  accountInfoWithDifferentUid['uid'] = 'MISMATCHED_UID';
  var user = new fireauth.AuthUser(
      config, nonMultiFactorTokenResponse, accountInfoWithDifferentUid);
  user.addStateChangeListener(function(userTemp) {
    stateChangeCounter++;
    return goog.Promise.resolve();
  });
  goog.events.listen(user, fireauth.UserEventType.TOKEN_CHANGED,
      function(event) {
        tokenChangeCounter++;
      });
  assertNoUserInvalidatedEvents(user);
  // Assume pending redirect event ID matching the dispatched one.
  user.setRedirectEventId('1234');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config['apiKey'] + ':' + config['appName']);
  var authEventManager = fireauth.AuthEventManager.getManager(
      config['authDomain'], config['apiKey'],  config['appName']);

  return pendingRedirectManager.setPendingStatus().then(function() {
    // Enable popup and redirect.
    user.enablePopupRedirect();
    // Get redirect result should reject with multi-factor error.
    return authEventManager.getRedirectResult()
        .then(fail, function(error) {
          // Error should be intercepted and repackaged.
          assertEquals('auth/multi-factor-auth-required', error['code']);
          assertEquals(auth, error.resolver.auth);
          assertEquals(0, tokenChangeCounter);
          assertEquals(0, stateChangeCounter);
          return error.resolver.resolveSignIn(mockAssertion);
        })
        .then(fail, function(error) {
          // User mismatch error should be triggered on sign-in completion.
          fireauth.common.testHelper.assertErrorEquals(
              expectedError,
              error);
          // Token and state change should not be triggered.
          assertEquals(0, stateChangeCounter);
          assertEquals(0, tokenChangeCounter);
          asyncTestCase.signal();
        });
  });
}
