/**
 * @license
 * Copyright 2017 Google LLC
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
 * @fileoverview Tests for auth.js
 */

goog.provide('fireauth.AuthTest');

goog.require('fireauth.ActionCodeInfo');
goog.require('fireauth.ActionCodeSettings');
goog.require('fireauth.Auth');
goog.require('fireauth.AuthCredential');
goog.require('fireauth.AuthError');
goog.require('fireauth.AuthErrorWithCredential');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.AuthEventManager');
goog.require('fireauth.AuthSettings');
goog.require('fireauth.AuthUser');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.MultiFactorAssertion');
goog.require('fireauth.MultiFactorInfo');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.SAMLAuthProvider');
goog.require('fireauth.StsTokenManager');
goog.require('fireauth.UserEventType');
goog.require('fireauth.authStorage');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('fireauth.deprecation');
/** @suppress {extraRequire} Needed for firebase.app().auth() */
goog.require('fireauth.exports');
goog.require('fireauth.idp');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.object');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.PendingRedirectManager');
goog.require('fireauth.storage.RedirectUserManager');
goog.require('fireauth.storage.UserManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Timer');
goog.require('goog.Uri');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.events');
goog.require('goog.testing.events.Event');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.AuthTest');


var appId1 = 'appId1';
var appId2 = 'appId2';
var auth1 = null;
var auth2 = null;
var authInternal1 = null;
var authInternal2 = null;
var app1 = null;
var app2 = null;
var authUi1 = null;
var authUi2 = null;
var config1 = null;
var config2 = null;
var config3 = null;
var rpcHandler = null;
var token = null;
var accountInfo = {
  'uid': '14584746072031976743',
  'email': 'uid123@fake.com',
  'displayName': 'John Doe',
  'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/' +
      'default_profile_3_normal.png',
  'emailVerified': true
};
var accountInfoWithTenantId = {
  'uid': '14584746072031976743',
  'email': 'uid123@fake.com',
  'displayName': 'John Doe',
  'photoURL': 'http://abs.twimg.com/sticky/default_profile_images/' +
      'default_profile_3_normal.png',
  'emailVerified': true,
  'tenantId': '123456789012'
};
// accountInfo in the format of a getAccountInfo response.
var getAccountInfoResponse = {
  'users': [{
    'localId': '14584746072031976743',
    'email': 'uid123@fake.com',
    'emailVerified': true,
    'displayName': 'John Doe',
    'providerUserInfo': [],
    'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/' +
        'default_profile_3_normal.png',
    'passwordUpdatedAt': 0.0,
    'disabled': false
  }]
};
// A sample JWT, along with its decoded contents.
var idTokenGmail = {
  data: {
    sub: '679',
    aud: '204241631686',
    provider_id: 'gmail.com',
    email: 'test123456@gmail.com',
    federated_id: 'https://www.google.com/accounts/123456789'
  }
};
var expectedTokenResponse;
var expectedTokenResponse2;
var expectedTokenResponse3;
var expectedTokenResponse4;
var expectedTokenResponseWithIdPData;
var expectedAdditionalUserInfo;
var expectedGoogleCredential;
var expectedSamlTokenResponseWithIdPData;
var expectedSamlAdditionalUserInfo;
var now = goog.now();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var mockControl;
var ignoreArgument;

var stubs = new goog.testing.PropertyReplacer();
var angular = {};
var currentUserStorageManager;
var redirectUserStorageManager;
var timeoutDelay = 30000;
var clock;

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
var mockLocalStorage;
var mockSessionStorage;
var jwt1;
var jwt2;
var jwt3;
var multiFactorErrorServerResponse;
var multiFactorTokenResponse;
var multiFactorGetAccountInfoResponse;


function setUp() {
  // Create new mock storages for persistent and temporary storage before each
  // test.
  mockLocalStorage = new fireauth.storage.MockStorage();
  mockSessionStorage = new fireauth.storage.MockStorage();
  // Disable Auth event manager for testing unless needed.
  fireauth.AuthEventManager.ENABLED = false;
  // Assume origin is a valid one.
  simulateWhitelistedOrigin();
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
  // Called on init state when a user is logged in.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  stubs.replace(
      fireauth.util,
      'getCurrentUrl',
      function() {return 'http://localhost';});
  initializeMockStorage();
  jwt1 = fireauth.common.testHelper.createMockJwt(
      {'group': '1'}, now + 3600 * 1000);
  jwt2 = fireauth.common.testHelper.createMockJwt(
      {'group': '2'}, now + 3600 * 1000);
  jwt3 = fireauth.common.testHelper.createMockJwt(
      {'group': '3'}, now + 3600 * 1000);
  idTokenGmail.data.exp = now / 1000 + 3600;
  idTokenGmail.jwt =
      fireauth.common.testHelper.createMockJwt(idTokenGmail.data);
  // Initialize App and Auth instances.
  config1 = {
    apiKey: 'apiKey1'
  };
  config2 = {
    apiKey: 'apiKey2'
  };
  config3 = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId1'
  };
  // Same as config3 but with a different authDomain.
  config4 = {
    'apiKey': 'API_KEY',
    'authDomain': 'subdomain2.firebaseapp.com',
    'appName': 'appId1'
  };
  expectedTokenResponse = {
    'idToken': jwt1,
    'refreshToken': 'REFRESH_TOKEN'
  };
  expectedTokenResponse2 = {
    'idToken': jwt2,
    'refreshToken': 'REFRESH_TOKEN2'
  };
  expectedTokenResponse3 = {
    'idToken': jwt3,
    'refreshToken': 'REFRESH_TOKEN3'
  };
  expectedTokenResponse4 = {
    // Sample ID token with provider password and email user@example.com.
    'idToken': fireauth.common.testHelper.createMockJwt({
      'iss': 'https://securetoken.google.com/12345678',
      'picture': 'https://plus.google.com/abcdefghijklmnopqrstu',
      'aud': '12345678',
      'auth_time': 1510357622,
      'sub': 'abcdefghijklmnopqrstu',
      'iat': 1510357622,
      'exp': now / 1000 + 3600,
      'email': 'user@example.com',
      'email_verified': true,
      'firebase': {
        'identities': {
          'email': [
            'user@example.com'
          ]
        },
        'sign_in_provider': 'password'
      }
    }),
    'refreshToken': 'REFRESH_TOKEN4'
  };
  expectedTokenResponseWithIdPData = {
    'idToken': jwt1,
    'refreshToken': 'REFRESH_TOKEN',
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
    'idToken': jwt1,
    'refreshToken': 'REFRESH_TOKEN',
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
  rpcHandler = new fireauth.RpcHandler('apiKey1');
  token = new fireauth.StsTokenManager(rpcHandler);
  token.setRefreshToken('refreshToken');
  token.setAccessToken(jwt1);
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl = new goog.testing.MockControl();
  mockControl.$resetAll();
}


function tearDown() {
  // Delete all Firebase apps created
  var promises = [];
  for (var i = 0; i < firebase.apps.length; i++) {
    promises.push(firebase.apps[i].delete());
  }
  if (promises.length) {
    // Wait for all Firebase apps to be deleted.
    asyncTestCase.waitForSignals(1);
    goog.Promise.all(promises).then(function() {
      // Dispose clock then. Disposing before will throw an error in IE 11.
      goog.dispose(clock);
      asyncTestCase.signal();
    });
    if (clock) {
      // Some IE browsers like IE 11, native promise hangs if this is not called
      // when clock is mocked.
      // app.delete() will hang (it uses the native Promise).
      clock.tick();
    }
  } else if (clock) {
    // No Firebase apps created, dispose clock immediately.
    goog.dispose(clock);
  }

  fireauth.AuthEventManager.manager_ = {};
  window.localStorage.clear();
  window.sessionStorage.clear();
  rpcHandler = null;
  token = null;
  if (auth1) {
    auth1.delete();
  }
  auth1 = null;
  if (auth2) {
    auth2.delete();
  }
  auth2 = null;
  app1 = null;
  app2 = null;
  config1 = null;
  config2 = null;
  config3 = null;
  multiFactorErrorServerResponse = null;
  multiFactorTokenResponse = null;
  multiFactorGetAccountInfoResponse = null;
  stubs.reset();
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
  fireauth.authStorage.Manager.clear();
  currentUserStorageManager = null;
  redirectUserStorageManager = null;
  if (goog.global.document) {
    fireauth.util.onDomReady().then(function () {
      var el = goog.global.document.querySelector('.firebase-emulator-warning');
      if (el) {
        el.parentNode.removeChild(el);
      }
    });
  }
}


function testInitializeApp_noApiKey() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_API_KEY);
  // Initialize app without an API key.
  var appWithoutApiKey = firebase.initializeApp({}, 'appWithoutApiKey');
  // Initialization without API key should not throw an Auth error.
  // Only on Auth explicit initialization will the error be visibly thrown.
  try {
    appWithoutApiKey.auth();
    fail('Auth initialization should fail due to missing api key.');
  } catch (e) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, e);
  }
}


/**
 * Assert the Auth token listener is called once.
 * @param {!fireauth.Auth} auth The Auth instance.
 */
function assertAuthTokenListenerCalledOnce(auth) {
  var calls = 0;
  asyncTestCase.waitForSignals(1);
  auth.addAuthTokenListener(function(token) {
    // Should only trigger once after init state.
    calls++;
    assertEquals(1, calls);
    asyncTestCase.signal();
  });
}


/** Initializes mock storages. */
function initializeMockStorage() {
  // Simulate tab can run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return true;
      });
  fireauth.common.testHelper.installMockStorages(
      stubs, mockLocalStorage, mockSessionStorage);
}


/**
 * Simulates current origin is whitelisted for popups and redirects.
 */
function simulateWhitelistedOrigin() {
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
}


/**
 * Asserts that two users are equivalent. Plain assertObjectEquals may not work
 * as the expiration time may sometimes be off by a second. This takes that into
 * account.
 * @param {!fireauth.AuthUser} expected
 * @param {!fireauth.AuthUser} actual
 */
function assertUserEquals(expected, actual) {
  fireauth.common.testHelper.assertUserEqualsInWithDiffApikey(expected, actual);
}


function testAuth_noApiKey() {
  try {
    app1 = firebase.initializeApp({}, appId1);
    app1.auth();
    fail('Should have thrown an error!');
  } catch (e) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INVALID_API_KEY), e);
  }
}


function testToJson_noUser() {
  // Test toJSON with no user signed in.
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  var authPlainObject = {
    'apiKey': config1['apiKey'],
    'authDomain': config1['authDomain'],
    'appName': appId1,
    'currentUser': null
  };
  assertObjectEquals(authPlainObject, auth1.toJSON());
  // Make sure JSON.stringify works and uses underlying toJSON.
  assertEquals(JSON.stringify(auth1), JSON.stringify(auth1.toJSON()));
}


function testToJson_withUser() {
  // Test toJSON with a user signed in.
  stubs.reset();
  fireauth.AuthEventManager.ENABLED = false;
  initializeMockStorage();
  // Simulate available token.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Reload will be called on init.
        return goog.Promise.resolve();
      });
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var storageKey = fireauth.util.createStorageKey(config1['apiKey'], appId1);
  var authPlainObject = {
    'apiKey': config1['apiKey'],
    'authDomain': config1['authDomain'],
    'appName': appId1,
    'currentUser': user1.toJSON()
  };
  currentUserStorageManager = new fireauth.storage.UserManager(storageKey);
  // Simulate logged in user, save to storage, it will be picked up on init
  // Auth state.
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    auth1 = app1.auth();
    auth1.onIdTokenChanged(function(user) {
      assertObjectEquals(authPlainObject, auth1.toJSON());
      // Make sure JSON.stringify works and uses underlying toJSON.
      assertEquals(JSON.stringify(auth1), JSON.stringify(auth1.toJSON()));
      asyncTestCase.signal();
    });
  });
}


function testGetStorageKey() {
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertEquals(config1['apiKey'] + ':' + appId1, auth1.getStorageKey());
}


function testAuth_initListeners_disabled() {
  // Test with init listener disabled.
  app1 = firebase.initializeApp(config1, appId1);
  app2 = firebase.initializeApp(config2, appId2);
  auth1 = app1.auth();
  auth2 = app2.auth();
  assertObjectEquals(app1, auth1.app_());
  assertObjectEquals(app2, auth2.app_());
}


function testApp() {
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertObjectEquals(app1, auth1.app_());
}


function testGetRpcHandler() {
  app1 = firebase.initializeApp(config1, appId1);
  app2 = firebase.initializeApp(config2, appId2);
  auth1 = app1.auth();
  auth2 = app2.auth();
  assertNotNull(auth1.getRpcHandler());
  assertNotNull(auth2.getRpcHandler());
  assertEquals('apiKey1', auth1.getRpcHandler().getApiKey());
  assertEquals('apiKey2', auth2.getRpcHandler().getApiKey());
}


function testAuth_rpcHandlerEndpoints() {
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
  mockControl.$replayAll();
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
}


function testAuth_rpcHandlerEndpoints_tenantId() {
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
  rpcHandler.updateTenantId('TENANT_ID').$once();
  mockControl.$replayAll();
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  // Sets the tenant ID on Auth instance.
  auth1.tenantId = 'TENANT_ID';
}


function testCurrentUser() {
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var user = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  auth1.setCurrentUser_(user);
  assertUserEquals(user, auth1['currentUser']);
}


function testAuthSettings() {
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();

  assertTrue(auth1['settings'] instanceof fireauth.AuthSettings);
  assertFalse(auth1['settings']['appVerificationDisabledForTesting']);
  auth1['settings']['appVerificationDisabledForTesting'] = true;
  assertTrue(auth1['settings']['appVerificationDisabledForTesting']);
  // Confirm validation is applied.
  var error = assertThrows(function() {
    auth1['settings']['appVerificationDisabledForTesting'] = 'invalid';
  });
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR,
      'appVerificationDisabledForTesting failed: ' +
      '"appVerificationDisabledForTesting" must be a boolean.');
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);

  // Confirm settings is a read-only property.
  auth1['settings'] = null;
  assertTrue(auth1['settings'] instanceof fireauth.AuthSettings);
}


function testLogFramework() {
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
  // Listen to all client version update calls on RpcHandler.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateClientVersion',
      goog.testing.recordFunction());
  var handler = goog.testing.recordFunction();
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();

  // Listen to all frameworkChanged events dispatched by the Auth instance.
  goog.events.listen(
      auth1,
      fireauth.constants.AuthEventType.FRAMEWORK_CHANGED,
      handler);
  assertArrayEquals([], auth1.getFramework());
  assertEquals(0, handler.getCallCount());
  assertEquals(
      0, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());

  // Add version and confirm event triggered and client version updated in
  // RpcHandler.
  auth1.logFramework('angularfire');
  assertArrayEquals(['angularfire'], auth1.getFramework());
  assertEquals(1, handler.getCallCount());
  assertArrayEquals(
      ['angularfire'], handler.getLastCall().getArgument(0).frameworks);
  assertEquals(
      1, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());
  assertEquals(
      getVersion(['angularfire']),
      fireauth.RpcHandler.prototype.updateClientVersion.getLastCall()
          .getArgument(0));

  // Add another version and confirm event triggered and client version updated
  // in RpcHandler.
  auth1.logFramework('firebaseui');
  assertArrayEquals(['angularfire', 'firebaseui'], auth1.getFramework());
  assertEquals(2, handler.getCallCount());
  assertArrayEquals(
      ['angularfire', 'firebaseui'],
      handler.getLastCall().getArgument(0).frameworks);
  assertEquals(
      2, fireauth.RpcHandler.prototype.updateClientVersion.getCallCount());
  assertEquals(
      getVersion(['angularfire', 'firebaseui']),
      fireauth.RpcHandler.prototype.updateClientVersion.getLastCall()
          .getArgument(0));
}


function testInternalLogFramework() {
  // Record all calls to logFramework.
  stubs.replace(
      fireauth.Auth.prototype,
      'logFramework',
      goog.testing.recordFunction());
  // Confirm INTERNAL.logFramework calls logFramework.
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertEquals(0, fireauth.Auth.prototype.logFramework.getCallCount());
  auth1.INTERNAL.logFramework('firebaseui');
  assertEquals(1, fireauth.Auth.prototype.logFramework.getCallCount());
  assertEquals(
      'firebaseui',
      fireauth.Auth.prototype.logFramework.getLastCall().getArgument(0));
}


function testUseDeviceLanguage() {
  // Listen to all custom locale header calls on RpcHandler.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateCustomLocaleHeader',
      goog.testing.recordFunction());
  var handler = goog.testing.recordFunction();
  stubs.replace(fireauth.util, 'getUserLanguage', function() {
    return 'de';
  });
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  // Listen to all languageCodeChanged events dispatched by the Auth instance.
  goog.events.listen(
      auth1,
      fireauth.constants.AuthEventType.LANGUAGE_CODE_CHANGED,
      handler);
  assertNull(auth1.languageCode);
  assertEquals(0, handler.getCallCount());
  assertEquals(
      0, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());

  // Update to English and confirm event triggered and custom locale updated in
  // RpcHandler.
  auth1.languageCode = 'en';
  assertEquals('en', auth1.languageCode);
  assertEquals(1, handler.getCallCount());
  assertEquals('en', handler.getLastCall().getArgument(0).languageCode);
  assertEquals(
      1, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertEquals(
      'en',
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));

  // Update to device language and confirm event triggered and custom locale
  // updated in RpcHandler.
  auth1.useDeviceLanguage();
  assertEquals('de', auth1.languageCode);
  assertEquals(2, handler.getCallCount());
  assertEquals('de', handler.getLastCall().getArgument(0).languageCode);
  assertEquals(
      2, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertEquals(
      'de',
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));

  // Developer should still be able to set the language code.
  // Update to French and confirm event triggered and custom locale updated in
  // RpcHandler.
  auth1.languageCode = 'fr';
  assertEquals('fr', auth1.languageCode);
  assertEquals(3, handler.getCallCount());
  assertEquals('fr', handler.getLastCall().getArgument(0).languageCode);
  assertEquals(
      3, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertEquals(
      'fr',
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));

  // Switch back to device language.
  auth1.useDeviceLanguage();
  assertEquals('de', auth1.languageCode);
  assertEquals(4, handler.getCallCount());
  assertEquals('de', handler.getLastCall().getArgument(0).languageCode);
  assertEquals(
      4, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertEquals(
      'de',
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));

  // Changing to the same language should not trigger any change.
  auth1.languageCode = 'de';
  assertEquals(4, handler.getCallCount());
  assertEquals(
      4, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());

  // Update to null and confirm event triggered and custom locale updated in
  // RpcHandler.
  auth1.languageCode = null;
  assertNull(auth1.languageCode);
  assertEquals(5, handler.getCallCount());
  assertNull(handler.getLastCall().getArgument(0).languageCode);
  assertEquals(
      5, fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getCallCount());
  assertNull(
      fireauth.RpcHandler.prototype.updateCustomLocaleHeader.getLastCall()
          .getArgument(0));
}


function testUseEmulator() {
  // Listen to emulator config calls on RpcHandler.
  stubs.replace(
    fireauth.RpcHandler.prototype,
    'updateEmulatorConfig',
    goog.testing.recordFunction());
  stubs.replace(
    fireauth.util,
    'consoleInfo',
    goog.testing.recordFunction());
  var handler = goog.testing.recordFunction();
  stubs.replace(
    fireauth.AuthSettings.prototype,
    'setAppVerificationDisabledForTesting',
    goog.testing.recordFunction());
  
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();

  // Listen to all emulatorConfigChange events dispatched by the Auth instance.
  goog.events.listen(
    auth1,
    fireauth.constants.AuthEventType.EMULATOR_CONFIG_CHANGED,
    handler);

  assertUndefined(fireauth.constants.emulatorConfig);
  assertEquals(0, handler.getCallCount());
  assertEquals(
    0, fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount());
  assertEquals(0, fireauth.util.consoleInfo.getCallCount());
  assertEquals(
    0,
    fireauth.AuthSettings.prototype.setAppVerificationDisabledForTesting.
      getCallCount());

  // Update the emulator config.
  auth1.useEmulator('http://emulator.test.domain:1234');
  assertObjectEquals(
    {
      url: 'http://emulator.test.domain:1234',
    },
    auth1.getEmulatorConfig());
  // Should notify the RPC handler.
  assertEquals(
    1, fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount());
  assertObjectEquals(
    {
      url: 'http://emulator.test.domain:1234',
    },
    fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
      .getArgument(0)
  );
  // Should emit a console warning and a banner.
  assertEquals(1, fireauth.util.consoleInfo.getCallCount());
  if (goog.global.document) {
    asyncTestCase.waitForSignals(1);
    fireauth.util.onDomReady().then(() => {
      const el =
          goog.global.document.querySelector('.firebase-emulator-warning');
      assertNotNull(el);
      asyncTestCase.signal();
    });
  }
  // Should disable App verification.
  assertEquals(
    true,
    fireauth.AuthSettings.prototype.setAppVerificationDisabledForTesting.
      getLastCall().getArgument(0));

  // Update to the same config should not trigger event again.
  auth1.useEmulator('http://emulator.test.domain:1234');
  assertObjectEquals(
    {
      url: 'http://emulator.test.domain:1234',
    },
    auth1.getEmulatorConfig());
  assertEquals(
    1, fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount());
  assertEquals(1, fireauth.util.consoleInfo.getCallCount());

  // Updating to different config should still not trigger event.
  auth1.useEmulator('http://emulator.other.domain:9876');
  assertObjectEquals(
    {
      url: 'http://emulator.test.domain:1234',
    },
    auth1.getEmulatorConfig());
  assertEquals(
    1, fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount());
}


function testUseEmulator_withDisableWarnings() {
  // Listen to emulator config calls on RpcHandler.
  stubs.replace(
      fireauth.RpcHandler.prototype, 'updateEmulatorConfig',
      goog.testing.recordFunction());
  stubs.replace(fireauth.util, 'consoleInfo', goog.testing.recordFunction());
  const handler = goog.testing.recordFunction();

  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();

  // Listen to all emulatorConfigChange events dispatched by the Auth instance.
  goog.events.listen(
      auth1, fireauth.constants.AuthEventType.EMULATOR_CONFIG_CHANGED, handler);

  assertUndefined(fireauth.constants.emulatorConfig);
  assertEquals(0, handler.getCallCount());
  assertEquals(
      0, fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount());
  assertEquals(0, fireauth.util.consoleInfo.getCallCount());

  // Update the emulator config.
  auth1.useEmulator(
      'http://emulator.test.domain:1234', {disableWarnings: true});
  assertObjectEquals(
      {
        url: 'http://emulator.test.domain:1234',
      },
      auth1.getEmulatorConfig());
  // Should notify the RPC handler.
  assertEquals(
      1, fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount());
  assertObjectEquals(
      {
        url: 'http://emulator.test.domain:1234',
      },
      fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
          .getArgument(0));
  // Should emit a console info but not a banner.
  assertEquals(1, fireauth.util.consoleInfo.getCallCount());
  if (goog.global.document) {
    asyncTestCase.waitForSignals(1);
    fireauth.util.onDomReady().then(() => {
      const el =
          goog.global.document.querySelector('.firebase-emulator-warning');
      assertNull(el);
      asyncTestCase.signal();
    });
  }
}


function testGetSetTenantId() {
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  // Tenant ID should be initialized to null.
  assertNull(auth1.tenantId);
  assertNull(auth1.getRpcHandler().getTenantId());
  // Updating tenant ID on Auth should also update the tenant ID of RPC handler.
  auth1.tenantId = 'TENANT_ID1';
  assertEquals('TENANT_ID1', auth1.tenantId);
  assertEquals('TENANT_ID1', auth1.getRpcHandler().getTenantId());
  // Reset tenant ID to null.
  auth1.tenantId = null;
  assertNull(auth1.tenantId);
  assertNull(auth1.getRpcHandler().getTenantId());

  // Test getter and setter.
  auth1.setTenantId('TENANT_ID2');
  assertEquals('TENANT_ID2', auth1.getTenantId());
  assertEquals('TENANT_ID2', auth1.tenantId);
  auth1.tenantId = null;
  assertNull(auth1.getTenantId());
  assertNull(auth1.tenantId);
}


/**
 * Test Auth state listeners triggered on listener add even when initial state
 * is null. However it will only first trigger when state is resolved.
 */
function testAddAuthTokenListener_initialNullState() {
  var user = new fireauth.AuthUser(config1, expectedTokenResponse, accountInfo);
  stubs.reset();
  // Simulate no state returned.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        return goog.Promise.resolve(null);
      });
  initializeMockStorage();
  // Suppress addStateChangeListener.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {});
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Generate new token on next call to trigger listeners.
        return goog.Promise.resolve({
          accessToken: jwt2,
          refreshToken: 'refreshToken'
        });
      });
  var listener1 = mockControl.createFunctionMock('listener1');
  var listener2 = mockControl.createFunctionMock('listener2');
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  listener1(null).$does(function() {
    // Should be triggered after state is resolved.
    assertEquals(0, marker);
    // Increment marker.
    marker++;
    auth1.addAuthTokenListener(listener2);
  });
  listener2(null).$does(function() {
    // Should be triggered after listener2 is added.
    assertEquals(1, marker);
    // Increment marker.
    marker++;
    // Auth state change notification should also trigger immediately now.
    // Simulate Auth event to trigger both listeners.
    auth1.setCurrentUser_(user);
    user.getIdToken();
  });
  listener1(jwt2).$does(function() {
    // Marker should confirm listener triggered after notifyAuthListeners_.
    assertEquals(2, marker);
    asyncTestCase.signal();
  });
  listener2(jwt2).$does(function() {
    // Marker should confirm listener triggered after notifyAuthListeners_.
    assertEquals(2, marker);
    asyncTestCase.signal();
  });
  mockControl.$replayAll();
  // Wait for last 2 expected listener calls.
  asyncTestCase.waitForSignals(2);
  // Keep track of what is triggering the events.
  var marker = 0;
  // Test listeners called when state first determined.
  auth1.addAuthTokenListener(listener1);
}


/**
 * Test Auth state listeners triggered on listener add even when initial state
 * is not null (signed in user). However it will only first trigger when state
 * is resolved.
 */
function testAddAuthTokenListener_initialValidState() {
  var user = new fireauth.AuthUser(config1, expectedTokenResponse, accountInfo);
  stubs.reset();
  // Simulate valid state returned.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        return goog.Promise.resolve(user);
      });
  initializeMockStorage();
  // Suppress addStateChangeListener.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {});
  // Simulate available token.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Internally calls Auth user listeners.
        return goog.Promise.resolve();
      });
  var currentAccessToken = jwt1;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Generate new token on next call to trigger listeners.
        return goog.Promise.resolve({
          accessToken: currentAccessToken,
          refreshToken: 'refreshToken'
        });
      });
  // Keep track of what is triggering the events.
  var marker = 0;
  var listener1 = mockControl.createFunctionMock('listener1');
  var listener2 = mockControl.createFunctionMock('listener2');
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  listener1(jwt1).$does(function() {
    // Should be triggered after state is resolved.
    assertEquals(0, marker);
    marker++;
    // Now that state is determined, adding a new listener should resolve
    // immediately.
    auth1.addAuthTokenListener(listener2);
  });
  listener2(jwt1).$does(function() {
    // Should be triggered after listener2 is added.
    assertEquals(1, marker);
    // Increment marker.
    marker++;
    // Auth state change notification should also trigger immediately now.
    // Simulate Auth event via getIdToken refresh to trigger both listeners.
    currentAccessToken = 'newAccessToken';
    user.getIdToken();
  });
  listener1('newAccessToken').$does(function() {
    // Marker should confirm listener triggered after notifyAuthListeners_.
    assertEquals(2, marker);
    asyncTestCase.signal();
  });
  listener2('newAccessToken').$does(function() {
    // Marker should confirm listener triggered after notifyAuthListeners_.
    assertEquals(2, marker);
    asyncTestCase.signal();
  });
  mockControl.$replayAll();
  // Wait for last 2 expected listener calls.
  asyncTestCase.waitForSignals(2);
  // Test listeners called when state first determined.
  auth1.addAuthTokenListener(listener1);
}


function testGetUid_userSignedIn() {
  // Test getUid() on Auth instance and app instance with user previously
  // signed in.
  var accountInfo1 = {'uid': '1234'};
  asyncTestCase.waitForSignals(1);
  // Get current user storage manager.
  var storageKey = fireauth.util.createStorageKey(config1['apiKey'], appId1);
  currentUserStorageManager = new fireauth.storage.UserManager(storageKey);
  // Create test user instance.
  var user =
      new fireauth.AuthUser(config1, expectedTokenResponse, accountInfo1);
  // Save test user. This will be loaded on Auth init.
  currentUserStorageManager.setCurrentUser(user).then(function() {
    // Initialize App and Auth.
    app1 = firebase.initializeApp(config1, appId1);
    auth1 = app1.auth();
    authInternal1 = app1.container.getProvider('auth-internal').getImmediate();
    // Initially getUid() should return null;
    assertNull(auth1.getUid());
    assertNull(authInternal1.getUid());
    // Listen to Auth changes.
    var unsubscribe = auth1.onIdTokenChanged(function(currentUser) {
      // Unsubscribe of Auth state change listener.
      unsubscribe();
      // Logged in test user should be detected.
      // Confirm getUid() returns expected UID.
      assertEquals(accountInfo1['uid'], auth1.getUid());
      assertEquals(accountInfo1['uid'], authInternal1.getUid());
      goog.Timer.promise(10).then(function() {
        // Sign out.
        return auth1.signOut();
      }).then(function() {
        return goog.Timer.promise(10);
      }).then(function() {
        // getUid() should return null.
        assertNull(auth1.getUid());
        assertNull(authInternal1.getUid());
        asyncTestCase.signal();
      });
    });
  });
}


