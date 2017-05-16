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
goog.provide('fb.realtime.polling.PacketReceiver');

/**
 * This class ensures the packets from the server arrive in order
 * This class takes data from the server and ensures it gets passed into the callbacks in order.
 * @param onMessage
 * @constructor
 */
fb.realtime.polling.PacketReceiver = function(onMessage) {
  this.onMessage_ = onMessage;
  this.pendingResponses = [];
  this.currentResponseNum = 0;
  this.closeAfterResponse = -1;
  this.onClose = null;
};

fb.realtime.polling.PacketReceiver.prototype.closeAfter = function(responseNum, callback) {
  this.closeAfterResponse = responseNum;
  this.onClose = callback;
  if (this.closeAfterResponse < this.currentResponseNum) {
    this.onClose();
    this.onClose = null;
  }
};

/**
 * Each message from the server comes with a response number, and an array of data. The responseNumber
 * allows us to ensure that we process them in the right order, since we can't be guaranteed that all
 * browsers will respond in the same order as the requests we sent
 * @param {number} requestNum
 * @param {Array} data
 */
fb.realtime.polling.PacketReceiver.prototype.handleResponse = function(requestNum, data) {
  this.pendingResponses[requestNum] = data;
  while (this.pendingResponses[this.currentResponseNum]) {
    var toProcess = this.pendingResponses[this.currentResponseNum];
    delete this.pendingResponses[this.currentResponseNum];
    for (var i = 0; i < toProcess.length; ++i) {
      if (toProcess[i]) {
        var self = this;
        fb.core.util.exceptionGuard(function() {
          self.onMessage_(toProcess[i]);
        });
      }
    }
    if (this.currentResponseNum === this.closeAfterResponse) {
      if (this.onClose) {
        clearTimeout(this.onClose);
        this.onClose();
        this.onClose = null;
      }
      break;
    }
    this.currentResponseNum++;
  }
};

