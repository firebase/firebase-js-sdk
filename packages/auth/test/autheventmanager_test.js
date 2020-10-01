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
 * @fileoverview Tests for autheventmanager.js
 */

goog.provide('fireauth.AuthEventManagerTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.AuthEventManager');
goog.require('fireauth.CordovaHandler');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.InvalidOriginError');
goog.require('fireauth.PopupAuthEventProcessor');
goog.require('fireauth.RedirectAuthEventProcessor');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.UniversalLinkSubscriber');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.OAuthHandlerManager');
goog.require('fireauth.storage.PendingRedirectManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.crypt');
goog.require('goog.crypt.Sha256');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.AuthEventManagerTest');


var handler;
var stubs = new goog.testing.PropertyReplacer();
var appName1 = 'APP1';
var apiKey1 = 'API_KEY1';
var authDomain1 = 'subdomain1.firebaseapp.com';
var appName2 = 'APP2';
var apiKey2 = 'API_KEY2';
var authDomain2 = 'subdomain2.firebaseapp.com';
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
// Firebase SDK version in case not available.
firebase.SDK_VERSION = firebase.SDK_VERSION || '3.0.0';
var clock;
var expectedVersion;
var universalLinks;
var BuildInfo;
var cordova;
var OAuthSignInHandler;
var androidUA = 'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Buil' +
    'd/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Sa' +
    'fari/534.30';
var savePartialEventManager;
var timeoutDelay = 30000;
var mockControl;
var ignoreArgument;
var mockLocalStorage;
var mockSessionStorage;

function setUp() {
  // Create new mock storages for persistent and temporary storage before each
  // test.
  mockLocalStorage = new fireauth.storage.MockStorage();
  mockSessionStorage = new fireauth.storage.MockStorage();
  mockControl = new goog.testing.MockControl();
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl.$resetAll();
  handler = {
    'canHandleAuthEvent': goog.testing.recordFunction(),
    'resolvePendingPopupEvent': goog.testing.recordFunction(),
    'getAuthEventHandlerFinisher': goog.testing.recordFunction()
  };
  fireauth.common.testHelper.installMockStorages(
      stubs, mockLocalStorage, mockSessionStorage);
  // Default OAuth sign in handler is IfcHandler.
  setOAuthSignInHandlerEnvironment(false);
}


function tearDown() {
  fireauth.AuthEventManager.manager_ = {};
  window.localStorage.clear();
  window.sessionStorage.clear();
  stubs.reset();
  goog.dispose(clock);
  // Clear plugins.
  universalLinks = {};
  BuildInfo = {};
  cordova = {};
  cordovaHandler = null;
  OAuthSignInHandler = null;
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
  fireauth.UniversalLinkSubscriber.clear();
}


/**
 * @param {string} str The string to hash.
 * @return {string} The hashed string.
 */
function sha256(str) {
  var sha256 = new goog.crypt.Sha256();
  sha256.update(str);
  return goog.crypt.byteArrayToHex(sha256.digest());
}


/**
 * Utility function to initialize the Cordova mock plugins.
 * @param {?function(?string, function(!Object))} subscribe The universal link
 *     subscriber.
 * @param {?string} packageName The package name.
 * @param {?string} displayName The app display name.
 * @param {boolean} isAvailable Whether browsertab is supported.
 * @param {?function(string, ?function(), ?function())} openUrl The URL opener.
 * @param {?function()} close The browsertab closer if applicable.
 * @param {?function()} open The inappbrowser opener if available.
 */
function initializePlugins(
    subscribe, packageName, displayName, isAvailable, openUrl, close, open) {
  // Initializes all mock plugins.
  universalLinks = {
    subscribe: subscribe
  };
  BuildInfo = {
    packageName: packageName,
    displayName: displayName
  };
  cordova = {
    plugins: {
      browsertab: {
        isAvailable: function(cb) {
          cb(isAvailable);
        },
        openUrl: openUrl,
        close: close
      }
    },
    InAppBrowser: {
      open:  open
    }
  };
}


/**
 * Helper function to set the current OAuth sign in handler.
 * @param {boolean} isCordova Whether to simulate a Cordova environment.
 */
