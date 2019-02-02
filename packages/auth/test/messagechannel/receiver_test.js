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
 * @fileoverview Tests for receiver.js.
 */

goog.provide('fireauth.messagechannel.ReceiverTest');

goog.require('fireauth.messagechannel.Receiver');
goog.require('goog.Promise');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.messagechannel.ReceiverTest');


var mockControl;


function setUp() {
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
}


function testReceiver_singleHandler_success() {
  // Used to prevent the test from finishing prematurely before the underlying
  // logic completes.
  var sendCompletionSignal;
  var eventType = 'eventType1';
  var eventId = '1234';
  var origin = 'https://www.example.com';
  var data = {
    'a': 1,
    'b': 2
  };
  var expectedResponse = {
    'success': true
  };
  var eventTarget = new goog.events.EventTarget();
  var postMessage = mockControl.createFunctionMock('postMessage');
  var handler1 = mockControl.createFunctionMock('handler1');
  var handler2 = mockControl.createFunctionMock('handler2');
  var event = new goog.events.Event('message');
  event.origin = origin;
  event.ports = [{'postMessage': postMessage}];
  event.data = {
    'eventId': eventId,
    'eventType': eventType,
    'data': data
  };
  postMessage({
    'status': 'ack',
    'eventId': eventId,
    'eventType': eventType,
    'response': null
  }).$once();
  handler1(origin, data).$does(function() {
    return expectedResponse;
  }).$once();
  postMessage({
    'status': 'done',
    'eventId': eventId,
    'eventType': eventType,
    'response': [{
      'fulfilled': true,
      'value': expectedResponse
    }]
  }).$does(function() {
    sendCompletionSignal();
  }).$once();
  handler2().$never();
  mockControl.$replayAll();

  var receiver = new fireauth.messagechannel.Receiver(eventTarget);
  assertTrue(receiver.isListeningTo(eventTarget));
  assertFalse(receiver.isListeningTo(new goog.events.EventTarget()));
  receiver.subscribe(eventType, handler1);
  receiver.subscribe('unsupportedEvent', handler2);
  // Simulate incoming sender message event.
  eventTarget.dispatchEvent(event);
  receiver.unsubscribe(eventType, handler1);
  // Second event should not have any effect.
  eventTarget.dispatchEvent(event);

  return new goog.Promise(function(resolve, reject) {
    sendCompletionSignal = resolve;
  });
}


function testReceiver_singleHandler_error() {
  var sendCompletionSignal;
  var eventType = 'eventType1';
  var eventId = '1234';
  var origin = 'https://www.example.com';
  var data = {
    'a': 1,
    'b': 2
  };
  var expectedError = new Error('some error occurred');
  var eventTarget = new goog.events.EventTarget();
  var postMessage = mockControl.createFunctionMock('postMessage');
  var handler1 = mockControl.createFunctionMock('handler1');
  var handler2 = mockControl.createFunctionMock('handler2');
  var event = new goog.events.Event('message');
  event.origin = origin;
  event.ports = [{'postMessage': postMessage}];
  event.data = {
    'eventId': eventId,
    'eventType': eventType,
    'data': data
  };
  postMessage({
    'status': 'ack',
    'eventId': eventId,
    'eventType': eventType,
    'response': null
  }).$once();
  handler1(origin, data).$does(function() {
    throw expectedError;
  }).$once();
  postMessage({
    'status': 'done',
    'eventId': eventId,
    'eventType': eventType,
    'response': [{
      'fulfilled': false,
      'reason': expectedError.message
    }]
  }).$does(function() {
    sendCompletionSignal();
  }).$once();
  handler2().$never();
  mockControl.$replayAll();

  var receiver = new fireauth.messagechannel.Receiver(eventTarget);
  receiver.subscribe(eventType, handler1);
  receiver.subscribe('unsupportedEvent', handler2);
  // Simulate incoming sender message event.
  eventTarget.dispatchEvent(event);
  receiver.unsubscribe(eventType, handler1);
  // Second event should not have any effect.
  eventTarget.dispatchEvent(event);

  return new goog.Promise(function(resolve, reject) {
    sendCompletionSignal = resolve;
  });
}


