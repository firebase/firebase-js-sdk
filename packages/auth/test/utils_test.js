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
 * @fileoverview Tests for utils.js
 */

goog.provide('fireauth.utilTest');

goog.require('fireauth.util');
goog.require('goog.Timer');
goog.require('goog.dom');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.TestCase');
goog.require('goog.testing.jsunit');
goog.require('goog.userAgent');

goog.setTestOnly('fireauth.utilTest');


var mockControl;
var stubs = new goog.testing.PropertyReplacer();

var operaUA = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHT' +
    'ML, like Gecko) Chrome/49.0.2623.110 Safari/537.36 OPR/36.0.2130.74';
var ieUA = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0;' +
      ' SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; ' +
      'Media Center PC 6.0; .NET4.0C)';
var edgeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240';
var firefoxUA = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:46.0) Gecko/201' +
      '00101 Firefox/46.0';
var silkUA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, li' +
      'ke Gecko) Silk/44.1.54 like Chrome/44.0.2403.63 Safari/537.36';
var safariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11-4) AppleWebKit' +
      '/601.5.17 (KHTML, like Gecko) Version/9.1 Safari/601.5.17';
var chromeUA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, ' +
      'like Gecko) Chrome/50.0.2661.94 Safari/537.36';
var iOS8iPhoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) A' +
    'ppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12A366 Safar' +
    'i/600.1.4';
var iOS7iPodUA = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 7_0_3 like Mac OS ' +
    'X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11B511 ' +
    'Safari/9537.53';
var iOS7iPadUA = 'Mozilla/5.0 (iPad; CPU OS 7_0 like Mac OS X) AppleWebKit/' +
    '537.51.1 (KHTML, like Gecko) CriOS/30.0.1599.12 Mobile/11A465 Safari/8' +
    '536.25 (3B92C18B-D9DE-4CB7-A02A-22FD2AF17C8F)';
var iOS7iPhoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0_4 like Mac OS X)' +
    'AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11B554a Sa' +
    'fari/9537.53';
var androidUA = 'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Buil' +
    'd/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Sa' +
    'fari/534.30';
var blackberryUA = 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleW' +
    'ebKit/534.11+ (KHTML, like Gecko) Version/7.1.0.346 Mobile Safari/534.' +
    '11+';
var webOSUA = 'Mozilla/5.0 (webOS/1.3; U; en-US) AppleWebKit/525.27.1 (KHTM' +
    'L, like Gecko) Version/1.0 Safari/525.27.1 Desktop/1.0';
var windowsPhoneUA = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0' +
    ';Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920)';
var chriosUA = 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; ' +
    'en) AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/19.0.1084.60 Mobile' +
    '/9B206 Safari/7534.48.3';
var iOS9iPhoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_2 like Mac OS X) A' +
    'ppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13C75 Safar' +
    'i/601.1';
// This user agent is manually constructed and not copied from a production
// user agent.
var chrome55iOS10UA = 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 10_2_0 like Ma' +
    'c OS X; en) AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/55.0.2883.7' +
    '9 Mobile/9B206 Safari/7534.48.3';


var jsonString = '{"a":2,"b":["Hello","World"],"c":{"someKeyName":true,' +
    '"someOtherKeyName":false}}';
var parsedJSON = {
  'a': 2,
  'b': ['Hello', 'World'],
  'c': {
    'someKeyName': true,
    'someOtherKeyName': false
  }
};
var lastMetaTag;


function setUp() {
  mockControl = new goog.testing.MockControl();
}


function tearDown() {
  mockControl.$tearDown();
  angular = undefined;
  stubs.reset();
  if (lastMetaTag) {
    goog.dom.removeNode(lastMetaTag);
    lastMetaTag = null;
  }
}


if (goog.global['window'] &&
    typeof goog.global['window'].CustomEvent !== 'function') {
  var doc = goog.global.document;
  /**
   * CustomEvent polyfill for IE 9, 10 and 11.
   * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
   * @param {string} event The event type.
   * @param {Object=} opt_params The optional event parameters.
   * @return {!Event} The generated custom event.
   */
  var CustomEvent = function(event, opt_params) {
    var params = opt_params || {
      bubbles: false, cancelable: false, detail: undefined
    };
    var evt = doc.createEvent('CustomEvent');
    evt.initCustomEvent(
        event, params.bubbles, params.cancelable, params.detail);
    return evt;
  };
  CustomEvent.prototype = goog.global['window'].Event.prototype;
  goog.global['window'].CustomEvent = CustomEvent;
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


function testIsIe11() {
  if (goog.userAgent.IE &&
      !!goog.userAgent.DOCUMENT_MODE &&
      goog.userAgent.DOCUMENT_MODE == 11) {
    assertTrue(fireauth.util.isIe11());
  } else {
    assertFalse(fireauth.util.isIe11());
  }
}


function testIsIe10() {
  if (goog.userAgent.IE &&
      !!goog.userAgent.DOCUMENT_MODE &&
      goog.userAgent.DOCUMENT_MODE == 10) {
    assertTrue(fireauth.util.isIe10());
  } else {
    assertFalse(fireauth.util.isIe10());
  }
}


function testIsEdge() {
  var EDGE_UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240';
  var CHROME_DESKTOP_UA =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/27.0.1453.15 Safari/537.36';
  assertTrue(fireauth.util.isEdge(EDGE_UA));
  assertFalse(fireauth.util.isEdge(CHROME_DESKTOP_UA));
}


function testGetCurrentUrl() {
  assertEquals(window.location.href, fireauth.util.getCurrentUrl());
}


function testSanitizeRequestUri() {
  // Simulate AngularJS defined.
  angular = {};
  assertEquals(
      'http://localhost/path/#abc',
      fireauth.util.sanitizeRequestUri(
          'http://localhost/path/#abc'));
  assertEquals(
      'http://localhost/path/?query1=value1&query2=value2#abc',
      fireauth.util.sanitizeRequestUri(
          'http://localhost/path/?query1=value1&query2=value2#abc'));
  // Modified url with #/, should be replace with #.
  assertEquals(
      'http://localhost/path#abc',
      fireauth.util.sanitizeRequestUri(
          'http://localhost/path#/abc'));
  // Modified url with #!/, should be replace with #.
  assertEquals(
      'http://localhost/path#abc',
      fireauth.util.sanitizeRequestUri(
          'http://localhost/path#!/abc'));
}


function testGoTo() {
  var fakeWindow = {
    location: {
      href: ''
    }
  };
  fireauth.util.goTo('http://www.google.com', fakeWindow);
  assertEquals('http://www.google.com', fakeWindow.location.href);
  fireauth.util.goTo('http://www.google.com/some?complicated=path', fakeWindow);
  assertEquals('http://www.google.com/some?complicated=path',
      fakeWindow.location.href);
}


function testGetKeyDiff() {
  var a = {'key1': 'a', 'key2': 'b'};
  var b = {'key2': 'b', 'key3': 'c'};
  assertArrayEquals(
      ['key1', 'key3'],
      fireauth.util.getKeyDiff(a, b));
  var c = {'key1': {'c': 3, 'd': 4}, 'key2': [5, 6], 'key3': {'a': 1, 'b': 2}};
  var d = {'key1': {'c': 3, 'd': 4}, 'key2': [5, 6], 'key3': {'a': 1, 'b': 3}};
  assertArrayEquals(
      ['key3'],
      fireauth.util.getKeyDiff(c, d));
  var e = {'key1': {'c': 3, 'd': 4}, 'key2': [5, 6], 'key3': {'a': 1, 'b': 2}};
  var f = {'key1': {'c': 3, 'd': 4}, 'key2': [5, 7], 'key3': {'a': 1, 'b': 3}};
  assertArrayEquals(
      ['key2', 'key3'],
      fireauth.util.getKeyDiff(e, f));
  var g = {'key1': null, 'key2': null};
  var h = {'key1': null, 'key2': null};
  assertArrayEquals([], fireauth.util.getKeyDiff(g, h));
  var i = {'key1': null, 'key2': null, 'key3': {}};
  var j = {'key1': null, 'key2': null, 'key3': null};
  assertArrayEquals(['key3'], fireauth.util.getKeyDiff(i, j));
}


function testOnPopupClose() {
  return installAndRunTest('onPopupClose', function() {
    var win = {};

    // Simulate close after 50ms.
    goog.Timer.promise(10).then(function() {
      assertFalse(!!win.closed);
      win.closed = true;
    });
    assertFalse(!!win.closed);
    // Check every 10ms that popup is closed.
    return fireauth.util.onPopupClose(win, 2).then(function() {
      assertTrue(win.closed);
    });
  });
}


function testIsAuthorizedDomain() {
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          [],
          'chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['chrome-extension://abcdefghijklmnopqrstuvwxyz123456'],
          'http://aihpiglmnhnhijdnjghpfnlledckkhja/abc?a=1#b=2'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['chrome-extension://abcdefghijklmnopqrstuvwxyz123456'],
          'file://aihpiglmnhnhijdnjghpfnlledckkhja/abc?a=1#b=2'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['chrome-extenion://abcdefghijklmnopqrstuvwxyz123456',
           'chrome-extension://abcdefghijklmnopqrstuvwxyz123456_suffix',
           'chrome-extension://prefix_abcdefghijklmnopqrstuvwxyz123456',
           'chrome-extension://prefix_abcdefghijklmnopqrstuvwxyz123456_suffix',
           'abcdefghijklmnopqrstuvwxyz123456'],
          'chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html'));
  assertTrue(
      fireauth.util.isAuthorizedDomain(
          ['chrome-extension://abcdefghijklmnopqrstuvwxyz123456'],
          'chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['abcdefghijklmnopqrstuvwxyz123456'],
          'chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html'));
  assertFalse(fireauth.util.isAuthorizedDomain([], 'http://www.domain.com'));
  assertTrue(
      fireauth.util.isAuthorizedDomain(
          ['other.com', 'domain.com'], 'http://www.domain.com/abc?a=1#b=2'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['other.com', 'example.com'], 'http://www.domain.com/abc?a=1#b=2'));
  assertTrue(
      fireauth.util.isAuthorizedDomain(
          ['domain.com', 'domain.com.lb'],
          'http://www.domain.com.lb:8080/abc?a=1#b=2'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['domain.com', 'domain.com.mx'],
          'http://www.domain.com.lb/abc?a=1#b=2'));
  // Check for suffix matching.
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['site.example.com'],
          'http://prefix-site.example.com'));
  assertTrue(
      fireauth.util.isAuthorizedDomain(
          ['site.example.com'], 'https://www.site.example.com'));
  // Check for IP addresses.
  assertTrue(
      fireauth.util.isAuthorizedDomain(
          ['127.0.0.1'], 'http://127.0.0.1:8080/?redirect=132.0.0.1'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['132.0.0.1'], 'http://127.0.0.1:8080/?redirect=132.0.0.1'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['127.0.0.1'], 'http://127.0.0.1.appdomain.com/?redirect=127.0.0.1'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['127.0.0.1'], 'http://a127.0.0.1/?redirect=127.0.0.1'));
  // Other schemes.
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['domain.com'], 'file://www.domain.com'));
  assertFalse(
      fireauth.util.isAuthorizedDomain(
          ['domain.com'], 'other://www.domain.com'));
}


