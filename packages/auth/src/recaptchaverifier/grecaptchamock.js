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
 * @fileoverview Defines the mock grecaptcha utilities used for development
 * testing.
 */
goog.provide('fireauth.GRecaptchaMockFactory');
goog.provide('fireauth.RecaptchaMock');

goog.require('fireauth.grecaptcha');
goog.require('fireauth.util');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');


/**
 * The mock grecaptcha factory.
 * @constructor
 * @implements {fireauth.grecaptcha}
 */
fireauth.GRecaptchaMockFactory = function() {
  /**
   * @const @private {!Object<string, !fireauth.RecaptchaMock>} The hash map
   *     that stores the widget ID to mock reCAPTCHA instances.
   */
  this.map_ = {};
  /**
   * @private {number} The current widget ID counter, incremented each time
   *     a new mock reCAPTCHA is created.
   */
  this.counter_ = fireauth.GRecaptchaMockFactory.START_INSTANCE_ID;
};


/**
 * @const {number} The start ID of the first created mock reCAPTCHA.
 */
fireauth.GRecaptchaMockFactory.START_INSTANCE_ID = 1000000000000;


/** @const {number} The reCAPTCHA expiration time in milliseconds. */
fireauth.GRecaptchaMockFactory.EXPIRATION_TIME_MS = 60000;


/** @const {number} The reCAPTCHA auto solving time in milliseconds. */
fireauth.GRecaptchaMockFactory.SOLVE_TIME_MS = 500;


/**
 * @private {?fireauth.GRecaptchaMockFactory} The singleton instance
 *     for grecaptcha mock object.
 */
fireauth.GRecaptchaMockFactory.instance_ = null;


/**
 * @return {!fireauth.GRecaptchaMockFactory} The singleton grecaptcha mock
 *     instance.
 */
fireauth.GRecaptchaMockFactory.getInstance = function() {
  // Check if there is an existing instance. Otherwise, create one and cache it.
  if (!fireauth.GRecaptchaMockFactory.instance_) {
    fireauth.GRecaptchaMockFactory.instance_ =
        new fireauth.GRecaptchaMockFactory();
  }
  return fireauth.GRecaptchaMockFactory.instance_;
};


/**
 * Creates a new instance of the mock reCAPTCHA widget.
 *
 * @param {(!Element|string)} elementOrId Element or element ID for the
 *     placeholder to render the reCAPTCHA client.
 * @param {!Object} params Parameters for the reCAPTCHA client.
 * @return {number} The client ID.
 * @override
 */
fireauth.GRecaptchaMockFactory.prototype.render =
    function(elementOrId, params) {
  this.map_[this.counter_.toString()] =
      new fireauth.RecaptchaMock(elementOrId, params);
  return this.counter_++;
};


/**
 * Resets a reCAPTCHA with the given ID. If an ID is not provided, resets the
 * first instance.
 *
 * @param {number=} opt_id The id of the reCAPTCHA client. Defaults to the first
 *     widget created if unspecified.
 * @override
 */
fireauth.GRecaptchaMockFactory.prototype.reset = function(opt_id) {
  var mock = this.getMock_(opt_id);
  var id = this.getId_(opt_id);
  if (mock && id) {
    mock.delete();
    delete this.map_[/** @type {string} */ (id)];
  }
};


/**
 * Gets the response for the client with the given ID. If an ID is not
 * provided, gets the response for the default client.
 *
 * @param {number=} opt_id The ID of the reCAPTCHA widget. Defaults to the first
 *     widget created if unspecified.
 * @return {?string}
 * @override
 */
fireauth.GRecaptchaMockFactory.prototype.getResponse = function(opt_id) {
  var mock = this.getMock_(opt_id);
  return mock ? mock.getResponse() : null;
};


/**
 * Programmatically triggers the invisible reCAPTCHA.
 *
 * @param {number=} opt_id The ID of the recaptcha client. Defaults to the first
 *     widget created if unspecified.
 * @override
 */
fireauth.GRecaptchaMockFactory.prototype.execute = function(opt_id) {
  var mock = this.getMock_(opt_id);
  if (mock) {
    mock.execute();
  }
};


/**
 * @param {number=} opt_id The optional ID to lookup.
 * @return {?fireauth.RecaptchaMock} The corresponding reCAPTCHA mock if found.
 * @private
 */
