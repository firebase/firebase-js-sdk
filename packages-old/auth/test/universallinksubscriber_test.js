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
 * @fileoverview Tests for universallinksubscriber.js
 */

goog.provide('fireauth.UniversalLinkSubscriberTest');

goog.require('fireauth.UniversalLinkSubscriber');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.UniversalLinkSubscriberTest');


var universalLinks = null;
var eventData1 = {url: 'URL1'};
var eventData2 = {url: 'URLK2'};
var eventData3 = {url: 'URLK2'};


function setUp() {
  // Initialize mock universalLinks plugin.
  universalLinks = {};
  universalLinks.subscribe = function(name, cb) {
    // Only one subscriber allowed.
    assertUndefined(universalLinks.cb);
    // No name should be supplied.
    assertNull(name);
    // Save callback.
    universalLinks.cb = cb;
  };

}


function testUniversalLinkSubscriber() {
  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var universalLinkSubscriber = new fireauth.UniversalLinkSubscriber();
  universalLinkSubscriber.subscribe(listener1);
  universalLinkSubscriber.subscribe(listener2);
  // Trigger first event.
  universalLinks.cb(eventData1);
  // Both listeners triggered.
  assertEquals(1, listener1.getCallCount());
  assertEquals(eventData1, listener1.getLastCall().getArgument(0));
  assertEquals(1, listener2.getCallCount());
  assertEquals(eventData1, listener2.getLastCall().getArgument(0));

  // Remove listener 2.
  universalLinkSubscriber.unsubscribe(listener2);
  // Trigger second event.
  universalLinks.cb(eventData2);
  // Only first listener triggered.
  assertEquals(2, listener1.getCallCount());
  assertEquals(eventData2, listener1.getLastCall().getArgument(0));
  assertEquals(1, listener2.getCallCount());

  // Remove remaining listener.
  universalLinkSubscriber.unsubscribe(listener1);
  // Trigger third event.
  universalLinks.cb(eventData3);
  // No listener triggered
  assertEquals(2, listener1.getCallCount());
  assertEquals(1, listener2.getCallCount());

  // Re-subscribe first listener.
  universalLinkSubscriber.subscribe(listener1);
  // Trigger first event again.
  universalLinks.cb(eventData1);
  // Only first listener triggered.
  assertEquals(3, listener1.getCallCount());
  assertEquals(eventData1, listener1.getLastCall().getArgument(0));
  assertEquals(1, listener2.getCallCount());
}


function testUniversalLinkSubscriber_unavailable() {
  // Test when universal link plugin not available, no error is thrown.
  universalLinks = null;
  var listener1 = goog.testing.recordFunction();
  var universalLinkSubscriber = new fireauth.UniversalLinkSubscriber();
  assertNotThrows(function() {
    universalLinkSubscriber.subscribe(listener1);
    universalLinkSubscriber.unsubscribe(listener1);
  });
}


function testUniversalLinkSubscriber_clear() {
  var instance = fireauth.UniversalLinkSubscriber.getInstance();
  // Same instance should be returned.
  assertEquals(instance, fireauth.UniversalLinkSubscriber.getInstance());
  fireauth.UniversalLinkSubscriber.clear();
  // After clearing, new instance should be returned.
  assertNotEquals(instance, fireauth.UniversalLinkSubscriber.getInstance());
}

