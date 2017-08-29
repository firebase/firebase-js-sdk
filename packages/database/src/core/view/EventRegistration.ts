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

import { DataSnapshot } from '../../api/DataSnapshot';
import { DataEvent, CancelEvent, Event } from './Event';
import { contains, getCount, getAnyKey, every } from '@firebase/util';
import { assert } from '@firebase/util';
import { Path } from '../util/Path';
import { Change } from './Change';
import { Query } from '../../api/Query';

/**
 * An EventRegistration is basically an event type ('value', 'child_added', etc.) and a callback
 * to be notified of that type of event.
 *
 * That said, it can also contain a cancel callback to be notified if the event is canceled.  And
 * currently, this code is organized around the idea that you would register multiple child_ callbacks
 * together, as a single EventRegistration.  Though currently we don't do that.
 */
export interface EventRegistration {
  /**
   * True if this container has a callback to trigger for this event type
   * @param {!string} eventType
   * @return {boolean}
   */
  respondsTo(eventType: string): boolean;

  /**
   * @param {!Change} change
   * @param {!Query} query
   * @return {!Event}
   */
  createEvent(change: Change, query: Query): Event;

  /**
   * Given event data, return a function to trigger the user's callback
   * @param {!Event} eventData
   * @return {function()}
   */
  getEventRunner(eventData: Event): () => void;

  /**
   * @param {!Error} error
   * @param {!Path} path
   * @return {?CancelEvent}
   */
  createCancelEvent(error: Error, path: Path): CancelEvent | null;

  /**
   * @param {!EventRegistration} other
   * @return {boolean}
   */
  matches(other: EventRegistration): boolean;

  /**
   * False basically means this is a "dummy" callback container being used as a sentinel
   * to remove all callback containers of a particular type.  (e.g. if the user does
   * ref.off('value') without specifying a specific callback).
   *
   * (TODO: Rework this, since it's hacky)
   *
   * @return {boolean}
   */
  hasAnyCallback(): boolean;
}

/**
 * Represents registration for 'value' events.
 */
export class ValueEventRegistration implements EventRegistration {
  /**
   * @param {?function(!DataSnapshot)} callback_
   * @param {?function(Error)} cancelCallback_
   * @param {?Object} context_
   */
  constructor(
    private callback_: ((d: DataSnapshot) => void) | null,
    private cancelCallback_: ((e: Error) => void) | null,
    private context_: Object | null
  ) {}

  /**
   * @inheritDoc
   */
  respondsTo(eventType: string): boolean {
    return eventType === 'value';
  }

  /**
   * @inheritDoc
   */
  createEvent(change: Change, query: Query): DataEvent {
    const index = query.getQueryParams().getIndex();
    return new DataEvent(
      'value',
      this,
      new DataSnapshot(change.snapshotNode, query.getRef(), index)
    );
  }

  /**
   * @inheritDoc
   */
  getEventRunner(eventData: CancelEvent | DataEvent): () => void {
    const ctx = this.context_;
    if (eventData.getEventType() === 'cancel') {
      assert(
        this.cancelCallback_,
        'Raising a cancel event on a listener with no cancel callback'
      );
      const cancelCB = this.cancelCallback_;
      return function() {
        // We know that error exists, we checked above that this is a cancel event
        cancelCB.call(ctx, (eventData as CancelEvent).error);
      };
    } else {
      const cb = this.callback_;
      return function() {
        cb.call(ctx, (eventData as DataEvent).snapshot);
      };
    }
  }

  /**
   * @inheritDoc
   */
  createCancelEvent(error: Error, path: Path): CancelEvent | null {
    if (this.cancelCallback_) {
      return new CancelEvent(this, error, path);
    } else {
      return null;
    }
  }

  /**
   * @inheritDoc
   */
  matches(other: EventRegistration): boolean {
    if (!(other instanceof ValueEventRegistration)) {
      return false;
    } else if (!other.callback_ || !this.callback_) {
      // If no callback specified, we consider it to match any callback.
      return true;
    } else {
      return (
        other.callback_ === this.callback_ && other.context_ === this.context_
      );
    }
  }

