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

/**
 * @fileoverview Tests for cordovahandler.js.
 */

goog.provide('fireauth.CordovaHandlerTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.CordovaHandler');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.UniversalLinkSubscriber');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.storage.AuthEventManager');
goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.OAuthHandlerManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Timer');
goog.require('goog.crypt');
goog.require('goog.crypt.Sha256');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.TestCase');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.CordovaHandlerTest');


var stubs = new goog.testing.PropertyReplacer();
var universalLinks;
var BuildInfo;
var cordova;
var universalLinkCb;

var cordovaHandler;
var authDomain = 'subdomain.firebaseapp.com';
var apiKey = 'apiKey1';
var appName = 'appName1';
var version = '3.0.0';
var savePartialEventManager;
var storageKey;
var androidUA = 'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Buil' +
    'd/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Sa' +
    'fari/534.30';
var iOS8iPhoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) A' +
    'ppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12A366 Safar' +
    'i/600.1.4';
var iOS9iPhoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_2 like Mac OS X) A' +
    'ppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13C75 Safar' +
    'i/601.1';
var mockLocalStorage;
var mockSessionStorage;


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
 * Asserts that two errors are equivalent. Plain assertObjectEquals cannot be
 * used as Internet Explorer adds the stack trace as a property of the object.
 * @param {!fireauth.AuthError} expected
 * @param {!fireauth.AuthError} actual
 */
function assertErrorEquals(expected, actual) {
  assertObjectEquals(expected.toPlainObject(), actual.toPlainObject());
}


/**
 * Asserts that two Auth events are equivalent.
 * @param {!fireauth.AuthEvent} expectedEvent
 * @param {!fireauth.AuthEvent} actualEvent
 */
function assertAuthEventEquals(expectedEvent, actualEvent) {
  assertObjectEquals(
      expectedEvent.toPlainObject(), actualEvent.toPlainObject());
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


function setUp() {
  // Create new mock storages for persistent and temporary storage before each
  // test.
  mockLocalStorage = new fireauth.storage.MockStorage();
  mockSessionStorage = new fireauth.storage.MockStorage();
  fireauth.common.testHelper.installMockStorages(
      stubs, mockLocalStorage, mockSessionStorage);
  // Initialize plugins.
  initializePlugins(
      function(eventName, cb) {
        universalLinkCb = cb;
      },
      'com.example.app',
      'Test App',
      true,
      function(url, resolve, reject) {},
      goog.testing.recordFunction(),
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.util,
      'checkIfCordova',
      function() {
        return goog.Promise.resolve();
      });
  // Storage key.
  storageKey = 'apiKey1:appName1';
  // Storage manager helpers.
  savePartialEventManager = new fireauth.storage.OAuthHandlerManager();
  getAndDeletePartialEventManager =
      new fireauth.storage.AuthEventManager(storageKey);
}


function tearDown() {
  // Clear storage.
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Reset stubs.
  stubs.reset();
  // Clear plugins.
  universalLinks = {};
  BuildInfo = {};
  cordova = {};
  cordovaHandler = null;
  universalLinkCb = null;
  if (goog.global['handleOpenURL']) {
    delete goog.global['handleOpenURL'];
  }
  fireauth.UniversalLinkSubscriber.clear();
}


/**
 * Install the test to run and runs it.
 * @param {string} id The test identifier.
 * @param {function():!goog.Promise} func The test function to run.
 * @return {!goog.Promise} The result of the test.
 */
function installAndRunTest(id, func) {
  var testCase = new goog.testing.TestCase();
  testCase.addNewTest(id, func);
  return testCase.runTestsReturningPromise().then(function(result) {
    assertTrue(result.complete);
    // Display error detected.
    if (result.errors.length) {
      fail(result.errors.join('\n'));
    }
    assertEquals(1, result.totalCount);
    assertEquals(1, result.runCount);
    assertEquals(1, result.successCount);
    assertEquals(0, result.errors.length);
  });
}


function testCordovaHandler_initializeAndWait_success() {
  return installAndRunTest('initializeAndWait_success', function() {
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version);
    // Confirm should be initialized early.
    assertTrue(cordovaHandler.shouldBeInitializedEarly());
    // Confirm has volatile sessionStorage.
    assertTrue(cordovaHandler.hasVolatileStorage());
    // Confirm does not unload on redirect.
    assertFalse(cordovaHandler.unloadsOnRedirect());
    // Should resolve successfully.
    return cordovaHandler.initializeAndWait();
  });
}


function testCordovaHandler_initializeAndWait_notCordovaError() {
  return installAndRunTest('initializeAndWait_notCordovaError', function() {
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.CORDOVA_NOT_READY);
    // Simulate non Cordova environment.
    stubs.replace(
        fireauth.util,
        'checkIfCordova',
        function() {
          return goog.Promise.reject(expectedError);
        });
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version);
    return cordovaHandler.initializeAndWait().then(function() {
      throw new Error('Unexpected success!');
    }, function(error) {
      assertErrorEquals(expectedError, error);
    });
  });
}


function testCordovaHandler_initializeAndWait_universalLinkError() {
  return installAndRunTest('initializeAndWait_universalLinkError', function() {
    // Universal links plugin not installed.
    universalLinks = {};
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION,
        'cordova-universal-links-plugin-fix is not installed');
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version);
    var p = new goog.Promise(function(resolve, reject) {
      cordovaHandler.addAuthEventListener(function(event) {
        assertAuthEventEquals(noEvent, event);
        resolve();
      });
    });
    return cordovaHandler.initializeAndWait().then(function() {
      throw new Error('Unexpected success!');
    }, function(error) {
      assertErrorEquals(expectedError, error);
      return p;
    });
  });
}


