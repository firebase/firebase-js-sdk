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
 * @fileoverview Tests for storageoauthhandlermanager.js
 */

goog.provide('fireauth.storage.OAuthHandlerManagerTest');

goog.require('fireauth.AuthEvent');
goog.require('fireauth.OAuthHelperState');
goog.require('fireauth.authStorage');
goog.require('fireauth.storage.OAuthHandlerManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.storage.OAuthHandlerManagerTest');


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


function testGetSetRemoveSessionId() {
  var storageManager = getDefaultStorageManagerInstance();
  var oauthHandlerManager =
      new fireauth.storage.OAuthHandlerManager(storageManager);
  var expectedSessionId = 'g43g4ngh4hhk4hn042rj290rg4g4';
  var storageKey = 'firebase:sessionId:appId1';
  return goog.Promise.resolve()
      .then(function() {
        return oauthHandlerManager.setSessionId(appId, expectedSessionId);
      })
      .then(function() {
        return oauthHandlerManager.getSessionId(appId);
      })
      .then(function(sessionId) {
        assertEquals(
            window.sessionStorage.getItem(storageKey),
            JSON.stringify(expectedSessionId));
        assertObjectEquals(expectedSessionId, sessionId);
      })
      .then(function() {
        return oauthHandlerManager.removeSessionId(appId);
      })
      .then(function() {
        assertNull(window.sessionStorage.getItem(storageKey));
        return oauthHandlerManager.getSessionId(appId);
      })
      .then(function(sessionId) {
        assertUndefined(sessionId);
      });
}


function testSetAuthEvent() {
  var storageManager = getDefaultStorageManagerInstance();
  var oauthHandlerManager =
      new fireauth.storage.OAuthHandlerManager(storageManager);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'signInViaPopup',
      '1234',
      'http://www.example.com/#oauthResponse',
      'SESSION_ID');
  return goog.Promise.resolve()
      .then(function() {
        return oauthHandlerManager.setAuthEvent(appId, expectedAuthEvent);
      })
      .then(function() {
        assertEquals(
            JSON.stringify(expectedAuthEvent.toPlainObject()),
            window.localStorage.getItem(
                'firebase:authEvent:appId1'));
      });
}


function testSetRedirectEvent() {
  var storageManager = getDefaultStorageManagerInstance();
  var oauthHandlerManager =
      new fireauth.storage.OAuthHandlerManager(storageManager);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'signInViaRedirect',
      null,
      'http://www.example.com/#oauthResponse',
      'SESSION_ID');
  return goog.Promise.resolve()
      .then(function() {
        return oauthHandlerManager.setRedirectEvent(appId, expectedAuthEvent);
      })
      .then(function() {
        assertEquals(
            JSON.stringify(expectedAuthEvent.toPlainObject()),
            window.sessionStorage.getItem(
                'firebase:redirectEvent:appId1'));
      });
}


function testGetSetRemoveOAuthHelperState() {
  var storageManager = getDefaultStorageManagerInstance();
  var oauthHandlerManager =
      new fireauth.storage.OAuthHandlerManager(storageManager);
  var expectedState = new fireauth.OAuthHelperState(
      'API_KEY',
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      '12345678',
      'http://www.example.com/redirect');
  var storageKey = 'firebase:oauthHelperState';
  return goog.Promise.resolve()
      .then(function() {
        return oauthHandlerManager.setOAuthHelperState(expectedState);
      })
      .then(function() {
        return oauthHandlerManager.getOAuthHelperState();
      })
      .then(function(state) {
        assertEquals(
            window.sessionStorage.getItem(storageKey),
            JSON.stringify(expectedState.toPlainObject()));
        assertObjectEquals(expectedState, state);
      })
      .then(function() {
        return oauthHandlerManager.removeOAuthHelperState();
      })
      .then(function() {
        assertNull(window.sessionStorage.getItem(storageKey));
        return oauthHandlerManager.getOAuthHelperState();
      })
      .then(function(state) {
        assertNull(state);
      });
}
