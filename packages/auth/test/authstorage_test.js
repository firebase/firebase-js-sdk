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
 * @fileoverview Tests for authstorage.js
 */

goog.provide('fireauth.authStorageTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.authStorage');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
/** @suppress {extraRequire} Needed for firebase.app().auth() */
goog.require('fireauth.exports');
goog.require('fireauth.storage.IndexedDB');
goog.require('fireauth.storage.LocalStorage');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.SessionStorage');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.events');
goog.require('goog.testing.events.Event');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.authStorageTest');


var config = {
  apiKey: 'apiKey1'
};
var stubs = new goog.testing.PropertyReplacer();
var appId = 'appId1';
var clock;
var mockLocalStorage;
var mockSessionStorage;


function setUp() {
  // Create new mock storages for persistent and temporary storage before each
  // test.
  mockLocalStorage = new fireauth.storage.MockStorage();
  mockSessionStorage = new fireauth.storage.MockStorage();
  fireauth.common.testHelper.installMockStorages(
      stubs, mockLocalStorage, mockSessionStorage);
  clock = new goog.testing.MockClock(true);
  window.localStorage.clear();
  window.sessionStorage.clear();
}


function tearDown() {
  stubs.reset();
  goog.dispose(clock);
}


/**
 * @return {!fireauth.authStorage.Manager} The default local storage
 *     synchronized manager instance used for testing.
 */
function getDefaultManagerInstance() {
  return new fireauth.authStorage.Manager('firebase', ':', false, true, true);
}


function testValidatePersistenceArgument_validAndSupported() {
  assertNotThrows(function() {
    fireauth.authStorage.validatePersistenceArgument('local');
    fireauth.authStorage.validatePersistenceArgument('session');
    fireauth.authStorage.validatePersistenceArgument('none');
  });
}


function testValidatePersistenceArgument_invalid() {
  var invalidTypeError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_PERSISTENCE);
  var invalidOptions = ['LOCAL', 'bla', null, {}, true, ['none']];
  for (var i = 0; i < invalidOptions.length; i++) {
    fireauth.common.testHelper.assertErrorEquals(
        invalidTypeError,
        assertThrows(function() {
          fireauth.authStorage.validatePersistenceArgument(invalidOptions[i]);
        }));
  }
}


function testValidatePersistenceArgument_node() {
  // Simulate Node.js.
  stubs.replace(
      fireauth.util,
      'getEnvironment',
      function() {
        return fireauth.util.Env.NODE;
      });
  var unsupportedTypeError = new fireauth.AuthError(
      fireauth.authenum.Error.UNSUPPORTED_PERSISTENCE);
  // Local should throw an error.
  fireauth.common.testHelper.assertErrorEquals(
      unsupportedTypeError,
      assertThrows(function() {
        fireauth.authStorage.validatePersistenceArgument('local');
      }));
  // Session should throw an error.
  fireauth.common.testHelper.assertErrorEquals(
      unsupportedTypeError,
      assertThrows(function() {
        fireauth.authStorage.validatePersistenceArgument('session');
      }));
  // None should be supported.
  assertNotThrows(function() {
    fireauth.authStorage.validatePersistenceArgument('none');
  });
}


function testValidatePersistenceArgument_reactNative() {
  // Simulate React-Native.
  stubs.replace(
      fireauth.util,
      'getEnvironment',
      function() {
        return fireauth.util.Env.REACT_NATIVE;
      });
  var unsupportedTypeError = new fireauth.AuthError(
      fireauth.authenum.Error.UNSUPPORTED_PERSISTENCE);
  // Only session should throw an error.
  fireauth.common.testHelper.assertErrorEquals(
      unsupportedTypeError,
      assertThrows(function() {
        fireauth.authStorage.validatePersistenceArgument('session');
      }));
  // Local and none should be supported.
  assertNotThrows(function() {
    fireauth.authStorage.validatePersistenceArgument('local');
    fireauth.authStorage.validatePersistenceArgument('none');
  });
}


function testValidatePersistenceArgument_browser() {
  // Browser or other.
  stubs.replace(
      fireauth.util,
      'getEnvironment',
      function() {
        return fireauth.util.Env.BROWSER;
      });
  // Simulate web storage supported.
  stubs.replace(
      fireauth.util,
      'isWebStorageSupported',
      function() {
        return true;
      });
  var unsupportedTypeError = new fireauth.AuthError(
      fireauth.authenum.Error.UNSUPPORTED_PERSISTENCE);
  // Should be supported when web storage is.
  assertNotThrows(function() {
    fireauth.authStorage.validatePersistenceArgument('local');
    fireauth.authStorage.validatePersistenceArgument('session');
    fireauth.authStorage.validatePersistenceArgument('none');
  });
  // Simulate web storage not supported.
  stubs.replace(
      fireauth.util,
      'isWebStorageSupported',
      function() {
        return false;
      });
  // Only none should work.
  assertNotThrows(function() {
    fireauth.authStorage.validatePersistenceArgument('none');
  });
  // Local should throw an error.
  fireauth.common.testHelper.assertErrorEquals(
      unsupportedTypeError,
      assertThrows(function() {
        fireauth.authStorage.validatePersistenceArgument('local');
      }));
  // Session should throw an error.
  fireauth.common.testHelper.assertErrorEquals(
      unsupportedTypeError,
      assertThrows(function() {
        fireauth.authStorage.validatePersistenceArgument('session');
      }));
}


