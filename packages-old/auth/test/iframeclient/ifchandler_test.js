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
 * @fileoverview Tests for ifchandler.js
 */

goog.provide('fireauth.iframeclient.IfcHandlerTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.FacebookAuthProvider');
goog.require('fireauth.FederatedProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.InvalidOriginError');
goog.require('fireauth.OAuthProvider');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.TwitterAuthProvider');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.constants');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.iframeclient.IframeUrlBuilder');
goog.require('fireauth.iframeclient.IframeWrapper');
goog.require('fireauth.iframeclient.OAuthUrlBuilder');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.iframeclient.IfcHandlerTest');


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var stubs = new goog.testing.PropertyReplacer();
var ifcHandler;
var authDomain = 'subdomain.firebaseapp.com';
var apiKey = 'apiKey1';
var appName = 'appName1';
var authEvent;
var eventsMap = {};
var version = '3.0.0';
var clock;
var mockControl;
var ignoreArgument;

function setUp() {
  eventsMap = {};
  stubs.replace(
      fireauth.iframeclient.IframeWrapper.prototype,
      'open_',
      function() {
        return goog.Promise.resolve();
      });
  stubs.replace(
      fireauth.iframeclient.IframeWrapper.prototype, 'onReady',
      goog.testing.recordFunction(goog.Promise.resolve));
  stubs.replace(
      fireauth.iframeclient.IframeWrapper.prototype,
      'registerEvent',
      function(eventName, handler) {
        eventsMap[eventName] = handler;
      });
  stubs.replace(
      fireauth.iframeclient.IframeWrapper.prototype,
      'sendMessage',
      function(message) {
        assertEquals('webStorageSupport', message['type']);
        var response = [{'status': 'ACK', 'webStorageSupport': true}];
        return goog.Promise.resolve(response);
      });
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl = new goog.testing.MockControl();
  mockControl.$resetAll();
}


function tearDown() {
  stubs.reset();
  ifcHandler = null;
  goog.dispose(clock);
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
}


/**
 * Simulates the current Auth language/frameworks on the specified App instance.
 * @param {string} appName The expected App instance identifier.
 * @param {?string} languageCode The default Auth language.
 * @param {?Array<string>} frameworks The list of frameworks on the Auth
 *     instance.
 */
function simulateAuthService(appName, languageCode, frameworks) {
  stubs.replace(
      firebase,
      'app',
      function(name) {
        assertEquals(appName, name);
        return {
          auth: function() {
            return {
              getLanguageCode: function() {
                return languageCode;
              },
              getFramework: function() {
                return frameworks || [];
              }
            };
          }
        };
      });
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


function testIframeUrlBuilder() {
  var builder = new fireauth.iframeclient.IframeUrlBuilder(
      'example.firebaseapp.com', 'API_KEY', 'MY_APP');
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP',
      builder.setVersion(null).toString());
  // Set version parameter.
  builder.setVersion('3.4.0');
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP&v=3.4.0',
      builder.toString());
  // Modify version parameter.
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP&v=3.4.1',
      builder.setVersion('3.4.1').toString());
  // Remove version parameter.
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP',
      builder.setVersion(null).toString());
  // Set eid parameter.
  builder.setEndpointId('p');
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP&eid=p',
      builder.toString());
  // Modify eid parameter.
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP&eid=s',
      builder.setEndpointId('s').toString());
  // Remove eid parameter.
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP',
      builder.setEndpointId(null).toString());
  // Set fw parameter.
  builder.setFrameworks(['f1', 'f2']);
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP&fw=' + encodeURIComponent('f1,f2'),
      builder.toString());
  // Modify fw parameter.
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP&fw=f3',
      builder.setFrameworks(['f3']).toString());
  // Remove fw parameter.
  assertEquals(
      'https://example.firebaseapp.com/__/auth/iframe?apiKey=API_KEY&appName' +
      '=MY_APP',
      builder.setFrameworks(null).toString());
}


/**
 * Asserts IframeUrlBuilder.prototype.toString handles emulator URLs.
 */
function testIframeUrlBuilder_withEmulator() {
  var builder = new fireauth.iframeclient.IframeUrlBuilder(
    'example.firebaseapp.com', 'API_KEY', 'MY_APP', {
    url: 'http://emulator.test.domain:1234'
  });
  assertEquals(
    'http://emulator.test.domain:1234/emulator/auth/iframe?' +
    'apiKey=API_KEY&appName=MY_APP',
    builder.setVersion(null).toString());
}


function testOAuthUrlBuilder() {
  var redirectUrl = 'http://www.example.com/redirect?a=b#c';
  var redirectUrl2 = 'http://www.example.com/redirect2?d=e#f';
  var provider = new fireauth.GoogleAuthProvider();
  var additionalParams = {
    // This entry should be ignored.
    'apiKey': 'OTHER_KEY',
    'apn': 'com.example.android',
    'sessionId': 'SESSION_ID1'
  };
  var additionalParams2 = {
    'ibi': 'com.example.ios',
    'sessionId': 'SESSION_ID2'
  };
  provider.addScope('scope1');
  provider.addScope('scope2');
  var customParams = {
    'hd': 'example.com',
    'login_hint': 'user@example.com',
    'state': 'bla'
  };
  var filteredCustomParams = {
    'hd': 'example.com',
    'login_hint': 'user@example.com'
  };
  provider.setCustomParameters(customParams);
  var builder = new fireauth.iframeclient.OAuthUrlBuilder(
      'example.firebaseapp.com', 'API_KEY', 'APP_NAME', 'signInWithPopup',
      provider);
  var partialUrl = 'https://example.firebaseapp.com/__/auth/handler?apiKey=A' +
      'PI_KEY&appName=APP_NAME&authType=signInWithPopup&providerId=google.co' +
      'm&customParameters=' +
      encodeURIComponent(fireauth.util.stringifyJSON(filteredCustomParams)) +
      '&scopes=' + encodeURIComponent('profile,scope1,scope2');
  assertEquals(partialUrl, builder.toString());
  // Add redirect URL.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl),
      builder.setRedirectUrl(redirectUrl).toString());
  // Modify redirect URL.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2),
      builder.setRedirectUrl(redirectUrl2).toString());
  // Add eventId.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID1',
      builder.setEventId('EVENT_ID1').toString());
  // Modify eventId.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2',
      builder.setEventId('EVENT_ID2').toString());
  // Add version.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2&v=3.4.0',
      builder.setVersion('3.4.0').toString());
  // Modify version.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2&v=3.4.1',
      builder.setVersion('3.4.1').toString());
  // Add additional parameters.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2&v=3.4.1&apn=' +
      encodeURIComponent('com.example.android') + '&sessionId=SESSION_ID1',
      builder.setAdditionalParameters(additionalParams).toString());
  // Modify additional parameters.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2&v=3.4.1&ibi=' +
      encodeURIComponent('com.example.ios') + '&sessionId=SESSION_ID2',
      builder.setAdditionalParameters(additionalParams2).toString());
  // Add tenantId.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2&v=3.4.1&ibi=' +
      encodeURIComponent('com.example.ios') +
      '&sessionId=SESSION_ID2&tid=TENANT_ID1',
      builder.setTenantId('TENANT_ID1').toString());
  // Modify tenantId.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2&v=3.4.1&ibi=' +
      encodeURIComponent('com.example.ios') +
      '&sessionId=SESSION_ID2&tid=TENANT_ID2',
      builder.setTenantId('TENANT_ID2').toString());
  // Delete tenantId.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2&v=3.4.1&ibi=' +
      encodeURIComponent('com.example.ios') + '&sessionId=SESSION_ID2',
      builder.setTenantId(null).toString());
  // Delete additional parameters.
  assertEquals(
      partialUrl + '&redirectUrl=' + encodeURIComponent(redirectUrl2) +
      '&eventId=EVENT_ID2&v=3.4.1',
      builder.setAdditionalParameters(null).toString());
  // Delete redirect URL.
  assertEquals(
      partialUrl + '&eventId=EVENT_ID2&v=3.4.1',
      builder.setRedirectUrl(null).toString());
  // Delete eventId.
  assertEquals(
      partialUrl + '&v=3.4.1',
      builder.setEventId(null).toString());
  // Delete version.
  assertEquals(partialUrl, builder.setVersion(null).toString());
  // Set eid parameter.
  builder.setEndpointId('p');
  assertEquals(
      partialUrl + '&eid=p',
      builder.toString());
  // Modify eid parameter.
  assertEquals(
      partialUrl + '&eid=s',
      builder.setEndpointId('s').toString());
  // Remove eid parameter.
  assertEquals(
      partialUrl,
      builder.setEndpointId(null).toString());

  // Simulate frameworks logged.
  var frameworks = ['firebaseui', 'angularfire'];
  simulateAuthService('APP_NAME', null, frameworks);
  assertEquals(
      partialUrl + '&fw=' + encodeURIComponent(frameworks.join(',')),
      builder.toString());
  // Remove frameworks.
  simulateAuthService('APP_NAME', null, []);
  assertEquals(partialUrl, builder.toString());
}


