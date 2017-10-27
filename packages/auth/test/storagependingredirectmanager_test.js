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
 * @fileoverview Tests for storagependingredirectmanager.js
 */

goog.provide('fireauth.storage.PendingRedirectManagerTest');

goog.require('fireauth.authStorage');
goog.require('fireauth.storage.PendingRedirectManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.storage.PendingRedirectManagerTest');


var appId = 'appId1';
var stubs = new goog.testing.PropertyReplacer();


function setUp() {
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
        assertEquals(
            window.sessionStorage.getItem(storageKey),
            JSON.stringify('pending'));
        assertTrue(status);
        return pendingRedirectManager.removePendingStatus();
      })
      .then(function() {
        assertNull(window.sessionStorage.getItem(storageKey));
        return pendingRedirectManager.getPendingStatus();
      })
      .then(function(status) {
        assertFalse(status);
      });
}