function testGetUid_noUserSignedIn() {
  // Test getUid() on Auth instance and App instance with no user previously
  // signed in and new user signs in.
  var accountInfo1 = {'uid': '1234'};
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        return goog.Promise.resolve(user);
      });
  // Simulate successful RpcHandler verifyPassword resolving with expected
  // token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyPassword', function(email, password) {
        // Return tokens for test user.
        return goog.Promise.resolve(expectedTokenResponse);
      });
  asyncTestCase.waitForSignals(1);
  var user =
      new fireauth.AuthUser(config1, expectedTokenResponse, accountInfo1);
  // Initialize App and Auth.
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  authInternal1 = app1.container.getProvider('auth-internal').getImmediate();
  // Listen to Auth changes.
  var unsubscribe = auth1.onIdTokenChanged(function(currentUser) {
    // Unsubscribe of Auth state change listener.
    unsubscribe();
    // Initially getUid() should return null;
    assertNull(auth1.getUid());
    assertNull(authInternal1.getUid());
    // Sign in with email and password.
    auth1.signInWithEmailAndPassword('user@example.com', 'password')
        .then(function(userCredential) {
          // getUid() should return the test user UID.
          assertEquals(accountInfo1['uid'], auth1.getUid());
          assertEquals(accountInfo1['uid'], authInternal1.getUid());
          asyncTestCase.signal();
        });
  });
}


function testNotifyAuthListeners() {
  // Simulate available token.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        return goog.Promise.resolve({
          accessToken: currentAccessToken,
          refreshToken: 'refreshToken'
        });
      });
  // User reloaded.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  var currentAccessToken = 'accessToken1';
  var app1AuthTokenListener = goog.testing.recordFunction();
  var app2AuthTokenListener = goog.testing.recordFunction();
  var user = new fireauth.AuthUser(
      config1, expectedTokenResponse, accountInfo);
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();

  asyncTestCase.waitForSignals(2);
  // Set current user on auth1.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config1['apiKey'] + ':' + appId1);
  currentUserStorageManager.setCurrentUser(user).then(function() {
    app1 = firebase.initializeApp(config1, appId1);
    auth1 = app1.auth();
    authInternal1 = app1.container.getProvider('auth-internal').getImmediate();
    authInternal1.addAuthTokenListener(app1AuthTokenListener);
    app2 = firebase.initializeApp(config2, appId2);
    auth2 = app2.auth();
    authInternal2 = app2.container.getProvider('auth-internal').getImmediate();
    authInternal2.addAuthTokenListener(app2AuthTokenListener);
    // Confirm all listeners reset.
    assertEquals(0, listener1.getCallCount());
    assertEquals(0, listener2.getCallCount());
    assertEquals(0, listener3.getCallCount());
    assertEquals(0, app1AuthTokenListener.getCallCount());
    assertEquals(0, app2AuthTokenListener.getCallCount());
    auth1.addAuthTokenListener(listener1);
    auth1.addAuthTokenListener(listener2);
    auth2.addAuthTokenListener(listener3);
    // Wait for state to be ready on auth1.
    var unsubscribe = auth1.onIdTokenChanged(function(currentUser) {
      unsubscribe();
      // Listener 1 and 2 triggered.
      assertEquals(1, listener1.getCallCount());
      assertEquals(listener1.getCallCount(), listener2.getCallCount());
      // First trigger on init state.
      assertEquals(
           listener1.getCallCount(),
           app1AuthTokenListener.getCallCount());
      assertEquals(
          'accessToken1',
          app1AuthTokenListener.getLastCall().getArgument(0));
      // Remove first listener and reset.
      auth1.removeAuthTokenListener(listener1);
      listener1.reset();
      listener2.reset();
      app1AuthTokenListener.reset();
      // Force token change.
      currentAccessToken = 'accessToken2';
      // Trigger getIdToken to force refresh and Auth token change.
      auth1['currentUser'].getIdToken().then(function(token) {
        assertEquals('accessToken2', token);
        assertEquals(0, listener1.getCallCount());
        // Only listener2 triggered.
        assertEquals(1, listener2.getCallCount());
        // Second trigger.
        assertEquals(
            1,
            app1AuthTokenListener.getCallCount());
        assertEquals(
            'accessToken2',
            app1AuthTokenListener.getLastCall().getArgument(0));

        // Remove remaining listeners and reset.
        app1AuthTokenListener.reset();
        listener2.reset();
        auth1.removeAuthTokenListener(listener2);
        authInternal1.removeAuthTokenListener(app1AuthTokenListener);
        // Force token change.
        currentAccessToken = 'accessToken3';
        auth1['currentUser'].getIdToken().then(function(token) {
          assertEquals('accessToken3', token);
          // No listeners triggered anymore since they are all unsubscribed.
          assertEquals(0, app1AuthTokenListener.getCallCount());
          assertEquals(0, listener1.getCallCount());
          assertEquals(0, listener2.getCallCount());
          asyncTestCase.signal();
        });
      });
    });
    // Wait for state to be ready on auth2.
    auth2.onIdTokenChanged(function(currentUser) {
      // auth2 listener triggered on init with null state once.
      assertEquals(1, listener3.getCallCount());
      assertEquals(
           1,
           app2AuthTokenListener.getCallCount());
      assertNull(
           app2AuthTokenListener.getLastCall().getArgument(0));
      assertNull(currentUser);
      asyncTestCase.signal();
    });
  });
}


/**
 * Tests the notifications made to observers defined through the public API,
 * when calling the notifyAuthListeners.
 */
function testNotifyAuthStateObservers() {
  stubs.reset();
  // Simulate available token.
  var counter = 0;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Generate new token on each call.
        counter++;
        return goog.Promise.resolve({
          accessToken: 'accessToken' + counter.toString(),
          refreshToken: 'refreshToken'
        });
      });
  // Simulate user logged in.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        return goog.Promise.resolve(user);
      });
  initializeMockStorage();
  // Suppress addStateChangeListener.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {});
  // Simulate available token.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        asyncTestCase.signal();
        // Token not refreshed, notifyAuthListeners_ should call regardless.
        return goog.Promise.resolve();
      });
  var user = new fireauth.AuthUser(config3, expectedTokenResponse);
  var observer1 = mockControl.createFunctionMock('observer1');
  var observer2 = mockControl.createFunctionMock('observer2');
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  observer1(user).$does(function(u) {
    // Should be triggered after state is resolved.
    assertEquals(0, marker++);
    auth1.onIdTokenChanged(observer2);
  });
  observer2(user).$does(function(u) {
    // Should be triggered after listener2 is added.
    assertEquals(1, marker++);
    // Auth state change notification should also trigger immediately now.
    // Simulate Auth event to trigger both listeners.
    user.getIdToken();
  });
  observer1(user).$does(function(u) {
    // Should be triggered after state is resolved.
    assertEquals(2, marker++);
  });
  observer2(user).$does(function(u) {
    // Should be triggered after listener2 is added.
    assertEquals(3, marker++);
    // Auth state change notification should also trigger immediately now.
    // Simulate Auth event to trigger listeners.
    user.getIdToken();
    // Removes the first observer.
    unsubscribe1();
  });
  observer2(user).$does(function(u) {
    // Marker should confirm listener triggered after notifyAuthListeners_.
    assertEquals(4, marker++);
    asyncTestCase.signal();
  });
  mockControl.$replayAll();
  // Wait for the final observer call and the 2 intermediate internal callbacks.
  asyncTestCase.waitForSignals(2);
  // Keep track of what is triggering the events.
  var marker = 0;
  // Test listeners called when state first determined.
  var unsubscribe1 = auth1.onIdTokenChanged(observer1);
}


/**
 * Tests the notifications made to user state observers defined through the
 * public API, when calling the notifyAuthListeners.
 */
function testAuth_onAuthStateChanged() {
  stubs.reset();
  // Simulate available token.
  var counter = 0;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_forceRefresh) {
        // Generate new token on each call.
        counter++;
        return goog.Promise.resolve({
          accessToken: 'accessToken' + counter.toString(),
          refreshToken: 'refreshToken'
        });
      });
  var expectedTokenResponse2 = {
    'idToken': jwt2,
    'refreshToken': 'REFRESH_TOKEN2'
  };
  // Simulate user initially logged in.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        return goog.Promise.resolve(user);
      });
  initializeMockStorage();
  // Suppress addStateChangeListener.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {});
  // Simulate available token.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Token not refreshed, notifyAuthListeners_ should call regardless.
        return goog.Promise.resolve();
      });
  // Simulate new user sign in.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function() {
        return goog.Promise.resolve(user2);
      });
  var user = new fireauth.AuthUser(
      config3, expectedTokenResponse, {'uid': '1234'});
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse2, {'uid': '5678'});
  var observer1 = mockControl.createFunctionMock('observer1');
  var observer2 = mockControl.createFunctionMock('observer2');
  var observer3 = mockControl.createFunctionMock('observer3');
  var unsubscribe1, unsubscribe2, unsubscribe3;
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  observer1(user).$does(function(u) {
    // Should be triggered after state is resolved.
    assertEquals(0, marker++);
    // This should not trigger the listeners.
    user.getIdToken().then(function(token) {
      assertEquals(1, marker++);
      // Add new observer.
      unsubscribe2 = auth1.onAuthStateChanged(observer2);
    });
  }).$once();
  observer2(user).$does(function(u) {
    // Should be triggered after observer2 is added.
    assertEquals(2, marker++);
    // This should not trigger the listeners.
    user.getIdToken().then(function(token) {
      assertEquals(3, marker++);
      // Add new observer.
      unsubscribe3 = auth1.onAuthStateChanged(observer3);
    });
  }).$once();
  observer3(user).$does(function(u) {
    // Should be triggered after observer3 is added.
    assertEquals(4, marker++);
    // Unsubscribe first observer.
    unsubscribe1();
    // This should trigger the 2 other observers.
    auth1.signOut();
  }).$once();
  observer2(null).$does(function(u) {
    assertEquals(5, marker++);
  }).$once();
  observer3(null).$does(function(u) {
    assertEquals(6, marker++);
    // Simulate new user sign in. Both observers should trigger with user2.
    auth1.signInWithIdTokenResponse(expectedTokenResponse2);
  }).$once();
  observer2(user2).$does(function(u) {
    assertEquals(7, marker++);
  }).$once();
  observer3(user2).$does(function(u) {
    assertEquals(8, marker++);
    // This should do nothing.
    user2.getIdToken().then(function(token) {
      assertEquals(9, marker++);
      // Unsubscribe second observer.
      unsubscribe2();
      // Sign out should trigger observer3.
      auth1.signOut();
    });
  }).$once();
  observer3(null).$does(function(u) {
    assertEquals(10, marker++);
    // Unsubscribe observer3.
    unsubscribe3();
    // Add observer1 again.
    unsubscribe1 = auth1.onAuthStateChanged(observer1);
  }).$once();
  observer1(null).$does(function(u) {
    // Observer1 should trigger immediately.
    assertEquals(11, marker++);
    asyncTestCase.signal();
  }).$once();

  mockControl.$replayAll();
  asyncTestCase.waitForSignals(1);
  // Keep track of what is triggering the events.
  var marker = 0;
  // Test listeners called when state first determined.
  unsubscribe1 = auth1.onAuthStateChanged(observer1);
}


function testFetchSignInMethodsForEmail() {
  var email = 'foo@bar.com';
  var expectedSignInMethods = ['password', 'google.com'];

  asyncTestCase.waitForSignals(1);

  // Simulate successful RpcHandler fetchSignInMethodsForIdentifier.
  stubs.replace(
      fireauth.RpcHandler.prototype, 'fetchSignInMethodsForIdentifier',
      function(data) {
        assertObjectEquals(email, data);
        return goog.Promise.resolve(expectedSignInMethods);
      });

  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  auth1.fetchSignInMethodsForEmail(email).then(function(signInMethods) {
    assertArrayEquals(expectedSignInMethods, signInMethods);
    asyncTestCase.signal();
  });
  assertAuthTokenListenerCalledOnce(auth1);
}


function testFetchSignInMethodsForEmail_error() {
  var email = 'foo@bar.com';
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);

  asyncTestCase.waitForSignals(1);

  stubs.replace(
      fireauth.RpcHandler.prototype, 'fetchSignInMethodsForIdentifier',
      function(data) {
        assertObjectEquals(email, data);
        return goog.Promise.reject(expectedError);
      });

  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  auth1.fetchSignInMethodsForEmail(email)
      .then(function(signInMethods) {
        fail('fetchSignInMethodsForEmail should not resolve!');
      }).thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  assertAuthTokenListenerCalledOnce(auth1);
}


function testIsSignInWithEmailLink() {
  var emailLink1 = 'https://www.example.com/action?mode=signIn&' +
      'oobCode=oobCode&apiKey=API_KEY';
  var emailLink2 = 'https://www.example.com/action?mode=verifyEmail&' +
      'oobCode=oobCode&apiKey=API_KEY';
  var emailLink3 = 'https://www.example.com/action?mode=signIn';
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  var isSignInLink1 = auth1.isSignInWithEmailLink(emailLink1);
  assertEquals(true, isSignInLink1);
  var isSignInLink2 = auth1.isSignInWithEmailLink(emailLink2);
  assertEquals(false, isSignInLink2);
  var isSignInLink3 = auth1.isSignInWithEmailLink(emailLink3);
  assertEquals(false, isSignInLink3);
}


function testIsSignInWithEmailLink_deepLink() {
  var deepLink1 = 'https://www.example.com/action?mode=signIn&oobCode=oobCode' +
      '&apiKey=API_KEY';
  var deepLink2 = 'https://www.example.com/action?mode=verifyEmail&' +
      'oobCode=oobCode&apiKey=API_KEY';
  var deepLink3 = 'https://www.example.com/action?mode=signIn';

  var emailLink1 = 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(deepLink1);
  var emailLink2= 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(deepLink2);
  var emailLink3 = 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(deepLink3);
  var emailLink4 = 'comexampleiosurl://google/link?deep_link_id=' +
      encodeURIComponent(deepLink1);

  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertEquals(true, auth1.isSignInWithEmailLink(emailLink1));
  assertEquals(false, auth1.isSignInWithEmailLink(emailLink2));
  assertEquals(false, auth1.isSignInWithEmailLink(emailLink3));
  assertEquals(true, auth1.isSignInWithEmailLink(emailLink4));
}


function testAuth_pendingPromises() {
  asyncTestCase.waitForSignals(1);
  // Simulate available token.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(appOptions, stsTokenResponse, opt_redirectStorageManager) {
        // There should be pending promises before the sign in call below.
        assertTrue(auth1.hasPendingPromises());
        return user1;
      });
  // verifyCustomToken should be called with expected parameters and resolved
  // with expected token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyCustomToken',
      function(customToken) {
        assertEquals('custom', customToken);
        return goog.Promise.resolve(expectedTokenResponse);
      });
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  auth1.signInWithCustomToken('custom').then(function(user) {
    // No longer pending.
    assertFalse(auth1.hasPendingPromises());
    asyncTestCase.signal();
  });
}


function testAuth_delete() {
  asyncTestCase.waitForSignals(2);
  // Simulate available token.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        // Return a promise that does not fulfill to ensure that delete is
        // called.
        return new goog.Promise(function(resolve, reject) {});
      });
  // verifyCustomToken should be called with expected parameters and resolved
  // with expected token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyCustomToken',
      function(customToken) {
        return goog.Promise.resolve(expectedTokenResponse);
      });
  // Listener to removeStateChangeListener.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'removeCurrentUserChangeListener',
      goog.testing.recordFunction());
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  auth1.signInWithCustomToken('customToken')
      .then(function(user) {
        fail('This promise should not fulfill after auth.delete!');
      }).thenCatch(function(error) {
        // Cancellation error should trigger.
        assertEquals(fireauth.authenum.Error.MODULE_DESTROYED, error.message);
        asyncTestCase.signal();
      });
  auth1.onIdTokenChanged(function(user) {
    auth1.INTERNAL.delete();
    assertFalse(auth1.hasPendingPromises());
    /** @suppress {missingRequire} */
    // confirm removeStateChangeListener called.
    assertEquals(
        1,
        fireauth.storage.UserManager.prototype.removeCurrentUserChangeListener
            .getCallCount());
    // Try to change the language.
    auth1.languageCode = 'fr';
    // No change should occur.
    assertNull(auth1.languageCode);
    asyncTestCase.signal();
  });
}


/**
 * Tests sendSignInLinkToEmail successful operation with action code settings.
 */
function testSendSignInLinkToEmail_success() {
  var expectedEmail = 'user@example.com';
  // Simulate successful RpcHandler sendSignInLinkToEmail.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendSignInLinkToEmail',
      function(email, actualActionCodeSettings) {
        assertObjectEquals(
            new fireauth.ActionCodeSettings(actionCodeSettings).buildRequest(),
            actualActionCodeSettings);
        assertEquals(expectedEmail, email);
        return goog.Promise.resolve(expectedEmail);
      });
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.sendSignInLinkToEmail(expectedEmail, actionCodeSettings)
      .then(function() {
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


/**
 * Tests sendSignInLinkToEmail failing operation due to backend error.
 */
function testSendSignInLinkToEmail_error() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedEmail = 'user@example.com';
  // Simulate unsuccessful RpcHandler sendSignInLinkToEmail.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendSignInLinkToEmail',
      function(email, actualActionCodeSettings) {
        assertObjectEquals(
            new fireauth.ActionCodeSettings(actionCodeSettings).buildRequest(),
            actualActionCodeSettings);
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.sendSignInLinkToEmail(expectedEmail, actionCodeSettings)
      .then(function() {
        fail('sendSignInLinkToEmail should not resolve!');
      }).thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


/**
 * Tests sendSignInLinkToEmail empty continue URL in action code settings.
 */
function testSendSignInLinkToEmail_emptyContinueUrl_error() {
  var settings = {
    'url': '',
    'handleCodeInApp': true
  };
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_CONTINUE_URI);

  var expectedEmail = 'user@example.com';
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.sendSignInLinkToEmail(expectedEmail, settings)
      .then(function() {
        fail('sendSignInLinkToEmail should not resolve!');
      }).thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


/**
 * Tests sendSignInLinkToEmail invalid handleCodeInApp settings.
 */
function testSendSignInLinkToEmail_handleCodeInApp_error() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    'handleCodeInApp': false
  };
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR,
      'handleCodeInApp must be true when sending sign in link to email');
  var expectedEmail = 'user@example.com';
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.sendSignInLinkToEmail(expectedEmail, settings)
      .then(function() {
        fail('sendSignInLinkToEmail should not resolve!');
      }).thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


/**
 * Tests sendPasswordResetEmail successful operation with no action code
 * settings.
 */
function testSendPasswordResetEmail_success() {
  var expectedEmail = 'user@example.com';
  // Simulate successful RpcHandler sendPasswordResetEmail.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendPasswordResetEmail',
      function(email, actualActionCodeSettings) {
        assertObjectEquals({}, actualActionCodeSettings);
        assertEquals(expectedEmail, email);
        return goog.Promise.resolve(expectedEmail);
      });
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.sendPasswordResetEmail(expectedEmail).then(function() {
    asyncTestCase.signal();
  });
  asyncTestCase.waitForSignals(1);
}


/**
 * Tests sendPasswordResetEmail failing operation due to backend error.
 */