function testWebStorageNotSupported() {
  // Test when web storage not supported. In memory storage should be used
  // instead.
  stubs.reset();
  stubs.replace(
     fireauth.storage.IndexedDB,
      'isAvailable',
      function() {
        return false;
      });
  stubs.replace(
     fireauth.storage.LocalStorage,
      'isAvailable',
      function() {
        return false;
      });
  stubs.replace(
     fireauth.storage.SessionStorage,
      'isAvailable',
      function() {
        return false;
      });
  // The following should not fail and should create in memory storage
  // instances.
  var manager = getDefaultManagerInstance();
  var tempKey = {name: 'temporary', persistent: 'session'};
  var tempStorageKey = 'firebase:temporary:appId1';
  var persistentKey = {name: 'persistent', persistent: 'local'};
  var persistentStorageKey = 'firebase:persistent:appId1';
  var expectedValue = 'something';
  // Get, set and remove should work as expected on both types of storage.
  return goog.Promise.resolve()
      .then(function() {
        // Test temporary storage.
        return manager.set(tempKey, expectedValue, appId);
      })
      .then(function() {
        return manager.get(tempKey, appId);
      })
      .then(function(value) {
        // Nothing should be stored in sessionStorage.
        assertNull(window.sessionStorage.getItem(tempStorageKey));
        assertObjectEquals(expectedValue, value);
      })
      .then(function() {
        return manager.remove(tempKey, appId);
      })
      .then(function() {
        return manager.get(tempKey, appId);
      })
      .then(function(value) {
        assertUndefined(value);
        // Test persistent storage.
        return manager.set(persistentKey, expectedValue, appId);
      })
      .then(function() {
        return manager.get(persistentKey, appId);
      })
      .then(function(value) {
        // Nothing should be stored in localStorage.
        assertNull(window.localStorage.getItem(persistentStorageKey));
        assertObjectEquals(expectedValue, value);
      })
      .then(function() {
        return manager.remove(persistentKey, appId);
      })
      .then(function() {
        return manager.get(persistentKey, appId);
      })
      .then(function(value) {
        assertUndefined(value);
      });
}


function testGetSet_temporaryStorage() {
  var manager = getDefaultManagerInstance();
  var key = {name: 'temporary', persistent: 'session'};
  var expectedValue = 'something';
  var storageKey = 'firebase:temporary:appId1';
  return goog.Promise.resolve()
      .then(function() {
        return manager.set(key, expectedValue, appId);
      })
      .then(function() {
        return manager.get(key, appId);
      })
      .then(function(value) {
        assertObjectEquals(expectedValue, value);
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertObjectEquals(expectedValue, value);
      })
      .then(function() {
        return manager.remove(key, appId);
      })
      .then(function() {
        return manager.get(key, appId);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
      });
}


function testGetSet_inMemoryStorage() {
  var manager = getDefaultManagerInstance();
  var key = {name: 'temporary', persistent: 'none'};
  var expectedValue = 'something';
  var storageKey = 'firebase:none:appId1';
  return goog.Promise.resolve()
      .then(function() {
        return manager.set(key, expectedValue, appId);
      })
      .then(function() {
        return manager.get(key, appId);
      })
      .then(function(value) {
        assertObjectEquals(expectedValue, value);
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return manager.remove(key, appId);
      })
      .then(function() {
        return manager.get(key, appId);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
      });
}


function testGetSet_persistentStorage() {
  var manager = getDefaultManagerInstance();
  var key = {name: 'persistent', persistent: 'local'};
  var expectedValue = 'something';
  var storageKey = 'firebase:persistent:appId1';
  return goog.Promise.resolve()
      .then(function() {
        return manager.set(key, expectedValue, appId);
      })
      .then(function() {
        return manager.get(key, appId);
      })
      .then(function(value) {
        assertObjectEquals(expectedValue, value);
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertObjectEquals(expectedValue, value);
        return manager.remove(key, appId);
      })
      .then(function() {
        return manager.get(key, appId);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
      });
}