function testCordovaHandler_initializeAndWait_buildInfoError() {
  return installAndRunTest('initializeAndWait_buildInfoError', function() {
    // Buildinfo plugin not installed.
    BuildInfo = {};
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION,
        'cordova-plugin-buildinfo is not installed');
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version);
    var p = new goog.Promise(function(resolve, reject) {
      cordovaHandler.addAuthEventListener(function(event) {
        assertAuthEventEquals(noEvent, event);
        resolve();
      });
    });
    return cordovaHandler.initializeAndWait().then(function() {
      throw new Error('Unexpected success!');
    }, function(error) {
      assertErrorEquals(expectedError, error);
      return p;
    });
  });
}


function testCordovaHandler_initializeAndWait_browserTabError() {
  return installAndRunTest('initializeAndWait_browserTabError', function() {
    // browsertab plugin not installed.
    cordova = {};
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION,
        'cordova-plugin-browsertab is not installed');
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version);
    var p = new goog.Promise(function(resolve, reject) {
      cordovaHandler.addAuthEventListener(function(event) {
        assertAuthEventEquals(noEvent, event);
        resolve();
      });
    });
    return cordovaHandler.initializeAndWait().then(function() {
      throw new Error('Unexpected success!');
    }, function(error) {
      assertErrorEquals(expectedError, error);
      return p;
    });
  });
}


function testCordovaHandler_initializeAndWait_inAppBrowserError() {
  return installAndRunTest('initializeAndWait_inAppBrowserError', function() {
    // inappbrowser plugin not installed.
    cordova.InAppBrowser = null;
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION,
        'cordova-plugin-inappbrowser is not installed');
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version);
    var p = new goog.Promise(function(resolve, reject) {
      cordovaHandler.addAuthEventListener(function(event) {
        assertAuthEventEquals(noEvent, event);
        resolve();
      });
    });
    return cordovaHandler.initializeAndWait().then(function() {
      throw new Error('Unexpected success!');
    }, function(error) {
      assertErrorEquals(expectedError, error);
      return p;
    });
  });
}


function testCordovaHandler_startPopupTimeout() {
  return installAndRunTest('startPopupTimeout', function() {
    // Should fail with operation not supported error.
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
    var onError = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version);
    return cordovaHandler.startPopupTimeout({}, onError, 1000).then(function() {
      assertEquals(1, onError.getCallCount());
      assertErrorEquals(expectedError, onError.getLastCall().getArgument(0));
    });
  });
}


function testCordovaHandler_processPopup() {
  return installAndRunTest('processPopup', function() {
    var onInit = goog.testing.recordFunction();
    var onError = goog.testing.recordFunction();
    var provider = new fireauth.GoogleAuthProvider();
    // Popup requests should fail with operation not supported error.
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version);
    return cordovaHandler.processPopup(
        {}, 'linkViaPopup', provider, onInit, onError, '1234', false)
        .then(function() {
          throw new Error('Unexpected success!');
        }, function(error) {
          assertErrorEquals(expectedError, error);
        });
  });
}


function testCordovaHandler_addRemoveAuthEventListeners() {
  return installAndRunTest('addRemoveAuthEventListeners', function() {
    // Wait for event to be handled.
    var waitWhileInStorage = function() {
      return goog.Timer.promise(10).then(function() {
        return getAndDeletePartialEventManager.getAuthEvent();
      }).then(function(authEvent) {
        if (authEvent) {
          return waitWhileInStorage();
        }
      });
    };
    var partialEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        null,
        'SESSION_ID',
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        'SESSION_ID');
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var handler1 = goog.testing.recordFunction();
    var handler2 = goog.testing.recordFunction();
    var handler3 = goog.testing.recordFunction();
    // Save some pending redirect that won't be handled and confirm it was
    // cleared.
    return savePartialEventManager.setAuthEvent(storageKey, partialEvent).then(
        function() {
      cordovaHandler = new fireauth.CordovaHandler(
          authDomain, apiKey, appName, version, 10);
      cordovaHandler.addAuthEventListener(handler1);
      cordovaHandler.addAuthEventListener(handler2);
      cordovaHandler.addAuthEventListener(handler3);
      return cordovaHandler.initializeAndWait();
    }).then(function() {
      // Wait for event to be cleared.
      return waitWhileInStorage();
    }).then(function() {
      // All handlers should be called with no event.
      assertEquals(1, handler1.getCallCount());
      assertAuthEventEquals(noEvent, handler1.getLastCall().getArgument(0));
      assertEquals(1, handler2.getCallCount());
      assertAuthEventEquals(noEvent, handler2.getLastCall().getArgument(0));
      assertEquals(1, handler3.getCallCount());
      assertAuthEventEquals(noEvent, handler3.getLastCall().getArgument(0));
      // Remove 2 handlers and trigger a new event.
      cordovaHandler.removeAuthEventListener(handler1);
      cordovaHandler.removeAuthEventListener(handler2);
      // Simulate a redirect operation and the partial event is saved.
      return savePartialEventManager.setAuthEvent(storageKey, partialEvent);
    }).then(function() {
      // Trigger the universal link with the OAuth response.
      universalLinkCb({
        url: incomingUrl
      });
      // Wait for event to be cleared from storage.
      return waitWhileInStorage();
    }).then(function() {
      // Only third handler called with completed event.
      assertEquals(1, handler1.getCallCount());
      assertEquals(1, handler2.getCallCount());
      assertEquals(2, handler3.getCallCount());
      assertAuthEventEquals(
          completeEvent, handler3.getLastCall().getArgument(0));
    });
  });
}