function testSendPasswordResetEmail_error() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedEmail = 'user@example.com';
  // Simulate unsuccessful RpcHandler sendPasswordResetEmail.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendPasswordResetEmail',
      function(email, actualActionCodeSettings) {
        assertObjectEquals({}, actualActionCodeSettings);
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.sendPasswordResetEmail(expectedEmail).then(function() {
    fail('sendPasswordResetEmail should not resolve!');
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


/**
 * Tests sendPasswordResetEmail successful operation with action code settings.
 */
function testSendPasswordResetEmail_actionCodeSettings_success() {
  var expectedEmail = 'user@example.com';
  // Simulate successful RpcHandler sendPasswordResetEmail.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendPasswordResetEmail',
      function(email, actualActionCodeSettings) {
        assertObjectEquals(
            new fireauth.ActionCodeSettings(actionCodeSettings).buildRequest(),
            actualActionCodeSettings);
        assertEquals(expectedEmail, email);
        return goog.Promise.resolve(expectedEmail);
      });
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.sendPasswordResetEmail(expectedEmail, actionCodeSettings)
      .then(function() {
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


/**
 * Tests sendPasswordResetEmail invalid action code settings.
 */
function testSendPasswordResetEmail_actionCodeSettings_error() {
  var settings = {
    'url': ''
  };
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_CONTINUE_URI);
  var expectedEmail = 'user@example.com';
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.sendPasswordResetEmail(expectedEmail, settings).then(function() {
    fail('sendPasswordResetEmail should not resolve!');
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


/**
 * Tests verifyPasswordResetCode successful operation.
 */
function testVerifyPasswordResetCode_success() {
  var expectedEmail = 'user@example.com';
  // Valid server response.
  var serverResponse = {
    kind: 'identitytoolkit#ResetPasswordResponse',
    email: expectedEmail,
    requestType: 'PASSWORD_RESET'
  };
  var expectedCode = 'PASSWORD_RESET_CODE';
  // Simulate successful RpcHandler confirmPasswordReset with no new password.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'checkActionCode',
      function(code) {
        assertEquals(expectedCode, code);
        return goog.Promise.resolve(serverResponse);
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.verifyPasswordResetCode(expectedCode)
      .then(function(email) {
        assertEquals(expectedEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests confirmPasswordReset successful operation.
 */
function testConfirmPasswordReset_success() {
  var expectedEmail = 'user@example.com';
  var expectedCode = 'PASSWORD_RESET_CODE';
  var expectedNewPassword = 'newPassword';
  // Simulate successful RpcHandler confirmPasswordReset.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'confirmPasswordReset',
      function(code, newPassword) {
        assertEquals(expectedCode, code);
        assertEquals(expectedNewPassword, newPassword);
        return goog.Promise.resolve(expectedEmail);
      });
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.confirmPasswordReset(expectedCode, expectedNewPassword)
      .then(function() {
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


/**
 * Tests confirmPasswordReset failing operation.
 */
function testConfirmPasswordReset_error() {
  var expectedCode = 'PASSWORD_RESET_CODE';
  var expectedNewPassword = 'newPassword';
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_OOB_CODE);
  // Simulate unsuccessful RpcHandler confirmPasswordReset.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'confirmPasswordReset',
      function(code, newPassword) {
        assertEquals(expectedCode, code);
        assertEquals(expectedNewPassword, newPassword);
        return goog.Promise.reject(expectedError);
      });
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.confirmPasswordReset(expectedCode, expectedNewPassword)
      .then(function() {
        fail('confirmPasswordReset should not resolve!');
      })
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}



/**
 * Tests checkActionCode successful operation.
 */
function testCheckActionCode_success() {
  var expectedCode = 'PASSWORD_RESET_CODE';
  var expectedServerResponse = {
    kind: 'identitytoolkit#ResetPasswordResponse',
    requestType: 'PASSWORD_RESET',
    email: 'user@example.com'
  };
  var expectedActionCodeInfo =
      new fireauth.ActionCodeInfo(expectedServerResponse);
  // Simulate successful RpcHandler checkActionCode.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'checkActionCode',
      function(code) {
        assertEquals(expectedCode, code);
        return goog.Promise.resolve(expectedServerResponse);
      });
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.checkActionCode(expectedCode)
      .then(function(info) {
        assertObjectEquals(expectedActionCodeInfo, info);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


/**
 * Tests checkActionCode failing operation.
 */
function testCheckActionCode_error() {
  var expectedCode = 'PASSWORD_RESET_CODE';
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_OOB_CODE);
  // Simulate unsuccessful RpcHandler checkActionCode.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'checkActionCode',
      function(code) {
        assertEquals(expectedCode, code);
        return goog.Promise.reject(expectedError);
      });
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.checkActionCode(expectedCode)
      .then(function() {
        fail('checkActionCode should not resolve!');
      })
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


/**
 * Tests applyActionCode successful operation.
 */
function testApplyActionCode_success() {
  var expectedEmail = 'user@example.com';
  var expectedCode = 'EMAIL_VERIFICATION_CODE';
  // Simulate successful RpcHandler applyActionCode.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'applyActionCode',
      function(code) {
        assertEquals(expectedCode, code);
        return goog.Promise.resolve(expectedEmail);
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  assertAuthTokenListenerCalledOnce(auth1);
  auth1.applyActionCode(expectedCode).then(function() {
    asyncTestCase.signal();
  });
}


/**
 * Tests applyActionCode failing operation.
 */
function testApplyActionCode_error() {
  var expectedCode = 'EMAIL_VERIFICATION_CODE';
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_OOB_CODE);
  // Simulate unsuccessful RpcHandler applyActionCode.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'applyActionCode',
      function(code) {
        assertEquals(expectedCode, code);
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config1, appId1);
  auth1 = app1.auth();
  auth1.applyActionCode(expectedCode)
      .then(function() {
        fail('confirmPasswordReset should not resolve!');
      }, function(error) {
        asyncTestCase.signal();
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      });
}


/** Replace the OAuth Sign in handler with a fake imitation for testing. */
function fakeOAuthSignInHandler() {
  // Helper function to replace instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {},
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
}


function testAuth_authEventManager() {
  // Test Auth event manager.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  initializeMockStorage();
  var expectedManager = {
    'subscribe': goog.testing.recordFunction(),
    'unsubscribe': goog.testing.recordFunction(),
    'clearRedirectResult': goog.testing.recordFunction()
  };
  // Return stub manager.
  stubs.replace(
      fireauth.AuthEventManager,
      'getManager',
      function(authDomain, apiKey, appName) {
        assertEquals('subdomain.firebaseapp.com', authDomain);
        assertEquals('API_KEY', apiKey);
        assertEquals(appId1, appName);
        return expectedManager;
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Test manager initialized and Auth subscribed.
  auth1.onIdTokenChanged(function(user) {
    var manager = fireauth.AuthEventManager.getManager(
        config3['authDomain'], config3['apiKey'], app1.name);
    assertEquals(expectedManager, manager);
    assertEquals(0, expectedManager.unsubscribe.getCallCount());
    assertEquals(1, expectedManager.subscribe.getCallCount());
    assertEquals(
        auth1, expectedManager.subscribe.getLastCall().getArgument(0));
    assertEquals(0, expectedManager.clearRedirectResult.getCallCount());
    // Delete should trigger unsubscribe and redirect result clearing.
    auth1.delete();
    // After destroy, Auth should be unsubscribed.
    assertEquals(1, expectedManager.subscribe.getCallCount());
    assertEquals(1, expectedManager.unsubscribe.getCallCount());
    // Redirect result should also be cleared.
    assertEquals(1, expectedManager.clearRedirectResult.getCallCount());
    assertEquals(
        auth1, expectedManager.unsubscribe.getLastCall().getArgument(0));
    asyncTestCase.signal();
  });
}


function testAuth_authEventManager_withEmulator() {
  // Test Auth event manager.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  initializeMockStorage();
  var expectedManager = {
    'subscribe': goog.testing.recordFunction(),
    'unsubscribe': goog.testing.recordFunction(),
    'clearRedirectResult': goog.testing.recordFunction()
  };
  // Return stub manager.
  stubs.replace(
    fireauth.AuthEventManager,
    'getManager',
    function (authDomain, apiKey, appName, emulatorConfig) {
      assertEquals('subdomain.firebaseapp.com', authDomain);
      assertEquals('API_KEY', apiKey);
      assertEquals(appId1, appName);
      assertObjectEquals(emulatorConfig, {
        url: 'http://emulator.test.domain:1234'
      });
      return expectedManager;
    });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  auth1.useEmulator('http://emulator.test.domain:1234');
  // Test manager initialized and Auth subscribed.
  auth1.onIdTokenChanged(function (user) {
    var manager = fireauth.AuthEventManager.getManager(
      config3['authDomain'], config3['apiKey'], app1.name, {
      url: 'http://emulator.test.domain:1234',
    });
    assertEquals(expectedManager, manager);
    assertEquals(0, expectedManager.unsubscribe.getCallCount());
    assertEquals(1, expectedManager.subscribe.getCallCount());
    assertEquals(
      auth1, expectedManager.subscribe.getLastCall().getArgument(0));
    assertEquals(0, expectedManager.clearRedirectResult.getCallCount());
    // Delete should trigger unsubscribe and redirect result clearing.
    auth1.delete();
    // After destroy, Auth should be unsubscribed.
    assertEquals(1, expectedManager.subscribe.getCallCount());
    assertEquals(1, expectedManager.unsubscribe.getCallCount());
    // Redirect result should also be cleared.
    assertEquals(1, expectedManager.clearRedirectResult.getCallCount());
    assertEquals(
      auth1, expectedManager.unsubscribe.getLastCall().getArgument(0));
    asyncTestCase.signal();
  });
}


/** Asserts that AuthEventManager can pass through emulator settings. */
function testAuth_authEventManager_withEmulator() {
  // Test Auth event manager.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  initializeMockStorage();
  var expectedManager = {
    'subscribe': goog.testing.recordFunction(),
    'unsubscribe': goog.testing.recordFunction(),
    'clearRedirectResult': goog.testing.recordFunction()
  };
  // Return stub manager.
  stubs.replace(
    fireauth.AuthEventManager,
    'getManager',
    function (authDomain, apiKey, appName, emulatorConfig) {
      assertEquals('subdomain.firebaseapp.com', authDomain);
      assertEquals('API_KEY', apiKey);
      assertEquals(appId1, appName);
      assertObjectEquals(emulatorConfig, {
        url: 'http://emulator.host:1234'
      });
      return expectedManager;
    });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  auth1.useEmulator('http://emulator.host:1234');
  // Test manager initialized and Auth subscribed.
  auth1.onIdTokenChanged(function (user) {
    var manager = fireauth.AuthEventManager.getManager(
      config3['authDomain'], config3['apiKey'], app1.name, {
      url: 'http://emulator.host:1234'
    });
    assertEquals(expectedManager, manager);
    assertEquals(0, expectedManager.unsubscribe.getCallCount());
    assertEquals(1, expectedManager.subscribe.getCallCount());
    assertEquals(
      auth1, expectedManager.subscribe.getLastCall().getArgument(0));
    assertEquals(0, expectedManager.clearRedirectResult.getCallCount());
    // Delete should trigger unsubscribe and redirect result clearing.
    auth1.delete();
    // After destroy, Auth should be unsubscribed.
    assertEquals(1, expectedManager.subscribe.getCallCount());
    assertEquals(1, expectedManager.unsubscribe.getCallCount());
    // Redirect result should also be cleared.
    assertEquals(1, expectedManager.clearRedirectResult.getCallCount());
    assertEquals(
      auth1, expectedManager.unsubscribe.getLastCall().getArgument(0));
    asyncTestCase.signal();
  });
}


function testAuth_signout() {
  // Test successful sign out.
  fireauth.AuthEventManager.ENABLED = true;
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Simulate new token on each call.
  var counter = 0;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        // Return new token on each call.
        counter++;
        return goog.Promise.resolve({
          'accessToken': 'ID_TOKEN' + counter.toString(),
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Access token unchanged, should trigger notifyAuthListeners_.
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(3);
  // Logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Save current user in storage.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);

  var savedUser = null;
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set Auth language.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    var authChangeCalled = 0;
    // This should trigger initially and then on sign out.
    auth1.addAuthTokenListener(function(token) {
      authChangeCalled++;
      if (authChangeCalled == 1) {
        // Save current user.
        savedUser =  auth1['currentUser'];
        assertUserEquals(user1, auth1['currentUser']);
      } else if (authChangeCalled == 2) {
        assertNull(auth1['currentUser']);
      } else {
        fail('Auth state change should not trigger more than twice!');
      }
      asyncTestCase.signal();
    });
    auth1.signOut().then(function() {
      // User should be deleted from storage.
      return currentUserStorageManager.getCurrentUser();
    })
    .then(function(user) {
      // No user stored anymore.
      assertNull(user);
      // Current user should be nullified.
      assertNull(auth1['currentUser']);
      // Language should be set on signed out user.
      assertEquals('fr', savedUser.getLanguageCode());
      // Framework updates should still propagate to signed out user.
      assertArrayEquals(['firebaseui'], savedUser.getFramework());
      auth1.logFramework('angularfire');
      assertArrayEquals(
          ['firebaseui', 'angularfire'], savedUser.getFramework());
      // Language updates should still propagate to signed out user.
      auth1.languageCode = 'de';
      assertEquals('de', savedUser.getLanguageCode());
      // Refresh token on logged out user.
      savedUser.getIdToken().then(function(token) {
        // Should not trigger listeners.
        assertEquals('ID_TOKEN2', token);
        asyncTestCase.signal();
      });
    });
  });
}


function testAuth_initState_signedInStatus() {
  // Test init state with previously signed in user.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // New loaded user should be reloaded before being set as current user.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Access token unchanged, should trigger notifyAuthListeners_.
        return goog.Promise.resolve();
      });
  // Current user change listener should be added for future changes.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {
        asyncTestCase.signal();
      });
  // Return new token on each request.
  var counter = 0;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        // Return new token on each call.
        counter++;
        return goog.Promise.resolve({
          'accessToken': 'ID_TOKEN' + counter.toString(),
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  asyncTestCase.waitForSignals(4);
  // Logged in user to be detected in initState.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Save signed in user to storage.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set language code.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    // Before init state current user is null.
    assertNull(auth1['currentUser']);
    // This should run when signed in user is detected.
    var tokenChangeCalls = 0;
    auth1.addAuthTokenListener(function(token) {
      tokenChangeCalls++;
      // Signed in user should be detected.
      assertUserEquals(user1, auth1['currentUser']);
      // Trigger token change on user, it should be detected by Auth listener
      // above. Run only on first call.
      if (tokenChangeCalls == 1) {
        // Framework should propagate to currentUser.
        assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
        // Language code should propagate to currentUser.
        assertEquals('fr', auth1['currentUser'].getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', auth1['currentUser'].getLanguageCode());
        auth1['currentUser'].getIdToken().then(function(token) {
          // Token listener above should have detected this and incremented
          // tokenChangeCalls.
          assertEquals(2, tokenChangeCalls);
          asyncTestCase.signal();
        });
      }
    });
    auth1.onIdTokenChanged(function(user) {
      var manager = fireauth.AuthEventManager.getManager(
          config3['authDomain'], config3['apiKey'], app1.name);
      // Auth and its current user should be subscribed.
      assertTrue(manager.isSubscribed(auth1));
      assertTrue(manager.isSubscribed(auth1['currentUser']));
      asyncTestCase.signal();
    });
    // User state change triggered with user.
    auth1.onAuthStateChanged(function(user) {
      assertNotNull(user);
      asyncTestCase.signal();
    });
  });
}


function testAuth_initState_signedInStatus_withEmulator() {
  // Test init state with previously signed in user.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
    goog,
    'now',
    function () {
      return now;
    });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // New loaded user should be reloaded before being set as current user.
  stubs.replace(
    fireauth.AuthUser.prototype,
    'reload',
    function () {
      // Access token unchanged, should trigger notifyAuthListeners_.
      return goog.Promise.resolve();
    });
  // Listen to calls on RPC Handler.
  stubs.replace(
    fireauth.RpcHandler.prototype,
    'updateEmulatorConfig',
    goog.testing.recordFunction(
      fireauth.RpcHandler.prototype.updateEmulatorConfig));
  asyncTestCase.waitForSignals(1);
  // Logged in user to be detected in initState.
  var user1 = new fireauth.AuthUser(
    config3, expectedTokenResponse, accountInfo);
  // Save signed in user to storage.
  currentUserStorageManager = new fireauth.storage.UserManager(
    config3['apiKey'] + ':' + appId1);
  currentUserStorageManager.setCurrentUser(user1).then(function () {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set emulator.
    auth1.useEmulator('http://emulator.test.domain:1234');
    // Before init state current user is null.
    assertNull(auth1['currentUser']);
    // User state change triggered with user.
    auth1.onAuthStateChanged(function (user) {
      // Signed in user should be detected.
      assertUserEquals(user1, auth1['currentUser']);
      // Emulator config should propagate to currentUser.
      assertEquals(
        3, fireauth.RpcHandler.prototype.updateEmulatorConfig.getCallCount());
      assertEquals(auth1['currentUser'].getRpcHandler(),
        fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
          .getThis());
      assertObjectEquals(
        {
          url: 'http://emulator.test.domain:1234'
        },
        fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
          .getArgument(0));
      asyncTestCase.signal();
    });
  });
}


/**
 * Test that external changes on a saved user will apply after loading from
 * storage and reload on user is called. Confirm the updated user is saved.
 */
function testAuth_initState_reloadUpdate_previousSignedInUser() {
  asyncTestCase.waitForSignals(2);
  stubs.reset();
  initializeMockStorage();
  // Simulate reload introduced external changes to user.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        assertFalse(this['emailVerified']);
        this.updateProperty('emailVerified', true);
        this.updateProperty('displayName', 'New Name');
        // Internally calls Auth user listeners.
        return goog.Promise.resolve();
      });
  // Create user with emailVerified set to false.
  accountInfo['emailVerified'] = false;
  accountInfo['displayName'] = 'Previous Name';
  var user = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // Confirm created user has email not verified and old display name.
  assertFalse(user['emailVerified']);
  assertEquals('Previous Name', user['displayName']);
  // Save test user.
  currentUserStorageManager.setCurrentUser(user).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // This will load user from storage and then call reload on it.
    // Confirm that user emailVerified and display name are updated.
    auth1.onIdTokenChanged(function(user) {
      // These should have updated.
      assertTrue(user['emailVerified']);
      assertEquals('New Name', user['displayName']);
      // Confirm user with verified email and update name is updated in storage
      // too.
      currentUserStorageManager.getCurrentUser(user).then(function(tempUser) {
        assertTrue(tempUser['emailVerified']);
        assertEquals('New Name', tempUser['displayName']);
        asyncTestCase.signal();
      });
    });
    // User state change triggered with user.
    auth1.onAuthStateChanged(function(user) {
      assertNotNull(user);
      asyncTestCase.signal();
    });
  });
}


function testAuth_initState_signedInStatus_differentAuthDomain() {
  // Test init state with previously signed in user using an authDomain
  // different from the current Auth instance authDomain. Its authDomain should
  // be overridden with current app authDomain.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // New loaded user should be reloaded before being set as current user.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Access token unchanged, should trigger notifyAuthListeners_.
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(1);
  // Simulate the previously logged in user has a different authDomain.
  var user1 = new fireauth.AuthUser(
      config4, expectedTokenResponse, accountInfo);
  // Auth will modify user to use its authDomain.
  var modifiedUser1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Save previous signed in user to storage with different authDomain.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    // App initialized with other authDomain
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set language code.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    // Before init state current user is null.
    assertNull(auth1['currentUser']);
    // This should run when signed in user is detected.
    auth1.addAuthTokenListener(function(token) {
      // Framework should propagate to modified signed in user.
      assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
      auth1.logFramework('angularfire');
      assertArrayEquals(
          ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
      // Modified signed in user should be detected.
      assertUserEquals(modifiedUser1, auth1['currentUser']);
      // Language code should propagate to currentUser.
      assertEquals('fr', auth1['currentUser'].getLanguageCode());
      auth1.languageCode = 'de';
      assertEquals('de', auth1['currentUser'].getLanguageCode());
      asyncTestCase.signal();
    });
  });
}


function testAuth_initState_signedInStatus_withRedirectUser() {
  // Test init state with previously signed in user and a pending signed out
  // redirect user. The current user in this case does not have the same
  // redirect event ID as the redirected user.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Assume origin is a valid one.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Return new token on each request.
  var counter = 0;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        // Return new token on each call.
        counter++;
        return goog.Promise.resolve({
          'accessToken': 'ID_TOKEN' + counter.toString(),
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  // New loaded user should be reloaded before being set as current user.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      goog.testing.recordFunction(function() {
        return goog.Promise.resolve();
      }));
  // Record enablePopupRedirect on user.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'enablePopupRedirect',
      goog.testing.recordFunction(
          fireauth.AuthUser.prototype.enablePopupRedirect));
  asyncTestCase.waitForSignals(2);
  // Logged in user to be detected in initState.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Only set the event ID on the redirected user.
  user2.setRedirectEventId('12345678');
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // Save previous redirect user.
  redirectUserStorageManager = new fireauth.storage.RedirectUserManager(
      config3['apiKey'] + ':' + appId1);
  redirectUserStorageManager.setRedirectUser(user2).then(function() {
    // Save signed in user to storage.
    return currentUserStorageManager.setCurrentUser(user1);
  }).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set language code.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    // Before init state current user is null.
    assertNull(auth1['currentUser']);
    // This should run when signed in user is detected.
    var tokenChangeCalls = 0;
    auth1.addAuthTokenListener(function(token) {
      tokenChangeCalls++;
      var manager = fireauth.AuthEventManager.getManager(
          config3['authDomain'], config3['apiKey'], app1.name);
      // Auth, current user and the redirect user should be subscribed.
      assertTrue(manager.isSubscribed(auth1));
      assertTrue(manager.isSubscribed(auth1['currentUser']));
      assertEquals(
          2, fireauth.AuthUser.prototype.enablePopupRedirect.getCallCount());
      // Redirect user.
      var redirectUser =
          fireauth.AuthUser.prototype.enablePopupRedirect.getLastCall()
              .getThis();
      // Confirm redirect user.
      assertUserEquals(redirectUser, user2);
      // Redirect user subscribed.
      assertTrue(manager.isSubscribed(redirectUser));
      // Check redirect event ID on redirect user.
      assertEquals('12345678', redirectUser.getRedirectEventId());
      // Signed in user should be detected.
      assertUserEquals(user1, auth1['currentUser']);
      // Trigger all listeners on user, they should be detected by Auth
      // listeners above. Trigger only on first call.
      if (tokenChangeCalls == 1) {
        // Framework should propagate to redirectUser.
        assertArrayEquals(['firebaseui'], redirectUser.getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], redirectUser.getFramework());
        // Language code should propagate to redirectUser.
        assertEquals('fr', redirectUser.getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', redirectUser.getLanguageCode());
        auth1['currentUser'].getIdToken().then(function(token) {
          // Should trigger a token change, confirming Auth still listening to
          // events on this user.
          assertEquals(2, tokenChangeCalls);
          asyncTestCase.signal();
        });
        // No need to run getRedirectUser below more than once.
        return;
      }
      // Redirect user should not longer be saved in storage.
      redirectUserStorageManager.getRedirectUser().then(function(user) {
        assertNull(user);
        // As no redirect event ID is set on current user, reload should be
        // called on the current user loaded from storage.
        assertEquals(1, fireauth.AuthUser.prototype.reload.getCallCount());
        asyncTestCase.signal();
      });
    });
  });
}


function testAuth_initState_signedInStatus_withRedirectUser_sameEventId() {
  // Test init state with a signed in user that is attempting a redirect
  // operation ID. The current user and redirect user will have the same
  // redirect event ID.
  // This test is needed to confirm that user is not reloaded after loading from
  // storage. This is important for reauthenticateWithRedirect as this operation
  // could be called to recover before token expiration is detected.
  // user.reload() could clear the user from storage, ending up with the user no
  // longer being current.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Assume origin is a valid one.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Return new token on each request.
  var counter = 0;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        // Return new token on each call.
        counter++;
        return goog.Promise.resolve({
          'accessToken': 'ID_TOKEN' + counter.toString(),
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  // New loaded user should not be reloaded before being set as current user.
  // This is needed to allow the redirect operation to complete.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      goog.testing.recordFunction(function() {
        return goog.Promise.resolve();
      }));
  // Record enablePopupRedirect on user.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'enablePopupRedirect',
      goog.testing.recordFunction(
          fireauth.AuthUser.prototype.enablePopupRedirect));
  asyncTestCase.waitForSignals(2);
  // Logged in user to be detected in initState.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Set redirect event ID on user1 to match user2.
  user1.setRedirectEventId('12345678');
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Set redirect event ID on the redirect user.
  user2.setRedirectEventId('12345678');
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // Save previous redirect user.
  redirectUserStorageManager = new fireauth.storage.RedirectUserManager(
      config3['apiKey'] + ':' + appId1);
  redirectUserStorageManager.setRedirectUser(user2).then(function() {
    // Save signed in user to storage.
    return currentUserStorageManager.setCurrentUser(user1);
  }).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set language code.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    // Before init state current user is null.
    assertNull(auth1['currentUser']);
    // This should run when signed in user is detected.
    var tokenChangeCalls = 0;
    auth1.addAuthTokenListener(function(token) {
      tokenChangeCalls++;
      var manager = fireauth.AuthEventManager.getManager(
          config3['authDomain'], config3['apiKey'], app1.name);
      // Auth, current user and the redirect user should be subscribed.
      assertTrue(manager.isSubscribed(auth1));
      assertTrue(manager.isSubscribed(auth1['currentUser']));
      assertEquals(
          2, fireauth.AuthUser.prototype.enablePopupRedirect.getCallCount());
      // Redirect user.
      var redirectUser =
          fireauth.AuthUser.prototype.enablePopupRedirect.getLastCall()
              .getThis();
      // Confirm redirect user.
      assertUserEquals(redirectUser, user2);
      // Redirect user subscribed.
      assertTrue(manager.isSubscribed(redirectUser));
      // Check redirect event ID on redirect user.
      assertEquals('12345678', redirectUser.getRedirectEventId());
      // Signed in user should be detected.
      assertUserEquals(user1, auth1['currentUser']);
      // Trigger all listeners on user, they should be detected by auth
      // listeners above. Trigger only on first call.
      if (tokenChangeCalls == 1) {
        // Framework should propagate to redirectUser.
        assertArrayEquals(['firebaseui'], redirectUser.getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], redirectUser.getFramework());
        // Language code should propagate to redirectUser.
        assertEquals('fr', redirectUser.getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', redirectUser.getLanguageCode());
        auth1['currentUser'].getIdToken().then(function(token) {
          // Should trigger a token change, confirming Auth still listening to
          // events on this user.
          assertEquals(2, tokenChangeCalls);
          asyncTestCase.signal();
        });
        // No need to run getRedirectUser below more than once.
        return;
      }
      // Redirect user should not longer be saved in storage.
      redirectUserStorageManager.getRedirectUser().then(function(user) {
        assertNull(user);
        // As redirect event ID is set on the current user to be equal to the
        // redirect user event ID, reload should not be called on the current
        // user loaded from storage.
        assertEquals(0, fireauth.AuthUser.prototype.reload.getCallCount());
        asyncTestCase.signal();
      });
    });
  });
}


function testAuth_initState_signedInStatus_deletedUser() {
  // Test init state with previously signed in user that was deleted externally.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  // The typical error returned by reload.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // New loaded user should be reloaded. In this case throw an error.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        asyncTestCase.signal();
        return goog.Promise.reject(expectedError);
      });
  // Current user change listener should be added.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(6);
  // The current stored user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var storageKey = config3['apiKey'] + ':' + appId1;
  // Save signed in user.
  currentUserStorageManager = new fireauth.storage.UserManager(storageKey);
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Initially current user is null.
    assertNull(auth1['currentUser']);
    // Listener triggered on state resolution.
    auth1.addAuthTokenListener(function(token) {
      // Stored user should be retrieved but then on reload error cleared.
      assertNull(auth1['currentUser']);
      asyncTestCase.signal();
      currentUserStorageManager.getCurrentUser().then(function(user) {
        assertNull(user);
        asyncTestCase.signal();
      });
    });
    auth1.onIdTokenChanged(function(user) {
      var manager = fireauth.AuthEventManager.getManager(
          config3['authDomain'], config3['apiKey'], app1.name);
      // Auth only should be subscribed.
      assertTrue(manager.isSubscribed(auth1));
      asyncTestCase.signal();
    });
    // User state change triggered with no user.
    auth1.onAuthStateChanged(function(user) {
      assertNull(user);
      asyncTestCase.signal();
    });
  });
}


function testAuth_initState_signedInStatus_offline() {
  // Test init state with previously signed in user in offline mode. The user
  // should not be deleted and Auth state listener should trigger.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  // Network error typical in offline mode.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // New loaded user should be reloaded. In this case throw an error.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(4);
  // Current user change listener should be added.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {
        asyncTestCase.signal();
      });
  // The current stored user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var storageKey = config3['apiKey'] + ':' + appId1;
  // Save signed in user.
  currentUserStorageManager = new fireauth.storage.UserManager(storageKey);
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set language code.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    // Initially current user is null.
    assertNull(auth1['currentUser']);
    // Auth state change listener should trigger too.
    auth1.onIdTokenChanged(function(user) {
      assertUserEquals(user, auth1['currentUser']);
      asyncTestCase.signal();
    });
    // User state change triggered with user.
    auth1.onAuthStateChanged(function(user) {
      assertNotNull(user);
      asyncTestCase.signal();
    });
    // Listener triggered on state resolution.
    auth1.onAuthStateChanged(function(token) {
      // Stored user should be retrieved and kept.
      assertUserEquals(user1, auth1['currentUser']);
      // Framework should propagate to currentUser.
      assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
      auth1.logFramework('angularfire');
      assertArrayEquals(
          ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
      // Language code should propagate to currentUser.
      assertEquals('fr', auth1['currentUser'].getLanguageCode());
      auth1.languageCode = 'de';
      assertEquals('de', auth1['currentUser'].getLanguageCode());
      currentUserStorageManager.getCurrentUser().then(function(user) {
        assertUserEquals(user, auth1['currentUser']);
        asyncTestCase.signal();
      });
    });
  });
}


function testAuth_initState_signedOutStatus() {
  // Test init state with no user signed in.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  // Return a new token on each request.
  var counter = 0;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        // Return new token on each call.
        counter++;
        return goog.Promise.resolve({
          'accessToken': 'ID_TOKEN' + counter.toString(),
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Current user change listener should be added.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(4);
  // Save signed in user.
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // This is not realistic but to show that current user is set to null, set it.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  auth1.setCurrentUser_(user1);
  // On state resolution this would trigger.
  auth1.addAuthTokenListener(function(token) {
    // Current user is null.
    assertNull(auth1['currentUser']);
    // Confirm no listeners on old user.
    user1.getIdToken().then(function(token) {
      // Should not trigger listeners.
      asyncTestCase.signal();
    });
  });
  auth1.onIdTokenChanged(function(user) {
    var manager = fireauth.AuthEventManager.getManager(
        config3['authDomain'], config3['apiKey'], app1.name);
    // Auth only should be subscribed.
    assertTrue(manager.isSubscribed(auth1));
    asyncTestCase.signal();
  });
  // User state change triggered with no user.
  auth1.onAuthStateChanged(function(user) {
    assertNull(user);
    asyncTestCase.signal();
  });
}


function testAuth_syncAuthChanges_sameUser() {
  // Test syncAuthChanges with the same user detected.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Save sync listener.
  var syncListener = null;
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {
        syncListener = listener;
      });
  // Get token would get triggered to refresh token on detected user.
  // In this case simulate the token changed on the user.
  var counter = 0;
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        // Return new token on each call to force Auth token listeners.
        counter++;
        return goog.Promise.resolve({
          'accessToken': 'NEW_ACCESS_TOKEN' + counter.toString(),
          'refreshToken': 'NEW_REFRESH_TOKEN'
        });
      });
  var accountInfo1 = {
    'uid': '123456',
    'email': 'user1@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  var accountInfo2 = {
    'uid': '123456',
    'email': 'user2@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  asyncTestCase.waitForSignals(3);
  var userChanges = 0;
  // The originally logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo1);
  // The same user with external changes.
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo2);
  // Save signed in user.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // Initially user1 logged in.
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set language code.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    var unsubscribe = auth1.onIdTokenChanged(function(currentUser) {
      // Simulate user2 logged in in another tab.
      currentUserStorageManager.setCurrentUser(user2).then(function() {
        // Simulate syncing to external changes.
        syncListener().then(function() {
          var manager = fireauth.AuthEventManager.getManager(
              config3['authDomain'], config3['apiKey'], app1.name);
          // Auth and current user should be subscribed.
          assertTrue(manager.isSubscribed(auth1));
          assertTrue(manager.isSubscribed(auth1['currentUser']));
          // Same user reference remains.
          assertEquals(currentUser, auth1['currentUser']);
          // User1 should be updated with user2 data.
          assertEquals('user2@example.com', auth1['currentUser']['email']);
          asyncTestCase.signal();
        });
      });
      var firstCall = true;
      // As listeners are still attached and token change triggered, Auth state
      // listener should trigger.
      auth1.addAuthTokenListener(function(token) {
        // Ignore first call when user1 is logged in.
        if (firstCall) {
          // User1 logged in at this point.
          assertUserEquals(user1, auth1['currentUser']);
          // Framework set on first user.
          assertArrayEquals(
              ['firebaseui'], auth1['currentUser'].getFramework());
          // New framework update will be caught by user2.
          auth1.logFramework('angularfire');
          // Language should be set on first user.
          assertEquals('fr', auth1['currentUser'].getLanguageCode());
          // New language code update will be caught by user2.
          auth1.languageCode = 'de';
          firstCall = false;
          return;
        }
        // Current user updated with user2 data on next call.
        assertUserEquals(user2, auth1['currentUser']);
        // Updated framework on new current user.
        assertArrayEquals(
            ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
        // Updated language set on new current user.
        assertEquals('de', auth1['currentUser'].getLanguageCode());
        auth1.languageCode = 'ru';
        assertEquals('ru', auth1['currentUser'].getLanguageCode());
        asyncTestCase.signal();
      });
      unsubscribe();
    });
    // Should be called once with the initial user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertNotNull(currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_syncAuthChanges_newSignIn() {
  // Test syncAuthChanges with a new signed in user.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Save sync listener.
  var syncListener = null;
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {
        syncListener = listener;
      });
  var accountInfo1 = {
    'uid': '1234',
    'email': 'user1@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  var accountInfo2 = {
    'uid': '5678',
    'email': 'user2@example.com',
    'displayName': 'Jane Doe',
    'emailVerified': false
  };
  asyncTestCase.waitForSignals(4);
  var userChanges = 0;
  // The originally logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo1);
  // The external new user to be detected with different UID.
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo2);
  // Save new signed in user.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // Initially user1 signed in.
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set language code.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    // Wait for state to be ready.
    var unsubscribe = auth1.onIdTokenChanged(function(user) {
      // User 1 should be initially logged in.
      assertUserEquals(user1, auth1['currentUser']);
      // Simulate syncing to external changes where user 2 is logged in.
      currentUserStorageManager.setCurrentUser(user2).then(function() {
        syncListener().then(function() {
          // User 2 should be current user now.
          assertUserEquals(user2, auth1['currentUser']);
          // Confirm expected UID and email.
          assertEquals('5678', auth1['currentUser']['uid']);
          assertEquals('user2@example.com', user2['email']);
          // User1 reference still exists.
          assertEquals('REFRESH_TOKEN', user1['refreshToken']);
          asyncTestCase.signal();
        });
      });
      var firstCall = true;
      // notifyAuthListeners_ would be triggered here.
      auth1.addAuthTokenListener(function(token) {
        // Ignore first call for initial user.
        if (firstCall) {
          // Expected framework set on first user.
          assertArrayEquals(
              ['firebaseui'], auth1['currentUser'].getFramework());
          // Expected language set on first user.
          assertEquals('fr', auth1['currentUser'].getLanguageCode());
          firstCall = false;
          return;
        }
        // User 2 is the signed in user now on next call.
        assertUserEquals(user2, auth1['currentUser']);
        // Expected framework set on second user.
        assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
        // Expected language set on new current user.
        assertEquals('fr', auth1['currentUser'].getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', auth1['currentUser'].getLanguageCode());
        var manager = fireauth.AuthEventManager.getManager(
            config3['authDomain'], config3['apiKey'], app1.name);
        // Auth and current user should be subscribed.
        assertTrue(manager.isSubscribed(auth1));
        assertTrue(manager.isSubscribed(auth1['currentUser']));
        asyncTestCase.signal();
      });
      unsubscribe();
    });
    // Should be called twice with the different users.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      if (userChanges == 1) {
        assertEquals(user1['uid'], currentUser['uid']);
      } else {
        assertEquals(user2['uid'], currentUser['uid']);
      }
      asyncTestCase.signal();
    });
  });
}


function testAuth_syncAuthChanges_newSignIn_differentAuthDomain() {
  // Test syncAuthChanges with a new signed in user that has a different
  // authDomain than the current app authDomain. The synced user should have its
  // authDomain field overridden.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  asyncTestCase.waitForSignals(1);
  // The originally logged in user.
  // Simulate the new logged in user has a different authDomain.
  var user1 = new fireauth.AuthUser(
      config4, expectedTokenResponse, accountInfo);
  // Auth will modify user to use its authDomain.
  var modifiedUser1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set language code.
  auth1.languageCode = 'fr';
  // Log framework.
  auth1.logFramework('firebaseui');
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // Call sign out to wait for init state to resolve and to ensure no user is
  // logged in.
  auth1.signOut().then(function(result) {
    // Save new signed in user with different authDomain to trigger sync later.
    currentUserStorageManager.setCurrentUser(user1).then(function() {
      // Simulate storage event using a different authDomain.
      var storageEvent = new goog.testing.events.Event(
          goog.events.EventType.STORAGE, window);
      storageEvent.key = 'firebase:authUser:' + auth1.getStorageKey();
      storageEvent.oldValue = null;
      storageEvent.newValue = JSON.stringify(user1.toPlainObject());
      // Add new listener.
      auth1.addAuthTokenListener(function(token) {
        // Ignore initial state trigger.
        if (!token) {
          return;
        }
        // Modified user with app authDomain should be current user now.
        assertUserEquals(modifiedUser1, auth1['currentUser']);
        // Framework should propagate to currentUser.
        assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
        // Language code should propagate to currentUser.
        assertEquals('fr', auth1['currentUser'].getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', auth1['currentUser'].getLanguageCode());
        asyncTestCase.signal();
      });
      // This should force localstorage sync.
      mockLocalStorage.fireBrowserEvent(storageEvent);
    });
  });
}


function testAuth_syncAuthChanges_newSignOut() {
  // Test syncAuthChanges with a sign out event detected.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Save sync listener.
  var syncListener = null;
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'addCurrentUserChangeListener',
      function(listener) {
        syncListener = listener;
      });
  var accountInfo1 = {
    'uid': '1234',
    'email': 'user1@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  asyncTestCase.waitForSignals(4);
  // The originally logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo1);
  var savedUser;
  var userChanges = 0;
  // Initially user1 signed in.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Set language code.
    auth1.languageCode = 'fr';
    // Log framework.
    auth1.logFramework('firebaseui');
    // Wait for state to be ready.
    var unsubscribe = auth1.onIdTokenChanged(function(user) {
      // User 1 should be initially logged in.
      assertUserEquals(user1, auth1['currentUser']);
      // Simulate syncing to external changes where user 1 is logged out.
      currentUserStorageManager.removeCurrentUser().then(function() {
        // Simulate syncing to external changes.
        syncListener().then(function() {
          // Current user should be null now.
          assertNull(auth1['currentUser']);
          // User1 reference still exists.
          assertEquals('REFRESH_TOKEN', user1['refreshToken']);
          asyncTestCase.signal();
        });
      });
      var firstCall = true;
      // notifyAuthListeners_ would be triggered here.
      auth1.addAuthTokenListener(function(token) {
        // Ignore first call for initial user.
        if (firstCall) {
          // Save current user.
          savedUser = auth1['currentUser'];
          firstCall = false;
          return;
        }
        // Null current user on next call.
        assertNull(auth1['currentUser']);
        // Framework updates should still propagate to saved signed out user.
        assertArrayEquals(['firebaseui'], savedUser.getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], savedUser.getFramework());
        // Language code should propagate to saved signed out user.
        assertEquals('fr', savedUser.getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', savedUser.getLanguageCode());
        // Listeners no longer attached to old user.
        assertEquals(0, user1.stateChangeListeners_.length);
        var manager = fireauth.AuthEventManager.getManager(
            config3['authDomain'], config3['apiKey'], app1.name);
        // Auth and user1 should be subscribed on init even though user1 is no
        // longer current.
        assertTrue(manager.isSubscribed(auth1));
        assertTrue(manager.isSubscribed(savedUser));
        asyncTestCase.signal();
      });
      unsubscribe();
    });
    // Should be called twice: first with the expected user and then null, the
    // second time.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      if (userChanges == 1) {
        assertEquals(user1['uid'], currentUser['uid']);
      } else {
        assertNull(currentUser);
      }
      asyncTestCase.signal();
    });
  });
}