function setOAuthSignInHandlerEnvironment(isCordova) {
  stubs.replace(
      fireauth.util,
      'isAndroidOrIosCordovaScheme',
      function() {
        return isCordova;
      });
  stubs.replace(
      fireauth.util,
      'checkIfCordova',
      function() {
        if (isCordova) {
          return goog.Promise.resolve();
        } else {
          return goog.Promise.reject();
        }
      });
  if (isCordova) {
    OAuthSignInHandler = fireauth.CordovaHandler;
    // Storage manager helpers.
    savePartialEventManager = new fireauth.storage.OAuthHandlerManager();
    // Simulate Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Initialize plugins.
    initializePlugins(
        goog.testing.recordFunction(),
        'com.example.app',
        'Test App',
        true,
        goog.testing.recordFunction(),
        goog.testing.recordFunction(),
        goog.testing.recordFunction());
  } else {
    OAuthSignInHandler = fireauth.iframeclient.IfcHandler;
    // Override iframewrapper to prevent iframe from being embedded in tests.
    stubs.replace(fireauth.iframeclient, 'IframeWrapper', function(url) {
      return {
        registerEvent: function(eventName, callback) {},
        onReady: function() { return goog.Promise.resolve(); }
      };
    });
    // Assume origin is a valid one.
    stubs.replace(
        fireauth.RpcHandler.prototype,
        'getAuthorizedDomains',
        function() {
          var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
          var domain = uri.getDomain();
          return goog.Promise.resolve([domain]);
        });
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


function testGetManager() {
  var manager1 = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  assertEquals(
      fireauth.AuthEventManager.manager_[
        fireauth.AuthEventManager.getKey_(apiKey1, appName1)],
      manager1);
  assertEquals(
      fireauth.AuthEventManager.getManager(authDomain1, apiKey1, appName1),
      manager1);
  var manager2 = fireauth.AuthEventManager.getManager(
      authDomain2, apiKey2, appName2);
  assertEquals(
      fireauth.AuthEventManager.manager_[
        fireauth.AuthEventManager.getKey_(apiKey2, appName2)],
      manager2);
  assertEquals(
      fireauth.AuthEventManager.getManager(authDomain2, apiKey2, appName2),
      manager2);
  var emulatorConfig = {
    url: 'http://emulator.test.domain:1234'
  };
  var managerWithEmulator = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1, emulatorConfig);
  assertEquals(
      fireauth.AuthEventManager.manager_[
      fireauth.AuthEventManager.getKey_(apiKey1, appName1)],
      manager1);
  assertEquals(
      fireauth.AuthEventManager.manager_[
      fireauth.AuthEventManager.getKey_(apiKey1, appName1, emulatorConfig)],
      managerWithEmulator);
}


function testInstantiateOAuthSignInHandler_ifcHandler() {
  // Simulate browser environment.
  setOAuthSignInHandlerEnvironment(false);
  // IfcHandler should be instantiated.
  var ifcHandler = mockControl.createStrictMock(
      fireauth.iframeclient.IfcHandler);
  var ifcHandlerConstructor = mockControl.createConstructorMock(
      fireauth.iframeclient, 'IfcHandler');
  // Confirm expected endpoint used.
  ifcHandlerConstructor(
      authDomain1, apiKey1, appName1, firebase.SDK_VERSION,
      fireauth.constants.Endpoint.STAGING.id, ignoreArgument).$returns(ifcHandler);
  mockControl.$replayAll();

  fireauth.AuthEventManager.instantiateOAuthSignInHandler(
        authDomain1, apiKey1, appName1, firebase.SDK_VERSION,
        fireauth.constants.Endpoint.STAGING.id);
}


/** Asserts that emulator config is propagated to ifcHandler. */
function testInstantiateOAuthSignInHandler_ifcHandler_withEmulator() {
  // Simulate browser environment.
  setOAuthSignInHandlerEnvironment(false);
  // IfcHandler should be instantiated.
  var ifcHandler = mockControl.createStrictMock(
    fireauth.iframeclient.IfcHandler);
  var ifcHandlerConstructor = mockControl.createConstructorMock(
    fireauth.iframeclient, 'IfcHandler');
  var emulatorConfig = {
    url: 'http://emulator.test.domain:1234'
  };
  // Confirm expected endpoint used.
  ifcHandlerConstructor(
    authDomain1, apiKey1, appName1, firebase.SDK_VERSION,
    fireauth.constants.Endpoint.STAGING.id,
    emulatorConfig).$returns(ifcHandler);
  mockControl.$replayAll();

  fireauth.AuthEventManager.instantiateOAuthSignInHandler(
    authDomain1, apiKey1, appName1, firebase.SDK_VERSION,
    fireauth.constants.Endpoint.STAGING.id, emulatorConfig);
}


function testInstantiateOAuthSignInHandler_cordovaHandler() {
  // Simulate Cordova environment
  setOAuthSignInHandlerEnvironment(true);
  // CordovaHandler should be instantiated.
  var cordovaHandler = mockControl.createStrictMock(
      fireauth.CordovaHandler);
  var cordovaHandlerConstructor = mockControl.createConstructorMock(
      fireauth, 'CordovaHandler');
  // Confirm expected endpoint used.
  cordovaHandlerConstructor(
      authDomain1, apiKey1, appName1, firebase.SDK_VERSION, undefined,
      undefined, fireauth.constants.Endpoint.STAGING.id, ignoreArgument)
      .$returns(cordovaHandler);
  mockControl.$replayAll();

  fireauth.AuthEventManager.instantiateOAuthSignInHandler(
        authDomain1, apiKey1, appName1, firebase.SDK_VERSION,
        fireauth.constants.Endpoint.STAGING.id);
}


/** Asserts that emulator config is propagated to cordovaHandler. */
function testInstantiateOAuthSignInHandler_cordovaHandler_withEmulator() {
  // Simulate Cordova environment
  setOAuthSignInHandlerEnvironment(true);
  // CordovaHandler should be instantiated.
  var cordovaHandler = mockControl.createStrictMock(
    fireauth.CordovaHandler);
  var cordovaHandlerConstructor = mockControl.createConstructorMock(
    fireauth, 'CordovaHandler');
  var emulatorConfig = {
    url: 'http://emulator.test.domain:1234'
  };
  // Confirm expected endpoint used.
  cordovaHandlerConstructor(
    authDomain1, apiKey1, appName1, firebase.SDK_VERSION, undefined,
    undefined, fireauth.constants.Endpoint.STAGING.id, emulatorConfig)
    .$returns(cordovaHandler);
  mockControl.$replayAll();

  fireauth.AuthEventManager.instantiateOAuthSignInHandler(
    authDomain1, apiKey1, appName1, firebase.SDK_VERSION,
    fireauth.constants.Endpoint.STAGING.id, emulatorConfig);
}


function testAuthEventManager_initialize_manually_withSubscriber() {
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup', '1234', 'http://www.example.com/#response', 'SESSION_ID');
  // This test is not environment specific.
  stubs.replace(
      fireauth.AuthEventManager,
      'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName, version) {
        assertEquals('subdomain1.firebaseapp.com', authDomain);
        assertEquals('API_KEY1', apiKey);
        assertEquals('APP1', appName);
        assertEquals(firebase.SDK_VERSION, version);
        return {
          'addAuthEventListener': function(handler) {
            asyncTestCase.signal();
            // Trigger immediately to test that handleAuthEvent_
            // is triggered with expected event.
            handler(expectedAuthEvent);
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() {
            return false;
          },
          'hasVolatileStorage': function() {
            return false;
          }
        };
      });
  var handler1 = {
    'canHandleAuthEvent': function(type, id) {
      // Auth event should be passed to handler to check if it can handle it.
      assertEquals('linkViaPopup', type);
      assertEquals('1234', id);
      asyncTestCase.signal();
      return false;
    },
    'resolvePendingPopupEvent': goog.testing.recordFunction(),
    'getAuthEventHandlerFinisher': goog.testing.recordFunction()
  };
  asyncTestCase.waitForSignals(2);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.subscribe(handler1);
  manager.initialize();
}


function testAuthEventManager_initialize_manually_withNoSubscriber() {
  // Test manual initialization with no subscriber.
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup', '1234', 'http://www.example.com/#response', 'SESSION_ID');
  var isReady = false;
  // This test is not environment specific.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // This should not be called twice on initialization.
        assertFalse(isReady);
        // Trigger expected event.
        isReady = true;
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(2);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.initialize().then(function() {
    assertTrue(isReady);
    asyncTestCase.signal();
  });
  // This will return the above cached response and should not try to
  // initialize a new handler.
  manager.initialize().then(function() {
    assertTrue(isReady);
    asyncTestCase.signal();
  });
}


function testAuthEventManager_initialize_manually_withEmulator() {
  var expectedEmulatorConfig = {
    url: 'http://emulator.test.domain:1234'
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
    'linkViaPopup', '1234', 'http://www.example.com/#response', 'SESSION_ID');
  var isReady = false;
  // This test is not environment specific.
  stubs.replace(
    fireauth.AuthEventManager,
    'instantiateOAuthSignInHandler',
    function (authDomain, apiKey, appName, version, endpoint, emulatorConfig) {
      assertEquals('subdomain1.firebaseapp.com', authDomain);
      assertEquals('API_KEY1', apiKey);
      assertEquals('APP1', appName);
      assertEquals(firebase.SDK_VERSION, version);
      assertUndefined(endpoint);
      assertObjectEquals(emulatorConfig, expectedEmulatorConfig);
      isReady = true;
      return {
        'addAuthEventListener': function (handler) {
          handler(expectedAuthEvent);
        },
        'initializeAndWait': function () { return goog.Promise.resolve(); },
        'shouldBeInitializedEarly': function () {
          return false;
        },
        'hasVolatileStorage': function () {
          return false;
        }
      };
    });
  asyncTestCase.waitForSignals(1);
  var manager = fireauth.AuthEventManager.getManager(
    authDomain1, apiKey1, appName1, expectedEmulatorConfig);
  manager.initialize().then(function () {
    assertTrue(isReady);
    asyncTestCase.signal();
  });
}


function testAuthEventManager_initialize_automatically_pendingRedirect() {
  // Test automatic initialization when pending redirect available on
  // subscription.
  // This test is relevant to a browser environment.
  setOAuthSignInHandlerEnvironment(false);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'signInViaRedirect',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  var isInitialized = false;
  // Used to trigger the Auth event.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        isInitialized = true;
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(1);
  var expectedResult = {
    'user': {},
    'credential': {}
  };
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var handler1 = {
    'canHandleAuthEvent': function(type, id) {
      // Auth event should be passed to handler to check if it can handle it.
      assertEquals('signInViaRedirect', type);
      assertEquals('1234', id);
      return true;
    },
    'resolvePendingPopupEvent': function(
        mode, popupRedirectResult, error, opt_eventId) {
    },
    'getAuthEventHandlerFinisher': function(mode, opt_eventId) {
      return function(requestUri, sessionId, tenantId, postBody) {
        return goog.Promise.resolve(expectedResult);
      };
    }
  };
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  // Simulate pending result.
  pendingRedirectManager.setPendingStatus().then(function() {
    // This will trigger initialize due to pending redirect.
    manager.subscribe(handler1);
    // This will resolve with the expected result.
    manager.getRedirectResult().then(function(result) {
      assertTrue(isInitialized);
      assertObjectEquals(expectedResult, result);
      // Pending result should be cleared.
      pendingRedirectManager.getPendingStatus().then(function(status) {
        assertFalse(status);
        asyncTestCase.signal();
      });
    });

  });
}


function testAuthEventManager_initialize_automatically_volatileStorage() {
  // If interface has volatile storage, handler should be automatically
  // initialized even when no pending redirect is detected.
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'signInViaRedirect',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  var isInitialized = false;
  // Used to trigger the Auth event.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        isInitialized = true;
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(1);
  var expectedResult = {
    'user': {},
    'credential': {}
  };
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var handler1 = {
    'canHandleAuthEvent': function(type, id) {
      // auth event should be passed to handler to check if it can handle it.
      assertEquals('signInViaRedirect', type);
      assertEquals('1234', id);
      return true;
    },
    'resolvePendingPopupEvent': function(
        mode, popupRedirectResult, error, opt_eventId) {
    },
    'getAuthEventHandlerFinisher': function(mode, opt_eventId) {
      return function(requestUri, sessionId, tenantId, postBody) {
        return goog.Promise.resolve(expectedResult);
      };
    }
  };
  // This will trigger initialize even though there is no pending redirect in
  // session storage.
  manager.subscribe(handler1);
  // This will resolve with the expected result.
  manager.getRedirectResult().then(function(result) {
    assertTrue(isInitialized);
    assertEquals(expectedResult, result);
    asyncTestCase.signal();
  });
}


function testAuthEventManager_initialize_automatically_safariMobile() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  // Test automatic initialization on subscription for Safari mobile.
  var ua = 'Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 ' +
      '(KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25';
  stubs.replace(
      fireauth.util,
      'getUserAgentString',
      function() {
        return ua;
      });
  // OAuth handler should be initialized automatically on subscription.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var handler = {
    'canHandleAuthEvent': goog.testing.recordFunction(),
    'resolvePendingPopupEvent': goog.testing.recordFunction(),
    'getAuthEventHandlerFinisher': goog.testing.recordFunction()
  };
  manager.subscribe(handler);
}


function testAuthEventManager_getRedirectResult_noRedirect() {
  // Browser environment where sessionStorage is not volatile.
  // Test getRedirect when no pending redirect is found.
  setOAuthSignInHandlerEnvironment(false);
  asyncTestCase.waitForSignals(1);
  stubs.replace(
      fireauth.AuthEventManager.prototype,
      'initialize',
      function() {
        fail('This should not initialize automatically.');
      });
  var expectedResult = {
    'user': null
  };
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var handler1 = {
    'canHandleAuthEvent': goog.testing.recordFunction(),
    'resolvePendingPopupEvent': goog.testing.recordFunction(),
    'getAuthEventHandlerFinisher': goog.testing.recordFunction()
  };
  // This will resolve redirect result to default null result.
  manager.subscribe(handler1);
  // This should resolve quickly since there is no pending redirect without the
  // need to initialize the OAuth sign-in handler.
  manager.getRedirectResult().then(function(result) {
    assertObjectEquals(expectedResult, result);
    asyncTestCase.signal();
  });
}


