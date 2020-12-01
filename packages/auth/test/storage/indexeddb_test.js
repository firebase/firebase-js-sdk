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

goog.provide('fireauth.storage.IndexedDBTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.messagechannel.Receiver');
goog.require('fireauth.messagechannel.Sender');
goog.require('fireauth.storage.IndexedDB');
goog.require('fireauth.storage.Storage');
goog.require('goog.Promise');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.storage.IndexedDBTest');


let mockControl;
let ignoreArgument;
const stubs = new goog.testing.PropertyReplacer();
let db = null;
let manager;
let clock;
let indexedDBMock;
let containsObjectStore;
let deleted;



function setUp() {
  mockControl = new goog.testing.MockControl();
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl.$resetAll();
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
    deleteDatabase: function (dbName) {
      assertEquals('firebaseLocalStorageDb', dbName);
      const request = {};
      // Simulate successful deletion.
      goog.Promise.resolve().then(function () {
        deleted++;
        db = null;
        request.onsuccess();
      });
      return request;
    },
    onopen_: () => { },
    open: function (dbName, version) {
      assertEquals('firebaseLocalStorageDb', dbName);
      assertEquals(1, version);
      const dbRequest = {};
      goog.Promise.resolve().then(function () {
        db = {
          connectionActive: true,
          objectStoreNames: {
            contains: function (name) {
              assertEquals('firebaseLocalStorage', name);
              return containsObjectStore();
            }
          },
          key: null,
          store: {},
          close: function () {
            if (db) {
              db.connectionActive = false;
            }
          },
          createObjectStore: function (objectStoreName, keyPath) {
            const request = { 'transaction': {} };
            assertEquals('firebaseLocalStorage', objectStoreName);
            assertObjectEquals({ 'keyPath': 'fbase_key' }, keyPath);
            db.key = keyPath['keyPath'];
            db.store[objectStoreName] = {};
            goog.Promise.resolve().then(function () {
              const event = { 'target': { 'result': db } };
              dbRequest.onsuccess(event);
            });
            return request;
          },
          transaction: function (objectStores, type) {
            for (let i = 0; i < objectStores.length; i++) {
              if (!db.store[objectStores[i]]) {
                fail('Object store does not exist!');
              }
            }
            return {
              objectStore: function (objectStoreName) {
                if (!db.store[objectStoreName]) {
                  fail('Object store does not exist!');
                }
                return {
                  add: function (data) {
                    if (!db.connectionActive) {
                      throw new Error(
                        'Failed to execute \'transaction\' on ' +
                        '\'IDBDatabase\'.');
                    }
                    const request = {};
                    if (type != 'readwrite') {
                      fail('Invalid write operation!');
                    }
                    if (db.store[objectStoreName][data[db.key]]) {
                      fail('Unable to add. Key already exists!');
                    }
                    goog.Promise.resolve().then(function () {
                      db.store[objectStoreName][data[db.key]] = data;
                      request.onsuccess();
                    });
                    return request;
                  },
                  put: function (data) {
                    if (!db.connectionActive) {
                      throw new Error(
                        'Failed to execute \'transaction\' on ' +
                        '\'IDBDatabase\'.');
                    }
                    const request = {};
                    if (type != 'readwrite') {
                      fail('Invalid write operation!');
                    }
                    if (!db.store[objectStoreName][data[db.key]]) {
                      fail('Unable to put. Key does not exist!');
                    }
                    for (let subKey in data) {
                      db.store[objectStoreName][data[db.key]][subKey] =
                        data[subKey];
                    }
                    goog.Promise.resolve().then(function () {
                      request.onsuccess();
                    });
                    return request;
                  },
                  delete: function (keyToRemove) {
                    if (!db.connectionActive) {
                      throw new Error(
                        'Failed to execute \'transaction\' on ' +
                        '\'IDBDatabase\'.');
                    }
                    const request = {};
                    if (type != 'readwrite') {
                      fail('Invalid write operation!');
                    }
                    if (db.store[objectStoreName][keyToRemove]) {
                      delete db.store[objectStoreName][keyToRemove];
                    }
                    goog.Promise.resolve().then(function () {
                      request.onsuccess();
                    });
                    return request;
                  },
                  get: function (keyToGet, callback) {
                    if (!db.connectionActive) {
                      throw new Error(
                        'Failed to execute \'transaction\' on ' +
                        '\'IDBDatabase\'.');
                    }
                    const request = {};
                    const data = db.store[objectStoreName][keyToGet] || null;
                    goog.Promise.resolve().then(function () {
                      const event = { 'target': { 'result': data } };
                      request.onsuccess(event);
                    });
                    return request;
                  },
                  getAll: function () {
                    if (!db.connectionActive) {
                      throw new Error(
                        'Failed to execute \'transaction\' on ' +
                        '\'IDBDatabase\'.');
                    }
                    const request = {};
                    const results = [];
                    for (let key in db.store[objectStoreName]) {
                      results.push(db.store[objectStoreName][key]);
                    }
                    goog.Promise.resolve().then(function () {
                      const event = { 'target': { 'result': results } };
                      request.onsuccess(event);
                    });
                    return request;
                  }
                };
              }
            };
          }
        };
        const event = { 'target': { 'result': db } };
        dbRequest.onupgradeneeded(event);
        indexedDBMock.onopen_(db);
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
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
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


function testIndexedDb_setGetRemove_connectionClosed() {
  manager = getDefaultFireauthManager();
  manager.addStorageListener(() => {
    fail('Storage should not be triggered for local changes!');
  });
  let numAttempts = 0;
  let errorThrown = false;
  return goog.Promise.resolve()
    .then(() => {
      return manager.get('key1');
    })
    .then(() => {
      // Close the connection and try a set, it should not throw.
      db.close();
      return manager.set('key1', 'value1');
    })
    .then(() => {
      // Close the connection and try a get, it should not throw.
      db.close();
      return manager.get('key1');
    })
    .then((data) => {
      // Close the connection and try a remove, it should not throw.
      db.close();
      return manager.remove('key1');
    })
    .then(() => {
      db.close();
      indexedDBMock.onopen_ = (db) => {
        numAttempts++;
        db.close();
      };
      return manager.set('key1', 'value1');
    })
    .thenCatch((error) => {
      assertEquals(
        error.message,
        'Failed to execute \'transaction\' on \'IDBDatabase\'.');
      errorThrown = true;
    })
    .then(() => {
      assertEquals(3, numAttempts);
      assertTrue(errorThrown);
    });
}


function testIndexedDb_failingOnDbOpen() {
  manager = getDefaultFireauthManager();
  manager.addStorageListener(() => {
    fail('Storage should not be triggered for local changes!');
  });
  let errorThrown = false;
  indexedDBMock.open = () => {
    throw new Error('InvalidStateError: A mutation operation was attempted ' +
                    'on a database that did not allow mutations.');
  };
  return goog.Promise.resolve()
      .then(() => {
        return manager.get('key1');
      })
      .thenCatch((error) => {
        assertEquals(
            error.message,
            'InvalidStateError: A mutation operation was attempted on a ' +
            'database that did not allow mutations.');
        errorThrown = true;
      })
      .then(() => {
        assertTrue(errorThrown);
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
  db.store['firebaseLocalStorage'] = {
    'key1': {'fbase_key': 'key1', 'value': 1},
    'key3': {'fbase_key': 'key3', 'value': 3}
  };
  clock.tick(800);
  // Only listener3 should be called.
  assertEquals(0, listener1.getCallCount());
  assertEquals(0, listener2.getCallCount());
  assertEquals(2, listener3.getCallCount());
  assertArrayEquals(
      ['key2', 'key3'], listener3.getLastCall().getArgument(0));
  // Remove listener3.
  manager.removeStorageListener(listener3);
  // Add listener1 again.
  manager.addStorageListener(listener1);
  db.store['firebaseLocalStorage'] = {
    'key1': {'fbase_key': 'key1', 'value': 0},
    'key3': {'fbase_key': 'key3', 'value': 3},
    'key4': {'fbase_key': 'key4', 'value': 4}
  };
  clock.tick(800);
  // Only listener1 should be called.
  assertEquals(1, listener1.getCallCount());
  assertEquals(0, listener2.getCallCount());
  assertEquals(2, listener3.getCallCount());
  assertArrayEquals(
      ['key1', 'key4'], listener1.getLastCall().getArgument(0));
  // Remove all listeners.
  manager.removeAllStorageListeners();
  db.store['firebaseLocalStorage'] = {
    'key1': {'fbase_key': 'key1', 'value': 0}
  };
  clock.tick(800);
  // No additional listener should be called.
  assertEquals(1, listener1.getCallCount());
  assertEquals(0, listener2.getCallCount());
  assertEquals(2, listener3.getCallCount());
}


function testReceiverSubscribed_noWorkerGlobalScope() {
  var getWorkerGlobalScope = mockControl.createMethodMock(
      fireauth.util, 'getWorkerGlobalScope');
  var getInstance = mockControl.createMethodMock(
      fireauth.messagechannel.Receiver, 'getInstance');
  getWorkerGlobalScope().$returns(null).$atLeastOnce();
  getInstance().$never();
  mockControl.$replayAll();

  manager = getDefaultFireauthManager();
  return manager.get('abc').then(function(value) {
    assertNull(value);
  });
}


function testReceiverSubscribed_externalChange_notYetProcessed() {
  var listener1 = goog.testing.recordFunction();
  var subscribedCallback;
  var pingCallback;
  var workerGlobalScope = {};
  var getWorkerGlobalScope = mockControl.createMethodMock(
      fireauth.util, 'getWorkerGlobalScope');
  var receiver = mockControl.createStrictMock(fireauth.messagechannel.Receiver);
  var getInstance = mockControl.createMethodMock(
      fireauth.messagechannel.Receiver, 'getInstance');
  getWorkerGlobalScope().$returns(workerGlobalScope).$atLeastOnce();
  getInstance(workerGlobalScope).$returns(receiver);
  receiver.subscribe('keyChanged', ignoreArgument)
      .$does(function(eventType, callback) {
        subscribedCallback = callback;
      }).$once();
  receiver.subscribe('ping', ignoreArgument)
      .$does(function(eventType, callback) {
        pingCallback = callback;
      }).$once();
  mockControl.$replayAll();

  manager = getDefaultFireauthManager();
  manager.addStorageListener(listener1);
  return manager.get('abc').then(function(value) {
    // Simulate ping response at this point.
    pingCallback('https://www.example.com', {});
    assertNull(value);
    // Simulate external indexedDB change.
    db.store['firebaseLocalStorage'] = {
      'abc': {'fbase_key': 'abc', 'value': 'def'}
    };
    return subscribedCallback('https://www.example.com', {'key': 'abc'});
  }).then(function(response) {
    // Confirm sync completed. Status true returned to confirm the key was
    // processed.
    assertObjectEquals({'keyProcessed': true}, response);
    // Listener should trigger with expected argument.
    assertEquals(1, listener1.getCallCount());
    assertArrayEquals(['abc'], listener1.getLastCall().getArgument(0));
    return manager.get('abc');
  }).then(function(value) {
    assertEquals('def', value);
  });
}


function testReceiverSubscribed_externalChange_notYetProcessed_pingTimeout() {
  // Confirm ping timeout does not affect the flow. This is mostly used for
  // optimization for slow browsers.
  var listener1 = goog.testing.recordFunction();
  var subscribedCallback;
  var workerGlobalScope = {};
  var getWorkerGlobalScope = mockControl.createMethodMock(
      fireauth.util, 'getWorkerGlobalScope');
  var receiver = mockControl.createStrictMock(fireauth.messagechannel.Receiver);
  var getInstance = mockControl.createMethodMock(
      fireauth.messagechannel.Receiver, 'getInstance');
  getWorkerGlobalScope().$returns(workerGlobalScope).$atLeastOnce();
  getInstance(workerGlobalScope).$returns(receiver);
  receiver.subscribe('keyChanged', ignoreArgument)
      .$does(function(eventType, callback) {
        subscribedCallback = callback;
      }).$once();
  // Simulate no response to ping. This means short timeout will be used by
  // sender.
  receiver.subscribe('ping', ignoreArgument).$once();
  mockControl.$replayAll();

  manager = getDefaultFireauthManager();
  manager.addStorageListener(listener1);
  return manager.get('abc').then(function(value) {
    assertNull(value);
    // Simulate external indexedDB change.
    db.store['firebaseLocalStorage'] = {
      'abc': {'fbase_key': 'abc', 'value': 'def'}
    };
    return subscribedCallback('https://www.example.com', {'key': 'abc'});
  }).then(function(response) {
    // Confirm sync completed. Status true returned to confirm the key was
    // processed.
    assertObjectEquals({'keyProcessed': true}, response);
    // Listener should trigger with expected argument.
    assertEquals(1, listener1.getCallCount());
    assertArrayEquals(['abc'], listener1.getLastCall().getArgument(0));
    return manager.get('abc');
  }).then(function(value) {
    assertEquals('def', value);
  });
}


function testReceiverSubscribed_externalChange_alreadyProcessed() {
  var listener1 = goog.testing.recordFunction();
  var subscribedCallback;
  var pingCallback;
  var workerGlobalScope = {};
  var getWorkerGlobalScope = mockControl.createMethodMock(
      fireauth.util, 'getWorkerGlobalScope');
  var receiver = mockControl.createStrictMock(fireauth.messagechannel.Receiver);
  var getInstance = mockControl.createMethodMock(
      fireauth.messagechannel.Receiver, 'getInstance');
  getWorkerGlobalScope().$returns(workerGlobalScope).$atLeastOnce();
  getInstance(workerGlobalScope).$returns(receiver);
  receiver.subscribe('keyChanged', ignoreArgument)
      .$does(function(eventType, callback) {
        subscribedCallback = callback;
      }).$once();
  receiver.subscribe('ping', ignoreArgument)
      .$does(function(eventType, callback) {
        pingCallback = callback;
      }).$once();
  mockControl.$replayAll();

  manager = getDefaultFireauthManager();
  manager.addStorageListener(listener1);
  return manager.set('abc', 'def').then(function() {
    // Simulate ping response at this point.
    pingCallback('https://www.example.com', {});
    return subscribedCallback('https://www.example.com', {'key': 'abc'});
  }).then(function(response) {
    // Confirm sync completed but key not processed since no change is detected.
    assertObjectEquals({'keyProcessed': false}, response);
    // No listener should trigger.
    assertEquals(0, listener1.getCallCount());
    return manager.get('abc');
  }).then(function(value) {
    assertEquals('def', value);
  });
}


function testSender_writeOperations_serviceWorkerControllerUnavailable() {
  var getActiveServiceWorker = mockControl.createMethodMock(
      fireauth.util, 'getActiveServiceWorker');
  var sender = mockControl.createStrictMock(fireauth.messagechannel.Sender);
  var senderConstructor = mockControl.createConstructorMock(
      fireauth.messagechannel, 'Sender');
  getActiveServiceWorker()
      .$returns(goog.Promise.resolve(null)).$atLeastOnce();
  // No sender initialized.
  senderConstructor(ignoreArgument).$never();
  sender.send(ignoreArgument).$never();
  mockControl.$replayAll();

  // Set and remove should not trigger sender.
  manager = getDefaultFireauthManager();
  return manager.set('abc', 'def').then(function() {
    return manager.get('abc');
  }).then(function(value) {
    assertEquals('def', value);
    return manager.remove('abc');
  }).then(function() {
    return manager.get('abc');
  }).then(function(value) {
    assertNull(value);
  });
}


function testSender_writeOperations_serviceWorkerControllerAvailable() {
  var status = [];
  var serviceWorkerController = {};
  var getServiceWorkerController = mockControl.createMethodMock(
      fireauth.util, 'getServiceWorkerController');
  var getActiveServiceWorker = mockControl.createMethodMock(
      fireauth.util, 'getActiveServiceWorker');
  var sender = mockControl.createStrictMock(fireauth.messagechannel.Sender);
  var senderConstructor = mockControl.createConstructorMock(
      fireauth.messagechannel, 'Sender');
  var resolvePing;
  getActiveServiceWorker()
      .$returns(goog.Promise.resolve(serviceWorkerController)).$atLeastOnce();
  // Successful set event.
  senderConstructor(ignoreArgument).$returns(sender);
  sender.send('ping', null, true).$does(function(eventType, data) {
    return new goog.Promise(function(resolve, reject) {
      resolvePing = resolve;
    });
  }).$once();
  // Short timeout used as ping response not yet received.
  getServiceWorkerController().$returns(serviceWorkerController).$once();
  sender.send('keyChanged', {'key': 'abc'}, false)
      .$does(function(eventType, data) {
        status.push(0);
        return goog.Promise.resolve([
          {
            'fulfilled': true,
            'value': {'keyProcessed': true}
          }
        ]);
      }).$once();
      // Successful remove event.
  // Short timeout used as ping response not yet received.
  getServiceWorkerController().$returns(serviceWorkerController).$once();
  sender.send('keyChanged', {'key': 'abc'}, false)
      .$does(function(eventType, data) {
        // Simulate ping resolved at this point.
        resolvePing([
          {
            'fulfilled': true,
            'value': ['keyChanged']
          }
        ]);
        status.push(1);
        return goog.Promise.resolve([
          {
            'fulfilled': true,
            'value': {'keyProcessed': true}
          }
        ]);
      }).$once();
  // Long timeout used as ping response has been resolved.
  // Failing set event.
  getServiceWorkerController().$returns(serviceWorkerController).$once();
  sender.send('keyChanged', {'key': 'abc'}, true)
      .$does(function(eventType, data) {
        status.push(2);
        return goog.Promise.reject(new Error('unsupported_event'));
      }).$once();
  // Failing remove event.
  getServiceWorkerController().$returns(serviceWorkerController).$once();
  sender.send('keyChanged', {'key': 'abc'}, true)
      .$does(function(eventType, data) {
        status.push(3);
        return goog.Promise.reject(new Error('invalid_response'));
      }).$once();
  // Simulate the active service worker changed for some reason. No send
  // requests sent anymore.
  getServiceWorkerController().$returns({}).$once();
  mockControl.$replayAll();

  manager = getDefaultFireauthManager();
  return manager.set('abc', 'def').then(function() {
    // Set should trigger sender at this point.
    assertArrayEquals([0], status);
    return manager.get('abc');
  }).then(function(value) {
    // Get shouldn't trigger.
    assertArrayEquals([0], status);
    assertEquals('def', value);
    return manager.remove('abc');
  }).then(function() {
    // Remove should trigger sender at this point.
    assertArrayEquals([0, 1], status);
    return manager.get('abc');
  }).then(function(value) {
    // Get shouldn't trigger.
    assertArrayEquals([0, 1], status);
    assertNull(value);
    // This should resolve even if sender error occurs.
    return manager.set('abc', 'ghi');
  }).then(function() {
    // Set should trigger sender at this point.
    assertArrayEquals([0, 1, 2], status);
    return manager.get('abc');
  }).then(function(value) {
    // Get shouldn't trigger.
    assertArrayEquals([0, 1, 2], status);
    assertEquals('ghi', value);
    // This should resolve even if sender error occurs.
    return manager.remove('abc');
  }).then(function() {
    // Remove should trigger sender at this point.
    assertArrayEquals([0, 1, 2, 3], status);
    return manager.get('abc');
  }).then(function(value) {
    // Get shouldn't trigger.
    assertArrayEquals([0, 1, 2, 3], status);
    assertNull(value);
    return manager.set('abc', 'ghi');
  }).then(function() {
    // This shouldn't trigger sender anymore since active service worker
    // changed.
    assertArrayEquals([0, 1, 2, 3], status);
    return manager.get('abc');
  }).then(function(value) {
    assertEquals('ghi', value);
  });
}