function testAuth_updateCurrentUser_sameApiKey() {
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(5);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  currentUserStorageManager = new fireauth.storage.UserManager(
      auth1.getStorageKey());
  auth1.languageCode = 'fr';
  auth1.logFramework('firebaseui');
  var userChanges = 0;
  var tokenChanges = 0;
  // Token changed handler should be triggered twice. Once on initialization,
  // the other one after updating current user.
  auth1.onIdTokenChanged(function(user) {
    if (user) {
      assertEquals(1, tokenChanges);
      assertUserEquals(user1, auth1['currentUser']);
      var manager = fireauth.AuthEventManager.getManager(
          config3['authDomain'], config3['apiKey'], app1.name);
      // Auth and current user should be subscribed.
      assertTrue(manager.isSubscribed(auth1));
      assertTrue(manager.isSubscribed(auth1['currentUser']));
      asyncTestCase.signal();
      // Confirm new user saved in storage.
      currentUserStorageManager.getCurrentUser().then(function(currentUser) {
        assertUserEquals(user1, currentUser);
        asyncTestCase.signal();
      });
    } else {
      // Verifies listener is triggered initiallly.
      assertEquals(0, tokenChanges);
      asyncTestCase.signal();
    }
    tokenChanges++;
  });
  // Auth state changed handler should be triggered twice. Once on
  // initialization, the other one after updating current user.
  auth1.onAuthStateChanged(function(currentUser) {
    if (currentUser) {
      assertEquals(1, userChanges);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    } else {
      // Verifies listener is triggered initiallly.
      assertEquals(0, userChanges);
      // Calls updateCurrentUser after Auth listener being triggered first time.
      auth1.updateCurrentUser(user1).then(function() {
        assertUserEquals(user1, auth1['currentUser']);
        assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
        assertEquals('fr', auth1['currentUser'].getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', auth1['currentUser'].getLanguageCode());
        asyncTestCase.signal();
      });
    }
    userChanges++;
  });
}


function testAuth_updateCurrentUser_sameUser() {
  // Tests the case that user is saved in storage initially and to update
  // current user whose uid is same as the previous signed in user's. Auth state
  // changed listener should not be triggered in this case. But user attributes
  // should be updated in storage. Token changed listener should be triggered
  // twice.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(3);
  var accountInfo1 = {
    'uid': '1234',
    'email': 'user1@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  var accountInfo2 = {
    'uid': '1234',
    'email': 'user2@example.com',
    'displayName': 'Jane Doe',
    'emailVerified': false
  };
  // The existing user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo1);
  // The user to be updated to Auth instance with the same UID as user1.
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo2);
  currentUserStorageManager = new fireauth.storage.UserManager(
      fireauth.util.createStorageKey(config3['apiKey'], appId1));
  // Save test user. This will be loaded on Auth init.
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    var userChanges = 0;
    var tokenChanges = 0;
    // Token changed listener should be triggered twice, once with original
    // user, the second time with updated user.
    auth1.onIdTokenChanged(function(user) {
      tokenChanges++;
      if (tokenChanges == 1) {
        // Triggered with original user.
        assertUserEquals(user1, user);
        asyncTestCase.signal();
      } else if (tokenChanges == 2) {
        // Triggered with updated user.
        assertUserEquals(user2, user);
        asyncTestCase.signal();
      } else {
        fail('Token changed listener should only be triggered twice!');
      }

    });
    // Auth state listener should only be triggered once with original user.
    auth1.onAuthStateChanged(function(user) {
      userChanges++;
      if (user) {
        // The listener should be triggered once with the original user.
        assertEquals(1, userChanges);
        assertUserEquals(user1, auth1['currentUser']);
        var originUserRef = auth1['currentUser'];
        var manager = fireauth.AuthEventManager.getManager(
            config3['authDomain'], config3['apiKey'], app1.name);
        // Auth and current user should be subscribed.
        assertTrue(manager.isSubscribed(auth1));
        assertTrue(manager.isSubscribed(auth1['currentUser']));
        // Confirm original user saved in storage.
        currentUserStorageManager.getCurrentUser().then(function(currentUser) {
          assertUserEquals(user1, currentUser);
          // Update current user.
          auth1.updateCurrentUser(user2).then(function() {
            // Current user reference should remain the same.
            assertEquals(originUserRef, auth1['currentUser']);
            // User attribute should be updated.
            assertUserEquals(user2, auth1['currentUser']);
            currentUserStorageManager.getCurrentUser()
                .then(function(currentUser) {
                  assertUserEquals(user2, currentUser);
                  asyncTestCase.signal();
                });
          });
        });
      } else {
        fail('Auth state changed listener should not be triggered with null!');
      }
    });
  });
}


function testAuth_updateCurrentUser_differentApiKey() {
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      goog.testing.recordFunction(function() {
        return goog.Promise.resolve();
      }));
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(5);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  currentUserStorageManager = new fireauth.storage.UserManager(
      auth1.getStorageKey());
  var configWithDifferentApikey = {
    'apiKey': 'API_KEY2',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId2'
  };
  var user1 = new fireauth.AuthUser(
      configWithDifferentApikey, expectedTokenResponse, accountInfo);
  auth1.languageCode = 'fr';
  auth1.logFramework('firebaseui');
  var userChanges = 0;
  var tokenChanges = 0;
  // Token changed handler should be triggered twice. Once on initialization,
  // the other one after updating current user.
  auth1.onIdTokenChanged(function(user) {
    if (user) {
      assertEquals(1, tokenChanges);
      fireauth.common.testHelper.assertUserEqualsInWithDiffApikey(
          user1, auth1['currentUser'], 'API_KEY2', 'API_KEY');
      var manager = fireauth.AuthEventManager.getManager(
          config3['authDomain'], config3['apiKey'], app1.name);
      // Auth and current user should be subscribed.
      assertTrue(manager.isSubscribed(auth1));
      assertTrue(manager.isSubscribed(auth1['currentUser']));
      asyncTestCase.signal();
      // Confirm new user saved in storage.
      currentUserStorageManager.getCurrentUser().then(function(currentUser) {
        fireauth.common.testHelper.assertUserEqualsInWithDiffApikey(
            user1, currentUser, 'API_KEY2', 'API_KEY');
        asyncTestCase.signal();
      });
    } else {
      // Verifies listener is triggered initiallly.
      assertEquals(0, tokenChanges);
      asyncTestCase.signal();
    }
    tokenChanges++;
  });
  // Auth state changed handler should be triggered twice. Once on
  // initialization, the other one after updating current user.
  auth1.onAuthStateChanged(function(currentUser) {
    if (currentUser) {
      assertEquals(1, userChanges);
      fireauth.common.testHelper.assertUserEqualsInWithDiffApikey(
          user1, currentUser, 'API_KEY2', 'API_KEY');
      asyncTestCase.signal();
    } else {
      // Verifies listener is triggered initiallly.
      assertEquals(0, userChanges);
      // Calls updateCurrentUser after Auth listener being triggered first time.
      auth1.updateCurrentUser(user1).then(function() {
        // If ApiKey is differnt, user needs to be reloaded.
        assertEquals(1, fireauth.AuthUser.prototype.reload.getCallCount());
        fireauth.common.testHelper.assertUserEqualsInWithDiffApikey(
            user1, auth1['currentUser'], 'API_KEY2', 'API_KEY');
        assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
        assertEquals('fr', auth1['currentUser'].getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', auth1['currentUser'].getLanguageCode());
        asyncTestCase.signal();
      });
    }
    userChanges++;
  });
}


function testAuth_updateCurrentUser_differentApiKey_invalidTokenError() {
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH);
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      goog.testing.recordFunction(function() {
        return goog.Promise.reject(expectedError);
      }));
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var configWithDifferentApikey = {
    'apiKey': 'API_KEY2',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId2'
  };
  auth1.onIdTokenChanged(function(user) {
    if (user) {
      fail('ID Token changed listener should not be triggered!');
    } else {
      // Verifies the listener is triggered initiallly.
      asyncTestCase.signal();
    }
  });
  var user1 = new fireauth.AuthUser(
      configWithDifferentApikey, expectedTokenResponse, accountInfo);
  auth1.updateCurrentUser(user1).thenCatch(function(err) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, err);
    assertNull(auth1['currentUser']);
    asyncTestCase.signal();
  });
}


function testAuth_updateCurrentUser_differentApiKey_tokenExpiresError() {
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      goog.testing.recordFunction(function() {
        return goog.Promise.reject(expectedError);
      }));
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var configWithDifferentApikey = {
    'apiKey': 'API_KEY2',
    'authDomain': 'subdomain.firebaseapp.com',
    'appName': 'appId2'
  };
  auth1.onIdTokenChanged(function(user) {
    if (user) {
      fail('ID Token changed listener should not be triggered!');
    } else {
      // Verifies the listener is triggered initiallly.
      asyncTestCase.signal();
    }
  });
  var user1 = new fireauth.AuthUser(
      configWithDifferentApikey, expectedTokenResponse, accountInfo);
  auth1.updateCurrentUser(user1).thenCatch(function(err) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, err);
    assertNull(auth1['currentUser']);
    asyncTestCase.signal();
  });
}


function testAuth_updateCurrentUser_nullUserError() {
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.NULL_USER);
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  auth1.updateCurrentUser(null).thenCatch(function(err) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, err);
    asyncTestCase.signal();
  });
}


function testAuth_updateCurrentUser_sameApiKeyAndTenantId() {
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(5);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sets tenant ID on Auth instance.
  auth1.tenantId = 'TENANT_ID';
  // Sets the tenant ID on user.
  accountInfo['tenantId'] = 'TENANT_ID';
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  currentUserStorageManager = new fireauth.storage.UserManager(
      auth1.getStorageKey());
  var userChanges = 0;
  var tokenChanges = 0;
  // Token changed handler should be triggered twice. Once on initialization,
  // the other one after updating current user.
  auth1.onIdTokenChanged(function(user) {
    if (user) {
      assertEquals(1, tokenChanges);
      // Verifies that tenant ID is set on current user.
      assertEquals('TENANT_ID', auth1['currentUser']['tenantId']);
      assertUserEquals(user1, auth1['currentUser']);
      var manager = fireauth.AuthEventManager.getManager(
          config3['authDomain'], config3['apiKey'], app1.name);
      // Auth and current user should be subscribed.
      assertTrue(manager.isSubscribed(auth1));
      assertTrue(manager.isSubscribed(auth1['currentUser']));
      asyncTestCase.signal();
      // Confirm new user saved in storage.
      currentUserStorageManager.getCurrentUser().then(function(currentUser) {
        assertUserEquals(user1, currentUser);
        asyncTestCase.signal();
      });
    } else {
      // Verifies listener is triggered initiallly.
      assertEquals(0, tokenChanges);
      asyncTestCase.signal();
    }
    tokenChanges++;
  });
  // Auth state changed handler should be triggered twice. Once on
  // initialization, the other one after updating current user.
  auth1.onAuthStateChanged(function(currentUser) {
    if (currentUser) {
      // Verifies that tenant ID is set on current user.
      assertEquals('TENANT_ID', currentUser['tenantId']);
      assertEquals(1, userChanges);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    } else {
      // Verifies listener is triggered initiallly.
      assertEquals(0, userChanges);
      // Calls updateCurrentUser after auth listener being triggered first time.
      auth1.updateCurrentUser(user1).then(function() {
        assertUserEquals(user1, auth1['currentUser']);
        asyncTestCase.signal();
      });
    }
    userChanges++;
  });
}


function testAuth_updateCurrentUser_tenantIdMismatchError() {
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TENANT_ID_MISMATCH);
  asyncTestCase.waitForSignals(1);
  // Sets the tenant ID on user.
  accountInfo['tenantId'] = 'TENANT_ID';
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  assertEquals('TENANT_ID', user1['tenantId']);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  auth1.tenantId = '456789012312';
  auth1.updateCurrentUser(user1).thenCatch(function(err) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, err);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithIdTokenResponse_newUser() {
  // Test signInWithIdTokenResponse returning a new user.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Initialize from ID token response should be called and resolved with the
  // new signed in user.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse, redirectStorageManager, frameworks) {
        // Expected frameworks passed on user initialization.
        assertArrayEquals(['firebaseui'], frameworks);
        assertObjectEquals(config3, options);
        assertObjectEquals(expectedTokenResponse, idTokenResponse);
        asyncTestCase.signal();
        return goog.Promise.resolve(user1);
      });
  asyncTestCase.waitForSignals(5);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set language code.
  auth1.languageCode = 'fr';
  // Log framework and test signInWithIdTokenResponse initializes user with the
  // correct list of frameworks.
  auth1.logFramework('firebaseui');
  var userChanges = 0;
  currentUserStorageManager = new fireauth.storage.UserManager(
      auth1.getStorageKey());
  // The newly signed in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Run on init only.
  var unsubscribe = auth1.onIdTokenChanged(function(user) {
    // notifyAuthListeners_ would be triggered here.
    auth1.addAuthTokenListener(function(token) {
      // Current user set to user1.
      assertEquals(user1, auth1['currentUser']);
      // Listeners should be attached to new current user.
      assertEquals(1, auth1['currentUser'].stateChangeListeners_.length);
      var manager = fireauth.AuthEventManager.getManager(
          config3['authDomain'], config3['apiKey'], app1.name);
      // Auth and user1 should be subscribed.
      assertTrue(manager.isSubscribed(auth1));
      assertTrue(manager.isSubscribed(user1));
      asyncTestCase.signal();
      // Confirm new user saved in storage.
      currentUserStorageManager.getCurrentUser().then(function(user) {
        assertUserEquals(user, user1);
        asyncTestCase.signal();
      });
    });
    unsubscribe();
  });
  // User not logged in yet. Run sign in with ID token response.
  auth1.signInWithIdTokenResponse(expectedTokenResponse).then(function() {
    // Current user should be set to user1.
    assertEquals(user1, auth1['currentUser']);
    // Framework updates should still propagate to currentUser.
    assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
    auth1.logFramework('angularfire');
    assertArrayEquals(
        ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
    // Language code should propagate to currentUser.
    assertEquals('fr', auth1['currentUser'].getLanguageCode());
    auth1.languageCode = 'de';
    assertEquals('de', auth1['currentUser'].getLanguageCode());
    asyncTestCase.signal();
  });
  // Should be called with the expected user.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertEquals(user1['uid'], currentUser['uid']);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithIdTokenResponse_sameUser() {
  // Test signInWithIdTokenResponse returning the same user.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Initialize from ID token response should be called and resolved with the
  // new signed in user.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse, redirectStorageManager, frameworks) {
        // Expected frameworks passed on user initialization.
        assertArrayEquals(['firebaseui'], frameworks);
        assertObjectEquals(config3, options);
        assertObjectEquals(expectedTokenResponse, idTokenResponse);
        asyncTestCase.signal();
        // Return second user which is the same user but with difference account
        // info.
        return goog.Promise.resolve(user2);
      });
  // Simulate user1 initially logged in.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        return goog.Promise.resolve(user1);
      });
  // Stub reload.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  var accountInfo1 = {
    'uid': '1234',
    'email': 'user1@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  var accountInfo2 = {
    'uid': '1234',
    'email': 'user2@example.com',
    'displayName': 'Jane Doe',
    'emailVerified': false
  };
  asyncTestCase.waitForSignals(5);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set language code.
  auth1.languageCode = 'fr';
  // Log framework and test signInWithIdTokenResponse initializes user with the
  // correct list of frameworks.
  auth1.logFramework('firebaseui');
  currentUserStorageManager = new fireauth.storage.UserManager(
      auth1.getStorageKey());
  // The existing user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo1);
  // The newly signed in user with the same UID as user1.
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo2);
  var unsubscribe = auth1.onIdTokenChanged(function(user) {
    // Call signInWithIdTokenResponse. This should resolve with same user
    // updated.
    auth1.signInWithIdTokenResponse(
        expectedTokenResponse).then(function() {
      // Framework updates should still propagate to currentUser.
      assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
      auth1.logFramework('angularfire');
      assertArrayEquals(
          ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
      // Language code should propagate to currentUser.
      assertEquals('fr', auth1['currentUser'].getLanguageCode());
      auth1.languageCode = 'de';
      assertEquals('de', auth1['currentUser'].getLanguageCode());
      // Same reference.
      assertEquals(user1, auth1['currentUser']);
      // Same properties as user2.
      assertUserEquals(user2, auth1['currentUser']);
      assertEquals('user2@example.com', auth1['currentUser']['email']);
      assertEquals('Jane Doe', auth1['currentUser']['displayName']);
      asyncTestCase.signal();
    });
    unsubscribe();
  });
  var firstCall = true;
  // notifyAuthListeners_ would be triggered here.
  auth1.addAuthTokenListener(function(token) {
    // Simulate user1 already signed in.
    if (firstCall) {
      // User1 logged in at this point.
      assertEquals(user1, auth1['currentUser']);
      firstCall = false;
      return;
    }
    // User1 still set as current user on next call.
    assertEquals(user1, auth1['currentUser']);
    // Auth and user1 should be subscribed.
    var manager = fireauth.AuthEventManager.getManager(
        config3['authDomain'], config3['apiKey'], app1.name);
    assertTrue(manager.isSubscribed(auth1));
    assertFalse(manager.isSubscribed(user2));
    assertTrue(manager.isSubscribed(user1));
    asyncTestCase.signal();
    // Confirm current user saved in storage.
    currentUserStorageManager.getCurrentUser().then(function(user) {
      assertUserEquals(user, auth1['currentUser']);
      asyncTestCase.signal();
    });
  });
  var userChanges = 0;
  // Should be called with the expected user.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertEquals(user1['uid'], currentUser['uid']);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithIdTokenResponse_newUserDifferentFromCurrent() {
  // Test signInWithIdTokenResponse returning a new user while a previous user
  // existed.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Initialize from ID token response should be called and resolved with the
  // new signed in user that is different from the current user.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse, redirectStorageManager, frameworks) {
        // Expected frameworks passed on user initialization.
        assertArrayEquals(['firebaseui'], frameworks);
        assertObjectEquals(config3, options);
        assertObjectEquals(expectedTokenResponse, idTokenResponse);
        asyncTestCase.signal();
        // Return second user which has a different UID.
        return goog.Promise.resolve(user2);
      });
  // Simulate user1 initially logged in.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        return goog.Promise.resolve(user1);
      });
  // Stub reload.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  // First user account info.
  var accountInfo1 = {
    'uid': '1234',
    'email': 'user1@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  // Second user has different UID.
  var accountInfo2 = {
    'uid': '5678',
    'email': 'user2@example.com',
    'displayName': 'Jane Doe',
    'emailVerified': false
  };
  // Initialize users.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo1);
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo2);
  asyncTestCase.waitForSignals(6);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set language code.
  auth1.languageCode = 'fr';
  // Log framework and test signInWithIdTokenResponse initializes user with the
  // correct list of frameworks.
  auth1.logFramework('firebaseui');
  currentUserStorageManager = new fireauth.storage.UserManager(
      auth1.getStorageKey());
  // signInWithIdTokenResponse should resolve with user2 as currentUser.
  var unsubscribe = auth1.onIdTokenChanged(function(user) {
    var manager = fireauth.AuthEventManager.getManager(
        config3['authDomain'], config3['apiKey'], app1.name);
    // At this stage auth1 and user1 are only subscribed. This will change after
    // new sign in.
    assertTrue(manager.isSubscribed(auth1));
    assertTrue(manager.isSubscribed(user1));
    assertFalse(manager.isSubscribed(user2));
    auth1.signInWithIdTokenResponse(
        expectedTokenResponse).then(function() {
      // Framework updates should still propagate to new currentUser.
      assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
      auth1.logFramework('angularfire');
      assertArrayEquals(
          ['firebaseui', 'angularfire'], auth1['currentUser'].getFramework());
      // Language code should propagate to new currentUser.
      assertEquals('fr', auth1['currentUser'].getLanguageCode());
      auth1.languageCode = 'de';
      assertEquals('de', auth1['currentUser'].getLanguageCode());
      // User2 is now currentuser.
      assertEquals(user2, auth1['currentUser']);
      // Same properties as user2.
      assertUserEquals(user2, auth1['currentUser']);
      assertEquals('5678', auth1['currentUser']['uid']);
      assertEquals('user2@example.com', auth1['currentUser']['email']);
      assertEquals('Jane Doe', auth1['currentUser']['displayName']);
      asyncTestCase.signal();
    });
    unsubscribe();
  });
  var firstCall = true;
  // notifyAuthListeners_ would be triggered here.
  auth1.addAuthTokenListener(function(token) {
    if (firstCall) {
      // User1 logged in at this point.
      assertEquals(user1, auth1['currentUser']);
      firstCall = false;
      return;
    }
    // User2 signed in on next call.
    assertEquals(user2, auth1['currentUser']);
    // Auth, user1 and user2 should be subscribed even though user1 is no longer
    // current.
    var manager = fireauth.AuthEventManager.getManager(
        config3['authDomain'], config3['apiKey'], app1.name);
    assertTrue(manager.isSubscribed(auth1));
    assertTrue(manager.isSubscribed(user1));
    assertTrue(manager.isSubscribed(user2));
    asyncTestCase.signal();
    // Confirm new current user saved in storage. Reset getCurrentUser stub
    // first.
    stubs.reset();
    stubs.replace(
        goog,
        'now',
        function() {
          return now;
        });
    currentUserStorageManager.getCurrentUser().then(function(user) {
      assertUserEquals(user, auth1['currentUser']);
      asyncTestCase.signal();
    });
  });
  var userChanges = 0;
  // Should be called twice with the expected user each time.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    if (userChanges == 1) {
      assertEquals(user1['uid'], currentUser['uid']);
    } else {
      assertEquals(user2['uid'], currentUser['uid']);
    }
    asyncTestCase.signal();
  });
}


/**
 * Asserts that a new signed in user gets emulator configuration set correctly.
 */
function testAuth_signInWithIdTokenResponse_withEmulator() {
  // Test signInWithIdTokenResponse returning a new user.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  stubs.replace(
    goog,
    'now',
    function () {
      return now;
    });
  initializeMockStorage();
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Initialize from ID token response should be called and resolved with the
  // new signed in user.
  stubs.replace(
    fireauth.AuthUser,
    'initializeFromIdTokenResponse',
    function (options, idTokenResponse) {
      // Confirm emulatorConfig set on user's app options.
      assertObjectEquals(expectedOptions, options);
      return goog.Promise.resolve(user1);
    });
  asyncTestCase.waitForSignals(1);
  var expectedOptions = Object.assign({}, config3);
  expectedOptions['emulatorConfig'] = {
    url: 'http://emulator.test.domain:1234',
  };
  // The newly signed in user.
  var user1 = new fireauth.AuthUser(
    config3, expectedTokenResponse, accountInfo);

  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set emulator.
  auth1.useEmulator('http://emulator.test.domain:1234');
  // User not logged in yet. Run sign in with ID token response.
  // The user should be initialized with the emulator config.
  auth1.signInWithIdTokenResponse(expectedTokenResponse).then(function () {
    // Current user should be set to user1.
    assertEquals(user1, auth1['currentUser']);
    asyncTestCase.signal();
  });
}


function testAuth_getIdToken_signedInUser() {
  // Tests getIdToken with a signed in user.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedToken = jwt2;
  // Simulate new access token return on a force refresh request to trigger Auth
  // state listener.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function(opt_refresh) {
        // Manual call, force refresh.
        if (opt_refresh) {
          return goog.Promise.resolve({
            'accessToken': expectedToken,
            'refreshToken': 'NEW_REFRESH_TOKEN'
          });
        }
        // Return cached one when called within syncAuthChange.
        return goog.Promise.resolve({
          'accessToken': jwt1,
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Initialize user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  asyncTestCase.waitForSignals(5);
  var tokenChangeCalls = 0;
  // Set user1 as a signed in user.
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    auth1.addAuthTokenListener(function(token) {
      tokenChangeCalls++;
      if (tokenChangeCalls == 1) {
        // First time called with original token.
        assertEquals(expectedTokenResponse['idToken'], token);
      } else if (tokenChangeCalls == 2) {
        // Second time called with new token.
        assertEquals(expectedToken, token);
      } else {
        fail('Token listener should not be called more than twice.');
      }
      // User should be signed in.
      assertUserEquals(user1, auth1['currentUser']);
      asyncTestCase.signal();
      // Confirm token changes triggered user related changes to be saved.
      currentUserStorageManager.getCurrentUser().then(function(user) {
        assertUserEquals(user1, auth1['currentUser']);
        asyncTestCase.signal();
      });
    });
    // This should return the new STS token.
    auth1.getIdTokenInternal(true).then(function(stsResponse) {
      assertEquals(expectedToken, stsResponse['accessToken']);
      asyncTestCase.signal();
    });
  });
}


function testAuth_getIdToken_signedOutUser() {
  // Tests getIdToken with a signed out user.
  fireauth.AuthEventManager.ENABLED = true;
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {},
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // This should be triggered only on init state.
  assertAuthTokenListenerCalledOnce(auth1);
  // Since no user is signed in, token should be null.
  auth1.getIdTokenInternal(true).then(function(token) {
    assertNull(token);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithCustomToken_success() {
  // Tests successful signInWithCustomToken.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedCustomToken = 'CUSTOM_TOKEN';
  var expectedIdToken = fireauth.common.testHelper.createMockJwt({
    'iss': 'https://securetoken.google.com/12345678',
    'aud': '12345678',
    'auth_time': 1511378629,
    'sub': 'abcdefghijklmnopqrstu',
    'iat': 1511378630,
    'exp': now / 1000 + 3600,
    'firebase': {
      'identities': {},
      'sign_in_provider': 'custom'
    }
  });
  expectedTokenResponse['idToken'] = expectedIdToken;
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithCustomToken should lead to an Auth user being initialized with
  // the returned STS token response.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        // Token response should match RpcHandler response.
        assertObjectEquals(expectedTokenResponse, tokenResponse);
        // Simulate user sign in completed and returned.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return goog.Promise.resolve();
      });
  // verifyCustomToken should be called with expected parameters and resolved
  // with expected token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyCustomToken',
      function(customToken) {
        assertEquals(expectedCustomToken, customToken);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedTokenResponse);
      });
  asyncTestCase.waitForSignals(4);
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Set to true for testing to make sure this is changed during processing.
  user1.updateProperty('isAnonymous', true);
  var expectedResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': {'providerId': null, 'isNewUser': false},
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  currentUserStorageManager = new fireauth.storage.UserManager(
      auth1.getStorageKey());
  // Sign in with custom token.
  auth1.signInWithCustomToken(expectedCustomToken)
      .then(function(result) {
        // Anonymous status should be set to false.
        assertFalse(result['user']['isAnonymous']);
        // Returned user credential should match expected one.
        fireauth.common.testHelper.assertUserCredentialResponse(
            expectedResult['user'],
            expectedResult['credential'],
            expectedResult['additionalUserInfo'],
            expectedResult['operationType'],
            result);
        // Confirm anonymous state saved.
        currentUserStorageManager.getCurrentUser().then(function(user) {
          assertUserEquals(user1, auth1['currentUser']);
          assertFalse(user['isAnonymous']);
          asyncTestCase.signal();
        });
        asyncTestCase.signal();
      });
}


