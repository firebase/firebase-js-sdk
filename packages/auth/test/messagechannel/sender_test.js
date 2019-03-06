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
 * @fileoverview Tests for sender.js.
 */

goog.provide('fireauth.messagechannel.SenderTest');

goog.require('fireauth.messagechannel.Error');
goog.require('fireauth.messagechannel.Sender');
goog.require('fireauth.messagechannel.TimeoutDuration');
goog.require('fireauth.messagechannel.utils');
goog.require('goog.Promise');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.messagechannel.SenderTest');


var mockControl;
var clock;
var ignoreArgument;


function setUp() {
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl = new goog.testing.MockControl();
  mockControl.$resetAll();
  // Install mock clock.
  clock = new goog.testing.MockClock(true);
}


function tearDown() {
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
  goog.dispose(clock);
}


/**
 * @param {!mockControl} mockControl The MockControl reference.
 * @return {!MessageChannel} A mock messagechannel for testing.
 */
function createMockMessageChannel(mockControl) {
  var messageChannel = {
    port1: new goog.events.EventTarget(),
    port2: new goog.events.EventTarget()
  };
  messageChannel.port1.start = mockControl.createFunctionMock('start');
  messageChannel.port1.close = mockControl.createFunctionMock('close');
  return messageChannel;
}


function testSender_messageChannelUnsupported() {
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  initializeMessageChannel().$returns(null);
  postMessage(ignoreArgument, ignoreArgument, ignoreArgument).$never();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send('myEvent', {'a': 1, 'b': 2})
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(
            fireauth.messagechannel.Error.CONNECTION_UNAVAILABLE,
            error.message);
      });
}


function testSender_send_ackTimeout() {
  var eventId = '12345678';
  var eventType = 'myEvent';
  var data = {'a': 1, 'b': 2};
  var expectedRequest = {
    'eventType': eventType,
    'eventId': eventId,
    'data': data
  };

  var messageChannel = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  generateEventId().$returns(eventId).$once();
  messageChannel.port1.start().$once();
  postMessage(expectedRequest, [messageChannel.port2]).$does(function() {
    // Simulate ACK timeout.
    clock.tick(fireauth.messagechannel.TimeoutDuration.ACK);
  }).$once();
  messageChannel.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send(eventType, data)
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(
            fireauth.messagechannel.Error.UNSUPPORTED_EVENT,
            error.message);
      });
}


function testSender_send_ackTimeout_longTimeout() {
  var eventId = '12345678';
  var eventType = 'myEvent';
  var data = {'a': 1, 'b': 2};
  var expectedRequest = {
    'eventType': eventType,
    'eventId': eventId,
    'data': data
  };

  var messageChannel = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  generateEventId().$returns(eventId).$once();
  messageChannel.port1.start().$once();
  postMessage(expectedRequest, [messageChannel.port2]).$does(function() {
    // Simulate long ACK timeout.
    clock.tick(fireauth.messagechannel.TimeoutDuration.LONG_ACK);
  }).$once();
  messageChannel.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send(eventType, data, true)
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(
            fireauth.messagechannel.Error.UNSUPPORTED_EVENT,
            error.message);
      });
}


function testSender_send_invalidResponse() {
  var eventId = '12345678';
  var eventType = 'myEvent';
  var data = {'a': 1, 'b': 2};
  var expectedRequest = {
    'eventType': eventType,
    'eventId': eventId,
    'data': data
  };

  var messageChannel = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  generateEventId().$returns(eventId).$once();
  messageChannel.port1.start().$once();
  postMessage(expectedRequest, [messageChannel.port2]).$does(function() {
    var event = new goog.events.Event('message');
    // Simulate an invalid response.
    event.data = {
      'eventType': eventType,
      'eventId': eventId,
      'status': 'invalid'
    };
    messageChannel.port1.dispatchEvent(event);
  }).$once();
  messageChannel.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send(eventType, data)
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(
            fireauth.messagechannel.Error.INVALID_RESPONSE,
            error.message);
      });
}


function testSender_send_completionTimeout() {
  var eventId = '12345678';
  var eventType = 'myEvent';
  var data = {'a': 1, 'b': 2};
  var expectedRequest = {
    'eventType': eventType,
    'eventId': eventId,
    'data': data
  };

  var messageChannel = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  generateEventId().$returns(eventId).$once();
  messageChannel.port1.start().$once();
  postMessage(expectedRequest, [messageChannel.port2]).$does(function() {
    var event = new goog.events.Event('message');
    event.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'ack'
    };
    // Simulate ACK response sent successfully.
    messageChannel.port1.dispatchEvent(event);
    // Simulate completion response timing out.
    clock.tick(fireauth.messagechannel.TimeoutDuration.COMPLETION);
  }).$once();
  messageChannel.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send(eventType, data)
      .then(fail)
      .thenCatch(function(error) {
        assertEquals(
            fireauth.messagechannel.Error.TIMEOUT,
            error.message);
      });
}


