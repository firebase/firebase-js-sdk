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
 * @fileoverview Defines the MessageChannel common utilities and enums.
 */

goog.provide('fireauth.messagechannel.Error');
goog.provide('fireauth.messagechannel.Status');
goog.provide('fireauth.messagechannel.TimeoutDuration');
goog.provide('fireauth.messagechannel.utils');


/**
 * Enum for the messagechannel error messages. These errors are not meant to be
 * user facing.
 * @enum {string}
 */
fireauth.messagechannel.Error = {
  CONNECTION_CLOSED: 'connection_closed',
  CONNECTION_UNAVAILABLE: 'connection_unavailable',
  INVALID_RESPONSE: 'invalid_response',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown_error',
  UNSUPPORTED_EVENT: 'unsupported_event'
};


/**
 * Enum for the message channel request status labels.
 * @enum {string}
 */
fireauth.messagechannel.Status = {
  ACK: 'ack',
  DONE: 'done'
};


/**
 * Enum for the timeout durations in milliseconds for different contexts.
 * @enum {number}
 */
fireauth.messagechannel.TimeoutDuration = {
  ACK: 50,
  COMPLETION: 3000,
  // Used when a handler is confirmed to be available on the other side.
  LONG_ACK: 800
};


/**
 * @param {?string=} opt_prefix An optional prefix string to prepend to ID.
 * @param {?number=} opt_digits An optional number of digits used for event ID.
 * @return {string} The generated event ID used to identify a generic event.
 */
fireauth.messagechannel.utils.generateEventId =
    function(opt_prefix, opt_digits) {
  // 0, null and undefined will default to 20.
  var digits = opt_digits || 20;
  return opt_prefix ? opt_prefix : '' +
      Math.floor(Math.random() * Math.pow(10, digits)).toString();
};


/**
 * @return {?MessageChannel} The initialized MessageChannel instance if
 *     supported.
 */
fireauth.messagechannel.utils.initializeMessageChannel = function() {
  return typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
};