function testMigrateFromLocalStorage_previouslyPersistedWithLocalStorage() {
  var manager = getDefaultManagerInstance();
  var key = {name: 'persistent', persistent: 'local'};
  var expectedValue = 'something';
  var storageKey = 'firebase:persistent:appId1';
  // Save expected value to window.localStorage initially.
  window.localStorage.setItem(storageKey, JSON.stringify(expectedValue));
  return manager.migrateFromLocalStorage(key, appId)
      .then(function() {
        return manager.get(key, appId);
      })
      .then(function(value) {
        // Data should be migrated from window.localStorage to mockLocalStorage.
        assertEquals(expectedValue, value);
        assertNull(window.localStorage.getItem(storageKey));
      });
}


function testMigrateFromLocalStorage_multiplePersistentStorage() {
  var manager = getDefaultManagerInstance();
  var key = {name: 'persistent', persistent: 'local'};
  var expectedValue = 'something';
  var expectedValue2 = 'somethingElse';
  var storageKey = 'firebase:persistent:appId1';
  // Save expected value to mockLocalStorage.
  mockLocalStorage.set(storageKey, expectedValue);
  // Save second expected value to window.localStorage.
  window.localStorage.setItem(storageKey, JSON.stringify(expectedValue2));
  return manager.migrateFromLocalStorage(key, appId)
      .then(function() {
        return manager.get(key, appId);
      })
      .then(function(value) {
        // mockLocalStorage will take precedence over window.localStorage.
        assertEquals(expectedValue, value);
        assertNull(window.localStorage.getItem(storageKey));
      });
}


function testGetSet_persistentStorage_noId() {
  var manager = getDefaultManagerInstance();
  var key = {name: 'persistent', persistent: 'local'};
  var expectedValue = 'something';
  var storageKey = 'firebase:persistent';
  return goog.Promise.resolve()
      .then(function() {
        return manager.set(key, expectedValue);
      })
      .then(function() {
        return manager.get(key);
      })
      .then(function(value) {
        assertObjectEquals(expectedValue, value);
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertObjectEquals(expectedValue, value);
        return manager.remove(key);
      })
      .then(function() {
        return manager.get(key);
      })
      .then(function(value) {
        assertUndefined(value);
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
      });
}


function testAddRemoveListeners_persistentStorage() {
  var manager =
      new fireauth.authStorage.Manager('name', ':', false, true, true);
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();
  var key1 = {'name': 'authUser', 'persistent': true};
  var key2 = {'name': 'authEvent', 'persistent': true};
  return goog.Promise.resolve()
      .then(function() {
        return mockLocalStorage.set('name:authUser:appId1', {'foo': 'bar'});
      })
      .then(function() {
        return mockLocalStorage.set('name:authEvent:appId1', {'foo': 'bar'});
      })
      .then(function() {
        // Add listeners for 2 events.
        manager.addListener(key1, 'appId1', listener1);
        manager.addListener(key2, 'appId1', listener2);
        manager.addListener(key1, 'appId1', listener3);
        var storageEvent = new goog.testing.events.Event(
            goog.events.EventType.STORAGE, window);
        // Trigger user event.
        storageEvent.key = 'name:authUser:appId1';
        storageEvent.newValue = null;
        mockLocalStorage.fireBrowserEvent(storageEvent);
        // Listener 1 and 3 should trigger.
        assertEquals(1, listener1.getCallCount());
        assertEquals(1, listener3.getCallCount());
        assertEquals(0, listener2.getCallCount());
        storageEvent = new goog.testing.events.Event(
            goog.events.EventType.STORAGE, window);
        // Trigger second event.
        storageEvent.key = 'name:authEvent:appId1';
        storageEvent.newValue = null;
        mockLocalStorage.fireBrowserEvent(storageEvent);
        // Only second listener should trigger.
        assertEquals(1, listener1.getCallCount());
        assertEquals(1, listener3.getCallCount());
        assertEquals(1, listener2.getCallCount());
        storageEvent = new goog.testing.events.Event(
            goog.events.EventType.STORAGE, window);
        // Some unknown event.
        storageEvent.key = 'key3';
        storageEvent.newValue = null;
        mockLocalStorage.fireBrowserEvent(storageEvent);
        // No listeners should trigger.
        assertEquals(1, listener1.getCallCount());
        assertEquals(1, listener3.getCallCount());
        assertEquals(1, listener2.getCallCount());
        // Remove all listeners.
        manager.removeListener(key1, 'appId1', listener1);
        manager.removeListener(key2, 'appId1', listener2);
        manager.removeListener(key1, 'appId1', listener3);
        // Trigger first event.
        storageEvent = new goog.testing.events.Event(
            goog.events.EventType.STORAGE, window);
        storageEvent.key = 'name:authUser:appId1';
        storageEvent.newValue = JSON.stringify({'foo': 'bar'});
        mockLocalStorage.fireBrowserEvent(storageEvent);
        // No change.
        assertEquals(1, listener1.getCallCount());
        assertEquals(1, listener3.getCallCount());
        assertEquals(1, listener2.getCallCount());
      });
}


