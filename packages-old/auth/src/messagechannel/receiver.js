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
 * @fileoverview Defines the MessageChannel based wrapper for receiving
 * messages from other windows or workers.
 */

goog.provide('fireauth.messagechannel.Receiver');

goog.require('fireauth.messagechannel.Status');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.object');


/**
 * Initializes a channel to receive specific messages from a specified event
 * target.
 * Note receivers should not be manually instantiated. Instead `getInstance()`
 * should be used instead to get a receiver instance for a specified event
 * target.
 * @param {!EventTarget} eventTarget The event target to listen to.
 * @constructor
 */
fireauth.messagechannel.Receiver = function(eventTarget) {
  /**
   * @const @private {!EventTarget} The messageChannel event target.
   */
  this.eventTarget_ = eventTarget;
  /**
   * @const @private {!Object.<string,
   *                    !Array<function(string, *):!goog.Promise<?>|void>>}
   *     This is the event type to handlers hash map. It is used to hold the
   *     corresponding handlers for specified events.
   */
  this.eventHandlers_ = {};
  /**
   * @const @private {function(!Event)} The internal 'message' event handler
   *     used to reroute the request to corresponding subscribed handlers.
   */
  this.messageEventHandler_ = goog.bind(this.handleEvent_, this);
};


/**
 * @param {!EventTarget} eventTarget The event target to check for.
 * @return {boolean} Whether the receiver is listening to the specified event
 *     target.
 */
fireauth.messagechannel.Receiver.prototype.isListeningTo =
    function(eventTarget) {
  return this.eventTarget_ == eventTarget;
};


/**
 * @const @private {!Array<!fireauth.messagechannel.Receiver>} The list of all
 *     created `fireauth.messagechannel.Receiver` instances.
 */
fireauth.messagechannel.Receiver.receivers_ = [];


/**
 * Return a receiver instance for the specified event target. This is needed
 * since one instance can be available per event target. Otherwise receivers
 * could clobber each other.
 * @param {!EventTarget} eventTarget The event target to listen to.
 * @return {!fireauth.messagechannel.Receiver} The receiver instance for the
 *     specified event target.
 */
fireauth.messagechannel.Receiver.getInstance = function(eventTarget) {
  // The results are stored in an array since objects can't be keys for other
  // objects. In addition, setting a unique property on an event target as a
  // hash map key may not be allowed due to CORS restrictions.
  var instance;
  goog.array.forEach(
      fireauth.messagechannel.Receiver.receivers_,
      function(receiver) {
        if (receiver.isListeningTo(eventTarget)) {
          instance = receiver;
        }
      });
  if (!instance) {
    instance = new fireauth.messagechannel.Receiver(eventTarget);
    fireauth.messagechannel.Receiver.receivers_.push(instance);
  }
  return instance;
};


/**
 * Handles a PostMessage event based on the following protocol:
 * <ul>
 * <li>When an event is first detected, check there is a subscribed handler.
 *     If not, do nothing as there could be other listeners.</li>
 * <li>If there is a subscribed event, reply with an ACK event to notify the
 *     sender that the event can be handled.</li>
 * <li>Trigger the subscribed handlers.</li>
 * <li>Reply again with the combined results of all subscribed handlers and
 *     return the response back.</li>
 * </ul>
 *
 * @param {!Event} event The PostMessage event to handle.
 * @private
 */
fireauth.messagechannel.Receiver.prototype.handleEvent_ = function(event) {
  // Respond to sender first with ack reply. This will let the client
  // know that the service worker can handle this event.
  var eventType = event.data['eventType'];
  var eventId = event.data['eventId'];
  var handlers = this.eventHandlers_[eventType];
  if (handlers && handlers.length > 0) {
    // Event can be handled.
    event.ports[0].postMessage({
      'status': fireauth.messagechannel.Status.ACK,
      'eventId': eventId,
      'eventType': eventType,
      'response': null
    });
    var promises = [];
    goog.array.forEach(handlers, function(handler) {
      // Wrap in promise in case the handler doesn't return a promise.
      promises.push(goog.Promise.resolve().then(function() {
        return handler(event.origin, event.data['data']);
      }));
    });
    // allSettled is more flexible as it executes all the promises passed and
    // returns whether they succeeded or failed.
    goog.Promise.allSettled(promises)
        .then(function(result) {
          // allResponse has the format:
          // !Array<!{fulfilled: boolean, value: (*|undefined),
          //          reason: (*|undefined)}>
          // Respond to sender with ack reply.
          // De-obfuscate the allSettled result.
          var allResponses = [];
          goog.array.forEach(result, function(item) {
            allResponses.push({
              'fulfilled': item.fulfilled,
              'value': item.value,
              // Error cannot be clone in postMessage.
              'reason': item.reason ? item.reason.message : undefined
            });
          });
          // Remove undefined fields.
          goog.array.forEach(allResponses, function(item) {
            for (var key in item) {
              if (typeof item[key] === 'undefined') {
                delete item[key];
              }
            }
          });
          event.ports[0].postMessage({
            'status': fireauth.messagechannel.Status.DONE,
            'eventId': eventId,
            'eventType': eventType,
            'response': allResponses
          });
        });
  }
  // Let unsupported events time out, as there could be external receivers
  // that can handle them.
};


/**
 * Subscribes to events of the specified type.
 * @param {string} eventType The event type to listen to.
 * @param {function(string, *):!goog.Promise<?>|void} handler The async callback
 *     function to run when the event is triggered.
 */
fireauth.messagechannel.Receiver.prototype.subscribe =
    function(eventType, handler) {
  if (goog.object.isEmpty(this.eventHandlers_)) {
    this.eventTarget_.addEventListener('message', this.messageEventHandler_);
  }
  if (typeof this.eventHandlers_[eventType] === 'undefined') {
    this.eventHandlers_[eventType] = [];
  }
  this.eventHandlers_[eventType].push(handler);
};


/**
 * Unsubscribes the specified handler from the specified event. If no handler
 * is specified, all handlers are unsubscribed.
 * @param {string} eventType The event type to unsubscribe from.
 * @param {?function(string, *):!goog.Promise<?>|void=} opt_handler The
 *     callback function to unsubscribe from the specified event type. If none
 *     is specified, all handlers are unsubscribed.
 */
fireauth.messagechannel.Receiver.prototype.unsubscribe =
    function(eventType, opt_handler) {
  if (typeof this.eventHandlers_[eventType] !== 'undefined' && opt_handler) {
    goog.array.removeAllIf(this.eventHandlers_[eventType], function(ele) {
      return ele == opt_handler;
    });
    if (this.eventHandlers_[eventType].length == 0) {
      delete this.eventHandlers_[eventType];
    }
  } else if (!opt_handler) {
    // Unsubscribe all handlers for speficied event.
    delete this.eventHandlers_[eventType];
  }
  if (goog.object.isEmpty(this.eventHandlers_)) {
    this.eventTarget_.removeEventListener('message', this.messageEventHandler_);
  }
};