function testMatchDomain_chromeExtensionPattern() {
  assertFalse(fireauth.util.matchDomain(
      'chrome-extension://abcdefghijklmnopqrstuvwxyz123456',
      'abcdefghijklmnopqrstuvwxyz123456',
      'http'));
  assertFalse(fireauth.util.matchDomain(
      'chrome-extension://abcdefghijklmnopqrstuvwxyz123456',
      'abcdefghijklmnopqrstuvwxyz123456',
      'file'));
  assertFalse(fireauth.util.matchDomain(
      'chrome-extension://prefix-abcdefghijklmnopqrstuvwxyz123456',
      'abcdefghijklmnopqrstuvwxyz123456',
      'chrome-extension'));
  assertFalse(fireauth.util.matchDomain(
      'chrome-extension://abcdefghijklmnopqrstuvwxyz123456-suffix',
      'abcdefghijklmnopqrstuvwxyz123456',
      'chrome-extension'));
  assertFalse(fireauth.util.matchDomain(
      'chrome-extension://prefix-abcdefghijklmnopqrstuvwxyz123456-suffix',
      'abcdefghijklmnopqrstuvwxyz123456',
      'chrome-extension'));
  assertFalse(fireauth.util.matchDomain(
      'chrome-extension://abcdefghijklmnopqrstuvwxyz123456',
      'www.abcdefghijklmnopqrstuvwxyz123456',
      'chrome-extension'));
  assertFalse(fireauth.util.matchDomain(
      'chrome-extension://abcdefghijklmnopqrstuvwxyz123456',
      'abcdefghijklmnopqrstuvwxyz123456.com',
      'chrome-extension'));
  assertTrue(fireauth.util.matchDomain(
      'chrome-extension://abcdefghijklmnopqrstuvwxyz123456',
      'abcdefghijklmnopqrstuvwxyz123456',
      'chrome-extension'));
  assertTrue(fireauth.util.matchDomain(
      'chrome-extension://abcdefghijklmnopqrstuvwxyz123456/popup.html',
      'abcdefghijklmnopqrstuvwxyz123456',
      'chrome-extension'));
}


function testMatchDomain_unsupportedScheme() {
  assertFalse(fireauth.util.matchDomain('127.0.0.1', '127.0.0.1', 'file'));
  assertFalse(fireauth.util.matchDomain('domain.com', 'domain.com', 'file'));
}


function testMatchDomain_ipAddressPattern() {
  assertTrue(fireauth.util.matchDomain('127.0.0.1', '127.0.0.1', 'http'));
  assertTrue(fireauth.util.matchDomain('127.0.0.1', '127.0.0.1', 'https'));
  assertFalse(fireauth.util.matchDomain('127.0.0.1', 'a127.0.0.1', 'http'));
  assertFalse(fireauth.util.matchDomain('127.0.0.1', 'abc.domain.com', 'http'));
  assertFalse(fireauth.util.matchDomain(
      '127.0.0.1', '127.0.0.1', 'chrome-extension'));
}


function testMatchDomain_ipAddressDomain() {
  assertFalse(fireauth.util.matchDomain('domain.com', '127.0.0.1', 'http'));
  assertFalse(fireauth.util.matchDomain('a127.0.0.1', '127.0.0.1', 'http'));
}


function testMatchDomain_caseInsensitiveMatch() {
  assertTrue(fireauth.util.matchDomain('localhost', 'localhost', 'http'));
  assertTrue(fireauth.util.matchDomain('domain.com', 'DOMAIN.COM', 'http'));
  assertTrue(fireauth.util.matchDomain(
      'doMAin.com', 'abC.domain.COM', 'http'));
  assertTrue(fireauth.util.matchDomain('localhost', 'localhost', 'https'));
  assertTrue(fireauth.util.matchDomain('domain.com', 'DOMAIN.COM', 'https'));
  assertTrue(fireauth.util.matchDomain(
      'doMAin.com', 'abC.domain.COM', 'https'));
  assertFalse(fireauth.util.matchDomain(
      'doMAin.com', 'abC.domain.COM', 'chrome-extension'));
}


function testMatchDomain_domainMismatch() {
  assertFalse(fireauth.util.matchDomain('domain.com', 'domain.com.lb', 'http'));
  assertFalse(fireauth.util.matchDomain(
      'domain.com', 'abc.domain.com.lb', 'http'));
  assertFalse(fireauth.util.matchDomain(
      'domain2.com', 'abc.domain.com', 'http'));
}


function testMatchDomain_subdomainComparison() {
  assertTrue(fireauth.util.matchDomain('domain.com', 'abc.domain.com', 'http'));
  assertTrue(fireauth.util.matchDomain(
      'domain.com', 'abc.domain.com', 'https'));
  assertFalse(fireauth.util.matchDomain(
      'other.domain.com', 'abc.domain.com', 'http'));
  assertTrue(fireauth.util.matchDomain(
      'domain.com', 'abc.ef.gh.domain.com', 'http'));
  assertTrue(fireauth.util.matchDomain(
      'domain.com', 'abc.ef.gh.domain.com', 'https'));
  assertFalse(fireauth.util.matchDomain(
      'domain.com', 'abc.ef.gh.domain.com', 'chrome-extension'));
}


