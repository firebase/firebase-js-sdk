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

/**
 * @fileoverview Tests for storageautheventmanager.js
 */

goog.provide('fireauth.storage.AuthEventManagerTest');

goog.require('fireauth.AuthEvent');
goog.require('fireauth.authStorage');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.storage.AuthEventManager');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.events');
goog.require('goog.testing.events.Event');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.storage.AuthEventManagerTest');


var appId = 'appId1';
var stubs = new goog.testing.PropertyReplacer();
var mockLocalStorage;
var mockSessionStorage;


function setUp() {
  // Create new mock storages for persistent and temporary storage before each
  // test.
  mockLocalStorage = new fireauth.storage.MockStorage();
  mockSessionStorage = new fireauth.storage.MockStorage();
  fireauth.common.testHelper.installMockStorages(
      stubs, mockLocalStorage, mockSessionStorage);
  // Simulate browser that synchronizes between and iframe and a popup.
  stubs.replace(
     fireauth.util,
      'isLocalStorageNotSynchronized',
      function() {
        return false;
      });
  window.localStorage.clear();
  window.sessionStorage.clear();
}


function tearDown() {
  stubs.reset();
}


/**
 * @return {!fireauth.authStorage.Manager} The default local storage
 *     synchronized manager instance used for testing.
 */
function getDefaultStorageManagerInstance() {
  return new fireauth.authStorage.Manager('firebase', ':', false, true);
}


function testGetSetRemoveAuthEvent() {
  var storageManager = getDefaultStorageManagerInstance();
  var authEventManager =
      new fireauth.storage.AuthEventManager(appId, storageManager);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'signInViaPopup',
      '1234',
      'http://www.example.com/#oauthResponse',
      'SESSION_ID');
  var storageKey = 'firebase:authEvent:appId1';
  return goog.Promise.resolve()
      .then(function() {
        // Set expected Auth event in localStorage.
        return mockLocalStorage.set(
            storageKey, expectedAuthEvent.toPlainObject());
      })
      .then(function() {
        return authEventManager.getAuthEvent();
      })
      .then(function(authEvent) {
        assertObjectEquals(expectedAuthEvent, authEvent);
      })
      .then(function() {
        return authEventManager.removeAuthEvent();
      })
      .then(function() {
        return mockLocalStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return authEventManager.getAuthEvent();
      })
      .then(function(authEvent) {
        assertNull(authEvent);
      });
}


function testGetSetRemoveRedirectEvent() {
  var storageManager = getDefaultStorageManagerInstance();
  var authEventManager =
      new fireauth.storage.AuthEventManager(appId, storageManager);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'signInViaRedirect',
      null,
      'http://www.example.com/#oauthResponse',
      'SESSION_ID');
  // Set expected Auth event in sessionStorage.
  mockSessionStorage.set(
      'firebase:redirectEvent:appId1',
      expectedAuthEvent.toPlainObject());
  var storageKey = 'firebase:redirectEvent:appId1';
  return goog.Promise.resolve()
      .then(function() {
        return authEventManager.getRedirectEvent();
      })
      .then(function(authEvent) {
        assertObjectEquals(expectedAuthEvent, authEvent);
      })
      .then(function() {
        return authEventManager.removeRedirectEvent();
      })
      .then(function() {
        return mockSessionStorage.get(storageKey);
      })
      .then(function(value) {
        assertUndefined(value);
        return authEventManager.getRedirectEvent();
      })
      .then(function(authEvent) {
        assertNull(authEvent);
      });
}


function testAddRemoveAuthEventListener() {
  var expectedAuthEvent = new fireauth.AuthEvent(
      'signInViaRedirect',
      null,
      'http://www.example.com/#oauthResponse',
      'SESSION_ID');
  var storageManager = getDefaultStorageManagerInstance();
  var authEventManager =
      new fireauth.storage.AuthEventManager('appId1', storageManager);
  var listener = goog.testing.recordFunction();
  // Save existing Auth events for appId1 and appId2.
  return goog.Promise.resolve()
      .then(function() {
        return mockLocalStorage.set(
            'firebase:authEvent:appId1', expectedAuthEvent.toPlainObject());
      })
      .then(function() {
        // Set expected Auth event in localStorage.
        return mockLocalStorage.set(
            'firebase:authEvent:appId2', expectedAuthEvent.toPlainObject());
      })
      .then(function() {
        authEventManager.addAuthEventListener(listener);
        // Simulate appId1 event deletion.
        storageEvent = new goog.testing.events.Event(
            goog.events.EventType.STORAGE, window);
        storageEvent.key = 'firebase:authEvent:appId1';
        storageEvent.newValue = null;
        // This should trigger listener.
        mockLocalStorage.fireBrowserEvent(storageEvent);
        assertEquals(1, listener.getCallCount());
        // Simulate appId2 event deletion.
        storageEvent.key = 'firebase:authEvent:appId2';
        // This should not trigger listener.
        mockLocalStorage.fireBrowserEvent(storageEvent);
        assertEquals(1, listener.getCallCount());
        // Remove listener.
        authEventManager.removeAuthEventListener(listener);
        // Simulate new event saved for appId1.
        // This should not trigger listener anymore.
        storageEvent.key = 'firebase:authEvent:appId1';
        storageEvent.oldValue = null;
        storageEvent.newValue =
            JSON.stringify(expectedAuthEvent.toPlainObject());
        mockLocalStorage.fireBrowserEvent(storageEvent);
        assertEquals(1, listener.getCallCount());
      });
}