function testAuthEventManager_subscribeAndUnsubscribe() {
  var recordedHandler = null;
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup', '1234', 'http://www.example.com/#response', 'SESSION_ID');
  stubs.replace(
      fireauth.PopupAuthEventProcessor.prototype,
      'processAuthEvent',
      goog.testing.recordFunction());
  // This test is not environment specific.
  stubs.replace(
      fireauth.AuthEventManager,
      'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName, version) {
        assertEquals('subdomain1.firebaseapp.com', authDomain);
        assertEquals('API_KEY1', apiKey);
        assertEquals('APP1', appName);
        assertEquals(firebase.SDK_VERSION, version);
        return {
          'addAuthEventListener': function(handler) {
            recordedHandler = handler;
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() {
            return false;
          },
          'hasVolatileStorage': function() {
            return false;
          }
        };
      });
  // Create a handler that can't handle the provided event.
  var handler1 = {
    'canHandleAuthEvent': goog.testing.recordFunction(function(type, eventId) {
      assertEquals('linkViaPopup', type);
      assertEquals('1234', eventId);
      return false;
    }),
    'resolvePendingPopupEvent': goog.testing.recordFunction(),
    'getAuthEventHandlerFinisher': goog.testing.recordFunction()
  };
  // Create another handler that can't handle the provided event.
  var handler2 = {
    'canHandleAuthEvent': goog.testing.recordFunction(function(type, eventId) {
      assertEquals('linkViaPopup', type);
      assertEquals('1234', eventId);
      return false;
    }),
    'resolvePendingPopupEvent': goog.testing.recordFunction(),
    'getAuthEventHandlerFinisher': goog.testing.recordFunction()
  };
  // Create a handler that can handle a specified Auth event.
  var handler3 = {
    'canHandleAuthEvent': goog.testing.recordFunction(function(type, eventId) {
      assertEquals('linkViaPopup', type);
      assertEquals('1234', eventId);
      return true;
    }),
    'resolvePendingPopupEvent': goog.testing.recordFunction(),
    'getAuthEventHandlerFinisher': goog.testing.recordFunction()
  };
  asyncTestCase.waitForSignals(1);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.initialize();
  assertFalse(manager.isSubscribed(handler1));
  // Subscribe first handler and trigger event.
  manager.subscribe(handler1);
  assertTrue(manager.isSubscribed(handler1));
  assertFalse(recordedHandler(expectedAuthEvent));
  assertEquals(1, handler1.canHandleAuthEvent.getCallCount());
  assertEquals(0, handler2.canHandleAuthEvent.getCallCount());
  assertEquals(
      0,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Subscribe second handler and trigger event.
  assertFalse(manager.isSubscribed(handler2));
  manager.subscribe(handler2);
  assertTrue(manager.isSubscribed(handler2));
  assertFalse(recordedHandler(expectedAuthEvent));
  assertEquals(2, handler1.canHandleAuthEvent.getCallCount());
  assertEquals(1, handler2.canHandleAuthEvent.getCallCount());
  assertEquals(
      0,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Unsubscribe first handler and trigger event.
  manager.unsubscribe(handler1);
  assertFalse(manager.isSubscribed(handler1));
  assertFalse(recordedHandler(expectedAuthEvent));
  assertEquals(2, handler1.canHandleAuthEvent.getCallCount());
  assertEquals(2, handler2.canHandleAuthEvent.getCallCount());
  assertEquals(
      0,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Unsubscribe second handler and trigger event.
  manager.unsubscribe(handler2);
  assertFalse(manager.isSubscribed(handler2));
  assertFalse(recordedHandler(expectedAuthEvent));
  assertEquals(2, handler1.canHandleAuthEvent.getCallCount());
  assertEquals(2, handler2.canHandleAuthEvent.getCallCount());
  assertEquals(
      0,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Reset handler.
  handler1.canHandleAuthEvent.reset();
  handler2.canHandleAuthEvent.reset();
  handler3.canHandleAuthEvent.reset();
  // Subscribe all handlers and add handler3.
  manager.subscribe(handler1);
  manager.subscribe(handler3);
  manager.subscribe(handler2);
  // Trigger event, once it reaches the correct handler, it will stop checking
  // other handlers and return true.
  assertTrue(recordedHandler(expectedAuthEvent));
  assertEquals(1, handler1.canHandleAuthEvent.getCallCount());
  assertEquals(0, handler2.canHandleAuthEvent.getCallCount());
  assertEquals(1, handler3.canHandleAuthEvent.getCallCount());
  assertEquals(
      1,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  // processAuthEvent should be called with the expected event and handler3 as
  // owner of that event.
  assertEquals(
      expectedAuthEvent,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.getLastCall()
          .getArgument(0));
  assertEquals(
      handler3,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.getLastCall()
          .getArgument(1));
}


function testAuthEventManager_testEventToProcessor() {
  var recordedHandler;
  clock = new goog.testing.MockClock(true);
  asyncTestCase.waitForSignals(1);
  // This test is not environment specific.
  stubs.replace(
      fireauth.AuthEventManager,
      'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName, version) {
        assertEquals('subdomain1.firebaseapp.com', authDomain);
        assertEquals('API_KEY1', apiKey);
        assertEquals('APP1', appName);
        assertEquals(firebase.SDK_VERSION, version);
        return {
          'addAuthEventListener': function(handler) {
            recordedHandler = handler;
            asyncTestCase.signal();
          },
          'removeAuthEventListener': function(handler) {
            recordedHandler = null;
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() {
            return false;
          },
          'hasVolatileStorage': function() {
            return false;
          }
        };
      });
  stubs.replace(
      fireauth.PopupAuthEventProcessor.prototype,
      'processAuthEvent',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.RedirectAuthEventProcessor.prototype,
      'processAuthEvent',
      goog.testing.recordFunction());
  // For testing all cases, use a handler that can handler everything.
  var handler = {
    'canHandleAuthEvent': function(type, eventId) {return true;},
    'resolvePendingPopupEvent': goog.testing.recordFunction(),
    'getAuthEventHandlerFinisher': goog.testing.recordFunction()
  };
  var unknownEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.UNKNOWN,
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  var signInViaPopupEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      'POST_BODY');
  var signInViaRedirectEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      'POST_BODY');
  var linkViaPopupEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      'POST_BODY');
  var linkViaRedirectEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      'POST_BODY');
  var reauthViaPopupEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      'POST_BODY');
  var reauthViaRedirectEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      'POST_BODY');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.initialize();
  manager.subscribe(handler);
  // Test with unknown event.
  recordedHandler(unknownEvent);
  assertEquals(
      1,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertArrayEquals(
      [unknownEvent, handler],
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getLastCall().getArguments());
  assertEquals(
      0,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Test with sign up via popup event.
  recordedHandler(signInViaPopupEvent);
  assertEquals(
      1,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertEquals(
      1,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertArrayEquals(
      [signInViaPopupEvent, handler],
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getLastCall().getArguments());

  // Test with sign in via redirect event.
  recordedHandler(signInViaRedirectEvent);
  assertEquals(
      2,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertArrayEquals(
      [signInViaRedirectEvent, handler],
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getLastCall().getArguments());
  assertEquals(
      1,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Test with link via popup event.
  recordedHandler(linkViaPopupEvent);
  assertEquals(
      2,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertEquals(
      2,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertArrayEquals(
      [linkViaPopupEvent, handler],
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getLastCall().getArguments());

  // Test with link via redirect event.
  recordedHandler(linkViaRedirectEvent);
  assertEquals(
      3,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertArrayEquals(
      [linkViaRedirectEvent, handler],
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getLastCall().getArguments());
  assertEquals(
      2,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Test with reauth via popup event.
  recordedHandler(reauthViaPopupEvent);
  assertEquals(
      3,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertEquals(
      3,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertArrayEquals(
      [reauthViaPopupEvent, handler],
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getLastCall().getArguments());

  // Test with reauth via redirect event.
  recordedHandler(reauthViaRedirectEvent);
  assertEquals(
      4,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertArrayEquals(
      [reauthViaRedirectEvent, handler],
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getLastCall().getArguments());
  assertEquals(
      3,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Duplicate events with event IDs or session IDs should be ignored.
  assertFalse(recordedHandler(signInViaPopupEvent));
  assertFalse(recordedHandler(signInViaRedirectEvent));
  assertFalse(recordedHandler(linkViaPopupEvent));
  assertFalse(recordedHandler(linkViaRedirectEvent));
  assertFalse(recordedHandler(reauthViaPopupEvent));
  assertFalse(recordedHandler(reauthViaRedirectEvent));
  assertEquals(
      4,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertEquals(
      3,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  // Unknown events are allowed to be duplicated.
  assertTrue(recordedHandler(unknownEvent));
  assertEquals(
      5,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertEquals(
      3,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());

  // Reset should clear processed events.
  manager.reset();
  manager.initialize();
  assertTrue(recordedHandler(signInViaPopupEvent));
  assertEquals(
      5,
      fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertEquals(
      4,
      fireauth.PopupAuthEventProcessor.prototype.processAuthEvent.
          getCallCount());
  assertFalse(recordedHandler(signInViaPopupEvent));

  // Simulate 1 millisecond before cachebuster triggers.
  clock.tick(fireauth.AuthEventManager.EVENT_DUPLICATION_CACHE_DURATION - 1);
  // Event uid should still be saved.
  assertFalse(recordedHandler(signInViaPopupEvent));
  // Simulate one more millisecond to clear cache.
  clock.tick(1);
  // Event uid should be cleared.
  assertTrue(recordedHandler(signInViaPopupEvent));
  // This should be cached until next time cache is cleared.
  clock.tick(fireauth.AuthEventManager.EVENT_DUPLICATION_CACHE_DURATION - 1);
  assertFalse(recordedHandler(signInViaPopupEvent));
  clock.tick(1);
  assertTrue(recordedHandler(signInViaPopupEvent));

  // Halfway through timeout duration.
  clock.tick(fireauth.AuthEventManager.EVENT_DUPLICATION_CACHE_DURATION / 2);
  // Trigger second event.
  assertTrue(recordedHandler(linkViaPopupEvent));
  // Halfway through timeout.
  clock.tick(fireauth.AuthEventManager.EVENT_DUPLICATION_CACHE_DURATION / 2);
  // Both events still cached (second event should reset the counter).
  assertFalse(recordedHandler(signInViaPopupEvent));
  assertFalse(recordedHandler(linkViaPopupEvent));
  // Trigger timeout (half timeout duration).
  clock.tick(fireauth.AuthEventManager.EVENT_DUPLICATION_CACHE_DURATION / 2);
  // Cache should be cleared from both events (full timeout duration from last
  // event).
  assertTrue(recordedHandler(signInViaPopupEvent));
  assertTrue(recordedHandler(linkViaPopupEvent));
}


function testProcessPopup_success() {
  // This is only relevant to OAuth handlers that support popups.
  setOAuthSignInHandlerEnvironment(false);
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1,
      apiKey1,
      appName1,
      'linkViaPopup',
      provider,
      null,
      '1234',
      firebase.SDK_VERSION);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // Fake popup window.
  var popupWin = {};
  // Keep track of when the popup is redirected.
  var popupRedirected = false;
  // Catch popup window redirection.
  stubs.replace(
      fireauth.util,
      'goTo',
      function(url, win) {
        popupRedirected = true;
        assertEquals(expectedUrl, url);
        assertEquals(popupWin, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(3);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
      .then(function() {
        assertTrue(popupRedirected);
        // This should resolve now as it is already initialized.
        asyncTestCase.signal();
      });
  // Confirm OAuth handler initialized before redirect.
  manager.initialize().then(function() {
    // Should not be redirected yet.
    assertFalse(popupRedirected);
    asyncTestCase.signal();
  });
}


function testProcessPopup_success_tenantId() {
  // This is only relevant to OAuth handlers that support popups.
  setOAuthSignInHandlerEnvironment(false);
  var tenantId = '123456789012';
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1,
      apiKey1,
      appName1,
      'linkViaPopup',
      provider,
      null,
      '1234',
      firebase.SDK_VERSION,
      null,
      null,
      tenantId);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // Fake popup window.
  var popupWin = {};
  // Keep track of when the popup is redirected.
  var popupRedirected = false;
  // Catch popup window redirection.
  stubs.replace(
      fireauth.util,
      'goTo',
      function(url, win) {
        popupRedirected = true;
        assertEquals(expectedUrl, url);
        assertEquals(popupWin, win);
        asyncTestCase.signal();
      });
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(3);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.processPopup(
      popupWin, 'linkViaPopup', provider, '1234', false, tenantId)
      .then(function() {
        assertTrue(popupRedirected);
        // This should resolve now as it is already initialized.
        asyncTestCase.signal();
      });
  // Confirm OAuth handler initialized before redirect.
  manager.initialize().then(function() {
    // Should not be redirected yet.
    assertFalse(popupRedirected);
    asyncTestCase.signal();
  });
}


function testProcessPopup_popupNotSupported() {
  // Test for environments where popup sign in is not supported.
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  // Fake popup window.
  var popupWin = {};
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(1);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testReset_ifcHandler() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  var oauthHandlerInstance = null;
  var calls = 0;
  // Listener to initializations of ifchandler.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'initializeAndWait',
      goog.testing.recordFunction(
          OAuthSignInHandler.prototype.initializeAndWait));
  stubs.replace(
      OAuthSignInHandler.prototype, 'addAuthEventListener',
      function(handler) {
        // Each call should be run on a new instance as reset will force a new
        // instance to be created.
        assertNotEquals(oauthHandlerInstance, this);
        // Save current instance.
        oauthHandlerInstance = this;
        calls++;
      });
  var manager =
      fireauth.AuthEventManager.getManager(authDomain1, apiKey1, appName1);
  // This should be cancelled by reset.
  manager.initialize();
  // Note first initialized ifchandler instance.
  var initializedInstance1 = OAuthSignInHandler.prototype
      .initializeAndWait.getLastCall().getThis();
  manager.reset();
  // This call should succeed.
  manager.initialize();
  // Note second initialized ifchandler instance.
  var initializedInstance2 = OAuthSignInHandler.prototype
      .initializeAndWait.getLastCall().getThis();
  // Confirm both instances are not the same.
  assertNotEquals(initializedInstance1, initializedInstance2);
  assertEquals(2, calls);
}


function testReset_cordovaHandler() {
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var oauthHandlerInstance = null;
  var calls = 0;
  // Listener to initializations of the current OAuth sign in handler.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'initializeAndWait',
      goog.testing.recordFunction(
          OAuthSignInHandler.prototype.initializeAndWait));
  stubs.replace(
      OAuthSignInHandler.prototype, 'addAuthEventListener',
      function(handler) {
        // Each call should be run on a new instance as reset will force a new
        // instance to be created.
        assertNotEquals(oauthHandlerInstance, this);
        // Save current instance.
        oauthHandlerInstance = this;
        calls++;
      });
  var manager =
      fireauth.AuthEventManager.getManager(authDomain1, apiKey1, appName1);
  // This should be cancelled by reset.
  manager.initialize();
  // Note first initialized ifchandler instance.
  var initializedInstance1 = OAuthSignInHandler.prototype
      .initializeAndWait.getLastCall().getThis();
  manager.reset();
  // This call should succeed.
  manager.initialize();
  // Note second initialized ifchandler instance.
  var initializedInstance2 = OAuthSignInHandler.prototype
      .initializeAndWait.getLastCall().getThis();
  // Confirm both instances are not the same.
  assertNotEquals(initializedInstance1, initializedInstance2);
  assertEquals(2, calls);
}


function testInitialize_errorLoadingOAuthHandler() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  // Test manager initialization when the OAuth handler fails to load.
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown', null, null, null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // Listen to reset calls.
  stubs.replace(
      fireauth.AuthEventManager.prototype, 'reset',
      goog.testing.recordFunction(fireauth.AuthEventManager.prototype.reset));
  // If the OAuth handler is to be initialized, trigger no redirect event to
  // notify event manager that it is ready.
  stubs.replace(
      OAuthSignInHandler.prototype, 'addAuthEventListener',
      function(handler) {
        // Only when handler is not failing, handle event.
        if (!willFail) {
          handler(expectedAuthEvent);
        }
      });
  stubs.replace(
      OAuthSignInHandler.prototype,
      'initializeAndWait',
      function() {
        if (willFail) {
          // When handler fails to load.
          return goog.Promise.reject(new fireauth.AuthError(
              fireauth.authenum.Error.NETWORK_REQUEST_FAILED));
        }
        // Handler succeeds to load.
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(1);
  var manager =
      fireauth.AuthEventManager.getManager(authDomain1, apiKey1, appName1);
  // Simulate the handler first fails to load.
  var willFail = true;
  // Reset not called yet.
  assertEquals(0, fireauth.AuthEventManager.prototype.reset.getCallCount());
  manager.initialize().thenCatch(function(error) {
    // OAuth handler should be reset.
    assertEquals(1, fireauth.AuthEventManager.prototype.reset.getCallCount());
    // Network error triggered.
    assertErrorEquals(expectedError, error);
    // Simulate on next trial the handler will load correctly.
    willFail = false;
    // Try to initialize again. This time it should work.
    manager.initialize().then(function() {
      // No additional call to reset.
      assertEquals(1, fireauth.AuthEventManager.prototype.reset.getCallCount());
      // This should resolve now as it is already initialized.
      asyncTestCase.signal();
    });
  });
}


function testProcessPopup_errorLoadingIframe() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  // Test when the handler fails to load.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1, apiKey1, appName1, 'linkViaPopup', provider, null, '1234',
      firebase.SDK_VERSION);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown', null, null, null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // Fake popup window.
  var popupWin = {};
  var popupRedirected = false;
  // Listen to reset calls.
  stubs.replace(
      fireauth.AuthEventManager.prototype, 'reset',
      goog.testing.recordFunction(fireauth.AuthEventManager.prototype.reset));
  stubs.replace(
      fireauth.RpcHandler.prototype, 'getAuthorizedDomains', function() {
        // Assume connection works for this call and only fails on handler load.
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  // Catch popup window redirection.
  stubs.replace(fireauth.util, 'goTo', function(url, win) {
    if (willFail) {
      // When handler fails, no redirect should happen.
      fail('OAuth handler loading failure should not lead to a popup ' +
          'redirect.');
    } else {
      // When OAuth handler succeeds, it should redirect the popup window.
      popupRedirected = true;
      assertEquals(expectedUrl, url);
      assertEquals(popupWin, win);
    }
  });
  // If the OAuth handler is to be initialized, trigger no redirect event to
  // notify event manager that it is ready.
  stubs.replace(
      OAuthSignInHandler.prototype, 'addAuthEventListener',
      function(handler) {
        // Only when handler is not failing, handle event.
        if (!willFail) {
          handler(expectedAuthEvent);
        }
      });
  stubs.replace(
      OAuthSignInHandler.prototype,
      'initializeAndWait',
      function() {
        if (willFail) {
          // When handler fails to load.
          return goog.Promise.reject(new fireauth.AuthError(
              fireauth.authenum.Error.NETWORK_REQUEST_FAILED));
        }
        // Handler succeeds to load.
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(1);
  var manager =
      fireauth.AuthEventManager.getManager(authDomain1, apiKey1, appName1);
  // Simulate the OAuth handler first fails to load.
  var willFail = true;
  // Reset not called yet.
  assertEquals(0, fireauth.AuthEventManager.prototype.reset.getCallCount());
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
      .thenCatch(function(error) {
        // OAuth handler should be reset.
        assertEquals(
            1, fireauth.AuthEventManager.prototype.reset.getCallCount());
        // No redirect.
        assertFalse(popupRedirected);
        // Network error triggered.
        assertErrorEquals(expectedError, error);
        // Simulate on next trial the OAuth handler will load correctly.
        willFail = false;
        // This will succeed now.
        manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
            .then(function() {
              // No additional call to reset.
              assertEquals(
                  1, fireauth.AuthEventManager.prototype.reset.getCallCount());
              assertTrue(popupRedirected);
              // This should resolve now as it is already initialized.
              asyncTestCase.signal();
            });
      });
}


function testProcessPopup_getAuthorizedDomainsNetworkError() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  // Test when getAuthorizedDomains throws a network error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1, apiKey1, appName1, 'linkViaPopup', provider, null, '1234',
      firebase.SDK_VERSION);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown', null, null, null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // Fake popup window.
  var popupWin = {};
  var popupRedirected = false;
  // Listen to reset calls.
  stubs.replace(
      fireauth.AuthEventManager.prototype, 'reset',
      goog.testing.recordFunction(fireauth.AuthEventManager.prototype.reset));
  stubs.replace(
      fireauth.RpcHandler.prototype, 'getAuthorizedDomains', function() {
        // Throw network error when this is supposed to fail.
        if (willFail) {
          return goog.Promise.reject(expectedError);
        }
        // Assume connection works for this call and only fails on handler load.
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  // Catch popup window redirection.
  stubs.replace(fireauth.util, 'goTo', function(url, win) {
    if (willFail) {
      // When OAuth handler fails, no redirect should happen.
      fail('OAuth handler loading failure should not lead to a popup ' +
          'redirect.');
    } else {
      // When OAuth handler succeeds, it should redirect the popup window.
      popupRedirected = true;
      assertEquals(expectedUrl, url);
      assertEquals(popupWin, win);
    }
  });
  // If the OAuth handler is to be initialized, trigger no redirect event to
  // notify event manager that it is ready.
  stubs.replace(
      OAuthSignInHandler.prototype, 'addAuthEventListener',
      function(handler) {
        // This should not be called since the handler should not be initialized
        // in this case.
        if (willFail) {
          fail('getAuthorizedDomains error should not trigger handler init.');
        }
        // Only when OAuth handler is not failing, handle event.
        handler(expectedAuthEvent);
      });
  stubs.replace(
      OAuthSignInHandler.prototype,
      'initializeAndWait',
      function() {
        // This should not be called since the OAuth handler should not be
        // initialized in this case.
        if (willFail) {
          fail('getAuthorizedDomains error should not trigger handler init.');
        }
        // OAuth handler succeeds to load.
        return goog.Promise.resolve();
      });
  asyncTestCase.waitForSignals(1);
  var manager =
      fireauth.AuthEventManager.getManager(authDomain1, apiKey1, appName1);
  // Simulate getAuthorizedDomains network error.
  var willFail = true;
  // Reset not called.
  assertEquals(0, fireauth.AuthEventManager.prototype.reset.getCallCount());
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
      .thenCatch(function(error) {
        // No reset needed as the OAuth handler was not initialized to begin
        // with.
        assertEquals(
            0, fireauth.AuthEventManager.prototype.reset.getCallCount());
        // No redirect.
        assertFalse(popupRedirected);
        // Network error triggered.
        assertErrorEquals(expectedError, error);
        // Simulate on next trial the OAuth handler will load correctly and
        // getAuthorizedDomains would resolve correctly.
        willFail = false;
        // This will succeed now.
        manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
            .then(function() {
              // No call to reset.
              assertEquals(
                  0, fireauth.AuthEventManager.prototype.reset.getCallCount());
              // Popup redirected successfully
              assertTrue(popupRedirected);
              // This should resolve now as it is already initialized.
              asyncTestCase.signal();
            });
      });
}


function testProcessPopup_alreadyRedirected() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  // Test processPopup when it's already redirected. This is used in mobile
  // environments.
  // Fake popup window.
  var popupWin = {};
  // OAuth handler should be initialized automatically if not already
  // initialized.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(2);
  var provider = new fireauth.GoogleAuthProvider();
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234', true)
      .then(function() {
        // This should resolve immediately.
        asyncTestCase.signal();
      });
}


function testProcessPopup_success_confirmAutoInitialized() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  // Test initialize called automatically when processPopup called.
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1,
      apiKey1,
      appName1,
      'linkViaPopup',
      provider,
      null,
      '1234',
      firebase.SDK_VERSION);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // Fake popup window.
  var popupWin = {};
  // Catch popup window redirection.
  stubs.replace(
      fireauth.util,
      'goTo',
      function(url, win) {
        assertEquals(expectedUrl, url);
        assertEquals(popupWin, win);
        asyncTestCase.signal();
      });
  // If the OAuth handler is to be initialized, trigger no redirect event to
  // notify event manager that it is ready.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(2);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
      .then(function() {
        // This should resolve immediately as it is already initialized.
        manager.initialize().then(function() {
          asyncTestCase.signal();
        });
      });
}


function testProcessPopup_error_invalidOrigin() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  // Simulate when popup is requested with invalid origin.
  // Expected invalid origin error.
  var expectedError =
      new fireauth.InvalidOriginError(fireauth.util.getCurrentUrl());
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // If the OAuth handler is to be initialized, trigger no redirect event.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  // Assume origin is an invalid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        // No authorized domains.
        return goog.Promise.resolve([]);
      });
  // Fake popup window.
  var popupWin = {};
  asyncTestCase.waitForSignals(2);
  var provider = new fireauth.GoogleAuthProvider();
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  // This should fail with invalid origin error.
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  // processPopup should initialize manager regardless of error.
  manager.initialize().then(function() {
    asyncTestCase.signal();
  });
}


function testProcessPopup_error_blockedPopup() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // If the OAuth handler is to be initialized, trigger no redirect event.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(2);
  var provider = new fireauth.GoogleAuthProvider();
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.processPopup(null, 'linkViaPopup', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.POPUP_BLOCKED),
            error);
        asyncTestCase.signal();
      });
  // processPopup should initialize manager regardless of error.
  manager.initialize().then(function() {
    asyncTestCase.signal();
  });
}


function testProcessPopup_error_unsupportedProvider() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // If the OAuth handler is to be initialized, trigger no redirect event.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  asyncTestCase.waitForSignals(2);
  // Fake popup window.
  var popupWin = {};
  var provider = new fireauth.EmailAuthProvider();
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(
            new fireauth.AuthError(
                fireauth.authenum.Error.INVALID_OAUTH_PROVIDER),
            error);
        asyncTestCase.signal();
      });
  // processPopup should initialize manager regardless of error.
  manager.initialize().then(function() {
    asyncTestCase.signal();
  });
}


function testProcessRedirect_success_ifchandler() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1,
      apiKey1,
      appName1,
      'linkViaRedirect',
      provider,
      window.location.href,
      '1234',
      firebase.SDK_VERSION);
  stubs.replace(
      fireauth.util,
      'goTo',
      function(url) {
        assertEquals(expectedUrl, url);
        // Pending redirect should be saved.
        pendingRedirectManager.getPendingStatus().then(function(status) {
          assertTrue(status);
          asyncTestCase.signal();
        });
      });
  asyncTestCase.waitForSignals(1);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  manager.processRedirect('linkViaRedirect', provider, '1234');
}


function testProcessRedirect_success_ifchandler_tenantId() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  var tenantId = '123456789012';
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1,
      apiKey1,
      appName1,
      'linkViaRedirect',
      provider,
      window.location.href,
      '1234',
      firebase.SDK_VERSION,
      null,
      null,
      tenantId);
  stubs.replace(
      fireauth.util,
      'goTo',
      function(url) {
        assertEquals(expectedUrl, url);
        // Pending redirect should be saved.
        pendingRedirectManager.getPendingStatus().then(function(status) {
          assertTrue(status);
          asyncTestCase.signal();
        });
      });
  asyncTestCase.waitForSignals(1);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  manager.processRedirect('linkViaRedirect', provider, '1234', tenantId);
}


function testAuthEventManager_nonCordovaIosOrAndroidFileEnvironment() {
  // Simulate Android file browser environment.
  setOAuthSignInHandlerEnvironment(false);
  stubs.replace(
      fireauth.util,
      'isAndroidOrIosCordovaScheme',
      function() {
        return true;
      });
  stubs.replace(
      fireauth.util,
      'checkIfCordova',
      function() {
        return goog.Promise.reject();
      });
  var popupWin = {
    closed: false
  };
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
  var provider = new fireauth.GoogleAuthProvider();
  handler.canHandleAuthEvent = function(mode, opt_eventId) {
    return true;
  };
  asyncTestCase.waitForSignals(4);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.subscribe(handler);
  // All popup/redirect methods should fail with operation not supported errors.
  manager.getRedirectResult().thenCatch(function(error) {
    assertErrorEquals(expectedError, error);
    // Clear redirect result will not clear an operation not supported error.
    manager.clearRedirectResult();
    manager.getRedirectResult().thenCatch(function(error) {
      assertErrorEquals(expectedError, error);
      asyncTestCase.signal();
    });
  });
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  manager.processPopup(popupWin, 'linkViaPopup', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
  manager.startPopupTimeout(handler, 'linkViaPopup', popupWin, '1234')
      .then(function() {
        assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
        assertErrorEquals(
            expectedError,
            handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
        asyncTestCase.signal();
      });
}


function testProcessRedirect_success_cordovahandler() {
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var rawSessionId = '11111111111111111111';
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1,
      apiKey1,
      appName1,
      'linkViaRedirect',
      provider,
      null,
      '1234',
      firebase.SDK_VERSION,
      {
        apn: 'com.example.app',
        appDisplayName: 'Test App',
        sessionId: sha256(rawSessionId)
      });
  var pendingRedirectError = new fireauth.AuthError(
      fireauth.authenum.Error.REDIRECT_OPERATION_PENDING);
  var savedCb = null;
  var incomingUrl =
      'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
  cordova.plugins.browsertab.openUrl = function(url) {
    assertEquals(expectedUrl, url);
    savedCb({url: incomingUrl});
  };
  universalLinks.subscribe = function(eventName, cb) {
    // Trigger initial no event.
    cb({url: null});
    savedCb = cb;
  };
  // Simulate handler can handle the event.
  handler.canHandleAuthEvent = function(mode, opt_eventId) {
    return true;
  };
  handler.getAuthEventHandlerFinisher = function(mode, opt_eventId) {
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals(incomingUrl, requestUri);
      assertEquals(sessionId, rawSessionId);
      // postBody not supported in Cordova flow.
      assertNull(postBody);
      assertNull(tenantId);
      return goog.Promise.resolve(expectedResult);
    };
  };
  asyncTestCase.waitForSignals(3);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  var expectedResult = {
    'user': {},
    'credential': {}
  };
  manager.subscribe(handler);
  // Initial result is null.
  manager.getRedirectResult().then(function(result) {
    assertNull(result.user);
    asyncTestCase.signal();
  });
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .then(function() {
        // Pending redirect should be cleared on redirect back to app.
        return pendingRedirectManager.getPendingStatus();
      }).then(function(status) {
        assertFalse(status);
        manager.getRedirectResult().then(function(result) {
          assertEquals(expectedResult, result);
          // Call processRedirect again. This should resolve as there is no
          // pending operation.
          return manager.processRedirect('linkViaRedirect', provider, '1234');
        }).then(function() {
          asyncTestCase.signal();
        });
      });
  // This should fail as the above is still pending.
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(pendingRedirectError, error);
        asyncTestCase.signal();
      });
}