fireauth.GRecaptchaMockFactory.prototype.getMock_ = function(opt_id) {
  var id = this.getId_(opt_id);
  return id ? this.map_[id] || null : null;
};


/**
 * @param {number=} opt_id The optional ID to lookup.
 * @return {?string} The corresponding reCAPTCHA mock ID if found.
 * @private
 */
fireauth.GRecaptchaMockFactory.prototype.getId_ = function(opt_id) {
  var id = typeof opt_id === 'undefined' ?
      fireauth.GRecaptchaMockFactory.START_INSTANCE_ID : opt_id;
  return id ? id.toString() : null;
};


/**
 * Mock single reCAPTCHA instance.
 * @param {(!Element|string)} elementOrId Element or element ID for the
 *     placeholder to render the reCAPTCHA client.
 * @param {!Object} params Parameters for the reCAPTCHA client.
 * @constructor
 */
fireauth.RecaptchaMock = function(elementOrId, params) {
  /** @private {boolean} Whether the instance was deleted. */
  this.deleted_ = false;
  /** @const @private {!Object} The reCAPTCHA parameters. */
  this.params_ = params;
  /** @private {?string} The simulated response token if available. */
  this.responseToken_ = null;
  /**
   * @private {?number} The timer ID for response callback/expiration callback
   *     to trigger.
   */
  this.timerId_ = null;
  /** @const @private {boolean} Whether the reCAPTCHA is visible or not. */
  this.isVisible_ = this.params_['size'] !== 'invisible';
  /**
   * @const @private {?Element} The container or button trigger of the
   *     reCAPTCHA.
   */
  this.element_ = goog.dom.getElement(elementOrId);
  var self = this;
  /** @private {function(?)} The on click handler for invisible reCAPTCHAs. */
  this.onClickHandler_ = function(event) {
    self.execute();
  };
  if (this.isVisible_) {
    // For a visible reCAPTCHA, simulate reCAPTCHA continuously solved
    // and then expired.
    this.execute();
  } else {
    // Trigger on button click on when execute is directly called.
    goog.events.listen(
        this.element_,
        goog.events.EventType.CLICK,
        this.onClickHandler_);
  }
};


/** @return {?string} The current reCAPTCHA response. */
fireauth.RecaptchaMock.prototype.getResponse = function() {
  this.checkIfDeleted_();
  return this.responseToken_;
};


/** Starts the reCAPTCHA mock solving/expiration cycle. */
fireauth.RecaptchaMock.prototype.execute = function() {
  this.checkIfDeleted_();
  var self = this;
  if (this.timerId_) {
    return;
  }
  // Wait for expected delay before auto-solving.
  this.timerId_ = setTimeout(function() {
    // Generate random string as reCAPTCHA response token.
    self.responseToken_ = fireauth.util.generateRandomAlphaNumericString(50);
    // Trigger developer's callbacks.
    var callback = self.params_['callback'];
    var expirationCallback = self.params_['expired-callback'];
    if (callback) {
      try {
        callback(self.responseToken_);
      } catch (e) {}
    }
    // Wait for token to expire before triggering expiration callback and
    // resetting token response.
    self.timerId_ = setTimeout(function() {
      self.timerId_ = null;
      self.responseToken_ = null;
      if (expirationCallback) {
        try {
          expirationCallback();
        } catch (e) {}
      }
      if (self.isVisible_) {
        self.execute();
      }
    }, fireauth.GRecaptchaMockFactory.EXPIRATION_TIME_MS);
  }, fireauth.GRecaptchaMockFactory.SOLVE_TIME_MS);
};


/** Deletes the current mock instance. */
fireauth.RecaptchaMock.prototype.delete = function() {
  this.checkIfDeleted_();
  this.deleted_ = true;
  clearTimeout(this.timerId_);
  this.timerId_ = null;
  goog.events.unlisten(
      this.element_,
      goog.events.EventType.CLICK,
      this.onClickHandler_);
};


/**
 * Checks whether the instance was deleted.
 * @private
 */
fireauth.RecaptchaMock.prototype.checkIfDeleted_ = function() {
  // This error should never be thrown externally.
  // GRecaptchaMockFactory will ensure that a deleted instance is removed.
  if (this.deleted_) {
    throw new Error('reCAPTCHA mock was already deleted!');
  }
};