function testReceiver_multipleHandler_singleEvent_success() {
  var sendCompletionSignal;
  var eventType = 'eventType1';
  var eventId = '1234';
  var origin = 'https://www.example.com';
  var data = {
    'a': 1,
    'b': 2
  };
  var expectedResponse1 = {
    'c': 3
  };
  var expectedResponse2 = {
    'd': 4
  };
  var eventTarget = new goog.events.EventTarget();
  var postMessage = mockControl.createFunctionMock('postMessage');
  var handler1 = mockControl.createFunctionMock('handler1');
  var handler2 = mockControl.createFunctionMock('handler2');
  var handler3 = mockControl.createFunctionMock('handler3');
  var event = new goog.events.Event('message');
  event.origin = origin;
  event.ports = [{'postMessage': postMessage}];
  event.data = {
    'eventId': eventId,
    'eventType': eventType,
    'data': data
  };
  // First handler.
  postMessage({
    'status': 'ack',
    'eventId': eventId,
    'eventType': eventType,
    'response': null
  }).$once();
  handler1(origin, data).$does(function() {
    return expectedResponse1;
  }).$once();
  // Second handler.
  handler2(origin, data).$does(function() {
    return expectedResponse2;
  }).$once();
  postMessage({
    'status': 'done',
    'eventId': eventId,
    'eventType': eventType,
    'response': [{
      'fulfilled': true,
      'value': expectedResponse1
    }, {
      'fulfilled': true,
      'value': expectedResponse2
    }]
  }).$does(function() {
    sendCompletionSignal();
  }).$once();
  // Third handler.
  handler3().$never();
  mockControl.$replayAll();

  var receiver = new fireauth.messagechannel.Receiver(eventTarget);
  assertTrue(receiver.isListeningTo(eventTarget));
  assertFalse(receiver.isListeningTo(new goog.events.EventTarget()));
  receiver.subscribe(eventType, handler1);
  receiver.subscribe(eventType, handler2);
  receiver.subscribe('unsupportedEvent', handler3);
  // Simulate incoming sender message event. handler1 and handler2 should
  // trigger.
  eventTarget.dispatchEvent(event);
  receiver.unsubscribe(eventType, handler1);
  receiver.unsubscribe(eventType, handler2);
  // Second event should not have any effect.
  eventTarget.dispatchEvent(event);

  return new goog.Promise(function(resolve, reject) {
    sendCompletionSignal = resolve;
  });
}


function testReceiver_multipleHandler_singleEvent_error() {
  var sendCompletionSignal;
  var eventType = 'eventType1';
  var eventId = '1234';
  var origin = 'https://www.example.com';
  var data = {
    'a': 1,
    'b': 2
  };
  var expectedResponse1 = {
    'c': 3
  };
  var expectedError = new Error('some error occurred');
  var eventTarget = new goog.events.EventTarget();
  var postMessage = mockControl.createFunctionMock('postMessage');
  var handler1 = mockControl.createFunctionMock('handler1');
  var handler2 = mockControl.createFunctionMock('handler2');
  var handler3 = mockControl.createFunctionMock('handler3');
  var event = new goog.events.Event('message');
  event.origin = origin;
  event.ports = [{'postMessage': postMessage}];
  event.data = {
    'eventId': eventId,
    'eventType': eventType,
    'data': data
  };
  // First handler.
  postMessage({
    'status': 'ack',
    'eventId': eventId,
    'eventType': eventType,
    'response': null
  }).$once();
  handler1(origin, data).$does(function() {
    return expectedResponse1;
  }).$once();
  // Second handler.
  handler2(origin, data).$does(function() {
    throw expectedError;
  }).$once();
  postMessage({
    'status': 'done',
    'eventId': eventId,
    'eventType': eventType,
    'response': [{
      'fulfilled': true,
      'value': expectedResponse1
    }, {
      'fulfilled': false,
      'reason': expectedError.message
    }]
  }).$does(function() {
    sendCompletionSignal();
  }).$once();
  // Third handler.
  handler3().$never();
  mockControl.$replayAll();

  var receiver = new fireauth.messagechannel.Receiver(eventTarget);
  assertTrue(receiver.isListeningTo(eventTarget));
  assertFalse(receiver.isListeningTo(new goog.events.EventTarget()));
  receiver.subscribe(eventType, handler1);
  receiver.subscribe(eventType, handler2);
  receiver.subscribe('unsupportedEvent', handler3);
  // Simulate incoming sender message event. handler1 and handler2 should
  // trigger.
  eventTarget.dispatchEvent(event);
  receiver.unsubscribe(eventType, handler1);
  receiver.unsubscribe(eventType, handler2);
  // Second event should not have any effect.
  eventTarget.dispatchEvent(event);

  return new goog.Promise(function(resolve, reject) {
    sendCompletionSignal = resolve;
  });
}