function testMatchDomain_dotsInPatternEscaped() {
  // Dots should be escaped.
  assertFalse(fireauth.util.matchDomain(
      'domain.com', 'abc.domainacom', 'http'));
  assertFalse(fireauth.util.matchDomain(
      'abc.def.com', 'abczdefzcom', 'http'));
}


function testOnDomReady() {
  return installAndRunTest('onDomReady', function() {
    // Should resolve immediately.
    return fireauth.util.onDomReady();
  });
}


function testCreateStorageKey() {
  assertEquals(
      'apiKey:appName',
      fireauth.util.createStorageKey('apiKey', 'appName'));
}


function testGetEnvironment_browser() {
  assertEquals(fireauth.util.Env.BROWSER,
      fireauth.util.getEnvironment('Gecko'));
}


function testGetEnvironment_reactNative() {
  stubs.set(firebase.INTERNAL, 'reactNative', {});
  assertEquals(fireauth.util.Env.REACT_NATIVE,
      fireauth.util.getEnvironment());
}


function testGetEnvironment_node() {
  // Simulate Node.js environment.
  stubs.set(firebase.INTERNAL, 'node', {});
  assertEquals(fireauth.util.Env.NODE, fireauth.util.getEnvironment());
}


function testGetEnvironment_worker() {
  // Simulate worker environment.
  stubs.replace(
      fireauth.util,
      'isWorker',
      function() {
        return true;
      });
  assertEquals(fireauth.util.Env.WORKER, fireauth.util.getEnvironment());
}


function testIsWorker() {
  assertFalse(fireauth.util.isWorker({'window': {}}));
  assertTrue(fireauth.util.isWorker({
    'importScripts': function() {}
  }));
}


function testIsFetchSupported() {
  // All fetch related APIs supported.
  assertTrue(fireauth.util.isFetchSupported({
    'fetch': function() {},
    'Request': function() {},
    'Headers': function() {}
  }));
  // Headers missing.
  assertFalse(fireauth.util.isFetchSupported({
    'fetch': function() {},
    'Request': function() {},
  }));
  // Request missing.
  assertFalse(fireauth.util.isFetchSupported({
    'fetch': function() {},
    'Headers': function() {}
  }));
  // fetch missing.
  assertFalse(fireauth.util.isFetchSupported({
    'Request': function() {},
    'Headers': function() {}
  }));
}


function testGetBrowserName_opera() {
  assertEquals('Opera', fireauth.util.getBrowserName(operaUA));
}


function testGetBrowserName_ie() {
  assertEquals('IE', fireauth.util.getBrowserName(ieUA));
}


function testGetBrowserName_edge() {
  assertEquals('Edge', fireauth.util.getBrowserName(edgeUA));
}


function testGetBrowserName_firefox() {
  assertEquals('Firefox', fireauth.util.getBrowserName(firefoxUA));
}


function testGetBrowserName_silk() {
  assertEquals('Silk', fireauth.util.getBrowserName(silkUA));
}


function testGetBrowserName_safari() {
  assertEquals('Safari', fireauth.util.getBrowserName(safariUA));
}


function testGetBrowserName_chrome() {
  assertEquals('Chrome', fireauth.util.getBrowserName(chromeUA));
}


function testGetBrowserName_android() {
  assertEquals('Android', fireauth.util.getBrowserName(androidUA));
}


function testGetBrowserName_blackberry() {
  assertEquals('Blackberry', fireauth.util.getBrowserName(blackberryUA));
}


function testGetBrowserName_iemobile() {
  assertEquals('IEMobile', fireauth.util.getBrowserName(windowsPhoneUA));
}


function testGetBrowserName_webos() {
  assertEquals('Webos', fireauth.util.getBrowserName(webOSUA));
}


function testGetBrowserName_recognizable() {
  var ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like ' +
      'Gecko) Awesome/2.0.012';
  assertEquals('Awesome', fireauth.util.getBrowserName(ua));
}


function testGetBrowserName_other() {
  var ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_2 like Mac OS X) AppleWebKi' +
      't/600.1.4 (KHTML, like Gecko) Mobile/12D508 [FBAN/FBIOS;FBAV/27.0.0.1' +
      '0.12;FBBV/8291884;FBDV/iPhone7,1;FBMD/iPhone;FBSN/iPhone OS;FBSV/8.2;' +
      'FBSS/3; FBCR/vodafoneIE;FBID/phone;FBLC/en_US;FBOP/5]';
  assertEquals('Other', fireauth.util.getBrowserName(ua));
}


function testGetClientVersion() {
  var ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like ' +
      'Gecko) Chrome/50.0.2661.94 Safari/537.36';
  var firebaseSdkVersion = '3.0.0';
  assertEquals(
      'Chrome/JsCore/3.0.0/FirebaseCore-web',
      fireauth.util.getClientVersion(
          fireauth.util.ClientImplementation.JSCORE, firebaseSdkVersion,
          null, ua));
}


function testGetClientVersion_reactNative() {
  stubs.set(firebase.INTERNAL, 'reactNative', {});
  var firebaseSdkVersion = '3.0.0';
  var navigatorProduct = 'ReactNative';
  var clientVersion = fireauth.util.getClientVersion(
      fireauth.util.ClientImplementation.JSCORE,
      firebaseSdkVersion,
      '',
      navigatorProduct);
  assertEquals('ReactNative/JsCore/3.0.0/FirebaseCore-web', clientVersion);
}


function testGetClientVersion_node() {
  var firebaseSdkVersion = '3.0.0';
  // Simulate Node.js environment.
  stubs.set(firebase.INTERNAL, 'node', {});
  var clientVersion = fireauth.util.getClientVersion(
      fireauth.util.ClientImplementation.JSCORE,
      firebaseSdkVersion);
  assertEquals('Node/JsCore/3.0.0/FirebaseCore-web', clientVersion);
}


function testGetClientVersion_worker() {
  var ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like ' +
      'Gecko) Chrome/50.0.2661.94 Safari/537.36';
  var firebaseSdkVersion = '4.9.1';
  // Simulate worker environment.
  stubs.replace(
      fireauth.util,
      'isWorker',
      function() {
        return true;
      });
  assertEquals(
      'Chrome-Worker/JsCore/4.9.1/FirebaseCore-web',
      fireauth.util.getClientVersion(
          fireauth.util.ClientImplementation.JSCORE, firebaseSdkVersion,
          null, ua));
}


function testGetFrameworkIds() {
  assertArrayEquals([], fireauth.util.getFrameworkIds([]));
  assertArrayEquals([], fireauth.util.getFrameworkIds(['bla']));
  assertArrayEquals(
      ['FirebaseUI-web'], fireauth.util.getFrameworkIds(['FirebaseUI-web']));
  assertArrayEquals(
      ['FirebaseCore-web', 'FirebaseUI-web'],
      fireauth.util.getFrameworkIds(
          ['foo', 'FirebaseCore-web', 'bar', 'FirebaseCore-web',
           'FirebaseUI-web']));
  // Test frameworks IDs are sorted.
  assertArrayEquals(
      ['FirebaseCore-web', 'FirebaseUI-web'],
      fireauth.util.getFrameworkIds(['FirebaseUI-web', 'FirebaseCore-web']));
}


function testGetClientVersion_frameworkVersion_single() {
  var ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like ' +
      'Gecko) Chrome/50.0.2661.94 Safari/537.36';
  var firebaseSdkVersion = '3.0.0';
  var clientVersion = fireauth.util.getClientVersion(
      fireauth.util.ClientImplementation.JSCORE,
      firebaseSdkVersion,
      ['FirebaseUI-web'],
      ua);
  assertEquals(
      'Chrome/JsCore/3.0.0/FirebaseUI-web', clientVersion);
}


