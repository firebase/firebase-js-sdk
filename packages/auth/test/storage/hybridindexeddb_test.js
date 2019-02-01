/**
 * Copyright 2018 Google Inc.
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

goog.provide('fireauth.storage.HybridIndexedDBTest');

goog.require('fireauth.storage.HybridIndexedDB');
goog.require('fireauth.storage.InMemoryStorage');
goog.require('fireauth.storage.IndexedDB');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.Storage');
/** @suppress {extraRequire} */
goog.require('fireauth.storage.testHelper');
goog.require('goog.Promise');
goog.require('goog.events.EventType');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.events');
goog.require('goog.testing.events.Event');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.storage.HybridIndexedDBTest');


var indexeddbMockStorage;
var ignoreArgument;
var stubs = new goog.testing.PropertyReplacer();
var mockStorage;
var storage;


function setUp() {
  // Create new mock indexedDB storage before each test.
  indexeddbMockStorage = new fireauth.storage.MockStorage();
  // IndexedDB available.
  stubs.replace(
      fireauth.storage.IndexedDB,
      'isAvailable',
      function() {
        return true;
      });
  stubs.replace(
      fireauth.storage.IndexedDB,
      'getFireauthManager',
      function() {
        indexeddbMockStorage.type = fireauth.storage.Storage.Type.INDEXEDDB;
        return indexeddbMockStorage;
      });
}


function tearDown() {
  storage = null;
  stubs.reset();
}


function testHybridIndexedDBStorage_basicStorageOperations() {
  storage = new fireauth.storage.HybridIndexedDB(
      new fireauth.storage.InMemoryStorage());
  return assertBasicStorageOperations(storage).then(function() {
    assertEquals(fireauth.storage.Storage.Type.INDEXEDDB, storage.type);
  });
}


function testHybridIndexedDBStorage_differentTypes() {
  storage = new fireauth.storage.HybridIndexedDB(
      new fireauth.storage.InMemoryStorage());
  return assertDifferentTypes(storage).then(function() {
    assertEquals(fireauth.storage.Storage.Type.INDEXEDDB, storage.type);
  });
}


function testHybridIndexedDBStorage_listeners() {
  var storageEvent;
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();

  storage = new fireauth.storage.HybridIndexedDB(
      new fireauth.storage.InMemoryStorage());
  storage.addStorageListener(listener1);
  storage.addStorageListener(listener3);
  // This call will resolve when underlying storage is resolved.
  return storage.get('dummy').then(function(value) {
    storageEvent =
        new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
    storageEvent.key = 'myKey1';
    storageEvent.newValue = JSON.stringify('value1');
    indexeddbMockStorage.fireBrowserEvent(storageEvent);

    assertEquals(1, listener1.getCallCount());
    // Confirm expected argument passed.
    // In the indexedDB case, this is an array of keys.
    // If localStorage fallback is used, this would be the storage event.
    assertArrayEquals(
        [storageEvent.key], listener1.getLastCall().getArgument(0));
    assertEquals(1, listener3.getCallCount());
    assertEquals(0, listener2.getCallCount());
    return storage.get('myKey1');
  }).then(function(value) {
    assertEquals('value1', value);

    storage.removeStorageListener(listener3);

    storageEvent.key = 'myKey2';
    storageEvent.newValue = JSON.stringify('value2');
    indexeddbMockStorage.fireBrowserEvent(storageEvent);

    assertEquals(2, listener1.getCallCount());
    assertEquals(1, listener3.getCallCount());
    assertEquals(0, listener2.getCallCount());
    return storage.get('myKey2');
  }).then(function(value) {
    assertEquals('value2', value);
    storageEvent.key = 'myKey1';
    storageEvent.newValue = null;
    indexeddbMockStorage.fireBrowserEvent(storageEvent);

    assertEquals(3, listener1.getCallCount());
    assertEquals(1, listener3.getCallCount());
    assertEquals(0, listener2.getCallCount());

    return storage.get('myKey1');
  }).then(function(value) {
    assertUndefined(value);

    storage.removeStorageListener(listener1);

    storageEvent.key = null;
    indexeddbMockStorage.fireBrowserEvent(storageEvent);

    assertEquals(3, listener1.getCallCount());
    assertEquals(1, listener3.getCallCount());
    assertEquals(0, listener2.getCallCount());

    return storage.get('myKey2');
  }).then(function(value) {
    assertUndefined(value);
  });
}