function testOAuthUrlBuilder_localization() {
  var expectedUrl;
  var provider = new fireauth.GoogleAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  // Custom parameters with no language field as provided by the developer.
  var customParams = {
    'hd': 'example.com',
    'login_hint': 'user@example.com',
    'state': 'bla'
  };
  // Custom parameters with a language field as provided by the developer.
  var customParamsWithLang = {
    'hd': 'example.com',
    'login_hint': 'user@example.com',
    'state': 'bla',
    'hl': 'de'
  };
  // Expected filtered custom parameters with the default language added.
  var expectedCustomParams = {
    'hd': 'example.com',
    'login_hint': 'user@example.com',
    // Default language set.
    'hl': 'fr'
  };
  // Expected filtered custom parameters with no language added.
  var expectedCustomParamsWithoutLang = {
    'hd': 'example.com',
    'login_hint': 'user@example.com'
  };
  // Expected filtered custom parameters with non-default language added.
  var expectedCustomParamsWithLang = {
    'hd': 'example.com',
    'login_hint': 'user@example.com',
    // Default language overridden.
    'hl': 'de'
  };
  // OAuth URL builder.
  var builder = new fireauth.iframeclient.OAuthUrlBuilder(
      'example.firebaseapp.com', 'API_KEY', 'APP_NAME', 'signInWithPopup',
      provider);

  // Simulate Auth language set.
  simulateAuthService('APP_NAME', 'fr');
  // Pass custom parameters with no language field.
  provider.setCustomParameters(customParams);
  // Expected URL should include the default language.
  expectedUrl = 'https://example.firebaseapp.com/__/auth/handler?apiKey=A' +
      'PI_KEY&appName=APP_NAME&authType=signInWithPopup&providerId=google.co' +
      'm&customParameters=' +
      encodeURIComponent(fireauth.util.stringifyJSON(expectedCustomParams)) +
      '&scopes=' + encodeURIComponent('profile,scope1,scope2');
  assertEquals(expectedUrl, builder.toString());

  // Modify custom parameters to include a language parameter.
  provider.setCustomParameters(customParamsWithLang);
  // Expected URL should include the non-default language.
  expectedUrl = 'https://example.firebaseapp.com/__/auth/handler?apiKey=A' +
      'PI_KEY&appName=APP_NAME&authType=signInWithPopup&providerId=google.co' +
      'm&customParameters=' +
      encodeURIComponent(fireauth.util.stringifyJSON(
          expectedCustomParamsWithLang)) +
      '&scopes=' + encodeURIComponent('profile,scope1,scope2');
  assertEquals(expectedUrl, builder.toString());

  // Simulate no default language.
  simulateAuthService('APP_NAME', null);
  // Set custom parameters without a language field.
  provider.setCustomParameters(customParams);
  expectedUrl = 'https://example.firebaseapp.com/__/auth/handler?apiKey=A' +
      'PI_KEY&appName=APP_NAME&authType=signInWithPopup&providerId=google.co' +
      'm&customParameters=' +
      encodeURIComponent(fireauth.util.stringifyJSON(
          expectedCustomParamsWithoutLang)) +
      '&scopes=' + encodeURIComponent('profile,scope1,scope2');
  assertEquals(expectedUrl, builder.toString());
}


function testOAuthUrlBuilder_genericIdp() {
  var provider = new fireauth.OAuthProvider('idp.com');
  provider.addScope('thescope');
  var customParams = {
    'hl': 'es'
  };
  provider.setCustomParameters(customParams);
  var builder = new fireauth.iframeclient.OAuthUrlBuilder(
      'example.firebaseapp.com', 'API_KEY', 'APP_NAME', 'signInWithPopup',
      provider);
  var url = 'https://example.firebaseapp.com/__/auth/handler?' +
      'apiKey=API_KEY&appName=APP_NAME&authType=signInWithPopup&' +
      'providerId=idp.com&customParameters=' +
      encodeURIComponent(fireauth.util.stringifyJSON(customParams)) +
      '&scopes=thescope';
  assertEquals(url, builder.toString());
}


function testOAuthUrlBuilder_twitter() {
  var provider = new fireauth.TwitterAuthProvider();
  var customParams = {
    'lang': 'es'
  };
  provider.setCustomParameters(customParams);
  var builder = new fireauth.iframeclient.OAuthUrlBuilder(
      'example.firebaseapp.com', 'API_KEY', 'APP_NAME', 'signInWithPopup',
      provider);
  var url = 'https://example.firebaseapp.com/__/auth/handler?' +
      'apiKey=API_KEY&appName=APP_NAME&authType=signInWithPopup&' +
      'providerId=twitter.com&customParameters=' +
      encodeURIComponent(fireauth.util.stringifyJSON(customParams));
  assertEquals(url, builder.toString());
}