function testGetClientVersion_frameworkVersion_multiple() {
  var ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like ' +
      'Gecko) Chrome/50.0.2661.94 Safari/537.36';
  var firebaseSdkVersion = '3.0.0';
  var clientVersion = fireauth.util.getClientVersion(
      fireauth.util.ClientImplementation.JSCORE,
      firebaseSdkVersion,
      ['foo', 'FirebaseCore-web', 'bar', 'FirebaseCore-web', 'FirebaseUI-web'],
      ua);
  assertEquals(
      'Chrome/JsCore/3.0.0/FirebaseCore-web,FirebaseUI-web', clientVersion);
}


function testGetObjectRef() {
  var scope = {
    'a': false,
    'b': {
      'c': {
        'd': 123
      },
      'e': null,
      'f': '',
      'g': 'hello',
      'h': true,
      'i': false,
      'j': undefined,
      'k': null
    }
  };
  assertUndefined(fireauth.util.getObjectRef('', scope));
  assertUndefined(fireauth.util.getObjectRef(' ', scope));
  assertUndefined(fireauth.util.getObjectRef('e', scope));
  assertUndefined(fireauth.util.getObjectRef('.a', scope));
  assertUndefined(fireauth.util.getObjectRef('a.', scope));
  assertEquals(false, fireauth.util.getObjectRef('a', scope));
  assertUndefined(fireauth.util.getObjectRef('a.b', scope));
  assertEquals(123, fireauth.util.getObjectRef('b.c.d', scope));
  assertNull(fireauth.util.getObjectRef('b.e', scope));
  assertEquals('', fireauth.util.getObjectRef('b.f', scope));
  assertEquals('hello', fireauth.util.getObjectRef('b.g', scope));
  assertEquals(true, fireauth.util.getObjectRef('b.h', scope));
  assertEquals(false, fireauth.util.getObjectRef('b.i', scope));
  assertUndefined(fireauth.util.getObjectRef('b.j', scope));
  assertNull(fireauth.util.getObjectRef('b.k', scope));
  assertUndefined(fireauth.util.getObjectRef('b.e.k', scope));
  assertObjectEquals({'d': 123}, fireauth.util.getObjectRef('b.c', scope));
}


function testRunsInBackground_canRunInBackground() {
  assertTrue(fireauth.util.runsInBackground(operaUA));
  assertTrue(fireauth.util.runsInBackground(ieUA));
  assertTrue(fireauth.util.runsInBackground(edgeUA));
  assertTrue(fireauth.util.runsInBackground(silkUA));
  assertTrue(fireauth.util.runsInBackground(safariUA));
  assertTrue(fireauth.util.runsInBackground(chromeUA));
}


function testChromeVersion() {
  // Should return null for non Chrome browsers.
  assertNull(fireauth.util.getChromeVersion(operaUA));
  assertNull(fireauth.util.getChromeVersion(ieUA));
  assertNull(fireauth.util.getChromeVersion(edgeUA));
  assertNull(fireauth.util.getChromeVersion(firefoxUA));
  assertNull(fireauth.util.getChromeVersion(silkUA));
  assertNull(fireauth.util.getChromeVersion(safariUA));
  assertNull(fireauth.util.getChromeVersion(iOS8iPhoneUA));
  // Should return correct version for Chrome.
  assertEquals(50, fireauth.util.getChromeVersion(chromeUA));
}


function testRunsInBackground_cannotRunInBackground() {
  assertFalse(fireauth.util.runsInBackground(iOS7iPodUA));
  assertFalse(fireauth.util.runsInBackground(iOS7iPhoneUA));
  assertFalse(fireauth.util.runsInBackground(iOS7iPadUA));
  assertFalse(fireauth.util.runsInBackground(iOS8iPhoneUA));
  assertFalse(fireauth.util.runsInBackground(iOS9iPhoneUA));
  assertFalse(fireauth.util.runsInBackground(firefoxUA));
  assertFalse(fireauth.util.runsInBackground(androidUA));
  assertFalse(fireauth.util.runsInBackground(blackberryUA));
  assertFalse(fireauth.util.runsInBackground(webOSUA));
  assertFalse(fireauth.util.runsInBackground(windowsPhoneUA));
}


function testIsMobileBrowser() {
  // Mobile OS.
  assertTrue(fireauth.util.isMobileBrowser(iOS7iPodUA));
  assertTrue(fireauth.util.isMobileBrowser(iOS7iPhoneUA));
  assertTrue(fireauth.util.isMobileBrowser(iOS7iPadUA));
  assertTrue(fireauth.util.isMobileBrowser(iOS9iPhoneUA));
  assertTrue(fireauth.util.isMobileBrowser(iOS8iPhoneUA));
  assertTrue(fireauth.util.isMobileBrowser(androidUA));
  assertTrue(fireauth.util.isMobileBrowser(blackberryUA));
  assertTrue(fireauth.util.isMobileBrowser(webOSUA));
  assertTrue(fireauth.util.isMobileBrowser(windowsPhoneUA));
  // Desktop OS.
  assertFalse(fireauth.util.isMobileBrowser(firefoxUA));
  assertFalse(fireauth.util.isMobileBrowser(operaUA));
  assertFalse(fireauth.util.isMobileBrowser(ieUA));
  assertFalse(fireauth.util.isMobileBrowser(edgeUA));
  assertFalse(fireauth.util.isMobileBrowser(firefoxUA));
  assertFalse(fireauth.util.isMobileBrowser(silkUA));
  assertFalse(fireauth.util.isMobileBrowser(safariUA));
}


function testIframeCanSyncWebStorage() {
  // Safari iOS.
  assertFalse(fireauth.util.iframeCanSyncWebStorage(iOS7iPodUA));
  assertFalse(fireauth.util.iframeCanSyncWebStorage(iOS7iPhoneUA));
  assertFalse(fireauth.util.iframeCanSyncWebStorage(iOS7iPadUA));
  assertFalse(fireauth.util.iframeCanSyncWebStorage(iOS8iPhoneUA));
  // Desktop Safari.
  assertFalse(fireauth.util.iframeCanSyncWebStorage(safariUA));
  // Chrome iOS.
  assertFalse(fireauth.util.iframeCanSyncWebStorage(chriosUA));
  // Other Mobile OS.
  assertTrue(fireauth.util.iframeCanSyncWebStorage(androidUA));
  assertTrue(fireauth.util.iframeCanSyncWebStorage(blackberryUA));
  assertTrue(fireauth.util.iframeCanSyncWebStorage(webOSUA));
  assertTrue(fireauth.util.iframeCanSyncWebStorage(windowsPhoneUA));
  // Desktop OS.
  assertTrue(fireauth.util.iframeCanSyncWebStorage(firefoxUA));
  assertTrue(fireauth.util.iframeCanSyncWebStorage(operaUA));
  assertTrue(fireauth.util.iframeCanSyncWebStorage(ieUA));
  assertTrue(fireauth.util.iframeCanSyncWebStorage(edgeUA));
  assertTrue(fireauth.util.iframeCanSyncWebStorage(firefoxUA));
  assertTrue(fireauth.util.iframeCanSyncWebStorage(silkUA));
}


function testStringifyJSON() {
  assertObjectEquals(jsonString, fireauth.util.stringifyJSON(parsedJSON));
}


function testStringifyJSON_undefined() {
  assertNull(fireauth.util.stringifyJSON(undefined));
}


function testParseJSON() {
  assertObjectEquals(parsedJSON, fireauth.util.parseJSON(jsonString));
}


function testParseJSON_null() {
  assertUndefined(fireauth.util.parseJSON(null));
}


function testParseJSON_noEval() {
  stubs.replace(window, 'eval', function() {
    throw 'eval() is not allowed in this context.';
  });
  assertObjectEquals(parsedJSON, fireauth.util.parseJSON(jsonString));
}


function testParseJSON_syntaxError() {
  assertThrows(function() { fireauth.util.parseJSON('{"a":2'); });
  assertThrows(function() { fireauth.util.parseJSON('b:"hello"}'); });
}