function testProcessRedirect_success_cordovahandler_tenantId() {
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var expectedTenantId = 'TENANT_ID';
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var rawSessionId = '11111111111111111111';
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1,
      apiKey1,
      appName1,
      'linkViaRedirect',
      provider,
      null,
      '1234',
      firebase.SDK_VERSION,
      {
        apn: 'com.example.app',
        appDisplayName: 'Test App',
        sessionId: sha256(rawSessionId)
      },
      null,
      expectedTenantId);
  var pendingRedirectError = new fireauth.AuthError(
      fireauth.authenum.Error.REDIRECT_OPERATION_PENDING);
  var savedCb = null;
  var incomingUrl =
      'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
  cordova.plugins.browsertab.openUrl = function(url) {
    assertEquals(expectedUrl, url);
    savedCb({url: incomingUrl});
  };
  universalLinks.subscribe = function(eventName, cb) {
    // Trigger initial no event.
    cb({url: null});
    savedCb = cb;
  };
  // Simulate handler can handle the event.
  handler.canHandleAuthEvent = function(mode, opt_eventId) {
    return true;
  };
  handler.getAuthEventHandlerFinisher = function(mode, opt_eventId) {
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals(incomingUrl, requestUri);
      assertEquals(sessionId, rawSessionId);
      // postBody not supported in Cordova flow.
      assertNull(postBody);
      assertEquals(expectedTenantId, tenantId);
      return goog.Promise.resolve(expectedResult);
    };
  };
  asyncTestCase.waitForSignals(3);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  var expectedResult = {
    'user': {},
    'credential': {}
  };
  manager.subscribe(handler);
  // Initial result is null.
  manager.getRedirectResult().then(function(result) {
    assertNull(result.user);
    asyncTestCase.signal();
  });
  manager.processRedirect('linkViaRedirect', provider, '1234', expectedTenantId)
      .then(function() {
        // Pending redirect should be cleared on redirect back to app.
        return pendingRedirectManager.getPendingStatus();
      }).then(function(status) {
        assertFalse(status);
        manager.getRedirectResult().then(function(result) {
          assertEquals(expectedResult, result);
          // Call processRedirect again. This should resolve as there is no
          // pending operation.
          return manager.processRedirect(
              'linkViaRedirect', provider, '1234', expectedTenantId);
        }).then(function() {
          asyncTestCase.signal();
        });
      });
  // This should fail as the above is still pending.
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(pendingRedirectError, error);
        asyncTestCase.signal();
      });
}


