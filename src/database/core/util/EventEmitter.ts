import { assert } from "../../../utils/assert";

/**
 * Base class to be used if you want to emit events. Call the constructor with
 * the set of allowed event names.
 */
export abstract class EventEmitter {
  allowedEvents_;
  listeners_;
  /**
   * @param {!Array.<string>} allowedEvents
   */
  constructor(allowedEvents: Array<string>) {
    assert(Array.isArray(allowedEvents) && allowedEvents.length > 0,
                        'Requires a non-empty array');
    this.allowedEvents_ = allowedEvents;
    this.listeners_ = {};
  }

  /**
   * To be overridden by derived classes in order to fire an initial event when
   * somebody subscribes for data.
   *
   * @param {!string} eventType
   * @return {Array.<*>} Array of parameters to trigger initial event with.
   */
  abstract getInitialEvent(eventType: string);

  /**
   * To be called by derived classes to trigger events.
   * @param {!string} eventType
   * @param {...*} var_args
   */
  trigger(eventType, var_args) {
    // Clone the list, since callbacks could add/remove listeners.
    var listeners = [
      ...this.listeners_[eventType]
    ];

    for (var i = 0; i < listeners.length; i++) {
      listeners[i].callback.apply(listeners[i].context, Array.prototype.slice.call(arguments, 1));
    }
  }

  on(eventType, callback, context) {
    this.validateEventType_(eventType);
    this.listeners_[eventType] = this.listeners_[eventType] || [];
    this.listeners_[eventType].push({callback: callback, context: context });

    var eventData = this.getInitialEvent(eventType);
    if (eventData) {
      callback.apply(context, eventData);
    }
  }

  off(eventType, callback, context) {
    this.validateEventType_(eventType);
    var listeners = this.listeners_[eventType] || [];
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i].callback === callback && (!context || context === listeners[i].context)) {
        listeners.splice(i, 1);
        return;
      }
    }
  }

  validateEventType_(eventType) {
    assert(this.allowedEvents_.find(function(et) {
        return et === eventType;
      }),
      'Unknown event: ' + eventType
    );
  }
}; // end fb.core.util.EventEmitter