function testGetWindowDimensions() {
  var myWin = {
    'innerWidth': 1985.5,
    'innerHeight': 500.5
  };
  assertNull(fireauth.util.getWindowDimensions({}));
  assertObjectEquals(
      {'width': 1985.5, 'height': 500.5},
      fireauth.util.getWindowDimensions(myWin));
}


function testIsPopupRedirectSupported_webStorageNotSupported() {
  assertTrue(fireauth.util.isPopupRedirectSupported());
  stubs.replace(fireauth.util, 'isWebStorageSupported', function() {
    return false;
  });
  assertFalse(fireauth.util.isPopupRedirectSupported());
}


function testIsPopupRedirectSupported_isAndroidOrIosFileEnvironment() {
  fireauth.util.isCordovaEnabled = false;
  assertTrue(fireauth.util.isPopupRedirectSupported());
  // Web storage supported.
  stubs.replace(fireauth.util, 'isWebStorageSupported', function() {
    return true;
  });
  // File scheme.
  stubs.replace(fireauth.util, 'getCurrentScheme', function() {
    return 'file:';
  });
  // iOS or Android file environment.
  stubs.replace(fireauth.util, 'isAndroidOrIosFileEnvironment', function() {
    return true;
  });
  assertTrue(fireauth.util.isPopupRedirectSupported());
}


function testIsPopupRedirectSupported_isChromeExtension() {
  fireauth.util.isCordovaEnabled = false;
  assertTrue(fireauth.util.isPopupRedirectSupported());
  // Web storage supported.
  stubs.replace(fireauth.util, 'isWebStorageSupported', function() {
    return true;
  });
  // Chrome extension scheme.
  stubs.replace(fireauth.util, 'getCurrentScheme', function() {
    return 'chrome-extension:';
  });
  // Chrome extension.
  stubs.replace(fireauth.util, 'isChromeExtension', function() {
    return true;
  });
  assertTrue(fireauth.util.isPopupRedirectSupported());
}


function testIsPopupRedirectSupported_unsupportedFileEnvironment() {
  fireauth.util.isCordovaEnabled = false;
  assertTrue(fireauth.util.isPopupRedirectSupported());
  // Web storage supported.
  stubs.replace(fireauth.util, 'isWebStorageSupported', function() {
    return true;
  });
  // File scheme.
  stubs.replace(fireauth.util, 'getCurrentScheme', function() {
    return 'file:';
  });
  // Neither iOS, nor Android file environment.
  stubs.replace(fireauth.util, 'isAndroidOrIosFileEnvironment', function() {
    return false;
  });
  assertFalse(fireauth.util.isPopupRedirectSupported());
}


function testIsPopupRedirectSupported_unsupportedNativeEnvironment() {
  fireauth.util.isCordovaEnabled = false;
  assertTrue(fireauth.util.isPopupRedirectSupported());
  // Web storage supported.
  stubs.replace(fireauth.util, 'isWebStorageSupported', function() {
    return true;
  });
  // https scheme.
  stubs.replace(fireauth.util, 'getCurrentScheme', function() {
    return 'https:';
  });
  // Neither iOS, nor Android file environment.
  stubs.replace(fireauth.util, 'isAndroidOrIosFileEnvironment', function() {
    return false;
  });
  // Native environment.
  stubs.replace(fireauth.util, 'isNativeEnvironment', function() {
    return true;
  });
  assertFalse(fireauth.util.isPopupRedirectSupported());
}


function testIsPopupRedirectSupported_workerEnvironment() {
  fireauth.util.isCordovaEnabled = false;
  // Web storage supported via indexedDB within worker.
  stubs.replace(fireauth.util, 'isWebStorageSupported', function() {
    return true;
  });
  // HTTPS scheme.
  stubs.replace(fireauth.util, 'getCurrentScheme', function() {
    return 'https:';
  });
  // Neither iOS, nor Android file environment.
  stubs.replace(fireauth.util, 'isAndroidOrIosFileEnvironment', function() {
    return false;
  });
  // Non-native environment environment.
  stubs.replace(fireauth.util, 'isNativeEnvironment', function() {
    return false;
  });
  // Popup/redirect should be supported with above conditions (minus worker).
  assertTrue(fireauth.util.isPopupRedirectSupported());
  // Simulate worker environment.
  stubs.replace(fireauth.util, 'isWorker', function() {
    return true;
  });
  // Popup/redirect no longer supported.
  assertFalse(fireauth.util.isPopupRedirectSupported());
}


function testIsChromeExtension() {
  // Test https environment.
  stubs.replace(
      fireauth.util,
      'getCurrentScheme',
      function() {
        return 'https:';
      });
  assertFalse(fireauth.util.isChromeExtension());
  // Test Chrome extension environment.
  stubs.replace(
      fireauth.util,
      'getCurrentScheme',
      function() {
        return 'chrome-extension:';
      });
  assertTrue(fireauth.util.isChromeExtension());
}


function testIsIOS() {
  assertFalse(fireauth.util.isIOS(operaUA));
  assertFalse(fireauth.util.isIOS(ieUA));
  assertFalse(fireauth.util.isIOS(edgeUA));
  assertFalse(fireauth.util.isIOS(firefoxUA));
  assertFalse(fireauth.util.isIOS(silkUA));
  assertFalse(fireauth.util.isIOS(safariUA));
  assertFalse(fireauth.util.isIOS(chromeUA));
  assertFalse(fireauth.util.isIOS(androidUA));
  assertFalse(fireauth.util.isIOS(blackberryUA));
  assertFalse(fireauth.util.isIOS(webOSUA));
  assertFalse(fireauth.util.isIOS(windowsPhoneUA));
  assertTrue(fireauth.util.isIOS(iOS9iPhoneUA));
  assertTrue(fireauth.util.isIOS(iOS8iPhoneUA));
  assertTrue(fireauth.util.isIOS(iOS7iPodUA));
  assertTrue(fireauth.util.isIOS(iOS7iPadUA));
  assertTrue(fireauth.util.isIOS(iOS7iPhoneUA));
  assertTrue(fireauth.util.isIOS(chriosUA));
}


function testIsAndroid() {
  assertFalse(fireauth.util.isAndroid(operaUA));
  assertFalse(fireauth.util.isAndroid(ieUA));
  assertFalse(fireauth.util.isAndroid(edgeUA));
  assertFalse(fireauth.util.isAndroid(firefoxUA));
  assertFalse(fireauth.util.isAndroid(silkUA));
  assertFalse(fireauth.util.isAndroid(safariUA));
  assertFalse(fireauth.util.isAndroid(chromeUA));
  assertFalse(fireauth.util.isAndroid(blackberryUA));
  assertFalse(fireauth.util.isAndroid(webOSUA));
  assertFalse(fireauth.util.isAndroid(windowsPhoneUA));
  assertFalse(fireauth.util.isAndroid(iOS8iPhoneUA));
  assertFalse(fireauth.util.isAndroid(iOS7iPodUA));
  assertFalse(fireauth.util.isAndroid(iOS7iPadUA));
  assertFalse(fireauth.util.isAndroid(iOS7iPhoneUA));
  assertFalse(fireauth.util.isAndroid(iOS9iPhoneUA));
  assertFalse(fireauth.util.isAndroid(chriosUA));
  assertTrue(fireauth.util.isAndroid(androidUA));
}


function testIsAndroidOrIosFileEnvironment() {
  // Test https environment.
  stubs.replace(
      fireauth.util,
      'getCurrentScheme',
      function() {
        return 'https:';
      });
  // Non file environment.
  assertFalse(fireauth.util.isAndroidOrIosFileEnvironment(iOS8iPhoneUA));
  // Test https environment.
  stubs.replace(
      fireauth.util,
      'getCurrentScheme',
      function() {
        return 'file:';
      });
  // iOS file environment.
  assertTrue(fireauth.util.isAndroidOrIosFileEnvironment(iOS8iPhoneUA));
  // Android file environment.
  assertTrue(fireauth.util.isAndroidOrIosFileEnvironment(androidUA));
  // Desktop file environment.
  assertFalse(fireauth.util.isAndroidOrIosFileEnvironment(firefoxUA));
}


