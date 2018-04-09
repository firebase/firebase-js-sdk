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
 * @fileoverview Tests for dataiframe.js
 */

goog.provide('fireauth.iframeclient.IframeWrapperTest');

goog.require('fireauth.iframeclient.IframeWrapper');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.html.TrustedResourceUrl');
goog.require('goog.net.jsloader');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');

goog.setTestOnly('fireauth.iframeclient.IframeWrapperTest');


var ignoreArgument;
var mockControl;
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var clock;
var gapi;
var stubs = new goog.testing.PropertyReplacer();

function setUp() {
  clock = new goog.testing.MockClock(true);
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl = new goog.testing.MockControl();
  mockControl.$resetAll();
}


function tearDown() {
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
  // Reset GApi for each test.
  gapi = null;
  goog.dispose(clock);
  stubs.reset();
  // Reset cached GApi loader.
  fireauth.iframeclient.IframeWrapper.resetCachedGApiLoader();
}


function testIframeWrapper() {
  var expectedHandler = function(resp) {};
  var path = 'https://data_iframe_url';
  var iframesGetContext = mockControl.createFunctionMock('getContext');
  // Simulate gapi.iframes loaded.
  gapi = window['gapi'] || {};
  gapi.iframes = {
    'Iframe': {},
    'getContext': iframesGetContext,
    'CROSS_ORIGIN_IFRAMES_FILTER': 'CROSS_ORIGIN_IFRAMES_FILTER'
  };
  var openIframe = mockControl.createFunctionMock('openIframe');
  var send = mockControl.createFunctionMock('send');
  var register = mockControl.createFunctionMock('register');
  var unregister = mockControl.createFunctionMock('unregister');
  var restyle = mockControl.createFunctionMock('restyle');
  iframesGetContext().$returns({
    'open': openIframe
  });
  openIframe(ignoreArgument, ignoreArgument).$does(function(params, onOpen) {
    assertEquals(params['url'], 'https://data_iframe_url');
    assertObjectEquals(params['where'], document.body);
    assertObjectEquals(params['attributes']['style'], {
      'position': 'absolute',
      'top': '-100px',
      'width': '1px',
      'height': '1px'
    });
    assertTrue(params['dontclear']);
    onOpen({
      'send': send,
      'register': register,
      'unregister': unregister,
      'restyle': restyle,
      'ping': function(callback, opt_data) {
        // Successfully embedded.
        callback();
        return new goog.Promise(function(resolve, reject) {});
      }
    });
  }).$once();
  restyle({'setHideOnLeave': false}).$once();

  send(
      'messageType',
      {'type': 'messageType', 'field1': 'value1', 'field2': 'value2'},
      ignoreArgument, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)
      .$does(function(type, message, resolve) {
        // Iframe should be ready.
        assertTrue(iframeReady);
        resolve({'status': 'OK'});
      })
      .$once();

  register(
      'eventName', ignoreArgument, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)
      .$does(function(eventName, handler) {
        // Iframe should be ready.
        assertTrue(iframeReady);
        assertEquals(expectedHandler, handler);
      })
      .$once();

  unregister('eventName', ignoreArgument)
      .$does(function(eventName, handler) {
        // Iframe should be ready.
        assertTrue(iframeReady);
        assertEquals(expectedHandler, handler);
      })
      .$once();

  mockControl.$replayAll();
  asyncTestCase.waitForSignals(1);

  // Test initialization of data iframe.
  var iframeWrapper = new fireauth.iframeclient.IframeWrapper(path);
  // Iframe wrapper should become ready.
  iframeWrapper.onReady().then(function() { iframeReady = true; });
  assertEquals(path, iframeWrapper.getPath_());
  // sendMessage.
  iframeWrapper.sendMessage({
    'type': 'messageType',
    'field1': 'value1',
    'field2': 'value2'
  }).then(function(response) {
    assertObjectEquals(
        {'status': 'OK'},
        response);
    asyncTestCase.signal();
  });
  // Flag to track iframe readiness.
  var iframeReady = false;
  // registerEvent.
  iframeWrapper.registerEvent('eventName', expectedHandler);
  // unregisterEvent.
  iframeWrapper.unregisterEvent('eventName', expectedHandler);
}


