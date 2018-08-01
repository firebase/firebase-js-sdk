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
  ACK: 20,
  COMPLETION: 500
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
