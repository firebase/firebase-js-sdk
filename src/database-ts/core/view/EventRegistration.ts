import { assert } from "../../../utils/libs/assert";
import { 
  containsKey,
  every,
  getAnyKey,
  getCount
} from "../../../utils/libs/object";
import { 
  EventInterface,
  CancelEvent,
  DataEvent
} from "./Event";
import { DataSnapshot } from "../../api/DataSnapshot";
import { Path } from "../util/Path";
import { Query } from "../../api/Query";

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
export interface EventRegistrationInterface {
  /**
   * True if this container has a callback to trigger for this event type
   * @param {!string} eventType
   * @return {boolean}
   */
  respondsTo(eventType: string): boolean

  /**
   * Given event data, return a function to trigger the user's callback
   * @param {!fb.core.view.Event} eventData
   * @return {function()}
   */
  createEvent(change, query: Query): EventInterface
  getEventRunner(eventData: EventInterface): Function
  createCancelEvent(error: Error, path: Path)
  matches(other: EventRegistrationInterface): boolean
  /**
   * False basically means this is a "dummy" callback container being used as a sentinel
   * to remove all callback containers of a particular type.  (e.g. if the user does
   * ref.off('value') without specifying a specific callback).
   *
   * (TODO: Rework this, since it's hacky)
   *
   * @return {boolean}
   */
  hasAnyCallback(): boolean
}

export class ValueEventRegistration implements EventRegistrationInterface{
  constructor(private callback: (data: DataSnapshot) => void, 
              private cancelCallback: (error: Error) => void, 
              public context = null) {}
  createCancelEvent(error, path) {
    if (this.cancelCallback) {
      return new CancelEvent(this, error, path);
    } else {
      return null;
    }
  }
  createEvent(change, query: Query) {
    var index = query.getQueryParams().getIndex();
    return new DataEvent('value', this, new DataSnapshot(change.snapshotNode, query.getRef(), index));
  }
  getEventRunner(eventData) {
    var ctx = this.context;
    if (eventData.getEventType() === 'cancel') {
      assert(this.cancelCallback, 'Raising a cancel event on a listener with no cancel callback');
      var cancelCB = this.cancelCallback;
      return function() {
        // We know that error exists, we checked above that this is a cancel event
        cancelCB.call(ctx, eventData.error);
      };
    } else {
      var cb = this.callback;
      return function() {
        cb.call(ctx, eventData.snapshot);
      };
    }
  }
  hasAnyCallback() {
    return this.callback !== null;
  }
  matches(other: ValueEventRegistration) {
    if (!(other instanceof ValueEventRegistration)) {
      return false;
    } else if (!other.callback || !this.callback) {
      // If no callback specified, we consider it to match any callback.
      return true;
    } else {
      return other.callback === this.callback && other.context === this.context;
    }
  }
  respondsTo(eventType) {
    return eventType === 'value';
  }
}

export class ChildEventRegistration implements EventRegistrationInterface {
  constructor(private callbacks: { [name: string]: (snap: DataSnapshot, name: string) => void}, 
              private cancelCallback: (error: Error) => void, 
              public context = null) {}
  respondsTo(eventType) {
    var eventToCheck = eventType === 'children_added' ? 'child_added' : eventType;
    eventToCheck = eventToCheck === 'children_removed' ? 'child_removed' : eventToCheck;
    return containsKey(this.callbacks, eventToCheck);
  }
  createCancelEvent(error, path) {
    if (this.cancelCallback) {
      return new CancelEvent(this, error, path);
    } else {
      return null;
    }
  }
  createEvent(change, query) {
    assert(change.childName != null, 'Child events should have a childName.');
    var ref = query.getRef().child(change.childName);
    var index = query.getQueryParams().getIndex();
    return new DataEvent(change.type, this, new DataSnapshot(change.snapshotNode, ref, index), change.prevName);
  }
  getEventRunner(eventData) {
    var ctx = this.context;
    if (eventData.getEventType() === 'cancel') {
      assert(this.cancelCallback, 'Raising a cancel event on a listener with no cancel callback');
      var cancelCB = this.cancelCallback;
      return function() {
        // We know that error exists, we checked above that this is a cancel event
        cancelCB.call(ctx, eventData.error);
      };
    } else {
      var cb = this.callbacks[eventData.eventType];
      return function() {
        cb.call(ctx, eventData.snapshot, eventData.prevName);
      }
    }
  }
  hasAnyCallback() {
    return this.callbacks !== null;
  }
  matches(other) {
    if (other instanceof ChildEventRegistration) {
      if (!this.callbacks || !other.callbacks) {
        return true;
      } else if (this.context === other.context) {
        var otherCount = getCount(other.callbacks);
        var thisCount = getCount(this.callbacks);
        if (otherCount === thisCount) {
          // If count is 1, do an exact match on eventType, if either is defined but null, it's a match.
          //  If event types don't match, not a match
          // If count is not 1, exact match across all

          if (otherCount === 1) {
            var otherKey = /** @type {!string} */ getAnyKey(other.callbacks);
            var thisKey = /** @type {!string} */ getAnyKey(this.callbacks);
            return (thisKey === otherKey && (
                !other.callbacks[otherKey] ||
                !this.callbacks[thisKey] ||
                other.callbacks[otherKey] === this.callbacks[thisKey]
                )
            );
          } else {
            // Exact match on each key.
            return every(this.callbacks, function(cb, eventType) {
              return other.callbacks[eventType] === cb;
            });
          }
        }
      }
    }

    return false;
  }
}