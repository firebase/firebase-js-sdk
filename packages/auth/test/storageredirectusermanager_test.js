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
 * @fileoverview Tests for storageredirectusermanager.js
 */

goog.provide('fireauth.storage.RedirectUserManagerTest');

goog.require('fireauth.AuthUser');
goog.require('fireauth.authStorage');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.RedirectUserManager');
goog.require('goog.Promise');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.storage.RedirectUserManagerTest');


var config = {
  apiKey: 'apiKey1'
};
var appId = 'appId1';
var clock;
var expectedUser;
var expectedUserWithAuthDomain;
var stubs = new goog.testing.PropertyReplacer();
var mockLocalStorage;
var mockSessionStorage;
var now = new Date();


function setUp() {
  // Create new mock storages for persistent and temporary storage before each
  // test.
  mockLocalStorage = new fireauth.storage.MockStorage();
  mockSessionStorage = new fireauth.storage.MockStorage();
  clock = new goog.testing.MockClock(true);
  window.localStorage.clear();
  window.sessionStorage.clear();
  fireauth.common.testHelper.installMockStorages(
      stubs, mockLocalStorage, mockSessionStorage);
}


function tearDown() {
  if (expectedUser) {
    expectedUser.destroy();
  }
  if (expectedUserWithAuthDomain) {
    expectedUserWithAuthDomain.destroy();
  }
  goog.dispose(clock);
}


/**
 * @return {!fireauth.authStorage.Manager} The default local storage
 *     synchronized manager instance used for testing.
 */
function getDefaultStorageManagerInstance() {
  return new fireauth.authStorage.Manager('firebase', ':', false, true);
}


function testGetSetRemoveRedirectUser() {
  // Avoid triggering getProjectConfig RPC.
  fireauth.AuthEventManager.ENABLED = false;
  var storageManager = getDefaultStorageManagerInstance();
  var redirectUserManager =
      new fireauth.storage.RedirectUserManager(appId, storageManager);
  var config = {
    'apiKey': 'API_KEY',
    'appName': 'appId1'
  };
  var configWithAuthDomain = {
    'apiKey': 'API_KEY',
    'appName': 'appId1',
    'authDomain': 'project.firebaseapp.com'
  };
  var accountInfo = {
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
  var tokenResponse = {
    'idToken': fireauth.common.testHelper.createMockJwt(),
    'refreshToken': 'refreshToken'
  };
  expectedUser = new fireauth.AuthUser(config, tokenResponse, accountInfo);
  // Expected user with authDomain.
  expectedUserWithAuthDomain =
      new fireauth.AuthUser(configWithAuthDomain, tokenResponse, accountInfo);
  var storageKey = 'firebase:redirectUser:appId1';
  return goog.Promise.resolve()
      .then(function() {
        return redirectUserManager.setRedirectUser(expectedUser);
      })
      .then(function() {
        return redirectUserManager.getRedirectUser();
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(expectedUser, user);
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertObjectEquals(expectedUser.toPlainObject(), value);
        // Get user with authDomain.
        return redirectUserManager.getRedirectUser('project.firebaseapp.com');
      })
      .then(function(user) {
        fireauth.common.testHelper.assertUserEquals(
            expectedUserWithAuthDomain, user);
        return redirectUserManager.removeRedirectUser();
      })
      .then(function() {
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return redirectUserManager.getRedirectUser();
      })
      .then(function(user) {
        assertNull(user);
      });
}
