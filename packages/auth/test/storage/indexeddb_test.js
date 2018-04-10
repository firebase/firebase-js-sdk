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

goog.provide('fireauth.storage.IndexedDBTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.storage.IndexedDB');
goog.require('fireauth.storage.Storage');
goog.require('goog.Promise');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.storage.IndexedDBTest');


var stubs = new goog.testing.PropertyReplacer();
var db = null;
var manager;
var clock;
var indexedDBMock;
var containsObjectStore;
var deleted;


function setUp() {
  deleted = 0;
  // IndexedDB not supported in IE9.
  stubs.replace(
      fireauth.storage.IndexedDB,
      'isAvailable',
      function() {
        return true;
      });
  clock = new goog.testing.MockClock(true);
  // Callback to run to determine whether the database constains an object
  // store.
  containsObjectStore = function() {
    return true;
  };
  indexedDBMock = {
    deleteDatabase: function(dbName) {
      assertEquals('firebaseLocalStorageDb', dbName);
      var request = {};
      // Simulate successful deletion.
      goog.Promise.resolve().then(function() {
        deleted++;
        db = null;
        request.onsuccess();
      });
      return request;
    },
    open: function(dbName, version) {
      assertEquals('firebaseLocalStorageDb', dbName);
      assertEquals(1, version);
      var dbRequest = {};
      goog.Promise.resolve().then(function() {
        db = {
          objectStoreNames: {
            contains: function(name) {
              assertEquals('firebaseLocalStorage', name);
              return containsObjectStore();
            }
          },
          key: null,
          store: {},
          createObjectStore: function(objectStoreName, keyPath) {
            var request = {
              'transaction': {
              }
            };
            assertEquals(
                'firebaseLocalStorage',
                objectStoreName);
            assertObjectEquals(
                {
                  'keyPath': 'fbase_key'
                },
                keyPath);
            db.key = keyPath['keyPath'];
            db.store[objectStoreName] = {};
            goog.Promise.resolve().then(function() {
              var event = {
                'target': {
                  'result': db
                }
              };
              dbRequest.onsuccess(event);
            });
            return request;
          },
          transaction: function(objectStores, type) {
            for (var i = 0; i < objectStores.length; i++) {
              if (!db.store[objectStores[i]]) {
                fail('Object store does not exist!');
              }
            }
            return {
              objectStore: function(objectStoreName) {
                if (!db.store[objectStoreName]) {
                  fail('Object store does not exist!');
                }
                return {
                  add: function(data) {
                    var request = {};
                    if (type != 'readwrite') {
                      fail('Invalid write operation!');
                    }
                    if (db.store[objectStoreName][data[db.key]]) {
                      fail('Unable to add. Key already exists!');
                    }
                    goog.Promise.resolve().then(function() {
                      db.store[objectStoreName][data[db.key]] = data;
                      request.onsuccess();
                    });
                    return request;
                  },
                  put: function(data) {
                    var request = {};
                    if (type != 'readwrite') {
                      fail('Invalid write operation!');
                    }
                    if (!db.store[objectStoreName][data[db.key]]) {
                      fail('Unable to put. Key does not exist!');
                    }
                    for (var subKey in data) {
                      db.store[objectStoreName][data[db.key]][subKey] =
                          data[subKey];
                    }
                    goog.Promise.resolve().then(function() {
                      request.onsuccess();
                    });
                    return request;
                  },
                  delete: function(keyToRemove) {
                    var request = {};
                    if (type != 'readwrite') {
                      fail('Invalid write operation!');
                    }
                    if (db.store[objectStoreName][keyToRemove]) {
                      delete db.store[objectStoreName][keyToRemove];
                    }
                    goog.Promise.resolve().then(function() {
                      request.onsuccess();
                    });
                    return request;
                  },
                  get: function(keyToGet, callback) {
                    var request = {};
                    var data = db.store[objectStoreName][keyToGet] || null;
                    goog.Promise.resolve().then(function() {
                      var event = {
                        'target': {
                          'result': data
                        }
                      };
                      request.onsuccess(event);
                    });
                    return request;
                  },
                  getAll: function() {
                    var request = {};
                    var results = [];
                    for (var key in db.store[objectStoreName]) {
                      results.push(db.store[objectStoreName][key]);
                    }
                    goog.Promise.resolve().then(function() {
                      var event = {
                        'target': {
                          'result': results
                        }
                      };
                      request.onsuccess(event);
                    });
                    return request;
                  }
                };
              }
            };
          }
        };
        var event = {
          'target': {
            'result': db
          }
        };
        dbRequest.onupgradeneeded(event);
      });
      return dbRequest;
    }
  };
}


