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
 * @fileoverview Tests for rpchandler.js.
 */

goog.provide('fireauth.RpcHandlerTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthErrorWithCredential');
goog.require('fireauth.AuthProvider');
goog.require('fireauth.FacebookAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.json');
goog.require('goog.net.CorsXmlHttpFactory');
goog.require('goog.net.EventType');
goog.require('goog.net.FetchXmlHttpFactory');
goog.require('goog.net.XhrIo');
goog.require('goog.net.XhrLike');
goog.require('goog.object');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.RpcHandlerTest');


var ignoreArgument;
var gapi = gapi || {};
var stubs = new goog.testing.PropertyReplacer();
var rpcHandler = null;
var expectedResponse = {
  'resp1': 'val1',
  'resp2': 'val2'
};
var expectedStsTokenResponse = {
  'idToken': 'accessToken',
  'access_token': 'accessToken',
  'refresh_token': 'refreshToken',
  'expires_in': '3600'
};
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var CURRENT_URL = 'http://www.example.com:8080/foo.htm';
var clock;
var mockControl;
var delay = 30000;


function setUp() {
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return true;});
  stubs.replace(
      goog.net.XhrIo.prototype,
      'send',
      goog.testing.recordFunction());
  stubs.replace(
      goog.net.XhrIo.prototype,
      'listen',
      goog.testing.recordFunction());
  stubs.replace(
      goog.net.XhrIo.prototype,
      'listenOnce',
      goog.testing.recordFunction());
  stubs.replace(
      goog.net.XhrIo.prototype,
      'setTimeoutInterval',
      goog.testing.recordFunction());
  stubs.replace(fireauth.util, 'getCurrentUrl', function() {
    return CURRENT_URL;
  });
  rpcHandler = new fireauth.RpcHandler('apiKey');
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl = new goog.testing.MockControl();
  mockControl.$resetAll();
}


/**
 * @param {string} url The URL to make a request to.
 * @param {string} method The HTTP send method.
 * @param {?ArrayBuffer|?ArrayBufferView|?Blob|?Document|?FormData|string}
 *     data The request content.
 * @param {?Object} headers The request content headers.
 * @param {number} timeout The request timeout.
 * @param {?Object} response The response to return.
 */
function assertSendXhrAndRunCallback(
    url, method, data, headers, timeout, response) {
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'sendXhr_',
      function(actualUrl, callback, actualMethod, actualData, actualHeaders,
          actualTimeout) {
        assertEquals(url, actualUrl);
        assertEquals(method, actualMethod);
        assertEquals(data, actualData);
        assertObjectEquals(headers, actualHeaders);
        assertEquals(timeout, actualTimeout);
        callback(response);
      });
}


/**
 * Asserts that server errors are handled correctly.
 * @param {function() : !goog.Promise} methodToTest The method that we are
 *     testing, which returns a Promise that we expect to reject with an error.
 * @param {!Object<string, string>} errorMap A map from server errors to the
 *     errors we expect from the method under test.
 * @param {string} url The expected URL to which a request is made.
 * @param {!Object<string, string>} body The expected body of the request.
 */
function assertServerErrorsAreHandled(methodToTest, errorMap, url, body) {
  errorMap = goog.object.clone(errorMap);

  asyncTestCase.waitForSignals(goog.object.getKeys(errorMap).length);
  var promise = goog.Promise.resolve();
  goog.object.forEach(errorMap, function(expectedError, serverErrorCode) {
    promise = promise.then(function() {
      assertSendXhrAndRunCallback(
          url,
          'POST',
          goog.json.serialize(body),
          fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
          delay,
          {
            'error': {
              'message': serverErrorCode
            }
          });
      return methodToTest().thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(expectedError), error);
        asyncTestCase.signal();
      });
    });
  });
}


function tearDown() {
  stubs.reset();
  rpcHandler = null;
  fireauth.RpcHandler.loadGApi_ = null;
  goog.dispose(clock);
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
  delete goog.global['self'];
}


function testGetApiKey() {
  assertEquals('apiKey', rpcHandler.getApiKey());
}


function testRpcHandler_XMLHttpRequest_notSupported() {
  stubs.replace(
      fireauth.RpcHandler,
      'getXMLHttpRequest',
      function() {return undefined;});
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'The XMLHttpRequest compatibility library was not found.');
  var error = assertThrows(function() { new fireauth.RpcHandler('apiKey'); });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
}


function testRpcHandler_XMLHttpRequest_worker() {
  // Test worker environment that FetchXmlHttpFactory is used in initialization
  // of goog.net.XhrIo.
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  // Simulates global self in a worker environment.
  goog.global['self']  = {};
  var xhrInstance = mockControl.createStrictMock(goog.net.XhrLike);
  var createInstance = mockControl.createMethodMock(
      goog.net.FetchXmlHttpFactory.prototype, 'createInstance');
  stubs.reset();
  // Simulate worker environment.
  stubs.replace(
      fireauth.util,
      'isWorker',
      function() {return true;});
  // Simulate fetch, Request and Headers API supported.
  stubs.replace(
      fireauth.util,
      'isFetchSupported',
      function() {return true;});
  // No XMLHttpRequest available.
  stubs.replace(
      fireauth.RpcHandler,
      'getXMLHttpRequest',
      function() {return undefined;});
  // Confirm RPC handler calls XHR instance from FetchXmlHttpFactory XHR.
  createInstance().$returns(xhrInstance);
  xhrInstance.open(ignoreArgument, ignoreArgument, ignoreArgument).$once();
  xhrInstance.setRequestHeader(ignoreArgument, ignoreArgument).$once();
  xhrInstance.send(ignoreArgument).$once();
  xhrInstance.abort().$once();
  asyncTestCase.waitForSignals(1);
  mockControl.$replayAll();
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Simulate RPC and then timeout.
  rpcHandler.fetchProvidersForIdentifier('user@example.com')
      .thenCatch(function(error) {
        asyncTestCase.signal();
      });
  // Timeout XHR request.
  clock.tick(delay * 2);
}


function testRpcHandler_XMLHttpRequest_worker_fetchNotSupported() {
  // Test worker environment where fetch, Headers and Request are not supported.
  // Simulates global self in a worker environment.
  goog.global['self']  = {};
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.OPERATION_NOT_SUPPORTED,
      'fetch, Headers and Request native APIs or equivalent Polyfills ' +
      'must be available to support HTTP requests from a Worker environment.');
  stubs.reset();
  // Simulate worker environment.
  stubs.replace(
      fireauth.util,
      'isWorker',
      function() {return true;});
  // Simulate fetch, Request and Headers API not supported.
  stubs.replace(
      fireauth.util,
      'isFetchSupported',
      function() {return false;});
  // No XMLHttpRequest available.
  stubs.replace(
      fireauth.RpcHandler,
      'getXMLHttpRequest',
      function() {return undefined;});
  asyncTestCase.waitForSignals(1);
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Simulate RPC and then expected error thrown.
  rpcHandler.fetchProvidersForIdentifier('user@example.com')
      .thenCatch(function(actualError) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError, actualError);
        asyncTestCase.signal();
      });
}


function testRpcHandler_XMLHttpRequest_corsBrowser() {
  // Test CORS browser environment that CorsXmlHttpFactory is used in
  // initialization of goog.net.XhrIo.
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  var xhrInstance = mockControl.createStrictMock(goog.net.XhrLike);
  var createInstance = mockControl.createMethodMock(
      goog.net.CorsXmlHttpFactory.prototype, 'createInstance');
  stubs.reset();
  // Non-worker environment.
  stubs.replace(
      fireauth.util,
      'isWorker',
      function() {return false;});
  // CORS supporting browser.
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return true;});
  // Non-native environment.
  stubs.replace(
      fireauth.util,
      'isNativeEnvironment',
      function() {return false;});
  // Confirm RPC handler calls XHR instance from CorsXmlHttpFactory XHR.
  createInstance().$returns(xhrInstance);
  xhrInstance.open(ignoreArgument, ignoreArgument, ignoreArgument).$once();
  xhrInstance.setRequestHeader(ignoreArgument, ignoreArgument).$once();
  xhrInstance.send(ignoreArgument).$once();
  xhrInstance.abort().$once();
  asyncTestCase.waitForSignals(1);
  mockControl.$replayAll();
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Simulate RPC and then timeout.
  rpcHandler.fetchProvidersForIdentifier('user@example.com')
      .thenCatch(function(error) {
        asyncTestCase.signal();
      });
  // Timeout XHR request.
  clock.tick(delay * 2);
}


function testRpcHandler_XMLHttpRequest_reactNative() {
  // Test react-native environment that built-in XMLHttpRequest is used in
  // xhrFactory.
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  var xhrInstance = mockControl.createStrictMock(goog.net.XhrLike);
  var xhrConstructor = mockControl.createConstructorMock(
      goog.net, 'XhrLike');
  stubs.reset();
  // CORS supporting environment.
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return true;});
  // Return native XMLHttpRequest..
  stubs.replace(
      fireauth.RpcHandler,
      'getXMLHttpRequest',
      function() {return xhrConstructor;});
  // React-native environment.
  stubs.replace(
      fireauth.util,
      'isNativeEnvironment',
      function() {return true;});
  stubs.replace(
      fireauth.util,
      'getEnvironment',
      function() {return fireauth.util.Env.REACT_NATIVE;});
  // Confirm RPC handler calls XHR instance from factory XHR.
  xhrConstructor().$returns(xhrInstance);
  xhrInstance.open(ignoreArgument, ignoreArgument, ignoreArgument).$once();
  xhrInstance.setRequestHeader(ignoreArgument, ignoreArgument).$once();
  xhrInstance.send(ignoreArgument).$once();
  xhrInstance.abort().$once();
  asyncTestCase.waitForSignals(1);
  mockControl.$replayAll();
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Simulate RPC and then timeout.
  rpcHandler.fetchProvidersForIdentifier('user@example.com')
      .thenCatch(function(error) {
        asyncTestCase.signal();
      });
  // Timeout XHR request.
  clock.tick(delay * 2);
}


function testRpcHandler_XMLHttpRequest_node() {
  // Test node environment that Node.js implementation is used in xhrfactory.
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  var xhrInstance = mockControl.createStrictMock(goog.net.XhrLike);
  var xhrConstructor = mockControl.createConstructorMock(
      goog.net, 'XhrLike');
  stubs.reset();
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return true;});
  // Return mock XHR constructor. In a Node.js environment the polyfill library
  // would be used.
  stubs.replace(
      fireauth.RpcHandler,
      'getXMLHttpRequest',
      function() {return xhrConstructor;});
  // Node.js environment.
  stubs.replace(
      fireauth.util,
      'getEnvironment',
      function() {return fireauth.util.Env.NODE;});
  // Confirm RPC handler calls XHR instance from factory XHR.
  xhrConstructor().$returns(xhrInstance);
  xhrInstance.open(ignoreArgument, ignoreArgument, ignoreArgument).$once();
  xhrInstance.setRequestHeader(ignoreArgument, ignoreArgument).$once();
  xhrInstance.send(ignoreArgument).$once();
  xhrInstance.abort().$once();
  asyncTestCase.waitForSignals(1);
  mockControl.$replayAll();
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Simulate RPC and then timeout.
  rpcHandler.fetchProvidersForIdentifier('user@example.com')
      .thenCatch(function(error) {
        asyncTestCase.signal();
      });
  // Timeout XHR request.
  clock.tick(delay * 2);
}


/**
 * Asserts and applies the goog.net.XhrIo send call.
 * @param {string} url The expected XHR URL.
 * @param {string} method The XHR expected HTTP method.
 * @param {?ArrayBuffer|?ArrayBufferView|?Blob|?Document|?FormData|string=} data
 *     The expected request data.
 * @param {?Object|undefined} headers The expected HTTP headers.
 * @param {number} timeout The expected timeout.
 * @param {?Object|undefined} resp The expected response to return.
 */
function assertXhrIoAndRunCallback(url, method, data, headers, timeout, resp) {
  // Confirm correct parameters passed to  goog.net.XhrIo.send.
  assertEquals(
      1,
      goog.net.XhrIo.prototype.send.getCallCount());
  assertEquals(
      url,
      goog.net.XhrIo.prototype.send.getLastCall().getArgument(0));
  assertEquals(
      method,
      goog.net.XhrIo.prototype.send.getLastCall().getArgument(1));
  assertEquals(
      data,
      goog.net.XhrIo.prototype.send.getLastCall().getArgument(2));
  assertObjectEquals(
      headers,
      goog.net.XhrIo.prototype.send.getLastCall().getArgument(3));
  assertEquals(
      1,
      goog.net.XhrIo.prototype.setTimeoutInterval.getCallCount());
  assertEquals(
      timeout,
      goog.net.XhrIo.prototype.setTimeoutInterval.getLastCall().getArgument(0));
  // Get on complete callback.
  var callback = goog.net.XhrIo.prototype.listen.getLastCall().getArgument(1);
  // Returned expected response.
  var self = {
    // Return the response text.
    getResponseText: function() {
      return goog.json.serialize(resp);
    }
  };
  // Run on complete callback, pass self as this to return expected response.
  callback.apply(self);
}


function testSendXhr_post() {
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Check response is passed to provided callback.
  var responseRecorded = null;
  var func = function(response) {
    responseRecorded = response;
  };
  var data = 'key1=value1&key2=value2';
  var headers = {
    'Content-Type': 'application/json'
  };
  // Send XHR with test parameters.
  rpcHandler.sendXhr_(
      'url1',
      func,
      'POST',
      data,
      headers,
      5000);
  // Confirm correct parameters passed and run on complete.
  assertXhrIoAndRunCallback(
      'url1',
      'POST',
      data,
      headers,
      5000,
      expectedResponse);
  // Confirm callback called with expected response.
  assertObjectEquals(expectedResponse, responseRecorded);
}


/**
 * Tests client version being correctly sent with requests to Firebase Auth
 * server.
 */
function testSendFirebaseBackendRequest_clientVersion() {
  var clientVersion = 'Chrome/JsCore/3.0.0';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  // Pass client version in constructor.
  var rpcHandler = new fireauth.RpcHandler(
      'apiKey', null, clientVersion);
  var expectedDomains = [
    'domain.com',
    'www.mydomain.com'
  ];
  var serverResponse = {
    'authorizedDomains': [
      'domain.com',
      'www.mydomain.com'
    ]
  };
  // The client version should be passed to header.
  var expectedHeaders = {
    'Content-Type': 'application/json',
    'X-Client-Version': clientVersion
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50',
      'GET',
      undefined,
      expectedHeaders,
      delay,
      serverResponse);
  rpcHandler.getAuthorizedDomains().then(function(domains) {
    assertArrayEquals(expectedDomains, domains);
    asyncTestCase.signal();
  });
}


function testSendFirebaseBackendRequest_timeout() {
  // Test network timeout error for Firebase backend request.
  var actualError;
  // Allow xhrIo requests.
  stubs.reset();
  // Simulate CORS support.
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return true;});
  // Expected timeout error.
  var timeoutError = new fireauth.AuthError(
      fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Send request for backend API.
  rpcHandler.fetchProvidersForIdentifier('user@example.com')
      .thenCatch(function(error) {
        // Record error.
        actualError = error;
      });
  // Timeout XHR request.
  clock.tick(delay * 2);
  // Timeout error should have been returned.
  fireauth.common.testHelper.assertErrorEquals(timeoutError, actualError);
}