function testAuth_signInWithCustomToken_error() {
  // Tests unsuccessful signInWithCustomToken.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected rpc error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedCustomToken = 'CUSTOM_TOKEN';
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Error should not lead to user creation.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        fail('signInWithIdTokenResponse should not be called!');
      });
  // verifyCustomToken should be called with expected parameters and throws the
  // expected error.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyCustomToken',
      function(customToken) {
        assertEquals(expectedCustomToken, customToken);
        asyncTestCase.signal();
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with custom token should throw the expected error.
  auth1.signInWithCustomToken(expectedCustomToken).thenCatch(function(err) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, err);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithEmailLink_success() {
  // Tests successful signInWithEmailLink.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and link.
  var expectedEmail = 'user@example.com';
  var expectedLink = 'https://www.example.com?mode=signIn&oobCode=code' +
      '&apiKey=API_KEY';
  var expectedOobCode = 'code';
  var expectedIdToken = 'HEAD.ew0KICAiaXNzIjogImh0dHBzOi8vc2VjdXJldG9rZW4uZ2' +
      '9vZ2xlLmNvbS8xMjM0NTY3OCIsDQogICJwaWN0dXJlIjogImh0dHBzOi8vcGx1cy5nb29' +
      'nbGUuY29tL2FiY2RlZmdoaWprbG1ub3BxcnN0dSIsDQogICJhdWQiOiAiMTIzNDU2Nzgi' +
      'LA0KICAiYXV0aF90aW1lIjogMTUxMDM1NzYyMiwNCiAgInVzZXJfaWQiOiAiYWJjZGVmZ' +
      '2hpamtsbW5vcHFyc3R1IiwNCiAgInN1YiI6ICJhYmNkZWZnaGlqa2xtbm9wcXJzdHUiLA' +
      '0KICAiaWF0IjogMTUxMDM1NzYyMiwNCiAgImV4cCI6IDE1MTAzNjEyMjIsDQogICJlbWF' +
      'pbCI6ICJ1c2VyQGV4YW1wbGUuY29tIiwNCiAgImVtYWlsX3ZlcmlmaWVkIjogdHJ1ZSwN' +
      'CiAgImZpcmViYXNlIjogew0KICAgICJpZGVudGl0aWVzIjogew0KICAgICAgImVtYWlsI' +
      'jogWw0KICAgICAgICAidXNlckBleGFtcGxlLmNvbSINCiAgICAgIF0NCiAgICB9LA0KIC' +
      'AgICJzaWduX2luX3Byb3ZpZGVyIjogInBhc3N3b3JkIg0KICB9DQp9.SIGNATURE';
  expectedTokenResponse['idToken'] = expectedIdToken;

  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected
  // token response generated by RPC response.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        // Token response should match rpcHandler response.
        assertObjectEquals(expectedTokenResponse, tokenResponse);
        // Simulate user sign in completed and returned.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return goog.Promise.resolve();
      });
  // emailLinkSignIn should be called with expected parameters and resolved
  // with expected token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'emailLinkSignIn',
      function(email, oobCode) {
        assertEquals(expectedEmail, email);
        assertEquals(expectedOobCode, oobCode);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedTokenResponse);
      });
  asyncTestCase.waitForSignals(3);
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var expectedResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': {'providerId': 'password', 'isNewUser': false},
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with email and link.
  auth1.signInWithEmailLink(expectedEmail, expectedLink)
      .then(function(result) {
        assertObjectEquals(expectedResult, result);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithEmailLink_success_tenantId() {
  // Tests successful signInWithEmailLink with tenant ID.
  const expectedEmail = 'user@example.com';
  // Sign-in email link with tenant ID.
  const expectedLink = 'https://www.example.com?mode=signIn&oobCode=code' +
      '&apiKey=API_KEY&tenantId=TENANT_ID';
  const expectedOobCode = 'code';

  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  const emailLinkSignIn =
      mockControl.createMethodMock(auth1.getRpcHandler(), 'emailLinkSignIn');
  emailLinkSignIn(expectedEmail, expectedOobCode).$once()
      .$returns(goog.Promise.resolve(expectedTokenResponse4));
  mockControl.$replayAll();
  asyncTestCase.waitForSignals(1);

  // Set tenant ID on Auth.
  auth1.tenantId = 'TENANT_ID';
  // Verify that tenant ID is set on Rpc handler.
  assertEquals('TENANT_ID', auth1.getRpcHandler().getTenantId());
  // Sign in with email and link.
  return auth1.signInWithEmailLink(expectedEmail, expectedLink)
      .then((result) => {
        fireauth.common.testHelper.assertUserCredentialResponse(
            auth1.currentUser,
            null,
            {'providerId': 'password', 'isNewUser': false},
            fireauth.constants.OperationType.SIGN_IN,
            result);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithEmailLink_error_tenantIdMismatch() {
  // Tests when the tenant ID in link doesn't match the tenant ID on
  // Auth instance.
  const expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TENANT_ID_MISMATCH);
  fireauth.AuthEventManager.ENABLED = true;
  const expectedEmail = 'user@example.com';
  // Link with TENANT_ID1.
  const expectedLink = 'https://www.example.com?mode=signIn&oobCode=code' +
      '&apiKey=API_KEY&tenantId=TENANT_ID1';
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set the tenant ID to a different tenant ID from the link.
  auth1.tenantId = 'TENANT_ID2';
  // Sign in with email and link.
  auth1.signInWithEmailLink(expectedEmail, expectedLink)
      .thenCatch((error) => {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithEmailLink_error_tenantIdMismatch_nullTenantId() {
  // Tests when the tenant ID is provided in the link but is set to null on
  // Auth instance.
  const expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TENANT_ID_MISMATCH);
  fireauth.AuthEventManager.ENABLED = true;
  const expectedEmail = 'user@example.com';
  // Link with TENANT_ID1.
  const expectedLink = 'https://www.example.com?mode=signIn&oobCode=code' +
      '&apiKey=API_KEY&tenantId=TENANT_ID1';
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set the tenant ID to null on Auth instance.
  auth1.tenantId = null;
  // Sign in with email and link.
  auth1.signInWithEmailLink(expectedEmail, expectedLink)
      .thenCatch((error) => {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithEmailLink_deepLink_success() {
  // Tests successful signInWithEmailLink where the URL provided is the entire
  // FDL link, instead of the deep link.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and link.
  var expectedEmail = 'user@example.com';
  var deepLink = 'https://www.example.com?mode=signIn&oobCode=code' +
      '&apiKey=API_KEY';
  var expectedLink = 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(deepLink);
  var expectedOobCode = 'code';

  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected
  // token response generated by RPC response.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        // Token response should match rpcHandler response.
        assertObjectEquals(expectedTokenResponse4, tokenResponse);
        // Simulate user sign in completed and returned.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return goog.Promise.resolve();
      });
  // emailLinkSignIn should be called with expected parameters and resolved
  // with expected token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'emailLinkSignIn',
      function(email, oobCode) {
        assertEquals(expectedEmail, email);
        assertEquals(expectedOobCode, oobCode);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedTokenResponse4);
      });
  asyncTestCase.waitForSignals(3);
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse4, accountInfo);
  var expectedResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': {'providerId': 'password', 'isNewUser': false},
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with email and link.
  auth1.signInWithEmailLink(expectedEmail, expectedLink)
      .then(function(result) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            expectedResult['user'],
            expectedResult['credential'],
            expectedResult['additionalUserInfo'],
            expectedResult['operationType'],
            result);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithEmailLink_error() {
  // Tests successful signInWithEmailLink.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and link.
  var expectedEmail = 'user@example.com';
  var expectedLink = 'https://www.example.com?mode=signIn&oobCode=code' +
      '&apiKey=API_KEY';
  var expectedOobCode = 'code';
  // Expected RPC error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected
  // token response generated by RPC response.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        fail('signInWithIdTokenResponse should not be called!');
      });
  // emailLinkSignIn should be called with expected parameters and resolved
  // with expected error.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'emailLinkSignIn',
      function(email, oobCode) {
        assertEquals(expectedEmail, email);
        assertEquals(expectedOobCode, oobCode);
        asyncTestCase.signal();
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with email and link should throw expected error.
  auth1.signInWithEmailLink(expectedEmail, expectedLink)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithEmailLink_invalidLink_error() {
  // Tests signInWithEmailLink when an invalid link is provided.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and link.
  var expectedEmail = 'user@example.com';
  var expectedLink = 'https://www.example.com?mode=signIn';
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR, 'Invalid email link!');
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with email and link should throw expected error.
  auth1.signInWithEmailLink(expectedEmail, expectedLink)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithEmailAndPassword_success() {
  // Tests successful signInWithEmailAndPassword.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and password.
  var expectedEmail = 'user@example.com';
  var expectedPass = 'password';
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected
  // token response generated by RPC response.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        // Token response should match rpchandler response.
        assertObjectEquals(expectedTokenResponse4, tokenResponse);
        // Simulate user sign in completed and returned.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return goog.Promise.resolve();
      });
  // verifyPassword should be called with expected parameters and resolved
  // with expected token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyPassword',
      function(email, password) {
        assertEquals(expectedEmail, email);
        assertEquals(expectedPass, password);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedTokenResponse4);
      });
  asyncTestCase.waitForSignals(3);
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse4, accountInfo);
  var expectedResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': {'providerId': 'password', 'isNewUser': false},
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with email and password.
  auth1.signInWithEmailAndPassword(expectedEmail, expectedPass)
      .then(function(result) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            expectedResult['user'],
            expectedResult['credential'],
            expectedResult['additionalUserInfo'],
            expectedResult['operationType'],
            result);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithEmailAndPassword_error() {
  // Tests unsuccessful signInWithEmailAndPassword.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and password.
  var expectedEmail = 'user@example.com';
  var expectedPass = 'password';
  // Expected RPC error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should not be called due to RPC error.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        fail('signInWithIdTokenResponse should not be called!');
      });
  // verifyPassword should be called with expected parameters and resolved
  // with expected error.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyPassword',
      function(email, password) {
        assertEquals(expectedEmail, email);
        assertEquals(expectedPass, password);
        asyncTestCase.signal();
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with email and password should throw expected error.
  auth1.signInWithEmailAndPassword(expectedEmail, expectedPass)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testAuth_createUserWithEmailAndPassword_success() {
  // Tests successful createUserWithEmailAndPassword.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and password.
  var expectedEmail = 'user@example.com';
  var expectedPass = 'password';
  expectedTokenResponse4['kind'] = 'identitytoolkit#SignupNewUserResponse';
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected
  // token response generated by RPC response.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        // Token response should match rpchandler response.
        assertObjectEquals(expectedTokenResponse4, tokenResponse);
        // Simulate user sign in completed and returned.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return goog.Promise.resolve();
      });
  // createAccount should be called with expected parameters and resolved
  // with expected token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'createAccount',
      function(email, password) {
        assertEquals(expectedEmail, email);
        assertEquals(expectedPass, password);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedTokenResponse4);
      });
  asyncTestCase.waitForSignals(3);
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse4, accountInfo);
  var expectedResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': {'providerId': 'password', 'isNewUser': true},
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  auth1.createUserWithEmailAndPassword(expectedEmail, expectedPass)
      .then(function(result) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            expectedResult['user'],
            expectedResult['credential'],
            expectedResult['additionalUserInfo'],
            expectedResult['operationType'],
            result);
        asyncTestCase.signal();
      });
}


function testAuth_createUserWithEmailAndPassword_error() {
  // Tests unsuccessful createUserWithEmailAndPassword.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and password.
  var expectedEmail = 'user@example.com';
  var expectedPass = 'password';
  // Expected RPC error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should not be called due to RPC error.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        fail('signInWithIdTokenResponse should not be called!');
      });
  // createAccount should be called with expected parameters and resolved
  // with expected error.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'createAccount',
      function(email, password) {
        assertEquals(expectedEmail, email);
        assertEquals(expectedPass, password);
        asyncTestCase.signal();
        return goog.Promise.reject(expectedError);
      });
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // createUserWithEmailAndPassword should throw the expected error.
  auth1.createUserWithEmailAndPassword(expectedEmail, expectedPass)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testAuth_signInAndRetrieveDataWithCredential_success() {
  // Stub signInWithCredential and confirm same response is used for
  // signInAndRetrieveDataWithCredential.
  // Record deprecation warning calls.
  stubs.replace(
      fireauth.deprecation,
      'log',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithCredential',
      function(cred) {
        assertEquals(expectedGoogleCredential, cred);
        return goog.Promise.resolve(expectedResponse);
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Expected response. Only the user will be returned.
  var expectedResponse = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  // signInAndRetrieveDataWithCredential using Google OAuth credential.
  auth1.signInAndRetrieveDataWithCredential(expectedGoogleCredential)
      .then(function(userCredential) {
        // Confirm expected response.
        assertEquals(expectedResponse, userCredential);
        asyncTestCase.signal();
      });
  // Confirm warning shown.
  /** @suppress {missingRequire} */
  assertEquals(1, fireauth.deprecation.log.getCallCount());
  /** @suppress {missingRequire} */
  assertEquals(
      fireauth.deprecation.Deprecations.SIGN_IN_WITH_CREDENTIAL,
      fireauth.deprecation.log.getLastCall().getArgument(0));
}


function testAuth_signInAndRetrieveDataWithCredential_error() {
  // Stub signInWithCredential and confirm same error is thrown for
  // signInAndRetrieveDataWithCredential.
  // Record deprecation warning calls.
  stubs.replace(
      fireauth.deprecation,
      'log',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithCredential',
      function(cred) {
        assertEquals(expectedGoogleCredential, cred);
        return goog.Promise.reject(expectedError);
      });
  fireauth.AuthEventManager.ENABLED = true;
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Expected error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.NEED_CONFIRMATION);
  // signInAndRetrieveDataWithCredential using Google OAuth credential.
  auth1.signInAndRetrieveDataWithCredential(expectedGoogleCredential)
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
      fireauth.deprecation.Deprecations.SIGN_IN_WITH_CREDENTIAL,
      fireauth.deprecation.log.getLastCall().getArgument(0));
}


function testAuth_signInWithCredential_success() {
  // Tests successful signInWithCredential using OAuth credential.
  fireauth.AuthEventManager.ENABLED = true;
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
      function(data) {
        assertObjectEquals(
        {
          'requestUri': 'http://localhost',
          'postBody': 'id_token=googleIdToken&access_token=googleAccessToke' +
              'n&providerId=' + fireauth.idp.ProviderId.GOOGLE
        },
        data);
        // Resolve with expected token response.
        return goog.Promise.resolve(expectedTokenResponseWithIdPData);
      });
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected token
  // response generated by RPC response.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        // Confirm config options.
        assertObjectEquals(config3, options);
        // Token response should match rpchandler response.
        assertObjectEquals(expectedTokenResponseWithIdPData, idTokenResponse);
        // Return expected user.
        return goog.Promise.resolve(user1);
      });
  // Record calls to signInWithIdTokenResponse. This will help us confirm
  // that the expected user is being initialized, set to currentUser, saved
  // to storage and token changes triggered.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      goog.testing.recordFunction(
          fireauth.Auth.prototype.signInWithIdTokenResponse));
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // signInWithCredential using Google OAuth credential.
  auth1.signInWithCredential(expectedGoogleCredential)
      .then(function(result) {
        // Confirm fireauth.Auth.prototype.signInWithIdTokenResponse is called
        // underneath. This will save the new user in storage and trigger auth
        // token changes.
        assertEquals(
            1,
            fireauth.Auth.prototype.signInWithIdTokenResponse.getCallCount());
        assertObjectEquals(
            expectedTokenResponseWithIdPData,
            fireauth.Auth.prototype.signInWithIdTokenResponse
                .getLastCall().getArgument(0));
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            auth1.currentUser,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            // operationType not implemented yet.
            fireauth.constants.OperationType.SIGN_IN,
            result);
        // Confirm user1 set as currentUser.
        assertEquals(
            user1,
            auth1.currentUser);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithCredential_nonhttp_success() {
  // Tests successful signInWithCredential using OAuth credential in a non
  // HTTP environment.
  fireauth.AuthEventManager.ENABLED = true;
  // Non http or https environment.
  stubs.replace(
      fireauth.util,
      'getCurrentUrl',
      function() {return 'chrome-extension://SOME_LONG_ID';});
  stubs.replace(
      fireauth.util,
      'getCurrentScheme',
      function() {return 'chrome-extension:';});
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
      function(data) {
        assertObjectEquals(
        {
          // requestUri should be localhost even though the current URL and
          // scheme are non http.
          'requestUri': 'http://localhost',
          'postBody': 'id_token=googleIdToken&access_token=googleAccessToke' +
              'n&providerId=' + fireauth.idp.ProviderId.GOOGLE
        },
        data);
        // Resolve with expected token response.
        return goog.Promise.resolve(expectedTokenResponseWithIdPData);
      });
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected token
  // response generated by RPC response.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        // Confirm config options.
        assertObjectEquals(config3, options);
        // Token response should match rpchandler response.
        assertObjectEquals(expectedTokenResponseWithIdPData, idTokenResponse);
        // Return expected user.
        return goog.Promise.resolve(user1);
      });
  // Record calls to signInWithIdTokenResponse. This will help us confirm
  // that the expected user is being initialized, set to currentUser, saved
  // to storage and token changes triggered.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      goog.testing.recordFunction(
          fireauth.Auth.prototype.signInWithIdTokenResponse));
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // signInWithCredential using Google OAuth credential.
  auth1.signInWithCredential(expectedGoogleCredential)
      .then(function(result) {
        // Confirm fireauth.Auth.prototype.signInWithIdTokenResponse is called
        // underneath. This will save the new user in storage and trigger Auth
        // token changes.
        assertEquals(
            1,
            fireauth.Auth.prototype.signInWithIdTokenResponse.getCallCount());
        assertObjectEquals(
            expectedTokenResponseWithIdPData,
            fireauth.Auth.prototype.signInWithIdTokenResponse
                .getLastCall().getArgument(0));
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            auth1.currentUser,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            // operationType not implemented yet.
            fireauth.constants.OperationType.SIGN_IN,
            result);
        // Confirm user1 set as currentUser.
        assertEquals(
            user1,
            auth1.currentUser);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithCredential_emailPassCredential() {
  // Tests successful signInWithCredential using email and password credential.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected email and password.
  var expectedEmail = 'user@example.com';
  var expectedPass = 'password';
  // Simulate successful RpcHandler verifyPassword with expected parameters
  // passed and expected token response returned.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyPassword',
      function(email, password) {
        assertEquals(expectedEmail, email);
        assertEquals(expectedPass, password);
        // No credential or additional user info returned.
        return goog.Promise.resolve(expectedTokenResponse);
      });
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected token
  // response generated by RPC response.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        // Confirm config options.
        assertObjectEquals(config3, options);
        // Token response should match rpchandler response.
        assertObjectEquals(expectedTokenResponse, idTokenResponse);
        // Return expected user.
        return goog.Promise.resolve(user1);
      });
  // Record calls to signInWithIdTokenResponse. This will help us confirm
  // that the expected user is being initialized, set to currentUser, saved
  // to storage and token changes triggered.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      goog.testing.recordFunction(
          fireauth.Auth.prototype.signInWithIdTokenResponse));
  asyncTestCase.waitForSignals(1);
  // Initialize expected user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Email/password credential.
  var cred = fireauth.EmailAuthProvider.credential(expectedEmail, expectedPass);
  // signInWithCredential using email and password credential.
  auth1.signInWithCredential(cred)
      .then(function(result) {
        // Confirm fireauth.Auth.prototype.signInWithIdTokenResponse is called
        // underneath. This will save the new user in storage and trigger Auth
        // token changes.
        assertEquals(
            1,
            fireauth.Auth.prototype.signInWithIdTokenResponse.getCallCount());
        assertObjectEquals(
            expectedTokenResponse,
            fireauth.Auth.prototype.signInWithIdTokenResponse
                .getLastCall().getArgument(0));
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            auth1.currentUser,
            // Expected credential returned, null for password credential.
            null,
            // Expected additional user info, null for password credential.
            null,
            // operationType not implemented yet.
            fireauth.constants.OperationType.SIGN_IN,
            result);
        // Confirm user1 set as currentUser.
        assertEquals(
            user1,
            auth1.currentUser);
        asyncTestCase.signal();
      });
}


function testAuth_signInWithCredential_error() {
  // Tests unsuccessful signInWithCredential.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected rpc error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.NEED_CONFIRMATION);
  // Simulate unsuccessful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
      function(data) {
        // Confirm expected parameters.
        assertObjectEquals(
        {
          'requestUri': 'http://localhost',
          'postBody': 'id_token=googleIdToken&access_token=googleAccessToke' +
              'n&providerId=' + fireauth.idp.ProviderId.GOOGLE
        },
        data);
        // Reject with expected error.
        return goog.Promise.reject(expectedError);
      });
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should not be called due to RPC error.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        fail('signInWithIdTokenResponse should not be called');
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // signInWithCredential with a Google credential should throw
  // the expected error.
  auth1.signInWithCredential(expectedGoogleCredential)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testAuth_signInAnonymously_success() {
  // Tests successful signInAnonymously.
  var expectedIdToken = fireauth.common.testHelper.createMockJwt({
    'iss': 'https://securetoken.google.com/12345678',
    'provider_id': 'anonymous',
    'aud': '12345678',
    'auth_time': 1510874749,
    'sub': 'abcdefghijklmnopqrstu',
    'iat': 1510874749,
    'exp': now / 1000 + 3600,
    'firebase': {
      'identities': {},
      'sign_in_provider': 'anonymous'
    }
  });
  expectedTokenResponse['idToken'] = expectedIdToken;
  expectedTokenResponse['kind'] = 'identitytoolkit#SignupNewUserResponse';
  fireauth.AuthEventManager.ENABLED = true;
  // Simulate successful RpcHandler signInAnonymously resolving with expected
  // token response.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'signInAnonymously',
      function() {
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedTokenResponse);
      });
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should initialize a user using the expected token
  // response generated by RPC response.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        // Token response should match RpcHandler response.
        assertObjectEquals(expectedTokenResponse, tokenResponse);
        // Simulate user sign in completed and returned.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(4);
  // Initialize expected anonymous user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var expectedResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': {'providerId': null, 'isNewUser': true},
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  currentUserStorageManager = new fireauth.storage.UserManager(
      auth1.getStorageKey());
  auth1.signInAnonymously().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
            expectedResult['user'],
            expectedResult['credential'],
            expectedResult['additionalUserInfo'],
            expectedResult['operationType'],
            result);
    assertTrue(result['user']['isAnonymous']);
    // Confirm anonymous state saved.
    currentUserStorageManager.getCurrentUser().then(function(user) {
      assertUserEquals(user1, auth1['currentUser']);
      assertTrue(user['isAnonymous']);
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testAuth_signInAnonymously_anonymousUserAlreadySignedIn() {
  // Tests signInAnonymously when an anonymous user is already signed in.
  var expectedIdToken = fireauth.common.testHelper.createMockJwt({
    'iss': 'https://securetoken.google.com/12345678',
    'provider_id': 'anonymous',
    'aud': '12345678',
    'auth_time': 1510874749,
    'sub': 'abcdefghijklmnopqrstu',
    'iat': 1510874749,
    'exp': now / 1000 + 3600,
    'firebase': {
      'identities': {},
      'sign_in_provider': 'anonymous'
    }
  });
  expectedTokenResponse['idToken'] = expectedIdToken;
  fireauth.AuthEventManager.ENABLED = true;
  // Simulate successful RpcHandler signInAnonymously.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'signInAnonymously',
      function() {
        fail('signInAnonymously on RpcHandler should not be called!');
      });
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Anonymous user is already signed in so there is no need for this to run.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        fail('signInWithIdTokenResponse should not be called!');
      });
  asyncTestCase.waitForSignals(3);
  // Initialize an anonymous user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  user1.updateProperty('isAnonymous', true);
  var expectedResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': {'providerId': null, 'isNewUser': false},
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  // Current user reference.
  var currentUser = null;
  // User state changed counter.
  var stateChanged = 0;
  // ID token changed counter.
  var idTokenChanged = 0;
  // Storage key.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // Save anonymous user as current in storage.
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // All listeners should be called once with the saved anonymous user.
    auth1.onAuthStateChanged(function(user) {
      stateChanged++;
      assertEquals(1, stateChanged);
      assertEquals(user1['uid'], user['uid']);
      asyncTestCase.signal();
    });
    auth1.onIdTokenChanged(function(user) {
      idTokenChanged++;
      assertEquals(1, idTokenChanged);
      assertEquals(user1['uid'], user['uid']);
      asyncTestCase.signal();
    });
    // signInAnonymously should resolve with the already signed in anonymous
    // user without calling RPC handler underneath.
    return auth1.signInAnonymously();
  }).then(function(result) {
    assertUserEquals(expectedResult['user'], result['user']);
    assertObjectEquals(
        expectedResult['additionalUserInfo'], result['additionalUserInfo']);
    assertEquals(expectedResult['operationType'], result['operationType']);
    assertUserEquals(expectedResult['user'], auth1.currentUser);
    assertTrue(result['user']['isAnonymous']);
    // Save reference to current user.
    currentUser = auth1.currentUser;
    // Sign in anonymously again.
    return auth1.signInAnonymously();
  }).then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
            currentUser,
            expectedResult['credential'],
            expectedResult['additionalUserInfo'],
            expectedResult['operationType'],
            result);
    // Exact same reference should be returned.
    assertEquals(auth1.currentUser, result['user']);
    asyncTestCase.signal();
  });
}


function testAuth_signInAnonymously_error() {
  // Tests unsuccessful signInAnonymously.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected RPC error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  // Simulate unsuccessful RpcHandler signInAnonymously throwing the expected
  // error.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'signInAnonymously',
      function() {
        asyncTestCase.signal();
        // Trigger invalid response error.
        return goog.Promise.reject(expectedError);
      });
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // signInWithIdTokenResponse should not be called due to RPC error.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithIdTokenResponse',
      function(tokenResponse) {
        fail('signInWithIdTokenResponse should not be called');
      });
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // signInAnonymously should fail with expected error.
  auth1.signInAnonymously().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_finishPopupAndRedirectSignIn_success_withoutPostBody() {
  // Test successful finishPopupAndRedirectSignIn with Auth credential.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(3);
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
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
        return goog.Promise.resolve(expectedTokenResponseWithIdPData);
      });
  // Simulate Auth user successfully initialized from
  // finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        assertObjectEquals(config3, options);
        assertObjectEquals(expectedTokenResponseWithIdPData, idTokenResponse);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedUser);
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var expectedUser = new fireauth.AuthUser(
      config3,
      expectedTokenResponseWithIdPData,
      {'uid': 'USER_ID', 'email': 'user@example.com'});
  // This should resolve with expected cred and Auth user.
  auth1.finishPopupAndRedirectSignIn('REQUEST_URI', 'SESSION_ID', null, null)
      .then(function(response) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            expectedUser,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            // operationType not implemented yet.
            fireauth.constants.OperationType.SIGN_IN,
            response);
        asyncTestCase.signal();
      });
}


function testAuth_finishPopupAndRedirectSignIn_success_withPostBody() {
  // Test successful finishPopupAndRedirectSignIn with Auth credential where
  // Auth event has POST body content.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(3);
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
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
        return goog.Promise.resolve(expectedSamlTokenResponseWithIdPData);
      });
  // Simulate Auth user successfully initialized from
  // finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        assertObjectEquals(config3, options);
        assertObjectEquals(
            expectedSamlTokenResponseWithIdPData, idTokenResponse);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedUser);
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var expectedUser = new fireauth.AuthUser(
      config3,
      expectedSamlTokenResponseWithIdPData,
      {'uid': 'USER_ID', 'email': 'user@example.com'});
  // This should resolve with expected cred and Auth user.
  auth1.finishPopupAndRedirectSignIn(
      'REQUEST_URI', 'SESSION_ID', null, 'POST_BODY')
      .then(function(response) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            expectedUser,
            // Expected credential returned.
            null,
            // Expected additional user info.
            expectedSamlAdditionalUserInfo,
            // operationType not implemented yet.
            fireauth.constants.OperationType.SIGN_IN,
            response);
        asyncTestCase.signal();
      });
}


function testAuth_finishPopupAndRedirectSignIn_success_tenantId() {
  // Test successful finishPopupAndRedirectSignIn with Auth credential and
  // tenant ID.
  // Verify that the tenant ID is passed to RPC handler and the user with tenant
  // ID is returned.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(3);
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
      function(data) {
        assertObjectEquals(
            {
              'requestUri': 'REQUEST_URI',
              'sessionId': 'SESSION_ID',
              'postBody': null,
              'tenantId': 'TENANT_ID'
            },
            data);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedTokenResponseWithIdPData);
      });
  // Simulate Auth user successfully initialized from
  // finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        assertObjectEquals(config3, options);
        assertObjectEquals(expectedTokenResponseWithIdPData, idTokenResponse);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedTenantUser);
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var expectedTenantUser = new fireauth.AuthUser(
      config3,
      expectedTokenResponseWithIdPData,
      {
        'uid': 'USER_ID',
        'email': 'user@example.com',
        'tenantId': 'TENANT_ID'
      });
  // This should resolve with expected cred and Auth user.
  auth1.finishPopupAndRedirectSignIn(
      'REQUEST_URI', 'SESSION_ID', 'TENANT_ID', null)
      .then(function(response) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            expectedTenantUser,
            // Expected credential returned.
            expectedGoogleCredential,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            // operationType not implemented yet.
            fireauth.constants.OperationType.SIGN_IN,
            response);
        asyncTestCase.signal();
      });
}


function testAuth_finishPopupAndRedirectSignIn_noCredential() {
  // Test successful finishPopupAndRedirectSignIn with no Auth credential.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(3);
  // Expected response does not contain Auth credential.
  var expectedResponse = {
    'idToken': jwt1,
    'refreshToken': 'REFRESH_TOKEN',
    'providerId': 'google.com'
  };
  // Add Additional IdP data.
  expectedResponse['rawUserInfo'] =
      expectedTokenResponseWithIdPData['rawUserInfo'];
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
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
        return goog.Promise.resolve(expectedResponse);
      });
  // Simulate Auth user successfully initialized from
  // finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        assertObjectEquals(config3, options);
        assertObjectEquals(expectedResponse, idTokenResponse);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedUser);
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var expectedUser = new fireauth.AuthUser(
      config3,
      expectedResponse,
      {'uid': 'USER_ID', 'email': 'user@example.com'});
  // This should resolve with expected user and credential.
  auth1.finishPopupAndRedirectSignIn('REQUEST_URI', 'SESSION_ID', null, null)
      .then(function(response) {
        // Expected result returned.
        fireauth.common.testHelper.assertUserCredentialResponse(
            // Expected current user returned.
            expectedUser,
            // Expected credential returned.
            null,
            // Expected additional user info.
            expectedAdditionalUserInfo,
            // operationType not implemented yet.
            fireauth.constants.OperationType.SIGN_IN,
            response);
        asyncTestCase.signal();
      });
}


function testAuth_finishPopupAndRedirectSignIn_error() {
  // Test finishPopupAndRedirectSignIn verifyAssertion error.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(2);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Simulate RpcHandler verifyAssertion returning an error.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
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
        return goog.Promise.reject(expectedError);
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var unsubscribe = auth1.onIdTokenChanged(function(user) {
    // This should catch the expected error.
    auth1.finishPopupAndRedirectSignIn('REQUEST_URI', 'SESSION_ID', null, null)
        .thenCatch(function(error) {
          fireauth.common.testHelper.assertErrorEquals(expectedError, error);
          asyncTestCase.signal();
        });
    unsubscribe();
  });
}


