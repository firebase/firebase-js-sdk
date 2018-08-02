/**
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
 * @fileoverview Defines the MessageChannel based wrapper for sending messages
 * to other windows or workers.
 */

goog.provide('fireauth.messagechannel.Sender');

goog.require('fireauth.messagechannel.Error');
goog.require('fireauth.messagechannel.PostMessager');
goog.require('fireauth.messagechannel.Status');
goog.require('fireauth.messagechannel.TimeoutDuration');
goog.require('fireauth.messagechannel.utils');
goog.require('goog.Promise');
goog.require('goog.array');



/**
 * Helper static function to create messageChannel errors.
 * @param {!fireauth.messagechannel.Error} errorId The error identifier.
 * @param {?string=} opt_message The optional error message used for generic
 *     error types.
 * @return {!Error} The constructed error to return.
 * @private
 */
fireauth.messagechannel.createError_ = function(errorId, opt_message) {
  if (errorId != fireauth.messagechannel.Error.UNKNOWN || !opt_message) {
    return new Error(errorId);
  } else {
    return new Error(opt_message);
  }
};


/**
 * Initializes a channel to send specific messages to a specified PostMessage.
 * @param {!fireauth.messagechannel.PostMessager} postMessager The post messager
 *     to send messages to.
 * @constructor
 */
fireauth.messagechannel.Sender = function(postMessager) {
  /**
   * @const @private {!fireauth.messagechannel.PostMessager} The messageChannel
   *     PostMessager.
   */
  this.postMessager_ = postMessager;
  /**
   * @private {?MessageChannel} The messageChannel reference if
   *     supported.
   */
  this.messageChannel_ =
      fireauth.messagechannel.utils.initializeMessageChannel();
  /** @private {boolean} Whether the connection was started. */
  this.started_ = false;
  /**
   * @const @private {!Array<function(!Event)>} The list of subscribed message
   *     handlers.
   */
  this.messageHandlers_ = [];
};


/**
 * Sends a message to the receiver. The message is identified by an event
 * type and can carry additional payload data.
 * The sender protocol works as follows:
 * <ul>
 * <li>The request is constructed and postMessaged to the receiver with the port
 *     used to reply back to sender.</li>
 * <li>The operation will block until an ACK response is received. If not, it
 *     will timeout and reject with an error.</li>
 * <li>If an ACK response is received, it will wait longer for the full
 *     processed response.</li>
 * <li>Once the response is received, the operation will resolve with that
 *     result.</li>
 * </ul>
 *
 * @param {string} eventType The event type identifying the message. This is
 *     used to help the receiver handle this message.
 * @param {?Object=} opt_data The optional data to send along the message.
 * @return {!goog.Promise<!Array<{fulfilled: boolean,
 *                                value: (*|undefined),
 *                                reason: (*|undefined)}>>} A promise that
 *     resolves with the receiver responses.
 */
fireauth.messagechannel.Sender.prototype.send = function(eventType, opt_data) {
  var self = this;
  var eventId;
  var data = opt_data || {};
  var onMessage;
  var ackTimer;
  var completionTimer;
  return new goog.Promise(function(resolve, reject) {
    // Send message along with port for reply
    if (self.messageChannel_) {
      eventId = fireauth.messagechannel.utils.generateEventId();
      // Start the connection if not already started.
      self.start();
      // Handler for receiving message reply from receiver.
      // Blocks promise resolution until service worker detects the change.
      ackTimer = setTimeout(function() {
        // The receiver may not be able to handle the response for various
        // reasons: library not included, or an incompatible version of
        // the library is included.
        // Timeout after some time.
        reject(fireauth.messagechannel.createError_(
            fireauth.messagechannel.Error.UNSUPPORTED_EVENT));
      }, fireauth.messagechannel.TimeoutDuration.ACK);
      onMessage = function(event) {
        // Process only the expected events that match current event ID.
        if (event.data['eventId'] !== eventId) {
          return;
        }
        // This avoids adding a long wait when the receiver is unable to handle
        // the event.
        if (event.data['status'] === fireauth.messagechannel.Status.ACK) {
          clearTimeout(ackTimer);
          // Set longer timeout to allow receiver to process.
          completionTimer = setTimeout(function() {
            reject(fireauth.messagechannel.createError_(
                fireauth.messagechannel.Error.TIMEOUT));
          }, fireauth.messagechannel.TimeoutDuration.COMPLETION);
          return;
        } else if (event.data['status'] ===
                   fireauth.messagechannel.Status.DONE) {
          clearTimeout(completionTimer);
          if (typeof event.data['response'] !== 'undefined') {
            resolve(event.data['response']);
          } else {
            reject(fireauth.messagechannel.createError_(
                fireauth.messagechannel.Error.UNKNOWN));
          }
        } else {
          clearTimeout(ackTimer);
          clearTimeout(completionTimer);
          reject(fireauth.messagechannel.createError_(
              fireauth.messagechannel.Error.INVALID_RESPONSE));
        }
      };
      self.messageHandlers_.push(onMessage);
      self.messageChannel_.port1.addEventListener('message', onMessage);
      var request = {
        'eventType': eventType,
        'eventId': eventId,
        'data': data
      };
      // It is possible the receiver cannot handle this result.
      // For example, the developer may not be including the library in the
      // receiver or using an outdated version.
      self.postMessager_.postMessage(
          request,
          [self.messageChannel_.port2]);
    } else {
      // No connection available.
      reject(fireauth.messagechannel.createError_(
          fireauth.messagechannel.Error.CONNECTION_UNAVAILABLE));
    }
  }).then(function(result) {
    // On completion, remove the message handler. A new one is needed for a
    // new message.
    self.removeMessageHandler_(onMessage);
    return result;
  }).thenCatch(function(error) {
    // On failure, remove the message handler. A new one is needed for a new
    // message.
    self.removeMessageHandler_(onMessage);
    throw error;
  });
};


/**
 * @param {function(!Event)} onMessage The message handler to remove.
 * @private
 */
fireauth.messagechannel.Sender.prototype.removeMessageHandler_ =
    function(onMessage) {
  if (this.messageChannel_) {
    goog.array.removeAllIf(this.messageHandlers_, function(ele) {
      return ele == onMessage;
    });
    this.messageChannel_.port1.removeEventListener('message', onMessage);
  }
};


/**
 * Removing all subscribed message handlers.
 * @private
 */
fireauth.messagechannel.Sender.prototype.removeAllMessageHandlers_ =
    function() {
  while (this.messageHandlers_.length > 0) {
    var onMessage = this.messageHandlers_.pop();
    this.messageChannel_.port1.removeEventListener('message', onMessage);
  }
};


/** Closes the underlying MessageChannel connection. */
fireauth.messagechannel.Sender.prototype.close = function() {
  if (this.messageChannel_) {
    // Any pending event will timeout.
    this.removeAllMessageHandlers_();
    // No new messages will be returned.
    this.messageChannel_.port1.close();
    this.messageChannel_ = null;
    this.started_ = false;
  }
};


/** Starts the underlying MessageChannel connection if not already started. */
fireauth.messagechannel.Sender.prototype.start = function() {
  // Note that re-connection is not supported. If a connection is closed, a new
  // sender has to be created.
  if (this.messageChannel_ && !this.started_) {
    this.messageChannel_.port1.start();
    this.started_ = true;
  }
};