function testCordovaHandler_initialNoAuthEvent() {
  return installAndRunTest('initialNoAuthEvent', function() {
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var handler;
    var waitForHandler = new goog.Promise(function(resolve, reject) {
      handler = resolve;
    });
    // Use quick timeout to simulate no event triggered on initialization.
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.initializeAndWait().then(function() {
      // Wait for handler to be called.
      return waitForHandler;
    }).then(function(authEvent) {
      // No Auth event triggered.
      assertAuthEventEquals(noEvent, authEvent);
    });
  });
}


function testCordovaHandler_initialNoAuthEvent_invalidLink() {
  return installAndRunTest('initialNoAuthEvent_invalidLink', function() {
    // This should have been previously saved in a process redirect call.
    var partialEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        null,
        'SESSION_ID',
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var incomingUrl =
        'http://example.firebaseapp.com/some/other/link';
    // The final resolved event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var handler;
    var waitForHandler = new goog.Promise(function(resolve, reject) {
      handler = resolve;
    });
    // Trigger some non callback link.
    universalLinks.subscribe = function(eventType, cb) {
      cb({url: incomingUrl});
    };
    // Assume pending redirect event.
    return savePartialEventManager.setAuthEvent(storageKey, partialEvent)
      .then(function() {
      cordovaHandler = new fireauth.CordovaHandler(
          authDomain, apiKey, appName, version);
      cordovaHandler.addAuthEventListener(handler);
      return cordovaHandler.initializeAndWait();
    }).then(function() {
      // Wait for handler to be called.
      return waitForHandler;
    }).then(function(authEvent) {
      // Unknown event triggered.
      assertAuthEventEquals(noEvent, authEvent);
    });
  });
}


function testCordovaHandler_initialValidAuthEvent_direct() {
  return installAndRunTest('initialValidAuthEvent_direct', function() {
    // This should have been previously saved in a process redirect call.
    var partialEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        null,
        'SESSION_ID',
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // The final resolved event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        'SESSION_ID');
    var handler;
    var waitForHandler = new goog.Promise(function(resolve, reject) {
      handler = resolve;
    });
    // Trigger the universal link with the OAuth response on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      cb({url: incomingUrl});
    };
    // Assume pending redirect event.
    return savePartialEventManager.setAuthEvent(storageKey, partialEvent)
        .then(function() {
          cordovaHandler = new fireauth.CordovaHandler(
              authDomain, apiKey, appName, version);
          cordovaHandler.addAuthEventListener(handler);
          return cordovaHandler.initializeAndWait();
        }).then(function() {
          // Wait for handler to be called.
          return waitForHandler;
        }).then(function(authEvent) {
          // Auth event triggered. It should be the complete event.
          assertAuthEventEquals(completeEvent, authEvent);
        });
  });
}


function testCordovaHandler_initialValidAuthEvent_link() {
  return installAndRunTest('initialValidAuthEvent_link', function() {
    // This should have been previously saved in a process redirect call.
    var partialEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        null,
        'SESSION_ID',
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var incomingUrl =
        'https://example.app.goo.gl/?link=' +
        encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    // The expected event constructed from incoming link.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        'SESSION_ID');
    var handler;
    var waitForHandler = new goog.Promise(function(resolve, reject) {
      handler = resolve;
    });
    // Trigger the universal link with the OAuth response on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      cb({url: incomingUrl});
    };
    // Assume pending redirect event.
    return savePartialEventManager.setAuthEvent(storageKey, partialEvent)
        .then(function() {
          cordovaHandler = new fireauth.CordovaHandler(
              authDomain, apiKey, appName, version);
          cordovaHandler.addAuthEventListener(handler);
          return cordovaHandler.initializeAndWait();
        }).then(function() {
          // Wait for handler to be called.
          return waitForHandler;
        }).then(function(authEvent) {
          // Auth event triggered. The expected event should be dispatched.
          assertAuthEventEquals(completeEvent, authEvent);
        });
  });
}


function testCordovaHandler_initialValidAuthEvent_deepLinkId() {
  return installAndRunTest('initialValidAuthEvent_deepLinkId', function() {
    // This should have been previously saved in a process redirect call.
    var partialEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        null,
        'SESSION_ID',
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var incomingUrl =
        'comexampleiosurl://google/link?deep_link_id=' +
        encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        'SESSION_ID');
    var handler;
    var waitForHandler = new goog.Promise(function(resolve, reject) {
      handler = resolve;
    });
    // Trigger the universal link with the OAuth response on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      cb({url: incomingUrl});
    };
    // Assume pending redirect event.
    return savePartialEventManager.setAuthEvent(storageKey, partialEvent)
        .then(function() {
          cordovaHandler = new fireauth.CordovaHandler(
              authDomain, apiKey, appName, version);
          cordovaHandler.addAuthEventListener(handler);
          return cordovaHandler.initializeAndWait();
        }).then(function() {
          // This should have been previously saved in a process redirect call.
          return waitForHandler;
        }).then(function(authEvent) {
          // Auth event triggered. The expected event should be triggered.
          assertAuthEventEquals(completeEvent, authEvent);
        });
  });
}


function testCordovaHandler_initialErrorAuthEvent() {
  return installAndRunTest('initialErrorAuthEvent', function() {
    // Expected error.
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR);
    var partialEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        null,
        'SESSION_ID',
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    // The callback URL should contain the error.
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback?firebaseError=' +
        JSON.stringify(expectedError.toPlainObject());
    // Triggered event with the error.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        null,
        null,
        expectedError);
    var handler;
    var waitForHandler = new goog.Promise(function(resolve, reject) {
      handler = resolve;
    });
    // Trigger the universal link with the OAuth response on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      cb({url: incomingUrl});
    };
    // Assume pending redirect event.
    return savePartialEventManager.setAuthEvent(storageKey, partialEvent)
        .then(function() {
          cordovaHandler = new fireauth.CordovaHandler(
              authDomain, apiKey, appName, version);
          cordovaHandler.addAuthEventListener(handler);
          return cordovaHandler.initializeAndWait();
        }).then(function() {
          // Wait for handler to trigger.
          return waitForHandler;
        }).then(function(authEvent) {
          // Auth event triggered with the expected error event.
          assertAuthEventEquals(completeEvent, authEvent);
        });
  });
}


