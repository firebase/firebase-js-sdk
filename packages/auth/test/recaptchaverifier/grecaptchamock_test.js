/**
 * @license
 * Copyright 2018 Google Inc.
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
 * @fileoverview Tests for grecaptchamock.js.
 */

goog.provide('fireauth.GRecaptchaMockFactoryTest');

goog.require('fireauth.GRecaptchaMockFactory');
goog.require('fireauth.RecaptchaMock');
goog.require('fireauth.util');
goog.require('goog.dom');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.events');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.GRecaptchaMockFactoryTest');


var stubs = new goog.testing.PropertyReplacer();
var clock;
var randomCounter;
var myElement, myElement2;
var startInstanceId = fireauth.GRecaptchaMockFactory.START_INSTANCE_ID;
var expirationTimeMs = fireauth.GRecaptchaMockFactory.EXPIRATION_TIME_MS;
var solveTimeMs = fireauth.GRecaptchaMockFactory.SOLVE_TIME_MS;


function setUp() {
  // Create DIV test element and add to document.
  myElement = goog.dom.createDom(goog.dom.TagName.DIV, {'id': 'recaptcha'});
  document.body.appendChild(myElement);
  // Create another DIV test element and add to document.
  myElement2 = goog.dom.createDom(goog.dom.TagName.DIV, {'id': 'recaptcha2'});
  document.body.appendChild(myElement2);
  randomCounter = 0;
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
  stubs.replace(
      fireauth.util,
      'generateRandomAlphaNumericString',
      function(charCount) {
        assertEquals(50, charCount);
        return 'random' + (randomCounter++);
      });
}


function tearDown() {
  // Destroy both elements.
  if (myElement) {
    goog.dom.removeNode(myElement);
    myElement = null;
  }
  if (myElement2) {
    goog.dom.removeNode(myElement2);
    myElement2 = null;
  }
  goog.dispose(clock);
  stubs.reset();
}


function testRecaptchaMock_visible() {
  var responseCallback = goog.testing.recordFunction();
  var expiredCallback = goog.testing.recordFunction();
  var mockInstance = new fireauth.RecaptchaMock('recaptcha', {
    'sitekey': 'SITE_KEY1',
    'size': 'normal',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback,
    'expired-callback': expiredCallback
  });
  // No response initially.
  assertNull(mockInstance.getResponse());
  assertEquals(0, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());

  // Should auto-solve after some delay.
  clock.tick(solveTimeMs);
  assertEquals('random0', mockInstance.getResponse());
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());
  clock.tick(expirationTimeMs - 1);
  assertEquals('random0', mockInstance.getResponse());

  // Simulate token expired.
  clock.tick(1);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertNull(mockInstance.getResponse());

  // Should auto-solve again after delay.
  clock.tick(solveTimeMs);
  assertEquals('random1', mockInstance.getResponse());
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  // Delete should result in APIs throwing expected error.
  mockInstance.delete();
  assertThrows(function() {
    mockInstance.getResponse();
  });
  assertThrows(function() {
    mockInstance.delete();
  });
}


function testRecaptchaMock_invisible() {
  var responseCallback = goog.testing.recordFunction();
  var expiredCallback = goog.testing.recordFunction();
  var mockInstance = new fireauth.RecaptchaMock('recaptcha', {
    'sitekey': 'SITE_KEY1',
    'size': 'invisible',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback,
    'expired-callback': expiredCallback
  });
  // Should not trigger until execute is triggered.
  clock.tick(100000);
  assertNull(mockInstance.getResponse());

  // Execute should auto-solve after some delay.
  mockInstance.execute();
  assertNull(mockInstance.getResponse());
  assertEquals(0, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());
  clock.tick(solveTimeMs);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());
  assertEquals('random0', mockInstance.getResponse());
  clock.tick(expirationTimeMs - 1);
  assertEquals('random0', mockInstance.getResponse());

  // On expiration, response should be nullified and expected callback
  // triggered.
  clock.tick(1);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  // Should not trigger until execute is triggered.
  clock.tick(100000);
  assertNull(mockInstance.getResponse());

  // Click should also trigger execute.
  goog.testing.events.fireClickSequence(myElement);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertNull(mockInstance.getResponse());
  clock.tick(solveTimeMs);
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertEquals('random1', mockInstance.getResponse());

  // Since response is not expired, these calls should do nothing.
  goog.testing.events.fireClickSequence(myElement);
  mockInstance.execute();
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertEquals('random1', mockInstance.getResponse());

  // Delete should result in APIs throwing expected error.
  mockInstance.delete();
  assertThrows(function() {
    mockInstance.getResponse();
  });
  assertThrows(function() {
    mockInstance.execute();
  });
  assertThrows(function() {
    mockInstance.delete();
  });
  // Click handler should no longer trigger execute and therefore should not
  // throw an error.
  assertNotThrows(function() {
    goog.testing.events.fireClickSequence(myElement);
  });
}