function testAddRemoveListeners_localStorage() {
  stubs.reset();
  // localStorage is used when service workers are not supported.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {
        return false;
      });
  var manager =
      new fireauth.authStorage.Manager('name', ':', false, true, true);
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();
  var key1 = {'name': 'authUser', 'persistent': true};
  var key2 = {'name': 'authEvent', 'persistent': true};
  window.localStorage.setItem(
      'name:authUser:appId1', JSON.stringify({'foo': 'bar'}));
  window.localStorage.setItem(
      'name:authEvent:appId1', JSON.stringify({'foo': 'bar'}));
  // Add listeners for 2 events.
  manager.addListener(key1, 'appId1', listener1);
  manager.addListener(key2, 'appId1', listener2);
  manager.addListener(key1, 'appId1', listener3);
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  // Trigger user event.
  storageEvent.key = 'name:authUser:appId1';
  storageEvent.newValue = null;
  window.localStorage.removeItem('name:authUser:appId1');
  goog.testing.events.fireBrowserEvent(storageEvent);
  // Listener 1 and 3 should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(0, listener2.getCallCount());
  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  // Trigger second event.
  storageEvent.key = 'name:authEvent:appId1';
  storageEvent.newValue = null;
  window.localStorage.removeItem('name:authEvent:appId1');
  goog.testing.events.fireBrowserEvent(storageEvent);
  // Only second listener should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  // Some unknown event.
  storageEvent.key = 'key3';
  storageEvent.newValue = null;
  goog.testing.events.fireBrowserEvent(storageEvent);
  // No listeners should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
  // Remove all listeners.
  manager.removeListener(key1, 'appId1', listener1);
  manager.removeListener(key2, 'appId1', listener2);
  manager.removeListener(key1, 'appId1', listener3);
  // Trigger first event.
  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'name:authUser:appId1';
  window.localStorage.setItem(
      'name:authUser:appId1', JSON.stringify({'foo': 'bar'}));
  storageEvent.newValue = JSON.stringify({'foo': 'bar'});
  goog.testing.events.fireBrowserEvent(storageEvent);
  // No change.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
}


function testAddRemoveListeners_localStorage_nullKey() {
  stubs.reset();
  // Simulate localStorage is used for persistent storage.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {return false;});
  var manager =
      new fireauth.authStorage.Manager('name', ':', false, true, true);
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();
  var listener4 = goog.testing.recordFunction();
  var key1 = {'name': 'authUser', 'persistent': true};
  var key2 = {'name': 'authEvent', 'persistent': true};
  var key3 = {'name': 'other', 'persistent': true};
  // Save existing data for key1 and key2.
  var storageKey1 = 'name:authUser:appId1';
  window.localStorage.setItem(storageKey1, JSON.stringify({'foo': 'bar'}));
  var storageKey2 = 'name:authEvent:appId1';
  window.localStorage.setItem(storageKey2, JSON.stringify({'foo2': 'bar2'}));
  // Add listeners for 3 keys.
  manager.addListener(key1, 'appId1', listener1);
  manager.addListener(key2, 'appId1', listener2);
  manager.addListener(key1, 'appId1', listener3);
  manager.addListener(key3, 'appId1', listener4);
  // No listener should trigger initially.
  assertEquals(0, listener1.getCallCount());
  assertEquals(0, listener2.getCallCount());
  assertEquals(0, listener3.getCallCount());
  assertEquals(0, listener4.getCallCount());
  // Simulate a storage even will null key.
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  // Trigger event with null key (localStorage completely cleared via developer
  // tools).
  storageEvent.key = null;
  storageEvent.newValue = null;
  window.localStorage.removeItem(storageKey1);
  window.localStorage.removeItem(storageKey2);
  goog.testing.events.fireBrowserEvent(storageEvent);
  // Listener 1, 2 and 3 should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener2.getCallCount());
  assertEquals(1, listener3.getCallCount());
  // No change in key3 value.
  assertEquals(0, listener4.getCallCount());
}