function testAuth_signInWithPopup_emailCredentialError() {
  // Test when sign in with popup verifyAssertion throws an Auth email
  // credential error.
  fireauth.AuthEventManager.ENABLED = true;
  asyncTestCase.waitForSignals(1);
  var expectedPopup = {
    'close': function() {}
  };
  // Record handler as it should be triggered after the popup is processed.
  var recordedHandler = null;
  // Expected Auth email credential error.
  var credential =
      fireauth.GoogleAuthProvider.credential(null, 'ACCESS_TOKEN');
  var expectedError = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.NEED_CONFIRMATION,
      {
        email: 'user@example.com',
        credential: credential
      },
      'Account already exists, please confirm and link.');
  var expectedEventId = '1234';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config3['authDomain'],
      config3['apiKey'],
      appId1,
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedProvider,
      null,
      expectedEventId,
      firebase.SDK_VERSION);
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // Save Auth event handler for later.
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config3['authDomain'], domain);
        assertEquals(config3['apiKey'], apiKey);
        assertEquals(appId1, name);
        assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Simulate Auth email credential error thrown by verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
      function(data) {
        assertObjectEquals(
            {
              'requestUri': 'http://www.example.com/#response',
              'sessionId': 'SESSION_ID',
              'postBody': null,
              'tenantId': null
            },
            data);
        return goog.Promise.reject(expectedError);
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var unsubscribe = auth1.onIdTokenChanged(function(user) {
    // signInWithPopup should fail with the expected Auth email credential
    // error.
    auth1.signInWithPopup(expectedProvider)
        .thenCatch(function(error) {
          fireauth.common.testHelper.assertErrorEquals(expectedError, error);
          asyncTestCase.signal();
        });
    unsubscribe();
  });
}


function testAuth_signInWithPopup_success_withoutPostBody() {
  // Test successful sign in with popup.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  var recordedHandler = null;
  var expectedEventId = '1234';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  asyncTestCase.waitForSignals(5);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.GoogleAuthProvider();
  // This should resolve with a null result.
  auth1.getRedirectResult().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
        null, null, null, undefined, result);
    asyncTestCase.signal();
  });
  // Sign in with popup should resolve with expected result.
  auth1.signInWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_success_tenantId() {
  // Test successful sign in with popup with tenant ID.
  // Verify that tenant ID is passed to OAuth sign in handler and
  // finishPopupAndRedirectSignIn is called with expected tenantId.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  var recordedHandler = null;
  var expectedTenantId = 'TENANT_ID';
  var expectedEventId = '1234';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected,
              actualTenantId) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            assertEquals(expectedTenantId, actualTenantId);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  var tenantUser = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfoWithTenantId);
  var expectedPopupResult = {
    'user': tenantUser,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  asyncTestCase.waitForSignals(5);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  auth1.tenantId = expectedTenantId;
  var provider = new fireauth.GoogleAuthProvider();
  // This should resolve with a null result.
  auth1.getRedirectResult().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
        null, null, null, undefined, result);
    asyncTestCase.signal();
  });
  // Sign in with popup should resolve with expected result.
  auth1.signInWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_success_withPostBody() {
  // Test successful sign in with popup where Auth event has POST body content.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  var recordedHandler = null;
  var expectedEventId = '1234';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      'POST_BODY');
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/callback', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(tenantId);
        assertEquals('POST_BODY', postBody);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(
      config3, expectedSamlTokenResponseWithIdPData, accountInfo);
  var expectedPopupResult = {
    'user': user1,
    'credential': null,
    'additionalUserInfo': expectedSamlAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  asyncTestCase.waitForSignals(5);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.SAMLAuthProvider('saml.provider');
  // This should resolve with a null result.
  auth1.getRedirectResult().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
        null, null, null, undefined, result);
    asyncTestCase.signal();
  });
  // Sign in with popup should resolve with expected result.
  auth1.signInWithPopup(provider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_success_slowIframeEmbed() {
  // Test successful sign in with popup with delay in embedding the iframe.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  var recordedHandler = null;
  var expectedEventId = '1234';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // User will be reloaded before sign in success.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAccountInfoByIdToken',
      function() {
        // Additional delay in user reload should not trigger popup closed
        // error.
        clock.tick(timeoutDelay);
        return goog.Promise.resolve(getAccountInfoResponse);
      });
  // Simulate successful RpcHandler verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
      function(data) {
        // Now that popup timer is cleared, a delay in verify assertion should
        // not trigger popup closed error.
        clock.tick(timeoutDelay);
        // Resolve with expected token response.
        return goog.Promise.resolve(expectedTokenResponseWithIdPData);
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // Simulate popup closed.
            expectedPopup.closed = true;
            // Simulate the iframe took a while to embed. This should not
            // trigger a popup timeout.
            clock.tick(timeoutDelay);
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  clock = new goog.testing.MockClock(true);
  asyncTestCase.waitForSignals(4);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.GoogleAuthProvider();
  // This should resolve with a null result.
  auth1.getRedirectResult().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
        null, null, null, undefined, result);
    asyncTestCase.signal();
  });
  // Sign in with popup should not trigger popup closed error and should resolve
  // successfully.
  auth1.signInWithPopup(provider).then(function(popupResult) {
    // Expected result returned.
    fireauth.common.testHelper.assertUserCredentialResponse(
        // Expected current user returned.
        auth1.currentUser,
        // Expected credential returned.
        expectedGoogleCredential,
        // Expected additional user info.
        expectedAdditionalUserInfo,
        // operationType not implemented yet.
        fireauth.constants.OperationType.SIGN_IN,
        popupResult);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_error_popupClosed() {
  // Test when the popup is closed without completing sign in that the expected
  // popup closed error is triggered.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  // Expected popup closed error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.POPUP_CLOSED_BY_USER);
  var expectedEventId = '1234';
  // No Auth event detected, typically triggered when the iframe is ready and
  // there is no event detected.
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // Simulate popup closed.
            expectedPopup.closed = true;
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            onError(expectedError);
            return goog.Promise.resolve();
          }
        };
      });
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.GoogleAuthProvider();
  // This should resolve with a null result.
  auth1.getRedirectResult().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
        null, null, null, undefined, result);
    asyncTestCase.signal();
  });
  // Sign in with popup should fail with the popup closed error.
  auth1.signInWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_error_iframeWebStorageNotSupported() {
  // Test when the web storage is not supported in the iframe.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  // Expected web storage not supported error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  var expectedEventId = '1234';
  // Keep track when the popup is closed.
  var isClosed = false;
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'isWebStorageSupported': function() {
            // Simulate web storage not supported in the iframe.
            return goog.Promise.resolve(false);
          },
          'addAuthEventListener': function(handler) {
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            // Web storage not supported error.
            onError(expectedError);
            return goog.Promise.resolve();
          }
        };
      });
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.GoogleAuthProvider();
  // This should resolve with a null result.
  auth1.getRedirectResult().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
        null, null, null, undefined, result);
    asyncTestCase.signal();
  });
  // Sign in with popup should fail with the web storage no supported error.
  auth1.signInWithPopup(provider).thenCatch(function(error) {
    // Popup should be closed.
    assertTrue(isClosed);
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_success_cannotRunInBackground() {
  // Test successful sign in with popup when tab cannot run in background.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  var recordedHandler = null;
  var expectedEventId = '1234';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config3['authDomain'],
      config3['apiKey'],
      appId1,
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config3['authDomain'], domain);
        assertEquals(config3['apiKey'], apiKey);
        assertEquals(appId1, name);
        assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  // simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  asyncTestCase.waitForSignals(4);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with popup should resolve with expected result.
  auth1.signInWithPopup(expectedProvider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_success_cannotRunInBackground_tenantId() {
  // Test successful sign-in with popup when tenant ID is passed and tab cannot
  // run in background.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  var recordedHandler = null;
  var expectedEventId = '1234';
  var expectedTenantId = 'TENANT_ID';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config3['authDomain'],
      config3['apiKey'],
      appId1,
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected,
              actualTenantId) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            // Tenant ID should be passed to OAuth handler.
            assertEquals(expectedTenantId, actualTenantId);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId,
               clientVerison, additionalParams, endpointId, tenantId) {
        assertEquals(config3['authDomain'], domain);
        assertEquals(config3['apiKey'], apiKey);
        assertEquals(appId1, name);
        assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        assertEquals(expectedTenantId, tenantId);
        return expectedUrl;
      });
  // simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  var tenantUser = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfoWithTenantId);
  var expectedPopupResult = {
    'user': tenantUser,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  asyncTestCase.waitForSignals(4);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set tenant Id on Auth.
  auth1.tenantId = expectedTenantId;
  // Sign in with popup should resolve with expected result.
  auth1.signInWithPopup(expectedProvider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_success_iframeCanRunInBackground() {
  // Test successful sign in with popup when tab can run in background but is an
  // iframe. This should behave the same as the
  // testAuth_signInWithPopup_success_cannotRunInBackground test.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  var recordedHandler = null;
  var expectedEventId = '1234';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config3['authDomain'],
      config3['apiKey'],
      appId1,
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            // Should already be redirected.
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config3['authDomain'], domain);
        assertEquals(config3['apiKey'], apiKey);
        assertEquals(appId1, name);
        assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  asyncTestCase.waitForSignals(4);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with popup should resolve with expected result.
  auth1.signInWithPopup(expectedProvider).then(function(popupResult) {
    assertObjectEquals(expectedPopupResult, popupResult);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_webStorageUnsupported_cantRunInBackground() {
  // Test sign in with popup when the web storage is not supported in the iframe
  // and the tab cannot run in background.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  // Keep track when the popup is closed.
  var isClosed = false;
  // Expected web storage not supported error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  var expectedEventId = '1234';
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      config3['authDomain'],
      config3['apiKey'],
      appId1,
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'isWebStorageSupported': function() {
            // Simulate web storage not supported in the iframe.
            return goog.Promise.resolve(false);
          },
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertTrue(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            onError(expectedError);
            return goog.Promise.resolve();
          }
        };
      });
  // Reset static getOAuthHelperWidgetUrl method on IfcHandler.
  stubs.set(
      fireauth.iframeclient.IfcHandler,
      'getOAuthHelperWidgetUrl',
      function(domain, apiKey, name, mode, provider, url, eventId) {
        assertEquals(config3['authDomain'], domain);
        assertEquals(config3['apiKey'], apiKey);
        assertEquals(appId1, name);
        assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, mode);
        assertEquals(expectedProvider, provider);
        assertNull(url);
        assertEquals(expectedEventId, eventId);
        return expectedUrl;
      });
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with popup should reject with the expected error.
  auth1.signInWithPopup(expectedProvider).thenCatch(function(error) {
    assertTrue(isClosed);
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_invalidEventId() {
  // Test that a popup event belonging to a different owner does not resolve
  // in the incorrect owner.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  // Replace random number generator.
  stubs.replace(
      fireauth.util,
      'generateRandomString',
      function() {
        return '87654321';
      });
  var recordedHandler = null;
  // Current owner's event ID.
  var expectedEventId = '1234';
  // Sign in via popup triggered by another window with different ID.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      '5678',
      'http://www.example.com/#response',
      'SESSION_ID');
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
               config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return new goog.Promise(function(resolve, reject) {});
          }
        };
      });
  // This should not run due to event ID mismatch.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectSignIn should not be called!');
      });
  asyncTestCase.waitForSignals(2);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.GoogleAuthProvider();
  // This should resolve with a null result.
  auth1.getRedirectResult().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
        null, null, null, undefined, result);
    asyncTestCase.signal();
  });
  // This should not resolve as the event is owned by another tab.
  auth1.signInWithPopup(provider).then(function(popupResult) {
    fail('SignInWithPopup should not resolve due to event ID mismatch!');
  });
}


function testAuth_signInWithPopup_error() {
  // Test sign in with popup error.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedPopup = {
    'close': function() {}
  };
  var authEventHandler = null;
  var expectedEventId = '1234';
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Sign in via popup with expected error.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      null,
      null,
      expectedError);
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
  stubs.replace(
      fireauth.util,
      'closeWindow',
      function(win) {
        assertEquals(expectedPopup, win);
        asyncTestCase.signal();
      });
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            authEventHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            authEventHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });
  // This should not resolve due to event error.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectSignIn should not be called due to error!');
      });
  asyncTestCase.waitForSignals(4);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.GoogleAuthProvider();
  // This should resolve with a null result.
  auth1.getRedirectResult().then(function(result) {
    fireauth.common.testHelper.assertUserCredentialResponse(
        null, null, null, undefined, result);
    asyncTestCase.signal();
  });
  // Sign in with popup should resolve with expected error.
  auth1.signInWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_blockedPopup() {
  // Test sign in with popup with blocked popup error.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.POPUP_BLOCKED);
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
        return null;
      });
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertNull(actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            return goog.Promise.reject(expectedError);
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            return goog.Promise.resolve();
          }
        };
      });
  asyncTestCase.waitForSignals(1);
  var provider = new fireauth.GoogleAuthProvider();
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // This should catch the blocked popup error.
  auth1.signInWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_missingAuthDomain() {
  // Test sign in with popup with missing Auth domain error.
  fireauth.AuthEventManager.ENABLED = true;
  // Fake popup.
  var expectedPopup = {
    'close': function() {}
  };
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.MISSING_AUTH_DOMAIN);
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
  asyncTestCase.waitForSignals(3);
  var provider = new fireauth.GoogleAuthProvider();
  // App initialized with no Auth domain.
  app1 = firebase.initializeApp({
    'apiKey': 'API_KEY'
  }, appId1);
  auth1 = app1.auth();
  // This should catch the blocked popup error
  auth1.signInWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPopup_unsupportedEnvironment() {
  // Test sign in with popup in unsupported environment.
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
  var provider = new fireauth.GoogleAuthProvider();
  // App initialized correctly.
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // This should catch the expected error.
  auth1.signInWithPopup(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithRedirect_unsupportedEnvironment() {
  // Test sign in with redirect in unsupported environment.
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
  var provider = new fireauth.GoogleAuthProvider();
  // App initialized correctly.
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // This should catch the expected error.
  auth1.signInWithRedirect(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_getRedirectResult_unsupportedEnvironment() {
  // Test getRedirectResult in unsupported environment.
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
  asyncTestCase.waitForSignals(3);
  // App initialized correctly.
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // This should catch the expected error.
  auth1.getRedirectResult().thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
  // State listener should fire once only with null user.
  var idTokenChangeCounter = 0;
  auth1.onIdTokenChanged(function(currentUser) {
    idTokenChangeCounter++;
    assertEquals(1, idTokenChangeCounter);
    assertNull(currentUser);
    asyncTestCase.signal();
  });
  var userChanges = 0;
  // Should be called with null.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertNull(currentUser);
    asyncTestCase.signal();
  });
}


function testAuth_signOut_clearSuccessRedirectResult() {
  // Tests getRedirectResult with success event after signOut being called.
  fireauth.AuthEventManager.ENABLED = true;
  const expectedCred = fireauth.GoogleAuthProvider.credential(
      null, 'ACCESS_TOKEN');
  // Expected sign in via redirect successful Auth event.
  const expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            const manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        expectedPopupResult = {
          'user': user1,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        };
        // User 1 should be set here and saved to storage.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return currentUserStorageManager.setCurrentUser(user1).then(() => {
          return expectedPopupResult;
        });
      });
  let user1, expectedPopupResult;
  asyncTestCase.waitForSignals(3);
  const pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  pendingRedirectManager.setPendingStatus().then(() => {
    // Verify that the redirect result is resolved before signing out.
    const manager = fireauth.AuthEventManager.getManager(
        config3['authDomain'], config3['apiKey'], app1.name);
    return manager.getRedirectResult().then((result) => {
      // Expected result returned.
      assertObjectEquals(expectedPopupResult, result);
      return auth1.signOut();
    }).then(() => {
      // signOut should clear the cached redirect result.
      return auth1.getRedirectResult();
    }).then((resultAfterClearing) => {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
  });
}


function testAuth_signOut_clearErrorRedirectResult() {
  // Tests getRedirectResult with error event after signOut being called.
  fireauth.AuthEventManager.ENABLED = true;
  // The expected error.
  const expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Expected sign in via redirect error Auth event.
  const expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      null,
      null,
      expectedError);
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            const manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectSignIn should not run on event error!');
      });
  asyncTestCase.waitForSignals(2);
  const pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  pendingRedirectManager.setPendingStatus().then(() => {
    // Verify that the redirect result is rejected with error before
    // signing out.
    const manager = fireauth.AuthEventManager.getManager(
        config3['authDomain'], config3['apiKey'], app1.name);
    return manager.getRedirectResult().thenCatch((error) => {
      // Expected error returned.
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      return auth1.signOut();
    }).then(() => {
      // signOut should clear the error in cached redirect result.
      return auth1.getRedirectResult();
    }).then((resultAfterClearing) => {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
  }).thenCatch((error) => {
    fail('Redirect result should be cleared by signOut.');
  }) ;
}


function testAuth_returnFromSignInWithRedirect_success_withoutPostBody() {
  // Tests the return from a successful sign in with redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      null, 'ACCESS_TOKEN');
  // Expected sign in via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        expectedPopupResult = {
          'user': user1,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        };
        // User 1 should be set here and saved to storage.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return currentUserStorageManager.setCurrentUser(user1).then(function() {
          return expectedPopupResult;
        });
      });
  var user1, expectedPopupResult;
  asyncTestCase.waitForSignals(5);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  pendingRedirectManager.setPendingStatus().then(function() {
    // Get redirect result should resolve with the expected user and credential.
    auth1.getRedirectResult().then(function(result) {
      // Expected result returned.
      assertObjectEquals(expectedPopupResult, result);
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
  });
  // State listener should fire once only with the final redirected user.
  var idTokenChangeCounter = 0;
  auth1.onIdTokenChanged(function(currentUser) {
    idTokenChangeCounter++;
    assertEquals(1, idTokenChangeCounter);
    assertEquals(user1, currentUser);
    asyncTestCase.signal();
  });
  var userChanges = 0;
  // Should be called with final redirected user.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertEquals(user1, currentUser);
    asyncTestCase.signal();
  });
}


function testAuth_returnFromSignInWithRedirect_success_withPostBody() {
  // Tests the return from a successful sign in with redirect where Auth event
  // has POST body content.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected sign in via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      'POST_BODY');
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/callback', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertEquals('POST_BODY', postBody);
        assertNull(tenantId);
        user1 = new fireauth.AuthUser(
            config3, expectedSamlTokenResponseWithIdPData, accountInfo);
        expectedPopupResult = {
          'user': user1,
          'credential': null,
          'additionalUserInfo': expectedSamlAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        };
        // User 1 should be set here and saved to storage.
        auth1.setCurrentUser_(user1);
        asyncTestCase.signal();
        return currentUserStorageManager.setCurrentUser(user1).then(function() {
          return expectedPopupResult;
        });
      });
  var user1, expectedPopupResult;
  asyncTestCase.waitForSignals(5);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  pendingRedirectManager.setPendingStatus().then(function() {
    // Get redirect result should resolve with the expected user and credential.
    auth1.getRedirectResult().then(function(result) {
      // Expected result returned.
      assertObjectEquals(expectedPopupResult, result);
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
  });
  // State listener should fire once only with the final redirected user.
  var idTokenChangeCounter = 0;
  auth1.onIdTokenChanged(function(currentUser) {
    idTokenChangeCounter++;
    assertEquals(1, idTokenChangeCounter);
    assertEquals(user1, currentUser);
    asyncTestCase.signal();
  });
  var userChanges = 0;
  // Should be called with final redirected user.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertEquals(user1, currentUser);
    asyncTestCase.signal();
  });
}


function testAuth_returnFromSignInWithRedirect_success_tenantId() {
  // Tests the return from a successful sign in with redirect where Auth event
  // has tenant ID.
  // Verify that if tenant ID is in the redirect Auth event, it will be passed
  // to finishPopupAndRedirectSignIn handler and the redirect result with the
  // tenant user will be returned.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedTenantId = 'TENANT_ID';
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      null, 'ACCESS_TOKEN');
  // Expected sign in via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        tenantUser = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfoWithTenantId);
        expectedRedirectResult = {
          'user': tenantUser,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        };
        // Tenant user should be set here and saved to storage.
        auth1.setCurrentUser_(tenantUser);
        asyncTestCase.signal();
        return currentUserStorageManager.setCurrentUser(tenantUser)
            .then(function() {
              return expectedRedirectResult;
            });
      });
  var tenantUser, expectedRedirectResult;
  asyncTestCase.waitForSignals(5);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  pendingRedirectManager.setPendingStatus().then(function() {
    // Get redirect result should resolve with the expected user and credential.
    auth1.getRedirectResult().then(function(result) {
      // Expected result returned.
      assertObjectEquals(expectedRedirectResult, result);
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
  });
  // State listener should fire once only with the final redirected user.
  var idTokenChangeCounter = 0;
  auth1.onIdTokenChanged(function(currentUser) {
    idTokenChangeCounter++;
    assertEquals(1, idTokenChangeCounter);
    assertEquals(tenantUser, currentUser);
    asyncTestCase.signal();
  });
  var userChanges = 0;
  // Should be called with final redirected user.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertEquals(tenantUser, currentUser);
    asyncTestCase.signal();
  });
}


function testAuth_returnFromSignInWithRedirect_withExistingUser() {
  // Tests the return from a successful sign in with redirect while having a
  // previously signed in user.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  var expectedCred = fireauth.GoogleAuthProvider.credential(null,
      'ACCESS_TOKEN');
  // Expected sign in via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      'http://www.example.com/#response',
      'SESSION_ID');
  initializeMockStorage();
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 and existing user2 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(auth1['currentUser']));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        accountInfo['uid'] = '5678';
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        // New signed in user.
        auth1.setCurrentUser_(user1);
        // New user should have popup and redirect enabled.
        user1.enablePopupRedirect();
        expectedPopupResult = {
          'user': user1,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        };
        asyncTestCase.signal();
        // User 1 should be set here and saved to storage.
        return currentUserStorageManager.setCurrentUser(user1).then(function() {
          return expectedPopupResult;
        });
      });
  var user1, expectedPopupResult;
  accountInfo['uid'] = '1234';
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  asyncTestCase.waitForSignals(5);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // When state is ready, currentUser if it exists should be resolved.
  // In this we are simulating sign in with redirect when an existing
  // user was already signed in.
  currentUserStorageManager.setCurrentUser(user2).then(function() {
    return pendingRedirectManager.setPendingStatus();
  }).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Get redirect result should return the new user and expected cred.
    auth1.getRedirectResult().then(function(result) {
      // Newly signed in user.
      assertEquals(user1, auth1['currentUser']);
      assertObjectEquals(expectedPopupResult, result);
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
    // State listener should fire once only with the final redirected user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertEquals(user1, currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with final redirected user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertEquals(user1, currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_returnFromSignInWithRedirect_error() {
  // Test return from sign in via redirect with error generated.
  fireauth.AuthEventManager.ENABLED = true;
  // The expected error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Expected sign in via redirect error Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      null,
      null,
      expectedError);
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // As the event has an error this should not be called.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectSignIn should not run on event error!');
      });
  asyncTestCase.waitForSignals(4);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  pendingRedirectManager.setPendingStatus().then(function() {
    // Get redirect result should return the expected error.
    auth1.getRedirectResult().thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      // Error in redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    }).thenCatch(function(error) {
      fail('Error in event should only be thrown once.');
    });
  });
  // State listener should fire once only with null user.
  var idTokenChangeCounter = 0;
  auth1.onIdTokenChanged(function(currentUser) {
    idTokenChangeCounter++;
    assertEquals(1, idTokenChangeCounter);
    assertNull(currentUser);
    asyncTestCase.signal();
  });
  var userChanges = 0;
  // Should be called with null user.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertNull(currentUser);
    asyncTestCase.signal();
  });
}


function testAuth_returnFromSignInWithRedirect_error_webStorageNotSupported() {
  // Test return from sign in via redirect with web storage not supported error.
  fireauth.AuthEventManager.ENABLED = true;
  // The expected error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  // Expected web storage not supported error Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.UNKNOWN,
      null,
      null,
      null,
      expectedError);
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // As the event has an error this should not be called.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectSignIn should not run on event error!');
      });
  asyncTestCase.waitForSignals(3);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set pending redirect event.
  pendingRedirectManager.setPendingStatus().then(function() {
    // Get redirect result should return the expected error.
    auth1.getRedirectResult().thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      // Errors not being tied to a sign-in session should not be cleared.
      return auth1.getRedirectResult();
    }).then(function(result) {
      fail('Errors not being tied to a sign-in session should not be cleared.');
    }).thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      asyncTestCase.signal();
    });
  });
  // State listener should fire once only with null user.
  var idTokenChangeCounter = 0;
  auth1.onIdTokenChanged(function(currentUser) {
    idTokenChangeCounter++;
    assertEquals(1, idTokenChangeCounter);
    assertNull(currentUser);
    asyncTestCase.signal();
  });
  var userChanges = 0;
  // Should be called with null user.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertNull(currentUser);
    asyncTestCase.signal();
  });
}


function testAuth_returnFromSignInWithRedirect_noEvent() {
  // Test get redirect result with no previous sign in via redirect attempt.
  fireauth.AuthEventManager.ENABLED = true;
  // No event detected.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.UNKNOWN,
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected unknown event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // This should not run as there is no successful event.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectSignIn should not run on unknown event!');
      });
  asyncTestCase.waitForSignals(4);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  pendingRedirectManager.setPendingStatus().then(function() {
    // Get redirect result should return null.
    auth1.getRedirectResult().then(function(result) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, result);
      asyncTestCase.signal();
    });
  });
  // State listener should fire once only with null user.
  var idTokenChangeCounter = 0;
  auth1.onIdTokenChanged(function(currentUser) {
    idTokenChangeCounter++;
    assertEquals(1, idTokenChangeCounter);
    assertNull(currentUser);
    asyncTestCase.signal();
  });
  var userChanges = 0;
  // Should be called with null user.
  auth1.onAuthStateChanged(function(currentUser) {
    userChanges++;
    assertEquals(1, userChanges);
    assertNull(currentUser);
    asyncTestCase.signal();
  });
}