function testSendFirebaseBackendRequest_offline_falseAlert() {
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  var expectedResponse = [
    'google.com',
    'myauthprovider.com'
  ];
  var serverResponse = {
    'kind': 'identitytoolkit#CreateAuthUriResponse',
    'authUri': 'https://accounts.google.com/o/oauth2/auth?foo=bar',
    'providerId': 'google.com',
    'allProviders': [
      'google.com',
      'myauthprovider.com'
    ],
    'registered': true,
    'forExistingProvider': true,
    'sessionId': 'MY_SESSION_ID'
  };
  var identifier = 'MY_ID';
  stubs.reset();
  // Simulate browser supports CORS.
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return true;});
  // Simulate expected URL returned for current URL.
  stubs.replace(
      fireauth.util,
      'getCurrentUrl',
      function() {
        return CURRENT_URL;
      });
  // Simulate false alert navigator.onLine.
  stubs.replace(
      fireauth.util,
      'isOnline',
      function() {return false;});
  // Overwrite XHR IO send to simulate a 4999ms delay before the response.
  stubs.replace(
      goog.net.XhrIo.prototype,
      'send',
      function(url, httpMethod, data, headers) {
        assertEquals(
             'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
             'createAuthUri?key=apiKey',
             url);
        assertEquals('POST', httpMethod);
        assertEquals(goog.json.serialize(request), data);
        assertObjectEquals(
            fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_, headers);
        clock.tick(4999);
        this.dispatchEvent(goog.net.EventType.COMPLETE);
      });
  // Simulate expected response returned.
  stubs.replace(
      goog.net.XhrIo.prototype,
      'getResponseText',
      function() {
        return JSON.stringify(serverResponse);
      });

  asyncTestCase.waitForSignals(1);
  var request = {
    'identifier': identifier,
    'continueUri': CURRENT_URL
  };
  rpcHandler.fetchProvidersForIdentifier(identifier)
      .then(function(response) {
        assertArrayEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testSendFirebaseBackendRequest_offline_slowResponse() {
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  var serverResponse = {
    'kind': 'identitytoolkit#CreateAuthUriResponse',
    'authUri': 'https://accounts.google.com/o/oauth2/auth?foo=bar',
    'providerId': 'google.com',
    'allProviders': [
      'google.com',
      'myauthprovider.com'
    ],
    'registered': true,
    'forExistingProvider': true,
    'sessionId': 'MY_SESSION_ID'
  };
  var identifier = 'MY_ID';
  stubs.reset();
  // Simulate browser supports CORS.
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return true;});
  // Simulate expected URL returned for current URL.
  stubs.replace(
      fireauth.util,
      'getCurrentUrl',
      function() {
        return CURRENT_URL;
      });
  // Simulate false alert navigator.onLine.
  stubs.replace(
      fireauth.util,
      'isOnline',
      function() {return false;});
  // Overwrite XHR IO send to simulate a 5000mx delay before the response.
  stubs.replace(
      goog.net.XhrIo.prototype,
      'send',
      function(url, httpMethod, data, headers) {
        assertEquals(
             'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
             'createAuthUri?key=apiKey',
             url);
        assertEquals('POST', httpMethod);
        assertEquals(goog.json.serialize(request), data);
        assertObjectEquals(
            fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_, headers);
        clock.tick(5000);
        this.dispatchEvent(goog.net.EventType.COMPLETE);
      });
  // Simulate expected response returned.
  stubs.replace(
      goog.net.XhrIo.prototype,
      'getResponseText',
      function() {
        return JSON.stringify(serverResponse);
      });

  asyncTestCase.waitForSignals(1);
  var request = {
    'identifier': identifier,
    'continueUri': CURRENT_URL
  };
  // Expected timeout error even though the request was eventually returned.
  var timeoutError = new fireauth.AuthError(
      fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  rpcHandler.fetchProvidersForIdentifier(identifier)
      .thenCatch(function(actualError) {
        // Timeout error should have been returned.
        fireauth.common.testHelper.assertErrorEquals(timeoutError, actualError);
        asyncTestCase.signal();
      });
}


function testSendFirebaseBackendRequest_offline() {
  // Test network timeout error for offline Firebase backend request.
  asyncTestCase.waitForSignals(1);
  // Allow xhrIo requests.
  stubs.reset();
  // Simulate app offline.
  stubs.replace(
      fireauth.util,
      'isOnline',
      function() {return false;});
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  // Expected timeout error.
  var timeoutError = new fireauth.AuthError(
      fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Send request for backend API.
  rpcHandler.fetchProvidersForIdentifier('user@example.com')
      .thenCatch(function(error) {
        // Timeout error event without any wait (no tick in mockclock).
        fireauth.common.testHelper.assertErrorEquals(timeoutError, error);
        asyncTestCase.signal();
      });
  // Simulate short timeout when navigator.onLine is false.
  clock.tick(5000);
}


function testSendStsTokenBackendRequest_timeout() {
  // Test network timeout error for STS token backend request.
  var actualError;
  // Allow xhrIo requests.
  stubs.reset();
  // Simulate CORS support.
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return true;});
  // Expected timeout error.
  var timeoutError = new fireauth.AuthError(
      fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Send request for backend API.
  rpcHandler.requestStsToken({
    'grant_type': 'authorization_code',
    'code': 'idToken'
  }).thenCatch(function(error) {
    // Record error.
    actualError = error;
  });
  // Timeout XHR request.
  clock.tick(delay * 2);
  // Timeout error should have been returned.
  fireauth.common.testHelper.assertErrorEquals(timeoutError, actualError);
}


function testSendStsTokenBackendRequest_offline() {
  // Test network timeout error for offline STS token backend request.
  asyncTestCase.waitForSignals(1);
  // Allow xhrIo requests.
  stubs.reset();
  // Simulate app offline.
  stubs.replace(
      fireauth.util,
      'isOnline',
      function() {return false;});
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  // Expected timeout error.
  var timeoutError = new fireauth.AuthError(
      fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  rpcHandler = new fireauth.RpcHandler('apiKey');
  // Send request for backend API.
  rpcHandler.requestStsToken({
    'grant_type': 'authorization_code',
    'code': 'idToken'
  }).thenCatch(function(error) {
    // Timeout error event without any wait (no tick in mockclock).
    fireauth.common.testHelper.assertErrorEquals(timeoutError, error);
    asyncTestCase.signal();
  });
  // Simulate short timeout when navigator.onLine is false.
  clock.tick(5000);
}


function testSendXhr_corsUnsupported() {
  var expectedResponse = {
    'key1': 'value1',
    'key2': 'value2'
  };
  var recordedToken = 'token';
  gapi.auth = gapi.auth || {};
  gapi.client = gapi.client || {};
  stubs.reset();
  // Simulate GApi loaded.
  stubs.set(
      gapi.auth,
      'getToken',
      function() {
        return recordedToken;
      });
  stubs.set(
      gapi.auth,
      'setToken',
      function(token) {
        recordedToken = token;
      });
  stubs.set(
      gapi.client,
      'request',
      function(request) {
        assertEquals('none', request['authType']);
        assertEquals('url1', request['path']);
        assertEquals('GET', request['method']);
        assertEquals(data, request['body']);
        assertObjectEquals(headers, request['headers']);
        request['callback'](expectedResponse);
        asyncTestCase.signal();
      });
  stubs.set(
      gapi.client,
      'setApiKey',
      function(apiKey) {
        assertEquals('apiKey', apiKey);
        asyncTestCase.signal();
      });
  // Simulate browser that does not support CORS.
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return false;});
  var func = function(response) {
    assertObjectEquals(expectedResponse, response);
    // Verify token updated.
    assertEquals('token', gapi.auth.getToken());
    asyncTestCase.signal();
  };
  var data = 'key1=value1&key2=value2';
  var headers = {
    'Content-Type': 'application/json'
  };
  asyncTestCase.waitForSignals(3);
  // Simulate GApi dependencies loaded.
  fireauth.RpcHandler.loadGApi_ = goog.Promise.resolve();
  rpcHandler.sendXhr_(
      'url1',
      func,
      'GET',
      data,
      headers,
      5000);
}


function testSendXhr_corsUnsupported_error() {
  var expectedResponse = {
    'error': {
      'message': fireauth.RpcHandler.ServerError.CORS_UNSUPPORTED
    }
  };
  // Simulate browser that does not support CORS.
  stubs.replace(
      fireauth.util,
      'supportsCors',
      function() {return false;});
  var func = function(response) {
    assertObjectEquals(expectedResponse, response);
    asyncTestCase.signal();
  };
  var data = 'key1=value1&key2=value2';
  var headers = {
    'Content-Type': 'application/json'
  };
  asyncTestCase.waitForSignals(1);
  fireauth.RpcHandler.loadGApi_ = goog.Promise.reject();
  rpcHandler.sendXhr_(
      'url1',
      func,
      'GET',
      data,
      headers,
      5000);
}


