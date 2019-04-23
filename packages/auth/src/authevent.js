/**
 * @license
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

/**
 * @fileoverview Defines the Auth event object.
 */

goog.provide('fireauth.AuthEvent');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');


/**
 * Defines the authentication event.
 * @param {!fireauth.AuthEvent.Type} type The Auth event type.
 * @param {?string=} opt_eventId The event identifier.
 * @param {?string=} opt_urlResponse The URL with IdP response.
 * @param {?string=} opt_sessionId The session ID used to prevent session
 *     fixation attacks.
 * @param {?fireauth.AuthError=} opt_error The optional error encountered.
 * @param {?string=} opt_postBody The optional POST body.
 * @constructor
 */
fireauth.AuthEvent = function(
    type, opt_eventId, opt_urlResponse, opt_sessionId, opt_error,
    opt_postBody) {
  /** @const @private {!fireauth.AuthEvent.Type} The Auth event type. */
  this.type_ = type;
  /** @const @private {?string} The Auth event ID. */
  this.eventId_ = opt_eventId || null;
  /** @const @private {?string} The callback URL with the sign in response. */
  this.urlResponse_ = opt_urlResponse || null;
  /** @const @private {?string} The sign in operation session ID. */
  this.sessionId_ = opt_sessionId || null;
  /** @const @private {?string} The POST body string if available. */
  this.postBody_ = opt_postBody || null;
  /**
   * @const @private {?fireauth.AuthError} The Auth event error if available.
   */
  this.error_ = opt_error || null;
  if (!this.urlResponse_ && !this.error_) {
    // Either URL or error is required. They can't be both null.
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT);
  } else if (this.urlResponse_ && this.error_) {
    // An error must not be provided when a URL is available.
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT);
  } else if (this.urlResponse_ && !this.sessionId_) {
    // A session ID must accompany a URL response.
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT);
  }
};



/**
 * Auth event operation types.
 * All Auth event types that are used for popup operations should be suffixed
 * with `Popup`, whereas those used for redirect operations should be suffixed
 * with `Redirect`.
 * TODO: consider changing the type from a string to an object with ID
 * and some metadata for determining mode: redirect, popup or none.
 * @enum {string}
 */
fireauth.AuthEvent.Type = {
  LINK_VIA_POPUP: 'linkViaPopup',
  LINK_VIA_REDIRECT: 'linkViaRedirect',
  REAUTH_VIA_POPUP: 'reauthViaPopup',
  REAUTH_VIA_REDIRECT: 'reauthViaRedirect',
  SIGN_IN_VIA_POPUP: 'signInViaPopup',
  SIGN_IN_VIA_REDIRECT: 'signInViaRedirect',
  UNKNOWN: 'unknown',
  VERIFY_APP: 'verifyApp'
};


/**
 * @param {!fireauth.AuthEvent} event The Auth event.
 * @return {boolean} Whether the event is a redirect type.
 */
fireauth.AuthEvent.isRedirect = function(event) {
  return !!event.getType().match(/Redirect$/);
};


/**
 * @param {!fireauth.AuthEvent} event The Auth event.
 * @return {boolean} Whether the event is a popup type.
 */
fireauth.AuthEvent.isPopup = function(event) {
  return !!event.getType().match(/Popup$/);
};


/** @return {!fireauth.AuthEvent.Type} The type of Auth event. */
fireauth.AuthEvent.prototype.getType = function() {
  return this.type_;
};


/** @return {?string} The Auth event identifier. */
fireauth.AuthEvent.prototype.getEventId = function() {
  return this.eventId_;
};


/** @return {string} The event unique identifier. */
fireauth.AuthEvent.prototype.getUid = function() {
  var components = [];
  components.push(this.type_);
  if (this.eventId_) {
    components.push(this.eventId_);
  }
  if (this.sessionId_) {
    components.push(this.sessionId_);
  }
  if (this.tenantId_) {
    components.push(this.tenantId_);
  }
  return components.join('-');
};


/** @return {?string} The url response of Auth event. */
fireauth.AuthEvent.prototype.getUrlResponse = function() {
  return this.urlResponse_;
};


/** @return {?string} The session ID Auth event. */
fireauth.AuthEvent.prototype.getSessionId = function() {
  return this.sessionId_;
};


/** @return {?string} The POST body of the Auth event, if available. */
fireauth.AuthEvent.prototype.getPostBody = function() {
  return this.postBody_;
};


/** @return {?fireauth.AuthError} The error of Auth event. */
fireauth.AuthEvent.prototype.getError = function() {
  return this.error_;
};


/** @return {boolean} Whether Auth event has an error. */
fireauth.AuthEvent.prototype.hasError = function() {
  return !!this.error_;
};


/** @return {!Object} The plain object representation of event. */
fireauth.AuthEvent.prototype.toPlainObject = function() {
  return {
    'type': this.type_,
    'eventId': this.eventId_,
    'urlResponse': this.urlResponse_,
    'sessionId': this.sessionId_,
    'postBody': this.postBody_,
    'error': this.error_ && this.error_.toPlainObject()
  };
};


/**
 * @param {?Object} rawResponse The plain object representation of Auth event.
 * @return {?fireauth.AuthEvent} The Auth event representation of plain object.
 */
fireauth.AuthEvent.fromPlainObject = function(rawResponse) {
  var response = rawResponse || {};
  if (response['type']) {
    return new fireauth.AuthEvent(
        response['type'],
        response['eventId'],
        response['urlResponse'],
        response['sessionId'],
        response['error'] &&
            fireauth.AuthError.fromPlainObject(response['error']),
        response['postBody']
        );
  }
  return null;
};