function testAuth_returnFromLinkWithRedirect_success_withoutPostBody() {
  // Test link with redirect success.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  var expectedCred = fireauth.GoogleAuthProvider.credential(null,
      'ACCESS_TOKEN');
  stubs.reset();
  initializeMockStorage();
  // Expected link via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        // When state is ready, currentUser if it exists should be resolved.
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        // Assume user previously called link via redirect.
        user1.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(user1);
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 and user1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(user1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectLink.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        expectedPopupResult = {
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        };
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  asyncTestCase.waitForSignals(5);
  var user1, expectedPopupResult;
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Get redirect result should resolve with expected user and credential.
    auth1.getRedirectResult().then(function(result) {
      assertObjectEquals(expectedPopupResult, result);
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
    // Should fire once only with the final redirected user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with expected user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_returnFromLinkWithRedirect_success_withPostBody() {
  // Test link with redirect success where Auth event has POST body content.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  stubs.reset();
  initializeMockStorage();
  // Expected link via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      'POST_BODY');
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        // When state is ready, currentUser if it exists should be resolved.
        user1 = new fireauth.AuthUser(
            config3, expectedSamlTokenResponseWithIdPData, accountInfo);
        // Assume user previously called link via redirect.
        user1.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(user1);
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 and user1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(user1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectLink.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/callback', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertEquals('POST_BODY', postBody);
        assertNull(tenantId);
        expectedPopupResult = {
          'user': this,
          'credential': null,
          'additionalUserInfo': expectedSamlAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.LINK
        };
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  asyncTestCase.waitForSignals(5);
  var user1, expectedPopupResult;
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Get redirect result should resolve with expected user and credential.
    auth1.getRedirectResult().then(function(result) {
      assertObjectEquals(expectedPopupResult, result);
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
    // Should fire once only with the final redirected user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with expected user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_returnFromLinkWithRedirect_success_tenantId() {
  // Test link with redirect success with tenant ID.
  // Verify that if tenant ID is in the redirect Auth event, it will be passed
  // to finishPopupAndRedirectLink handler and the redirect result with the
  // tenant user will be returned.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  var expectedTenantId = 'TENANT_ID';
  var expectedCred = fireauth.GoogleAuthProvider.credential(null,
      'ACCESS_TOKEN');
  stubs.reset();
  initializeMockStorage();
  // Expected link via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      expectedTenantId);
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        // When state is ready, currentUser if it exists should be resolved.
        tenantUser = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfoWithTenantId);
        // Assume user previously called link via redirect.
        tenantUser.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(tenantUser);
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 and user1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(tenantUser));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectLink.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertEquals(expectedTenantId, tenantId);
        expectedRedirectResult = {
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.LINK
        };
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedRedirectResult);
      });
  asyncTestCase.waitForSignals(5);
  var tenantUser, expectedRedirectResult;
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Get redirect result should resolve with expected user and credential.
    auth1.getRedirectResult().then(function(result) {
      assertObjectEquals(expectedRedirectResult, result);
      asyncTestCase.signal();
    });
    // Should fire once only with the final redirected user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertUserEquals(tenantUser, currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with expected user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertUserEquals(tenantUser, currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_returnFromLinkWithRedirect_redirectedLoggedOutUser_success() {
  // Test link with redirect success when a logged out user try to link with
  // redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  var expectedCred = fireauth.GoogleAuthProvider.credential(null,
      'ACCESS_TOKEN');
  // Expected link via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  stubs.reset();
  initializeMockStorage();
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        // When state is ready, currentUser if it exists should be resolved.
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        return goog.Promise.resolve(user1);
      });
  // Simulate redirect user loaded from storage.
  stubs.replace(
      fireauth.storage.RedirectUserManager.prototype,
      'getRedirectUser',
      function() {
        // Create a logged out user that tried to link with redirect.
        user2 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        user2.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(user2);
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1, user1 and redirect user2 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(user1));
            assertTrue(manager.isSubscribed(user2));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectLink.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        // This should be called on redirect user only.
        assertEquals(user2, this);
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        expectedPopupResult = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        });
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  asyncTestCase.waitForSignals(5);
  var user1, user2, expectedPopupResult;
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set language code.
  auth1.languageCode = 'fr';
  // Log framework.
  auth1.logFramework('firebaseui');
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    // Get redirect result should resolve with redirect user (not current user)
    // and expected credential.
    auth1.getRedirectResult().then(function(result) {
      // User1 logged in.
      assertEquals(user1, auth1['currentUser']);
      // Framework change should propagate to currentUser.
      assertArrayEquals(['firebaseui'], auth1['currentUser'].getFramework());
      assertEquals('fr', auth1['currentUser'].getLanguageCode());
      // User2 expected in getRedirectResult.
      fireauth.common.testHelper.assertUserCredentialResponse(
          // Expected current user returned.
          user2,
          // Expected credential returned.
          expectedCred,
          // Expected additional user info.
          expectedAdditionalUserInfo,
          // operationType not implemented yet.
          fireauth.constants.OperationType.SIGN_IN,
          result);
      // Framework updates should still propagate to redirect user.
      assertArrayEquals(['firebaseui'], result.user.getFramework());
      auth1.logFramework('angularfire');
      assertArrayEquals(
          ['firebaseui', 'angularfire'], result.user.getFramework());
      // Language code should propagate to redirect user.
      assertEquals('fr', result.user.getLanguageCode());
      auth1.languageCode = 'de';
      assertEquals('de', result.user.getLanguageCode());
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
    // Should fire once only with the original user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with original user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_redirectedLoggedOutUser_differentAuthDomain() {
  // Test link with redirect success when a logged out user with a different
  // authDomain tries to link with redirect.
  fireauth.AuthEventManager.ENABLED = true;
  stubs.reset();
  // Simulate current origin is whitelisted.
  simulateWhitelistedOrigin();
  initializeMockStorage();
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  var expectedEventId = '1234';
  var expectedCred = fireauth.GoogleAuthProvider.credential(null,
      'ACCESS_TOKEN');
  // Expected link via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey) {
        return {
          'addAuthEventListener': function(handler) {
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectLink.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        return goog.Promise.resolve({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        });
      });
  asyncTestCase.waitForSignals(3);
  // The logged out user with the different authDomain.
  var user1 = new fireauth.AuthUser(
      config4, expectedTokenResponse, accountInfo);
  user1.setRedirectEventId(expectedEventId);
  // Auth will modify user to use its authDomain.
  var modifiedUser1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  modifiedUser1.setRedirectEventId(expectedEventId);
  // Set saved logged out redirect user using different authDomain.
  redirectUserStorageManager = new fireauth.storage.RedirectUserManager(
      config3['apiKey'] + ':' + appId1);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  redirectUserStorageManager.setRedirectUser(user1).then(function() {
    pendingRedirectManager.setPendingStatus().then(function() {
      app1 = firebase.initializeApp(config3, appId1);
      auth1 = app1.auth();
      // Set language code.
      auth1.languageCode = 'fr';
      // Log framework.
      auth1.logFramework('firebaseui');
      // Get redirect result should resolve with redirect user and its
      // authDomain overridden with the current app authDomain.
      auth1.getRedirectResult().then(function(result) {
        // No logged in user.
        assertNull(auth1.currentUser);
        // Redirect logged out user should have authDomain matching with
        // app's.
        assertUserEquals(modifiedUser1, result.user);
        // Framework updates should still propagate to redirected user.
        assertArrayEquals(['firebaseui'], result.user.getFramework());
        auth1.logFramework('angularfire');
        assertArrayEquals(
            ['firebaseui', 'angularfire'], result.user.getFramework());
        // Language code should propagate to redirected user.
        assertEquals('fr', result.user.getLanguageCode());
        auth1.languageCode = 'de';
        assertEquals('de', result.user.getLanguageCode());
        // Redirect result should be cleared after being returned once.
        return auth1.getRedirectResult();
      }).then(function(resultAfterClearing) {
        fireauth.common.testHelper.assertUserCredentialResponse(
            null, null, null, undefined, resultAfterClearing);
        asyncTestCase.signal();
      });
      // Should fire once only with null user.
      var idTokenChangeCounter = 0;
      auth1.onIdTokenChanged(function(currentUser) {
        idTokenChangeCounter++;
        assertEquals(1, idTokenChangeCounter);
        assertNull(currentUser);
        asyncTestCase.signal();
      });
      var userChanges = 0;
      // Should be called with null user.
      auth1.onAuthStateChanged(function(currentUser) {
        userChanges++;
        assertEquals(1, userChanges);
        assertNull(currentUser);
        asyncTestCase.signal();
      });
    });
  });
}


function testAuth_returnFromLinkWithRedirect_noCurrentUser_redirectUser() {
  // Test link with redirect success when a logged out user try to link with
  // redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  var expectedCred = fireauth.GoogleAuthProvider.credential(null,
      'ACCESS_TOKEN');
  // Expected link via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  stubs.reset();
  initializeMockStorage();
  // Simulate redirect user loaded from storage.
  stubs.replace(
      fireauth.storage.RedirectUserManager.prototype,
      'getRedirectUser',
      function() {
        // Create a logged out user that tried to link with redirect.
        user2 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        user2.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(user2);
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1, redirect user2 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(user2));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectLink.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        // This should be called on redirect user only.
        assertEquals(user2, this);
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        expectedPopupResult = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        });
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  asyncTestCase.waitForSignals(5);
  var user2, expectedPopupResult;
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set language code.
  auth1.languageCode = 'fr';
  // Log framework.
  auth1.logFramework('firebaseui');
  pendingRedirectManager.setPendingStatus().then(function() {
    // Get redirect result should resolve with redirect user (not current user)
    // and expected credential.
    auth1.getRedirectResult().then(function(result) {
      // No current user.
      assertNull(auth1['currentUser']);
      // User2 expected in getRedirectResult.
      fireauth.common.testHelper.assertUserCredentialResponse(
          // Expected current user returned.
          user2,
          // Expected credential returned.
          expectedCred,
          // Expected additional user info.
          expectedAdditionalUserInfo,
          // operationType not implemented yet.
          fireauth.constants.OperationType.SIGN_IN,
          result);
      // Framework updates should still propagate to redirected non current
      // user.
      assertArrayEquals(['firebaseui'], result.user.getFramework());
      auth1.logFramework('angularfire');
      assertArrayEquals(
          ['firebaseui', 'angularfire'], result.user.getFramework());
      // Language code should propagate to redirected non current user.
      assertEquals('fr', result.user.getLanguageCode());
      auth1.languageCode = 'de';
      assertEquals('de', result.user.getLanguageCode());
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
    // Should fire once only with null user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertNull(currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with null user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertNull(currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_returnFromLinkWithRedirect_noUsers() {
  // Test link with redirect success when a logged out user try to link with
  // redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  // Expected link via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectLink.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectLink should not call!');
      });
  asyncTestCase.waitForSignals(4);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Get redirect result should resolve with redirect user (not current user)
    // and expected credential.
    auth1.getRedirectResult().then(function(result) {
      // No current user.
      assertNull(auth1['currentUser']);
      // No results.
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, result);
      asyncTestCase.signal();
    });
    // Should fire once only with null user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertNull(currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with null user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertNull(currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_returnFromLinkWithRedirect_redirectedLoggedInUser_success() {
  // Test link with redirect success when a logged in user tries to redirect.
  // The same user will typically be also retrieved from storage but only the
  // current user will be handled.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  var expectedCred = fireauth.GoogleAuthProvider.credential(null,
      'ACCESS_TOKEN');
  // Expected link via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
  stubs.reset();
  initializeMockStorage();
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        // When state is ready, currentUser if it exists should be resolved.
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        // Current user user1 tried to link via redirect.
        user1.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(user1);
      });
  // Simulate redirect user loaded from storage.
  stubs.replace(
      fireauth.storage.RedirectUserManager.prototype,
      'getRedirectUser',
      function() {
        // The same user should be save as rediret user too.
        user2 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        user2.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(user2);
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1, user1 and redirect user2 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(user1));
            assertTrue(manager.isSubscribed(user2));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectLink.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        // This should be called on current user only as he is subscribed first.
        assertEquals(user1, this);
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        expectedPopupResult = fireauth.object.makeReadonlyCopy({
          'user': this,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        });
        asyncTestCase.signal();
        return goog.Promise.resolve(expectedPopupResult);
      });
  asyncTestCase.waitForSignals(5);
  var user1, user2, expectedPopupResult;
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Get redirect result should resolve with redirect user (not current user)
    // and expected credential.
    auth1.getRedirectResult().then(function(result) {
      // User1 logged in.
      assertEquals(user1, auth1['currentUser']);
      // User1 expected in getRedirectResult.
      fireauth.common.testHelper.assertUserCredentialResponse(
          // Expected current user returned.
          user1,
          // Expected credential returned.
          expectedCred,
          // Expected additional user info.
          expectedAdditionalUserInfo,
          // operationType not implemented yet.
          fireauth.constants.OperationType.SIGN_IN,
          result);
      // Redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    });
    // Should fire once only with redirected user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with redirected user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_returnFromLinkWithRedirect_invalidUser() {
  // Test link with redirect event belonging to a diffent user.
  // This could happen if the same user started the redirect event in a
  // different tab. The event should resolve in the same tab.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedEventId = '1234';
  // Successful link via redirect belonging to another user.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      'OTHER_ID',
      'http://www.example.com/#response',
      'SESSION_ID');
  stubs.reset();
  initializeMockStorage();
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        // When state is ready, currentUser if it exists should be resolved.
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        // Set redirect event ID.
        user1.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(user1);
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 and user1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(user1));
            // At this stage user and Auth are subscribed.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // This should not run as the logged in user's event ID does not match with
  // detected event ID.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectLink should not call due to UID mismatch!');
      });
  asyncTestCase.waitForSignals(4);
  var user1;
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Due to event ID mismatch, this should return null.
    auth1.getRedirectResult().then(function(result) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, result);
      asyncTestCase.signal();
    });
    // Should fire once only with original user1.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with original user1.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_returnFromLinkWithRedirect_error() {
  // Test return from link with redirect event having an error.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedEventId = '1234';
  // Expected link via redirect event with error.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      expectedEventId,
      null,
      null,
      expectedError);
  stubs.reset();
  initializeMockStorage();
  // Simulate user loaded from storage.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'getCurrentUser',
      function() {
        // When state is ready, currentUser if it exists should be resolved.
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        // Set user as owner of this event.
        user1.setRedirectEventId(expectedEventId);
        return goog.Promise.resolve(user1);
      });
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 and user1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            assertTrue(manager.isSubscribed(user1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // As the event contains an error, this should not run.
  stubs.replace(
      fireauth.AuthUser.prototype,
      'finishPopupAndRedirectLink',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectLink should not call due to event error!');
      });
  asyncTestCase.waitForSignals(4);
  var user1;
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Get redirect result should contain an error.
    auth1.getRedirectResult().thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      // Error in redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(resultAfterClearing) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, resultAfterClearing);
      asyncTestCase.signal();
    }).thenCatch(function(error) {
      fail('Error in event should only be thrown once.');
    });
    // Should fire once only with original user1.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with original user1.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertUserEquals(user1, currentUser);
      asyncTestCase.signal();
    });
  });
}


function testAuth_signInWithRedirect_success_unloadsOnRedirect() {
  // Test successful request for sign in via redirect when page unloads on
  // redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedMode = fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT;
  asyncTestCase.waitForSignals(1);
  // Track calls to savePersistenceForRedirect.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'savePersistenceForRedirect',
      goog.testing.recordFunction());
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'unloadsOnRedirect': function() { return true; },
          'processRedirect': function(
              actualMode, actualProvider, actualEventId) {
            assertEquals(expectedMode, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertUndefined(actualEventId);
            // Confirm current persistence is saved before redirect.
            assertEquals(
                1,
                fireauth.storage.UserManager.prototype
                .savePersistenceForRedirect.getCallCount());
            asyncTestCase.signal();
            return goog.Promise.resolve();
          }
        };
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // sign in with redirect should call processRedirect underneath and remain
  // pending.
  auth1.signInWithRedirect(expectedProvider).then(function() {
    fail('SignInWithRedirect should remain pending in environment where ' +
        'OAuthSignInHandler unloads the page.');
  });
}


function testAuth_signInWithRedirect_success_unloadsOnRedirect_tenantId() {
  // Test successful request for sign in via redirect when page unloads on
  // redirect and tenant ID is passed.
  // Verify that tenant ID is passed to OAuth sign in handler.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedTenantId = 'TENANT_ID';
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedMode = fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT;
  asyncTestCase.waitForSignals(1);
  // Track calls to savePersistenceForRedirect.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'savePersistenceForRedirect',
      goog.testing.recordFunction());
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'unloadsOnRedirect': function() { return true; },
          'processRedirect': function(
              actualMode, actualProvider, actualEventId, actualTenantId) {
            assertEquals(expectedMode, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertUndefined(actualEventId);
            // Tenant ID should be passed to OAuth handler.
            assertEquals(expectedTenantId, actualTenantId);
            // Confirm current persistence is saved before redirect.
            assertEquals(
                1,
                fireauth.storage.UserManager.prototype
                .savePersistenceForRedirect.getCallCount());
            asyncTestCase.signal();
            return goog.Promise.resolve();
          }
        };
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set tenant ID on Auth.
  auth1.tenantId = expectedTenantId;
  // sign in with redirect should call processRedirect underneath and remain
  // pending.
  auth1.signInWithRedirect(expectedProvider).then(function() {
    fail('SignInWithRedirect should remain pending in environment where ' +
        'OAuthSignInHandler unloads the page.');
  });
}


function testAuth_signInWithRedirect_success_doesNotUnloadOnRedirect() {
  // Test successful request for sign in via redirect when page does not unload
  // on redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedMode = fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT;
  asyncTestCase.waitForSignals(1);
  // Track calls to savePersistenceForRedirect.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'savePersistenceForRedirect',
      goog.testing.recordFunction());
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'unloadsOnRedirect': function() { return false; },
          'processRedirect': function(
              actualMode, actualProvider, actualEventId) {
            assertEquals(expectedMode, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertUndefined(actualEventId);
            // Confirm current persistence is saved before redirect.
            assertEquals(
                1,
                fireauth.storage.UserManager.prototype
                .savePersistenceForRedirect.getCallCount());
            return goog.Promise.resolve();
          }
        };
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with redirect should resolve in this case as the page does not
  // necessarily unload.
  auth1.signInWithRedirect(expectedProvider).then(function() {
    asyncTestCase.signal();
  });
}


function testAuth_signInWithRedirect_success_doesNotUnload_tenantId() {
  // Test successful request for sign in via redirect when page does not unload
  // on redirect and tenant ID is passed.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedTenantId = 'TENANT_ID';
  var expectedProvider = new fireauth.GoogleAuthProvider();
  var expectedMode = fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT;
  asyncTestCase.waitForSignals(1);
  // Track calls to savePersistenceForRedirect.
  stubs.replace(
      fireauth.storage.UserManager.prototype,
      'savePersistenceForRedirect',
      goog.testing.recordFunction());
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'unloadsOnRedirect': function() { return false; },
          'processRedirect': function(
              actualMode, actualProvider, actualEventId, actualTenantId) {
            assertEquals(expectedMode, actualMode);
            assertEquals(expectedProvider, actualProvider);
            assertUndefined(actualEventId);
            // Tenant ID should be passed to OAuth handler.
            assertEquals(expectedTenantId, actualTenantId);
            // Confirm current persistence is saved before redirect.
            assertEquals(
                1,
                fireauth.storage.UserManager.prototype
                .savePersistenceForRedirect.getCallCount());
            return goog.Promise.resolve();
          }
        };
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Set tenant ID on Auth.
  auth1.tenantId = expectedTenantId;
  // Sign in with redirect should resolve in this case as the page does not
  // necessarily unload.
  auth1.signInWithRedirect(expectedProvider).then(function() {
    asyncTestCase.signal();
  });
}


function testAuth_signInWithRedirect_missingAuthDomain() {
  // Test failing request for sign in via redirect due to missing Auth domain.
  fireauth.AuthEventManager.ENABLED = true;
  // No Auth domain supplied.
  var config = {
    'apiKey': 'API_KEY'
  };
  // Expected missing Auth domain error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.MISSING_AUTH_DOMAIN);
  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.GoogleAuthProvider();
  // Sign in with redirect should fail with missing Auth domain.
  auth1.signInWithRedirect(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_signInWithRedirect_invalidProvider() {
  // Test sign in with redirect failing with invalid provider.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected invalid OAuth provider error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  asyncTestCase.waitForSignals(1);
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'unloadsOnRedirect': function() { return true; },
          'processRedirect': function(
              actualMode, actualProvider, actualEventId) {
            assertEquals(
                fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT, actualMode);
            assertEquals(provider, actualProvider);
            assertUndefined(actualEventId);
            return goog.Promise.reject(expectedError);
          }
        };
      });
  var provider = new fireauth.EmailAuthProvider();
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Sign in with redirect should fail with invalid OAuth provider error.
  auth1.signInWithRedirect(provider).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testAuth_returnFromSignInWithRedirect_timeout() {
  // Test return from sign in with redirect getRedirectResult timing out.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected timeout error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TIMEOUT);
  clock = new goog.testing.MockClock(true);
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 and user1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // This should not run due to timeout error.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        fail('finishPopupAndRedirectSignIn should not call due to timeout!');
      });
  asyncTestCase.waitForSignals(4);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus().then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Get redirect result should fail with timeout error.
    auth1.getRedirectResult().thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      asyncTestCase.signal();
    });
    // Should fire once only with null user.
    var idTokenChangeCounter = 0;
    auth1.onIdTokenChanged(function(currentUser) {
      idTokenChangeCounter++;
      assertEquals(1, idTokenChangeCounter);
      assertNull(currentUser);
      asyncTestCase.signal();
    });
    var userChanges = 0;
    // Should be called with null user.
    auth1.onAuthStateChanged(function(currentUser) {
      userChanges++;
      assertEquals(1, userChanges);
      assertNull(currentUser);
      asyncTestCase.signal();
    });
    // Speed up timeout.
    clock.tick(timeoutDelay);
  });
}


function testAuth_invalidateSession_tokenExpired() {
  // Test when a token expired error is triggered on a current user that the
  // user is signed out.
  fireauth.AuthEventManager.ENABLED = true;
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Expected token error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.TOKEN_EXPIRED);
  // Whether to trigger the token error or not.
  var triggerTokenError = false;
  // Stub token manager to either throw the token error or the valid tokens.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        if (triggerTokenError) {
          return goog.Promise.reject(expectedError);
        }
        return goog.Promise.resolve({
          'accessToken': jwt1,
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Access token unchanged, should trigger notifyAuthListeners_.
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(1);
  // Logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Save current user in storage.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);

  // Track token change events.
  var tokenChangeCounter = 0;
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // This should trigger initially and then on sign out.
    auth1.addAuthTokenListener(function(token) {
      // Keep track.
      tokenChangeCounter++;
      if (token) {
        // Initial sign in.
        assertEquals(1, tokenChangeCounter);
        // Confirm ID token.
        assertEquals(jwt1, token);
        // Force token error on next call.
        triggerTokenError = true;
        // Token error should be detected.
        auth1.currentUser.getIdToken(true).thenCatch(function(error) {
          fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        });
      } else {
        // Should be triggered again on user invalidation.
        assertEquals(2, tokenChangeCounter);
        // User signed out.
        assertNull(auth1.currentUser);
        // User cleared from storage.
        currentUserStorageManager.getCurrentUser().then(function(user) {
          // No user stored anymore.
          assertNull(user);
          asyncTestCase.signal();
        });
      }
    });
  });
}


function testAuth_invalidateSession_userDisabled() {
  // Test when a user disabled error is triggered on a current user that the
  // user is signed out.
  fireauth.AuthEventManager.ENABLED = true;
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Expected token error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  // Whether to trigger the token error or not.
  var triggerTokenError = false;
  // Stub token manager to either throw the token error or the valid tokens.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        if (triggerTokenError) {
          return goog.Promise.reject(expectedError);
        }
        return goog.Promise.resolve({
          'accessToken': jwt1,
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Access token unchanged, should trigger notifyAuthListeners_.
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(1);
  // Logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Save current user in storage.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);

  // Track token change events.
  var tokenChangeCounter = 0;
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // This should trigger initially and then on sign out.
    auth1.addAuthTokenListener(function(token) {
      // Keep track.
      tokenChangeCounter++;
      if (token) {
        // Initial sign in.
        assertEquals(1, tokenChangeCounter);
        // Confirm ID token.
        assertEquals(jwt1, token);
        // Force token error on next call.
        triggerTokenError = true;
        // Token error should be detected.
        auth1.currentUser.getIdToken(true).thenCatch(function(error) {
          fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        });
      } else {
        // Should be triggered again on user invalidation.
        assertEquals(2, tokenChangeCounter);
        // User signed out.
        assertNull(auth1.currentUser);
        // User cleared from storage.
        currentUserStorageManager.getCurrentUser().then(function(user) {
          // No user stored anymore.
           assertNull(user);
           asyncTestCase.signal();
        });
      }
    });
  });
}


function testAuth_invalidateSession_dispatchUserInvalidatedEvent() {
  // Test when a user invalidate event is dispatched on a current user that the
  // user is signed out.
  fireauth.AuthEventManager.ENABLED = true;
  // Stub OAuth sign in handler.
  fakeOAuthSignInHandler();
  // Stub token manager to return valid tokens.
  stubs.replace(
      fireauth.StsTokenManager.prototype,
      'getToken',
      function() {
        return goog.Promise.resolve({
          'accessToken': jwt1,
          'refreshToken': 'REFRESH_TOKEN'
        });
      });
  stubs.replace(
      fireauth.AuthUser.prototype,
      'reload',
      function() {
        // Access token unchanged, should trigger notifyAuthListeners_.
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(1);
  // Logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Save current user in storage.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);

  // Track token change events.
  var tokenChangeCounter = 0;
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
     // This should trigger initially and then on sign out.
    auth1.addAuthTokenListener(function(token) {
      // Keep track.
      tokenChangeCounter++;
      if (token) {
        // Initial sign in.
        assertEquals(1, tokenChangeCounter);
        // Confirm ID token.
        assertEquals(jwt1, token);
        // Dispatch user invalidation event on current user.
        auth1.currentUser.dispatchEvent(
            fireauth.UserEventType.USER_INVALIDATED);
      } else {
        // Should be triggered again on user invalidation.
        assertEquals(2, tokenChangeCounter);
        // User signed out.
        assertNull(auth1.currentUser);
         // User cleared from storage.
        currentUserStorageManager.getCurrentUser().then(function(user) {
          // No user stored anymore.
           assertNull(user);
           asyncTestCase.signal();
        });
      }
    });
  });
}


function testAuth_proactiveTokenRefresh_multipleUsers() {
  // Test proactive refresh when a Firebase service is added before sign in
  // and multiple users are signed in successively.
  // Record startProactiveRefresh and stopProactiveRefresh calls.
  asyncTestCase.waitForSignals(1);
  stubs.replace(
      fireauth.AuthUser.prototype,
      'startProactiveRefresh',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.AuthUser.prototype,
      'stopProactiveRefresh',
      goog.testing.recordFunction());
  // Logged in users.
  var accountInfo1 = {
    'uid': '1234',
    'email': 'user1@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  var accountInfo2 = {
    'uid': '5678',
    'email': 'user2@example.com',
    'displayName': 'John Smith',
    'emailVerified': false
  };
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo1);
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo2);
  var calls = 0;
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        calls++;
        // Return user1 on first call and user2 on second.
        if (calls == 1) {
          return goog.Promise.resolve(user1);
        } else {
          return goog.Promise.resolve(user2);
        }
      });
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var subscriber = function(token) {};
  // Simulate Firebase service added.
  app1.container.getProvider('auth-internal').getImmediate().addAuthTokenListener(subscriber);
  // Simulate user1 signed in.
  auth1.signInWithIdTokenResponse(expectedTokenResponse).then(function() {
    // Current user should be set to user1.
    assertEquals(user1, auth1['currentUser']);
    // Confirm proactive refresh started on user1.
    assertEquals(
        1, fireauth.AuthUser.prototype.startProactiveRefresh.getCallCount());
    assertEquals(
        user1,
        fireauth.AuthUser.prototype.startProactiveRefresh.getLastCall()
            .getThis());
    // Stop not yet called.
    assertEquals(
        0, fireauth.AuthUser.prototype.stopProactiveRefresh.getCallCount());
    // Sign in another user.
    return auth1.signInWithIdTokenResponse(expectedTokenResponse);
  }).then(function() {
    // Current user should be set to user2.
    assertEquals(user2, auth1['currentUser']);
    // Confirm proactive refresh started on user2.
    assertEquals(
        2, fireauth.AuthUser.prototype.startProactiveRefresh.getCallCount());
    assertEquals(
        user2,
        fireauth.AuthUser.prototype.startProactiveRefresh.getLastCall()
            .getThis());
    // Stop proactive refresh on user1.
    assertEquals(
        1, fireauth.AuthUser.prototype.stopProactiveRefresh.getCallCount());
    assertEquals(
        user1,
        fireauth.AuthUser.prototype.stopProactiveRefresh.getLastCall()
            .getThis());
    // Sign out the user2.
    return auth1.signOut();
  }).then(function() {
    // Confirm proactive refresh stopped on user2.
    assertEquals(
        2, fireauth.AuthUser.prototype.stopProactiveRefresh.getCallCount());
    assertEquals(
        user2,
        fireauth.AuthUser.prototype.stopProactiveRefresh.getLastCall()
            .getThis());
    asyncTestCase.signal();
  });
}


function testAuth_proactiveTokenRefresh_firebaseServiceAddedAfterSignIn() {
  // Test proactive refresh when a Firebase service is added after sign in.
  // Record startProactiveRefresh and stopProactiveRefresh calls.
  asyncTestCase.waitForSignals(1);
  stubs.replace(
      fireauth.AuthUser.prototype,
      'startProactiveRefresh',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.AuthUser.prototype,
      'stopProactiveRefresh',
      goog.testing.recordFunction());
  var subscriber = function(token) {};
  // Logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  // Save current user in storage.
  currentUserStorageManager = new fireauth.storage.UserManager(
      config3['apiKey'] + ':' + appId1);
  // Simulate user signed in.
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    var unsubscribe = auth1.onIdTokenChanged(function(user) {
      unsubscribe();
      // Confirm proactive refresh not started on that user.
      assertEquals(
          0, fireauth.AuthUser.prototype.startProactiveRefresh.getCallCount());
      // Simulate Firebase service added.
      app1.container.getProvider('auth-internal').getImmediate().addAuthTokenListener(subscriber);
      // Confirm proactive refresh started on that user.
      assertEquals(
          1, fireauth.AuthUser.prototype.startProactiveRefresh.getCallCount());
      // Confirm proactive refresh not stopped yet on that user.
      assertEquals(
          0, fireauth.AuthUser.prototype.stopProactiveRefresh.getCallCount());
      // Sign out the user.
      auth1.signOut().then(function() {
        // Confirm proactive refresh stopped on that user.
        assertEquals(
            1, fireauth.AuthUser.prototype.stopProactiveRefresh.getCallCount());
        asyncTestCase.signal();
      });
    });
  });
}


function testAuth_proactiveTokenRefresh_firebaseServiceRemovedAfterSignIn() {
  // Test proactive refresh stopped when a Firebase service is removed.
  // Record startProactiveRefresh and stopProactiveRefresh calls.
  asyncTestCase.waitForSignals(1);
  stubs.replace(
      fireauth.AuthUser.prototype,
      'startProactiveRefresh',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.AuthUser.prototype,
      'stopProactiveRefresh',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        return goog.Promise.resolve(user1);
      });
  // Logged in user.
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var subscriber = function(token) {};
  // Simulate Firebase service added.
  authInternal1 = app1.container.getProvider('auth-internal').getImmediate();
  authInternal1.addAuthTokenListener(subscriber);
  // Add same listener again to check that removing it once will ensure the
  // proactive refresh is stopped.
  authInternal1.addAuthTokenListener(subscriber);
  // Simulate user signed in.
  auth1.signInWithIdTokenResponse(expectedTokenResponse).then(function() {
    // Current user should be set to user1.
    assertEquals(user1, auth1['currentUser']);
    // Confirm proactive refresh started on that user.
    assertEquals(
        1, fireauth.AuthUser.prototype.startProactiveRefresh.getCallCount());
    // Stop not yet called.
    assertEquals(
        0, fireauth.AuthUser.prototype.stopProactiveRefresh.getCallCount());
    // Simulate Firebase service removed.
    authInternal1.removeAuthTokenListener(subscriber);
    // Confirm proactive refresh stopped on that user.
    assertEquals(
        1, fireauth.AuthUser.prototype.stopProactiveRefresh.getCallCount());
    asyncTestCase.signal();
  });
}


