import { exceptionGuard } from "../../core/util/util";

/**
 * This class ensures the packets from the server arrive in order
 * This class takes data from the server and ensures it gets passed into the callbacks in order.
 * @param onMessage
 * @constructor
 */
export const PacketReceiver = function(onMessage) {
  this.onMessage_ = onMessage;
  this.pendingResponses = [];
  this.currentResponseNum = 0;
  this.closeAfterResponse = -1;
  this.onClose = null;
};

PacketReceiver.prototype.closeAfter = function(responseNum, callback) {
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
PacketReceiver.prototype.handleResponse = function(requestNum, data) {
  this.pendingResponses[requestNum] = data;
  while (this.pendingResponses[this.currentResponseNum]) {
    var toProcess = this.pendingResponses[this.currentResponseNum];
    delete this.pendingResponses[this.currentResponseNum];
    for (var i = 0; i < toProcess.length; ++i) {
      if (toProcess[i]) {
        var self = this;
        exceptionGuard(function() {
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

