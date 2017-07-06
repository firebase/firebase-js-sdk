import { EventEmitter } from "./EventEmitter";
import { assert } from "../../../utils/assert";

/**
 * @extends {fb.core.util.EventEmitter}
 */
export class VisibilityMonitor extends EventEmitter {
  visible_;

  static getInstance() {
    return new VisibilityMonitor();
  }

  constructor() {
    super(['visible']);
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
  }

  /**
   * @param {!string} eventType
   * @return {Array.<boolean>}
   */
  getInitialEvent(eventType) {
    assert(eventType === 'visible', 'Unknown event type: ' + eventType);
    return [this.visible_];
  }
}; // end VisibilityMonitor