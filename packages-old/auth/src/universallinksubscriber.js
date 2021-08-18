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
 * @fileoverview Provides the universal link subscriber utility to allow
 * multiple subscriptions for incoming universal link detection.
 */
goog.provide('fireauth.UniversalLinkSubscriber');

goog.require('fireauth.util');
goog.require('goog.array');

/**
 * Defines the universal link subscriber class used to allow multiple universal
 * link subscriptions since the underlying plugin only works with one.
 * This utility is needed since the universal link cordova plugin can only allow
 * one subscriber and multiple app instances can subscribe to this.
 * @constructor @final @struct
 */
fireauth.UniversalLinkSubscriber = function() {
  /**
   * @private {?function(?Object)} The master callback that subscribes directly
   *     to universalLinks.
   */
  this.masterCb_ = null;
  /**
   * @private {!Array<function(?Object)>} The list of external subscribers that
   *     are triggered every time the master callback is triggered.
   */
  this.cb_ = [];
};


/**
 * @return {!fireauth.UniversalLinkSubscriber} The default universal link
 *     subscriber instance.
 */
fireauth.UniversalLinkSubscriber.getInstance = function() {
  if (!fireauth.UniversalLinkSubscriber.instance_) {
    fireauth.UniversalLinkSubscriber.instance_ =
        new fireauth.UniversalLinkSubscriber();
  }
  return fireauth.UniversalLinkSubscriber.instance_;
};


/** Clears singleton instance. Useful for testing. */
fireauth.UniversalLinkSubscriber.clear = function() {
  fireauth.UniversalLinkSubscriber.instance_ = null;
};


/**
 * @private {?fireauth.UniversalLinkSubscriber} The singleton universal
 *     link subscriber instance.
 */
fireauth.UniversalLinkSubscriber.instance_ = null;


/**
 * Subscribes a callback to the universal link plugin listener.
 * @param {function(?Object)} cb The callback to subscribe to the universal
 *     link plugin.
 */
fireauth.UniversalLinkSubscriber.prototype.subscribe  = function(cb) {
  var self = this;
  this.cb_.push(cb);
  if (!this.masterCb_) {
    this.masterCb_ = function(event) {
      for (var i = 0; i < self.cb_.length; i++) {
        self.cb_[i](event);
      }
    };
    var subscribe = fireauth.util.getObjectRef(
        'universalLinks.subscribe', goog.global);
    // For iOS environments, this plugin is not used, therefore this is a no-op
    // and no error needs to be thrown.
    if (typeof subscribe === 'function') {
      subscribe(null, this.masterCb_);
    }
  }
};


/**
 * Unsubscribes a callback from the universal link plugin listener.
 * @param {function(?Object)} cb The callback to unsubscribe from the universal
 *     link plugin.
 */
fireauth.UniversalLinkSubscriber.prototype.unsubscribe = function(cb) {
  goog.array.removeAllIf(this.cb_, function(ele) {
    return ele == cb;
  });
};

