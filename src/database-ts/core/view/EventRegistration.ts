import { DataSnapshot } from "../../api/DataSnapshot";
import { DataEvent, CancelEvent } from "./Event";
import { contains, getCount, getAnyKey } from "../../../utils/obj";
import { assert } from "../../../utils/assert";
import { Path } from "../util/Path";

/**
 * An EventRegistration is basically an event type ('value', 'child_added', etc.) and a callback
 * to be notified of that type of event.
 *
 * That said, it can also contain a cancel callback to be notified if the event is canceled.  And
 * currently, this code is organized around the idea that you would register multiple child_ callbacks
 * together, as a single EventRegistration.  Though currently we don't do that.
 *
 * @interface
 */
export const EventRegistration = function() {};


/**
 * True if this container has a callback to trigger for this event type
 * @param {!string} eventType
 * @return {boolean}
 */
EventRegistration.prototype.respondsTo;


/**
 * @param {!fb.core.view.Change} change
 * @param {!fb.api.Query} query
 * @return {!fb.core.view.Event}
 */
EventRegistration.prototype.createEvent;


/**
 * Given event data, return a function to trigger the user's callback
 * @param {!fb.core.view.Event} eventData
 * @return {function()}
 */
EventRegistration.prototype.getEventRunner;


/**
 * @param {!Error} error
 * @param {!Path} path
 * @return {?CancelEvent}
 */
EventRegistration.prototype.createCancelEvent;


/**
 * @param {!EventRegistration} other
 * @return {boolean}
 */
EventRegistration.prototype.matches;


/**
 * False basically means this is a "dummy" callback container being used as a sentinel
 * to remove all callback containers of a particular type.  (e.g. if the user does
 * ref.off('value') without specifying a specific callback).
 *
 * (TODO: Rework this, since it's hacky)
 *
 * @return {boolean}
 */
EventRegistration.prototype.hasAnyCallback;



/**
 * Represents registration for 'value' events.
 *
 * @param {?function(!DataSnapshot)} callback
 * @param {?function(Error)} cancelCallback
 * @param {?Object} context
 * @constructor
 * @implements {EventRegistration}
 */
export const ValueEventRegistration = function(callback, cancelCallback, context) {
  this.callback_ = callback;
  this.cancelCallback_ = cancelCallback;
  this.context_ = context || null;
};


/**
 * @inheritDoc
 */
ValueEventRegistration.prototype.respondsTo = function(eventType) {
  return eventType === 'value';
};


/**
 * @inheritDoc
 */
ValueEventRegistration.prototype.createEvent = function(change, query) {
  var index = query.getQueryParams().getIndex();
  return new DataEvent('value', this, new DataSnapshot(change.snapshotNode, query.getRef(), index));
};


/**
 * @inheritDoc
 */
ValueEventRegistration.prototype.getEventRunner = function(eventData) {
  var ctx = this.context_;
  if (eventData.getEventType() === 'cancel') {
    assert(this.cancelCallback_, 'Raising a cancel event on a listener with no cancel callback');
    var cancelCB = this.cancelCallback_;
    return function() {
      // We know that error exists, we checked above that this is a cancel event
      cancelCB.call(ctx, eventData.error);
    };
  } else {
    var cb = this.callback_;
    return function() {
      cb.call(ctx, eventData.snapshot);
    };
  }
};


/**
 * @inheritDoc
 */
ValueEventRegistration.prototype.createCancelEvent = function(error, path) {
  if (this.cancelCallback_) {
    return new CancelEvent(this, error, path);
  } else {
    return null;
  }
};


/**
 * @inheritDoc
 */
ValueEventRegistration.prototype.matches = function(other) {
  if (!(other instanceof ValueEventRegistration)) {
    return false;
  } else if (!other.callback_ || !this.callback_) {
    // If no callback specified, we consider it to match any callback.
    return true;
  } else {
    return other.callback_ === this.callback_ && other.context_ === this.context_;
  }
};


/**
 * @inheritDoc
 */
ValueEventRegistration.prototype.hasAnyCallback = function() {
  return this.callback_ !== null;
};



/**
 * Represents the registration of 1 or more child_xxx events.
 *
 * Currently, it is always exactly 1 child_xxx event, but the idea is we might let you
 * register a group of callbacks together in the future.
 *
 * @param {?Object.<string, function(!DataSnapshot, ?string=)>} callbacks
 * @param {?function(Error)} cancelCallback
 * @param {Object=} opt_context
 * @constructor
 * @implements {EventRegistration}
 */
export const ChildEventRegistration = function(callbacks, cancelCallback, opt_context) {
  this.callbacks_ = callbacks;
  this.cancelCallback_ = cancelCallback;
  this.context_ = opt_context;
};


/**
 * @inheritDoc
 */
ChildEventRegistration.prototype.respondsTo = function(eventType) {
  var eventToCheck = eventType === 'children_added' ? 'child_added' : eventType;
  eventToCheck = eventToCheck === 'children_removed' ? 'child_removed' : eventToCheck;
  return contains(this.callbacks_, eventToCheck);
};


/**
 * @inheritDoc
 */
ChildEventRegistration.prototype.createCancelEvent = function(error, path) {
  if (this.cancelCallback_) {
    return new CancelEvent(this, error, path);
  } else {
    return null;
  }
};


/**
 * @inheritDoc
 */
ChildEventRegistration.prototype.createEvent = function(change, query) {
  assert(change.childName != null, 'Child events should have a childName.');
  var ref = query.getRef().child(/** @type {!string} */ (change.childName));
  var index = query.getQueryParams().getIndex();
  return new DataEvent(change.type, this, new DataSnapshot(change.snapshotNode, ref, index),
      change.prevName);
};


/**
 * @inheritDoc
 */
ChildEventRegistration.prototype.getEventRunner = function(eventData) {
  var ctx = this.context_;
  if (eventData.getEventType() === 'cancel') {
    assert(this.cancelCallback_, 'Raising a cancel event on a listener with no cancel callback');
    var cancelCB = this.cancelCallback_;
    return function() {
      // We know that error exists, we checked above that this is a cancel event
      cancelCB.call(ctx, eventData.error);
    };
  } else {
    var cb = this.callbacks_[eventData.eventType];
    return function() {
      cb.call(ctx, eventData.snapshot, eventData.prevName);
    }
  }
};


/**
 * @inheritDoc
 */
ChildEventRegistration.prototype.matches = function(other) {
  if (other instanceof ChildEventRegistration) {
    if (!this.callbacks_ || !other.callbacks_) {
      return true;
    } else if (this.context_ === other.context_) {
      var otherCount = getCount(other.callbacks_);
      var thisCount = getCount(this.callbacks_);
      if (otherCount === thisCount) {
        // If count is 1, do an exact match on eventType, if either is defined but null, it's a match.
        //  If event types don't match, not a match
        // If count is not 1, exact match across all

        if (otherCount === 1) {
          var otherKey = /** @type {!string} */ (getAnyKey(other.callbacks_));
          var thisKey = /** @type {!string} */ (getAnyKey(this.callbacks_));
          return (thisKey === otherKey && (
              !other.callbacks_[otherKey] ||
              !this.callbacks_[thisKey] ||
              other.callbacks_[otherKey] === this.callbacks_[thisKey]
              )
          );
        } else {
          // Exact match on each key.
          return this.callbacks_.every(function(cb, eventType) {
            return other.callbacks_[eventType] === cb;
          });
        }
      }
    }
  }

  return false;
};


/**
 * @inheritDoc
 */
ChildEventRegistration.prototype.hasAnyCallback = function() {
  return (this.callbacks_ !== null);
};
