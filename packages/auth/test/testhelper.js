/**
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
 * @fileoverview Helper functions for testing Firebase Auth common
 * functionalities.
 */

goog.provide('fireauth.common.testHelper');

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
    // Confirm property is readonly.
    response['credential'] = 'should not modify property';
    assertObjectEquals(expectedCred, response['credential']);
  }
  if (!expectedAdditionalData) {
    assertTrue(
        response['additionalUserInfo'] === null ||
        response['additionalUserInfo'] === undefined);
  } else {
    // Confirm property is readonly.
    response['additionalUserInfo'] = 'should not modify property';
    assertObjectEquals(expectedAdditionalData, response['additionalUserInfo']);
  }
  if (!expectedOperationType) {
    assertTrue(
        response['operationType'] === null ||
        response['operationType'] === undefined);
  } else {
    // Confirm property is readonly.
    response['operationType'] = 'should not modify property';
    assertEquals(expectedOperationType, response['operationType']);
  }
  if (!expectedUser) {
    assertNull(response['user']);
  } else {
    // Confirm property is readonly.
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
    // Confirm property is readonly.
    response['credential'] = 'should not modify property';
    assertObjectEquals(expectedCred, response['credential']);
  }
  if (!expectedUser) {
    assertNull(response['user']);
  } else {
    // Confirm property is readonly.
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
 * @param {?fireauth.authStorage.Manager=} opt_manager The underlying storage
 *     manager to use. If none is provided, the default global instance is used.
 * @return {!goog.Promise} A promise that resolves when the check completes.
 */
fireauth.common.testHelper.assertUserStorage =
    function(appId, persistence, expectedUser, opt_manager) {
  // Get storage manager.
  var storage = opt_manager || fireauth.authStorage.Manager.getInstance();
  var promises = [];
  // All supported persistence types.
  var types = ['local', 'session', 'none'];
  // For each persistence type.
  for (var i = 0; i < types.length; i++) {
    // Get the current user if stored in current persistence.
    var p = storage.get({name: 'authUser', persistent: types[i]}, appId);
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
