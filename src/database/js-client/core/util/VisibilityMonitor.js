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
goog.provide('fb.core.util.VisibilityMonitor');

goog.require('fb.core.util');
goog.require('fb.core.util.EventEmitter');


/**
 * @extends {fb.core.util.EventEmitter}
 */
fb.core.util.VisibilityMonitor = goog.defineClass(fb.core.util.EventEmitter, {
  constructor: function() {
    fb.core.util.EventEmitter.call(this, ['visible']);
    var hidden, visibilityChange;
    if (typeof document !== 'undefined' && typeof document.addEventListener !== 'undefined') {
      if (typeof document['hidden'] !== 'undefined') {
        // Opera 12.10 and Firefox 18 and later support
        visibilityChange = 'visibilitychange';
        hidden = 'hidden';
      } else if (typeof document['mozHidden'] !== 'undefined') {
        visibilityChange = 'mozvisibilitychange';
        hidden = 'mozHidden';
      } else if (typeof document['msHidden'] !== 'undefined') {
        visibilityChange = 'msvisibilitychange';
        hidden = 'msHidden';
      } else if (typeof document['webkitHidden'] !== 'undefined') {
        visibilityChange = 'webkitvisibilitychange';
        hidden = 'webkitHidden';
      }
    }

    // Initially, we always assume we are visible. This ensures that in browsers
    // without page visibility support or in cases where we are never visible
    // (e.g. chrome extension), we act as if we are visible, i.e. don't delay
    // reconnects
    this.visible_ = true;

    if (visibilityChange) {
      var self = this;
      document.addEventListener(visibilityChange, function() {
        var visible = !document[hidden];
        if (visible !== self.visible_) {
          self.visible_ = visible;
          self.trigger('visible', visible);
        }
      }, false);
    }
  },

  /**
   * @param {!string} eventType
   * @return {Array.<boolean>}
   */
  getInitialEvent: function(eventType) {
    fb.core.util.assert(eventType === 'visible', 'Unknown event type: ' + eventType);
    return [this.visible_];
  }
}); // end fb.core.util.VisibilityMonitor


goog.addSingletonGetter(fb.core.util.VisibilityMonitor);