function testAddRemoveListeners_localStorage_ie10() {
  stubs.reset();
  // Simulate localStorage is used for persistent storage.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {
        return false;
      });
  // Simulate IE 10 with localStorage events not synchronized.
  // event.newValue will not be immediately equal to
  // localStorage.getItem(event.key).
  stubs.replace(
      fireauth.util,
      'isIe10',
      function() {
        return true;
      });
  var manager =
      new fireauth.authStorage.Manager('name', ':', false, true, true);
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();
  var key1 = {'name': 'authUser', 'persistent': true};
  var key2 = {'name': 'authEvent', 'persistent': true};
  window.localStorage.setItem(
      'name:authUser:appId1', JSON.stringify({'foo': 'bar'}));
  window.localStorage.setItem(
      'name:authEvent:appId1', JSON.stringify({'foo': 'bar'}));
  window.localStorage.setItem('key3', JSON.stringify({'foo': 'bar'}));
  // Add listeners for 2 events.
  manager.addListener(key1, 'appId1', listener1);
  manager.addListener(key2, 'appId1', listener2);
  manager.addListener(key1, 'appId1', listener3);
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  // Trigger user event.
  storageEvent.key = 'name:authUser:appId1';
  storageEvent.oldValue = JSON.stringify({'foo': 'bar'});
  storageEvent.newValue = null;
  goog.testing.events.fireBrowserEvent(storageEvent);
  window.localStorage.removeItem('name:authUser:appId1');
  // Simulate some delay for localStorage event newValue to be available in
  // localStorage.getItem(event.key).
  clock.tick(fireauth.authStorage.IE10_LOCAL_STORAGE_SYNC_DELAY);
  // Listener 1 and 3 should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(0, listener2.getCallCount());
  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  // Trigger second event.
  storageEvent.key = 'name:authEvent:appId1';
  storageEvent.oldValue = JSON.stringify({'foo': 'bar'});
  storageEvent.newValue = null;
  goog.testing.events.fireBrowserEvent(storageEvent);
  window.localStorage.removeItem('name:authEvent:appId1');
  // Simulate some delay for localStorage event newValue to be available in
  // localStorage.getItem(event.key).
  clock.tick(fireauth.authStorage.IE10_LOCAL_STORAGE_SYNC_DELAY);
  // Only second listener should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  // Some unknown event.
  storageEvent.key = 'key3';
  storageEvent.oldValue = JSON.stringify({'foo': 'bar'});
  storageEvent.newValue = null;
  goog.testing.events.fireBrowserEvent(storageEvent);
  window.localStorage.removeItem('key3');
  // Simulate some delay for localStorage event newValue to be available in
  // localStorage.getItem(event.key).
  clock.tick(fireauth.authStorage.IE10_LOCAL_STORAGE_SYNC_DELAY);
  // No listeners should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
  // Remove all listeners.
  manager.removeListener(key1, 'appId1', listener1);
  manager.removeListener(key2, 'appId1', listener2);
  manager.removeListener(key1, 'appId1', listener3);
  // Trigger first event.
  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'name:authUser:appId1';
  storageEvent.newValue = JSON.stringify({'foo': 'bar'});
  storageEvent.oldValue = null;
  goog.testing.events.fireBrowserEvent(storageEvent);
  window.localStorage.setItem(
      'name:authUser:appId1', JSON.stringify({'foo': 'bar'}));
  // Simulate some delay for localStorage event newValue to be available in
  // localStorage.getItem(event.key).
  clock.tick(fireauth.authStorage.IE10_LOCAL_STORAGE_SYNC_DELAY);
  // No change.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
}


function testAddRemoveListeners_indexeddb() {
  stubs.reset();
  // Mock indexedDB local storage manager.
  var mockIndexeddb = {
    handlers: [],
    addStorageListener: function(indexeddbHandler) {
      mockIndexeddb.handlers.push(indexeddbHandler);
    },
    removeStorageListener: function(indexeddbHandler) {
      goog.array.remove(mockIndexeddb.handlers, indexeddbHandler);
    },
    trigger: function(key) {
      // Trigger all listeners on key.
      for (var i = 0; i < mockIndexeddb.handlers.length; i++) {
        // Trigger key change.
        mockIndexeddb.handlers[i]([key]);
      }
    }
  };
  // Simulate indexedDB is used for persistent storage.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {
        return true;
      });
  // Use mock indexedDB for hybrid indexedDB.
  stubs.replace(
      fireauth.storage,
      'HybridIndexedDB',
      function() {
        return mockIndexeddb;
      });
  var manager =
      new fireauth.authStorage.Manager('name', ':', false, true, true);
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();
  var key1 = {'name': 'authUser', 'persistent': true};
  var key2 = {'name': 'authEvent', 'persistent': true};
  // Add listeners for 2 events.
  manager.addListener(key1, 'appId1', listener1);
  manager.addListener(key2, 'appId1', listener2);
  manager.addListener(key1, 'appId1', listener3);
  // Trigger user event.
  mockIndexeddb.trigger('name:authUser:appId1');
  // Listener 1 and 3 should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(0, listener2.getCallCount());
  // Trigger second event.
  mockIndexeddb.trigger('name:authEvent:appId1');
  // Only second listener should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
  // Some unknown event.
  mockIndexeddb.trigger('key3');
  // No listeners should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
  // Remove all listeners.
  manager.removeListener(key1, 'appId1', listener1);
  manager.removeListener(key2, 'appId1', listener2);
  manager.removeListener(key1, 'appId1', listener3);
  // Trigger first event.
  mockIndexeddb.trigger('name:authUser:appId1');
  // No change.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
}