function testProcessRedirect_error_cordovahandler() {
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  var rawSessionId = '11111111111111111111';
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain1,
      apiKey1,
      appName1,
      'linkViaRedirect',
      provider,
      null,
      '1234',
      firebase.SDK_VERSION,
      {
        apn: 'com.example.app',
        appDisplayName: 'Test App',
        sessionId: sha256(rawSessionId)
      });
  // Expected error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var savedCb = null;
  var incomingUrl =
      'http://example.firebaseapp.com/__/auth/callback?firebaseError=' +
      JSON.stringify(expectedError.toPlainObject());
  cordova.plugins.browsertab.openUrl = function(url) {
    assertEquals(expectedUrl, url);
    savedCb({url: incomingUrl});
  };
  universalLinks.subscribe = function(eventName, cb) {
    // Trigger initial no event.
    cb({url: null});
    savedCb = cb;
  };
  // Simulate handler can handle the event.
  handler.canHandleAuthEvent = function(mode, opt_eventId) {
    return true;
  };
  asyncTestCase.waitForSignals(2);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  manager.subscribe(handler);
  // Initial result is null.
  manager.getRedirectResult().then(function(result) {
    assertNull(result.user);
    asyncTestCase.signal();
  });
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .then(function() {
        // Pending redirect should be cleared on redirect back to app.
        return pendingRedirectManager.getPendingStatus();
      }).then(function(status) {
        assertFalse(status);
        manager.getRedirectResult().thenCatch(function(error) {
          assertErrorEquals(expectedError, error);
          // Clear redirect result should clear recoverable errors.
          manager.clearRedirectResult();
          manager.getRedirectResult().then(function(result) {
            assertNull(result.user);
            asyncTestCase.signal();
          });
        });
      });
}