function testOAuthUrlBuilder_notOAuthProviderInstance() {
  // instanceof doesn't always work due to renaming when compiling. Make sure
  // that adding OAuth2 scopes works even if the provider class isn't an
  // instance of OAuthProvider.
  var provider = new fireauth.FederatedProvider('example.com');
  provider.getScopes = function() {
    return ['scope1'];
  };
  var customParams = {
    'lang': 'es'
  };
  provider.setCustomParameters(customParams);
  var builder = new fireauth.iframeclient.OAuthUrlBuilder(
      'example.firebaseapp.com', 'API_KEY', 'APP_NAME', 'signInWithPopup',
      provider);
  var url = 'https://example.firebaseapp.com/__/auth/handler?' +
      'apiKey=API_KEY&appName=APP_NAME&authType=signInWithPopup&' +
      'providerId=example.com&customParameters=' +
      encodeURIComponent(fireauth.util.stringifyJSON(customParams)) +
      '&scopes=scope1';
  assertEquals(url, builder.toString());
}


/**
 * Tests OAuth URL Builder with an emulator config
 */
function testOAuthUrlBuilder_withEmulatorConfig() {
  var provider = new fireauth.GoogleAuthProvider();
  var emulatorConfig = {
    url: "http://emulator.host:1234"
  };
  var builder = new fireauth.iframeclient.OAuthUrlBuilder(
    'example.firebaseapp.com', 'API_KEY', 'APP_NAME', 'signInWithPopup',
    provider, emulatorConfig);
  var url = 'http://emulator.host:1234/emulator/auth/handler?' +
    'apiKey=API_KEY&appName=APP_NAME&authType=signInWithPopup&' +
    'providerId=google.com&scopes=profile';
  assertEquals(url, builder.toString());
}


/**
 * Tests initialization of Auth iframe and its event listeners.
 */
function testIfcHandler() {
  asyncTestCase.waitForSignals(6);
  // The expected iframe URL.
  var expectedUrl = fireauth.iframeclient.IfcHandler.getAuthIframeUrl(
      authDomain, apiKey, appName, version);
  var authEvent = new fireauth.AuthEvent(
      'unknown', '1234', 'http://www.example.com/#oauthResponse', 'SESSION_ID');
  var resp = {
    'authEvent': authEvent.toPlainObject()
  };
  var invalid = undefined;
  var handler1 = goog.testing.recordFunction(function() {return true;});
  var handler2 = goog.testing.recordFunction(function() {return true;});
  var handler3 = goog.testing.recordFunction(function() {return false;});
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Should not have volatile storage.
  assertFalse(ifcHandler.hasVolatileStorage());
  // Should unload on redirect.
  assertTrue(ifcHandler.unloadsOnRedirect());
  // Confirm expected iframe URL.
  assertEquals(ifcHandler.getIframeUrl(), expectedUrl);
  // Should not be initialized in constructor.
  assertEquals(
      0, fireauth.iframeclient.IframeWrapper.prototype.onReady.getCallCount());
  ifcHandler.initialize().then(function() {
    // Test Auth event listeners.
    // Add both handlers.
    ifcHandler.addAuthEventListener(handler1);
    ifcHandler.addAuthEventListener(handler2);
    ifcHandler.addAuthEventListener(handler3);
    eventsMap[fireauth.iframeclient.IfcHandler.ReceiverEvent.AUTH_EVENT](resp)
        .then(function(resolvedResp) {
          assertObjectEquals({'status': 'ACK'}, resolvedResp);
          asyncTestCase.signal();
        });
    // All should be called.
    assertEquals(1, handler1.getCallCount());
    assertObjectEquals(
        authEvent, handler1.getLastCall().getArgument(0));
    assertEquals(1, handler2.getCallCount());
    assertObjectEquals(
        authEvent, handler2.getLastCall().getArgument(0));
    assertEquals(1, handler3.getCallCount());
    assertObjectEquals(
        authEvent, handler3.getLastCall().getArgument(0));
    // Remove handler2.
    ifcHandler.removeAuthEventListener(handler2);
    eventsMap[fireauth.iframeclient.IfcHandler.ReceiverEvent.AUTH_EVENT](resp)
        .then(function(resolvedResp) {
          assertObjectEquals({'status': 'ACK'}, resolvedResp);
          asyncTestCase.signal();
        });
    // Only handler1 and handler3 should be called.
    assertEquals(2, handler1.getCallCount());
    assertObjectEquals(
        authEvent, handler1.getLastCall().getArgument(0));
    assertEquals(2, handler3.getCallCount());
    assertObjectEquals(
        authEvent, handler3.getLastCall().getArgument(0));
    assertEquals(1, handler2.getCallCount());
    // Remove handler1.
    ifcHandler.removeAuthEventListener(handler1);
    eventsMap[fireauth.iframeclient.IfcHandler.ReceiverEvent.AUTH_EVENT](resp)
        .then(function(resolvedResp) {
          // No handler for event so error returned.
          assertObjectEquals({'status': 'ERROR'}, resolvedResp);
          asyncTestCase.signal();
        });
    // Only handler3 called.
    assertEquals(2, handler1.getCallCount());
    assertEquals(1, handler2.getCallCount());
    assertEquals(3, handler3.getCallCount());
    assertObjectEquals(
        authEvent, handler3.getLastCall().getArgument(0));
    // Remove handler3.
    ifcHandler.removeAuthEventListener(handler3);
    eventsMap[fireauth.iframeclient.IfcHandler.ReceiverEvent.AUTH_EVENT](resp)
        .then(function(resolvedResp) {
          // No handler for event so error returned.
          assertObjectEquals({'status': 'ERROR'}, resolvedResp);
          asyncTestCase.signal();
        });
    // No handler called again.
    assertEquals(2, handler1.getCallCount());
    assertEquals(1, handler2.getCallCount());
    assertEquals(3, handler3.getCallCount());

    // Test when error occurs.
    ifcHandler.addAuthEventListener(handler1);
    eventsMap[fireauth.iframeclient.IfcHandler.ReceiverEvent.AUTH_EVENT](
        invalid).then(function(resolvedResp) {
          assertObjectEquals({'status': 'ERROR'}, resolvedResp);
          asyncTestCase.signal();
        });
    // Test isWebStorageSupported.
    ifcHandler.isWebStorageSupported().then(function(status) {
      assertTrue(status);
      asyncTestCase.signal();
    });
  });
}


/**
 * Asserts getIframeUrl handles emulator URLs.
 */
function testIfcHandler_withEmulator() {
  var emulatorConfig = {
    url: 'http://emulator.test.domain:1234'
  };
  // The expected iframe URL.
  var expectedUrl = fireauth.iframeclient.IfcHandler.getAuthIframeUrl(
    authDomain, apiKey, appName, version, undefined, undefined,
    emulatorConfig);
  // Initialize the ifcHandler.
  ifcHandler = new fireauth.iframeclient.IfcHandler(
    authDomain, apiKey, appName, version, undefined, emulatorConfig);
  // Confirm expected iframe URL.
  assertEquals(ifcHandler.getIframeUrl(), expectedUrl);
}