function testAddRemoveListeners_indexeddb_cannotRunInBackground() {
  // Even when app cannot run in the background and localStorage is not synced
  // between iframe and popup, polling web storage function should not be used.
  // indexedDB should be used.
  // Mock indexedDB local storage manager.
  stubs.reset();
  var mockIndexeddb = {
    handlers: [],
    addStorageListener: function(indexeddbHandler) {
      mockIndexeddb.handlers.push(indexeddbHandler);
    },
    removeStorageListener: function(indexeddbHandler) {
      goog.array.remove(mockIndexeddb.handlers, indexeddbHandler);
    },
    trigger: function(key) {
      // Trigger all listeners on key.
      for (var i = 0; i < mockIndexeddb.handlers.length; i++) {
        // Trigger key change.
        mockIndexeddb.handlers[i]([key]);
      }
    }
  };
  // Simulate indexedDB is used for persistent storage.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {
        return true;
      });
  // Use mock indexedDB for hybrid indexedDB.
  stubs.replace(
      fireauth.storage,
      'HybridIndexedDB',
      function() {
        return mockIndexeddb;
      });
  // Cannot run in the background.
  var manager =
      new fireauth.authStorage.Manager('name', ':', false, false, true);
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();
  var key1 = {'name': 'authUser', 'persistent': true};
  var key2 = {'name': 'authEvent', 'persistent': true};
  // Add listeners for 2 events.
  manager.addListener(key1, 'appId1', listener1);
  manager.addListener(key2, 'appId1', listener2);
  manager.addListener(key1, 'appId1', listener3);
  // Trigger user event.
  mockIndexeddb.trigger('name:authUser:appId1');
  // Listener 1 and 3 should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(0, listener2.getCallCount());
  // Trigger second event.
  mockIndexeddb.trigger('name:authEvent:appId1');
  // Only second listener should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
  // Some unknown event.
  mockIndexeddb.trigger('key3');
  // No listeners should trigger.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
  // Remove all listeners.
  manager.removeListener(key1, 'appId1', listener1);
  manager.removeListener(key2, 'appId1', listener2);
  manager.removeListener(key1, 'appId1', listener3);
  // Trigger first event.
  mockIndexeddb.trigger('name:authUser:appId1');
  // No change.
  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(1, listener2.getCallCount());
}


function testSafariLocalStorageSync_newEvent() {
  stubs.reset();
  // Simulate persistent state implemented through localStorage for Safari.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {return false;});
  var manager =
      new fireauth.authStorage.Manager('firebase', ':', true, true, true);
  // Simulate Safari bug.
  stubs.replace(
      fireauth.util,
      'isSafariLocalStorageNotSynced',
      function() {return true;});
  var key1 = {'name': 'authEvent', 'persistent': true};
  var listener1 = goog.testing.recordFunction();
  var expectedEvent = {
      type: 'signInViaPopup',
      eventId: '1234',
      callbackUrl: 'http://www.example.com/#oauthResponse',
      sessionId: 'SESSION_ID'
  };
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'firebase:authEvent:appId1';
  // New Auth event.
  storageEvent.oldValue = null;
  storageEvent.newValue = JSON.stringify(expectedEvent);
  manager.addListener(key1, 'appId1', listener1);
  // This should force localStorage sync.
  goog.testing.events.fireBrowserEvent(storageEvent);
  // Auth event should be synchronized.
  assertEquals(
      storageEvent.newValue,
      window.localStorage.getItem(storageEvent.key));
  assertEquals(1, listener1.getCallCount());
  manager.removeListener(key1, 'appId1', listener1);
  goog.testing.events.fireBrowserEvent(storageEvent);
  // No further call.
  assertEquals(1, listener1.getCallCount());
}


function testSafariLocalStorageSync_cannotRunInBackground() {
  stubs.reset();
  // Simulate persistent state implemented through localStorage for Safari.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {return false;});
  // This simulates iframe embedded in a cross origin domain.
  // Realistically only storage event should trigger here.
  // Test when new data is added to storage.
  var manager =
      new fireauth.authStorage.Manager('firebase', ':', true, false, true);
  // Simulate Safari bug.
  stubs.replace(
      fireauth.util,
      'isSafariLocalStorageNotSynced',
      function() {return true;});
  var key1 = {'name': 'authEvent', 'persistent': true};
  var listener1 = goog.testing.recordFunction();
  var expectedEvent = {
      type: 'signInViaPopup',
      eventId: '1234',
      callbackUrl: 'http://www.example.com/#oauthResponse',
      sessionId: 'SESSION_ID'
  };
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'firebase:authEvent:appId1';
  // New Auth event.
  storageEvent.oldValue = null;
  storageEvent.newValue = JSON.stringify(expectedEvent);
  manager.addListener(key1, 'appId1', listener1);
  // This should force localStorage sync.
  goog.testing.events.fireBrowserEvent(storageEvent);
  // Auth event should be synchronized.
  assertEquals(
      storageEvent.newValue,
      window.localStorage.getItem(storageEvent.key));
  assertEquals(1, listener1.getCallCount());
  manager.removeListener(key1, 'appId1', listener1);
  goog.testing.events.fireBrowserEvent(storageEvent);
  // No further call.
  assertEquals(1, listener1.getCallCount());
}


