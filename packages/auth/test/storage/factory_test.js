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
goog.require('fireauth.storage.HybridIndexedDB');
goog.require('fireauth.storage.InMemoryStorage');
goog.require('fireauth.storage.IndexedDB');
goog.require('fireauth.storage.LocalStorage');
goog.require('fireauth.storage.NullStorage');
goog.require('fireauth.storage.SessionStorage');
goog.require('fireauth.storage.Storage');
/** @suppress {extraRequire} */
goog.require('fireauth.storage.testHelper');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.storage.FactoryTest');


var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  // Simulate storage not persisted with indexedDB.
  stubs.replace(
     fireauth.util,
      'persistsStorageWithIndexedDB',
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


function testGetStorage_browser_persistent_localStorage() {
  stubs.replace(
     fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {
        return false;
      });
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.BROWSER);
  assertTrue(factory.makePersistentStorage() instanceof
      fireauth.storage.LocalStorage);
}


function testGetStorage_browser_persistent_indexedDB() {
  // Simulate browser to force usage of indexedDB storage.
  var mock = {
    type: 'indexedDB'
  };
  // Record calls to HybridIndexedDB.
  stubs.replace(
      fireauth.storage,
      'HybridIndexedDB',
      goog.testing.recordFunction(fireauth.storage.HybridIndexedDB));
  stubs.replace(
     fireauth.util,
      'persistsStorageWithIndexedDB',
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
  assertEquals(1, fireauth.storage.HybridIndexedDB.getCallCount());
  // Confirm localStorage used as fallback when indexedDB is not supported.
  var fallbackStorage =
      fireauth.storage.HybridIndexedDB.getLastCall().getArgument(0);
  assertEquals(
      fireauth.storage.Storage.Type.LOCAL_STORAGE, fallbackStorage.type);
}


function testGetStorage_node_temporary() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.NODE);
  assertTrue(factory.makeTemporaryStorage() instanceof
      fireauth.storage.SessionStorage);
}


function testGetStorage_node_persistent() {
  stubs.replace(
     fireauth.storage.IndexedDB,
      'isAvailable',
      function() {
        return false;
      });
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
  stubs.replace(
     fireauth.storage.IndexedDB,
      'isAvailable',
      function() {
        return false;
      });
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.REACT_NATIVE);
  assertTrue(factory.makePersistentStorage() instanceof
      fireauth.storage.AsyncStorage);
}


function testGetStorage_worker_persistent() {
  var mock = {
    type: 'indexedDB'
  };
  // Record calls to HybridIndexedDB.
  stubs.replace(
      fireauth.storage,
      'HybridIndexedDB',
      goog.testing.recordFunction(fireauth.storage.HybridIndexedDB));
  // persistsStorageWithIndexedDB is true in a worker environment.
  stubs.replace(
     fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {
        return true;
      });
  // Simulate worker environment.
  stubs.replace(
      fireauth.util,
      'isWorker',
      function() {
        return true;
      });
  // Return a mock indexeDB instance to assert the expected result of the test
  // below.
  stubs.replace(
      fireauth.storage.IndexedDB,
      'getFireauthManager',
      function() {
        return mock;
      });
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.WORKER);
  assertEquals('indexedDB', factory.makePersistentStorage().type);
  assertEquals(1, fireauth.storage.HybridIndexedDB.getCallCount());
  // Confirm in memory storage used as fallback when indexedDB is not supported.
  var fallbackStorage =
      fireauth.storage.HybridIndexedDB.getLastCall().getArgument(0);
  assertEquals(
      fireauth.storage.Storage.Type.IN_MEMORY, fallbackStorage.type);
}


function testGetStorage_worker_temporary() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.WORKER);
  assertTrue(factory.makeTemporaryStorage() instanceof
      fireauth.storage.NullStorage);
}


function testGetStorage_inMemory() {
  var factory = new fireauth.storage.Factory(
      fireauth.storage.Factory.EnvConfig.BROWSER);
  assertTrue(factory.makeInMemoryStorage() instanceof
      fireauth.storage.InMemoryStorage);
}