function testProcessRedirect_error_unsupportedProvider_cordovaHandler() {
  asyncTestCase.waitForSignals(2);
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var invalidProviderError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  var pendingRedirectError = new fireauth.AuthError(
      fireauth.authenum.Error.REDIRECT_OPERATION_PENDING);
  var provider = new fireauth.EmailAuthProvider();
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(invalidProviderError, error);
        // Pending redirect should not be saved.
        return pendingRedirectManager.getPendingStatus();
      }).then(function(status) {
        assertFalse(status);
        // Call again, this should be allowed to complete.
        return manager.processRedirect('linkViaRedirect', provider, '1234');
      }).thenCatch(function(error) {
        // The expected invalid provider error is thrown.
        assertErrorEquals(invalidProviderError, error);
        asyncTestCase.signal();
      });
  // This should fail as there is a pending redirect operation.
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(pendingRedirectError, error);
        asyncTestCase.signal();
      });
}


function testProcessRedirect_error_redirectCancelled_cordovaHandler() {
  asyncTestCase.waitForSignals(1);
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.REDIRECT_CANCELLED_BY_USER);
  // Simulate the OAuth sign in handler throws the expected error.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'processRedirect',
      function(handler) {
        // Trigger expected error.
        return goog.Promise.reject(expectedError);
      });
  var provider = new fireauth.GoogleAuthProvider();
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        // The underlying OAuth handler processRedirect error should be thrown.
        assertErrorEquals(expectedError, error);
        // Pending redirect should not be saved.
        return pendingRedirectManager.getPendingStatus();
      }).then(function(status) {
        assertFalse(status);
        asyncTestCase.signal();
      });
}


function testGetRedirectResult_success_cordovahandler() {
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var rawSessionId = '11111111111111111111';
  // This should have been previously saved in a process redirect call.
  var partialEvent = new fireauth.AuthEvent(
     'linkViaRedirect',
     '1234',
      null,
      rawSessionId,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  var incomingUrl =
      'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
  universalLinks.subscribe = function(eventName, cb) {
    // Trigger initial event.
    cb({url: incomingUrl});
  };
  // Simulate handler can handle the event.
  handler.canHandleAuthEvent = function(mode, opt_eventId) {
    assertEquals('linkViaRedirect', mode);
    assertEquals('1234', opt_eventId);
    return true;
  };
  handler.getAuthEventHandlerFinisher = function(mode, opt_eventId) {
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals(incomingUrl, requestUri);
      assertEquals(sessionId, rawSessionId);
      // postBody not supported in Cordova flow.
      assertNull(postBody);
      assertNull(tenantId);
      return goog.Promise.resolve(expectedResult);
    };
  };
  var storageKey = apiKey1 + ':' + appName1;
  var expectedResult = {
    'user': {},
    'credential': {}
  };
  asyncTestCase.waitForSignals(1);
  // Assume pending redirect event.
  savePartialEventManager.setAuthEvent(storageKey, partialEvent)
      .then(function() {
    var manager = fireauth.AuthEventManager.getManager(
        authDomain1, apiKey1, appName1);
    manager.subscribe(handler);
    // Initial expected result should resolve.
    manager.getRedirectResult().then(function(result) {
      assertEquals(expectedResult, result);
      // Clear redirect result should clear successful results.
      manager.clearRedirectResult();
      manager.getRedirectResult().then(function(result) {
        assertNull(result.user);
        asyncTestCase.signal();
      });
    });
  });
}


