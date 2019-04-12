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
