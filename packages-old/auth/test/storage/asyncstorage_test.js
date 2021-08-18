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

goog.provide('fireauth.storage.AsyncStorageTest');

goog.require('fireauth.storage.AsyncStorage');
goog.require('fireauth.storage.Storage');
/** @suppress {extraRequire} */
goog.require('fireauth.storage.testHelper');
goog.require('fireauth.storage.testHelper.FakeAsyncStorage');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.storage.AsyncStorageTest');


var stubs = new goog.testing.PropertyReplacer();
var storage;


function setUp() {
  storage = new fireauth.storage.AsyncStorage(
      new fireauth.storage.testHelper.FakeAsyncStorage());
}


function tearDown() {
  storage = null;
  stubs.reset();
}


function testBasicStorageOperations() {
  assertEquals(fireauth.storage.Storage.Type.ASYNC_STORAGE, storage.type);
  return assertBasicStorageOperations(storage);
}


function testDifferentTypes() {
  return assertDifferentTypes(storage);
}


function testNotAvailable() {
  stubs.replace(firebase.INTERNAL, 'reactNative', {});
  var error = assertThrows(function() { new fireauth.storage.AsyncStorage(); });
  assertEquals('auth/internal-error', error.code);
}
