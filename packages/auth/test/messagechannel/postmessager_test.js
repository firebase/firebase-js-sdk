/**
 * @fileoverview Tests for postmessager.js.
 */

goog.provide('fireauth.messagechannel.PostMessagerTest');

goog.require('fireauth.messagechannel.WindowPostMessager');
goog.require('fireauth.messagechannel.WorkerClientPostMessager');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.messagechannel.PostMessagerTest');


var mockControl;


function setUp() {
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


function testWindowPostMessager_defaultTargetOrigin() {
  var message = {'a': 1, 'b': 2};
  var transfer = [{'tranferable1': {}}, {'tranferable2': {}}];
  var targetOrigin = '*';
  var postMessage = mockControl.createFunctionMock('postMessage');
  postMessage(message, targetOrigin, transfer).$once();
  mockControl.$replayAll();

  var windowPostMessager = new fireauth.messagechannel.WindowPostMessager(
      {'postMessage': postMessage});
  windowPostMessager.postMessage(message, transfer);
}


function testWindowPostMessager_explicitTargetOrigin() {
  var message = {'a': 1, 'b': 2};
  var transfer = [{'tranferable1': {}}, {'tranferable2': {}}];
  var targetOrigin = 'http://www.example.com';
  var postMessage = mockControl.createFunctionMock('postMessage');
  postMessage(message, targetOrigin, transfer).$once();
  mockControl.$replayAll();

  var windowPostMessager = new fireauth.messagechannel.WindowPostMessager(
      {'postMessage': postMessage}, targetOrigin);
  windowPostMessager.postMessage(message, transfer);
}


function testWorkerClientPostMessager() {
  var message = {'a': 1, 'b': 2};
  var transfer = [{'tranferable1': {}}, {'tranferable2': {}}];
  var postMessage = mockControl.createFunctionMock('postMessage');
  postMessage(message, transfer);
  mockControl.$replayAll();

  var workerClientPostMessager =
      new fireauth.messagechannel.WorkerClientPostMessager(
          {'postMessage': postMessage});
  workerClientPostMessager.postMessage(message, transfer);
}