function testIframeWrapper_failedToOpen() {
  // Test when iframe fails to open.
  var path = 'https://data_iframe_url';
  var iframesGetContext = mockControl.createFunctionMock('getContext');
  // Simulate gapi.iframes loaded.
  gapi = window['gapi'] || {};
  gapi.iframes = {
    'Iframe': {},
    'getContext': iframesGetContext,
    'CROSS_ORIGIN_IFRAMES_FILTER': 'CROSS_ORIGIN_IFRAMES_FILTER'
  };
  var openIframe = mockControl.createFunctionMock('openIframe');
  var send = mockControl.createFunctionMock('send');
  var register = mockControl.createFunctionMock('register');
  var unregister = mockControl.createFunctionMock('unregister');
  var restyle = mockControl.createFunctionMock('restyle');
  iframesGetContext().$returns({'open': openIframe});
  openIframe(ignoreArgument, ignoreArgument)
      .$does(function(params, onOpen) {
        assertEquals(params['url'], 'https://data_iframe_url');
        assertObjectEquals(params['where'], document.body);
        assertObjectEquals(params['attributes']['style'], {
          'position': 'absolute',
          'top': '-100px',
          'width': '1px',
          'height': '1px'
        });
        assertTrue(params['dontclear']);
        onOpen({
          'send': send,
          'register': register,
          'unregister': unregister,
          'restyle': restyle,
          // Unresponsive ping.
          'ping': function() {
            return new goog.Promise(function(resolve, reject) {});
          }
        });
      })
      .$once();
  restyle({'setHideOnLeave': false}).$once();

  mockControl.$replayAll();

  // Test initialization of data iframe.
  asyncTestCase.waitForSignals(2);
  var iframeWrapper = new fireauth.iframeclient.IframeWrapper(path);
  // Iframe wrapper should not become ready and timeout.
  iframeWrapper.onReady().thenCatch(function(error) {
    assertEquals('Network Error', error.message);
    asyncTestCase.signal();
  });
  iframeWrapper
      .sendMessage(
          {'type': 'messageType', 'field1': 'value1', 'field2': 'value2'})
      .thenCatch(function(error) {
        assertEquals('Network Error', error.message);
        asyncTestCase.signal();
      });
  // Simulate iframe ping is not responsive.
  clock.tick(10000);
}


function testIframeWrapper_offline() {
  // Test when iframe fails to open due to app being offline.
  // Simulate app offline.
  stubs.reset();
  stubs.replace(
      fireauth.util,
      'isOnline',
      function() {return false;});
  var path = 'https://data_iframe_url';

  // Test initialization of data iframe.
  asyncTestCase.waitForSignals(2);
  var iframeWrapper = new fireauth.iframeclient.IframeWrapper(path);
  // Iframe wrapper should not become ready and timeout as the app is offline.
  // Mockclock is already set in setUp and does not tick. This means the call
  // is getting rejected immediately and not listening to any timer.
  iframeWrapper.onReady().thenCatch(function(error) {
    assertEquals('Network Error', error.message);
    asyncTestCase.signal();
  });
  // Simulate short timeout when navigator.onLine is false.
  clock.tick(5000);
  iframeWrapper
      .sendMessage(
          {'type': 'messageType', 'field1': 'value1', 'field2': 'value2'})
      .thenCatch(function(error) {
        assertEquals('Network Error', error.message);
        asyncTestCase.signal();
      });
}


/**
 * Simulate successful gapi.iframes being loaded.
 * @param {function()} iframesGetContext The iframes getContext mock function.
 */
