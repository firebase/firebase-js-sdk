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
 * @fileoverview Helper functions for testing Firebase Auth common
 * functionalities.
 */

goog.provide('fireauth.common.testHelper');

goog.require('fireauth.storage.Factory');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.crypt.base64');
goog.require('goog.object');

goog.setTestOnly('fireauth.common.testHelper');


/**
 * Asserts that two errors are equivalent. Plain assertObjectEquals cannot be
 * used as Internet Explorer adds the stack trace as a property of the object.
 * @param {!fireauth.AuthError} expected
 * @param {!fireauth.AuthError} actual
 */
fireauth.common.testHelper.assertErrorEquals = function(expected, actual) {
  assertObjectEquals(expected.toPlainObject(), actual.toPlainObject());
};


/**
 * Asserts that two users are equivalent.
 * @param {!fireauth.AuthUser} expected The expected user.
 * @param {!fireauth.AuthUser} actual The actual user.
 */
fireauth.common.testHelper.assertUserEquals = function(expected, actual) {
  assertObjectEquals(expected.toPlainObject(), actual.toPlainObject());
};


/**
 * Asserts that a user credential response matches the expected values.
 * @param {?fireauth.AuthUser} expectedUser The user to expect.
 * @param {?fireauth.AuthCredential} expectedCred The credential to expect.
 * @param {?fireauth.AdditionalUserInfo} expectedAdditionalData The additional
 *     user info to expect.
 * @param {?string|undefined} expectedOperationType The operation type to
 *     expect.
 * @param {!fireauth.AuthEventManager.Result} response The actual response.
 */
fireauth.common.testHelper.assertUserCredentialResponse = function(expectedUser,
    expectedCred, expectedAdditionalData, expectedOperationType, response) {
  if (!expectedCred) {
    assertTrue(
        response['credential'] === null ||
        response['credential'] === undefined);
  } else {
    // Confirm property is read-only.
    response['credential'] = 'should not modify property';
    assertObjectEquals(expectedCred, response['credential']);
  }
  if (!expectedAdditionalData) {
    assertTrue(
        response['additionalUserInfo'] === null ||
        response['additionalUserInfo'] === undefined);
  } else {
    // Confirm property is read-only.
    response['additionalUserInfo'] = 'should not modify property';
    assertObjectEquals(expectedAdditionalData, response['additionalUserInfo']);
  }
  if (!expectedOperationType) {
    assertTrue(
        response['operationType'] === null ||
        response['operationType'] === undefined);
  } else {
    // Confirm property is read-only.
    response['operationType'] = 'should not modify property';
    assertEquals(expectedOperationType, response['operationType']);
  }
  if (!expectedUser) {
    assertNull(response['user']);
  } else {
    // Confirm property is read-only.
    response['user'] = 'should not modify property';
    assertEquals(expectedUser, response['user']);
  }
};


/**
 * Asserts that a popup and redirect response matches the expected values.
 * @param {?fireauth.User} expectedUser The user to expect.
 * @param {?fireauth.AuthCredential} expectedCred The credential to expect.
 * @param {!fireauth.Auth.PopupAndRedirectResult} response The actual response.
 */
fireauth.common.testHelper.assertDeprecatedUserCredentialResponse = function(
    expectedUser, expectedCred, response) {
  if (!expectedCred) {
    assertTrue(
        response['credential'] === null ||
        response['credential'] === undefined);
  } else {
    // Confirm property is read-only.
    response['credential'] = 'should not modify property';
    assertObjectEquals(expectedCred, response['credential']);
  }
  if (!expectedUser) {
    assertNull(response['user']);
  } else {
    // Confirm property is read-only.
    response['user'] = 'should not modify property';
    assertEquals(expectedUser, response['user']);
  }
  assertUndefined(response['operationType']);
  assertUndefined(response['additionalUserInfo']);
};


/**
 * Asserts that the specified user is stored in the specified persistence and
 * no where else.
 * @param {string} appId The app ID used for the storage key.
 * @param {?fireauth.authStorage.Persistence} persistence The persistence to
 *     check for existence. If null is passed, the check will ensure no user is
 *     saved in storage.
 * @param {?fireauth.AuthUser} expectedUser The expected Auth user to test for.
 * @param {?fireauth.authStorage.Manager} manager The underlying storage
 *     manager to use. If none is provided, the default global instance is used.
 * @return {!goog.Promise} A promise that resolves when the check completes.
 */
fireauth.common.testHelper.assertUserStorage =
    function(appId, persistence, expectedUser, manager) {
  var promises = [];
  // All supported persistence types.
  var types = ['local', 'session', 'none'];
  // For each persistence type.
  for (var i = 0; i < types.length; i++) {
    // Get the current user if stored in current persistence.
    var p = manager.get({name: 'authUser', persistent: types[i]}, appId);
    if (persistence === types[i]) {
      // If matching specified persistence, ensure value matches the specified
      // user.
      promises.push(p.then(function(user) {
        assertObjectEquals(
            expectedUser && expectedUser.toPlainObject(),
            user);
      }));
    } else {
      // All other persistence types, should not have any value stored.
      promises.push(p.then(function(user) {
        assertUndefined(user);
      }));
    }
  }
  // Wait for all checks to complete before resolving.
  return goog.Promise.all(promises);
};