function testIfcHandler_shouldNotBeInitializedEarly() {
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Can run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return true;
      });
  // Iframe can sync web storage.
  stubs.replace(
      fireauth.util,
      'iframeCanSyncWebStorage',
      function() {
        return true;
      });
  assertFalse(ifcHandler.shouldBeInitializedEarly());
  // Iframe cannot sync web storage.
  stubs.replace(
      fireauth.util,
      'iframeCanSyncWebStorage',
      function() {
        return false;
      });
  assertFalse(ifcHandler.shouldBeInitializedEarly());
  // Cannot run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  // Iframe can sync web storage.
  stubs.replace(
      fireauth.util,
      'iframeCanSyncWebStorage',
      function() {
        return true;
      });
  assertFalse(ifcHandler.shouldBeInitializedEarly());
}


function testIfcHandler_shouldBeInitializedEarly() {
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Cannot run in background.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  // Iframe cannot sync web storage.
  stubs.replace(
      fireauth.util,
      'iframeCanSyncWebStorage',
      function() {
        return false;
      });
  assertTrue(ifcHandler.shouldBeInitializedEarly());
}


function testIfcHandler_initializeAndWait_success() {
  // Confirm expected endpoint config and frameworks passed to underlying RPC
  // handler.
  var provider = new fireauth.GoogleAuthProvider();
  var expectedFrameworks = [fireauth.util.Framework.FIREBASEUI];
  var expectedClientVersion = fireauth.util.getClientVersion(
      fireauth.util.ClientImplementation.JSCORE,
      version,
      expectedFrameworks);
  var endpoint = fireauth.constants.Endpoint.STAGING;
  var endpointConfig = {
    'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
    'secureTokenEndpoint': endpoint.secureTokenEndpoint
  };
  // Simulate expected frameworks on the Auth instance corresponding to appName.
  simulateAuthService(appName, null, expectedFrameworks);
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.constants,
      'getEndpointConfig',
      function(opt_id) {
        assertEquals(endpoint.id, opt_id);
        return endpointConfig;
      });
  var getAuthIframeUrl = mockControl.createMethodMock(
      fireauth.iframeclient.IfcHandler, 'getAuthIframeUrl');
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  var rpcHandlerConstructor = mockControl.createConstructorMock(
      fireauth, 'RpcHandler');
  var iframeWrapper = mockControl.createStrictMock(
      fireauth.iframeclient.IframeWrapper);
  var iframeWrapperConstructor = mockControl.createConstructorMock(
      fireauth.iframeclient, 'IframeWrapper');
  // Iframe initialized with expected endpoint ID.
  getAuthIframeUrl(authDomain, apiKey, appName, ignoreArgument,
      fireauth.constants.Endpoint.STAGING.id, expectedFrameworks, ignoreArgument)
      .$returns('https://url');
  // Confirm iframe URL returned by getAuthIframeUrl used to initialize the
  // IframeWrapper.
  iframeWrapperConstructor('https://url').$returns(iframeWrapper);
  iframeWrapper.registerEvent('authEvent', ignoreArgument);
  iframeWrapper.onReady().$returns(goog.Promise.resolve());
  // Should be initialized with expected endpoint config and client version.
  rpcHandlerConstructor(apiKey, endpointConfig, expectedClientVersion)
      .$returns(rpcHandler);
  var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
  var domain = uri.getDomain();
  rpcHandler.getAuthorizedDomains().$returns(goog.Promise.resolve([domain]));
  mockControl.$replayAll();

  asyncTestCase.waitForSignals(1);
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version,
      fireauth.constants.Endpoint.STAGING.id);
  ifcHandler.initializeAndWait().then(function() {
    return ifcHandler.processRedirect('linkViaRedirect', provider, '1234');
  }).then(function() {
    assertEquals(1, fireauth.util.goTo.getCallCount());
    asyncTestCase.signal();
  });
}


