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

goog.provide('fireauth.storage.LocalStorageTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.storage.LocalStorage');
goog.require('fireauth.storage.Storage');
/** @suppress {extraRequire} */
goog.require('fireauth.storage.testHelper');
goog.require('fireauth.util');
goog.require('goog.events.EventType');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.events');
goog.require('goog.testing.events.Event');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.storage.LocalStorageTest');


var stubs = new goog.testing.PropertyReplacer();
var storage;


function setUp() {
  storage = new fireauth.storage.LocalStorage();
}


function tearDown() {
  storage = null;
  stubs.reset();
  localStorage.clear();
}


/** Simulates a Node.js environment. */
function simulateNodeEnvironment() {
  // Node.js environment.
  stubs.replace(
      fireauth.util,
      'getEnvironment',
      function() {return fireauth.util.Env.NODE;});
  // No window.localStorage.
  stubs.replace(
      fireauth.storage.LocalStorage,
      'getGlobalStorage',
      function() {return null;});
}


function testBasicStorageOperations() {
  assertEquals(fireauth.storage.Storage.Type.LOCAL_STORAGE, storage.type);
  return assertBasicStorageOperations(storage);
}


function testDifferentTypes() {
  return assertDifferentTypes(storage);
}


function testListeners() {
  var storageEvent;

  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();

  storage.addStorageListener(listener1);
  storage.addStorageListener(listener3);

  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'myKey';
  goog.testing.events.fireBrowserEvent(storageEvent);

  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(0, listener2.getCallCount());

  storage.removeStorageListener(listener3);

  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'myKey2';
  goog.testing.events.fireBrowserEvent(storageEvent);

  assertEquals(2, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(0, listener2.getCallCount());
}


function testNotAvailable() {
  stubs.replace(
      fireauth.storage.LocalStorage, 'isAvailable',
      function() { return false; });
  var error = assertThrows(function() { new fireauth.storage.LocalStorage(); });
  assertErrorEquals(
      new fireauth.AuthError(fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED),
      error);
}


function testBasicStorageOperations_node() {
  simulateNodeEnvironment();
  storage = new fireauth.storage.LocalStorage();
  return assertBasicStorageOperations(storage);
}


function testDifferentTypes_node() {
  simulateNodeEnvironment();
  storage = new fireauth.storage.LocalStorage();
  return assertDifferentTypes(storage);
}


function testNotAvailable_node() {
  // Compatibility libraries not included.
  stubs.replace(firebase.INTERNAL, 'node', {});
  // Simulate Node.js environment.
  simulateNodeEnvironment();
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'The LocalStorage compatibility library was not found.');
  var error = assertThrows(function() { new fireauth.storage.LocalStorage(); });
  assertErrorEquals(
      expectedError,
      error);
}