function testGetRedirectResult_error_cordovahandler() {
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  var rawSessionId = '11111111111111111111';
  // This should have been previously saved in a process redirect call.
  var partialEvent = new fireauth.AuthEvent(
     'linkViaRedirect',
     '1234',
      null,
      rawSessionId,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // Expected error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var incomingUrl =
      'http://example.firebaseapp.com/__/auth/callback?firebaseError=' +
      JSON.stringify(expectedError.toPlainObject());
  universalLinks.subscribe = function(eventName, cb) {
    // Trigger initial event.
    cb({url: incomingUrl});
  };
  // Simulate handler can handle the event.
  handler.canHandleAuthEvent = function(mode, opt_eventId) {
    assertEquals('linkViaRedirect', mode);
    assertEquals('1234', opt_eventId);
    return true;
  };
  var storageKey = apiKey1 + ':' + appName1;
  asyncTestCase.waitForSignals(1);
  // Assume pending redirect event.
  savePartialEventManager.setAuthEvent(storageKey, partialEvent)
      .then(function() {
    var manager = fireauth.AuthEventManager.getManager(
        authDomain1, apiKey1, appName1);
    manager.subscribe(handler);
    // Initial expected result should resolve.
    manager.getRedirectResult().thenCatch(function(error) {
      assertErrorEquals(expectedError, error);
      // Clear redirect result should clear recoverable errors.
      manager.clearRedirectResult();
      manager.getRedirectResult().then(function(result) {
        assertNull(result.user);
        asyncTestCase.signal();
      });
    });
  });
}


function testProcessRedirect_error_invalidOrigin() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  // Simulate when redirect is requested with invalid origin.
  // Expected invalid origin error.
  var expectedError =
      new fireauth.InvalidOriginError(fireauth.util.getCurrentUrl());
  // Assume origin is an invalid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        // No authorized domains.
        return goog.Promise.resolve([]);
      });
  asyncTestCase.waitForSignals(1);
  var provider = new fireauth.GoogleAuthProvider();
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  // This should fail with invalid origin error.
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        // Pending redirect should not be saved.
        return pendingRedirectManager.getPendingStatus();
      }).then(function(status) {
        assertFalse(status);
        asyncTestCase.signal();
      });
}


function testProcessRedirect_error_unsupportedProvider_ifcHandler() {
  asyncTestCase.waitForSignals(1);
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  var provider = new fireauth.EmailAuthProvider();
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  manager.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(
            new fireauth.AuthError(
                fireauth.authenum.Error.INVALID_OAUTH_PROVIDER),
            error);
        // Pending redirect should not be saved.
        return pendingRedirectManager.getPendingStatus();
      }).then(function(status) {
        assertFalse(status);
        asyncTestCase.signal();
      });
}