function testIfcHandler_initializeAndWait_error() {
  asyncTestCase.waitForSignals(1);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  stubs.replace(
      fireauth.iframeclient.IframeWrapper.prototype,
      'onReady',
      function() {
        return goog.Promise.reject(new Error('Network Error'));
      });
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Should throw network error.
  ifcHandler.initializeAndWait().thenCatch(function(error) {
    assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testIfcHandler_processPopup_blocked() {
  asyncTestCase.waitForSignals(1);
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.POPUP_BLOCKED);
  var provider = new fireauth.GoogleAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Should throw popup blocked error.
  ifcHandler.processPopup(
      null, 'linkViaPopup', provider, onInit, onError, '1234', false)
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIfcHandler_processPopup_invalidOrigin() {
  asyncTestCase.waitForSignals(1);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  // Assume origin is an invalid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        return goog.Promise.resolve([]);
      });
  var expectedError =
      new fireauth.InvalidOriginError(fireauth.util.getCurrentUrl());
  var provider = new fireauth.GoogleAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Should throw invalid origin error.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', false)
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIfcHandler_processPopup_invalidProvider() {
  asyncTestCase.waitForSignals(1);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  // Non OAuth provider should throw invalid provider error.
  var provider = new fireauth.EmailAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Should throw invalid provider error.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', false)
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIfcHandler_processPopup_initializeAndWaitError() {
  asyncTestCase.waitForSignals(1);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  // Simulate error embedding the iframe.
  stubs.replace(
      fireauth.iframeclient.IframeWrapper.prototype,
      'onReady',
      function() {
        return goog.Promise.reject(new Error('Network Error'));
      });
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  var provider = new fireauth.GoogleAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Should throw network error.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', false)
      .thenCatch(function(error) {
        // Should be initialized.
        assertEquals(1, onInit.getCallCount());
        // Should channel error.
        assertEquals(1, onError.getCallCount());
        assertEquals(error, onError.getLastCall().getArgument(0));
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIfcHandler_processPopup_notAlreadyRedirected_success() {
  asyncTestCase.waitForSignals(1);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  var provider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain,
      apiKey,
      appName,
      'linkViaPopup',
      provider,
      null,
      '1234',
      version,
      undefined,
      // Check expected endpoint ID appended.
      fireauth.constants.Endpoint.STAGING.id);
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version,
      fireauth.constants.Endpoint.STAGING.id);
  // Should succeed.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', false)
      .then(function() {
        // On init should be called as the iframe is initialized.
        assertEquals(1, onInit.getCallCount());
        // No error.
        assertEquals(0, onError.getCallCount());
        // Popup redirected.
        assertEquals(
            expectedUrl,
            fireauth.util.goTo.getLastCall().getArgument(0));
        assertEquals(
            popupWin,
            fireauth.util.goTo.getLastCall().getArgument(1));
        asyncTestCase.signal();
      });
}


function testIfcHandler_processPopup_notAlreadyRedirected_tenantId_success() {
  asyncTestCase.waitForSignals(1);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  var tenantId = '123456789012';
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  var provider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain,
      apiKey,
      appName,
      'linkViaPopup',
      provider,
      null,
      '1234',
      version,
      undefined,
      // Check expected endpoint ID appended.
      fireauth.constants.Endpoint.STAGING.id,
      tenantId);
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version,
      fireauth.constants.Endpoint.STAGING.id);
  // Should succeed.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', false,
      tenantId).then(function() {
        // On init should be called as the iframe is initialized.
        assertEquals(1, onInit.getCallCount());
        // No error.
        assertEquals(0, onError.getCallCount());
        // Popup redirected.
        assertEquals(
            expectedUrl,
            fireauth.util.goTo.getLastCall().getArgument(0));
        assertEquals(
            popupWin,
            fireauth.util.goTo.getLastCall().getArgument(1));
        asyncTestCase.signal();
      });
}


/** Asserts processRedirect can handle emulator URLs. */
function testIfcHandler_processPopup_success_withEmulator() {
  var emulatorConfig = {
    url: 'http:/emulator.test.domain:1234'
  };
  asyncTestCase.waitForSignals(1);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  stubs.replace(
    fireauth.util,
    'goTo',
    goog.testing.recordFunction());
  // Assume origin is a valid one.
  stubs.replace(
    fireauth.RpcHandler.prototype,
    'getAuthorizedDomains',
    function () {
      var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
      var domain = uri.getDomain();
      return goog.Promise.resolve([domain]);
    });
  stubs.replace(
    fireauth.RpcHandler.prototype,
    'updateEmulatorConfig',
    goog.testing.recordFunction());
  var provider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
    authDomain,
    apiKey,
    appName,
    'linkViaPopup',
    provider,
    null,
    '1234',
    version,
    undefined,
    // Check expected endpoint ID appended.
    fireauth.constants.Endpoint.STAGING.id,
    undefined,
    emulatorConfig);
  ifcHandler = new fireauth.iframeclient.IfcHandler(
    authDomain, apiKey, appName, version,
    fireauth.constants.Endpoint.STAGING.id, emulatorConfig);
  // Should succeed.
  ifcHandler.processPopup(
    popupWin, 'linkViaPopup', provider, onInit, onError, '1234', false)
    .then(function () {
      // On init should be called as the iframe is initialized.
      assertEquals(1, onInit.getCallCount());
      // No error.
      assertEquals(0, onError.getCallCount());
      // Popup redirected.
      assertEquals(
        expectedUrl,
        fireauth.util.goTo.getLastCall().getArgument(0));
      // Emulator config set on RpcHandler.
      assertObjectEquals(
        emulatorConfig,
        fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
          .getArgument(0));
      assertEquals(
        popupWin,
        fireauth.util.goTo.getLastCall().getArgument(1));
      asyncTestCase.signal();
    });
}


function testIfcHandler_processPopup_redirected_iframeCanRunInBG_success() {
  asyncTestCase.waitForSignals(1);
  // Simulate that the app can run in the background but is running in an
  // iframe. This typically triggers processPopup call with
  // opt_alreadyRedirected set to true. This is due to the fact that sandboxed
  // iframes may not be able to redirect a popup window that they opened.
  // In this case, simulate the origin is whitelisted. This should succeed with
  // no additional redirect call.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return true;
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
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var provider = new fireauth.GoogleAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Call with alreadyRedirected true.
  // Should succeed.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', true)
      .then(function() {
        // On init should be called as the iframe is initialized.
        assertEquals(1, onInit.getCallCount());
        // No error.
        assertEquals(0, onError.getCallCount());
        // No additional redirect.
        assertEquals(0, fireauth.util.goTo.getCallCount(0));
        asyncTestCase.signal();
      });
}


function testIfcHandler_processPopup_redirected_iframeCanRunInBG_error() {
  asyncTestCase.waitForSignals(1);
  // Simulate that the app can run in the background but is running in an
  // iframe. This typically triggers processPopup call with
  // opt_alreadyRedirected set to true. This is due to the fact that sandboxed
  // iframes may not be able to redirect a popup window that they opened.
  // In this case, simulate the origin is not whitelisted. This should throw the
  // expected error.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return true;
      });
  // Assume origin is an invalid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        return goog.Promise.resolve([]);
      });
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var provider = new fireauth.GoogleAuthProvider();
  var expectedError =
      new fireauth.InvalidOriginError(fireauth.util.getCurrentUrl());
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Call with alreadyRedirected true.
  // Should succeed.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', true)
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        // On init should not be called.
        assertEquals(0, onInit.getCallCount());
        // No on error call.
        assertEquals(0, onError.getCallCount());
        // No redirect.
        assertEquals(0, fireauth.util.goTo.getCallCount(0));
        asyncTestCase.signal();
      });
}


function testIfcHandler_processPopup_alreadyRedirected_success() {
  asyncTestCase.waitForSignals(1);
  // Simulate that the app cannot run in the background. This typically triggers
  // processPopup call with opt_alreadyRedirected set to true.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var provider = new fireauth.GoogleAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Call with alreadyRedirected true.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', true)
      .then(function() {
        // On initialization called.
        assertEquals(1, onInit.getCallCount());
        // No error.
        assertEquals(0, onError.getCallCount());
        // As popup already redirected, no redirect triggered.
        /** @suppress {missingRequire} */
        assertEquals(0, fireauth.util.goTo.getCallCount());
        asyncTestCase.signal();
      });
}


function testIfcHandler_processPopup_alreadyRedirect_initializeAndWaitError() {
  asyncTestCase.waitForSignals(1);
  // Simulate that the app cannot run in the background. This typically triggers
  // processPopup call with opt_alreadyRedirected set to true.
  stubs.replace(
      fireauth.util,
      'runsInBackground',
      function() {
        return false;
      });
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  stubs.replace(
      fireauth.iframeclient.IframeWrapper.prototype,
      'onReady',
      function() {
        return goog.Promise.reject(new Error('Network Error'));
      });
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var provider = new fireauth.GoogleAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Call with alreadyRedirected true.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', true)
      .then(function() {
        // On initialization called.
        assertEquals(1, onInit.getCallCount());
        // No popup redirect.
        /** @suppress {missingRequire} */
        assertEquals(0, fireauth.util.goTo.getCallCount());
        // onError should be called in the background if an error occurs
        // during embed of iframe.
        ifcHandler.initializeAndWait().thenCatch(function(error) {
          assertEquals(1, onError.getCallCount());
          assertObjectEquals(error, onError.getLastCall().getArgument(0));
          asyncTestCase.signal();
        });
      });
}