function tearDown() {
  if (manager) {
    manager.removeAllStorageListeners();
  }
  manager = null;
  db = null;
  indexedDBMock = null;
  stubs.reset();
  goog.dispose(clock);
}


/**
 * Asserts that two errors are equivalent. Plain assertObjectEquals cannot be
 * used as Internet Explorer adds the stack trace as a property of the object.
 * @param {!fireauth.AuthError} expected
 * @param {!fireauth.AuthError} actual
 */
function assertErrorEquals(expected, actual) {
  assertObjectEquals(expected.toPlainObject(), actual.toPlainObject());
}


/**
 * @return {!fireauth.storage.IndexedDB} The default indexedDB
 *     local storage manager to be used for testing.
 */
function getDefaultFireauthManager() {
  return new fireauth.storage.IndexedDB(
      'firebaseLocalStorageDb',
      'firebaseLocalStorage',
      'fbase_key',
      'value',
      1,
      indexedDBMock);
}


function testIndexedDb_notSupported() {
  // Test when indexedDB is not supported.
  stubs.replace(
      fireauth.storage.IndexedDB,
      'isAvailable',
      function() {
        return false;
      });
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  try {
    getDefaultFireauthManager();
    fail('Should fail when indexedDB is not supported.');
  } catch (error) {
    assertErrorEquals(expectedError, error);
  }
}


function testIndexedDb_null() {
  manager = getDefaultFireauthManager();
  assertEquals(fireauth.storage.Storage.Type.INDEXEDDB, manager.type);
  return manager.get('key1')
      .then(function(data) {
        assertNull(data);
      });
}


function testIndexedDb_setGetRemove_objectStoreContained() {
  manager = getDefaultFireauthManager();
  manager.addStorageListener(function() {
    fail('Storage should not be triggered for local changes!');
  });
  return goog.Promise.resolve()
      .then(function() {
        return manager.set('key1', 'value1');
      })
      .then(function() {
        // No database deletion should occur.
        assertEquals(0, deleted);
        return manager.get('key1');
      })
      .then(function(data) {
        assertEquals('value1', data);
      })
      .then(function() {
        return manager.remove('key1');
      })
      .then(function() {
        return manager.get('key1');
      })
      .then(function(data) {
        assertNull(data);
      });
}


function testIndexedDb_setGetRemove_objectStoreMissing() {
  // Track number of initialization trials.
  var trials = 2;
  containsObjectStore = function() {
    trials--;
    // Fail first time and then succeed the second time.
    if (trials != 0) {
      return false;
    }
    return true;
  };
  manager = getDefaultFireauthManager();
  manager.addStorageListener(function() {
    fail('Storage should not be triggered for local changes!');
  });
  return goog.Promise.resolve()
      .then(function() {
        return manager.set('key1', 'value1');
      })
      .then(function() {
        // Db should have been deleted and re-initialized.
        assertEquals(0, trials);
        assertEquals(1, deleted);
        return manager.get('key1');
      })
      .then(function(data) {
        assertEquals('value1', data);
      })
      .then(function() {
        return manager.remove('key1');
      })
      .then(function() {
        return manager.get('key1');
      })
      .then(function(data) {
        assertNull(data);
      });
}


function testStartListeners() {
  manager = getDefaultFireauthManager();
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();

  // Add listeners.
  manager.addStorageListener(listener1);
  manager.addStorageListener(listener2);
  clock.tick(800);
  clock.tick(800);
  clock.tick(800);
  db.store['firebaseLocalStorage'] = {
    'key1': {'fbase_key': 'key1', 'value': 1},
    'key2': {'fbase_key': 'key2', 'value': 2}
  };
  clock.tick(800);
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener2.getCallCount());
  assertArrayEquals(
      ['key1', 'key2'], listener1.getLastCall().getArgument(0));
  assertArrayEquals(
      ['key1', 'key2'], listener2.getLastCall().getArgument(0));
}


function testStopListeners() {
  manager = getDefaultFireauthManager();
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();
  // Add listeners.
  manager.addStorageListener(listener1);
  manager.addStorageListener(listener2);
  manager.addStorageListener(listener3);
  clock.tick(800);
  clock.tick(800);
  clock.tick(800);
  // Remove all but listener3.
  manager.removeStorageListener(listener1);
  manager.removeStorageListener(listener2);
  db.store['firebaseLocalStorage'] = {
    'key1': {'fbase_key': 'key1', 'value': 1},
    'key2': {'fbase_key': 'key2', 'value': 2}
  };
  clock.tick(800);
  // Only listener3 should be called.
  assertEquals(0, listener1.getCallCount());
  assertEquals(0, listener2.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertArrayEquals(
      ['key1', 'key2'], listener3.getLastCall().getArgument(0));
}
