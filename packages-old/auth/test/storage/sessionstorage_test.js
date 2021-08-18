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

goog.provide('fireauth.storage.SessionStorageTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.storage.SessionStorage');
goog.require('fireauth.storage.Storage');
/** @suppress {extraRequire} */
goog.require('fireauth.storage.testHelper');
goog.require('fireauth.util');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.storage.SessionStorageTest');


var stubs = new goog.testing.PropertyReplacer();
var storage;


function setUp() {
  storage = new fireauth.storage.SessionStorage();
}


function tearDown() {
  storage = null;
  stubs.reset();
  sessionStorage.clear();
}


/** Simulates a Node.js environment. */
function simulateNodeEnvironment() {
  // Node.js environment.
  stubs.replace(
      fireauth.util,
      'getEnvironment',
      function() {return fireauth.util.Env.NODE;});
  // No window.sessionStorage.
  stubs.replace(
      fireauth.storage.SessionStorage,
      'getGlobalStorage',
      function() {return null;});
}


function testBasicStorageOperations() {
  assertEquals(fireauth.storage.Storage.Type.SESSION_STORAGE, storage.type);
  return assertBasicStorageOperations(storage);
}


function testDifferentTypes() {
  return assertDifferentTypes(storage);
}


function testNotAvailable() {
  stubs.replace(
      fireauth.storage.SessionStorage, 'isAvailable',
      function() { return false; });
  var error = assertThrows(function() {
    new fireauth.storage.SessionStorage();
  });
  assertErrorEquals(
      new fireauth.AuthError(fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED),
      error);
}


function testBasicStorageOperations_node() {
  simulateNodeEnvironment();
  storage = new fireauth.storage.SessionStorage();
  return assertBasicStorageOperations(storage);
}


function testDifferentTypes_node() {
  simulateNodeEnvironment();
  storage = new fireauth.storage.SessionStorage();
  return assertDifferentTypes(storage);
}


function testNotAvailable_node() {
  // Compatibility libraries not included.
  stubs.replace(firebase.INTERNAL, 'node', {});
  // Simulate Node.js environment.
  simulateNodeEnvironment();
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'The SessionStorage compatibility library was not found.');
  var error = assertThrows(function() {
    new fireauth.storage.SessionStorage();
  });
  assertErrorEquals(
      expectedError,
      error);
}