function testIsIOS7Or8() {
  assertTrue(fireauth.util.isIOS7Or8(iOS7iPodUA));
  assertTrue(fireauth.util.isIOS7Or8(iOS7iPhoneUA));
  assertTrue(fireauth.util.isIOS7Or8(iOS7iPadUA));
  assertTrue(fireauth.util.isIOS7Or8(iOS8iPhoneUA));
  assertFalse(fireauth.util.isIOS7Or8(iOS9iPhoneUA));
  assertFalse(fireauth.util.isIOS7Or8(firefoxUA));
  assertFalse(fireauth.util.isIOS7Or8(androidUA));
  assertFalse(fireauth.util.isIOS7Or8(blackberryUA));
  assertFalse(fireauth.util.isIOS7Or8(webOSUA));
  assertFalse(fireauth.util.isIOS7Or8(windowsPhoneUA));
}


function testRequiresPopupDelay() {
  assertFalse(fireauth.util.requiresPopupDelay(iOS7iPodUA));
  assertFalse(fireauth.util.requiresPopupDelay(iOS7iPhoneUA));
  assertFalse(fireauth.util.requiresPopupDelay(iOS7iPadUA));
  assertFalse(fireauth.util.requiresPopupDelay(iOS8iPhoneUA));
  assertFalse(fireauth.util.requiresPopupDelay(iOS9iPhoneUA));
  assertFalse(fireauth.util.requiresPopupDelay(firefoxUA));
  assertFalse(fireauth.util.requiresPopupDelay(androidUA));
  assertFalse(fireauth.util.requiresPopupDelay(blackberryUA));
  assertFalse(fireauth.util.requiresPopupDelay(webOSUA));
  assertFalse(fireauth.util.requiresPopupDelay(windowsPhoneUA));
  assertTrue(fireauth.util.requiresPopupDelay(chrome55iOS10UA));
}


function testCheckIfCordova_incorrectFileEnvironment() {
  return installAndRunTest('checkIfCordova_incorrectFileEnv', function() {
    stubs.replace(
        fireauth.util,
        'isAndroidOrIosFileEnvironment',
        function() {
          return false;
        });
    return fireauth.util.checkIfCordova(null, 10).then(function() {
      throw new Error('Unexpected success!');
    }).thenCatch(function(error) {
      assertEquals(
          'Cordova must run in an Android or iOS file scheme.',
          error.message);
    });
  });
}


function testCheckIfCordova_deviceReadyTimeout() {
  return installAndRunTest('checkIfCordova_deviceReadyTimeout', function() {
    stubs.replace(
        fireauth.util,
        'isAndroidOrIosFileEnvironment',
        function() {
          return true;
        });
    return fireauth.util.checkIfCordova(null, 10).then(function() {
      throw new Error('Unexpected success!');
    }).thenCatch(function(error) {
      assertEquals(
          'Cordova framework is not ready.',
          error.message);
    });
  });
}


function testCheckIfCordova_success() {
  return installAndRunTest('checkIfCordova_success', function() {
    stubs.replace(
        fireauth.util,
        'isAndroidOrIosFileEnvironment',
        function() {
          return true;
        });
    var doc = goog.global.document;
    // Create deviceready custom event.
    var deviceReadyEvent = new CustomEvent('deviceready');
    var checkIfCordova = fireauth.util.checkIfCordova(null, 10);
    // Trigger deviceready event on DOM ready.
    fireauth.util.onDomReady().then(function() {
      doc.dispatchEvent(deviceReadyEvent);
    });
    return checkIfCordova;
  });
}


function testRemoveEntriesWithKeys() {
  var obj = {
    'a': false,
    'b': undefined,
    'c': 'abc',
    'd': 1,
    'e': 0,
    'f': '',
    'g': 0.5,
    'h': null
  };
  // Remove nothing from an empty object.
  assertObjectEquals(
      {},
      fireauth.util.removeEntriesWithKeys({}, []));

  // Remove keys from an empty object.
  assertObjectEquals(
      {},
      fireauth.util.removeEntriesWithKeys({}, ['a', 'b']));

  // Remove everything.
  var filteredObj1 = {};
  var filter1 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  assertObjectEquals(
      filteredObj1,
      fireauth.util.removeEntriesWithKeys(obj, filter1));
  var filteredObj2 = obj;

  // Remove keys that do not exist.
  var filter2 = ['i', 'j'];
  assertObjectEquals(
      filteredObj2,
      fireauth.util.removeEntriesWithKeys(obj, filter2));

  // Remove nothing.
  assertObjectEquals(
      filteredObj2,
      fireauth.util.removeEntriesWithKeys(obj, []));

  // Remove keys with values that are not true; if(obj[key]) resolves to false.
  var filteredObj3 = {
    'c': 'abc',
    'd': 1,
    'g': 0.5
  };
  var filter3 = ['a', 'b', 'e', 'f', 'h', 'i', 'j'];
  assertObjectEquals(
      filteredObj3,
      fireauth.util.removeEntriesWithKeys(obj, filter3));

  // Keep keys with values that are not true.
  var filteredObj4 = {
    'a': false,
    'b': undefined,
    'e': 0,
    'h': null
  };
  var filter4 = ['c', 'd', 'f', 'g', 'i', 'j'];
  assertObjectEquals(
      filteredObj4,
      fireauth.util.removeEntriesWithKeys(obj, filter4));
}


function testCopyWithoutNullsOrUndefined() {
  var obj = {
    'a': false,
    'b': undefined,
    'c': 'abc',
    'd': 1,
    'e': 0,
    'f': '',
    'g': 0.5,
    'h': null
  };
  var filteredObj = {
    'a': false,
    'c': 'abc',
    'd': 1,
    'e': 0,
    'f': '',
    'g': 0.5,
  };
  // All nulls and undefined removed.
  assertObjectEquals(
      filteredObj,
      fireauth.util.copyWithoutNullsOrUndefined(obj));
  var obj2 = {
    'a': 1,
    'b': 2
  };
  // No nulls or undefined.
  assertObjectEquals(
      obj2,
      fireauth.util.copyWithoutNullsOrUndefined(obj2));
  // Empty object.
  assertObjectEquals(
      {},
      fireauth.util.copyWithoutNullsOrUndefined({}));
  // Object with undefined and nulls only.
  assertObjectEquals(
      {},
      fireauth.util.copyWithoutNullsOrUndefined({'b': undefined, 'c': null}));
}


function testIsMobileDevice() {
  // Mobile devices.
  assertTrue(
      fireauth.util.isMobileDevice(chriosUA, fireauth.util.Env.BROWSER));
  assertTrue(
      fireauth.util.isMobileDevice(null, fireauth.util.Env.REACT_NATIVE));
  // Desktop devices.
  assertFalse(
      fireauth.util.isMobileDevice(chromeUA, fireauth.util.Env.BROWSER));
  assertFalse(
      fireauth.util.isMobileDevice(null, fireauth.util.Env.NODE));
  // For worker environments, the userAgent is still accessible and should be
  // used to determine if the current device is a mobile device.
  assertTrue(
      fireauth.util.isMobileDevice(chriosUA, fireauth.util.Env.WORKER));
  assertFalse(
      fireauth.util.isMobileDevice(chromeUA, fireauth.util.Env.WORKER));
}


function testIsMobileDevice_desktopBrowser_default() {
  // Simulate desktop browser.
  stubs.replace(fireauth.util, 'isMobileBrowser', function(ua) {
    return false;
  });
  stubs.replace(fireauth.util, 'getEnvironment', function() {
    return fireauth.util.Env.BROWSER;
  });
  assertFalse(fireauth.util.isMobileDevice());
}


function testIsMobileDevice_mobileBrowser_default() {
  // Simulate mobile browser.
  stubs.replace(fireauth.util, 'isMobileBrowser', function(ua) {
    return true;
  });
  stubs.replace(fireauth.util, 'getEnvironment', function() {
    return fireauth.util.Env.BROWSER;
  });
  assertTrue(fireauth.util.isMobileDevice());
}