function testReceiver_multipleHandler_multipleEvent_success() {
  var sendCompletionSignal;
  var eventType1 = 'eventType1';
  var eventId1 = '1234';
  var origin1 = 'https://www.example.com';
  var data1 = {
    'a': 1,
    'b': 2
  };
  var expectedResponse1 = {
    'response': 'res1'
  };
  var eventType2 = 'eventType2';
  var eventId2 = '5678';
  var origin2 = 'https://www.other.com';
  var data2 = {
    'c': 3,
    'd': 4
  };
  var expectedResponse2 = {
    'response': 'res2'
  };
  var eventTarget = new goog.events.EventTarget();
  var postMessage = mockControl.createFunctionMock('postMessage');
  var handler1 = mockControl.createFunctionMock('handler1');
  var handler2 = mockControl.createFunctionMock('handler2');
  var handler3 = mockControl.createFunctionMock('handler3');
  var event1 = new goog.events.Event('message');
  event1.origin = origin1;
  event1.ports = [{'postMessage': postMessage}];
  event1.data = {
    'eventId': eventId1,
    'eventType': eventType1,
    'data': data1
  };
  var event2 = new goog.events.Event('message');
  event2.origin = origin2;
  event2.ports = [{'postMessage': postMessage}];
  event2.data = {
    'eventId': eventId2,
    'eventType': eventType2,
    'data': data2
  };
  // First handler.
  postMessage({
    'status': 'ack',
    'eventId': eventId1,
    'eventType': eventType1,
    'response': null
  }).$once();
  postMessage({
    'status': 'ack',
    'eventId': eventId2,
    'eventType': eventType2,
    'response': null
  }).$once();
  handler1(origin1, data1).$does(function() {
    return expectedResponse1;
  }).$once();
  // Second handler.
  handler2(origin2, data2).$does(function() {
    return expectedResponse2;
  }).$once();
  postMessage({
    'status': 'done',
    'eventId': eventId1,
    'eventType': eventType1,
    'response': [{
      'fulfilled': true,
      'value': expectedResponse1
    }]
  }).$once();
  postMessage({
    'status': 'done',
    'eventId': eventId2,
    'eventType': eventType2,
    'response': [{
      'fulfilled': true,
      'value': expectedResponse2
    }]
  }).$does(function() {
    sendCompletionSignal();
  }).$once();
  // Third handler.
  handler3().$never();
  mockControl.$replayAll();

  var receiver = new fireauth.messagechannel.Receiver(eventTarget);
  assertTrue(receiver.isListeningTo(eventTarget));
  assertFalse(receiver.isListeningTo(new goog.events.EventTarget()));
  // Subscribe, unsubscribe and then re-subscribe handler1.
  receiver.subscribe(eventType1, handler1);
  receiver.unsubscribe(eventType1, handler1);
  receiver.subscribe(eventType1, handler1);

  receiver.subscribe(eventType2, handler2);
  receiver.subscribe('unsupportedEvent', handler3);
  // Simulate 2 incoming sender message events (eventType 1 and 2). handler1 and
  // handler2 should trigger.
  eventTarget.dispatchEvent(event1);
  eventTarget.dispatchEvent(event2);

  return new goog.Promise(function(resolve, reject) {
    sendCompletionSignal = resolve;
  });
}


function testReceiver_singleHandler_unsubscribeAll() {
  var eventType = 'eventType1';
  var eventId = '1234';
  var origin = 'https://www.example.com';
  var data = {
    'a': 1,
    'b': 2
  };
  var eventTarget = new goog.events.EventTarget();
  var postMessage = mockControl.createFunctionMock('postMessage');
  var handler1 = mockControl.createFunctionMock('handler1');
  var handler2 = mockControl.createFunctionMock('handler2');
  var event = new goog.events.Event('message');
  event.origin = origin;
  event.ports = [{'postMessage': postMessage}];
  event.data = {
    'eventId': eventId,
    'eventType': eventType,
    'data': data
  };
  postMessage(ignoreArgument).$never();
  handler1().$never();
  handler2().$never();
  mockControl.$replayAll();

  var receiver = new fireauth.messagechannel.Receiver(eventTarget);
  assertTrue(receiver.isListeningTo(eventTarget));
  assertFalse(receiver.isListeningTo(new goog.events.EventTarget()));
  receiver.subscribe(eventType, handler1);
  receiver.subscribe(eventType, handler2);
  // Unsubscribe all handlers.
  receiver.unsubscribe(eventType);
  // No handler should be triggered.
  eventTarget.dispatchEvent(event);
}