function testSender_send_completionSuccess() {
  var eventId = '12345678';
  var eventType = 'myEvent';
  var data = {'a': 1, 'b': 2};
  var expectedRequest = {
    'eventType': eventType,
    'eventId': eventId,
    'data': data
  };
  var expectedSuccessResponse = [{
    'fulfilled': true,
    'value': {
      'c': 3,
      'd': 4
    }
  }];

  var messageChannel = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  generateEventId().$returns(eventId).$once();
  messageChannel.port1.start().$once();
  postMessage(expectedRequest, [messageChannel.port2]).$does(function() {
    var event1 = new goog.events.Event('message');
    var event2 = new goog.events.Event('message');
    event1.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'ack'
    };
    event2.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'done',
      'response': expectedSuccessResponse
    };
    // Simulate successful ACK and DONE responses.
    messageChannel.port1.dispatchEvent(event1);
    messageChannel.port1.dispatchEvent(event2);
  }).$once();
  messageChannel.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send(eventType, data)
      .then(function(result) {
        assertEquals(expectedSuccessResponse, result);
        sender.close();
        // Second call should do nothing.
        sender.close();
        // Connection should not be available anymore.
        return sender.send(eventType, data).then(fail, function(error) {
          assertEquals(
              fireauth.messagechannel.Error.CONNECTION_UNAVAILABLE,
              error.message);
        });
      });
}


function testSender_send_completionSuccess_longTimeout() {
  var eventId = '12345678';
  var eventType = 'myEvent';
  var data = {'a': 1, 'b': 2};
  var expectedRequest = {
    'eventType': eventType,
    'eventId': eventId,
    'data': data
  };
  var expectedSuccessResponse = [{
    'fulfilled': true,
    'value': {
      'c': 3,
      'd': 4
    }
  }];

  var messageChannel = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  generateEventId().$returns(eventId).$once();
  messageChannel.port1.start().$once();
  postMessage(expectedRequest, [messageChannel.port2]).$does(function() {
    var event1 = new goog.events.Event('message');
    var event2 = new goog.events.Event('message');
    event1.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'ack'
    };
    event2.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'done',
      'response': expectedSuccessResponse
    };
    // Simulate successful ACK and DONE responses.
    // Long timeout should be applied.
    clock.tick(fireauth.messagechannel.TimeoutDuration.LONG_ACK - 1);
    messageChannel.port1.dispatchEvent(event1);
    clock.tick(fireauth.messagechannel.TimeoutDuration.COMPLETION - 1);
    messageChannel.port1.dispatchEvent(event2);
  }).$once();
  messageChannel.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send(eventType, data, true)
      .then(function(result) {
        assertEquals(expectedSuccessResponse, result);
        sender.close();
        // Second call should do nothing.
        sender.close();
        // Connection should not be available anymore.
        return sender.send(eventType, data).then(fail, function(error) {
          assertEquals(
              fireauth.messagechannel.Error.CONNECTION_UNAVAILABLE,
              error.message);
        });
      });
}


function testSender_send_completionError() {
  var eventId = '12345678';
  var eventType = 'myEvent';
  var data = {'a': 1, 'b': 2};
  var expectedRequest = {
    'eventType': eventType,
    'eventId': eventId,
    'data': data
  };
  var expectedErrorResponse = [{
    'fulfilled': false,
    'reason': 'some error occurred'
  }];

  var messageChannel = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  // start called early.
  messageChannel.port1.start().$once();
  generateEventId().$returns(eventId).$once();
  postMessage(expectedRequest, [messageChannel.port2]).$does(function() {
    var event1 = new goog.events.Event('message');
    var event2 = new goog.events.Event('message');
    event1.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'ack'
    };
    event2.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'done',
      'response': expectedErrorResponse
    };
    clock.tick(fireauth.messagechannel.TimeoutDuration.ACK - 1);
    messageChannel.port1.dispatchEvent(event1);
    clock.tick(fireauth.messagechannel.TimeoutDuration.COMPLETION - 1);
    messageChannel.port1.dispatchEvent(event2);
  }).$once();
  messageChannel.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send(eventType, data)
      .then(function(result) {
        assertEquals(expectedErrorResponse, result);
      });
}


function testSender_send_closedConnection() {
  var eventId = '12345678';
  var eventType = 'myEvent';
  var data = {'a': 1, 'b': 2};
  var expectedRequest = {
    'eventType': eventType,
    'eventId': eventId,
    'data': data
  };
  var expectedErrorResponse = {
    'fulfilled': true,
    'value': 'success'
  };

  var messageChannel = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  // start called early.
  messageChannel.port1.start().$once();
  generateEventId().$returns(eventId).$once();
  postMessage(expectedRequest, [messageChannel.port2]).$does(function() {
    var event1 = new goog.events.Event('message');
    var event2 = new goog.events.Event('message');
    event1.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'ack'
    };
    event2.data = {
      'eventId': eventId,
      'eventType': eventType,
      'status': 'done',
      'response': expectedErrorResponse
    };
    messageChannel.port1.dispatchEvent(event1);
    // Simulate the connection gets closed.
    sender.close();
    messageChannel.port1.dispatchEvent(event2);
    // Second event will be ignored and the resolver will timeout.
    clock.tick(fireauth.messagechannel.TimeoutDuration.COMPLETION);
  }).$once();
  messageChannel.port1.close().$once();
  messageChannel.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  return sender.send(eventType, data)
      .then(fail, function(error) {
        assertEquals(
            fireauth.messagechannel.Error.TIMEOUT,
            error.message);
      });
}


