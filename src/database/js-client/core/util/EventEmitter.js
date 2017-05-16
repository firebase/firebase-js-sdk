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
goog.provide('fb.core.util.EventEmitter');
goog.require('fb.core.util');
goog.require('goog.array');


/**
 * Base class to be used if you want to emit events. Call the constructor with
 * the set of allowed event names.
 */
fb.core.util.EventEmitter = goog.defineClass(null, {
  /**
   * @param {!Array.<string>} allowedEvents
   */
  constructor: function(allowedEvents) {
    fb.core.util.assert(goog.isArray(allowedEvents) && allowedEvents.length > 0,
                        'Requires a non-empty array');
    this.allowedEvents_ = allowedEvents;
    this.listeners_ = {};
  },

  /**
   * To be overridden by derived classes in order to fire an initial event when
   * somebody subscribes for data.
   *
   * @param {!string} eventType
   * @return {Array.<*>} Array of parameters to trigger initial event with.
   */
  getInitialEvent: goog.abstractMethod,

  /**
   * To be called by derived classes to trigger events.
   * @param {!string} eventType
   * @param {...*} var_args
   */
  trigger: function(eventType, var_args) {
    // Clone the list, since callbacks could add/remove listeners.
    var listeners = goog.array.clone(this.listeners_[eventType] || []);

    for (var i = 0; i < listeners.length; i++) {
      listeners[i].callback.apply(listeners[i].context, Array.prototype.slice.call(arguments, 1));
    }
  },

  on: function(eventType, callback, context) {
    this.validateEventType_(eventType);
    this.listeners_[eventType] = this.listeners_[eventType] || [];
    this.listeners_[eventType].push({callback: callback, context: context });

    var eventData = this.getInitialEvent(eventType);
    if (eventData) {
      callback.apply(context, eventData);
    }
  },

  off: function(eventType, callback, context) {
    this.validateEventType_(eventType);
    var listeners = this.listeners_[eventType] || [];
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i].callback === callback && (!context || context === listeners[i].context)) {
        listeners.splice(i, 1);
        return;
      }
    }
  },

  validateEventType_: function(eventType) {
    fb.core.util.assert(goog.array.find(this.allowedEvents_,
                                        function(et) {
                                          return et === eventType;
                                        }),
                        'Unknown event: ' + eventType);
  }
}); // end fb.core.util.EventEmitter