function testIfcHandler_processPopup_networkError_then_success() {
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var onInit = goog.testing.recordFunction();
  var onError = goog.testing.recordFunction();
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  var calls = 0;
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        calls++;
        // Simulate network error on first call.
        if (calls == 1) {
          return goog.Promise.reject(expectedError);
        }
        // Simulate valid origin on next call.
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  var provider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain,
      apiKey,
      appName,
      'linkViaPopup',
      provider,
      null,
      '1234',
      version);
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // First call fails with origin check network error.
  ifcHandler.processPopup(
      popupWin, 'linkViaPopup', provider, onInit, onError, '1234', false)
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
         // Second call should succeed and confirm origin check not cached.
         ifcHandler.processPopup(
             popupWin, 'linkViaPopup', provider, onInit, onError, '1234', false)
             .then(function() {
               // Success on retrial. Invalid origin not cached.
               assertEquals(1, onInit.getCallCount());
               assertEquals(0, onError.getCallCount());
               assertEquals(
                   expectedUrl,
                   fireauth.util.goTo.getLastCall().getArgument(0));
               assertEquals(
                   popupWin,
                   fireauth.util.goTo.getLastCall().getArgument(1));
               asyncTestCase.signal();
             });
      });
}


function testIfcHandler_startPopupTimeout_webStorageNotSupported() {
  stubs.replace(
      fireauth.iframeclient.IfcHandler.prototype,
      'isWebStorageSupported',
      function() {
        return goog.Promise.resolve(false);
      });
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  // On error should be triggered with web storage not supported error.
  var onError = function(error) {
    assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  };
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  ifcHandler.startPopupTimeout(popupWin, onError, 1000);
}


function testIfcHandler_startPopupTimeout_popupClosedByUser() {
  clock = new goog.testing.MockClock(true);
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.POPUP_CLOSED_BY_USER);
  var popupWin = {
    close: goog.testing.recordFunction()
  };
  var onError = goog.testing.recordFunction();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // onError should be called with the expected popup closed by user error.
  ifcHandler.startPopupTimeout(popupWin, onError, 2000).then(function() {
    assertEquals(1, onError.getCallCount());
    assertObjectEquals(expectedError, onError.getLastCall().getArgument(0));
    asyncTestCase.signal();
  });
  // Exceed timeout after close to trigger popup closed by user.
  popupWin.closed = true;
  clock.tick(4000);
}


function testIfcHandler_processRedirect_invalidOrigin() {
  asyncTestCase.waitForSignals(1);
  // Assume origin is an invalid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        return goog.Promise.resolve([]);
      });
  var expectedError =
      new fireauth.InvalidOriginError(fireauth.util.getCurrentUrl());
  var provider = new fireauth.GoogleAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Invalid origin error should be thrown.
  ifcHandler.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIfcHandler_processRedirect_invalidProvider() {
  asyncTestCase.waitForSignals(1);
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  // Invalid OAuth provider.
  var provider = new fireauth.EmailAuthProvider();
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // Should throw invalid provider error.
  ifcHandler.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIfcHandler_processRedirect_success() {
  var provider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain,
      apiKey,
      appName,
      'linkViaRedirect',
      provider,
      fireauth.util.getCurrentUrl(),
      '1234',
      version,
      undefined,
      // Check expected endpoint ID appended.
      fireauth.constants.Endpoint.STAGING.id);
  asyncTestCase.waitForSignals(1);
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version,
      fireauth.constants.Endpoint.STAGING.id);
  // Should succeed and redirect.
  ifcHandler.processRedirect('linkViaRedirect', provider, '1234')
      .then(function() {
        /** @suppress {missingRequire} */
        assertEquals(
            expectedUrl,
            fireauth.util.goTo.getLastCall().getArgument(0));
        asyncTestCase.signal();
      });
}


function testIfcHandler_processRedirect_tenantId_success() {
  var provider = new fireauth.GoogleAuthProvider();
  var tenantId = '123456789012';
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain,
      apiKey,
      appName,
      'linkViaRedirect',
      provider,
      fireauth.util.getCurrentUrl(),
      '1234',
      version,
      undefined,
      // Check expected endpoint ID appended.
      fireauth.constants.Endpoint.STAGING.id,
      tenantId);
  asyncTestCase.waitForSignals(1);
  // Assume origin is a valid one.
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version,
      fireauth.constants.Endpoint.STAGING.id);
  // Should succeed and redirect.
  ifcHandler.processRedirect('linkViaRedirect', provider, '1234', tenantId)
      .then(function() {
        /** @suppress {missingRequire} */
        assertEquals(
            expectedUrl,
            fireauth.util.goTo.getLastCall().getArgument(0));
        asyncTestCase.signal();
      });
}


function testIfcHandler_processRedirect_networkError_then_success() {
  asyncTestCase.waitForSignals(1);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  stubs.replace(
      fireauth.util,
      'goTo',
      goog.testing.recordFunction());
  var calls = 0;
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'getAuthorizedDomains',
      function() {
        calls++;
        // Simulate network error on first call.
        if (calls == 1) {
          return goog.Promise.reject(expectedError);
        }
        // Simulate valid origin on next call.
        var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
        var domain = uri.getDomain();
        return goog.Promise.resolve([domain]);
      });
  var provider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain,
      apiKey,
      appName,
      'linkViaRedirect',
      provider,
      fireauth.util.getCurrentUrl(),
      '1234',
      version);
  ifcHandler = new fireauth.iframeclient.IfcHandler(
      authDomain, apiKey, appName, version);
  // First call fails with origin check network error.
  ifcHandler.processRedirect('linkViaRedirect', provider, '1234')
      .thenCatch(function(error) {
        assertErrorEquals(expectedError, error);
         // Second call should succeed and confirm origin check not cached.
         ifcHandler.processRedirect('linkViaRedirect', provider, '1234')
             .then(function() {
               // Success on retrial. Redirect succeeded.
               /** @suppress {missingRequire} */
               assertEquals(1, fireauth.util.goTo.getCallCount());
               /** @suppress {missingRequire} */
               assertEquals(
                   expectedUrl,
                   fireauth.util.goTo.getLastCall().getArgument(0));
               asyncTestCase.signal();
             });
      });
}