function simulateSuccessfulGapiIframesLoading(iframesGetContext) {
  var gapiLoadCounter = 0;
  var jsloaderCounter = 0;
  var setGapiLoader = function() {
    gapi.load = function(features, options) {
      // Run asynchronously to give a chance for multiple parallel calls to be
      // caught.
      goog.Promise.resolve().then(function() {
        // gapi.load should never try to load successfully more than once and
        // the successful result should be cached and returned on successive
        // calls.
        gapiLoadCounter++;
        assertEquals(1, gapiLoadCounter);
        // gapi.load should load gapi.iframes.
        var callback = options['callback'];
        gapi.iframes = {
          'Iframe': {},
          'getContext': iframesGetContext,
          'CROSS_ORIGIN_IFRAMES_FILTER': 'CROSS_ORIGIN_IFRAMES_FILTER'
        };
        callback();
      });
    };
  };
  if (!gapi) {
    // GApi not available, it will try to load api.js and then gapi.iframes.
    stubs.replace(goog.net.jsloader, 'safeLoad', function(url) {
      // Run asynchronously to give a chance for multiple parallel calls to
      // be caught.
      return goog.Promise.resolve().then(function() {
        // jsloader should never try to load successfully more than once and
        // the successful result should be cached and returned on successive
        // calls.
        jsloaderCounter++;
        assertEquals(1, jsloaderCounter);
        // After successful loading of API.
        gapi = {};
        // Set gapi.load.
        setGapiLoader();
        // Parse URL and get onload cb name.
        var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
        var cbName = uri.getParameterValue('onload');
        // Run onload callback.
        goog.global[cbName]();
      });
    });
  } else if (!gapi.iframes) {
    // gapi.load available, it will try to load gapi.iframes.
    setGapiLoader();
  }
}


function testIframeWrapper_gapiNotLoadedError() {
  // Test when GApi fails to load.
  gapi = null;
  stubs.replace(goog.net.jsloader, 'safeLoad', function(url) {
    return goog.Promise.reject();
  });
  var path = 'https://data_iframe_url';
  var iframesGetContext = mockControl.createFunctionMock('getContext');
  var openIframe = mockControl.createFunctionMock('openIframe');
  var send = mockControl.createFunctionMock('send');
  var register = mockControl.createFunctionMock('register');
  var unregister = mockControl.createFunctionMock('unregister');
  var restyle = mockControl.createFunctionMock('restyle');
  iframesGetContext().$returns({'open': openIframe});
  openIframe(ignoreArgument, ignoreArgument)
      .$does(function(params, onOpen) {
        assertEquals(params['url'], 'https://data_iframe_url');
        assertObjectEquals(params['where'], document.body);
        assertObjectEquals(params['attributes']['style'], {
          'position': 'absolute',
          'top': '-100px',
          'width': '1px',
          'height': '1px'
        });
        assertTrue(params['dontclear']);
        onOpen({
          'send': send,
          'register': register,
          'unregister': unregister,
          'restyle': restyle,
          'ping': function(callback) {
            callback();
            return new goog.Promise(function(resolve, reject) {});
          }
        });
      })
      .$once();
  restyle({'setHideOnLeave': false}).$once();

  mockControl.$replayAll();

  // Test initialization of data iframe.
  asyncTestCase.waitForSignals(2);
  var iframeWrapper = new fireauth.iframeclient.IframeWrapper(path);
  // Iframe wrapper should not become ready as api.js fails to load.
  iframeWrapper.onReady().thenCatch(function(error) {
    assertEquals('Network Error', error.message);
    asyncTestCase.signal();
  });
  iframeWrapper
      .sendMessage(
          {'type': 'messageType', 'field1': 'value1', 'field2': 'value2'})
      .thenCatch(function(error) {
        assertEquals('Network Error', error.message);
        // Try again and make sure failing result was not cached.
        // This time gapi.iframes will load correctly.
        simulateSuccessfulGapiIframesLoading(iframesGetContext);
        var iframeWrapper2 = new fireauth.iframeclient.IframeWrapper(path);
        // This time it should succeed.
        iframeWrapper2.onReady().then(function() { asyncTestCase.signal(); });
      });
}