function testGRecaptchaMockFactory_visible() {
  var responseCallback = goog.testing.recordFunction();
  var expiredCallback = goog.testing.recordFunction();
  var mockFactory = new fireauth.GRecaptchaMockFactory();
  var id1 = mockFactory.render('recaptcha', {
    'sitekey': 'SITE_KEY1',
    'size': 'normal',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback,
    'expired-callback': expiredCallback
  });
  // Initially no response should be available.
  assertNull(mockFactory.getResponse(id1));
  assertEquals(0, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());

  // Instance should auto-solve after some delay.
  clock.tick(solveTimeMs);
  assertEquals('random0', mockFactory.getResponse(id1));
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());
  clock.tick(expirationTimeMs - 1);
  assertEquals('random0', mockFactory.getResponse(id1));

  // On expiration, response should be nullified and expired-callback triggered.
  clock.tick(1);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertNull(mockFactory.getResponse(id1));

  // Instance should auto-solve after some delay.
  clock.tick(solveTimeMs);
  assertEquals('random1', mockFactory.getResponse(id1));
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  mockFactory.reset(id1);
  assertNull(mockFactory.getResponse(id1));

  // On reset, instance should no longer auto-solve or trigger callbacks.
  clock.tick(100000);
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());

  // Non-existing ID.
  assertNull(mockFactory.getResponse(id1 + 1));
  assertNotThrows(function() {
    mockFactory.reset(id1 + 1);
  });
}


function testGRecaptchaMockFactory_invisible_executeViaManualCall() {
  var responseCallback = goog.testing.recordFunction();
  var expiredCallback = goog.testing.recordFunction();
  var mockFactory = new fireauth.GRecaptchaMockFactory();
  var id1 = mockFactory.render('recaptcha', {
    'sitekey': 'SITE_KEY1',
    'size': 'invisible',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback,
    'expired-callback': expiredCallback
  });
  // Should not trigger until execute is triggered.
  clock.tick(100000);
  assertNull(mockFactory.getResponse(id1));

  // execute should auto-solve.
  mockFactory.execute(id1);
  assertNull(mockFactory.getResponse(id1));
  assertEquals(0, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());
  clock.tick(solveTimeMs);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());
  assertEquals('random0', mockFactory.getResponse(id1));
  clock.tick(expirationTimeMs - 1);
  assertEquals('random0', mockFactory.getResponse(id1));

  // On expiration, response should be nullified and expired-callback triggered.
  clock.tick(1);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  // Should not trigger until execute is triggered.
  clock.tick(100000);
  assertNull(mockFactory.getResponse(id1));

  // execute should auto-solve.
  mockFactory.execute(id1);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertNull(mockFactory.getResponse(id1));
  clock.tick(solveTimeMs);
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertEquals('random1', mockFactory.getResponse(id1));

  // reset should nullify responses.
  mockFactory.reset(id1);
  assertNull(mockFactory.getResponse(id1));
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
}