function testSender_send_multipleMessages() {
  var eventId1 = '1234';
  var eventType1 = 'myEvent1';
  var data1 = {'request1': 'req1'};
  var expectedRequest1 = {
    'eventType': eventType1,
    'eventId': eventId1,
    'data': data1
  };
  var expectedSuccessResponse1 = [{
    'fulfilled': true,
    'value': {
      'response': 'res1'
    }
  }];

  var eventId2 = '5678';
  var eventType2 = 'myEvent2';
  var data2 = {'request2': 'req2'};
  var expectedRequest2 = {
    'eventType': eventType2,
    'eventId': eventId2,
    'data': data2
  };
  var expectedSuccessResponse2 = [{
    'fulfilled': true,
    'value': {
      'response': 'res2'
    }
  }];

  var eventId3 = '9012';
  var data3 = {'request3': 'req3'};
  var expectedRequest3 = {
    // Test with same event as above.
    'eventType': eventType1,
    'eventId': eventId3,
    'data': data3
  };
  var expectedSuccessResponse3 = [{
    'fulfilled': true,
    'value': {
      'response': 'res3'
    }
  }];

  var messageChannel = createMockMessageChannel(mockControl);
  var messageChannel2 = createMockMessageChannel(mockControl);
  var messageChannel3 = createMockMessageChannel(mockControl);
  var postMessage = mockControl.createFunctionMock('postMessage');
  var initializeMessageChannel = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'initializeMessageChannel');
  var generateEventId = mockControl.createMethodMock(
      fireauth.messagechannel.utils, 'generateEventId');
  initializeMessageChannel().$returns(messageChannel).$once();
  initializeMessageChannel().$returns(messageChannel2).$once();
  initializeMessageChannel().$returns(messageChannel3).$once();
  generateEventId().$returns(eventId1).$once();
  messageChannel.port1.start().$once();
  generateEventId().$returns(eventId2).$once();
  messageChannel2.port1.start().$once();
  generateEventId().$returns(eventId3).$once();
  messageChannel3.port1.start().$once();
  // First event.
  postMessage(expectedRequest1, [messageChannel.port2]).$does(function() {
    var event1 = new goog.events.Event('message');
    var event2 = new goog.events.Event('message');
    event1.data = {
      'eventId': eventId1,
      'eventType': eventType1,
      'status': 'ack'
    };
    event2.data = {
      'eventId': eventId1,
      'eventType': eventType1,
      'status': 'done',
      'response': expectedSuccessResponse1
    };
    messageChannel.port1.dispatchEvent(event1);
    messageChannel.port1.dispatchEvent(event2);
  }).$once();
  // Second event.
  postMessage(expectedRequest2, [messageChannel2.port2]).$does(function() {
    var event1 = new goog.events.Event('message');
    var event2 = new goog.events.Event('message');
    event1.data = {
      'eventId': eventId2,
      'eventType': eventType2,
      'status': 'ack'
    };
    event2.data = {
      'eventId': eventId2,
      'eventType': eventType2,
      'status': 'done',
      'response': expectedSuccessResponse2
    };
    messageChannel2.port1.dispatchEvent(event1);
    messageChannel2.port1.dispatchEvent(event2);
  }).$once();
  // Third event.
  postMessage(expectedRequest3, [messageChannel3.port2]).$does(function() {
    var event1 = new goog.events.Event('message');
    var event2 = new goog.events.Event('message');
    event1.data = {
      'eventId': eventId3,
      'eventType': eventType1,
      'status': 'ack'
    };
    event2.data = {
      'eventId': eventId3,
      'eventType': eventType1,
      'status': 'done',
      'response': expectedSuccessResponse3
    };
    messageChannel3.port1.dispatchEvent(event1);
    messageChannel3.port1.dispatchEvent(event2);
  }).$once();
  messageChannel.port1.close().$once();
  messageChannel2.port1.close().$once();
  messageChannel3.port1.close().$once();
  mockControl.$replayAll();

  var sender = new fireauth.messagechannel.Sender({
    'postMessage': postMessage
  });
  // goog.Promise.all will fail if a single promise fails.
  // Test with mixture of events (2 types of events). Each request will have a
  // unique event ID.
  return goog.Promise.all(
      [
        sender.send(eventType1, data1),
        sender.send(eventType2, data2),
        sender.send(eventType1, data3)
      ]).then(function(results) {
        assertEquals(3, results.length);
        assertEquals(expectedSuccessResponse1, results[0]);
        assertEquals(expectedSuccessResponse2, results[1]);
        assertEquals(expectedSuccessResponse3, results[2]);
      });
}