function testStartPopupTimeout_webStorageSupported() {
  // Browser only environment.
  clock = new goog.testing.MockClock(true);
  setOAuthSignInHandlerEnvironment(false);
  asyncTestCase.waitForSignals(1);
  // No auth event used to resolve redirect result promise.
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // If the OAuth handler is to be initialized, trigger no redirect event.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  // On OAuth handler ready, simulate web storage supported.
  stubs.replace(
      fireauth.iframeclient.IfcHandler.prototype,
      'isWebStorageSupported',
      function() {
        return goog.Promise.resolve(true);
      });
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.POPUP_CLOSED_BY_USER);
  var popupWin = {'closed': true};
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  // Manager must be initialized for the OAuth handler to be ready before
  // listening to the popup being closed.
  manager.initialize();
  manager.startPopupTimeout(
      handler, 'linkViaPopup', popupWin, '1234').then(function() {
    // On timeout, resolve pending popup event should reject with a timeout
    // error.
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertEquals(
        null,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertErrorEquals(
        expectedError,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
  // Timeout popup quickly.
  clock.tick(5000);
}


function testStartPopupTimeout_webStorageNotSupported() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  asyncTestCase.waitForSignals(1);
  // No Auth event used to resolve redirect result promise.
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  // If the OAuth handler is to be initialized, trigger no redirect event.
  stubs.replace(
      OAuthSignInHandler.prototype,
      'addAuthEventListener',
      function(handler) {
        // Trigger expected event.
        handler(expectedAuthEvent);
      });
  // On handler ready, simulate web storage not supported in iframe.
  stubs.replace(
      fireauth.iframeclient.IfcHandler.prototype,
      'isWebStorageSupported',
      function() {
        return goog.Promise.resolve(false);
      });
  // Web storage not supported in iframe error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  var popupWin = {
    'closed': false,
    'close': function() {
      popupWin.closed = true;
    }
  };
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  // Manager must be initialized before listening to the popup being closed.
  manager.initialize();
  manager.startPopupTimeout(
      handler, 'linkViaPopup', popupWin, '1234').then(function() {
    // On timeout, resolve pending popup event should reject with a web storage
    // not supported error.
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertEquals(
        null,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertErrorEquals(
        expectedError,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
}


function testStartPopupTimeout_popupSupported_cancel() {
  // Browser only environment.
  clock = new goog.testing.MockClock(true);
  setOAuthSignInHandlerEnvironment(false);
  var popupWin = {'closed': true};
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.startPopupTimeout(
      handler, 'linkViaPopup', popupWin, '1234').then(function() {
    fail('Popup timeout should be cancelled before timing out.');
  }).cancel();
}


function testStartPopupTimeout_popupNotSupported() {
  // Cordova environment.
  setOAuthSignInHandlerEnvironment(true);
  asyncTestCase.waitForSignals(1);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
  var popupWin = {'closed': false};
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.startPopupTimeout(
      handler, 'linkViaPopup', popupWin, '1234').then(function() {
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertNull(handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertErrorEquals(
        expectedError,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234', handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_invalidAuthEvent() {
  asyncTestCase.waitForSignals(1);
  var expectedAuthEvent = null;
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectAuthEventProcessor().processAuthEvent(
      expectedAuthEvent, handler).thenCatch(function(error) {
        assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT),
            error);
        asyncTestCase.signal();
      });
}


function testProcessAuthEvent_unknownAuthEvent() {
  asyncTestCase.waitForSignals(2);
  var expectedResult = {
    'user': null
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().then(function(result) {
    assertObjectEquals(expectedResult, result);
    asyncTestCase.signal();
  });
  manager.getRedirectAuthEventProcessor().processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_unknownAuthEvent_webStorageNotSupported() {
  // Browser only environment.
  setOAuthSignInHandlerEnvironment(false);
  asyncTestCase.waitForSignals(1);
  // Web storage not supported error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'unknown',
      null,
      null,
      null,
      expectedError);
  // If the OAuth handler is to be initialized, trigger unknown event with web
  // storage not supported error.
  stubs.replace(
      fireauth.AuthEventManager,
      'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName, version) {
        assertEquals('subdomain1.firebaseapp.com', authDomain);
        assertEquals('API_KEY1', apiKey);
        assertEquals('APP1', appName);
        assertEquals(firebase.SDK_VERSION, version);
        return {
          'addAuthEventListener': function(handler) {
            handler(expectedAuthEvent);
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() {
            return false;
          },
          'hasVolatileStorage': function() {
            return false;
          }
        };
      });
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  var storageKey = apiKey1 + ':' + appName1;
  var pendingRedirectManager =
      new fireauth.storage.PendingRedirectManager(storageKey);
  // Simulate handler can handle the event.
  handler.canHandleAuthEvent = function(mode, opt_eventId) {
    return true;
  };
  // Simulate pending result.
  pendingRedirectManager.setPendingStatus().then(function() {
    manager.subscribe(handler);
    manager.getRedirectResult().thenCatch(function(error) {
      assertErrorEquals(expectedError, error);
      // Unrecoverable errors like unsupported web storage should not be
      // cleared.
      manager.clearRedirectResult();
      manager.getRedirectResult().thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
    });
  });
}


function testProcessAuthEvent_popupErrorAuthEvent() {
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup',
      '1234',
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR));
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getPopupAuthEventProcessor().processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Resolve popup with error.
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertEquals(
        null,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertErrorEquals(
        expectedError,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_redirectErrorAuthEvent() {
  asyncTestCase.waitForSignals(2);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaRedirect',
      '1234',
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR));
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().thenCatch(function(error) {
    assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
  manager.getRedirectAuthEventProcessor().processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Should not be called as event is not a popup type.
    assertEquals(0, handler.resolvePendingPopupEvent.getCallCount());
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_successfulPopupAuthEvent_noPostBody() {
  // Browser only environment.
  asyncTestCase.waitForSignals(1);
  var expectedPopupResponse = {
    'user': {},
    'credential': {}
  };
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaPopup', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/#response', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertNull(postBody);
      assertNull(tenantId);
      return goog.Promise.resolve(expectedPopupResponse);
    };
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.popupAuthEventProcessor_.processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Resolve popup with success.
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertObjectEquals(
        expectedPopupResponse,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertNull(
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_successfulPopupAuthEvent_withPostBody() {
  // Browser only environment.
  asyncTestCase.waitForSignals(1);
  var expectedPopupResponse = {
    'user': {},
    'credential': {}
  };
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaPopup', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/callback', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertEquals('POST_BODY', postBody);
      assertNull(tenantId);
      return goog.Promise.resolve(expectedPopupResponse);
    };
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup',
      '1234',
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      // Set POST body to Auth event.
      'POST_BODY');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.popupAuthEventProcessor_.processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Resolve popup with success.
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertObjectEquals(
        expectedPopupResponse,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertNull(
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_successfulPopupAuthEvent_tenantId() {
  // Verify that tenant ID in Auth event is correctly passed to the popup event
  // handler.
  // Browser only environment.
  asyncTestCase.waitForSignals(1);
  var expectedPopupResponse = {
    'user': {},
    'credential': {}
  };
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaPopup', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/#response', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertNull(postBody);
      assertEquals('TENANT_ID', tenantId);
      return goog.Promise.resolve(expectedPopupResponse);
    };
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      'TENANT_ID');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getPopupAuthEventProcessor().processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Resolve popup with success.
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertObjectEquals(
        expectedPopupResponse,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertNull(
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_errorPopupAuthEvent_noPostBody() {
  // Browser only environment.
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaPopup', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/#response', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertNull(postBody);
      assertNull(tenantId);
      return goog.Promise.reject(expectedError);
    };
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.popupAuthEventProcessor_.processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Resolve popup with error.
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertObjectEquals(
        null,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertErrorEquals(
        expectedError,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_errorPopupAuthEvent_postBody() {
  // Browser only environment.
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaPopup', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/callback', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertEquals('POST_BODY', postBody);
      assertNull(tenantId);
      return goog.Promise.reject(expectedError);
    };
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup',
      '1234',
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      // Set POST body to Auth event.
      'POST_BODY');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.popupAuthEventProcessor_.processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Resolve popup with error.
    assertEquals(1, handler.resolvePendingPopupEvent.getCallCount());
    assertEquals(
        'linkViaPopup',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(0));
    assertObjectEquals(
        null,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(1));
    assertErrorEquals(
        expectedError,
        handler.resolvePendingPopupEvent.getLastCall().getArgument(2));
    assertEquals(
        '1234',
        handler.resolvePendingPopupEvent.getLastCall().getArgument(3));
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_successfulRedirect_noPostBody() {
  clock = new goog.testing.MockClock(true);
  asyncTestCase.waitForSignals(2);
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaRedirect', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/#response', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertNull(postBody);
      assertNull(tenantId);
      // Once the handler is called, the redirect event cannot timeout.
      clock.tick(timeoutDelay);
      return goog.Promise.resolve(expectedRedirectResult);
    };
  };
  var expectedRedirectResult = {
    'user': {},
    'credential': {}
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaRedirect',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().then(function(result) {
    assertObjectEquals(expectedRedirectResult, result);
    asyncTestCase.signal();
  });
  manager.redirectAuthEventProcessor_.processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Popup resolve should not be called as this is not a popup event.
    assertEquals(0, handler.resolvePendingPopupEvent.getCallCount());
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_successfulRedirectAuthEvent_postBody() {
  clock = new goog.testing.MockClock(true);
  asyncTestCase.waitForSignals(2);
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaRedirect', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/callback', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertEquals('POST_BODY', postBody);
      assertNull(tenantId);
      // Once the handler is called, the redirect event cannot timeout.
      clock.tick(timeoutDelay);
      return goog.Promise.resolve(expectedRedirectResult);
    };
  };
  var expectedRedirectResult = {
    'user': {},
    'credential': {}
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaRedirect',
      '1234',
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      // Set POST body to Auth event.
      'POST_BODY');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().then(function(result) {
    assertObjectEquals(expectedRedirectResult, result);
    asyncTestCase.signal();
  });
  manager.redirectAuthEventProcessor_.processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Popup resolve should not be called as this is not a popup event.
    assertEquals(0, handler.resolvePendingPopupEvent.getCallCount());
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_successfulRedirect_tenantId() {
  // Verify that tenant ID in Auth event is correctly passed to the redirect
  // event handler.
  clock = new goog.testing.MockClock(true);
  asyncTestCase.waitForSignals(2);
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaRedirect', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/#response', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertNull(postBody);
      assertEquals('TENANT_ID', tenantId);
      // Once the handler is called, the redirect event cannot timeout.
      clock.tick(timeoutDelay);
      return goog.Promise.resolve(expectedRedirectResult);
    };
  };
  var expectedRedirectResult = {
    'user': {},
    'credential': {}
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaRedirect',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID',
      null,
      null,
      'TENANT_ID');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().then(function(result) {
    assertObjectEquals(expectedRedirectResult, result);
    // Successful redirect result should be cleared.
    manager.clearRedirectResult();
    manager.getRedirectResult().then(function(result) {
      assertNull(result.user);
      asyncTestCase.signal();
    });
  });
  manager.getRedirectAuthEventProcessor().processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Popup resolve should not be called as this is not a popup event.
    assertEquals(0, handler.resolvePendingPopupEvent.getCallCount());
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_errorRedirectAuthEvent_noPostBody() {
  asyncTestCase.waitForSignals(2);
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaRedirect', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/#response', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertNull(postBody);
      assertNull(tenantId);
      return goog.Promise.reject(expectedError);
    };
  };
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaRedirect',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().thenCatch(function(error) {
    assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
  manager.redirectAuthEventProcessor_.processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Popup resolve should not be called as this is not a popup event.
    assertEquals(0, handler.resolvePendingPopupEvent.getCallCount());
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_finisher_errorRedirectAuthEvent_postBody() {
  asyncTestCase.waitForSignals(2);
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    assertEquals('linkViaRedirect', mode);
    assertEquals('1234', eventId);
    return function(requestUri, sessionId, tenantId, postBody) {
      assertEquals('http://www.example.com/callback', requestUri);
      assertEquals('SESSION_ID', sessionId);
      assertEquals('POST_BODY', postBody);
      assertNull(tenantId);
      return goog.Promise.reject(expectedError);
    };
  };
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaRedirect',
      '1234',
      'http://www.example.com/callback',
      'SESSION_ID',
      null,
      // Set POST body to Auth event.
      'POST_BODY');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().thenCatch(function(error) {
    assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
  manager.redirectAuthEventProcessor_.processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Popup resolve should not be called as this is not a popup event.
    assertEquals(0, handler.resolvePendingPopupEvent.getCallCount());
    asyncTestCase.signal();
  });
}


function testProcessAuthEvent_noHandler() {
  // No handler available for whatever reason.
  handler.getAuthEventHandlerFinisher = function() {return null;};
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT);
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaRedirect',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectAuthEventProcessor().processAuthEvent(
      expectedAuthEvent, handler).thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testGetRedirect_noHandlerCanProcessEvent() {
  asyncTestCase.waitForSignals(2);
  var expectedRedirectResult = {
    'user': null
  };
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaPopup', '1234', 'http://www.example.com/#response', 'SESSION_ID');
  // This test is not environment specific.
  stubs.replace(
      fireauth.AuthEventManager,
      'instantiateOAuthSignInHandler',
      function(authDomain, apiKey, appName, version) {
        assertEquals('subdomain1.firebaseapp.com', authDomain);
        assertEquals('API_KEY1', apiKey);
        assertEquals('APP1', appName);
        assertEquals(firebase.SDK_VERSION, version);
        return {
          'addAuthEventListener': function(handler) {
            // handleAuthEvent_ should not resolve.
            assertFalse(handler(expectedAuthEvent));
            asyncTestCase.signal();
          },
          'initializeAndWait': function() { return goog.Promise.resolve(); },
          'shouldBeInitializedEarly': function() {
            return false;
          },
          'hasVolatileStorage': function() {
            return false;
          }
        };
      });
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  handler.canHandleAuthEvent = function() {return false;};
  manager.initialize();
  manager.subscribe(handler);
  // When on load no handler can process event, getRedirectResult should still
  // resolve.
  manager.getRedirectResult().then(function(result) {
    assertObjectEquals(expectedRedirectResult, result);
    asyncTestCase.signal();
  });
}


function testRedirectResult_timeout() {
  clock = new goog.testing.MockClock(true);
  asyncTestCase.waitForSignals(1);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.TIMEOUT);
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().thenCatch(function(error) {
    assertErrorEquals(expectedError, error);
    // Redirect results with recoverable errors should be cleared.
    manager.clearRedirectResult();
    manager.getRedirectResult().then(function(result) {
      assertNull(result.user);
      asyncTestCase.signal();
    });
  });
  // Speed up timeout.
  clock.tick(timeoutDelay);
}


function testRedirectResult_overwritePreviousRedirectResult() {
  // Once redirect result is determined, it can still be overwritten, though
  // in some cases like ifchandler which gets redirect result from
  // sessionStorage, this should not happen.
  // Test also that clearRedirectResult will clear the cached result as long as
  // the operation is not pending.
  asyncTestCase.waitForSignals(2);
  handler.getAuthEventHandlerFinisher = function(mode, eventId) {
    return function(requestUri, sessionId, tenantId, postBody) {
      // Iterate through results array each call.
      return goog.Promise.resolve(results[index++]);
    };
  };
  var index = 0;
  var expectedRedirectResult = {
    'user': {'uid': '1234'},
    'credential': {}
  };
  var expectedRedirectResult2 = {
    'user': {'uid': '5678'},
    'credential': {}
  };
  var results = [expectedRedirectResult, expectedRedirectResult2];
  var expectedAuthEvent = new fireauth.AuthEvent(
      'linkViaRedirect',
      '1234',
      'http://www.example.com/#response',
      'SESSION_ID');
  var manager = fireauth.AuthEventManager.getManager(
      authDomain1, apiKey1, appName1);
  manager.getRedirectResult().then(function(result) {
    assertObjectEquals(expectedRedirectResult, result);
    asyncTestCase.signal();
  });
  // Clear redirect result on a pending operation should have no effect.
  // Above getRedirectResult() should still resolve with expected first result.
  manager.clearRedirectResult();
  manager.getRedirectAuthEventProcessor().processAuthEvent(
      expectedAuthEvent, handler).then(function() {
    // Popup resolve should not be called as this is not a popup event.
    assertEquals(0, handler.resolvePendingPopupEvent.getCallCount());
    // Clear redirect result after resolved operation should reset result.
    manager.clearRedirectResult();
    return manager.getRedirectResult();
  }).then(function(result) {
    assertNull(result.user);
    // Call Second time.
    return manager.getRedirectAuthEventProcessor().processAuthEvent(
        expectedAuthEvent, handler);
  }).then(function() {
    assertEquals(0, handler.resolvePendingPopupEvent.getCallCount());
    // getRedirectResult should resolve with the second expected result.
    return manager.getRedirectResult();
  }).then(function(result) {
    assertObjectEquals(expectedRedirectResult2, result);
    // Clear redirect result after resolved operation should reset result.
    manager.clearRedirectResult();
    return manager.getRedirectResult();
  }).then(function(result) {
    assertNull(result.user);
    asyncTestCase.signal();
  });
}
