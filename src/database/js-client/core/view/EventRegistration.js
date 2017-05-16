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
goog.provide('fb.core.view.ChildEventRegistration');
goog.provide('fb.core.view.EventRegistration');
goog.provide('fb.core.view.ValueEventRegistration');
goog.require('fb.api.DataSnapshot');
goog.require('fb.core.util');
goog.require('fb.core.view.CancelEvent');
goog.require('fb.core.view.DataEvent');
goog.require('goog.object');



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
fb.core.view.EventRegistration = function() {};


/**
 * True if this container has a callback to trigger for this event type
 * @param {!string} eventType
 * @return {boolean}
 */
fb.core.view.EventRegistration.prototype.respondsTo;


/**
 * @param {!fb.core.view.Change} change
 * @param {!fb.api.Query} query
 * @return {!fb.core.view.Event}
 */
fb.core.view.EventRegistration.prototype.createEvent;


/**
 * Given event data, return a function to trigger the user's callback
 * @param {!fb.core.view.Event} eventData
 * @return {function()}
 */
fb.core.view.EventRegistration.prototype.getEventRunner;


/**
 * @param {!Error} error
 * @param {!fb.core.util.Path} path
 * @return {?fb.core.view.CancelEvent}
 */
fb.core.view.EventRegistration.prototype.createCancelEvent;


/**
 * @param {!fb.core.view.EventRegistration} other
 * @return {boolean}
 */
fb.core.view.EventRegistration.prototype.matches;


/**
 * False basically means this is a "dummy" callback container being used as a sentinel
 * to remove all callback containers of a particular type.  (e.g. if the user does
 * ref.off('value') without specifying a specific callback).
 *
 * (TODO: Rework this, since it's hacky)
 *
 * @return {boolean}
 */
fb.core.view.EventRegistration.prototype.hasAnyCallback;



/**
 * Represents registration for 'value' events.
 *
 * @param {?function(!fb.api.DataSnapshot)} callback
 * @param {?function(Error)} cancelCallback
 * @param {?Object} context
 * @constructor
 * @implements {fb.core.view.EventRegistration}
 */
fb.core.view.ValueEventRegistration = function(callback, cancelCallback, context) {
  this.callback_ = callback;
  this.cancelCallback_ = cancelCallback;
  this.context_ = context || null;
};


/**
 * @inheritDoc
 */
fb.core.view.ValueEventRegistration.prototype.respondsTo = function(eventType) {
  return eventType === 'value';
};


/**
 * @inheritDoc
 */
fb.core.view.ValueEventRegistration.prototype.createEvent = function(change, query) {
  var index = query.getQueryParams().getIndex();
  return new fb.core.view.DataEvent('value', this,
                                    new fb.api.DataSnapshot(change.snapshotNode,
                                                            query.getRef(),
                                                            index));
};


/**
 * @inheritDoc
 */
fb.core.view.ValueEventRegistration.prototype.getEventRunner = function(eventData) {
  var ctx = this.context_;
  if (eventData.getEventType() === 'cancel') {
    fb.core.util.assert(this.cancelCallback_, 'Raising a cancel event on a listener with no cancel callback');
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
fb.core.view.ValueEventRegistration.prototype.createCancelEvent = function(error, path) {
  if (this.cancelCallback_) {
    return new fb.core.view.CancelEvent(this, error, path);
  } else {
    return null;
  }
};


/**
 * @inheritDoc
 */
fb.core.view.ValueEventRegistration.prototype.matches = function(other) {
  if (!(other instanceof fb.core.view.ValueEventRegistration)) {
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
fb.core.view.ValueEventRegistration.prototype.hasAnyCallback = function() {
  return this.callback_ !== null;
};



/**
 * Represents the registration of 1 or more child_xxx events.
 *
 * Currently, it is always exactly 1 child_xxx event, but the idea is we might let you
 * register a group of callbacks together in the future.
 *
 * @param {?Object.<string, function(!fb.api.DataSnapshot, ?string=)>} callbacks
 * @param {?function(Error)} cancelCallback
 * @param {Object=} opt_context
 * @constructor
 * @implements {fb.core.view.EventRegistration}
 */
fb.core.view.ChildEventRegistration = function(callbacks, cancelCallback, opt_context) {
  this.callbacks_ = callbacks;
  this.cancelCallback_ = cancelCallback;
  this.context_ = opt_context;
};


/**
 * @inheritDoc
 */
fb.core.view.ChildEventRegistration.prototype.respondsTo = function(eventType) {
  var eventToCheck = eventType === 'children_added' ? 'child_added' : eventType;
  eventToCheck = eventToCheck === 'children_removed' ? 'child_removed' : eventToCheck;
  return goog.object.containsKey(this.callbacks_, eventToCheck);
};


/**
 * @inheritDoc
 */
fb.core.view.ChildEventRegistration.prototype.createCancelEvent = function(error, path) {
  if (this.cancelCallback_) {
    return new fb.core.view.CancelEvent(this, error, path);
  } else {
    return null;
  }
};


/**
 * @inheritDoc
 */
fb.core.view.ChildEventRegistration.prototype.createEvent = function(change, query) {
  fb.core.util.assert(change.childName != null, 'Child events should have a childName.');
  var ref = query.getRef().child(/** @type {!string} */ (change.childName));
  var index = query.getQueryParams().getIndex();
  return new fb.core.view.DataEvent(change.type, this, new fb.api.DataSnapshot(change.snapshotNode, ref, index),
      change.prevName);
};


/**
 * @inheritDoc
 */
fb.core.view.ChildEventRegistration.prototype.getEventRunner = function(eventData) {
  var ctx = this.context_;
  if (eventData.getEventType() === 'cancel') {
    fb.core.util.assert(this.cancelCallback_, 'Raising a cancel event on a listener with no cancel callback');
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
fb.core.view.ChildEventRegistration.prototype.matches = function(other) {
  if (other instanceof fb.core.view.ChildEventRegistration) {
    if (!this.callbacks_ || !other.callbacks_) {
      return true;
    } else if (this.context_ === other.context_) {
      var otherCount = goog.object.getCount(other.callbacks_);
      var thisCount = goog.object.getCount(this.callbacks_);
      if (otherCount === thisCount) {
        // If count is 1, do an exact match on eventType, if either is defined but null, it's a match.
        //  If event types don't match, not a match
        // If count is not 1, exact match across all

        if (otherCount === 1) {
          var otherKey = /** @type {!string} */ (goog.object.getAnyKey(other.callbacks_));
          var thisKey = /** @type {!string} */ (goog.object.getAnyKey(this.callbacks_));
          return (thisKey === otherKey && (
              !other.callbacks_[otherKey] ||
              !this.callbacks_[thisKey] ||
              other.callbacks_[otherKey] === this.callbacks_[thisKey]
              )
          );
        } else {
          // Exact match on each key.
          return goog.object.every(this.callbacks_, function(cb, eventType) {
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
fb.core.view.ChildEventRegistration.prototype.hasAnyCallback = function() {
  return (this.callbacks_ !== null);
};
