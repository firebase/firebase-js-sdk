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
goog.provide('fb.core.util.OnlineMonitor');
goog.require('fb.core.util');
goog.require('fb.core.util.EventEmitter');
goog.require('fb.login.util.environment');


/**
 * Monitors online state (as reported by window.online/offline events).
 *
 * The expectation is that this could have many false positives (thinks we are online
 * when we're not), but no false negatives.  So we can safely use it to determine when
 * we definitely cannot reach the internet.
 *
 * @extends {fb.core.util.EventEmitter}
 */
fb.core.util.OnlineMonitor = goog.defineClass(fb.core.util.EventEmitter, {
  constructor: function() {
    fb.core.util.EventEmitter.call(this, ['online']);
    this.online_ = true;

    // We've had repeated complaints that Cordova apps can get stuck "offline", e.g.
    // https://forum.ionicframework.com/t/firebase-connection-is-lost-and-never-come-back/43810
    // It would seem that the 'online' event does not always fire consistently. So we disable it
    // for Cordova.
    if (typeof window !== 'undefined' &&
        typeof window.addEventListener !== 'undefined' &&
        !fb.login.util.environment.isMobileCordova()) {
      var self = this;
      window.addEventListener('online', function() {
        if (!self.online_) {
          self.online_ = true;
          self.trigger('online', true);
        }
      }, false);

      window.addEventListener('offline', function() {
        if (self.online_) {
          self.online_ = false;
          self.trigger('online', false);
        }
      }, false);
    }
  },

  /**
   * @param {!string} eventType
   * @return {Array.<boolean>}
   */
  getInitialEvent: function(eventType) {
    fb.core.util.assert(eventType === 'online', 'Unknown event type: ' + eventType);
    return [this.online_];
  },

  /**
   * @return {boolean}
   */
  currentlyOnline: function() {
    return this.online_;
  }
}); // end fb.core.util.OnlineMonitor


goog.addSingletonGetter(fb.core.util.OnlineMonitor);