  /**
   * @inheritDoc
   */
  hasAnyCallback(): boolean {
    return this.callback_ !== null;
  }
}

/**
 * Represents the registration of 1 or more child_xxx events.
 *
 * Currently, it is always exactly 1 child_xxx event, but the idea is we might let you
 * register a group of callbacks together in the future.
 *
 * @constructor
 * @implements {EventRegistration}
 */
export class ChildEventRegistration implements EventRegistration {
  /**
   * @param {?Object.<string, function(!DataSnapshot, ?string=)>} callbacks_
   * @param {?function(Error)} cancelCallback_
   * @param {Object=} context_
   */
  constructor(
    private callbacks_:
      | ({ [k: string]: (d: DataSnapshot, s?: string | null) => void })
      | null,
    private cancelCallback_: ((e: Error) => void) | null,
    private context_?: Object
  ) {}

  /**
   * @inheritDoc
   */
  respondsTo(eventType: string): boolean {
    let eventToCheck =
      eventType === 'children_added' ? 'child_added' : eventType;
    eventToCheck =
      eventToCheck === 'children_removed' ? 'child_removed' : eventToCheck;
    return contains(this.callbacks_, eventToCheck);
  }

  /**
   * @inheritDoc
   */
  createCancelEvent(error: Error, path: Path): CancelEvent | null {
    if (this.cancelCallback_) {
      return new CancelEvent(this, error, path);
    } else {
      return null;
    }
  }

  /**
   * @inheritDoc
   */
  createEvent(change: Change, query: Query): DataEvent {
    assert(change.childName != null, 'Child events should have a childName.');
    const ref = query.getRef().child /** @type {!string} */(change.childName);
    const index = query.getQueryParams().getIndex();
    return new DataEvent(
      change.type as any,
      this,
      new DataSnapshot(change.snapshotNode, ref, index as any),
      change.prevName
    );
  }

  /**
   * @inheritDoc
   */
  getEventRunner(eventData: CancelEvent | DataEvent): () => void {
    const ctx = this.context_;
    if (eventData.getEventType() === 'cancel') {
      assert(
        this.cancelCallback_,
        'Raising a cancel event on a listener with no cancel callback'
      );
      const cancelCB = this.cancelCallback_;
      return function() {
        // We know that error exists, we checked above that this is a cancel event
        cancelCB.call(ctx, (eventData as CancelEvent).error);
      };
    } else {
      const cb = this.callbacks_[(eventData as DataEvent).eventType];
      return function() {
        cb.call(
          ctx,
          (eventData as DataEvent).snapshot,
          (eventData as DataEvent).prevName
        );
      };
    }
  }

  /**
   * @inheritDoc
   */
  matches(other: EventRegistration): boolean {
    if (other instanceof ChildEventRegistration) {
      if (!this.callbacks_ || !other.callbacks_) {
        return true;
      } else if (this.context_ === other.context_) {
        const otherCount = getCount(other.callbacks_);
        const thisCount = getCount(this.callbacks_);
        if (otherCount === thisCount) {
          // If count is 1, do an exact match on eventType, if either is defined but null, it's a match.
          //  If event types don't match, not a match
          // If count is not 1, exact match across all

          if (otherCount === 1) {
            const otherKey /** @type {!string} */ = getAnyKey(other.callbacks_);
            const thisKey /** @type {!string} */ = getAnyKey(this.callbacks_);
            return (
              thisKey === otherKey &&
              (!other.callbacks_[otherKey] ||
                !this.callbacks_[thisKey] ||
                other.callbacks_[otherKey] === this.callbacks_[thisKey])
            );
          } else {
            // Exact match on each key.
            return every(
              this.callbacks_,
              (eventType, cb) => other.callbacks_[eventType] === cb
            );
          }
        }
      }
    }

    return false;
  }

  /**
   * @inheritDoc
   */
  hasAnyCallback(): boolean {
    return this.callbacks_ !== null;
  }
}