function testCordovaHandler_processRedirect_success_android() {
  return installAndRunTest('processRedirect_success_android', function() {
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            },
            // Confirm expected endpoint ID passed.
            fireauth.constants.Endpoint.STAGING.id);
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial unknown event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      savedCb({url: incomingUrl});
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10, undefined,
        fireauth.constants.Endpoint.STAGING.id);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_success_android_tenantId() {
  return installAndRunTest(
      'processRedirect_success_android_tenantId', function() {
    var tenantId = '123456789012';
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            },
            // Confirm expected endpoint ID passed.
            fireauth.constants.Endpoint.STAGING.id,
            tenantId);
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111',
        null,
        null,
        tenantId);
    // Initial unknown event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      savedCb({url: incomingUrl});
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10, undefined,
        fireauth.constants.Endpoint.STAGING.id);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect(
        'linkViaRedirect', provider, '1234', tenantId)
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_success_parallelCalls() {
  return installAndRunTest('processRedirect_success_parallelCalls', function() {
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL for first operation.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Construct OAuth handler URL for second operation.
    var expectedUrl2 =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '5678',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.REDIRECT_OPERATION_PENDING);
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event for first completed call.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Completed event for second completed call.
    var completeEvent2 = new fireauth.AuthEvent(
        'linkViaRedirect',
        '5678',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial unknown event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    var openUrlCalls = 0;
    cordova.plugins.browsertab.openUrl = function(url) {
      openUrlCalls++;
      // Confirm expected URL on each completed call.
      if (openUrlCalls == 1) {
        // First operation expected URL.
        assertEquals(expectedUrl, url);
      } else {
        // Second operation expected URL.
        assertEquals(expectedUrl2, url);
      }
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      savedCb({url: incomingUrl});
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    var successiveCallResult = null;
    var p = cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // The other parallel operation should have failed with the expected
          // error.
          assertErrorEquals(expectedError, successiveCallResult);
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
          // Trigger again. As the operation already completed, this should
          // eventually succeed too.
          return cordovaHandler.processRedirect(
              'linkViaRedirect', provider, '5678');
        }).then(function() {
          // Confirm browsertab close called again.
          assertEquals(2, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered thrice.
          assertEquals(3, handler.getCallCount());
          // Last call should have resolved event with the second event.
          assertAuthEventEquals(
              completeEvent2,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
    // This should fail as there is a pending operation already.
    cordovaHandler.processRedirect('linkViaRedirect', provider, '5678')
        .thenCatch(function(error) {
          // Confirm browsertab close not called.
          assertEquals(0, cordova.plugins.browsertab.close.getCallCount());
          // Save the pending redirect error.
          successiveCallResult = error;
        });
    return p;
  });
}


function testCordovaHandler_processRedirect_success_parallelCalls_tenantId() {
  return installAndRunTest(
      'processRedirect_success_parallelCalls_tenantId', function() {
    var tenantId1 = '123456789012';
    var tenantId2 = '987654321098';
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL for first operation.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            },
            null,
            tenantId1);
    // Construct OAuth handler URL for second operation.
    var expectedUrl2 =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '5678',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            },
            null,
            tenantId2);
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.REDIRECT_OPERATION_PENDING);
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event for first completed call.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111',
        null,
        null,
        tenantId1);
    // Completed event for second completed call.
    var completeEvent2 = new fireauth.AuthEvent(
        'linkViaRedirect',
        '5678',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111',
        null,
        null,
        tenantId2);
    // Initial unknown event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    var openUrlCalls = 0;
    cordova.plugins.browsertab.openUrl = function(url) {
      openUrlCalls++;
      // Confirm expected URL on each completed call.
      if (openUrlCalls == 1) {
        // First operation expected URL.
        assertEquals(expectedUrl, url);
      } else {
        // Second operation expected URL.
        assertEquals(expectedUrl2, url);
      }
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      savedCb({url: incomingUrl});
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    var successiveCallResult = null;
    var p = cordovaHandler.processRedirect(
        'linkViaRedirect', provider, '1234', tenantId1)
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // The other parallel operation should have failed with the expected
          // error.
          assertErrorEquals(expectedError, successiveCallResult);
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
          // Trigger again. As the operation already completed, this should
          // eventually succeed too.
          return cordovaHandler.processRedirect(
              'linkViaRedirect', provider, '5678', tenantId2);
        }).then(function() {
          // Confirm browsertab close called again.
          assertEquals(2, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered thrice.
          assertEquals(3, handler.getCallCount());
          // Last call should have resolved event with the second event.
          assertAuthEventEquals(
              completeEvent2,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
    // This should fail as there is a pending operation already.
    cordovaHandler.processRedirect('linkViaRedirect', provider, '5678')
        .thenCatch(function(error) {
          // Confirm browsertab close not called.
          assertEquals(0, cordova.plugins.browsertab.close.getCallCount());
          // Save the pending redirect error.
          successiveCallResult = error;
        });
    return p;
  });
}


function testCordovaHandler_processRedirect_success_withEmulator() {
  var emulatorConfig = {
    url: 'http://emulator.test.domain:1234'
  };
  return installAndRunTest(
    'testCordovaHandler_processRedirect_success_withEmulator',
    function () {
      var provider = new fireauth.GoogleAuthProvider();
      // Construct OAuth handler URL.
      var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain,
          apiKey,
          appName,
          'linkViaRedirect',
          provider,
          null,
          '1234',
          version,
          {
            apn: 'com.example.app',
            appDisplayName: 'Test App',
            sessionId: sha256('11111111111111111111')
          },
          // Confirm expected endpoint ID passed.
          fireauth.constants.Endpoint.STAGING.id,
          null,
          emulatorConfig);
      // Stub this so the session ID generated can be predictable.
      stubs.replace(
        Math,
        'random',
        function () {
          return 0;
        });
      // Simulate Android environment.
      stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function () {
          return androidUA;
        });
      var incomingUrl =
        'http://emulator.test.domain:1234/__/auth/callback#oauthResponse';
      // Completed event.
      var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        incomingUrl,
        '11111111111111111111');
      // Initial unknown event.
      var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
      var savedCb = null;
      // Save the universal link callback on subscription.
      universalLinks.subscribe = function (eventType, cb) {
        savedCb = cb;
      };
      cordova.plugins.browsertab.openUrl = function (url) {
        // Confirm expected URL.
        assertEquals(expectedUrl, url);
        // On openUrl, simulate completion by triggering the universal link
        // callback with the OAuth response.
        savedCb({ url: incomingUrl });
      };
      var handler = goog.testing.recordFunction();
      cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10, undefined,
        fireauth.constants.Endpoint.STAGING.id, emulatorConfig);
      cordovaHandler.addAuthEventListener(handler);
      return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function () {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
            noEvent,
            handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
            completeEvent,
            handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function (event) {
          assertNull(event);
        });
    });
}