function testSafariLocalStorageSync_deletedEvent() {
  stubs.reset();
  // Simulate persistent state implemented through localStorage for Safari.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {return false;});
  // This simulates iframe embedded in a cross origin domain.
  // Realistically only storage event should trigger here.
  // Test when old data is deleted from storage.
  var manager =
      new fireauth.authStorage.Manager('firebase', ':', true, true, true);
  var key1 = {'name': 'authEvent', 'persistent': true};
  // Simulate Safari bug.
  stubs.replace(
      fireauth.util,
      'isSafariLocalStorageNotSynced',
      function() {return true;});
  var listener1 = goog.testing.recordFunction();
  var expectedEvent = {
      type: 'signInViaPopup',
      eventId: '1234',
      callbackUrl: 'http://www.example.com/#oauthResponse',
      sessionId: 'SESSION_ID'
  };
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'firebase:authEvent:appId1';
  // Deleted Auth event.
  storageEvent.oldValue = JSON.stringify(expectedEvent);
  storageEvent.newValue = null;
  window.localStorage.setItem(storageEvent.key, storageEvent.oldValue);
  manager.addListener(key1, 'appId1', listener1);
  // This should force localStorage sync.
  goog.testing.events.fireBrowserEvent(storageEvent);
  // Auth event should be synchronized.
  assertNull(window.localStorage.getItem(storageEvent.key));
  assertEquals(1, listener1.getCallCount());
  manager.removeListener(key1, 'appId1', listener1);
  goog.testing.events.fireBrowserEvent(storageEvent);
  // No further call.
  assertEquals(1, listener1.getCallCount());
}


function testRunsInBackground_storageEventMode() {
  // Test when browser does not run in the background while another tab is in
  // foreground.
  // Test when storage event is first detected. Polling should be disabled to
  // prevent duplicate storage detection.
  stubs.reset();
  // Simulate localStorage is used for persistent storage.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {return false;});
  var key = {name: 'authEvent', persistent: 'local'};
  var storageKey = 'firebase:authEvent:appId1';
  var manager = new fireauth.authStorage.Manager(
      'firebase', ':', false, false, true);
  var listener1 = goog.testing.recordFunction();
  var expectedEvent = {
      type: 'signInViaPopup',
      eventId: '1234',
      callbackUrl: 'http://www.example.com/#oauthResponse',
      sessionId: 'SESSION_ID'
  };
  // Simulate storage event.
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'firebase:authEvent:appId1';
  // New Auth event.
  storageEvent.oldValue = null;
  storageEvent.newValue = JSON.stringify(expectedEvent);

  // Add listener.
  manager.addListener(key, appId, listener1);
  // Test that storage event listener is not set.
  // This should not be detected.
  window.localStorage.setItem(
      storageKey, JSON.stringify(expectedEvent));
  goog.testing.events.fireBrowserEvent(storageEvent);
  // Listener should trigger.
  assertEquals(1, listener1.getCallCount());
  // Clear storage.
  window.localStorage.clear();
  // Save Auth event and confirm listener not triggered.
  // This simulates polling.
  window.localStorage.setItem(
      storageKey, JSON.stringify(expectedEvent));
  // Run clock.
  clock.tick(1000);
  // Duplicate polling event should not trigger.
  assertEquals(1, listener1.getCallCount());
  // Remove listener.
  manager.removeListener(key, appId, listener1);
  // Simulate another storage to same item.
  goog.testing.events.fireBrowserEvent(storageEvent);
  // Listener should not be triggered as it has been removed.
  assertEquals(1, listener1.getCallCount());
}