function testAuth_signInWithPhoneNumber_success() {
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var expectedVerificationId = 'VERIFICATION_ID';
  var expectedCode = '123456';
  var expectedPhoneNumber = '+15551234567';
  var expectedRecaptchaToken = 'RECAPTCHA_TOKEN';
  var expectedCredential = fireauth.PhoneAuthProvider.credential(
      expectedVerificationId, expectedCode);
  var appVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      return goog.Promise.resolve(expectedRecaptchaToken);
    }
  };
  // Expected promise to be returned by signInWithCredential.
  var expectedPromise = new goog.Promise(function(resolve, reject) {});
  // Phone Auth provider instance.
  var phoneAuthProviderInstance =
      mockControl.createStrictMock(fireauth.PhoneAuthProvider);
  // Phone Auth provider constructor mock.
  var phoneAuthProviderConstructor = mockControl.createConstructorMock(
      fireauth, 'PhoneAuthProvider');
  // Provider instance should be initialized with the expected Auth instance
  // and return the expected phone Auth provider instance.
  phoneAuthProviderConstructor(auth1)
      .$returns(phoneAuthProviderInstance).$once();
  // verifyPhoneNumber called on provider instance with the expected phone
  // number and appVerifier. This would resolve with the expected verification
  // ID.
  phoneAuthProviderInstance.verifyPhoneNumber(
      expectedPhoneNumber, appVerifier)
      .$returns(goog.Promise.resolve(expectedVerificationId)).$once();
  // Code confirmation should call signInWithCredential with the expected
  // credential.
  stubs.replace(
      fireauth.Auth.prototype,
      'signInWithCredential',
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
  // Call signInWithPhoneNumber.
  auth1.signInWithPhoneNumber(expectedPhoneNumber, appVerifier)
      .then(function(confirmationResult) {
        // Confirmation result returned should contain expected verification ID.
        assertEquals(
            expectedVerificationId, confirmationResult['verificationId']);
        // Code confirmation should return the same response as the underlying
        // signInAndRetrieveDataWithCredential.
        assertEquals(expectedPromise, confirmationResult.confirm(expectedCode));
        // Confirm signInAndRetrieveDataWithCredential called once.
        assertEquals(
            1,
            fireauth.Auth.prototype.signInWithCredential.getCallCount());
        // Confirm signInAndRetrieveDataWithCredential is bound to auth1.
        assertEquals(
            auth1,
            fireauth.Auth.prototype.signInWithCredential
                .getLastCall().getThis());
        asyncTestCase.signal();
      });
}


function testAuth_signInWithPhoneNumber_error() {
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var expectedPhoneNumber = '+15551234567';
  var expectedRecaptchaToken = 'RECAPTCHA_TOKEN';
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var appVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      return goog.Promise.resolve(expectedRecaptchaToken);
    }
  };
  // Phone Auth provider instance.
  var phoneAuthProviderInstance =
      mockControl.createStrictMock(fireauth.PhoneAuthProvider);
  // Phone Auth provider constructor mock.
  var phoneAuthProviderConstructor = mockControl.createConstructorMock(
      fireauth, 'PhoneAuthProvider');
  // Mock signInAndRetrieveDataWithCredential.
  var signInAndRetrieveDataWithCredential = mockControl.createMethodMock(
      fireauth.Auth.prototype, 'signInAndRetrieveDataWithCredential');
  // Provider instance should be initialized with the expected Auth instance
  // and return the expected phone Auth provider instance.
  phoneAuthProviderConstructor(auth1)
      .$returns(phoneAuthProviderInstance).$once();
  // verifyPhoneNumber called on provider instance with the expected phone
  // number and appVerifier. This would reject with the expected error.
  phoneAuthProviderInstance.verifyPhoneNumber(
      expectedPhoneNumber, appVerifier)
      .$returns(goog.Promise.reject(expectedError)).$once();
  // signInAndRetrieveDataWithCredential should not be called.
  signInAndRetrieveDataWithCredential(ignoreArgument).$times(0);
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);
  // Call signInWithPhoneNumber.
  auth1.signInWithPhoneNumber(expectedPhoneNumber, appVerifier)
      .thenCatch(function(error) {
        // This should throw the same error thrown by verifyPhoneNumber.
        assertEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testAuth_setPersistence_invalid() {
  var unsupportedTypeError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_PERSISTENCE);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  // Session should throw an unsupported persistence type error.
  fireauth.common.testHelper.assertErrorEquals(
      unsupportedTypeError,
      assertThrows(function() {
        auth1.setPersistence('bla');
      }));
}


function testAuth_setPersistence_noExistingAuthState() {
  // Test when persistence is set that future sign-in attempts are stored
  // using specified persistence.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        calls++;
        // Return user1 on first call and user2 on second.
        if (calls == 1) {
          assertObjectEquals(expectedTokenResponse, idTokenResponse);
          return goog.Promise.resolve(user1);
        } else {
          assertObjectEquals(expectedTokenResponse2, idTokenResponse);
          return goog.Promise.resolve(user2);
        }
      });
  // Stub verifyPassword to return tokens for first user.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyPassword',
      function(email, password) {
        return goog.Promise.resolve(expectedTokenResponse);
      });
  // Stub verifyCustomToken to return tokens for second user.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyCustomToken',
      function(customToken) {
        return goog.Promise.resolve(expectedTokenResponse2);
      });
  // Fixes weird IE flakiness.
  clock = new goog.testing.MockClock(true);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, {'uid': '1234'});
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse2, {'uid': '5678'});
  var calls = 0;
  asyncTestCase.waitForSignals(1);
  // Switch to session persistence.
  auth1.setPersistence('session');
  clock.tick(1);
  // Sign in with email/password.
  auth1.signInWithEmailAndPassword(
      'user@example.com', 'password').then(function(userCredential) {
    clock.tick(1);
    // Confirm first user saved in session storage.
    assertUserEquals(user1, userCredential['user']);
    return fireauth.common.testHelper.assertUserStorage(
        auth1.getStorageKey(), 'session', user1,
        fireauth.authStorage.Manager.getInstance());
  }).then(function() {
    // Sign in with custom token.
    return auth1.signInWithCustomToken('CUSTOM_TOKEN');
  }).then(function() {
    // Confirm second user saved in session storage.
    clock.tick(1);
    return fireauth.common.testHelper.assertUserStorage(
        auth1.getStorageKey(), 'session', user2,
        fireauth.authStorage.Manager.getInstance());
  }).then(function() {
    asyncTestCase.signal();
  });
}


function testAuth_setPersistence_existingAuthState() {
  // Test when persistence is set after initialization, a stored Auth state
  // will be switched to the new type of storage.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        return goog.Promise.resolve(user2);
      });
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'signInAnonymously',
      function() {
        // Return tokens for second test user.
        return goog.Promise.resolve(expectedTokenResponse2);
      });
  asyncTestCase.waitForSignals(2);
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, {'uid': '1234'});
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse2, {'uid': '5678'});
  currentUserStorageManager =
      new fireauth.storage.UserManager(config3['apiKey'] + ':' + appId1);
  // Simulate logged in user, save to storage, it will be picked up on init
  // Auth state. This will use the default local persistence.
  currentUserStorageManager.setCurrentUser(user1).then(function() {
    app1 = firebase.initializeApp(config3, appId1);
    auth1 = app1.auth();
    // Switch to session persistence.
    auth1.setPersistence('session');
    var unsubscribe = auth1.onAuthStateChanged(function(user) {
      unsubscribe();
      // When this is first triggered, the previously signed in user should be
      // switched to session storage.
      fireauth.common.testHelper.assertUserStorage(
          config3['apiKey'] + ':' + appId1, 'session', user1,
          fireauth.authStorage.Manager.getInstance()).then(function() {
        // Sign in a new user.
        return auth1.signInAnonymously();
      }).then(function() {
        // Second user should be also persistence in session storage.
        return fireauth.common.testHelper.assertUserStorage(
            config3['apiKey'] + ':' + appId1, 'session', user2,
            fireauth.authStorage.Manager.getInstance());
      }).then(function() {
        asyncTestCase.signal();
      });
    });
    // Track all token changes. Confirm persistence changes do not trigger
    // unexpected calls.
    var uidsDetected = [];
    auth1.onIdTokenChanged(function(user) {
      // Keep track of UIDs each time this is called.
      uidsDetected.push(user && user.uid);
      if (uidsDetected.length == 2) {
        assertArrayEquals(['1234', '5678'], uidsDetected);
        asyncTestCase.signal();
      } else if (uidsDetected.length > 2) {
        fail('Unexpected token change!');
      }
    });
  });
}


function testAuth_temporaryPersistence_externalChange() {
  // Test when temporary persistence is set and an external change is detected
  // local persistence is set after synchronization.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        return goog.Promise.resolve(user3);
      });
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'signInAnonymously',
      function() {
        // Return tokens for third test user.
        return goog.Promise.resolve(expectedTokenResponse3);
      });
  var storageKey = 'firebase:authUser:' + config3['apiKey'] + ':' + appId1;
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, {'uid': '1234'});
  var user2 = new fireauth.AuthUser(
      config3, expectedTokenResponse2, {'uid': '5678'});
  var user3 = new fireauth.AuthUser(
      config3, expectedTokenResponse3, {'uid': '9012'});
  var storageEvent = new goog.testing.events.Event(
      goog.events.EventType.STORAGE, window);
  // Simulate existing user stored in session storage.
  mockSessionStorage.set(storageKey, user1.toPlainObject());
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  storageEvent.key = 'firebase:authUser:' + auth1.getStorageKey();
  storageEvent.oldValue = null;
  storageEvent.newValue = JSON.stringify(user2.toPlainObject());
  asyncTestCase.waitForSignals(1);
  var calls = 0;
  auth1.onIdTokenChanged(function(user) {
    calls++;
    if (calls == 1) {
      // On first call, the first user should be stored in session storage.
      assertUserEquals(user1, user);
      fireauth.common.testHelper.assertUserStorage(
          auth1.getStorageKey(), 'session', user1,
          fireauth.authStorage.Manager.getInstance()).then(function() {
        // Simulate external user signed in on another tab.
        mockLocalStorage.set(
            storageKey, user2.toPlainObject());
        mockLocalStorage.fireBrowserEvent(storageEvent);
      });
    } else if (calls == 2) {
      // On second call, the second user detected from external event should
      // be detected and stored in local storage.
      assertUserEquals(user2, user);
      fireauth.common.testHelper.assertUserStorage(
          auth1.getStorageKey(), 'local', user2,
          fireauth.authStorage.Manager.getInstance()).then(function() {
        // Sign in anonymously.
        auth1.signInAnonymously();
      });
    } else if (calls == 3) {
      // Third anonymous user detected and should be stored in local storage.
      assertUserEquals(user3, user);
      fireauth.common.testHelper.assertUserStorage(
          auth1.getStorageKey(), 'local', user3,
          fireauth.authStorage.Manager.getInstance()).then(function() {
        asyncTestCase.signal();
      });
    }
  });
}


function testAuth_storedPersistence_returnFromRedirect() {
  // getRedirectResult will resolve with the user stored with expected
  // persistence from the previous page.
  // Tests the return from a successful sign in with redirect.
  fireauth.AuthEventManager.ENABLED = true;
  var expectedCred = fireauth.GoogleAuthProvider.credential(
      null, 'ACCESS_TOKEN');
  // Expected sign in via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.Auth.prototype,
      'finishPopupAndRedirectSignIn',
      function(requestUri, sessionId, tenantId, postBody) {
        assertEquals('http://www.example.com/#response', requestUri);
        assertEquals('SESSION_ID', sessionId);
        assertNull(postBody);
        assertNull(tenantId);
        user1 = new fireauth.AuthUser(
            config3, expectedTokenResponse, accountInfo);
        expectedPopupResult = {
          'user': user1,
          'credential': expectedCred,
          'additionalUserInfo': expectedAdditionalUserInfo,
          'operationType': fireauth.constants.OperationType.SIGN_IN
        };
        // User 1 should be set here and saved to storage.
        auth1.setCurrentUser_(user1);
        return currentUserStorageManager.setCurrentUser(user1).then(function() {
          return expectedPopupResult;
        });
      });
  var user1, expectedPopupResult;
  asyncTestCase.waitForSignals(2);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  var currentUserStorageManager =
      new fireauth.storage.UserManager(config3['apiKey'] + ':' + appId1);
  // Simulate persistence set to session on previous page.
  currentUserStorageManager.setPersistence('session');
  currentUserStorageManager.savePersistenceForRedirect().then(function() {
    // Set pending redirect.
    pendingRedirectManager.setPendingStatus().then(function() {
      app1 = firebase.initializeApp(config3, appId1);
      auth1 = app1.auth();
      // Get redirect result should resolve with the expected user and
      // credential.
      auth1.getRedirectResult().then(function(result) {
        // Expected result returned.
        assertObjectEquals(expectedPopupResult, result);
        // User should be stored in session storage since
        // savePersistenceForRedirect was previously called with session
        // persistence.
        return fireauth.common.testHelper.assertUserStorage(
            auth1.getStorageKey(), 'session', user1,
            fireauth.authStorage.Manager.getInstance());
      }).then(function() {
        asyncTestCase.signal();
      });
      // Track all token changes. Confirm persistence changes do not trigger
      // unexpected calls.
      var uidsDetected = [];
      auth1.onIdTokenChanged(function(user) {
        // Keep track of UIDs detected on each call.
        uidsDetected.push(user && user.uid);
        if (uidsDetected.length == 1) {
          assertArrayEquals([user1.uid], uidsDetected);
          asyncTestCase.signal();
        } else if (uidsDetected.length > 1) {
          fail('Unexpected token change!');
        }
      });
    });
  });
}


function testAuth_changedPersistence_returnFromRedirect() {
  // If persistence is specified after initialization, getRedirectResult will
  // resolve with the user stored with expected persistence and not the saved
  // one.
  fireauth.AuthEventManager.ENABLED = true;
  // Expected sign in via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });
  // Simulate successful verifyAssertion.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
      function(data) {
        assertObjectEquals(
            {
              'requestUri': 'http://www.example.com/#response',
              'sessionId': 'SESSION_ID',
              'postBody': null,
              'tenantId': null
            },
            data);
        return goog.Promise.resolve(expectedTokenResponseWithIdPData);
      });
  // Simulate Auth user successfully initialized from
  // finishPopupAndRedirectSignIn.
  stubs.replace(
      fireauth.AuthUser,
      'initializeFromIdTokenResponse',
      function(options, idTokenResponse) {
        assertObjectEquals(config3, options);
        assertObjectEquals(expectedTokenResponseWithIdPData, idTokenResponse);
        return goog.Promise.resolve(user1);
      });
  var user1 = new fireauth.AuthUser(
      config3, expectedTokenResponse, accountInfo);
  var expectedPopupResult = {
    'user': user1,
    'credential': expectedGoogleCredential,
    'additionalUserInfo': expectedAdditionalUserInfo,
    'operationType': fireauth.constants.OperationType.SIGN_IN
  };
  asyncTestCase.waitForSignals(2);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  var currentUserStorageManager =
      new fireauth.storage.UserManager(config3['apiKey'] + ':' + appId1);
  // Simulate persistence set to session on previous page.
  currentUserStorageManager.setPersistence('session');
  currentUserStorageManager.savePersistenceForRedirect().then(function() {
    // Set pending redirect.
    pendingRedirectManager.setPendingStatus().then(function() {
      app1 = firebase.initializeApp(config3, appId1);
      auth1 = app1.auth();
      // Switch persistence to local.
      auth1.setPersistence('local');
      // Get redirect result should resolve with the expected user and
      // credential.
      auth1.getRedirectResult().then(function(result) {
        // Expected result returned.
        assertObjectEquals(expectedPopupResult, result);
        // Even though previous persistence set via savePersistenceForRedirect
        // was session, it will be overriddent by the local persistence
        // explicitly called after Auth instance is initialized.
        return fireauth.common.testHelper.assertUserStorage(
            auth1.getStorageKey(), 'local', user1,
            fireauth.authStorage.Manager.getInstance());
      }).then(function() {
        asyncTestCase.signal();
      });
      // Track all token changes. Confirm persistence changes are not triggered
      // unexpected calls.
      var uidsDetected = [];
      auth1.onIdTokenChanged(function(user) {
        // Keep track of all UIDs on each call.
        uidsDetected.push(user && user.uid);
        if (uidsDetected.length == 1) {
          assertArrayEquals([user1.uid], uidsDetected);
          asyncTestCase.signal();
        } else if (uidsDetected.length > 1) {
          fail('Unexpected token change!');
        }
      });
    });
  });
}


/**
 * Tests a multi-factor user signing in with a first factor credential and
 * then recovering with a second factor assertion.
 */
function testSignInWithCredential_multiFactor_success() {
  // Restore the mock reload method from setup.
  stubs.restore(
      fireauth.AuthUser.prototype,
      'reload');
  // Second factor requirement error returned from first factor sign-in.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var mockCredential = mockControl.createStrictMock(
      fireauth.AuthCredential);
  // Simulate first factor sign-in triggers second factor requirement.
  mockCredential.getIdTokenProvider(ignoreArgument)
      .$once()
      .$does(function(rpcHandler) {
        assertObjectEquals(auth1.getRpcHandler(), rpcHandler);
        return goog.Promise.reject(serverResponseError);
      });
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(auth1.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      });
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(multiFactorTokenResponse.idToken)
      .$once()
      .$returns(goog.Promise.resolve(multiFactorGetAccountInfoResponse));

  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();

  var authStateListener = mockControl.createFunctionMock('authStateListener');
  var idTokenListener = mockControl.createFunctionMock('idTokenListener');
  auth1.onAuthStateChanged(authStateListener);
  auth1.onIdTokenChanged(idTokenListener);
  // The listeners will first be triggered right after registration with null
  // user. The second time it will be triggered with the multi-factor user.
  authStateListener(null).$once();
  authStateListener(ignoreArgument).$once()
      .$does(function(user) {
        assertEquals(auth1.currentUser, user);
      });
  idTokenListener(null).$once();
  idTokenListener(ignoreArgument).$once()
      .$does(function(user) {
        assertEquals(auth1.currentUser, user);
      });
  mockControl.$replayAll();

  var unsubscribe = auth1.onAuthStateChanged(function(currentUser) {
    // Sign in after the first time the listener being triggered with null
    // user. Otherwise, since the listener is async, when the listener is
    // triggered, the sign-in is not guaranteed to be completed.
    auth1.signInAndRetrieveDataWithCredential(mockCredential)
        .then(fail, function(error) {
          // Error should be intercepted and repackaged.
          assertEquals('auth/multi-factor-auth-required', error['code']);
          assertEquals(auth1, error.resolver.auth);
          return error.resolver.resolveSignIn(mockAssertion);
        })
        .then(function(result) {
          // Expected result returned.
          fireauth.common.testHelper.assertUserCredentialResponse(
              // Expected current user returned.
              auth1.currentUser,
              // Expected credential returned.
              expectedGoogleCredential,
              // Expected additional user info.
              expectedAdditionalUserInfo,
              fireauth.constants.OperationType.SIGN_IN,
              result);
          // Enrolled factors updated.
          assertArrayEquals(
              [
                fireauth.MultiFactorInfo.fromServerResponse(
                    multiFactorGetAccountInfoResponse['users'][0].mfaInfo[0]),
                fireauth.MultiFactorInfo.fromServerResponse(
                    multiFactorGetAccountInfoResponse['users'][0].mfaInfo[1])
              ],
              auth1.currentUser.multiFactor.enrolledFactors);
          assertEquals('defaultUserId', auth1.currentUser['uid']);
          asyncTestCase.signal();
        });
    unsubscribe();
  });
}


/**
 * Tests a multi-factor user signing in with a first factor credential and
 * then failing to recover with a second factor assertion.
 */
function testSignInWithCredential_multiFactor_assertionError() {
  // Restore the mock reload method from setup.
  stubs.restore(
      fireauth.AuthUser.prototype,
      'reload');
  // Expected assertion processing error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.CODE_EXPIRED);
  // Second factor requirement error returned from first factor sign-in.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var mockCredential = mockControl.createStrictMock(
      fireauth.AuthCredential);
  // Simulate first factor sign-in triggers second factor requirement.
  mockCredential.getIdTokenProvider(ignoreArgument)
      .$once()
      .$does(function(rpcHandler) {
        assertObjectEquals(auth1.getRpcHandler(), rpcHandler);
        return goog.Promise.reject(serverResponseError);
      });
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(auth1.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.reject(expectedError);
      });
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(ignoreArgument)
      .$times(0);

  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();

  var authStateListener = mockControl.createFunctionMock('authStateListener');
  var idTokenListener = mockControl.createFunctionMock('idTokenListener');
  auth1.onIdTokenChanged(idTokenListener);
  auth1.onAuthStateChanged(authStateListener);
  authStateListener(null).$once();
  idTokenListener(null).$once();
  mockControl.$replayAll();

  // Give enough time for listeners above to trigger before test ends.
  var unsubscribe = auth1.onAuthStateChanged(function(currentUser) {
    auth1.signInWithCredential(mockCredential).then(fail, function(error) {
      // Error should be intercepted and repackaged.
      assertEquals('auth/multi-factor-auth-required', error['code']);
      assertEquals(auth1, error.resolver.auth);
      return error.resolver.resolveSignIn(mockAssertion);
    })
    .then(fail, function(error) {
     // Assertion error should be caught.
      fireauth.common.testHelper.assertErrorEquals(
          expectedError,
          error);
      asyncTestCase.signal();
    });
    unsubscribe();
  });
}


/**
 * Tests a multi-factor user signing in with a popup and then recovering
 * with a second factor assertion.
 */
function testAuth_signInWithPopup_multiFactor_success() {
  // Restore the mock reload method from setup.
  stubs.restore(
      fireauth.AuthUser.prototype,
      'reload');
  fireauth.AuthEventManager.ENABLED = true;
  // The expected popup window object.
  var expectedPopup = {
    'close': function() {}
  };
  var recordedHandler = null;
  // The expected popup event ID.
  var expectedEventId = '1234';
  // Expected sign in via popup successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      expectedEventId,
      'http://www.example.com/#response',
      'SESSION_ID');
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
  // Generate expected event ID for popup.
  stubs.replace(
      fireauth.util,
      'generateEventId',
      function() {
        return expectedEventId;
      });
  // Stub instantiateOAuthSignInHandler and save event dispatcher.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            recordedHandler = handler;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; },
          'processPopup': function(
              actualPopupWin,
              actualMode,
              actualProvider,
              actualOnInit,
              actualOnError,
              actualEventId,
              actualAlreadyRedirected) {
            assertEquals(expectedPopup, actualPopupWin);
            assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, actualMode);
            assertEquals(provider, actualProvider);
            assertEquals(expectedEventId, actualEventId);
            assertFalse(actualAlreadyRedirected);
            actualOnInit();
            return goog.Promise.resolve();
          },
          'startPopupTimeout': function(popupWin, onError, delay) {
            recordedHandler(expectedAuthEvent);
            return goog.Promise.resolve();
          }
        };
      });

  // Second factor requirement error returned from first factor sign-in.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var verifyAssertion = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'verifyAssertion');
  // Simulate first factor sign-in triggers second factor requirement.
  verifyAssertion({
    'requestUri': 'http://www.example.com/#response',
    'sessionId': 'SESSION_ID',
    'postBody': null,
    'tenantId': null
  }).$does(function(request) {
    return goog.Promise.reject(serverResponseError);
  });
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(auth1.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      });
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(multiFactorTokenResponse.idToken)
      .$once()
      .$returns(goog.Promise.resolve(multiFactorGetAccountInfoResponse));

  asyncTestCase.waitForSignals(1);
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();
  var provider = new fireauth.GoogleAuthProvider();

  var authStateListener = mockControl.createFunctionMock('authStateListener');
  var idTokenListener = mockControl.createFunctionMock('idTokenListener');
  auth1.onAuthStateChanged(authStateListener);
  auth1.onIdTokenChanged(idTokenListener);
  // The listeners will first be triggered right after registration with null
  // user. The second time it will be triggered with the multi-factor user.
  authStateListener(null).$once();
  authStateListener(ignoreArgument).$once()
      .$does(function(user) {
        assertEquals(auth1.currentUser, user);
      });
  idTokenListener(null).$once();
  idTokenListener(ignoreArgument).$once()
      .$does(function(user) {
        assertEquals(auth1.currentUser, user);
      });
  mockControl.$replayAll();

  var unsubscribe = auth1.onIdTokenChanged(function(currentUser) {
    // Sign in after the first time the listener being triggered with null
    // user. Otherwise, since the listener is async, when the listener is
    // triggered, the sign-in is not guaranteed to be completed.
    // Sign in with popup should reject with MFA_REQUIRED error.
    auth1.signInWithPopup(provider).then(fail, function(error) {
      // Error should be intercepted and repackaged.
      assertEquals('auth/multi-factor-auth-required', error['code']);
      assertEquals(auth1, error.resolver.auth);
      return error.resolver.resolveSignIn(mockAssertion);
    }).then(function(popupResult) {
      // Expected result returned.
      fireauth.common.testHelper.assertUserCredentialResponse(
          // Expected current user returned.
          auth1.currentUser,
          // Expected credential returned.
          expectedGoogleCredential,
          // Expected additional user info.
          expectedAdditionalUserInfo,
          fireauth.constants.OperationType.SIGN_IN,
          popupResult);
      // Enrolled factors updated.
      assertArrayEquals(
          [
            fireauth.MultiFactorInfo.fromServerResponse(
                multiFactorGetAccountInfoResponse['users'][0].mfaInfo[0]),
            fireauth.MultiFactorInfo.fromServerResponse(
                multiFactorGetAccountInfoResponse['users'][0].mfaInfo[1])
          ],
          auth1.currentUser.multiFactor.enrolledFactors);
      assertEquals('defaultUserId', auth1.currentUser['uid']);
      asyncTestCase.signal();
    });
    unsubscribe();
  });
}


/**
 * Tests a multi-factor user returning from sign-in with a redirect and then
 * recovering with a second factor assertion.
 */
function testAuth_returnFromSignInWithRedirect_multiFactor_success() {
  // Restore the mock reload method from setup.
  stubs.restore(
      fireauth.AuthUser.prototype,
      'reload');
  fireauth.AuthEventManager.ENABLED = true;
  // Expected sign in via redirect successful Auth event.
  var expectedAuthEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      null,
      'http://www.example.com/#response',
      'SESSION_ID');
  // Stub instantiateOAuthSignInHandler.
  stubs.replace(
      fireauth.AuthEventManager, 'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName) {
        return {
          'addAuthEventListener': function(handler) {
            // auth1 should be subscribed.
            var manager = fireauth.AuthEventManager.getManager(
                config3['authDomain'], config3['apiKey'], app1.name);
            assertTrue(manager.isSubscribed(auth1));
            // In this case run immediately with expected redirect event.
            handler(expectedAuthEvent);
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() { return false; },
          'hasVolatileStorage': function() { return false; }
        };
      });

  // Second factor requirement error returned from first factor sign-in.
  var serverResponseError = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      null,
      multiFactorErrorServerResponse);
  var verifyAssertion = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'verifyAssertion');
  // Simulate first factor sign-in triggers second factor requirement.
  verifyAssertion({
    'requestUri': 'http://www.example.com/#response',
    'sessionId': 'SESSION_ID',
    'postBody': null,
    'tenantId': null
  }).$does(function(request) {
    return goog.Promise.reject(serverResponseError);
  });
  var mockAssertion = mockControl.createStrictMock(
      fireauth.MultiFactorAssertion);
  var expectedSession = new fireauth.MultiFactorSession(
      null,
      multiFactorErrorServerResponse.mfaPendingCredential);
  // Second factor assertion processing succeeds with updated tokens.
  mockAssertion.process(ignoreArgument, ignoreArgument)
      .$once()
      .$does(function(rpcHandler, session) {
        assertObjectEquals(auth1.getRpcHandler(),rpcHandler);
        assertObjectEquals(expectedSession, session);
        return goog.Promise.resolve(multiFactorTokenResponse);
      });
  var getAccountInfoByIdToken = mockControl.createMethodMock(
      fireauth.RpcHandler.prototype, 'getAccountInfoByIdToken');
  getAccountInfoByIdToken(multiFactorTokenResponse.idToken)
      .$once()
      .$returns(goog.Promise.resolve(multiFactorGetAccountInfoResponse));

  asyncTestCase.waitForSignals(1);
  var pendingRedirectManager = new fireauth.storage.PendingRedirectManager(
      config3['apiKey'] + ':' + appId1);
  pendingRedirectManager.setPendingStatus();
  app1 = firebase.initializeApp(config3, appId1);
  auth1 = app1.auth();

  var authStateListener = mockControl.createFunctionMock('authStateListener');
  var idTokenListener = mockControl.createFunctionMock('idTokenListener');
  auth1.onAuthStateChanged(authStateListener);
  auth1.onIdTokenChanged(idTokenListener);
  // The listeners will first be triggered right after registration with null
  // user. The second time it will be triggered with the multi-factor user.
  authStateListener(null).$once();
  authStateListener(ignoreArgument).$once()
      .$does(function(user) {
        assertEquals(auth1.currentUser, user);
      });
  idTokenListener(null).$once();
  idTokenListener(ignoreArgument).$once()
      .$does(function(user) {
        assertEquals(auth1.currentUser, user);
      });
  mockControl.$replayAll();

  var mfaError;
  var unsubscribe = auth1.onIdTokenChanged(function(currentUser) {
    // Finish signing in with the second factor after the first time the
    // listener is triggered with a null user. Otherwise, since the listener is
    // async, it could be triggered only once with the signed in second factor
    // user.
    auth1.getRedirectResult().then(fail, function(error) {
      // Error should be intercepted and repackaged.
      assertEquals('auth/multi-factor-auth-required', error['code']);
      assertEquals(auth1, error.resolver.auth);
      mfaError = error;
      // Error in redirect result should be cleared after being returned once.
      return auth1.getRedirectResult();
    }).then(function(result) {
      fireauth.common.testHelper.assertUserCredentialResponse(
          null, null, null, undefined, result);
      return mfaError.resolver.resolveSignIn(mockAssertion);
    }).then(function(result) {
      // Expected result returned.
      fireauth.common.testHelper.assertUserCredentialResponse(
          // Expected current user returned.
          auth1.currentUser,
          // Expected credential returned.
          expectedGoogleCredential,
          // Expected additional user info.
          expectedAdditionalUserInfo,
          fireauth.constants.OperationType.SIGN_IN,
          result);
      // Enrolled factors updated.
      assertArrayEquals(
          [
            fireauth.MultiFactorInfo.fromServerResponse(
                multiFactorGetAccountInfoResponse['users'][0].mfaInfo[0]),
            fireauth.MultiFactorInfo.fromServerResponse(
                multiFactorGetAccountInfoResponse['users'][0].mfaInfo[1])
          ],
          auth1.currentUser.multiFactor.enrolledFactors);
      assertEquals('defaultUserId', auth1.currentUser['uid']);
      asyncTestCase.signal();
    });
    unsubscribe();
  });
}