function testCordovaHandler_processRedirect_success_ios() {
  return installAndRunTest('processRedirect_success_ios', function() {
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate iOS environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return iOS9iPhoneUA;
        });
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial no event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      // This is currently not the default behavior but will be supported in the
      // future.
      savedCb({url: incomingUrl});
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_success_ios_tenantId() {
  return installAndRunTest(
      'processRedirect_success_ios_tenantId', function() {
    var tenantId = '123456789012';
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            },
            null,
            tenantId);
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate iOS environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return iOS9iPhoneUA;
        });
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111',
        null,
        null,
        tenantId);
    // Initial no event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      // This is currently not the default behavior but will be supported in the
      // future.
      savedCb({url: incomingUrl});
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect(
        'linkViaRedirect', provider, '1234', tenantId)
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_success_ios_custom() {
  return installAndRunTest('processRedirect_success_ios_custom', function() {
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate iOS environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          // Even though this is iOS9, custom scheme redirects can still be
          // used.
          return iOS9iPhoneUA;
        });
    // Valid custom scheme URL.
    var incomingUrl = 'com.example.app://google/link?deep_link_id=' +
        encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial no event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      // Not used.
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // browsertab available in iOS 9+.
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the custom scheme
      // redirect callback with the OAuth response.
      goog.global['handleOpenURL'](incomingUrl);
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_success_ios_custom_tenantId() {
  return installAndRunTest(
      'processRedirect_success_ios_custom_tenantId', function() {
    var tenantId = '123456789012';
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            },
            null,
            tenantId);
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate iOS environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          // Even though this is iOS9, custom scheme redirects can still be
          // used.
          return iOS9iPhoneUA;
        });
    // Valid custom scheme URL.
    var incomingUrl = 'com.example.app://google/link?deep_link_id=' +
        encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111',
        null,
        null,
        tenantId);
    // Initial no event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      // Not used.
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // browsertab available in iOS 9+.
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the custom scheme
      // redirect callback with the OAuth response.
      goog.global['handleOpenURL'](incomingUrl);
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect(
        'linkViaRedirect', provider, '1234', tenantId)
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_success_ios_caseInsensitive() {
  return installAndRunTest(
      'processRedirect_success_ios_caseInsensitive', function() {
    // Use an upper case character in the bundle ID. This should not matter.
    BuildInfo.packageName = 'com.example.App';
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.App',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate iOS environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          // Even though this is iOS9, custom scheme redirects can still be
          // used.
          return iOS9iPhoneUA;
        });
    // Valid custom scheme URL. For some reason, the scheme is lower cased.
    var incomingUrl = 'com.example.app://google/link?deep_link_id=' +
        encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial no event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      // Not used.
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // browsertab available in iOS 9+.
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the custom scheme
      // redirect callback with the OAuth response.
      goog.global['handleOpenURL'](incomingUrl);
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    // This should still work.
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_browserTabUnavailable() {
  return installAndRunTest('processRedirect_browserTabUnavailable', function() {
    // Test when browser tab is not available, inappbrowser should be used and
    // a system browser opened.
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial unknown event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    var expectedInAppBrowserType = '_system';
    var expectedInAppBrowserOptions = 'location=yes';
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    // Simulate browser tab not available.
    cordova.plugins.browsertab.isAvailable = function(cb) {
      cb(false);
    };
    // Should not be called.
    cordova.plugins.browsertab.openUrl = function(url) {
      fail('browsertab.openUrl should not call!');
    };
    // InAppBrowser opener should be called as browsertab is unavailable.
    cordova.InAppBrowser.open = function(url, type, options) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // Confirm system browser used as this is Android.
      assertEquals(expectedInAppBrowserType, type);
      // Confirm expected options.
      assertEquals(expectedInAppBrowserOptions, options);
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      savedCb({url: incomingUrl});
      // Cannot close a system browser.
      return null;
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_browserTabUnavailable_tenantId() {
  return installAndRunTest('processRedirect_browserTabUnavailable', function() {
    // Test when browser tab is not available, inappbrowser should be used and
    // a system browser opened.
    var tenantId = '123456789012';
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            },
            null,
            tenantId);
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111',
        null,
        null,
        tenantId);
    // Initial unknown event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    var expectedInAppBrowserType = '_system';
    var expectedInAppBrowserOptions = 'location=yes';
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    // Simulate browser tab not available.
    cordova.plugins.browsertab.isAvailable = function(cb) {
      cb(false);
    };
    // Should not be called.
    cordova.plugins.browsertab.openUrl = function(url) {
      fail('browsertab.openUrl should not call!');
    };
    // InAppBrowser opener should be called as browsertab is unavailable.
    cordova.InAppBrowser.open = function(url, type, options) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // Confirm system browser used as this is Android.
      assertEquals(expectedInAppBrowserType, type);
      // Confirm expected options.
      assertEquals(expectedInAppBrowserOptions, options);
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      savedCb({url: incomingUrl});
      // Cannot close a system browser.
      return null;
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect(
        'linkViaRedirect', provider, '1234', tenantId)
        .then(function() {
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_webview_withNoHandler() {
  return installAndRunTest('processRedirect_webview_withNoHandler', function() {
    // This will test embedded webview when handleOpenURL is not defined by the
    // developer. Emebedded webviews are used in iOS8 and under and need to be
    // closed explicitly.
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate iOS 8 environment where SFSafariViewController is not supported.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return iOS8iPhoneUA;
        });
    // Valid custom scheme URL.
    var incomingUrl = 'com.example.app://google/link?deep_link_id=' +
        encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial no event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var expectedInAppBrowserType = '_blank';
    var expectedInAppBrowserOptions = 'location=yes';
    var inAppBrowserWindowRef = {
      close: goog.testing.recordFunction()
    };
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      // Not used.
    };
    // Simulate browser tab not available.
    cordova.plugins.browsertab.isAvailable = function(cb) {
      cb(false);
    };
    // Should not be called.
    cordova.plugins.browsertab.openUrl = function(url) {
      fail('browsertab.openUrl should not call!');
    };
    // InAppBrowser opener should be called as browsertab is unavailable.
    cordova.InAppBrowser.open = function(url, type, options) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // Confirm embedded webview browser used as this is iOS8.
      assertEquals(expectedInAppBrowserType, type);
      // Confirm expected options.
      assertEquals(expectedInAppBrowserOptions, options);
      // Custom schemes should be used here.
      // This should be handled.
      goog.global['handleOpenURL'](incomingUrl);
      // Emebdded webview can be closed.
      return inAppBrowserWindowRef;
    };
    // handleOpenURL is not defined here.
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm inappbrowser window close called.
          assertEquals(1, inAppBrowserWindowRef.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_webview_withHandler() {
  return installAndRunTest('processRedirect_webview_withHandler', function() {
    // This will test embedded webview when handleOpenURL is already defined by
    // the developer. Embedded webviews are used in iOS8 and under and need to
    // be closed explicitly.
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate iOS 8 environment where SFSafariViewController is not supported.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return iOS8iPhoneUA;
        });
    // Invalid URL that should be ignored.
    var invalidUrl1 =
        'http://example.firebaseapp.com/__/auth/callback#invalid';
    var invalidUrl2 = 'comexampleapp://google/link?deep_link_id=' +
        encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#invalid');
    // Valid custom scheme URL.
    var incomingUrl = 'com.example.app://google/link?deep_link_id=' +
        encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial no event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var expectedInAppBrowserType = '_blank';
    var expectedInAppBrowserOptions = 'location=yes';
    var inAppBrowserWindowRef = {
      close: goog.testing.recordFunction()
    };
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      // Not used.
    };
    // Simulate browser tab not available.
    cordova.plugins.browsertab.isAvailable = function(cb) {
      cb(false);
    };
    // Should not be called.
    cordova.plugins.browsertab.openUrl = function(url) {
      fail('browsertab.openUrl should not call!');
    };
    // InAppBrowser opener should be called as browsertab is unavailable.
    cordova.InAppBrowser.open = function(url, type, options) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // Confirm embedded webview browser used as this is iOS8.
      assertEquals(expectedInAppBrowserType, type);
      // Confirm expected options.
      assertEquals(expectedInAppBrowserOptions, options);
      // Custom schemes should be used here.
      // Invalid URLs should be ignored.
      goog.global['handleOpenURL'](invalidUrl1);
      assertEquals(1, recordedFunction.getCallCount());
      assertEquals(invalidUrl1, recordedFunction.getLastCall().getArgument(0));
      goog.global['handleOpenURL'](invalidUrl2);
      assertEquals(2, recordedFunction.getCallCount());
      assertEquals(invalidUrl2, recordedFunction.getLastCall().getArgument(0));
      // This should be handled.
      goog.global['handleOpenURL'](incomingUrl);
      assertEquals(3, recordedFunction.getCallCount());
      assertEquals(incomingUrl, recordedFunction.getLastCall().getArgument(0));
      // Emebdded webview can be closed.
      return inAppBrowserWindowRef;
    };
    // Assume developer already using custom scheme plugin. Make sure
    // their handler is not overwritten.
    var recordedFunction = goog.testing.recordFunction();
    goog.global['handleOpenURL'] = recordedFunction;
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm inappbrowser window close called.
          assertEquals(1, inAppBrowserWindowRef.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_doubleDeepLink() {
  return installAndRunTest('processRedirect_doubleDeepLink', function() {
    // Tests when the incoming URL has another deep link embedded.
    // This happens when the auto redirect to FDL is intercepted by the app.
    // Another deep link is contained within in case it is not intercepted and
    // the page can then display the FDL button using the deep link embedded.
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    // The automatic FDL redirect link in Android will have the following
    // format if intercepted by the app.
    var deepLink = 'http://example.firebaseapp.com/__/auth/callback' +
        '/?link=' + encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    var incomingUrl =
        'https://example.app.goo.gl/?link=' + encodeURIComponent(deepLink);
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial unknown event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      savedCb({url: incomingUrl});
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_ios7or8doubleDeepLink() {
  return installAndRunTest('processRedirect_ios7or8doubleDeepLink', function() {
    // Tests when the incoming URL has another deep link embedded.
    // This happens when the auto redirect to FDL is intercepted by the app.
    // Another deep link is contained within in case it is not intercepted and
    // the page can then display the FDL button using the deep link embedded.
    // This tests the flow in iOS 7 or 8 where custom URL schemes are used.
    // Realistically, this is not needed as custom URL scheme redirects do not
    // requires clicks.
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Simulate iOS environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return iOS8iPhoneUA;
        });
    // This would happen if auto redirect for iOS 8 using custom schemes
    // contains a double link. In reality, this is not needed as custom scheme
    // redirects always get intercepted by an app without an additional click.
    var deepLink = 'http://example.firebaseapp.com/__/auth/callback' +
        '/?link=' + encodeURIComponent(
            'http://example.firebaseapp.com/__/auth/callback#oauthResponse');
    var incomingUrl = 'com.example.app://google/link?deep_link_id=' +
        encodeURIComponent(deepLink);
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Initial no event.
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var expectedInAppBrowserType = '_blank';
    var expectedInAppBrowserOptions = 'location=yes';
    var inAppBrowserWindowRef = {
      close: goog.testing.recordFunction()
    };
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      // Not used.
    };
    // Simulate browser tab not available.
    cordova.plugins.browsertab.isAvailable = function(cb) {
      cb(false);
    };
    // Should not be called.
    cordova.plugins.browsertab.openUrl = function(url) {
      fail('browsertab.openUrl should not call!');
    };
    // InAppBrowser opener should be called as browsertab is unavailable.
    cordova.InAppBrowser.open = function(url, type, options) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // Confirm embedded webview browser used as this is iOS8.
      assertEquals(expectedInAppBrowserType, type);
      // Confirm expected options.
      assertEquals(expectedInAppBrowserOptions, options);
      // Custom schemes should be used here.
      // This should be handled.
      goog.global['handleOpenURL'](incomingUrl);
      // Emebdded webview can be closed.
      return inAppBrowserWindowRef;
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_invalidProvider() {
  return installAndRunTest('processRedirect_invalidProvider', function() {
    // Invalid OAuth provider.
    var provider = new fireauth.EmailAuthProvider();
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          throw new Error('Unexpected success!');
        }, function(error) {
          // Confirm browsertab close not called.
          assertEquals(0, cordova.plugins.browsertab.close.getCallCount());
          // Handler not triggered due to invalid provider error.
          assertEquals(0, handler.getCallCount());
          // Expected invalid provider error.
          assertErrorEquals(expectedError, error);
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_error_parallelCalls() {
  return installAndRunTest('processRedirect_error_parallelCalls', function() {
    // Invalid OAuth provider.
    var provider = new fireauth.EmailAuthProvider();
    // Expected invalid provider error.
    var expectedInvalidProviderError = new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
    // Expected error when there is a pending redirect operation.
    var expectedProcessRedirectError = new fireauth.AuthError(
        fireauth.authenum.Error.REDIRECT_OPERATION_PENDING);
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    var p = cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          throw new Error('Unexpected success!');
        }, function(error) {
          // The other parallel operation should have failed with the expected
          // pending redirect error.
          assertErrorEquals(expectedProcessRedirectError, successiveCallResult);
          // Handler not triggered due to invalid provider error.
          assertEquals(0, handler.getCallCount());
          // Expected invalid provider error.
          assertErrorEquals(expectedInvalidProviderError, error);
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
          // Call again, this should throw the expected error and complete.
          return cordovaHandler.processRedirect(
              'linkViaRedirect', provider, '1234');
        }).then(function() {
          throw new Error('Unexpected success!');
        }, function(error) {
          // Handler not triggered due to invalid provider error.
          assertEquals(0, handler.getCallCount());
          // Expected invalid provider error.
          assertErrorEquals(expectedInvalidProviderError, error);
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          // Confirm browsertab close not called.
          assertEquals(0, cordova.plugins.browsertab.close.getCallCount());
          assertNull(event);
        });
    // This should fail as there is a pending operation already.
    cordovaHandler.processRedirect('linkViaRedirect', provider, '5678')
        .thenCatch(function(error) {
          // Confirm browsertab close not called.
          assertEquals(0, cordova.plugins.browsertab.close.getCallCount());
          successiveCallResult = error;
        });
    return p;
  });
}


function testCordovaHandler_processRedirect_error() {
  return installAndRunTest('processRedirect_error', function() {
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Expected error.
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR);
    // Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    // Append error to callback URL.
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback?firebaseError=' +
        JSON.stringify(expectedError.toPlainObject());
    // Completed event with error.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        null,
        null, expectedError);
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      // On openUrl, simulate completion by triggering the universal link
      // callback with the OAuth response.
      savedCb({url: incomingUrl});
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10);
    cordovaHandler.addAuthEventListener(handler);
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice.
          assertEquals(2, handler.getCallCount());
          // First with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Then with resolved event. In this case, this contains an error.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_redirectCancelledError() {
  return installAndRunTest('processRedirect_redirectCancelledErr', function() {
    var doc = goog.global.document;
    stubs.replace(
        doc,
        'addEventListener',
        function(eventName, onResume) {
          // Trigger on resume event. This will eventually trigger the redirect
          // cancelled by user error after it times out.
          if (eventName == 'resume') {
            onResume();
          }
        });
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              apn: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Expected error.
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.REDIRECT_CANCELLED_BY_USER);
    // Android environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return androidUA;
        });
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // openUrl call counter.
    var openUrlCounter = 0;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      openUrlCounter++;
      // On second call, succeed.
      if (openUrlCounter == 2) {
        savedCb({url: incomingUrl});
      }
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10, 10);
    cordovaHandler.addAuthEventListener(handler);
    // Test all possible scenarios:
    // 1. redirect operation is cancelled.
    // 2. redirect operation called again successfully.
    // 3. redirect operation called again and cancelled.
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          throw new Error('Unexpected success!');
        }, function(error) {
          // Confirm browsertab close not called.
          assertEquals(0, cordova.plugins.browsertab.close.getCallCount());
          // Handler should be triggered only for first event.
          assertEquals(1, handler.getCallCount());
          // Handler called with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Expected cancellation error.
          assertErrorEquals(expectedError, error);
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
          // Try again, this time it should succeed.
          return cordovaHandler.processRedirect(
              'linkViaRedirect', provider, '1234');
        }).then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice at this point.
          assertEquals(2, handler.getCallCount());
          // Handler last call will be with the completed event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
          // Try again, this time it will be cancelled again.
          return cordovaHandler.processRedirect(
              'linkViaRedirect', provider, '1234');
        }).then(function() {
          throw new Error('Unexpected success!');
        }, function(error) {
          // Confirm browsertab close not called again.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler should not be triggered any more.
          assertEquals(2, handler.getCallCount());
          // Expected cancellation error.
          assertErrorEquals(expectedError, error);
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}


function testCordovaHandler_processRedirect_visibilityChange_cancelledErr() {
  return installAndRunTest('processRedirect_visibility_cancelErr', function() {
    // Test visibilitychange event in iOS where resume does not trigger in the
    // case of SFSVC,
    var doc = goog.global.document;
    // Stub fireauth.util.isAppVisible() to return true.
    stubs.replace(
        fireauth.util,
        'isAppVisible',
        function() {
          return true;
        });
    stubs.replace(
        doc,
        'addEventListener',
        function(eventName, onVisibilityChange) {
          // We will ignore resume event and only trigger visibilityChange.
          if (eventName == 'visibilitychange') {
            onVisibilityChange();
          }
        });
    var provider = new fireauth.GoogleAuthProvider();
    // Construct OAuth handler URL.
    var expectedUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            authDomain,
            apiKey,
            appName,
            'linkViaRedirect',
            provider,
            null,
            '1234',
            version,
            {
              ibi: 'com.example.app',
              appDisplayName: 'Test App',
              sessionId: sha256('11111111111111111111')
            });
    var incomingUrl =
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse';
    // Completed event.
    var completeEvent = new fireauth.AuthEvent(
        'linkViaRedirect',
        '1234',
        'http://example.firebaseapp.com/__/auth/callback#oauthResponse',
        '11111111111111111111');
    // Stub this so the session ID generated can be predictable.
    stubs.replace(
        Math,
        'random',
        function() {
          return 0;
        });
    // Expected error.
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.REDIRECT_CANCELLED_BY_USER);
    // iOS environment.
    stubs.replace(
        fireauth.util,
        'getUserAgentString',
        function() {
          return iOS9iPhoneUA;
        });
    var noEvent = new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.UNKNOWN,
        null,
        null,
        null,
        new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
    var savedCb = null;
    // openUrl call counter.
    var openUrlCounter = 0;
    // Save the universal link callback on subscription.
    universalLinks.subscribe = function(eventType, cb) {
      savedCb = cb;
    };
    cordova.plugins.browsertab.openUrl = function(url) {
      // Confirm expected URL.
      assertEquals(expectedUrl, url);
      openUrlCounter++;
      // On second call, succeed.
      if (openUrlCounter == 2) {
        savedCb({url: incomingUrl});
      }
    };
    var handler = goog.testing.recordFunction();
    cordovaHandler = new fireauth.CordovaHandler(
        authDomain, apiKey, appName, version, 10, 10);
    cordovaHandler.addAuthEventListener(handler);
    // Test all possible scenarios:
    // 1. redirect operation is cancelled.
    // 2. redirect operation called again successfully.
    // 3. redirect operation called again and cancelled.
    return cordovaHandler.processRedirect('linkViaRedirect', provider, '1234')
        .then(function() {
          throw new Error('Unexpected success!');
        }, function(error) {
          // Confirm browsertab close not called.
          assertEquals(0, cordova.plugins.browsertab.close.getCallCount());
          // Handler should be triggered only for first event.
          assertEquals(1, handler.getCallCount());
          // Handler called with no event.
          assertAuthEventEquals(
              noEvent,
              handler.getCalls()[0].getArgument(0));
          // Expected cancellation error.
          assertErrorEquals(expectedError, error);
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
          // Try again, this time it should succeed.
          return cordovaHandler.processRedirect(
              'linkViaRedirect', provider, '1234');
        }).then(function() {
          // Confirm browsertab close called.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler triggered twice at this point.
          assertEquals(2, handler.getCallCount());
          // Handler last call will be with the completed event.
          assertAuthEventEquals(
              completeEvent,
              handler.getLastCall().getArgument(0));
          // Confirm event deleted from storage.
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
          // Try again, this time it will be cancelled again.
          return cordovaHandler.processRedirect(
              'linkViaRedirect', provider, '1234');
        }).then(function() {
          throw new Error('Unexpected success!');
        }, function(error) {
          // Confirm browsertab close not called again.
          assertEquals(1, cordova.plugins.browsertab.close.getCallCount());
          // Handler should not be triggered any more.
          assertEquals(2, handler.getCallCount());
          // Expected cancellation error.
          assertErrorEquals(expectedError, error);
          return getAndDeletePartialEventManager.getAuthEvent();
        }).then(function(event) {
          assertNull(event);
        });
  });
}