function testSendSecureTokenBackendRequest_clientVersion() {
  var clientVersion = 'Chrome/JsCore/3.0.0';
  // The client version should be passed to header.
  var expectedHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Client-Version': clientVersion
  };
  // Pass client version in constructor.
  var rpcHandler = new fireauth.RpcHandler(
      'apiKey', null, clientVersion);
  asyncTestCase.waitForSignals(1);
  // Confirm correct parameters passed and run on complete.
  assertSendXhrAndRunCallback(
      'https://securetoken.googleapis.com/v1/token?key=apiKey',
      'POST',
      'grant_type=authorization_code&code=idToken',
      expectedHeaders,
      delay,
      expectedStsTokenResponse);
  // Send STS token request, default config will be used.
  rpcHandler.requestStsToken(
      {
        'grant_type': 'authorization_code',
        'code': 'idToken'
      }).then(function(response) {
    assertObjectEquals(
        expectedStsTokenResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestStsToken_updateClientVersion() {
  asyncTestCase.waitForSignals(1);
  // Confirm correct parameters passed and run on complete.
  assertSendXhrAndRunCallback(
      'https://securetoken.googleapis.com/v1/token?key=apiKey',
      'POST',
      'grant_type=authorization_code&code=idToken',
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Client-Version': 'Chrome/JsCore/3.0.0/FirebaseCore-web'
      },
      delay,
      expectedStsTokenResponse);
  // Update client version.
  rpcHandler.updateClientVersion('Chrome/JsCore/3.0.0/FirebaseCore-web');
  // Send STS token request.
  rpcHandler.requestStsToken(
      {
        'grant_type': 'authorization_code',
        'code': 'idToken'
      }).then(function(response) {
    assertObjectEquals(
        expectedStsTokenResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestStsToken_removeClientVersion() {
  asyncTestCase.waitForSignals(1);
  // Confirm correct parameters passed and run on complete.
  assertSendXhrAndRunCallback(
      'https://securetoken.googleapis.com/v1/token?key=apiKey',
      'POST',
      'grant_type=authorization_code&code=idToken',
      {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      delay,
      expectedStsTokenResponse);
  // Remove client version.
  rpcHandler.updateClientVersion(null);
  // Send STS token request.
  rpcHandler.requestStsToken(
      {
        'grant_type': 'authorization_code',
        'code': 'idToken'
      }).then(function(response) {
    assertObjectEquals(
        expectedStsTokenResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestStsToken_default() {
  asyncTestCase.waitForSignals(1);
  // Confirm correct parameters passed and run on complete.
  assertSendXhrAndRunCallback(
      'https://securetoken.googleapis.com/v1/token?key=apiKey',
      'POST',
      'grant_type=authorization_code&code=idToken',
      fireauth.RpcHandler.DEFAULT_SECURE_TOKEN_HEADERS_,
      delay,
      expectedStsTokenResponse);
  // Send STS token request, default config will be used.
  rpcHandler.requestStsToken(
      {
        'grant_type': 'authorization_code',
        'code': 'idToken'
      }).then(function(response) {
    assertObjectEquals(
        expectedStsTokenResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestStsToken_custom() {
  asyncTestCase.waitForSignals(1);
  // Reinitialize RPC handler using custom config.
  rpcHandler = new fireauth.RpcHandler(
      'apiKey',
      {
        'secureTokenEndpoint': 'http://localhost/token',
        'secureTokenTimeout': new fireauth.util.Delay(5000, 5000),
        'secureTokenHeaders': {'Content-Type': 'application/json'}
      });
  // Confirm correct parameters passed and run on complete.
  assertSendXhrAndRunCallback(
      'http://localhost/token?key=apiKey',
      'POST',
      'grant_type=authorization_code&code=idToken',
      {
        'Content-Type': 'application/json'
      },
      5000,
      expectedStsTokenResponse);
  // Send STS token request, custom config will be used.
  rpcHandler.requestStsToken(
      {
        'grant_type': 'authorization_code',
        'code': 'idToken'
      }).then(function(response) {
    assertObjectEquals(
        expectedStsTokenResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestStsToken_invalidRequest() {
  asyncTestCase.waitForSignals(1);
  // Reinitialize RPC handler.
  rpcHandler = new fireauth.RpcHandler(
      'apiKey');
  // Send STS token request, no XHR, invalid request.
  rpcHandler.requestStsToken(
      {
        'invalid': 'authorization_code',
        'code': 'idToken'
      }).then(
      function(response) {},
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


function testRequestStsToken_unknownServerResponse() {
  var serverResponse = {'error': 'INTERNAL_SERVER_ERROR'};
  asyncTestCase.waitForSignals(1);
  // Confirm correct parameters passed and run on complete.
  assertSendXhrAndRunCallback(
      'https://securetoken.googleapis.com/v1/token?key=apiKey',
      'POST',
      'grant_type=authorization_code&code=idToken',
      fireauth.RpcHandler.DEFAULT_SECURE_TOKEN_HEADERS_,
      delay,
      serverResponse);
  // Send STS token request, default config will be used.
  rpcHandler.requestStsToken(
      {
        'grant_type': 'authorization_code',
        'code': 'idToken'
      }).then(
      function(response) {},
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
                goog.json.serialize(serverResponse)),
            error);
        asyncTestCase.signal();
      });
}


function testRequestStsToken_specificErrorResponse() {
  // Server error response when token is expired.
  var serverResponse = {
    "error": {
      "code": 400,
      "message": "TOKEN_EXPIRED",
      "status": "INVALID_ARGUMENT"
    }
  };
  asyncTestCase.waitForSignals(1);
  // Confirm correct parameters passed and run on complete.
  assertSendXhrAndRunCallback(
      'https://securetoken.googleapis.com/v1/token?key=apiKey',
      'POST',
      'grant_type=authorization_code&code=idToken',
      fireauth.RpcHandler.DEFAULT_SECURE_TOKEN_HEADERS_,
      delay,
      serverResponse);
  // Send STS token request, default config will be used.
  rpcHandler.requestStsToken(
      {
        'grant_type': 'authorization_code',
        'code': 'idToken'
      }).then(
      function(response) {},
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED),
            error);
        asyncTestCase.signal();
      });
}


function testRequestFirebaseEndpoint_success() {
  var expectedResponse = {
    'status': 'success'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({
        'key1': 'value1',
        'key2': 'value2'
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.requestFirebaseEndpoint(
      'method1',
      'POST',
      {
        'key1': 'value1',
        'key2': 'value2'
      }).then(function(response) {
    assertObjectEquals(
        expectedResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestFirebaseEndpoint_updateClientVersion() {
  var expectedResponse = {
    'status': 'success'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({
        'key1': 'value1',
        'key2': 'value2'
      }),
      {
        'Content-Type': 'application/json',
        'X-Client-Version': 'Chrome/JsCore/3.0.0/FirebaseCore-web'
      },
      delay,
      expectedResponse);
  // Update client version.
  rpcHandler.updateClientVersion('Chrome/JsCore/3.0.0/FirebaseCore-web');
  rpcHandler.requestFirebaseEndpoint(
      'method1',
      'POST',
      {
        'key1': 'value1',
        'key2': 'value2'
      }).then(function(response) {
    assertObjectEquals(
        expectedResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestFirebaseEndpoint_removeClientVersion() {
  var expectedResponse = {
    'status': 'success'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({
        'key1': 'value1',
        'key2': 'value2'
      }),
      {
        'Content-Type': 'application/json'
      },
      delay,
      expectedResponse);
  // Remove client version.
  rpcHandler.updateClientVersion(null);
  rpcHandler.requestFirebaseEndpoint(
      'method1',
      'POST',
      {
        'key1': 'value1',
        'key2': 'value2'
      }).then(function(response) {
    assertObjectEquals(
        expectedResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestFirebaseEndpoint_setCustomLocaleHeader_success() {
  var expectedResponse = {
    'status': 'success'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({
        'key1': 'value1',
        'key2': 'value2'
      }),
      {
        'Content-Type': 'application/json',
        'X-Firebase-Locale': 'fr'
      },
      delay,
      expectedResponse);
  // Set French as custom Firebase locale header.
  rpcHandler.updateCustomLocaleHeader('fr');
  rpcHandler.requestFirebaseEndpoint(
      'method1',
      'POST',
      {
        'key1': 'value1',
        'key2': 'value2'
      }).then(function(response) {
    assertObjectEquals(
        expectedResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestFirebaseEndpoint_updateCustomLocaleHeader_success() {
  var expectedResponse = {
    'status': 'success'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({
        'key1': 'value1',
        'key2': 'value2'
      }),
      {
        'Content-Type': 'application/json',
        'X-Firebase-Locale': 'de'
      },
      delay,
      expectedResponse);
  // Set French as custom Firebase locale header.
  rpcHandler.updateCustomLocaleHeader('fr');
  // Change to German.
  rpcHandler.updateCustomLocaleHeader('de');
  rpcHandler.requestFirebaseEndpoint(
      'method1',
      'POST',
      {
        'key1': 'value1',
        'key2': 'value2'
      }).then(function(response) {
    assertObjectEquals(
        expectedResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestFirebaseEndpoint_removeCustomLocaleHeader_success() {
  var expectedResponse = {
    'status': 'success'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({
        'key1': 'value1',
        'key2': 'value2'
      }),
      {
        'Content-Type': 'application/json'
      },
      delay,
      expectedResponse);
  // Set French as custom Firebase locale header.
  rpcHandler.updateCustomLocaleHeader('fr');
  // Remove custom locale header.
  rpcHandler.updateCustomLocaleHeader(null);
  rpcHandler.requestFirebaseEndpoint(
      'method1',
      'POST',
      {
        'key1': 'value1',
        'key2': 'value2'
      }).then(function(response) {
    assertObjectEquals(
        expectedResponse,
        response);
    asyncTestCase.signal();
  });
}


function testRequestFirebaseEndpoint_error() {
  // Error case.
  var errorResponse = {
    'error': {
      'message': 'ERROR_CODE'
    }
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({
        'key1': 'value1',
        'key2': 'value2'
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      errorResponse);
  rpcHandler.requestFirebaseEndpoint(
      'method1',
      'POST',
      {
        'key1': 'value1',
        'key2': 'value2'
      }).then(
      function(response) {},
      function(e) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError('internal-error',
                goog.json.serialize(errorResponse)),
            e);
        asyncTestCase.signal();
      });
}


function testRequestFirebaseEndpoint_networkError() {
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({'key1': 'value1'}),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      null);
  rpcHandler.requestFirebaseEndpoint('method1', 'POST', {'key1': 'value1'})
      .then(null, function(e) {
        fireauth.common.testHelper.assertErrorEquals(new fireauth.AuthError(
            fireauth.authenum.Error.NETWORK_REQUEST_FAILED), e);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testRequestFirebaseEndpoint_keyInvalid() {
  // Error case.
  var errorResponse = {
    'error': {
      'errors': [
        {
          'domain': 'usageLimits',
          'reason': 'keyInvalid',
          'message': 'Bad Request'
        }
      ],
      'code': 400,
      'message': 'Bad Request'
    }
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      '{}',
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      errorResponse);
  rpcHandler.requestFirebaseEndpoint('method1', 'POST', {})
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_API_KEY),
            error);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}



function testRequestFirebaseEndpoint_notAuthorized() {
  // Error case.
  var errorResponse = {
    'error': {
      'errors': [
        {
          'domain': 'usageLimits',
          'reason': 'ipRefererBlocked',
          'message': 'There is a per-IP or per-Referer restriction ' +
              'configured on your API key and the request does not match ' +
              'these restrictions. Please use the Google Developers Console ' +
              'to update your API key configuration if request from this IP ' +
              'or referer should be allowed.',
          'extendedHelp': 'https://console.developers.google.com'
        }
      ],
      'code': 403,
      'message': 'There is a per-IP or per-Referer restriction configured on ' +
          'your API key and the request does not match these restrictions. ' +
          'Please use the Google Developers Console to update your API key ' +
          'configuration if request from this IP or referer should be allowed.'
    }
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      '{}',
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      errorResponse);
  rpcHandler.requestFirebaseEndpoint('method1', 'POST', {})
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.APP_NOT_AUTHORIZED),
            error);
        asyncTestCase.signal();
      });
  asyncTestCase.waitForSignals(1);
}


function testRequestFirebaseEndpoint_customError() {
  // Error case.
  var errorResponse = {
    'error': {
      'message': 'ERROR_CODE'
    }
  };
  var errorMap = {
    'ERROR_CODE': fireauth.authenum.Error.INVALID_PASSWORD
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/method1?key' +
      '=apiKey',
      'POST',
      goog.json.serialize({
        'key1': 'value1',
        'key2': 'value2'
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      errorResponse);
  rpcHandler.requestFirebaseEndpoint(
      'method1',
      'POST',
      {
        'key1': 'value1',
        'key2': 'value2'
      },
      errorMap).then(
      function(response) {},
      function(e) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_PASSWORD),
            e);
        asyncTestCase.signal();
      });
}


function testGetAuthorizedDomains() {
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedResponse = [
    'domain.com',
    'www.mydomain.com'
  ];
  var serverResponse = {
    'authorizedDomains': [
      'domain.com',
      'www.mydomain.com'
    ]
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50',
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.getAuthorizedDomains()
      .then(function(response) {
        assertArrayEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testGetRecaptchaParam_success() {
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedResponse = {
    'recaptchaSiteKey': 'RECAPTCHA_SITE_KEY'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getRecaptchaParam?key=apiKey&cb=50',
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.getRecaptchaParam()
      .then(function(response) {
        assertEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testGetRecaptchaParam_invalidResponse_missingSitekey() {
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  // If for some reason, sitekey is not returned.
  var serverResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getRecaptchaParam?key=apiKey&cb=50',
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.getRecaptchaParam()
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testGetDynamicLinkDomain_success() {
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var serverResponse = {
    'projectId': '12345678',
    'authorizedDomains': [
      'domain.com',
      'www.mydomain.com'
    ],
    'dynamicLinksDomain': 'example.app.goog.gl'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&returnDynamicLink=true',
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.getDynamicLinkDomain()
      .then(function(dynamicLinksDomain) {
        assertEquals('example.app.goog.gl', dynamicLinksDomain);
        asyncTestCase.signal();
      });
}


function testGetDynamicLinkDomain_internalError() {
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  // This should not happen in reality but need to confirm that logic checks
  // for presence of dynamic links domain.
  var serverResponse = {
    'projectId': '12345678',
    'authorizedDomains': [
      'domain.com',
      'www.mydomain.com'
    ]
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&returnDynamicLink=true',
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.getDynamicLinkDomain()
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testGetDynamicLinkDomain_notActivated() {
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.DYNAMIC_LINK_NOT_ACTIVATED);
  var serverResponse = {
    'error': {
      'errors': [
        {
          'domain': 'global',
          'reason': 'invalid',
          'message': 'DYNAMIC_LINK_NOT_ACTIVATED'
        }
      ],
      'code': 400,
      'message': 'DYNAMIC_LINK_NOT_ACTIVATED'
    }
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&returnDynamicLink=true',
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.getDynamicLinkDomain()
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIsIosBundleIdValid_success() {
  var iosBundleId = 'com.example.app';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var serverResponse = {
    'projectId': '12345678',
    'authorizedDomains': [
      'domain.com',
      'www.mydomain.com'
    ]
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&iosBundleId=' +
      encodeURIComponent(iosBundleId),
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.isIosBundleIdValid(iosBundleId)
      .then(function() {
        asyncTestCase.signal();
      });
}


function testIsIosBundleIdValid_error() {
  var iosBundleId = 'com.example.app';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_APP_ID);
  var serverResponse = {
    'error': {
      'errors': [
        {
          'message': 'INVALID_APP_ID'
        }
      ],
      'code': 400,
      'message': 'INVALID_APP_ID'
    }
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&iosBundleId=' +
      encodeURIComponent(iosBundleId),
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.isIosBundleIdValid(iosBundleId)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIsAndroidPackageNameValid_success_noSha1Cert() {
  var androidPackageName = 'com.example.app';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var serverResponse = {
    'projectId': '12345678',
    'authorizedDomains': [
      'domain.com',
      'www.mydomain.com'
    ]
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&androidPackageName=' +
      encodeURIComponent(androidPackageName),
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.isAndroidPackageNameValid(androidPackageName)
      .then(function() {
        asyncTestCase.signal();
      });
}


function testIsAndroidPackageNameValid_error_noSha1Cert() {
  var androidPackageName = 'com.example.app';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_APP_ID);
  var serverResponse = {
    'error': {
      'errors': [
        {
          'message': 'INVALID_APP_ID'
        }
      ],
      'code': 400,
      'message': 'INVALID_APP_ID'
    }
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&androidPackageName=' +
      encodeURIComponent(androidPackageName),
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.isAndroidPackageNameValid(androidPackageName)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIsAndroidPackageNameValid_success_sha1Cert() {
  var androidPackageName = 'com.example.app';
  var sha1Cert = 'SHA_1_ANDROID_CERT';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var serverResponse = {
    'projectId': '12345678',
    'authorizedDomains': [
      'domain.com',
      'www.mydomain.com'
    ]
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&androidPackageName=' +
      encodeURIComponent(androidPackageName) +
      '&sha1Cert=' + encodeURIComponent(sha1Cert),
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.isAndroidPackageNameValid(androidPackageName, sha1Cert)
      .then(function() {
        asyncTestCase.signal();
      });
}


function testIsAndroidPackageNameValid_error_sha1Cert() {
  var androidPackageName = 'com.example.app';
  var sha1Cert = 'INVALID_SHA_1_ANDROID_CERT';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_CERT_HASH);
  var serverResponse = {
    'error': {
      'errors': [
        {
          'message': 'INVALID_CERT_HASH'
        }
      ],
      'code': 400,
      'message': 'INVALID_CERT_HASH'
    }
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&androidPackageName=' +
      encodeURIComponent(androidPackageName) +
      '&sha1Cert=' + encodeURIComponent(sha1Cert),
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.isAndroidPackageNameValid(androidPackageName, sha1Cert)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testIsOAuthClientIdValid_success() {
  var clientId = '123456.apps.googleusercontent.com';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var serverResponse = {
    'projectId': '12345678',
    'authorizedDomains': [
      'domain.com',
      'www.mydomain.com'
    ]
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&clientId=' +
      encodeURIComponent(clientId),
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.isOAuthClientIdValid(clientId)
      .then(function() {
        asyncTestCase.signal();
      });
}


function testIsOAuthClientIdValid_error() {
  var clientId = '123456.apps.googleusercontent.com';
  // Simulate clock.
  clock = new goog.testing.MockClock();
  clock.install();
  clock.tick(50);
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_OAUTH_CLIENT_ID);
  var serverResponse = {
    'error': {
      'errors': [
        {
          'message': 'INVALID_OAUTH_CLIENT_ID'
        }
      ],
      'code': 400,
      'message': 'INVALID_OAUTH_CLIENT_ID'
    }
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'getProjectConfig?key=apiKey&cb=50&clientId=' +
      encodeURIComponent(clientId),
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.isOAuthClientIdValid(clientId)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testFetchSignInMethodsForIdentifier() {
  var expectedResponse = ['google.com', 'emailLink'];
  var serverResponse = {
    'kind': 'identitytoolkit#CreateAuthUriResponse',
    'allProviders': [
      'google.com',
      "password"
    ],
    'signinMethods': [
       'google.com',
       'emailLink'
    ],
    'registered': true,
    'sessionId': 'AXT8iKR2x89y2o7zRnroApio_uo'
  };
  var identifier = 'user@example.com';

  asyncTestCase.waitForSignals(1);
  var request = {'identifier': identifier, 'continueUri': CURRENT_URL};
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'createAuthUri?key=apiKey',
      'POST',
      goog.json.serialize(request),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.fetchSignInMethodsForIdentifier(identifier)
      .then(function(response) {
        assertArrayEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testFetchSignInMethodsForIdentifier_noSignInMethodsReturned() {
  var expectedResponse = [];
  var serverResponse = {
    'kind': 'identitytoolkit#CreateAuthUriResponse',
    'registered': true,
    'sessionId': 'AXT8iKR2x89y2o7zRnroApio_uo'
  };
  var identifier = 'user@example.com';

  asyncTestCase.waitForSignals(1);
  var request = {'identifier': identifier, 'continueUri': CURRENT_URL};
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'createAuthUri?key=apiKey',
      'POST',
      goog.json.serialize(request),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.fetchSignInMethodsForIdentifier(identifier)
      .then(function(response) {
        assertArrayEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testFetchSignInMethodsForIdentifier_nonHttpOrHttps() {
  // Simulate non http or https current URL.
  stubs.replace(fireauth.util, 'getCurrentUrl', function() {
    return 'chrome-extension://234567890/index.html';
  });
  stubs.replace(fireauth.util, 'getCurrentScheme', function() {
    return 'chrome-extension:';
  });
  var expectedResponse = ['google.com', 'emailLink'];
  var serverResponse = {
    'kind': 'identitytoolkit#CreateAuthUriResponse',
    'allProviders': [
      'google.com',
      'password'
    ],
    'signinMethods': [
       'google.com',
       'emailLink'
    ],
    'registered': true,
    'sessionId': 'AXT8iKR2x89y2o7zRnroApio_uo'
  };
  var identifier = 'user@example.com';

  asyncTestCase.waitForSignals(1);
  var request = {
    'identifier': identifier,
    // A fallback HTTP URL should be used.
    'continueUri': 'http://localhost'
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'createAuthUri?key=apiKey',
      'POST',
      goog.json.serialize(request),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.fetchSignInMethodsForIdentifier(identifier)
      .then(function(response) {
        assertArrayEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testFetchSignInMethodsForIdentifier_serverCaughtError() {
  var identifier = 'user@example.com';
  var requestBody = {'identifier': identifier, 'continueUri': CURRENT_URL};
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
      'relyingparty/createAuthUri?key=apiKey';

  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.INVALID_IDENTIFIER] =
      fireauth.authenum.Error.INVALID_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CONTINUE_URI] =
      fireauth.authenum.Error.INTERNAL_ERROR;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.fetchSignInMethodsForIdentifier(identifier);
  }, errorMap, expectedUrl, requestBody);
}


function testFetchProvidersForIdentifier() {
  var expectedResponse = [
    'google.com',
    'myauthprovider.com'
  ];
  var serverResponse = {
    'kind': 'identitytoolkit#CreateAuthUriResponse',
    'authUri': 'https://accounts.google.com/o/oauth2/auth?foo=bar',
    'providerId': 'google.com',
    'allProviders': [
      'google.com',
      'myauthprovider.com'
    ],
    'registered': true,
    'forExistingProvider': true,
    'sessionId': 'MY_SESSION_ID'
  };
  var identifier = 'MY_ID';

  asyncTestCase.waitForSignals(1);
  var request = {
    'identifier': identifier,
    'continueUri': CURRENT_URL
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'createAuthUri?key=apiKey',
      'POST',
      goog.json.serialize(request),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.fetchProvidersForIdentifier(identifier)
      .then(function(response) {
        assertArrayEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testFetchProvidersForIdentifier_nonHttpOrHttps() {
  // Simulate non http or https current URL.
  stubs.replace(fireauth.util, 'getCurrentUrl', function() {
    return 'chrome-extension://234567890/index.html';
  });
  stubs.replace(
      fireauth.util,
      'getCurrentScheme',
      function() {
        return 'chrome-extension:';
      });
  var expectedResponse = [
    'google.com',
    'myauthprovider.com'
  ];
  var serverResponse = {
    'kind': 'identitytoolkit#CreateAuthUriResponse',
    'authUri': 'https://accounts.google.com/o/oauth2/auth?foo=bar',
    'providerId': 'google.com',
    'allProviders': [
      'google.com',
      'myauthprovider.com'
    ],
    'registered': true,
    'forExistingProvider': true,
    'sessionId': 'MY_SESSION_ID'
  };
  var identifier = 'MY_ID';

  asyncTestCase.waitForSignals(1);
  var request = {
    'identifier': identifier,
    // A fallback HTTP URL should be used.
    'continueUri': 'http://localhost'
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'createAuthUri?key=apiKey',
      'POST',
      goog.json.serialize(request),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.fetchProvidersForIdentifier(identifier)
      .then(function(response) {
        assertArrayEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testFetchProvidersForIdentifier_serverCaughtError() {
  var identifier = 'MY_IDENTIFIER';
  var requestBody = {
    'identifier': identifier,
    'continueUri': CURRENT_URL
  };
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
      'relyingparty/createAuthUri?key=apiKey';

  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.INVALID_IDENTIFIER] =
      fireauth.authenum.Error.INVALID_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CONTINUE_URI] =
      fireauth.authenum.Error.INTERNAL_ERROR;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.fetchProvidersForIdentifier(identifier);
  }, errorMap, expectedUrl, requestBody);
}


function testGetAccountInfoByIdToken() {
  var expectedResponse = {
    'users': [{
      'localId': '14584746072031976743',
      'email': 'uid123@fake.com',
      'emailVerified': true,
      'displayName': 'John Doe',
      'providerUserInfo': [
        {
          'providerId': 'google.com',
          'displayName': 'John Doe',
          'photoUrl': 'https://lh5.googleusercontent.com/123456789/photo.jpg',
          'federatedId': 'https://accounts.google.com/123456789'
        },
        {
          'providerId': 'twitter.com',
          'displayName': 'John Doe',
          'photoUrl': 'http://abs.twimg.com/sticky/default_profile_images/def' +
              'ault_profile_3_normal.png',
          'federatedId': 'http://twitter.com/987654321'
        }
      ],
      'photoUrl': 'http://abs.twimg.com/sticky/photo.png',
      'passwordUpdatedAt': 0.0,
      'disabled': false
    }]
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountI' +
      'nfo?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN'
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.getAccountInfoByIdToken('ID_TOKEN').then(function(response) {
    assertObjectEquals(
        expectedResponse,
        response);
    asyncTestCase.signal();
  });
}


function testVerifyCustomToken_success() {
  var expectedResponse = {
    'idToken': 'ID_TOKEN'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCusto' +
      'mToken?key=apiKey',
      'POST',
      goog.json.serialize({
        'token': 'CUSTOM_TOKEN',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyCustomToken('CUSTOM_TOKEN').then(
      function(response) {
        assertEquals('ID_TOKEN', response['idToken']);
        asyncTestCase.signal();
      });
}


function testVerifyCustomToken_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
      'relyingparty/verifyCustomToken?key=apiKey';
  var token = 'CUSTOM_TOKEN';
  var requestBody = {
    'token': token,
    'returnSecureToken': true
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CUSTOM_TOKEN] =
      fireauth.authenum.Error.INTERNAL_ERROR;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CUSTOM_TOKEN] =
      fireauth.authenum.Error.INVALID_CUSTOM_TOKEN;
  errorMap[fireauth.RpcHandler.ServerError.CREDENTIAL_MISMATCH] =
      fireauth.authenum.Error.CREDENTIAL_MISMATCH;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.verifyCustomToken(token);
  }, errorMap, expectedUrl, requestBody);
}


function testServerProvidedErrorMessage_knownErrorCode() {
  // Test when server returns an error message with the details appended:
  // INVALID_CUSTOM_TOKEN : [error detail here]
  // The above error message should generate an Auth error with code
  // client equivalent of INVALID_CUSTOM_TOKEN and the message:
  // [error detail here]
  asyncTestCase.waitForSignals(1);
  // Expected client side error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_CUSTOM_TOKEN,
      'Some specific reason.');
  // Server response.
  var serverResponse = {
    'error': {
      'errors': [
        {
          'domain': 'global',
          'reason': 'invalid',
          'message': 'INVALID_CUSTOM_TOKEN : Some specific reason.'
        }
      ],
      'code': 400,
      'message': 'INVALID_CUSTOM_TOKEN : Some specific reason.'
    }
  };
  // Simulate invalid custom token.
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCusto' +
      'mToken?key=apiKey',
      'POST',
      goog.json.serialize({
        'token': 'CUSTOM_TOKEN',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.verifyCustomToken('CUSTOM_TOKEN').thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        asyncTestCase.signal();
      });
}


function testServerProvidedErrorMessage_unknownErrorCode() {
  // Test when server returns an error message with the details appended:
  // UNKNOWN_CODE : [error detail here]
  // The above error message should generate an Auth error with internal-error
  // ccode and the message:
  // [error detail here]
  asyncTestCase.waitForSignals(1);
  // Expected client side error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'Something strange happened.');
  // Server response.
  var serverResponse = {
    'error': {
      'errors': [
        {
          'domain': 'global',
          'reason': 'invalid',
          'message': 'WHAAAAAT?: Something strange happened.'
        }
      ],
      'code': 400,
      'message': 'WHAAAAAT?: Something strange happened.'
    }
  };
  // Simulate unknown backend error.
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCusto' +
      'mToken?key=apiKey',
      'POST',
      goog.json.serialize({
        'token': 'CUSTOM_TOKEN',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.verifyCustomToken('CUSTOM_TOKEN').thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        asyncTestCase.signal();
      });
}


function testServerProvidedErrorMessage_noErrorCode() {
  // Test when server returns an unexpected error message with a colon in the
  // message field that it does not treat the string after the colon as the
  // detailed error message. Instead the whole response should be serialized.
  var errorMessage = 'Error getting access token from FACEBOOK, response: OA' +
      'uth2TokenResponse{params: %7B%22error%22:%7B%22message%22:%22This+IP+' +
      'can\'t+make+requests+for+that+application.%22,%22type%22:%22OAuthExce' +
      'ption%22,%22code%22:5,%22fbtrace_id%22:%22AHHaoO5cS1K%22%7D%7D&error=' +
      'OAuthException&error_description=This+IP+can\'t+make+requests+for+tha' +
      't+application., httpMetadata: HttpMetadata{status=400, cachePolicy=NO' +
      '_CACHE, cacheDuration=null, staleWhileRevalidate=null, filename=null,' +
      'lastModified=null, headers=HTTP/1.1 200 OK\r\n\r\n, cookieList=[]}}, ' +
      'OAuth2 redirect uri is: https://example12345.firebaseapp.com/__/auth/' +
      'handler';
  asyncTestCase.waitForSignals(1);
  // Server response.
  var serverResponse = {
    'error': {
      'errors': [
        {
          'domain': 'global',
          'reason': 'invalid',
          'message': errorMessage
        }
      ],
      'code': 400,
      'message': errorMessage
    }
  };
  // Expected client side error (should contain the serialized response).
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      fireauth.util.stringifyJSON(serverResponse));
  // Simulate unknown backend error.
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.verifyAssertion({
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        expectedError,
        error);
    asyncTestCase.signal();
  });
}


function testUnexpectedApiaryError() {
  // Test when an unexpected Apiary error is returned that serialized server
  // response is used as the client facing error message.
  asyncTestCase.waitForSignals(1);
  // Server response.
  var serverResponse = {
    'error': {
      'errors': [
        {
          'domain': 'usageLimits',
          'reason': 'keyExpired',
          'message': 'Bad Request'
        }
      ],
      'code': 400,
      'message': 'Bad Request'
    }
  };
  // Expected client side error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      goog.json.serialize(serverResponse));
  // Simulate unexpected Apiary error.
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCusto' +
      'mToken?key=apiKey',
      'POST',
      goog.json.serialize({
        'token': 'CUSTOM_TOKEN',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.verifyCustomToken('CUSTOM_TOKEN').thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            expectedError,
            error);
        asyncTestCase.signal();
      });
}


function testGetErrorCodeDetails() {
  // No error message.
  assertUndefined(
      fireauth.RpcHandler.getErrorCodeDetails('OPERATION_NOT_ALLOWED'));
  // Error messages with variation of spaces before and after colon.
  assertEquals(
      'Provider Id is not enabled in configuration.',
      fireauth.RpcHandler.getErrorCodeDetails('OPERATION_NOT_ALLOWED : Provi' +
          'der Id is not enabled in configuration.'));
  assertEquals(
      'Provider Id is not enabled in configuration.',
      fireauth.RpcHandler.getErrorCodeDetails('OPERATION_NOT_ALLOWED:Provide' +
          'r Id is not enabled in configuration.'));
  // Error message that contains colons.
  assertEquals(
      'blabla:bla:::bla: something:',
      fireauth.RpcHandler.getErrorCodeDetails('OPERATION_NOT_ALLOWED: blabl' +
          'a:bla:::bla: something:'));
}


function testVerifyCustomToken_unknownServerResponse() {
  // Test when server returns unexpected response with no error message.
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCusto' +
      'mToken?key=apiKey',
      'POST',
      goog.json.serialize({
        'token': 'CUSTOM_TOKEN',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      {});
  rpcHandler.verifyCustomToken('CUSTOM_TOKEN').thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


function testEmailLinkSignIn_success() {
  var expectedResponse = {'idToken': 'ID_TOKEN'};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSi' +
      'gnin?key=apiKey',
      'POST',
      goog.json.serialize({
        'email': 'user@example.com',
        'oobCode': 'OTP_CODE',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.emailLinkSignIn('user@example.com', 'OTP_CODE')
      .then(function(response) {
        assertObjectEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testEmailLinkSignIn_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
                    'relyingparty/emailLinkSignin?key=apiKey';
  var email = 'user@example.com';
  var oobCode = 'OTP_CODE';
  var requestBody = {
    'email': email,
    'oobCode': oobCode,
    'returnSecureToken': true
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.INVALID_EMAIL] =
      fireauth.authenum.Error.INVALID_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.TOO_MANY_ATTEMPTS_TRY_LATER] =
      fireauth.authenum.Error.TOO_MANY_ATTEMPTS_TRY_LATER;
  errorMap[fireauth.RpcHandler.ServerError.USER_DISABLED] =
      fireauth.authenum.Error.USER_DISABLED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.emailLinkSignIn(email, oobCode);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests invalid server response emailLinkSignIn error.
 */
function testEmailLinkSignIn_unknownServerResponse() {
  // Test when server returns unexpected response with no error message.
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSi' +
      'gnin?key=apiKey',
      'POST',
      goog.json.serialize({
        'email': 'user@example.com',
        'oobCode': 'OTP_CODE',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      {});
  rpcHandler.emailLinkSignIn('user@example.com', 'OTP_CODE')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


function testEmailLinkSignIn_emptyActionCodeError() {
  // Test when empty action code is passed in emailLinkSignIn request.
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.emailLinkSignIn('user@example.com', '').thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR), error);
    asyncTestCase.signal();
  });
}


function testEmailLinkSignIn_invalidEmailError() {
  // Test when invalid email is passed in emailLinkSignIn request.
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.emailLinkSignIn('user@invalid', 'OTP_CODE')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_EMAIL),
            error);
        asyncTestCase.signal();
      });
}


function testVerifyPassword_success() {
  var expectedResponse = {
    'idToken': 'ID_TOKEN'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassw' +
      'ord?key=apiKey',
      'POST',
      goog.json.serialize({
        'email': 'uid123@fake.com',
        'password': 'mysupersecretpassword',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyPassword('uid123@fake.com', 'mysupersecretpassword')
      .then(function(response) {
        assertEquals('ID_TOKEN', response['idToken']);
        asyncTestCase.signal();
      });
}


function testVerifyPassword_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
      'relyingparty/verifyPassword?key=apiKey';
  var email = 'uid123@fake.com';
  var password = 'mysupersecretpassword';
  var requestBody = {
    'email': email,
    'password': password,
    'returnSecureToken': true
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.INVALID_EMAIL] =
      fireauth.authenum.Error.INVALID_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_PASSWORD] =
      fireauth.authenum.Error.INVALID_PASSWORD;
  errorMap[fireauth.RpcHandler.ServerError.TOO_MANY_ATTEMPTS_TRY_LATER] =
      fireauth.authenum.Error.TOO_MANY_ATTEMPTS_TRY_LATER;
  errorMap[fireauth.RpcHandler.ServerError.USER_DISABLED] =
      fireauth.authenum.Error.USER_DISABLED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.verifyPassword(email, password);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests invalid server response verifyPassword error.
 */
function testVerifyPassword_unknownServerResponse() {
  // Test when server returns unexpected response with no error message.
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassw' +
      'ord?key=apiKey',
      'POST',
      goog.json.serialize({
        'email': 'uid123@fake.com',
        'password': 'mysupersecretpassword',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      {});
  rpcHandler.verifyPassword('uid123@fake.com', 'mysupersecretpassword')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid request verifyPassword error.
 */
function testVerifyPassword_invalidPasswordError() {
  // Test when request is invalid.
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPassword('uid123@fake.com', '')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_PASSWORD),
            error);
        asyncTestCase.signal();
      });
}


function testVerifyPassword_invalidEmailError() {
  // Test when invalid email is passed in verifyPassword request.
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.verifyPassword('uid123@invalid', 'mysupersecretpassword')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_EMAIL),
            error);
        asyncTestCase.signal();
      });
}


function testCreateAccount_success() {
  var expectedResponse = {
    'idToken': 'ID_TOKEN'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'signupNewUser?key=apiKey',
      'POST',
      goog.json.serialize({
        'email': 'uid123@fake.com',
        'password': 'mysupersecretpassword',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.createAccount('uid123@fake.com', 'mysupersecretpassword')
      .then(function(response) {
        assertEquals('ID_TOKEN', response['idToken']);
        asyncTestCase.signal();
      });
}


function testCreateAccount_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
      'relyingparty/signupNewUser?key=apiKey';
  var email = 'uid123@fake.com';
  var password = 'mysupersecretpassword';
  var requestBody = {
    'email': email,
    'password': password,
    'returnSecureToken': true
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.EMAIL_EXISTS] =
      fireauth.authenum.Error.EMAIL_EXISTS;
  errorMap[fireauth.RpcHandler.ServerError.PASSWORD_LOGIN_DISABLED] =
      fireauth.authenum.Error.OPERATION_NOT_ALLOWED;
  errorMap[fireauth.RpcHandler.ServerError.OPERATION_NOT_ALLOWED] =
      fireauth.authenum.Error.OPERATION_NOT_ALLOWED;
  errorMap[fireauth.RpcHandler.ServerError.WEAK_PASSWORD] =
      fireauth.authenum.Error.WEAK_PASSWORD;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.createAccount(email, password);
  }, errorMap, expectedUrl, requestBody);
}


function testCreateAccount_unknownServerResponse() {
  // Test when server returns unexpected response with no error message.
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'signupNewUser?key=apiKey',
      'POST',
      goog.json.serialize({
        'email': 'uid123@fake.com',
        'password': 'mysupersecretpassword',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      {});
  rpcHandler.createAccount('uid123@fake.com', 'mysupersecretpassword')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


function testCreateAccount_noPasswordError() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.createAccount('uid123@fake.com', '')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.WEAK_PASSWORD),
            error);
        asyncTestCase.signal();
      });
}


function testCreateAccount_invalidEmailError() {
  // Test when invalid email is passed in setAccountInfo request.
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.createAccount('uid123@invalid', 'mysupersecretpassword')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_EMAIL),
            error);
        asyncTestCase.signal();
      });
}


function testDeleteAccount_success() {
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'deleteAccount?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN'
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      '{}');
  rpcHandler.deleteAccount('ID_TOKEN')
      .then(function() {
        asyncTestCase.signal();
      });
}


function testDeleteAccount_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
      'relyingparty/deleteAccount?key=apiKey';
  var requestBody = {
    'idToken': 'ID_TOKEN'
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.CREDENTIAL_TOO_OLD_LOGIN_AGAIN] =
      fireauth.authenum.Error.CREDENTIAL_TOO_OLD_LOGIN_AGAIN;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_ID_TOKEN] =
      fireauth.authenum.Error.INVALID_AUTH;
  errorMap[fireauth.RpcHandler.ServerError.USER_NOT_FOUND] =
      fireauth.authenum.Error.TOKEN_EXPIRED;
  errorMap[fireauth.RpcHandler.ServerError.TOKEN_EXPIRED] =
      fireauth.authenum.Error.TOKEN_EXPIRED;
  errorMap[fireauth.RpcHandler.ServerError.USER_DISABLED] =
      fireauth.authenum.Error.USER_DISABLED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.deleteAccount('ID_TOKEN');
  }, errorMap, expectedUrl, requestBody);
}


function testDeleteAccount_invalidRequestError() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.deleteAccount().thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


function testSignInAnonymously_success() {
  var expectedResponse = {
    'idToken': 'ID_TOKEN'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'signupNewUser?key=apiKey',
      'POST',
      goog.json.serialize({
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.signInAnonymously()
      .then(function(response) {
        assertEquals('ID_TOKEN', response['idToken']);
        asyncTestCase.signal();
      });
}


function testSignInAnonymously_unknownServerResponse() {
  // Test when server returns unexpected response with no error message.
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'signupNewUser?key=apiKey',
      'POST',
      goog.json.serialize({
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      {});
  rpcHandler.signInAnonymously()
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful verifyAssertion RPC call.
 */
function testVerifyAssertion_success() {
  var expectedResponse = {
    'idToken': 'ID_TOKEN',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthExpireIn': 3600,
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertion({
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).then(
      function(response) {
        assertEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


/**
 * Tests verifyAssertion RPC call with no recovery errorMessage.
 */
function testVerifyAssertion_returnIdpCredential_noRecoveryError() {
  // Simulate server response containing unrecoverable errorMessage.
  var serverResponse = {
    'federatedId': 'FEDERATED_ID',
    'providerId': 'google.com',
    'email': 'user@example.com',
    'emailVerified': true,
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthExpireIn': 3600,
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE',
    'errorMessage': 'USER_DISABLED'
  };
  // Expected error thrown.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.verifyAssertion({
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


/**
 * Tests verifyAssertion RPC call with no sessionId passed.
 */
function testVerifyAssertion_error() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyAssertion({
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful verifyAssertion for linking RPC call.
 */
function testVerifyAssertionForLinking_success() {
  var expectedResponse = {
    'idToken': 'ID_TOKEN',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthExpireIn': 3600,
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'existingIdToken',
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertionForLinking({
    'idToken': 'existingIdToken',
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).then(
      function(response) {
        assertEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


/**
 * Tests verifyAssertion for linking RPC call with no recovery errorMessage.
 */
function testVerifyAssertionForLinking_returnIdpCredential_noRecoveryError() {
  // Simulate server response containing unrecoverable errorMessage.
  var serverResponse = {
    'federatedId': 'FEDERATED_ID',
    'providerId': 'google.com',
    'email': 'user@example.com',
    'emailVerified': true,
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthExpireIn': 3600,
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE',
    'errorMessage': 'USER_DISABLED'
  };
  // Expected error thrown.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.verifyAssertionForLinking({
    'idToken': 'ID_TOKEN',
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


/**
 * Tests verifyAssertion for linking RPC call with no idToken passed.
 */
function testVerifyAssertionForLinking_error() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyAssertionForLinking({
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests server caught verifyAssertion errors.
 */
function testVerifyAssertion_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
      'relyingparty/verifyAssertion?key=apiKey';
  var requestBody = {
    'postBody': 'id_token=googleIdToken&access_token=accessToken&provider_id=' +
        'google.com',
    'requestUri': 'http://localhost',
    'returnIdpCredential': true,
    'returnSecureToken': true
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.INVALID_IDP_RESPONSE] =
      fireauth.authenum.Error.INVALID_IDP_RESPONSE;
  errorMap[fireauth.RpcHandler.ServerError.USER_DISABLED] =
      fireauth.authenum.Error.USER_DISABLED;
  errorMap[fireauth.RpcHandler.ServerError.FEDERATED_USER_ID_ALREADY_LINKED] =
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE;
  errorMap[fireauth.RpcHandler.ServerError.OPERATION_NOT_ALLOWED] =
      fireauth.authenum.Error.OPERATION_NOT_ALLOWED;
  errorMap[fireauth.RpcHandler.ServerError.USER_CANCELLED] =
      fireauth.authenum.Error.USER_CANCELLED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.verifyAssertion(requestBody);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests invalid request verifyAssertionForIdToken error.
 */
function testVerifyAssertion_invalidRequestError() {
  // Test when request is invalid.
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyAssertion({'postBody': '....'}).thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests need confirmation verifyAssertionForIdToken Auth linking error with
 * OAuth response.
 */
function testVerifyAssertion_needConfirmationError_oauthResponseAndEmail() {
  // Test Auth linking error when need confirmation flag is returned.
  var credential = fireauth.GoogleAuthProvider.credential(null,
      'googleAccessToken');
  var expectedError = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.NEED_CONFIRMATION,
      {
        email: 'user@example.com',
        credential: credential
      });
  var expectedResponse = {
    'needConfirmation': true,
    'idToken': 'PENDING_TOKEN',
    'email': 'user@example.com',
    'oauthAccessToken': 'googleAccessToken',
    'providerId': 'google.com'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'postBody': 'id_token=googleIdToken&access_token=accessToken&provide' +
        'r_id=google.com',
        'requestUri': 'http://localhost',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertion({
    'postBody': 'id_token=googleIdToken&access_token=accessToken&provider_id' +
        '=google.com',
    'requestUri': 'http://localhost'
  }).thenCatch(
      function(error) {
        assertTrue(error instanceof fireauth.AuthErrorWithCredential);
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


/**
 * Tests need confirmation verifyAssertionForIdToken Auth linking error without
 * OAuth response.
 */
function testVerifyAssertion_needConfirmationError_emailResponseOnly() {
  // Test Auth linking error when need confirmation flag is returned.
  var expectedError = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.NEED_CONFIRMATION,
      {email: 'user@example.com'});
  var expectedResponse = {
    'needConfirmation': true,
    'idToken': 'PENDING_TOKEN',
    'email': 'user@example.com'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'postBody': 'id_token=googleIdToken&access_token=accessToken&provide' +
        'r_id=google.com',
        'requestUri': 'http://localhost',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertion({
    'postBody': 'id_token=googleIdToken&access_token=accessToken&provider_id' +
        '=google.com',
    'requestUri': 'http://localhost'
  }).thenCatch(
      function(error) {
        assertTrue(error instanceof fireauth.AuthErrorWithCredential);
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


/**
 * Tests need confirmation verifyAssertionForIdToken with no additional info in
 * response.
 */
function testVerifyAssertion_needConfirmationError_noExtraInfo() {
  // Test Auth error when need confirmation flag is returned but OAuth response
  // missing.
  var expectedResponse = {
    'needConfirmation': true
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'postBody': 'id_token=googleIdToken&access_token=accessToken&provide' +
        'r_id=google.com',
        'requestUri': 'http://localhost',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertion({
    'postBody': 'id_token=googleIdToken&access_token=accessToken&provider_id' +
        '=google.com',
    'requestUri': 'http://localhost'
  }).thenCatch(
      function(error) {
        assertTrue(error instanceof fireauth.AuthError);
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.NEED_CONFIRMATION),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests verifyAssertionForIdToken when FEDERATED_USER_ID_ALREADY_LINKED error
 * is returned by the server.
 */
function testVerifyAssertion_credAlreadyInUseError_oauthResponseAndEmail() {
  // Test Auth linking error when FEDERATED_USER_ID_ALREADY_LINKED errorMessage
  // is returned.
  var credential = fireauth.GoogleAuthProvider.credential(null,
      'googleAccessToken');
  // Credential already in use error returned.
  var expectedError = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        email: 'user@example.com',
        credential: credential
      });
  var expectedResponse = {
    'kind': 'identitytoolkit#VerifyAssertionResponse',
    'errorMessage': 'FEDERATED_USER_ID_ALREADY_LINKED',
    'email': 'user@example.com',
    'oauthAccessToken': 'googleAccessToken',
    'oauthExpireIn': 5183999,
    'providerId': 'google.com'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'postBody': 'id_token=googleIdToken&access_token=accessToken&provide' +
        'r_id=google.com',
        'requestUri': 'http://localhost',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertion({
    'postBody': 'id_token=googleIdToken&access_token=accessToken&provider_id' +
        '=google.com',
    'requestUri': 'http://localhost'
  }).thenCatch(
      function(error) {
        assertTrue(error instanceof fireauth.AuthErrorWithCredential);
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


/**
 * Tests verifyAssertionForIdToken when EMAIL_EXISTS error
 * is returned by the server.
 */
function testVerifyAssertion_emailExistsError_oauthResponseAndEmail() {
  // Test Auth linking error when EMAIL_EXISTS errorMessage is returned.
  var credential = fireauth.FacebookAuthProvider.credential(
      'facebookAccessToken');
  // Email exists error returned.
  var expectedError = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.EMAIL_EXISTS,
      {
        email: 'user@example.com',
        credential: credential
      });
  var expectedResponse = {
    'kind': 'identitytoolkit#VerifyAssertionResponse',
    'errorMessage': 'EMAIL_EXISTS',
    'email': 'user@example.com',
    'oauthAccessToken': 'facebookAccessToken',
    'oauthExpireIn': 5183999,
    'providerId': 'facebook.com'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'postBody': 'access_token=accessToken&provider_id=facebook.com',
        'requestUri': 'http://localhost',
        'returnIdpCredential': true,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertion({
    'postBody': 'access_token=accessToken&provider_id=facebook.com',
    'requestUri': 'http://localhost'
  }).thenCatch(
      function(error) {
        assertTrue(error instanceof fireauth.AuthErrorWithCredential);
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful verifyAssertionForExisting RPC call.
 */
function testVerifyAssertionForExisting_success() {
  var expectedResponse = {
    'idToken': 'ID_TOKEN',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthExpireIn': 3600,
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        // autoCreate flag should be passed and set to false.
        'autoCreate': false,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertionForExisting({
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).then(
      function(response) {
        assertEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


/**
 * Tests verifyAssertion for existing RPC call with no recovery errorMessage.
 */
function testVerifyAssertionForExisting_returnIdpCredential_noRecoveryError() {
  // Simulate server response containing unrecoverable errorMessage.
  var serverResponse = {
    'federatedId': 'FEDERATED_ID',
    'providerId': 'google.com',
    'email': 'user@example.com',
    'emailVerified': true,
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthExpireIn': 3600,
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE',
    'errorMessage': 'USER_DISABLED'
  };
  // Expected error thrown.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.USER_DISABLED);
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        'autoCreate': false,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.verifyAssertionForExisting({
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


/**
 * Tests verifyAssertionForExisting RPC call with no sessionId passed.
 */
function testVerifyAssertionForExisting_error() {
  asyncTestCase.waitForSignals(1);
  // Same client side validation as verifyAssertion.
  rpcHandler.verifyAssertionForExisting({
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests USER_NOT_FOUND verifyAssertionForExisting response.
 */
function testVerifyAssertionForExisting_error_userNotFound() {
  // No user is found. No idToken returned.
  var expectedResponse = {
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthExpireIn': 3600,
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE',
    'errorMessage': 'USER_NOT_FOUND'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        // autoCreate flag should be passed and set to false.
        'autoCreate': false,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertionForExisting({
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.USER_DELETED),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests no idToken verifyAssertionForExisting response.
 */
function testVerifyAssertionForExisting_error_userNotFound() {
  // No idToken returned for whatever reason.
  var expectedResponse = {
    'oauthAccessToken': 'ACCESS_TOKEN',
    'oauthExpireIn': 3600,
    'oauthAuthorizationCode': 'AUTHORIZATION_CODE'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyAsse' +
      'rtion?key=apiKey',
      'POST',
      goog.json.serialize({
        'sessionId': 'SESSION_ID',
        'requestUri': 'http://localhost/callback#oauthResponse',
        'returnIdpCredential': true,
        // autoCreate flag should be passed and set to false.
        'autoCreate': false,
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyAssertionForExisting({
    'sessionId': 'SESSION_ID',
    'requestUri': 'http://localhost/callback#oauthResponse'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid request verifyAssertionForExisting error.
 */
function testVerifyAssertionForExisting_invalidRequestError() {
  // Test when request is invalid.
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyAssertionForExisting({'postBody': '....'})
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests server caught verifyAssertionForExisting errors.
 */
function testVerifyAssertionForExisting_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
      'relyingparty/verifyAssertion?key=apiKey';
  var requestBody = {
    'postBody': 'id_token=googleIdToken&access_token=accessToken&provider_id=' +
        'google.com',
    'requestUri': 'http://localhost',
    'returnIdpCredential': true,
    // autoCreate flag should be passed and set to false.
    'autoCreate': false,
    'returnSecureToken': true
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.INVALID_IDP_RESPONSE] =
      fireauth.authenum.Error.INVALID_IDP_RESPONSE;
  errorMap[fireauth.RpcHandler.ServerError.USER_DISABLED] =
      fireauth.authenum.Error.USER_DISABLED;
  errorMap[fireauth.RpcHandler.ServerError.OPERATION_NOT_ALLOWED] =
      fireauth.authenum.Error.OPERATION_NOT_ALLOWED;
  errorMap[fireauth.RpcHandler.ServerError.USER_CANCELLED] =
      fireauth.authenum.Error.USER_CANCELLED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.verifyAssertionForExisting(requestBody);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful sendSignInLinkToEmail RPC call with action code settings.
 */
function testSendSignInLinkToEmail_success_actionCodeSettings() {
  var userEmail = 'user@example.com';
  var additionalRequestData = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': true,
    'androidMinimumVersion': '12',
    'canHandleCodeInApp': true
  };
  var expectedResponse = {'email': userEmail};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.EMAIL_SIGNIN,
        'email': userEmail,
        'continueUrl': 'https://www.example.com/?state=abc',
        'iOSBundleId': 'com.example.ios',
        'androidPackageName': 'com.example.android',
        'androidInstallApp': true,
        'androidMinimumVersion': '12',
        'canHandleCodeInApp': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendSignInLinkToEmail('user@example.com', additionalRequestData)
      .then(function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful sendSignInLinkToEmail RPC call with custom locale.
 */
function testSendSignInLinkToEmail_success_customLocale() {
  var userEmail = 'user@example.com';
  var additionalRequestData = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': true,
    'androidMinimumVersion': '12',
    'canHandleCodeInApp': true
  };
  var expectedResponse = {'email': userEmail};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.EMAIL_SIGNIN,
        'email': userEmail,
        'continueUrl': 'https://www.example.com/?state=abc',
        'iOSBundleId': 'com.example.ios',
        'androidPackageName': 'com.example.android',
        'androidInstallApp': true,
        'androidMinimumVersion': '12',
        'canHandleCodeInApp': true
      }),
      {'Content-Type': 'application/json', 'X-Firebase-Locale': 'es'},
      delay,
      expectedResponse);
  rpcHandler.updateCustomLocaleHeader('es');
  rpcHandler.sendSignInLinkToEmail('user@example.com', additionalRequestData)
      .then(function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid email sendSignInLinkToEmail error.
 */
function testSendSignInLinkToEmail_invalidEmailError() {
  // Test when invalid email is passed in getOobCode request.
  var additionalRequestData = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': true,
    'androidMinimumVersion': '12',
    'canHandleCodeInApp': true
  };
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.sendSignInLinkToEmail('user@invalid', additionalRequestData)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_EMAIL),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid response sendSignInLinkToEmail error.
 */
function testSendSignInLinkToEmail_unknownServerResponse() {
  var userEmail = 'user@example.com';
  var additionalRequestData = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': true,
    'androidMinimumVersion': '12',
    'canHandleCodeInApp': true
  };
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.EMAIL_SIGNIN,
        'email': userEmail,
        'continueUrl': 'https://www.example.com/?state=abc',
        'iOSBundleId': 'com.example.ios',
        'androidPackageName': 'com.example.android',
        'androidInstallApp': true,
        'androidMinimumVersion': '12',
        'canHandleCodeInApp': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendSignInLinkToEmail(userEmail, additionalRequestData)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests server side sendSignInLinkToEmail error.
 */
function testSendSignInLinkToEmail_serverCaughtError() {
  var userEmail = 'user@example.com';
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
                    'gparty/getOobConfirmationCode?key=apiKey';
  var requestBody = {
    'requestType': fireauth.RpcHandler.GetOobCodeRequestType.EMAIL_SIGNIN,
    'email': userEmail
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.INVALID_RECIPIENT_EMAIL] =
      fireauth.authenum.Error.INVALID_RECIPIENT_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_SENDER] =
      fireauth.authenum.Error.INVALID_SENDER;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_MESSAGE_PAYLOAD] =
      fireauth.authenum.Error.INVALID_MESSAGE_PAYLOAD;

  // Action code settings related errors.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CONTINUE_URI] =
      fireauth.authenum.Error.INVALID_CONTINUE_URI;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_ANDROID_PACKAGE_NAME] =
      fireauth.authenum.Error.MISSING_ANDROID_PACKAGE_NAME;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_IOS_BUNDLE_ID] =
      fireauth.authenum.Error.MISSING_IOS_BUNDLE_ID;
  errorMap[fireauth.RpcHandler.ServerError.UNAUTHORIZED_DOMAIN] =
      fireauth.authenum.Error.UNAUTHORIZED_DOMAIN;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.sendSignInLinkToEmail(userEmail, {});
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful sendPasswordResetEmail RPC call with action code settings.
 */
function testSendPasswordResetEmail_success_actionCodeSettings() {
  var userEmail = 'user@example.com';
  var additionalRequestData = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': true,
    'androidMinimumVersion': '12',
    'canHandleCodeInApp': true
  };
  var expectedResponse = {
    'email': userEmail
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.PASSWORD_RESET,
        'email': userEmail,
        'continueUrl': 'https://www.example.com/?state=abc',
        'iOSBundleId': 'com.example.ios',
        'androidPackageName': 'com.example.android',
        'androidInstallApp': true,
        'androidMinimumVersion': '12',
        'canHandleCodeInApp': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendPasswordResetEmail('user@example.com', additionalRequestData)
      .then(function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful sendPasswordResetEmail RPC call with no action code
 * settings.
 */
function testSendPasswordResetEmail_success_noActionCodeSettings() {
  var userEmail = 'user@example.com';
  var expectedResponse = {
    'email': userEmail
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.PASSWORD_RESET,
        'email': userEmail
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendPasswordResetEmail('user@example.com', {})
      .then(function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful sendPasswordResetEmail RPC call with custom locale and no
 * action code settings.
 */
function testSendPasswordResetEmail_success_customLocale_noActionCode() {
  var userEmail = 'user@example.com';
  var expectedResponse = {
    'email': userEmail
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.PASSWORD_RESET,
        'email': userEmail
      }),
      {
        'Content-Type': 'application/json',
        'X-Firebase-Locale': 'es'
      },
      delay,
      expectedResponse);
  rpcHandler.updateCustomLocaleHeader('es');
  rpcHandler.sendPasswordResetEmail('user@example.com', {})
      .then(function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid email sendPasswordResetEmail error.
 */
function testSendPasswordResetEmail_invalidEmailError() {
  // Test when invalid email is passed in getOobCode request.
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.sendPasswordResetEmail('user@exampl', {})
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_EMAIL),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid response sendPasswordResetEmail error.
 */
function testSendPasswordResetEmail_unknownServerResponse() {
  var userEmail = 'user@example.com';
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.PASSWORD_RESET,
        'email': userEmail
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendPasswordResetEmail(userEmail, {}).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests server side sendPasswordResetEmail error.
 */
function testSendPasswordResetEmail_caughtServerError() {
  var userEmail = 'user@example.com';
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/getOobConfirmationCode?key=apiKey';
  var requestBody = {
    'requestType': fireauth.RpcHandler.GetOobCodeRequestType.PASSWORD_RESET,
    'email': userEmail
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.EMAIL_NOT_FOUND] =
      fireauth.authenum.Error.USER_DELETED;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_RECIPIENT_EMAIL] =
      fireauth.authenum.Error.INVALID_RECIPIENT_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_SENDER] =
      fireauth.authenum.Error.INVALID_SENDER;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_MESSAGE_PAYLOAD] =
      fireauth.authenum.Error.INVALID_MESSAGE_PAYLOAD;

  // Action code settings related errors.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CONTINUE_URI] =
      fireauth.authenum.Error.INVALID_CONTINUE_URI;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_ANDROID_PACKAGE_NAME] =
      fireauth.authenum.Error.MISSING_ANDROID_PACKAGE_NAME;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_IOS_BUNDLE_ID] =
      fireauth.authenum.Error.MISSING_IOS_BUNDLE_ID;
  errorMap[fireauth.RpcHandler.ServerError.UNAUTHORIZED_DOMAIN] =
      fireauth.authenum.Error.UNAUTHORIZED_DOMAIN;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.sendPasswordResetEmail(userEmail, {});
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful sendEmailVerification RPC call with action code settings.
 */
function testSendEmailVerification_success_actionCodeSettings() {
  var idToken = 'ID_TOKEN';
  var userEmail = 'user@example.com';
  var expectedResponse = {
    'email': userEmail
  };
  var additionalRequestData = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': true,
    'androidMinimumVersion': '12',
    'canHandleCodeInApp': true
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.VERIFY_EMAIL,
        'idToken': idToken,
        'continueUrl': 'https://www.example.com/?state=abc',
        'iOSBundleId': 'com.example.ios',
        'androidPackageName': 'com.example.android',
        'androidInstallApp': true,
        'androidMinimumVersion': '12',
        'canHandleCodeInApp': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendEmailVerification(idToken, additionalRequestData)
      .then(function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful sendEmailVerification RPC call with no action code settings.
 */
function testSendEmailVerification_success_noActionCodeSettings() {
  var idToken = 'ID_TOKEN';
  var userEmail = 'user@example.com';
  var expectedResponse = {
    'email': userEmail
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.VERIFY_EMAIL,
        'idToken': idToken
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendEmailVerification(idToken, {})
      .then(function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful sendEmailVerification RPC call with custom locale and no
 * action code settings.
 */
function testSendEmailVerification_success_customLocale_noActionCodeSettings() {
  var idToken = 'ID_TOKEN';
  var userEmail = 'user@example.com';
  var expectedResponse = {
    'email': userEmail
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.VERIFY_EMAIL,
        'idToken': idToken
      }),
      {
        'Content-Type': 'application/json',
        'X-Firebase-Locale': 'ar'
      },
      delay,
      expectedResponse);
  rpcHandler.updateCustomLocaleHeader('ar');
  rpcHandler.sendEmailVerification(idToken, {})
      .then(function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid response sendEmailVerification error.
 */
function testSendEmailVerification_unknownServerResponse() {
  var idToken = 'ID_TOKEN';
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobCon' +
      'firmationCode?key=apiKey',
      'POST',
      goog.json.serialize({
        'requestType': fireauth.RpcHandler.GetOobCodeRequestType.VERIFY_EMAIL,
        'idToken': idToken
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendEmailVerification(idToken, {}).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests server side sendEmailVerification error.
 */
function testSendEmailVerification_caughtServerError() {
  var idToken = 'ID_TOKEN';
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/getOobConfirmationCode?key=apiKey';
  var requestBody = {
    'requestType': fireauth.RpcHandler.GetOobCodeRequestType.VERIFY_EMAIL,
    'idToken': idToken
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.EMAIL_NOT_FOUND] =
      fireauth.authenum.Error.USER_DELETED;

  // Action code settings related errors.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CONTINUE_URI] =
      fireauth.authenum.Error.INVALID_CONTINUE_URI;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_ANDROID_PACKAGE_NAME] =
      fireauth.authenum.Error.MISSING_ANDROID_PACKAGE_NAME;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_IOS_BUNDLE_ID] =
      fireauth.authenum.Error.MISSING_IOS_BUNDLE_ID;
  errorMap[fireauth.RpcHandler.ServerError.UNAUTHORIZED_DOMAIN] =
      fireauth.authenum.Error.UNAUTHORIZED_DOMAIN;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.sendEmailVerification(idToken, {});
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful confirmPasswordReset RPC call.
 */
function testConfirmPasswordReset_success() {
  var userEmail = 'user@example.com';
  var newPassword = 'newPass';
  var code = 'PASSWORD_RESET_OOB_CODE';
  var expectedResponse = {
    'email': userEmail
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/resetPass' +
      'word?key=apiKey',
      'POST',
      goog.json.serialize({
        'oobCode': code,
        'newPassword': newPassword
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.confirmPasswordReset(code, newPassword).then(
      function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


function testConfirmPasswordReset_missingCode() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.confirmPasswordReset('', 'myPassword')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_OOB_CODE),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid response confirmPasswordReset error.
 */
function testConfirmPasswordReset_unknownServerResponse() {
  var newPassword = 'newPass';
  var code = 'PASSWORD_RESET_OOB_CODE';
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/resetPass' +
      'word?key=apiKey',
      'POST',
      goog.json.serialize({
        'oobCode': code,
        'newPassword': newPassword
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.confirmPasswordReset(code, newPassword).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests server side confirmPasswordReset error.
 */
function testConfirmPasswordReset_caughtServerError() {
  var newPassword = 'newPass';
  var code = 'PASSWORD_RESET_OOB_CODE';
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/resetPassword?key=apiKey';
  var requestBody = {
    'oobCode': code,
    'newPassword': newPassword
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.EXPIRED_OOB_CODE] =
      fireauth.authenum.Error.EXPIRED_OOB_CODE;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_OOB_CODE] =
      fireauth.authenum.Error.INVALID_OOB_CODE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_OOB_CODE] =
      fireauth.authenum.Error.INTERNAL_ERROR;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.confirmPasswordReset(code, newPassword);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful checkActionCode RPC call.
 */
function testCheckActionCode_success() {
  var code = 'REVOKE_EMAIL_OOB_CODE';
  var expectedResponse = {
    'email': 'user@example.com',
    'newEmail': 'fake@example.com',
    'requestType': 'PASSWORD_RESET'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/resetPass' +
      'word?key=apiKey',
      'POST',
      goog.json.serialize({
        'oobCode': code
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.checkActionCode(code).then(
      function(info) {
        assertObjectEquals(expectedResponse, info);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful checkActionCode RPC call for email sign-in.
 */
function testCheckActionCode_emailSignIn_success() {
  var code = 'EMAIL_SIGNIN_CODE';
  // Email field is empty for EMAIL_SIGNIN.
  var expectedResponse = {
    'requestType': 'EMAIL_SIGNIN'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/resetPass' +
      'word?key=apiKey',
      'POST',
      goog.json.serialize({
        'oobCode': code
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.checkActionCode(code).then(
      function(info) {
        assertObjectEquals(expectedResponse, info);
        asyncTestCase.signal();
      });
}


function testCheckActionCode_missingCode() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.checkActionCode('')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_OOB_CODE),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid response checkActionCode error (empty response).
 */
function testCheckActionCode_uncaughtServerError() {
  var code = 'REVOKE_EMAIL_OOB_CODE';
  // Required fields missing in response.
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/resetPass' +
      'word?key=apiKey',
      'POST',
      goog.json.serialize({
        'oobCode': code
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.checkActionCode(code).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid response checkActionCode error (email only returned).
 */
function testCheckActionCode_uncaughtServerError() {
  var code = 'REVOKE_EMAIL_OOB_CODE';
  // Required requestType field missing in response.
  var expectedResponse = {
    'email': 'user@example.com',
    'newEmail': 'fake@example.com'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/resetPass' +
      'word?key=apiKey',
      'POST',
      goog.json.serialize({
        'oobCode': code
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.checkActionCode(code).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests server side checkActionCode error.
 */
function testCheckActionCode_caughtServerError() {
  var code = 'REVOKE_EMAIL_OOB_CODE';
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/resetPassword?key=apiKey';
  var requestBody = {
    'oobCode': code
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.EXPIRED_OOB_CODE] =
      fireauth.authenum.Error.EXPIRED_OOB_CODE;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_OOB_CODE] =
      fireauth.authenum.Error.INVALID_OOB_CODE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_OOB_CODE] =
      fireauth.authenum.Error.INTERNAL_ERROR;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.checkActionCode(code);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful applyActionCode RPC call.
 */
function testApplyActionCode_success() {
  var userEmail = 'user@example.com';
  var code = 'EMAIL_VERIFICATION_OOB_CODE';
  var expectedResponse = {
    'email': userEmail
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'setAccountInfo?key=apiKey',
      'POST',
      goog.json.serialize({
        'oobCode': code
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.applyActionCode(code).then(
      function(email) {
        assertEquals(userEmail, email);
        asyncTestCase.signal();
      });
}


function testApplyActionCode_missingCode() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.applyActionCode('')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_OOB_CODE),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid response applyActionCode error.
 */
function testApplyActionCode_unknownServerResponse() {
  var code = 'EMAIL_VERIFICATION_OOB_CODE';
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'setAccountInfo?key=apiKey',
      'POST',
      goog.json.serialize({
        'oobCode': code
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.applyActionCode(code).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests server side applyActionCode error.
 */
function testApplyActionCode_caughtServerError() {
  var code = 'EMAIL_VERIFICATION_OOB_CODE';
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/setAccountInfo?key=apiKey';
  var requestBody = {
    'oobCode': code
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.EXPIRED_OOB_CODE] =
      fireauth.authenum.Error.EXPIRED_OOB_CODE;
  errorMap[fireauth.RpcHandler.ServerError.EMAIL_NOT_FOUND] =
      fireauth.authenum.Error.USER_DELETED;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_OOB_CODE] =
      fireauth.authenum.Error.INVALID_OOB_CODE;
  errorMap[fireauth.RpcHandler.ServerError.USER_DISABLED] =
      fireauth.authenum.Error.USER_DISABLED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.applyActionCode(code);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests serialize_ method.
 */
function testSerialize() {
  var obj1 = {
    'a': 1,
    'b': 'gegg',
    'c': [1, 2, 4]
  };
  assertEquals(goog.json.serialize(obj1), fireauth.RpcHandler.serialize_(obj1));
  var obj2 = {
    'a': 1,
    'b': null,
    'c': undefined,
    'd': '',
    'e': 0,
    'f': false
  };
  // null and undefined should be removed.
  assertEquals(
      goog.json.serialize({'a': 1, 'd': '', 'e': 0, 'f': false}),
      fireauth.RpcHandler.serialize_(obj2));
}


/**
 * Tests successful deleteLinkedAccounts RPC call.
 */
function testDeleteLinkedAccounts_success() {
  var expectedResponse = {
    'email': 'user@example.com',
    'providerUserInfo': [
      {'providerId': 'google.com'}
    ]
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'deleteProvider': ['github.com', 'facebook.com']
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.deleteLinkedAccounts('ID_TOKEN', ['github.com', 'facebook.com'])
      .then(function(response) {
        assertObjectEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid request deleteLinkedAccounts error.
 */
function testDeleteLinkedAccounts_invalidRequestError() {
  // Test when request is invalid.
  asyncTestCase.waitForSignals(1);
  rpcHandler.deleteLinkedAccounts('ID_TOKEN', 'google.com').thenCatch(
      function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests server caught deleteLinkedAccounts errors.
 */
function testDeleteLinkedAccounts_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/setAccountInfo?key=apiKey';
  var requestBody = {
    'idToken': 'ID_TOKEN',
    'deleteProvider': ['github.com', 'facebook.com']
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.USER_NOT_FOUND] =
      fireauth.authenum.Error.TOKEN_EXPIRED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.deleteLinkedAccounts(
        'ID_TOKEN', ['github.com', 'facebook.com']);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful updateProfile request.
 */
function testUpdateProfile_success() {
  var expectedResponse = {
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoUrl': 'http://abs.twimg.com/sticky/default.png'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'displayName': 'John Doe',
        'photoUrl': 'http://abs.twimg.com/sticky/default.png',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.updateProfile('ID_TOKEN', {
    'displayName': 'John Doe',
    'photoUrl': 'http://abs.twimg.com/sticky/default.png'
  }).then(function(response) {
    assertObjectEquals(expectedResponse, response);
    asyncTestCase.signal();
  });
}


function testUpdateProfile_blankFields() {
  var expectedResponse = {
    // We test here that a response without email is a valid response.
    'email': '',
    'displayName': ''
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'displayName': '',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.updateProfile('ID_TOKEN', {
    'displayName': ''
  }).then(function(response) {
    assertObjectEquals(expectedResponse, response);
    asyncTestCase.signal();
  });
}


function testUpdateProfile_omittedFields() {
  var expectedResponse = {
    'email': 'uid123@fake.com',
    'displayName': 'John Doe',
    'photoUrl': 'http://abs.twimg.com/sticky/default.png'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'displayName': 'John Doe',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.updateProfile('ID_TOKEN', {
    'displayName': 'John Doe'
  }).then(function(response) {
    assertObjectEquals(expectedResponse, response);
    asyncTestCase.signal();
  });
}


function testUpdateProfile_deleteFields() {
  var expectedResponse = {
    'email': 'uid123@fake.com',
    'displayName': 'John Doe'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'displayName': 'John Doe',
        'deleteAttribute': ['PHOTO_URL'],
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.updateProfile('ID_TOKEN', {
    'displayName': 'John Doe',
    'photoUrl': null
  }).then(function(response) {
    assertObjectEquals(expectedResponse, response);
    asyncTestCase.signal();
  });
}


/**
 * Tests server caught updateProfile error.
 */
function testUpdateProfile_error() {
  var serverResponse = {
    'error': {'message': fireauth.RpcHandler.ServerError.INTERNAL_ERROR}
  };
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      goog.json.serialize(serverResponse));
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'displayName': 'John Doe',
        'photoUrl': 'http://abs.twimg.com/sticky/default.png',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.updateProfile('ID_TOKEN', {
    'displayName': 'John Doe',
    'photoUrl': 'http://abs.twimg.com/sticky/default.png'
  }).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


function testUpdateEmail_success() {
  var expectedResponse = {
    'email': 'newuser@example.com'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.updateEmail('ID_TOKEN', 'newuser@example.com')
      .then(function(response) {
        assertObjectEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'email': 'newuser@example.com',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
}


function testUpdateEmail_customLocale_success() {
  var expectedResponse = {
    'email': 'newuser@example.com'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.updateCustomLocaleHeader('tr');
  rpcHandler.updateEmail('ID_TOKEN', 'newuser@example.com')
      .then(function(response) {
        assertObjectEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'email': 'newuser@example.com',
        'returnSecureToken': true
      }),
      {
        'Content-Type': 'application/json',
        'X-Firebase-Locale': 'tr'
      },
      delay,
      expectedResponse);
}


function testUpdateEmail_invalidEmail() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_EMAIL);
  asyncTestCase.waitForSignals(1);
  rpcHandler.updateEmail('ID_TOKEN', 'newuser@exam')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


function testUpdatePassword_success() {
  var expectedResponse = {
    'email': 'user@example.com',
    'idToken': 'idToken'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'password': 'newPassword',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.updatePassword('ID_TOKEN', 'newPassword')
      .then(function(response) {
        assertObjectEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testUpdatePassword_noPassword() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.updatePassword('ID_TOKEN', '')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.WEAK_PASSWORD),
            error);
        asyncTestCase.signal();
      });
}


function testUpdateEmailAndPassword_success() {
  var expectedResponse = {
    'email': 'user@example.com',
    'idToken': 'idToken'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccount' +
      'Info?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'email': 'me@gmail.com',
        'password': 'newPassword',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.updateEmailAndPassword('ID_TOKEN', 'me@gmail.com', 'newPassword')
      .then(function(response) {
        assertObjectEquals(expectedResponse, response);
        asyncTestCase.signal();
      });
}


function testUpdateEmailAndPassword_noEmail() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.updateEmailAndPassword('ID_TOKEN', '', 'newPassword')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_EMAIL),
            error);
        asyncTestCase.signal();
      });
}


function testUpdateEmailAndPassword_noPassword() {
  asyncTestCase.waitForSignals(1);
  rpcHandler.updateEmailAndPassword('ID_TOKEN', 'me@gmail.com', '')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.WEAK_PASSWORD),
            error);
        asyncTestCase.signal();
      });
}


function testEmailLinkSignInForLinking_success() {
  var expectedResponse = {'idToken': 'ID_TOKEN'};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSi' +
      'gnin?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'email': 'user@example.com',
        'oobCode': 'OTP_CODE',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.emailLinkSignInForLinking(
      'ID_TOKEN', 'user@example.com', 'OTP_CODE')
      .then(function(response) {
        assertEquals('ID_TOKEN', response['idToken']);
        asyncTestCase.signal();
      });
}


function testEmailLinkSignInForLinking_serverCaughtError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/' +
                    'relyingparty/emailLinkSignin?key=apiKey';
  var email = 'user@example.com';
  var oobCode = 'OTP_CODE';
  var id_token = 'ID_TOKEN';
  var requestBody = {
    'idToken': 'ID_TOKEN',
    'email': email,
    'oobCode': oobCode,
    'returnSecureToken': true
  };
  var errorMap = {};
  errorMap[fireauth.RpcHandler.ServerError.INVALID_EMAIL] =
      fireauth.authenum.Error.INVALID_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.TOO_MANY_ATTEMPTS_TRY_LATER] =
      fireauth.authenum.Error.TOO_MANY_ATTEMPTS_TRY_LATER;
  errorMap[fireauth.RpcHandler.ServerError.USER_DISABLED] =
      fireauth.authenum.Error.USER_DISABLED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.emailLinkSignInForLinking(id_token, email, oobCode);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests invalid server response emailLinkSignInForLinking error.
 */
function testEmailLinkSignInForLinking_unknownServerResponse() {
  // Test when server returns unexpected response with no error message.
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSi' +
      'gnin?key=apiKey',
      'POST',
      goog.json.serialize({
        'idToken': 'ID_TOKEN',
        'email': 'user@example.com',
        'oobCode': 'OTP_CODE',
        'returnSecureToken': true
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      {});
  rpcHandler.emailLinkSignInForLinking(
      'ID_TOKEN', 'user@example.com', 'OTP_CODE')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


function testEmailLinkSignInForLinking_emptyActionCodeError() {
  // Test when empty action code is passed in emailLinkSignInForLinking request.
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.emailLinkSignInForLinking('ID_TOKEN', 'user@example.com', '')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


function testEmailLinkSignInForLinking_invalidEmailError() {
  // Test when invalid email is passed in emailLinkSignInForLinking request.
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.emailLinkSignInForLinking(
      'ID_TOKEN', 'user@invalid', 'OTP_CODE')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INVALID_EMAIL),
            error);
        asyncTestCase.signal();
      });
}


function testEmailLinkSignInForLinking_emptyIdTokenError() {
  // Test when empty ID token is passed in emailLinkSignInForLinking request.
  asyncTestCase.waitForSignals(1);
  // Test when request is invalid.
  rpcHandler.emailLinkSignInForLinking(
      '', 'user@example.com', 'OTP_CODE')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


function testInvokeRpc() {
  asyncTestCase.waitForSignals(3);
  var request = {
    'myRequestKey': 'myRequestValue',
    'myOtherRequestKey': 'myOtherRequestValue'
  };
  var response = {
    'myResponseKey': 'myResponseValue',
    'myOtherResponseKey': 'myOtherResponseValue'
  };

  var rpcMethod = {
    endpoint: 'myEndpoint',
    requestRequiredFields: ['myRequestKey'],
    requestValidator: function(actualRequest) {
      assertObjectEquals(request, actualRequest);
      asyncTestCase.signal();
    },
    responseValidator: function(actualResponse) {
      assertObjectEquals(response, actualResponse);
      asyncTestCase.signal();
    }
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'myEndpoint?key=apiKey',
      'POST',
      goog.json.serialize(request),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      response);
  rpcHandler.invokeRpc_(rpcMethod, request).then(function(actualResponse) {
    assertObjectEquals(response, actualResponse);
    asyncTestCase.signal();
  });
}


function testInvokeRpc_httpMethod() {
  asyncTestCase.waitForSignals(1);
  var request = {};
  var rpcMethod = {
    endpoint: 'myEndpoint',
    httpMethod: fireauth.RpcHandler.HttpMethod.GET
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'myEndpoint?key=apiKey',
      'GET',
      undefined,
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      {});
  rpcHandler.invokeRpc_(rpcMethod, request)
      .then(function() {
        asyncTestCase.signal();
      });
}


function testInvokeRpc_requiredFields() {
  // The XHR should not be sent if there was a problem with the request.
  stubs.replace(fireauth.RpcHandler.prototype, 'sendXhr_', fail);
  asyncTestCase.waitForSignals(1);
  var request = {
    'myRequestKey': 'myRequestValue',
    'myOtherRequestKey': 'myOtherRequestValue'
  };
  var rpcMethod = {
    endpoint: 'myEndpoint',
    requestRequiredFields: ['myRequestKey', 'keyThatIsNotThere'],
    requestValidator: function() {}
  };
  rpcHandler.invokeRpc_(rpcMethod, request).then(fail, function(actualError) {
    fireauth.common.testHelper.assertErrorEquals(new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR), actualError);
    asyncTestCase.signal();
  });
}


function testInvokeRpc_requestError() {
  // The XHR should not be sent if there was a problem with the request.
  stubs.replace(fireauth.RpcHandler.prototype, 'sendXhr_', fail);
  asyncTestCase.waitForSignals(2);
  var request = {
    'myRequestKey': 'myRequestValue',
    'myOtherRequestKey': 'myOtherRequestValue'
  };

  var error = {'name': 'myRequestError'};
  var rpcMethod = {
    endpoint: 'myEndpoint',
    requestValidator: function(actualRequest) {
      assertObjectEquals(request, actualRequest);
      asyncTestCase.signal();
      throw error;
    }
  };
  rpcHandler.invokeRpc_(rpcMethod, request).then(fail, function(actualError) {
    assertObjectEquals(error, actualError);
    asyncTestCase.signal();
  });
}


function testInvokeRpc_responseError() {
  asyncTestCase.waitForSignals(2);
  var request = {};
  var response = {
    'myResponseKey': 'myResponseValue',
    'myOtherResponseKey': 'myOtherResponseValue'
  };
  var error = {'name': 'myResponseError'};
  var rpcMethod = {
    endpoint: 'myEndpoint',
    responseValidator: function(actualResponse) {
      assertObjectEquals(response, actualResponse);
      asyncTestCase.signal();
      throw error;
    }
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'myEndpoint?key=apiKey',
      'POST',
      goog.json.serialize(request),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      response);
  rpcHandler.invokeRpc_(rpcMethod, request).then(fail, function(actualError) {
    assertObjectEquals(error, actualError);
    asyncTestCase.signal();
  });
}


function testInvokeRpc_responseField() {
  asyncTestCase.waitForSignals(1);
  var request = {};
  var response = {
    'someOtherField': 'unimportantInfo',
    'theFieldWeWant': 'importantInfo'
  };
  var rpcMethod = {
    endpoint: 'myEndpoint',
    responseField: 'theFieldWeWant'
  };
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/' +
      'myEndpoint?key=apiKey',
      'POST',
      goog.json.serialize(request),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      response);
  rpcHandler.invokeRpc_(rpcMethod, request).then(function(actualValue) {
    assertObjectEquals('importantInfo', actualValue);
    asyncTestCase.signal();
  });
}


/**
 * Test getAdditionalScopes_ for passing scopes in createAuthUri request.
 */
function testGetAdditionalScopes() {
  var scopes = fireauth.RpcHandler.getAdditionalScopes_('google.com');
  assertNull(scopes);
  scopes = fireauth.RpcHandler.getAdditionalScopes_(
      'google.com', ['scope1', 'scope2', 'scope3']);
  assertEquals(
      goog.json.serialize({
        'google.com': 'scope1,scope2,scope3'
      }),
      scopes);
}


/**
 * Tests successful getAuthUri request.
 */
function testGetAuthUri_success() {
  var expectedCustomParameters = {
    'hd': 'example.com',
    'login_hint': 'user@example.com'
  };
  var expectedResponse = {
    'authUri': 'https://accounts.google.com',
    'providerId': 'google.com',
    'registered': true,
    'forExistingProvider': true,
    'sessionId': 'SESSION_ID'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuth' +
      'Uri?key=apiKey',
      'POST',
      goog.json.serialize({
        'identifier': 'user@example.com',
        'providerId': 'google.com',
        'continueUri': 'http://localhost/widget',
        'customParameter': expectedCustomParameters,
        'oauthScope': goog.json.serialize({
          'google.com': 'scope1,scope2,scope3'
        })
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.getAuthUri(
      'google.com',
      'http://localhost/widget',
      expectedCustomParameters,
      ['scope1', 'scope2', 'scope3'],
      'user@example.com').then(function(response) {
    assertObjectEquals(expectedResponse, response);
    asyncTestCase.signal();
  });
}


/**
 * Tests successful getAuthUri request with Google provider and sessionId.
 */
function testGetAuthUri_googleProvider_withSessionId_success() {
  var expectedCustomParameters = {
    'hd': 'example.com',
    'login_hint': 'user@example.com'
  };
  var expectedResponse = {
    'authUri': 'https://accounts.google.com',
    'providerId': 'google.com',
    'registered': true,
    'forExistingProvider': true,
    'sessionId': 'SESSION_ID'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuth' +
      'Uri?key=apiKey',
      'POST',
      goog.json.serialize({
        'identifier': 'user@example.com',
        'providerId': 'google.com',
        'continueUri': 'http://localhost/widget',
        'customParameter': expectedCustomParameters,
        'oauthScope': goog.json.serialize({
          'google.com': 'scope1,scope2,scope3'
        }),
        'sessionId': 'SESSION_ID',
        'authFlowType': 'CODE_FLOW'
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.getAuthUri(
      'google.com',
      'http://localhost/widget',
      expectedCustomParameters,
      ['scope1', 'scope2', 'scope3'],
      'user@example.com',
      'SESSION_ID').then(function(response) {
    assertObjectEquals(expectedResponse, response);
    asyncTestCase.signal();
  });
}


/**
 * Tests successful getAuthUri request with other provider and sessionId.
 */
function testGetAuthUri_otherProvider_withSessionId_success() {
  var expectedResponse = {
    'authUri': 'https://facebook.com/login',
    'providerId': 'facebook.com',
    'registered': true,
    'sessionId': 'SESSION_ID'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuth' +
      'Uri?key=apiKey',
      'POST',
      goog.json.serialize({
        'providerId': 'facebook.com',
        'continueUri': 'http://localhost/widget',
        'customParameter': {},
        'oauthScope': goog.json.serialize({
          'facebook.com': 'scope1,scope2,scope3'
        }),
        'sessionId': 'SESSION_ID'
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.getAuthUri(
      'facebook.com',
      'http://localhost/widget',
      undefined,
      ['scope1', 'scope2', 'scope3'],
      undefined,
      'SESSION_ID').then(function(response) {
    assertObjectEquals(expectedResponse, response);
    asyncTestCase.signal();
  });
}


/**
 * Tests server caught getAuthUri error.
 */
function testGetAuthUri_error() {
  var serverResponse = {
    'error': {'message': fireauth.RpcHandler.ServerError.INTERNAL_ERROR}
  };
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      goog.json.serialize(serverResponse));
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuth' +
      'Uri?key=apiKey',
      'POST',
      goog.json.serialize({
        'providerId': 'google.com',
        'continueUri': 'http://localhost/widget',
        'customParameter': {}
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      serverResponse);
  rpcHandler.getAuthUri(
      'google.com',
      'http://localhost/widget').thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


/**
 * Tests getAuthUri response without authUri field.
 */
function testGetAuthUri_error_noAuthUri() {
  var expectedCustomParameters = {
    'hd': 'example.com',
    'login_hint': 'user@example.com'
  };
  // getAuthUri response without authUri field.
  var expectedResponse = {
    'providerId': 'google.com',
    'registered': true,
    'forExistingProvider': true,
    'sessionId': 'SESSION_ID'
  };
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'Unable to determine the authorization endpoint for the specified '+
      'provider. This may be an issue in the provider configuration.');
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuth' +
      'Uri?key=apiKey',
      'POST',
      goog.json.serialize({
        'identifier': 'user@example.com',
        'providerId': 'google.com',
        'continueUri': 'http://localhost/widget',
        'customParameter': expectedCustomParameters,
        'oauthScope': goog.json.serialize({
          'google.com': 'scope1,scope2,scope3'
        })
      }),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.getAuthUri(
      'google.com',
      'http://localhost/widget',
      expectedCustomParameters,
      ['scope1', 'scope2', 'scope3'],
      'user@example.com').thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    asyncTestCase.signal();
  });
}


/**
 * Tests successful sendVerificationCode RPC call.
 */
function testSendVerificationCode_success() {
  var expectedRequest = {
    'phoneNumber': '+15551234567',
    'recaptchaToken': 'RECAPTCHA_TOKEN'
  };
  var expectedResponse = {
    'sessionInfo': 'SESSION_INFO'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/sendVerifi' +
      'cationCode?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendVerificationCode(expectedRequest).then(function(sessionInfo) {
    assertEquals(expectedResponse['sessionInfo'], sessionInfo);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid request sendVerificationCode error for a missing phone number.
 */
function testSendVerificationCode_invalidRequest_missingPhoneNumber() {
  var expectedRequest = {
    'recaptchaToken': 'RECAPTCHA_TOKEN'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.sendVerificationCode(expectedRequest).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid request sendVerificationCode error for a missing reCAPTCHA
 * token.
 */
function testSendVerificationCode_invalidRequest_missingRecaptchaToken() {
  var expectedRequest = {
    'phoneNumber': '+15551234567'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.sendVerificationCode(expectedRequest).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid response sendVerificationCode error.
 */
function testSendVerificationCode_unknownServerResponse() {
  var expectedRequest = {
    'phoneNumber': '+15551234567',
    'recaptchaToken': 'RECAPTCHA_TOKEN'
  };
  // No sessionInfo returned.
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/sendVerifi' +
      'cationCode?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.sendVerificationCode(expectedRequest).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests server side sendVerificationCode error.
 */
function testSendVerificationCode_caughtServerError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/sendVerificationCode?key=apiKey';
  var requestBody = {
    'phoneNumber': '+15551234567',
    'recaptchaToken': 'RECAPTCHA_TOKEN'
  };
  var errorMap = {};
  // All related server errors for sendVerificationCode.
  errorMap[fireauth.RpcHandler.ServerError.CAPTCHA_CHECK_FAILED] =
      fireauth.authenum.Error.CAPTCHA_CHECK_FAILED;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_APP_CREDENTIAL] =
      fireauth.authenum.Error.INVALID_APP_CREDENTIAL;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_PHONE_NUMBER] =
      fireauth.authenum.Error.INVALID_PHONE_NUMBER;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_APP_CREDENTIAL] =
      fireauth.authenum.Error.MISSING_APP_CREDENTIAL;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_PHONE_NUMBER] =
      fireauth.authenum.Error.MISSING_PHONE_NUMBER;
  errorMap[fireauth.RpcHandler.ServerError.QUOTA_EXCEEDED] =
      fireauth.authenum.Error.QUOTA_EXCEEDED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.sendVerificationCode(requestBody);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful verifyPhoneNumber RPC call using an SMS code.
 */
function testVerifyPhoneNumber_success_usingCode() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedStsTokenResponse);
  rpcHandler.verifyPhoneNumber(expectedRequest).then(function(response) {
    assertEquals(expectedStsTokenResponse, response);
    asyncTestCase.signal();
  });
}


/**
 * Tests successful verifyPhoneNumber RPC call using an SMS code and passing
 * custom locale.
 */
function testVerifyPhoneNumber_success_customLocale_usingCode() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      {
        'Content-Type': 'application/json',
        'X-Firebase-Locale': 'ru'
      },
      delay,
      expectedStsTokenResponse);
  rpcHandler.updateCustomLocaleHeader('ru');
  rpcHandler.verifyPhoneNumber(expectedRequest).then(function(response) {
    assertEquals(expectedStsTokenResponse, response);
    asyncTestCase.signal();
  });
}


/**
 * Tests successful verifyPhoneNumber RPC call using a temporary proof.
 */
function testVerifyPhoneNumber_success_usingTemporaryProof() {
  var expectedRequest = {
    'phoneNumber': '+16505550101',
    'temporaryProof': 'TEMPORARY_PROOF'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedStsTokenResponse);
  rpcHandler.verifyPhoneNumber(expectedRequest).then(function(response) {
    assertEquals(expectedStsTokenResponse, response);
    asyncTestCase.signal();
  });
}


/**
 * Tests a verifyPhoneNumber RPC call using a temporary proof without a
 * phone number.
 */
function testVerifyPhoneNumber_error_noPhoneNumber() {
  var expectedRequest = {
    'temporaryProof': 'TEMPORARY_PROOF'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumber(expectedRequest).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests a verifyPhoneNumber RPC call using a phone number without a
 * temporary proof.
 */
function testVerifyPhoneNumber_error_noTemporaryProof() {
  var expectedRequest = {
    'phoneNumber': '+16505550101'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumber(expectedRequest).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid request verifyPhoneNumber error for a missing sessionInfo.
 */
function testVerifyPhoneNumber_invalidRequest_missingSessionInfo() {
  var expectedRequest = {
    'code': '123456'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumber(expectedRequest).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.MISSING_SESSION_INFO),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid request verifyPhoneNumber error for a missing code.
 */
function testVerifyPhoneNumber_invalidRequest_missingCode() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumber(expectedRequest).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.MISSING_CODE),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid response verifyPhoneNumber error.
 */
function testVerifyPhoneNumber_unknownServerResponse() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456'
  };
  // No idToken returned.
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyPhoneNumber(expectedRequest).thenCatch(function(error) {
    fireauth.common.testHelper.assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
        error);
    asyncTestCase.signal();
  });
}


/**
 * Tests server side verifyPhoneNumber error.
 */
function testVerifyPhoneNumber_caughtServerError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/verifyPhoneNumber?key=apiKey';
  var requestBody = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456'
  };
  var errorMap = {};
  // All related server errors for verifyPhoneNumber.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CODE] =
      fireauth.authenum.Error.INVALID_CODE;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_SESSION_INFO] =
      fireauth.authenum.Error.INVALID_SESSION_INFO;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_TEMPORARY_PROOF] =
      fireauth.authenum.Error.INVALID_IDP_RESPONSE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CODE] =
      fireauth.authenum.Error.MISSING_CODE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_SESSION_INFO] =
      fireauth.authenum.Error.MISSING_SESSION_INFO;
  errorMap[fireauth.RpcHandler.ServerError.SESSION_EXPIRED] =
      fireauth.authenum.Error.CODE_EXPIRED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.verifyPhoneNumber(requestBody);
  }, errorMap, expectedUrl, requestBody);
}


/**
 * Tests successful verifyPhoneNumberForLinking RPC call using an SMS code.
 */
function testVerifyPhoneNumberForLinking_success_usingCode() {
  // Temporary proof not used for linking as it corresponds to an existing
  // credential that will fail when being linked or updated on another account.
  // No need to test for it.
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456',
    'idToken': 'ID_TOKEN'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedStsTokenResponse);
  rpcHandler.verifyPhoneNumberForLinking(expectedRequest)
      .then(function(response) {
        assertEquals(expectedStsTokenResponse, response);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid request verifyPhoneNumberForLinking error for a missing
 * sessionInfo.
 */
function testVerifyPhoneNumberForLinking_invalidRequest_missingSessionInfo() {
  var expectedRequest = {
    'code': '123456',
    'idToken': 'ID_TOKEN'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumberForLinking(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(
                fireauth.authenum.Error.MISSING_SESSION_INFO),
            error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid request verifyPhoneNumberForLinking error for a missing code.
 */
function testVerifyPhoneNumberForLinking_invalidRequest_missingCode() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'idToken': 'ID_TOKEN'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumberForLinking(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.MISSING_CODE),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid request verifyPhoneNumberForLinking error for a missing ID
 * token.
 */
function testVerifyPhoneNumberForLinking_invalidRequest_missingIdToken() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumberForLinking(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid response verifyPhoneNumberForLinking error.
 */
function testVerifyPhoneNumberForLinking_unknownServerResponse() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456',
    'idToken': 'ID_TOKEN'
  };
  // No idToken returned.
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyPhoneNumberForLinking(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests server side verifyPhoneNumber error.
 */
function testVerifyPhoneNumberForLinking_caughtServerError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/verifyPhoneNumber?key=apiKey';
  var requestBody = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456',
    'idToken': 'ID_TOKEN'
  };
  var errorMap = {};
  // All related server errors for verifyPhoneNumberForLinking.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CODE] =
      fireauth.authenum.Error.INVALID_CODE;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_SESSION_INFO] =
      fireauth.authenum.Error.INVALID_SESSION_INFO;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_TEMPORARY_PROOF] =
      fireauth.authenum.Error.INVALID_IDP_RESPONSE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CODE] =
      fireauth.authenum.Error.MISSING_CODE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_SESSION_INFO] =
      fireauth.authenum.Error.MISSING_SESSION_INFO;
  errorMap[fireauth.RpcHandler.ServerError.SESSION_EXPIRED] =
      fireauth.authenum.Error.CODE_EXPIRED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.verifyPhoneNumberForLinking(requestBody);
  }, errorMap, expectedUrl, requestBody);
}



/**
 * Tests that when verifyPhoneNumber returns a temporaryProof, an appropriate
 * credential object is created and attached to the error.
 */
function testVerifyPhoneNumberForLinking_credentialAlreadyInUseError() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456',
    'idToken': 'ID_TOKEN'
  };
  var expectedResponse = {
    'temporaryProof': 'theTempProof',
    'phoneNumber': '+16505550101'
  };

  var credential = fireauth.AuthProvider.getCredentialFromResponse(
      expectedResponse);
  var expectedError = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        phoneNumber: '+16505550101',
        credential: credential
      });

  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyPhoneNumberForLinking(expectedRequest)
      .then(fail, function(error) {
        assertTrue(error instanceof fireauth.AuthErrorWithCredential);
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful verifyPhoneNumberForExisting RPC call using an SMS code.
 */
function testVerifyPhoneNumberForExisting_success_usingCode() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456',
    'operation': 'REAUTH'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedStsTokenResponse);
  rpcHandler.verifyPhoneNumberForExisting(expectedRequest)
      .then(function(response) {
        assertEquals(expectedStsTokenResponse, response);
        asyncTestCase.signal();
      });
}


/**
 * Tests successful verifyPhoneNumberForExisting RPC call using a temporary
 * proof.
 */
function testVerifyPhoneNumberForExisting_success_usingTemporaryProof() {
  var expectedRequest = {
    'phoneNumber': '+16505550101',
    'temporaryProof': 'TEMPORARY_PROOF',
    'operation': 'REAUTH'
  };
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedStsTokenResponse);
  rpcHandler.verifyPhoneNumberForExisting(expectedRequest)
      .then(function(response) {
        assertEquals(expectedStsTokenResponse, response);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid request verifyPhoneNumberForExisting error for a missing
 * sessionInfo.
 */
function testVerifyPhoneNumberForExisting_invalidRequest_missingSessionInfo() {
  var expectedRequest = {
    'code': '123456',
    'operation': 'REAUTH'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumberForExisting(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(
                fireauth.authenum.Error.MISSING_SESSION_INFO),
            error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid request verifyPhoneNumberForExisting error for a missing code.
 */
function testVerifyPhoneNumberForExisting_invalidRequest_missingCode() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'operation': 'REAUTH'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumberForExisting(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.MISSING_CODE),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid request verifyPhoneNumberForExisting error for a missing
 * phoneNumber.
 */
function testVerifyPhoneNumberForExisting_invalidRequest_missingPhoneNumber() {
  var expectedRequest = {
    'temporaryProof': 'TEMPORARY_PROOF',
    'operation': 'REAUTH'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumberForExisting(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
    asyncTestCase.signal();
  });
}


/**
 * Tests invalid request verifyPhoneNumberForExisting error for a missing
 * temporary proof.
 */
function testVerifyPhoneNumberForExisting_invalidRequest_missingTempProof() {
  var expectedRequest = {
    'phoneNumber': '+16505550101',
    'operation': 'REAUTH'
  };
  asyncTestCase.waitForSignals(1);
  rpcHandler.verifyPhoneNumberForExisting(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests invalid response verifyPhoneNumberForExisting error.
 */
function testVerifyPhoneNumberForExisting_unknownServerResponse() {
  var expectedRequest = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456',
    'operation': 'REAUTH'
  };
  // No idToken returned.
  var expectedResponse = {};
  asyncTestCase.waitForSignals(1);
  assertSendXhrAndRunCallback(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhon' +
      'eNumber?key=apiKey',
      'POST',
      goog.json.serialize(expectedRequest),
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_,
      delay,
      expectedResponse);
  rpcHandler.verifyPhoneNumberForExisting(expectedRequest)
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
            error);
        asyncTestCase.signal();
      });
}


/**
 * Tests server side verifyPhoneNumberForExisting error.
 */
function testVerifyPhoneNumberForExisting_caughtServerError() {
  var expectedUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyin' +
      'gparty/verifyPhoneNumber?key=apiKey';
  var requestBody = {
    'sessionInfo': 'SESSION_INFO',
    'code': '123456',
    'operation': 'REAUTH'
  };
  var errorMap = {};
  // All related server errors for verifyPhoneNumberForExisting.

  // This should be overridden from the default error mapping.
  errorMap[fireauth.RpcHandler.ServerError.USER_NOT_FOUND] =
      fireauth.authenum.Error.USER_DELETED;

  errorMap[fireauth.RpcHandler.ServerError.INVALID_CODE] =
      fireauth.authenum.Error.INVALID_CODE;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_SESSION_INFO] =
      fireauth.authenum.Error.INVALID_SESSION_INFO;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_TEMPORARY_PROOF] =
      fireauth.authenum.Error.INVALID_IDP_RESPONSE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CODE] =
      fireauth.authenum.Error.MISSING_CODE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_SESSION_INFO] =
      fireauth.authenum.Error.MISSING_SESSION_INFO;
  errorMap[fireauth.RpcHandler.ServerError.SESSION_EXPIRED] =
      fireauth.authenum.Error.CODE_EXPIRED;

  assertServerErrorsAreHandled(function() {
    return rpcHandler.verifyPhoneNumberForExisting(requestBody);
  }, errorMap, expectedUrl, requestBody);
}