/** Asserts that processRedirects works with emulator URLs. */
function testIfcHandler_processRedirect_success_withEmulator() {
  var emulatorConfig = {
    url: 'http:/emulator.test.domain:1234'
  };
  var provider = new fireauth.GoogleAuthProvider();
  var expectedUrl = fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
    authDomain,
    apiKey,
    appName,
    'linkViaRedirect',
    provider,
    fireauth.util.getCurrentUrl(),
    '1234',
    version,
    undefined,
    // Check expected endpoint ID appended.
    fireauth.constants.Endpoint.STAGING.id,
    null,
    emulatorConfig);
  asyncTestCase.waitForSignals(1);
  // Assume origin is a valid one.
  stubs.replace(
    fireauth.RpcHandler.prototype,
    'getAuthorizedDomains',
    function () {
      var uri = goog.Uri.parse(fireauth.util.getCurrentUrl());
      var domain = uri.getDomain();
      return goog.Promise.resolve([domain]);
    });
  stubs.replace(
    fireauth.RpcHandler.prototype,
    'updateEmulatorConfig',
    goog.testing.recordFunction());
  stubs.replace(
    fireauth.util,
    'goTo',
    goog.testing.recordFunction());
  ifcHandler = new fireauth.iframeclient.IfcHandler(
    authDomain, apiKey, appName, version,
    fireauth.constants.Endpoint.STAGING.id, emulatorConfig);
  // Should succeed and redirect.
  ifcHandler.processRedirect('linkViaRedirect', provider, '1234')
    .then(function () {
      /** @suppress {missingRequire} */
      assertEquals(
        expectedUrl,
        fireauth.util.goTo.getLastCall().getArgument(0));
      // Emulator config set on RpcHandler.
      assertObjectEquals(
        emulatorConfig,
        fireauth.RpcHandler.prototype.updateEmulatorConfig.getLastCall()
          .getArgument(0));
      asyncTestCase.signal();
    });
}


/**
 * Tests getAuthIframeUrl.
 */
function testGetAuthIframeUrl() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var version = '3.0.0-rc.1';
  var endpointId = 's';
  assertEquals(
      'https://subdomain.firebaseapp.com/__/auth/iframe?apiKey=apiKey1&appNa' +
          'me=appName1&v=' + encodeURIComponent(version) + '&eid=' + endpointId,
      fireauth.iframeclient.IfcHandler.getAuthIframeUrl(
          authDomain, apiKey, appName, version, endpointId));
}


/**
 * Asserts getAuthIframeUrl handles emulator URLs.
 */
function testGetAuthIframeUrl_withEmulator() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var version = '3.0.0-rc.1';
  var endpointId = 's';
  var emulatorConfig = {
    url: "http://emulator.host:1234"
  };
  assertEquals(
    'http://emulator.host:1234/emulator/auth/iframe?apiKey=apiKey1&appNa' +
    'me=appName1&v=' + encodeURIComponent(version) + '&eid=' + endpointId,
    fireauth.iframeclient.IfcHandler.getAuthIframeUrl(
      authDomain,
      apiKey,
      appName,
      version,
      endpointId,
      null,
      emulatorConfig)
  );
}


/**
 * Tests getAuthIframeUrl with frameworks.
 */
function testGetAuthIframeUrl_frameworks() {
  var expectedFrameworks = ['firebaseui', 'angularfire'];
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var version = '3.0.0-rc.1';
  var endpointId = 's';
  assertEquals(
      'https://subdomain.firebaseapp.com/__/auth/iframe?apiKey=apiKey1&appNa' +
      'me=appName1&v=' + encodeURIComponent(version) + '&eid=' + endpointId +
      '&fw=' + encodeURIComponent(expectedFrameworks.join(',')),
      fireauth.iframeclient.IfcHandler.getAuthIframeUrl(
          authDomain, apiKey, appName, version, endpointId,
          expectedFrameworks));
}


/**
 * Tests getAuthIframeUrl with injections.
 */
function testGetAuthIframeUrl_injections() {
  // Injecting an evil redirect for some reason.
  var authDomain = 'subdomain.firebaseapp.com/?redirectUrl=evil.com#';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  assertEquals(
      'https://subdomain.firebaseapp.com%2F%3FredirectUrl%3Devil.com%23/__/a' +
          'uth/iframe?apiKey=apiKey1&appName=appName1',
      fireauth.iframeclient.IfcHandler.getAuthIframeUrl(
          authDomain, apiKey, appName));
}


/**
 * Tests getOAuthHelperWidgetUrl with redirect URL, event ID, version and no
 * scopes.
 */
function testGetOAuthHelperWidgetUrl_redirectUrlEventIdVersionAndNoScopes() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var providerId = 'facebook.com';
  var provider = new fireauth.FacebookAuthProvider();
  var redirectUrl = 'http://www.example.com/redirect?a=b#c';
  var eventId = '12345678';
  var version = '3.0.0-rc.1';
  var endpointId = 's';
  var expectedWidgetUrl = 'https://subdomain.firebaseapp.com/__/auth/handler' +
      '?apiKey=' + encodeURIComponent(apiKey) +
      '&appName=' + encodeURIComponent(appName) +
      '&authType=' + encodeURIComponent(authType) +
      '&providerId=' + encodeURIComponent(providerId) +
      '&redirectUrl=' + encodeURIComponent(redirectUrl) +
      '&eventId=' + encodeURIComponent(eventId) +
      '&v=' + encodeURIComponent(version) +
      '&eid=' + endpointId;
  assertEquals(
      expectedWidgetUrl,
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain,
          apiKey,
          appName,
          authType,
          provider,
          redirectUrl,
          eventId,
          version,
          null,
          endpointId));
}


/**
 * Tests getOAuthHelperWidgetUrl with redirect URL, event ID, version, tenant ID
 * and no scopes.
 */
function testGetOAuthHelperWidgetUrl_redirectUrlEventIdVersionTenantId() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var providerId = 'facebook.com';
  var provider = new fireauth.FacebookAuthProvider();
  var redirectUrl = 'http://www.example.com/redirect?a=b#c';
  var eventId = '12345678';
  var version = '3.0.0-rc.1';
  var endpointId = 's';
  var tenantId = '123456789012';
  var expectedWidgetUrl = 'https://subdomain.firebaseapp.com/__/auth/handler' +
      '?apiKey=' + encodeURIComponent(apiKey) +
      '&appName=' + encodeURIComponent(appName) +
      '&authType=' + encodeURIComponent(authType) +
      '&providerId=' + encodeURIComponent(providerId) +
      '&redirectUrl=' + encodeURIComponent(redirectUrl) +
      '&eventId=' + encodeURIComponent(eventId) +
      '&v=' + encodeURIComponent(version) +
      '&tid=' + encodeURIComponent(tenantId) +
      '&eid=' + endpointId;
  assertEquals(
      expectedWidgetUrl,
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain,
          apiKey,
          appName,
          authType,
          provider,
          redirectUrl,
          eventId,
          version,
          null,
          endpointId,
          tenantId));
}


/**
 * Tests getOAuthHelperWidgetUrl with injections.
 */
function testGetOAuthHelperWidgetUrl_injections() {
  // Injecting an evil redirect for some reason.
  var authDomain = 'subdomain.firebaseapp.com/?redirectUrl=evil.com#';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var provider = new fireauth.FacebookAuthProvider();
  var providerId = 'facebook.com';
  var redirectUrl = 'http://www.example.com/redirect?a=b#c';
  var eventId = '12345678';
  var expectedWidgetUrl = 'https://subdomain.firebaseapp.com%2F%3FredirectUr' +
      'l%3Devil.com%23/__/auth/handler' +
      '?apiKey=' + encodeURIComponent(apiKey) +
      '&appName=' + encodeURIComponent(appName) +
      '&authType=' + encodeURIComponent(authType) +
      '&providerId=' + encodeURIComponent(providerId) +
      '&redirectUrl=' + encodeURIComponent(redirectUrl) +
      '&eventId=' + encodeURIComponent(eventId);
  assertEquals(
      expectedWidgetUrl,
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain,
          apiKey,
          appName,
          authType,
          provider,
          redirectUrl,
          eventId));
}