function testIframeWrapper_gapiDotLoadError() {
  var path = 'https://data_iframe_url';
  var resetUnloadedGapiModules =
      mockControl.createFunctionMock('resetUnloadedGapiModules');
  gapi = {};
  // Simulate error while loading gapi.iframes.
  gapi.load = function(features, options) {
    assertEquals('gapi.iframes', features);
    options['ontimeout']();
  };
  // Record fireauth.util.resetUnloadedGapiModules.
  stubs.replace(
      fireauth.util, 'resetUnloadedGapiModules', resetUnloadedGapiModules);
  // Called once to reset any unloaded module the developer may have requested.
  resetUnloadedGapiModules();
  // Called on first gapi.iframe load timeout.
  resetUnloadedGapiModules();
  // Called before second gapi.iframe load attempt.
  resetUnloadedGapiModules();
  var iframesGetContext = mockControl.createFunctionMock('getContext');
  var openIframe = mockControl.createFunctionMock('openIframe');
  var send = mockControl.createFunctionMock('send');
  var register = mockControl.createFunctionMock('register');
  var unregister = mockControl.createFunctionMock('unregister');
  var restyle = mockControl.createFunctionMock('restyle');
  iframesGetContext().$returns({'open': openIframe});
  openIframe(ignoreArgument, ignoreArgument)
      .$does(function(params, onOpen) {
        assertEquals(params['url'], 'https://data_iframe_url');
        assertObjectEquals(params['where'], document.body);
        assertObjectEquals(params['attributes']['style'], {
          'position': 'absolute',
          'top': '-100px',
          'width': '1px',
          'height': '1px'
        });
        assertTrue(params['dontclear']);
        onOpen({
          'send': send,
          'register': register,
          'unregister': unregister,
          'restyle': restyle,
          'ping': function(callback) {
            callback();
            return new goog.Promise(function(resolve, reject) {});
          }
        });
      })
      .$once();
  restyle({'setHideOnLeave': false}).$once();
  mockControl.$replayAll();

  // Test initialization of data iframe.
  asyncTestCase.waitForSignals(2);
  var iframeWrapper = new fireauth.iframeclient.IframeWrapper(path);
  // Iframe wrapper should should fail due to error in loading gapi.iframes.
  iframeWrapper.onReady().thenCatch(function(error) {
    assertEquals('Network Error', error.message);
    asyncTestCase.signal();
  });
  iframeWrapper
      .sendMessage(
          {'type': 'messageType', 'field1': 'value1', 'field2': 'value2'})
      .thenCatch(function(error) {
        assertEquals('Network Error', error.message);
        // Try again and make sure failing result was not cached.
        // Simulate successful loading of gapi.iframes this time.
        simulateSuccessfulGapiIframesLoading(iframesGetContext);
        var iframeWrapper2 = new fireauth.iframeclient.IframeWrapper(path);
        // This should succeed.
        iframeWrapper2.onReady().then(function() { asyncTestCase.signal(); });
      });
}


function testIframeWrapper_multipleInstances() {
  // Tests when multiple iframe wrapper instance initialized that only one
  // shared gapi.load attempt is called underneath.
  var path = 'https://data_iframe_url';
  gapi = {};
  var iframesGetContext = mockControl.createFunctionMock('getContext');
  var openIframe = mockControl.createFunctionMock('openIframe');
  var send = mockControl.createFunctionMock('send');
  var register = mockControl.createFunctionMock('register');
  var unregister = mockControl.createFunctionMock('unregister');
  var restyle = mockControl.createFunctionMock('restyle');
  // Requests should be called twice.
  for (var i = 0; i < 2; i++) {
    iframesGetContext().$returns({'open': openIframe});
    openIframe(ignoreArgument, ignoreArgument)
        .$does(function(params, onOpen) {
          assertEquals(params['url'], 'https://data_iframe_url');
          assertObjectEquals(params['where'], document.body);
          assertObjectEquals(params['attributes']['style'], {
            'position': 'absolute',
            'top': '-100px',
            'width': '1px',
            'height': '1px'
          });
          assertTrue(params['dontclear']);
          onOpen({
            'send': send,
            'register': register,
            'unregister': unregister,
            'restyle': restyle,
            'ping': function(callback) {
              callback();
              return new goog.Promise(function(resolve, reject) {});
            }
          });
        })
        .$once();
    restyle({'setHideOnLeave': false}).$once();
  }
  mockControl.$replayAll();

  // Initialize 2 iframes. Both should resolve.
  asyncTestCase.waitForSignals(2);
  // Underneath this will check that gapi.load/jsloader aren't called more than
  // once.
  simulateSuccessfulGapiIframesLoading(iframesGetContext);
  var iframeWrapper = new fireauth.iframeclient.IframeWrapper(path);
  iframeWrapper.onReady().then(function() {
    asyncTestCase.signal();
  });
  var iframeWrapper2 = new fireauth.iframeclient.IframeWrapper(path);
  iframeWrapper2.onReady().then(function() {
    asyncTestCase.signal();
  });
}