function testIsMobileDevice_desktopEnv_default() {
  // Simulate desktop Node.js environment.
  stubs.replace(fireauth.util, 'isMobileBrowser', function(ua) {
    return false;
  });
  stubs.replace(fireauth.util, 'getEnvironment', function() {
    return fireauth.util.Env.NODE;
  });
  assertFalse(fireauth.util.isMobileDevice());
}


function testIsMobileDevice_mobileEnv_default() {
  // Simulate mobile React Native environment.
  stubs.replace(fireauth.util, 'isMobileBrowser', function(ua) {
    return false;
  });
  stubs.replace(fireauth.util, 'getEnvironment', function() {
    return fireauth.util.Env.REACT_NATIVE;
  });
  assertTrue(fireauth.util.isMobileDevice());
}


function testIsMobileDevice_mobileWorker_default() {
  // Simulate mobile browser.
  stubs.replace(fireauth.util, 'isMobileBrowser', function(ua) {
    return true;
  });
  // Whether this is a worker or a non-worker shouldn't matter.
  stubs.replace(fireauth.util, 'getEnvironment', function() {
    return fireauth.util.Env.WORKER;
  });
  assertTrue(fireauth.util.isMobileDevice());
}


function testIsMobileDevice_desktopWorker_default() {
  // Simulate desktop browser.
  stubs.replace(fireauth.util, 'isMobileBrowser', function(ua) {
    return false;
  });
  // Whether this is a worker or a non-worker shouldn't matter.
  stubs.replace(fireauth.util, 'getEnvironment', function() {
    return fireauth.util.Env.WORKER;
  });
  assertFalse(fireauth.util.isMobileDevice());
}


function testIsOnline_httpOrHttps_online() {
  // HTTP/HTTPS environment.
  stubs.replace(fireauth.util, 'isHttpOrHttps', function(ua) {
    return true;
  });
  // Non-Chrome extension environment.
  stubs.replace(fireauth.util, 'isChromeExtension', function() {
    return false;
  });
  // navigator.onLine resolves to true.
  // fireauth.util.isOnline() should return true.
  assertTrue(fireauth.util.isOnline({onLine: true}));
}


function testIsOnline_httpOrHttps_offline() {
  // HTTP/HTTPS environment.
  stubs.replace(fireauth.util, 'isHttpOrHttps', function(ua) {
    return true;
  });
  // Non-Chrome extension environment.
  stubs.replace(fireauth.util, 'isChromeExtension', function() {
    return false;
  });
  // navigator.onLine resolves to false.
  // fireauth.util.isOnline() should return false.
  assertFalse(fireauth.util.isOnline({onLine: false}));
}


function testIsOnline_chromeExtension_online() {
  // Non-HTTP/HTTPS environment.
  stubs.replace(fireauth.util, 'isHttpOrHttps', function(ua) {
    return false;
  });
  // Chrome extension environment.
  stubs.replace(fireauth.util, 'isChromeExtension', function() {
    return true;
  });
  // navigator.onLine resolves to true.
  // fireauth.util.isOnline() should return true.
  assertTrue(fireauth.util.isOnline({onLine: true}));
}


function testIsOnline_chromeExtension_offline() {
  // Non-HTTP/HTTPS environment.
  stubs.replace(fireauth.util, 'isHttpOrHttps', function(ua) {
    return false;
  });
  // Chrome extension environment.
  stubs.replace(fireauth.util, 'isChromeExtension', function() {
    return true;
  });
  // navigator.onLine resolves to false.
  // fireauth.util.isOnline() should return false.
  assertFalse(fireauth.util.isOnline({onLine: false}));
}


function testIsOnline_other_navigatorConnection_online() {
  // Non-HTTP/HTTPS environment.
  stubs.replace(fireauth.util, 'isHttpOrHttps', function(ua) {
    return false;
  });
  // Non-Chrome extension environment.
  stubs.replace(fireauth.util, 'isChromeExtension', function() {
    return false;
  });
  // cordova-plugin-network-information installed.
  // navigator.onLine resolves to true.
  // fireauth.util.isOnline() should return true.
  assertTrue(fireauth.util.isOnline({onLine: true, connection: {}}));
}


function testIsOnline_other_navigatorConnection_offline() {
  // Non-HTTP/HTTPS environment.
  stubs.replace(fireauth.util, 'isHttpOrHttps', function(ua) {
    return false;
  });
  // Non-Chrome extension environment.
  stubs.replace(fireauth.util, 'isChromeExtension', function() {
    return false;
  });
  // cordova-plugin-network-information installed.
  // navigator.onLine resolves to false.
  // fireauth.util.isOnline() should return false.
  assertFalse(fireauth.util.isOnline({onLine: false, connection: {}}));
}


function testIsOnline_notSupported() {
  // Non-HTTP/HTTPS environment.
  stubs.replace(fireauth.util, 'isHttpOrHttps', function(ua) {
    return false;
  });
  // Non-Chrome extension environment.
  stubs.replace(fireauth.util, 'isChromeExtension', function() {
    return false;
  });
  // Evaluates to true even though navigator.onLine is false.
  assertTrue(fireauth.util.isOnline({onLine: false}));
}


function testDelay_invalid() {
  assertThrows(function() {
    new fireauth.util.Delay(50, 10);
  });
}


function testDelay_offline_defaultDelay() {
  // Simulate navigator.onLine is false.
  stubs.replace(fireauth.util, 'isOnline', function() {
    return false;
  });
  var delay = new fireauth.util.Delay(10000, 50000);
  // Offline delay used instead of the supplied delay range.
  assertEquals(5000, delay.get());
}


function testDelay_offline_shortDelay() {
  // Simulate navigator.onLine is false.
  stubs.replace(fireauth.util, 'isOnline', function() {
    return false;
  });
  var delay = new fireauth.util.Delay(2000, 50000);
  // Short delay used instead of offline delay.
  assertEquals(2000, delay.get());
}


function testDelay_mobileDevice_default() {
  // Simulate mobile browser.
  stubs.replace(fireauth.util, 'isMobileDevice', function(ua) {
    return true;
  });
  var delay = new fireauth.util.Delay(10, 50);
  assertEquals(50, delay.get());
}


function testDelay_desktopDevice_default() {
  // Simulate desktop Node.js environment.
  stubs.replace(fireauth.util, 'isMobileDevice', function(ua) {
    return false;
  });
  var delay = new fireauth.util.Delay(10, 50);
  assertEquals(10, delay.get());
}


function testDelay_desktopBrowser() {
  var delay =
      new fireauth.util.Delay(10, 50, chromeUA, fireauth.util.Env.BROWSER);
  assertEquals(10, delay.get());
}


function testDelay_mobileBrowser() {
  var delay =
      new fireauth.util.Delay(10, 50, chriosUA, fireauth.util.Env.BROWSER);
  assertEquals(50, delay.get());
}


function testDelay_desktopBrowser() {
  // Whether this is a worker or a non-worker shouldn't matter.
  // The userAgent is the authority on how the delay is determined.
  var delay =
      new fireauth.util.Delay(10, 50, chromeUA, fireauth.util.Env.WORKER);
  assertEquals(10, delay.get());
}


function testDelay_mobileBrowser() {
  // Whether this is a worker or a non-worker shouldn't matter.
  // The userAgent is the authority on how the delay is determined.
  var delay =
      new fireauth.util.Delay(10, 50, chriosUA, fireauth.util.Env.WORKER);
  assertEquals(50, delay.get());
}


function testDelay_node() {
  var delay = new fireauth.util.Delay(10, 50, null, fireauth.util.Env.NODE);
  assertEquals(10, delay.get());
}


function testDelay_reactNative() {
  stubs.set(firebase.INTERNAL, 'reactNative', {});
  var delay =
      new fireauth.util.Delay(10, 50, null, fireauth.util.Env.REACT_NATIVE);
  assertEquals(50, delay.get());
}


