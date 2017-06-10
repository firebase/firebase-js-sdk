import { assert } from "../../../utils/assert";
import { EventEmitter } from "./EventEmitter";
import { isMobileCordova } from "../../login/util/environment";

/**
 * Monitors online state (as reported by window.online/offline events).
 *
 * The expectation is that this could have many false positives (thinks we are online
 * when we're not), but no false negatives.  So we can safely use it to determine when
 * we definitely cannot reach the internet.
 *
 * @extends {fb.core.util.EventEmitter}
 */
export class OnlineMonitor extends EventEmitter {
  online_;

  static getInstance() {
    return new OnlineMonitor();
  }

  constructor() {
    super(['online']);
    this.online_ = true;

    // We've had repeated complaints that Cordova apps can get stuck "offline", e.g.
    // https://forum.ionicframework.com/t/firebase-connection-is-lost-and-never-come-back/43810
    // It would seem that the 'online' event does not always fire consistently. So we disable it
    // for Cordova.
    if (typeof window !== 'undefined' &&
        typeof window.addEventListener !== 'undefined' &&
        !isMobileCordova()) {
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
  }

  /**
   * @param {!string} eventType
   * @return {Array.<boolean>}
   */
  getInitialEvent(eventType) {
    assert(eventType === 'online', 'Unknown event type: ' + eventType);
    return [this.online_];
  }

  /**
   * @return {boolean}
   */
  currentlyOnline() {
    return this.online_;
  }
}; // end OnlineMonitor
