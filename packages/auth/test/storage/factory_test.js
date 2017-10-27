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

goog.provide('fireauth.storage.FactoryTest');

goog.require('fireauth.storage.AsyncStorage');
goog.require('fireauth.storage.Factory');
goog.require('fireauth.storage.Factory.EnvConfig');
goog.require('fireauth.storage.InMemoryStorage');
goog.require('fireauth.storage.LocalStorage');
goog.require('fireauth.storage.NullStorage');
goog.require('fireauth.storage.SessionStorage');
/** @suppress {extraRequire} */
goog.require('fireauth.storage.testHelper');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.storage.FactoryTest');


var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  // Simulate browser that synchronizes between and iframe and a popup.
  stubs.replace(
     fireauth.util,
      'isLocalStorageNotSynchronized',
      function() {
        return false;
      });
}


function tearDown() {
  stubs.reset();
}


function testGetStorage_browser_temporary() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.BROWSER);
  assertTrue(factory.makeTemporaryStorage() instanceof
      fireauth.storage.SessionStorage);
}


function testGetStorage_browser_persistent() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.BROWSER);
  assertTrue(factory.makePersistentStorage() instanceof
      fireauth.storage.LocalStorage);
}


function testGetStorage_browser_persistent_isLocalStorageNotSynchronized() {
  // Simulate browser to force usage of indexedDB storage.
  var mock = {
    type: 'indexedDB'
  };
  stubs.replace(
     fireauth.util,
      'isLocalStorageNotSynchronized',
      function() {
        return true;
      });
  stubs.replace(
      fireauth.storage.IndexedDB,
      'getFireauthManager',
      function() {
        return mock;
      });
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.BROWSER);
  assertEquals('indexedDB', factory.makePersistentStorage().type);
}


function testGetStorage_node_temporary() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.NODE);
  assertTrue(factory.makeTemporaryStorage() instanceof
      fireauth.storage.SessionStorage);
}


function testGetStorage_node_persistent() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.NODE);
  assertTrue(factory.makePersistentStorage() instanceof
      fireauth.storage.LocalStorage);
}


function testGetStorage_reactnative_temporary() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.REACT_NATIVE);
  assertTrue(factory.makeTemporaryStorage() instanceof
      fireauth.storage.NullStorage);
}


function testGetStorage_reactnative_persistent() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.REACT_NATIVE);
  assertTrue(factory.makePersistentStorage() instanceof
      fireauth.storage.AsyncStorage);
}


function testGetStorage_inMemory() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.BROWSER);
  assertTrue(factory.makeInMemoryStorage() instanceof
      fireauth.storage.InMemoryStorage);
}
