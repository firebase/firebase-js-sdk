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
goog.provide('fb.core.view.EventGenerator');
goog.require('fb.core.snap.NamedNode');
goog.require('fb.core.util');

/**
 * An EventGenerator is used to convert "raw" changes (fb.core.view.Change) as computed by the
 * CacheDiffer into actual events (fb.core.view.Event) that can be raised.  See generateEventsForChanges()
 * for details.
 *
 * @param {!fb.api.Query} query
 * @constructor
 */
fb.core.view.EventGenerator = function(query) {
  /**
   * @private
   * @type {!fb.api.Query}
   */
  this.query_ = query;

  /**
   * @private
   * @type {!fb.core.snap.Index}
   */
  this.index_ = query.getQueryParams().getIndex();
};

/**
 * Given a set of raw changes (no moved events and prevName not specified yet), and a set of
 * EventRegistrations that should be notified of these changes, generate the actual events to be raised.
 *
 * Notes:
 *  - child_moved events will be synthesized at this time for any child_changed events that affect
 *    our index.
 *  - prevName will be calculated based on the index ordering.
 *
 * @param {!Array.<!fb.core.view.Change>} changes
 * @param {!fb.core.snap.Node} eventCache
 * @param {!Array.<!fb.core.view.EventRegistration>} eventRegistrations
 * @return {!Array.<!fb.core.view.Event>}
 */
fb.core.view.EventGenerator.prototype.generateEventsForChanges = function(changes, eventCache, eventRegistrations) {
  var events = [], self = this;

  var moves = [];
  goog.array.forEach(changes, function(change) {
    if (change.type === fb.core.view.Change.CHILD_CHANGED &&
        self.index_.indexedValueChanged(/** @type {!fb.core.snap.Node} */ (change.oldSnap), change.snapshotNode)) {
      moves.push(fb.core.view.Change.childMovedChange(/** @type {!string} */ (change.childName), change.snapshotNode));
    }
  });

  this.generateEventsForType_(events, fb.core.view.Change.CHILD_REMOVED, changes, eventRegistrations, eventCache);
  this.generateEventsForType_(events, fb.core.view.Change.CHILD_ADDED, changes, eventRegistrations, eventCache);
  this.generateEventsForType_(events, fb.core.view.Change.CHILD_MOVED, moves, eventRegistrations, eventCache);
  this.generateEventsForType_(events, fb.core.view.Change.CHILD_CHANGED, changes, eventRegistrations, eventCache);
  this.generateEventsForType_(events, fb.core.view.Change.VALUE, changes, eventRegistrations, eventCache);

  return events;
};

/**
 * Given changes of a single change type, generate the corresponding events.
 *
 * @param {!Array.<!fb.core.view.Event>} events
 * @param {!string} eventType
 * @param {!Array.<!fb.core.view.Change>} changes
 * @param {!Array.<!fb.core.view.EventRegistration>} registrations
 * @param {!fb.core.snap.Node} eventCache
 * @private
 */
fb.core.view.EventGenerator.prototype.generateEventsForType_ = function(events, eventType, changes, registrations,
                                                                        eventCache) {
  var filteredChanges = goog.array.filter(changes, function(change) {
    return change.type === eventType;
  });

  var self = this;
  goog.array.sort(filteredChanges, goog.bind(this.compareChanges_, this));
  goog.array.forEach(filteredChanges, function(change) {
    var materializedChange = self.materializeSingleChange_(change, eventCache);
    goog.array.forEach(registrations, function(registration) {
      if (registration.respondsTo(change.type)) {
        events.push(registration.createEvent(materializedChange, self.query_));
      }
    });
  });
};


/**
 * @param {!fb.core.view.Change} change
 * @param {!fb.core.snap.Node} eventCache
 * @return {!fb.core.view.Change}
 * @private
 */
fb.core.view.EventGenerator.prototype.materializeSingleChange_ = function(change, eventCache) {
  if (change.type === 'value' || change.type === 'child_removed') {
    return change;
  } else {
    change.prevName = eventCache.getPredecessorChildName(/** @type {!string} */ (change.childName), change.snapshotNode,
        this.index_);
    return change;
  }
};

/**
 * @param {!fb.core.view.Change} a
 * @param {!fb.core.view.Change} b
 * @return {number}
 * @private
 */
fb.core.view.EventGenerator.prototype.compareChanges_ = function(a, b) {
  if (a.childName == null || b.childName == null) {
    throw fb.core.util.assertionError('Should only compare child_ events.');
  }
  var aWrapped = new fb.core.snap.NamedNode(a.childName, a.snapshotNode);
  var bWrapped = new fb.core.snap.NamedNode(b.childName, b.snapshotNode);
  return this.index_.compare(aWrapped, bWrapped);
};