function testGetUserLanguage() {
  // Simulate modern browser.
  assertEquals('de', fireauth.util.getUserLanguage({
    'languages': ['de', 'en'],
    'language': 'en'
  }));

  // Simulate non-Chrome/Firefox modern browser.
  assertEquals('en', fireauth.util.getUserLanguage({
    'language': 'en'
  }));

  // Simulate older IE.
  assertEquals('fr', fireauth.util.getUserLanguage({
    'userLanguage': 'fr'
  }));

  // Simulate other environment.
  assertNull(fireauth.util.getUserLanguage({}));
}


function testIsIframe_iframe() {
  // Mock window.
  var win = {
    name: 'windowA'
  };
  // Set top window to another window.
  win.top = {
    name: 'windowB'
  };
  // WindowB is the top window.
  win.top.top = win.top;
  assertTrue(fireauth.util.isIframe(win));
}


function testIsIframe_notIframe() {
  // Mock window.
  var win = {
    name: 'windowA'
  };
  // Set top window to current window.
  win.top = win;
  assertFalse(fireauth.util.isIframe(win));
}


function testIsOpenerAnIframe_openerIframe() {
  // Simulate opener is an iframe.
  // Mock opener window.
  var win = {
    name: 'windowA'
  };
  // Set top window to another window.
  win.top = {
    name: 'windowB'
  };
  // WindowB is the top window.
  win.top.top = win.top;
  // Current mock window with opener set to above window.
  var currentWindow = {
    name: 'windowC',
    opener: win
  };
  assertTrue(fireauth.util.isOpenerAnIframe(currentWindow));
}


function testIsOpenerAnIframe_openerNotIframe() {
  // Simulate opener is a top window.
  // Mock window.
  var win = {
    name: 'windowA'
  };
  // Set top window to current window.
  win.top = win;
  // Current mock window with opener set to above window.
  var currentWindow = {
    name: 'windowC',
    opener: win
  };
  assertFalse(fireauth.util.isOpenerAnIframe(currentWindow));
}


function testIsOpenerAnIframe_noOpener() {
  // Current window has no opener.
  var currentWindow = {
    name: 'windowC',
    opener: null
  };
  assertFalse(fireauth.util.isOpenerAnIframe(currentWindow));
}


function testOnAppVisible_initiallyVisible() {
  return installAndRunTest('onAppVisible_initiallyVisible', function() {
    // Simulate app visible initially.
    stubs.replace(
        fireauth.util,
        'isAppVisible',
        function() {
          return true;
        });
    // Should resolve quickly.
    return fireauth.util.onAppVisible();
  });
}


function testOnAppVisible_initiallyHidden() {
  return installAndRunTest('onAppVisible_initiallyHidden', function() {
    // Initially, simulate app not visible.
    stubs.replace(
        fireauth.util,
        'isAppVisible',
        function() {
          return false;
        });
    // Reset event triggered flag.
    var eventTriggered = false;
    var doc = goog.global.document;
    // Create custom visibility change event.
    var visibilitychangeEvent = new CustomEvent('visibilitychange');
    // Run onAppVisible and save returned promise.
    var p = fireauth.util.onAppVisible();
    // Simulate visibility change event after a short period of time.
    setTimeout(function() {
      // Simulate app visible after short period of time.
      stubs.replace(
          fireauth.util,
          'isAppVisible',
          function() {
            return true;
          });
      // Trigger visibility change.
      doc.dispatchEvent(visibilitychangeEvent);
      // Track event being triggered.
      eventTriggered = true;
    }, 10);
    return p.then(function() {
      // Visibility change should have been triggered.
      assertTrue(eventTriggered);
    });
  });
}


function testConsoleWarn() {
  if (typeof console === 'undefined') {
    // Ignore browsers that don't support console. The test
    // testConsoleWarn_doesntBreakIE tests that this function doesn't break
    // those browsers.
    return;
  }
  var consoleWarn = mockControl.createMethodMock(goog.global.console, 'warn');
  var message = 'This is my message.';
  consoleWarn(message).$once();

  mockControl.$replayAll();

  fireauth.util.consoleWarn(message);
}


function testConsoleWarn_doesntBreakIE() {
  fireauth.util.consoleWarn('This should not trigger an error in IE.');
}


function testUtcTimestampToDateString() {
  var actual;
  // Null.
  assertNull(fireauth.util.utcTimestampToDateString(null));

  // Invalid.
  assertNull(fireauth.util.utcTimestampToDateString('bla'));

  // Null should be returned when a non numeric timestamp is provided.
  assertNull(
      fireauth.util.utcTimestampToDateString('22 Sep 2017 01:49:58 GMT'));

  // UTC timestamp string.
  actual = fireauth.util.utcTimestampToDateString('1506044998000');
  assertTrue(
      // All non IE10 browsers.
      actual == 'Fri, 22 Sep 2017 01:49:58 GMT' ||
      // IE 10 browser.
      actual == 'Fri, 22 Sep 2017 01:49:58 UTC');

  // UTC timestamp number.
  actual = fireauth.util.utcTimestampToDateString(1506046529000);
  assertTrue(
      // All non IE10 browsers.
      actual == 'Fri, 22 Sep 2017 02:15:29 GMT' ||
      // IE 10 browser.
      actual == 'Fri, 22 Sep 2017 02:15:29 UTC');
  assertEquals(
      new Date(1506046529000).toUTCString(),
      fireauth.util.utcTimestampToDateString(1506046529000));
}


function testPersistsStorageWithIndexedDB() {
  // SDK only: localStorage not synchronized and indexedDB available.
  stubs.replace(
      fireauth.util,
      'isAuthHandlerOrIframe',
      function() {return false;});
  stubs.replace(
      fireauth.util,
      'isLocalStorageNotSynchronized',
      function() {return true;});
  stubs.replace(
      fireauth.util,
      'isIndexedDBAvailable',
      function() {return true;});
  assertTrue(fireauth.util.persistsStorageWithIndexedDB());

  // SDK only: localStorage synchronized and indexedDB available.
  stubs.replace(
      fireauth.util,
      'isLocalStorageNotSynchronized',
      function() {return false;});
  stubs.replace(
      fireauth.util,
      'isIndexedDBAvailable',
      function() {return true;});
  assertTrue(fireauth.util.persistsStorageWithIndexedDB());

  // indexedDB not available.
  stubs.reset();
  stubs.replace(
      fireauth.util,
      'isIndexedDBAvailable',
      function() {return false;});
  assertFalse(fireauth.util.persistsStorageWithIndexedDB());

  // Auth handler/iframe: localStorage not synchronized and indexedDB available.
  stubs.replace(
      fireauth.util,
      'isAuthHandlerOrIframe',
      function() {return true;});
  stubs.replace(
      fireauth.util,
      'isLocalStorageNotSynchronized',
      function() {return true;});
  stubs.replace(
      fireauth.util,
      'isIndexedDBAvailable',
      function() {return true;});
  assertTrue(fireauth.util.persistsStorageWithIndexedDB());

  // Auth handler/iframe: localStorage synchronized and indexedDB available.
  stubs.replace(
      fireauth.util,
      'isAuthHandlerOrIframe',
      function() {return true;});
  stubs.replace(
      fireauth.util,
      'isLocalStorageNotSynchronized',
      function() {return false;});
  stubs.replace(
      fireauth.util,
      'isIndexedDBAvailable',
      function() {return true;});
  assertFalse(fireauth.util.persistsStorageWithIndexedDB());
}


/**
 * @return {?HTMLElement} The last meta element if available in the head
 *     element.
 */
function getLastMetaTag() {
  var collection = goog.dom.getElementsByTagName('head');
  if (collection.length) {
    var metaTags = goog.dom.getElementsByTagName('meta', collection[0]);
    if (metaTags.length > 0) {
      return metaTags[metaTags.length - 1];
    }
  }
  return null;
}


function testSetNoReferrer() {
  lastMetaTag = getLastMetaTag();
  if (lastMetaTag) {
    assertNotEquals('referrer', lastMetaTag.getAttribute('name'));
  }
  fireauth.util.setNoReferrer();
  lastMetaTag = getLastMetaTag();
  assertEquals('referrer', lastMetaTag.getAttribute('name'));
  assertEquals('no-referrer', lastMetaTag.getAttribute('content'));
}