/**
 * Tests getOAuthHelperWidgetUrl with scope, event ID and redirect URL.
 */
function testGetOAuthHelperWidgetUrl_redirectUrlEventIdAndScopes() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var providerId = 'facebook.com';
  var redirectUrl = 'http://www.example.com/redirect?a=b#c';
  var provider = new fireauth.FacebookAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  provider.addScope('scope3');
  var eventId = '12345678';
  var expectedWidgetUrl = 'https://subdomain.firebaseapp.com/__/auth/handler' +
      '?apiKey=' + encodeURIComponent(apiKey) +
      '&appName=' + encodeURIComponent(appName) +
      '&authType=' + encodeURIComponent(authType) +
      '&providerId=' + encodeURIComponent(providerId) +
      '&scopes=' + encodeURIComponent('scope1,scope2,scope3') +
      '&redirectUrl=' + encodeURIComponent(redirectUrl) +
      '&eventId=' + encodeURIComponent(eventId);
  assertEquals(
      expectedWidgetUrl,
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain,
          apiKey,
          appName,
          authType,
          provider,
          redirectUrl,
          eventId));
}


/**
 * Tests getOAuthHelperWidgetUrl with scope, event ID, redirect URL and tenant
 * ID.
 */
function testGetOAuthHelperWidgetUrl_redirectUrlEventIdTenantIdAndScopes() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var providerId = 'facebook.com';
  var redirectUrl = 'http://www.example.com/redirect?a=b#c';
  var provider = new fireauth.FacebookAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  provider.addScope('scope3');
  var eventId = '12345678';
  var tenantId = '123456789012';
  var expectedWidgetUrl = 'https://subdomain.firebaseapp.com/__/auth/handler' +
      '?apiKey=' + encodeURIComponent(apiKey) +
      '&appName=' + encodeURIComponent(appName) +
      '&authType=' + encodeURIComponent(authType) +
      '&providerId=' + encodeURIComponent(providerId) +
      '&scopes=' + encodeURIComponent('scope1,scope2,scope3') +
      '&redirectUrl=' + encodeURIComponent(redirectUrl) +
      '&eventId=' + encodeURIComponent(eventId) +
      '&tid=' + encodeURIComponent(tenantId);
  assertEquals(
      expectedWidgetUrl,
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain,
          apiKey,
          appName,
          authType,
          provider,
          redirectUrl,
          eventId,
          null,
          null,
          null,
          tenantId));
}


/**
 * Tests getOAuthHelperWidgetUrl with no redirect URL and no scopes.
 */
function testGetOAuthHelperWidgetUrl_noRedirectUrlAndNoScopes() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var providerId = 'facebook.com';
  var provider = new fireauth.FacebookAuthProvider();
  var expectedWidgetUrl = 'https://subdomain.firebaseapp.com/__/auth/handler' +
      '?apiKey=' + encodeURIComponent(apiKey) +
      '&appName=' + encodeURIComponent(appName) +
      '&authType=' + encodeURIComponent(authType) +
      '&providerId=' + encodeURIComponent(providerId);
  assertEquals(
      expectedWidgetUrl,
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain, apiKey, appName, authType, provider));
}


/**
 * Tests getOAuthHelperWidgetUrl with scopes and no redirect URL.
 */
function testGetOAuthHelperWidgetUrl_scopesAndNoRedirectUrl() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var providerId = 'facebook.com';
  var provider = new fireauth.FacebookAuthProvider();
  provider.addScope('scope1');
  provider.addScope('scope2');
  provider.addScope('scope3');
  var expectedWidgetUrl = 'https://subdomain.firebaseapp.com/__/auth/handler' +
      '?apiKey=' + encodeURIComponent(apiKey) +
      '&appName=' + encodeURIComponent(appName) +
      '&authType=' + encodeURIComponent(authType) +
      '&providerId=' + encodeURIComponent(providerId) +
      '&scopes=' + encodeURIComponent('scope1,scope2,scope3');
  assertEquals(
      expectedWidgetUrl,
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain, apiKey, appName, authType, provider));
}


/**
 * Tests getOAuthHelperWidgetUrl with Auth languageCode and frameworks.
 */
function testGetOAuthHelperWidgetUrl_frameworksAndLanguageCode() {
  // Test getOAuthHelperWidgetUrl picks up Auth languageCode and frameworks.
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var providerId = 'facebook.com';
  var provider = new fireauth.FacebookAuthProvider();
  var languageCode = 'fr';
  var frameworks = ['firebaseui', 'angularfire'];
  provider.addScope('scope1');
  provider.addScope('scope2');
  provider.addScope('scope3');
  simulateAuthService(appName, languageCode, frameworks);
  var expectedWidgetUrl = 'https://subdomain.firebaseapp.com/__/auth/handler' +
      '?apiKey=' + encodeURIComponent(apiKey) +
      '&appName=' + encodeURIComponent(appName) +
      '&authType=' + encodeURIComponent(authType) +
      '&providerId=' + encodeURIComponent(providerId) +
      '&customParameters=' + encodeURIComponent(
          fireauth.util.stringifyJSON({'locale': 'fr'})) +
      '&scopes=' + encodeURIComponent('scope1,scope2,scope3') +
      '&fw=' + encodeURIComponent(frameworks.join(','));
  assertEquals(
      expectedWidgetUrl,
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          authDomain, apiKey, appName, authType, provider));
}


/**
 * Asserts getOAuthHelperWidgetUrl handles emulator URLs.
 */
function testGetOAuthHelperWidgetUrl_withEmulator() {
  var authDomain = 'subdomain.firebaseapp.com';
  var apiKey = 'apiKey1';
  var appName = 'appName1';
  var authType = 'signInWithPopup';
  var providerId = 'facebook.com';
  var provider = new fireauth.FacebookAuthProvider();
  var emulatorConfig = {
    url: 'http://emulator.test.domain:1234'
  };
  var expectedWidgetUrl = 'http://emulator.test.domain:1234/' +
    'emulator/auth/handler' +
    '?apiKey=' + encodeURIComponent(apiKey) +
    '&appName=' + encodeURIComponent(appName) +
    '&authType=' + encodeURIComponent(authType) +
    '&providerId=' + encodeURIComponent(providerId);
  assertEquals(
    expectedWidgetUrl,
    fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
      authDomain,
      apiKey,
      appName,
      authType,
      provider,
      null,
      null,
      null,
      null,
      null,
      null,
      emulatorConfig));
}