function testHybridIndexedDBStorage_indexedDB_available() {
  var inMemory = new fireauth.storage.InMemoryStorage();
  // Confirm indexedDB used when available.
  storage = new fireauth.storage.HybridIndexedDB(inMemory);
  return storage.set('key1', 'value1').then(function() {
    // Confirm data was stored in indexedDB and not the fallback.
    return indexeddbMockStorage.get('key1');
  }).then(function(value) {
    assertEquals('value1', value);
    return inMemory.get('key1');
  }).then(function(value) {
    assertUndefined(value);
    assertEquals(fireauth.storage.Storage.Type.INDEXEDDB, storage.type);
  });
}


function testHybridIndexedDBStorage_indexedDB_notAvailable() {
  // IndexedDB not available.
  stubs.replace(
      fireauth.storage.IndexedDB,
      'isAvailable',
      function() {
        return false;
      });
  var inMemory = new fireauth.storage.InMemoryStorage();
  // Confirm fallback used when indexedDB not available.
  storage = new fireauth.storage.HybridIndexedDB(inMemory);
  return storage.set('key1', 'value1').then(function() {
    // Confirm data was stored in fallback storage.
    return indexeddbMockStorage.get('key1');
  }).then(function(value) {
    assertUndefined(value);
    return inMemory.get('key1');
  }).then(function(value) {
    assertEquals('value1', value);
    assertEquals(fireauth.storage.Storage.Type.IN_MEMORY, storage.type);
  });
}


function testHybridIndexedDBStorage_indexedDB_readWriteError() {
  stubs.replace(
      fireauth.storage.IndexedDB,
      'getFireauthManager',
      function() {
        // Return mock indexedDB that throws an error on read/writes.
        return {
          set: function(key, value) {
            return goog.Promise.reject();
          },
          get: function(key) {
            return goog.Promise.reject();
          },
          remove: function(key) {
            return goog.Promise.reject();
          }
        };
      });
  var inMemory = new fireauth.storage.InMemoryStorage();
  // Confirm fallback used when indexedDB throws a read/write error.
  storage = new fireauth.storage.HybridIndexedDB(inMemory);
  return storage.set('key1', 'value1').then(function() {
    return indexeddbMockStorage.get('key1');
  }).then(function(value) {
    assertUndefined(value);
    return inMemory.get('key1');
  }).then(function(value) {
    assertEquals('value1', value);
    assertEquals(fireauth.storage.Storage.Type.IN_MEMORY, storage.type);
  });
}


function testHybridIndexedDBStorage_indexedDB_noPersistence() {
  stubs.replace(
      fireauth.storage.IndexedDB,
      'getFireauthManager',
      function() {
        // Return mock indexedDB that does not persist data.
        return {
          set: function(key, value) {
            return goog.Promise.resolve();
          },
          get: function(key) {
            return goog.Promise.resolve(null);
          },
          remove: function(key) {
            return goog.Promise.resolve();
          }
        };
      });
  var inMemory = new fireauth.storage.InMemoryStorage();
  // Confirm fallback used when indexedDB is not persisting data correctly.
  storage = new fireauth.storage.HybridIndexedDB(inMemory);
  return storage.set('key1', 'value1').then(function() {
    return indexeddbMockStorage.get('key1');
  }).then(function(value) {
    assertUndefined(value);
    return inMemory.get('key1');
  }).then(function(value) {
    assertEquals('value1', value);
    assertEquals(fireauth.storage.Storage.Type.IN_MEMORY, storage.type);
  });
}