/**
 * @param {!fireauth.IdTokenResult} idTokenResult The ID token result to assert.
 * @param {?string} token The expected token string.
 * @param {?number} expirationTime The expected expiration time in seconds.
 * @param {?number} authTime The expected auth time in seconds.
 * @param {?number} issuedAtTime The expected issued time in seconds.
 * @param {?string} signInProvider The expected sign-in provider.
 * @param {?string} signInSecondFactor The expected sign-in second factor.
 * @param {!Object} claims The expected payload claims .
 */
fireauth.common.testHelper.assertIdTokenResult = function (
    idTokenResult,
    token,
    expirationTime,
    authTime,
    issuedAtTime,
    signInProvider,
    signInSecondFactor,
    claims) {
  assertEquals(token, idTokenResult['token']);
  assertEquals(fireauth.util.utcTimestampToDateString(expirationTime * 1000),
      idTokenResult['expirationTime']);
  assertEquals(fireauth.util.utcTimestampToDateString(authTime * 1000),
      idTokenResult['authTime']);
  assertEquals(fireauth.util.utcTimestampToDateString(issuedAtTime * 1000),
      idTokenResult['issuedAtTime']);
  assertEquals(signInProvider, idTokenResult['signInProvider']);
  assertEquals(signInSecondFactor, idTokenResult['signInSecondFactor']);
  assertObjectEquals(claims, idTokenResult['claims']);
};


/**
 * Asserts that two users with differnt API keys are equivalent. Plain
 * assertObjectEquals may not work as the expiration time may sometimes be off
 * by a second. This takes that into account. The different App names and API
 * keys will be ignored.
 * @param {!fireauth.AuthUser} expected
 * @param {!fireauth.AuthUser} actual
 * @param {string=} opt_expectedApikey
 * @param {string=} opt_actualApikey
 */
fireauth.common.testHelper.assertUserEqualsInWithDiffApikey = function(
    expected, actual, opt_expectedApikey, opt_actualApikey) {
  var expectedObj = expected.toPlainObject();
  var actualObj = actual.toPlainObject();
  if (opt_expectedApikey && opt_actualApikey) {
    assertEquals(opt_expectedApikey, expectedObj['apiKey']);
    assertEquals(opt_actualApikey, actualObj['apiKey']);
    // Overwrite ApiKeys.
    expectedObj['apiKey'] = '';
    actualObj['apiKey'] = '';
    expectedObj['stsTokenManager']['apiKey'] = '';
    actualObj['stsTokenManager']['apiKey'] = '';
  }
  expectedObj['appName'] = '';
  actualObj['appName'] = '';
  assertObjectEquals(expectedObj, actualObj);
};


/**
 * Installs different persistent/temporary storage using the provided mocks.
 * @param {!goog.testing.PropertyReplacer} stub The property replacer.
 * @param {!fireauth.storage.Storage} mockLocalStorage The mock storage
 *     instance for persistent storage.
 * @param {!fireauth.storage.Storage} mockSessionStorage The mock storage
 *     instance for temporary storage.
 */
fireauth.common.testHelper.installMockStorages =
    function(stub, mockLocalStorage, mockSessionStorage) {
  stub.replace(
      fireauth.storage.Factory.prototype,
      'makePersistentStorage',
      function() {
        return mockLocalStorage;
      });
  stub.replace(
      fireauth.storage.Factory.prototype,
      'makeTemporaryStorage',
      function() {
        return mockSessionStorage;
      });
};


/**
 * Creates a mock Firebase ID token JWT with the provided optional payload and
 * optional expiration time.
 * @param {?Object=} opt_payload The optional payload used to override default
 *     hardcoded values.
 * @param {number=} opt_expirationTime The optional expiration time in
 *     milliseconds.
 * @return {string} The mock JWT.
 */
fireauth.common.testHelper.createMockJwt =
    function(payload, expirationTime) {
  // JWT time units should not have decimals but to make testing easier,
  // we will allow it.
  const now = Date.now() / 1000;
  const basePayload = {
    'iss': 'https://securetoken.google.com/projectId',
    'aud': 'projectId',
    'sub': '12345678',
    'auth_time': now,
    'iat': now,
    'exp': typeof expirationTime === 'undefined' ?
        now + 3600 : expirationTime / 1000
  };
  // Extend base payload.
  Object.assign(basePayload, payload || {});
  const encodedPayload =
      goog.crypt.base64.encodeString(JSON.stringify(basePayload),
          goog.crypt.base64.Alphabet.WEBSAFE);
  // Remove any trailing or leading dots from the payload component.
  return 'HEAD.' + encodedPayload.replace(/^\.+|\.+$/g, '') + '.SIGNATURE';
};