function testRunsInBackground_webStorageNotSupported() {
  // Test when browser does not run in the background and web storage is not
  // supported. Polling should not be turned on.
  var key = {name: 'authEvent', persistent: 'local'};
  var storageKey = 'firebase:authEvent:appId1';
  // Simulate manager doesn't support web storage and can't run in the
  // background. Normally when a browser can't run in the background, polling is
  // enabled.
  var manager = new fireauth.authStorage.Manager(
      'firebase', ':', false, false, false);
  var listener1 = goog.testing.recordFunction();
  var expectedEvent = {
      type: 'signInViaPopup',
      eventId: '1234',
      callbackUrl: 'http://www.example.com/#oauthResponse',
      sessionId: 'SESSION_ID'
  };

  // Add listener.
  manager.addListener(key, appId, listener1);
  // Test that polling function is not set by updating localStorage with some
  // data. This should not happen realistically when web storage is disabled.
  window.localStorage.setItem(storageKey, JSON.stringify(expectedEvent));
  // Run clock.
  clock.tick(1000);
  // Listener should not trigger.
  assertEquals(0, listener1.getCallCount());
  // Clear storage.
  window.localStorage.clear();
  // Run clock.
  clock.tick(1000);
  // Listener should not trigger.
  assertEquals(0, listener1.getCallCount());
  // Save Auth event and confirm listener not triggered.
  // This normally simulates polling.
  window.localStorage.setItem(storageKey, JSON.stringify(expectedEvent));
  // Run clock.
  clock.tick(1000);
  // Listener should not trigger.
  assertEquals(0, listener1.getCallCount());
}


function testRunsInBackground_pollingMode() {
  stubs.reset();
  // Simulate localStorage is used for persistent storage.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {return false;});
  // Test when browser does not run in the background while another tab is in
  // foreground.
  // Test when storage polling first detects a storage notification.
  // Storage event listener should be disabled to prevent duplicate storage
  // detection.
  var key = {name: 'authEvent', persistent: 'local'};
  var storageKey = 'firebase:authEvent:appId1';
  var manager = new fireauth.authStorage.Manager(
      'firebase', ':', false, false, true);
  var listener1 = goog.testing.recordFunction();
  var expectedEvent = {
      type: 'signInViaPopup',
      eventId: '1234',
      callbackUrl: 'http://www.example.com/#oauthResponse',
      sessionId: 'SESSION_ID'
  };
  // Simulate storage event. Don't trigger yet.
  var storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'firebase:authEvent:appId1';
  // New auth event.
  storageEvent.oldValue = null;
  storageEvent.newValue = JSON.stringify(expectedEvent);

  // Add listener.
  manager.addListener(key, appId, listener1);
  // Simulate storage update in some other tab and storage event not
  // triggered.
  window.localStorage.setItem(
      storageKey, JSON.stringify(expectedEvent));
  // Run clock.
  clock.tick(1000);
  // Listener should be triggered.
  assertEquals(1, listener1.getCallCount());
  // Test that duplicate storage event is ignored.
  // This should not be detected.
  goog.testing.events.fireBrowserEvent(storageEvent);
  window.localStorage.setItem(
      storageKey, JSON.stringify(expectedEvent));
  // Listener should not trigger.
  assertEquals(1, listener1.getCallCount());
  // Remove listener.
  manager.removeListener(key, appId, listener1);
  // Simulate another storage to same item.
  window.localStorage.removeItem(storageKey);
  // Run clock.
  clock.tick(1000);
  // Listener should not be triggered as it has been removed.
  assertEquals(1, listener1.getCallCount());
}


function testRunsInBackground_currentTabChangesIgnored() {
  stubs.reset();
  // Simulate localStorage is used for persistent storage.
  stubs.replace(
      fireauth.util,
      'persistsStorageWithIndexedDB',
      function() {return false;});
  // Test when browser does not run in the background while another tab is in
  // foreground.
  // This tests that only other tab changes are detected and current tab changes
  // are ignored.
  var key = {name: 'authEvent', persistent: 'local'};
  var storageKey = 'firebase:authEvent:appId1';
  var manager = new fireauth.authStorage.Manager(
      'firebase', ':', false, false, true);
  var listener1 = goog.testing.recordFunction();
  var expectedEvent = {
      type: 'signInViaPopup',
      eventId: '1234',
      callbackUrl: 'http://www.example.com/#oauthResponse',
      sessionId: 'SESSION_ID'
  };
  // Add listener.
  manager.addListener(key, appId, listener1);
  // Save Auth event and confirm listener not triggered.
  return manager.set(key, expectedEvent, appId).then(function() {
    // Changes in same tab should not trigger listener.
    assertEquals(0, listener1.getCallCount());
    // Delete Auth event and confirm listener not triggered.
    return manager.remove(key, appId);
  }).then(function() {
    // Changes in same tab should not trigger listener.
    assertEquals(0, listener1.getCallCount());
    // Simulate storage update in some other tab and storage event not
    // triggered.
    window.localStorage.setItem(
        storageKey, JSON.stringify(expectedEvent));
    // Run clock.
    clock.tick(1000);
    // Listener should be triggered.
    assertEquals(1, listener1.getCallCount());
    // Remove listener.
    manager.removeListener(key, appId, listener1);
    // Simulate another storage to same item.
    window.localStorage.removeItem(storageKey);
    // Run clock.
    clock.tick(1000);
    // Listener should not be triggered as it has been removed.
    assertEquals(1, listener1.getCallCount());
  });
}
