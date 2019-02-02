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
 * @fileoverview Tests for storagependingredirectmanager.js
 */

goog.provide('fireauth.storage.PendingRedirectManagerTest');

goog.require('fireauth.authStorage');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.PendingRedirectManager');
goog.require('goog.Promise');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.storage.PendingRedirectManagerTest');


var appId = 'appId1';
var stubs = new goog.testing.PropertyReplacer();
var mockLocalStorage;
var mockSessionStorage;


function setUp() {
  // Create new mock storages for persistent and temporary storage before each
  // test.
  mockLocalStorage = new fireauth.storage.MockStorage();
  mockSessionStorage = new fireauth.storage.MockStorage();
  window.localStorage.clear();
  window.sessionStorage.clear();
  fireauth.common.testHelper.installMockStorages(
      stubs, mockLocalStorage, mockSessionStorage);
}


/**
 * @return {!fireauth.authStorage.Manager} The default local storage
 *     synchronized manager instance used for testing.
 */
function getDefaultStorageManagerInstance() {
  return new fireauth.authStorage.Manager('firebase', ':', false, true);
}


function testGetSetPendingStatus() {
  var storageManager = getDefaultStorageManagerInstance();
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(appId, storageManager);
  var storageKey = 'firebase:pendingRedirect:appId1';
  return goog.Promise.resolve()
      .then(function() {
        return pendingRedirectManager.setPendingStatus();
      })
      .then(function() {
        return pendingRedirectManager.getPendingStatus();
      })
      .then(function(status) {
        assertTrue(status);
        return mockSessionStorage.get(storageKey);
      }).then(function(value) {
        assertEquals('pending', value);
        return pendingRedirectManager.removePendingStatus();
      })
      .then(function() {
        return mockSessionStorage.get(storageKey);
      }).then(function(value) {
        assertUndefined(value);
        return pendingRedirectManager.getPendingStatus();
      })
      .then(function(status) {
        assertFalse(status);
      });
}