function testGRecaptchaMockFactory_invisible_executeViaClick() {
  var responseCallback = goog.testing.recordFunction();
  var expiredCallback = goog.testing.recordFunction();
  var mockFactory = new fireauth.GRecaptchaMockFactory();
  var id1 = mockFactory.render('recaptcha', {
    'sitekey': 'SITE_KEY1',
    'size': 'invisible',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback,
    'expired-callback': expiredCallback
  });
  // Should not trigger until execute is triggered.
  clock.tick(100000);
  assertNull(mockFactory.getResponse(id1));

  // Instance should auto-solve on click after some delay.
  goog.testing.events.fireClickSequence(myElement);
  assertNull(mockFactory.getResponse(id1));
  assertEquals(0, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());
  clock.tick(solveTimeMs);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(0, expiredCallback.getCallCount());
  assertEquals('random0', mockFactory.getResponse(id1));
  clock.tick(expirationTimeMs - 1);
  assertEquals('random0', mockFactory.getResponse(id1));

  // On expiration, response should be nullified and expired-callback triggered.
  clock.tick(1);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  // Should not trigger until execute is triggered.
  clock.tick(100000);
  assertNull(mockFactory.getResponse(id1));

  // Instance should auto-solve on click after some delay.
  goog.testing.events.fireClickSequence(myElement);
  assertEquals(1, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertNull(mockFactory.getResponse(id1));
  clock.tick(solveTimeMs);
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
  assertEquals('random1', mockFactory.getResponse(id1));

  // On reset, instance should no longer auto-solve or trigger callbacks.
  mockFactory.reset(id1);
  assertNull(mockFactory.getResponse(id1));
  goog.testing.events.fireClickSequence(myElement);
  clock.tick(100000);
  assertNull(mockFactory.getResponse(id1));
  assertEquals(2, responseCallback.getCallCount());
  assertEquals(1, expiredCallback.getCallCount());
}


function testGRecaptchaMockFactory_visible_multipleInstances() {
  var responseCallback1 = goog.testing.recordFunction();
  var expiredCallback1 = goog.testing.recordFunction();
  var responseCallback2 = goog.testing.recordFunction();
  var expiredCallback2 = goog.testing.recordFunction();

  var mockFactory = new fireauth.GRecaptchaMockFactory();
  var id1 = mockFactory.render('recaptcha', {
    'sitekey': 'SITE_KEY1',
    'size': 'normal',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback1,
    'expired-callback': expiredCallback1
  });
  var id2 = mockFactory.render(myElement2, {
    'sitekey': 'SITE_KEY2',
    'size': 'normal',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback2,
    'expired-callback': expiredCallback2
  });
  // Confirm expected instance IDs.
  assertEquals(id1, startInstanceId);
  assertEquals(id2, startInstanceId + 1);

  // Initially no response should be available.
  assertNull(mockFactory.getResponse(id1));
  assertNull(mockFactory.getResponse(id2));
  assertEquals(0, responseCallback1.getCallCount());
  assertEquals(0, expiredCallback1.getCallCount());
  assertEquals(0, responseCallback2.getCallCount());
  assertEquals(0, expiredCallback2.getCallCount());

  // Instances should auto-solve after some delay.
  clock.tick(solveTimeMs);
  assertEquals('random0', mockFactory.getResponse(id1));
  assertEquals(1, responseCallback1.getCallCount());
  assertEquals(0, expiredCallback1.getCallCount());
  assertEquals('random1', mockFactory.getResponse(id2));
  assertEquals(1, responseCallback2.getCallCount());
  assertEquals(0, expiredCallback2.getCallCount());

  // When no ID provided, the first instance should be used.
  assertEquals('random0', mockFactory.getResponse(id1));

   // On expiration, response should be nullified and expired-callback triggered.
  clock.tick(expirationTimeMs);
  assertEquals(1, responseCallback1.getCallCount());
  assertEquals(1, expiredCallback1.getCallCount());
  assertNull(mockFactory.getResponse(id1));
  assertEquals(1, responseCallback2.getCallCount());
  assertEquals(1, expiredCallback2.getCallCount());
  assertNull(mockFactory.getResponse(id2));

  // Resetting one instance should not affect the other.
  mockFactory.reset(id2);
  clock.tick(solveTimeMs);
  assertEquals('random2', mockFactory.getResponse(id1));
  assertEquals(2, responseCallback1.getCallCount());
  assertEquals(1, expiredCallback1.getCallCount());
  assertNull(mockFactory.getResponse(id2));
  assertEquals(1, responseCallback2.getCallCount());
  assertEquals(1, expiredCallback2.getCallCount());

  // When no ID provided, the first instance is used by default.
  mockFactory.reset();
  clock.tick(solveTimeMs);
  assertNull(mockFactory.getResponse(id1));
  assertEquals(2, responseCallback1.getCallCount());
  assertEquals(1, expiredCallback1.getCallCount());
}


function testGRecaptchaMockFactory_invisible_multipleInstances() {
  var responseCallback1 = goog.testing.recordFunction();
  var expiredCallback1 = goog.testing.recordFunction();
  var responseCallback2 = goog.testing.recordFunction();
  var expiredCallback2 = goog.testing.recordFunction();

  var mockFactory = new fireauth.GRecaptchaMockFactory();
  var id1 = mockFactory.render('recaptcha', {
    'sitekey': 'SITE_KEY1',
    'size': 'invisible',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback1,
    'expired-callback': expiredCallback1
  });
  var id2 = mockFactory.render(myElement2, {
    'sitekey': 'SITE_KEY2',
    'size': 'invisible',
    'theme': 'dark ',
    'type': 'audio',
    'callback': responseCallback2,
    'expired-callback': expiredCallback2
  });

  // Confirm expected instance IDs.
  assertEquals(id1, startInstanceId);
  assertEquals(id2, startInstanceId + 1);

  // Initially no response should be available.
  assertNull(mockFactory.getResponse(id1));
  assertNull(mockFactory.getResponse(id2));
  assertEquals(0, responseCallback1.getCallCount());
  assertEquals(0, expiredCallback1.getCallCount());
  assertEquals(0, responseCallback2.getCallCount());
  assertEquals(0, expiredCallback2.getCallCount());

  // Invisible reCAPTCHAs should not auto-solve without click or execute call.
  clock.tick(100000);
  assertEquals(0, responseCallback1.getCallCount());
  assertEquals(0, expiredCallback1.getCallCount());
  assertEquals(0, responseCallback2.getCallCount());
  assertEquals(0, expiredCallback2.getCallCount());

  // Corresponding instance should auto-solve on click without affecting other
  // instance.
  goog.testing.events.fireClickSequence(myElement);
  clock.tick(solveTimeMs);
  assertEquals('random0', mockFactory.getResponse(id1));
  assertEquals(1, responseCallback1.getCallCount());
  assertEquals(0, expiredCallback1.getCallCount());
  assertNull(mockFactory.getResponse(id2));
  assertEquals(0, responseCallback2.getCallCount());
  assertEquals(0, expiredCallback2.getCallCount());

  // Second click should be ignored while there is a valid token.
  goog.testing.events.fireClickSequence(myElement);
  assertEquals('random0', mockFactory.getResponse(id1));
  assertEquals(1, responseCallback1.getCallCount());
  assertEquals(0, expiredCallback1.getCallCount());

  // execute should be ignored while there is a valid token.
  // When no ID is passed, the first instance created is used.
  mockFactory.execute();
  assertEquals('random0', mockFactory.getResponse(id1));
  assertEquals(1, responseCallback1.getCallCount());
  assertEquals(0, expiredCallback1.getCallCount());

  // Corresponding instance should auto-solve on click without affecting other
  // instance.
  goog.testing.events.fireClickSequence(myElement2);
  clock.tick(solveTimeMs);
  assertEquals('random0', mockFactory.getResponse(id1));
  assertEquals(1, responseCallback1.getCallCount());
  assertEquals(0, expiredCallback1.getCallCount());
  assertEquals('random1', mockFactory.getResponse(id2));
  assertEquals(1, responseCallback2.getCallCount());
  assertEquals(0, expiredCallback2.getCallCount());

  // Expire only first instance. Second instance should not be affected.
  clock.tick(expirationTimeMs - solveTimeMs);
  assertNull(mockFactory.getResponse(id1));
  assertEquals(1, responseCallback1.getCallCount());
  assertEquals(1, expiredCallback1.getCallCount());
  assertEquals('random1', mockFactory.getResponse(id2));
  assertEquals(1, responseCallback2.getCallCount());
  assertEquals(0, expiredCallback2.getCallCount());

  // Expire only second instance. First instance should not be affected.
  clock.tick(solveTimeMs);
  assertNull(mockFactory.getResponse(id2));
  assertEquals(1, responseCallback2.getCallCount());
  assertEquals(1, expiredCallback2.getCallCount());

  // Reset first instance. Clicks should no longer trigger response.
  mockFactory.reset(id1);
  goog.testing.events.fireClickSequence(myElement);
  clock.tick(solveTimeMs);
  assertNull(mockFactory.getResponse(id1));
  assertEquals(1, responseCallback1.getCallCount());
  assertEquals(1, expiredCallback1.getCallCount());

  // Click on second instance should solve.
  goog.testing.events.fireClickSequence(myElement2);
  clock.tick(solveTimeMs);
  assertEquals('random2', mockFactory.getResponse(id2));
  assertEquals(2, responseCallback2.getCallCount());
  assertEquals(1, expiredCallback2.getCallCount());

  // Reset second instance. Clicks should no longer trigger response.
  mockFactory.reset(id2);
  goog.testing.events.fireClickSequence(myElement2);
  clock.tick(solveTimeMs);
  assertNull(mockFactory.getResponse(id2));
  assertEquals(2, responseCallback2.getCallCount());
  assertEquals(1, expiredCallback2.getCallCount());
}
