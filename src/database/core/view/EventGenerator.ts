import { NamedNode } from "../snap/Node";
import { Change } from "./Change";
import { assertionError } from "../../../utils/assert";

/**
 * An EventGenerator is used to convert "raw" changes (Change) as computed by the
 * CacheDiffer into actual events (fb.core.view.Event) that can be raised.  See generateEventsForChanges()
 * for details.
 *
 * @param {!fb.api.Query} query
 * @constructor
 */
export const EventGenerator = function(query) {
  /**
   * @private
   * @type {!fb.api.Query}
   */
  this.query_ = query;

  /**
   * @private
   * @type {!Index}
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
 * @param {!Array.<!Change>} changes
 * @param {!Node} eventCache
 * @param {!Array.<!fb.core.view.EventRegistration>} eventRegistrations
 * @return {!Array.<!fb.core.view.Event>}
 */
EventGenerator.prototype.generateEventsForChanges = function(changes, eventCache, eventRegistrations) {
  var events = [], self = this;

  var moves = [];
  changes.forEach(function(change) {
    if (change.type === Change.CHILD_CHANGED &&
        self.index_.indexedValueChanged(/** @type {!Node} */ (change.oldSnap), change.snapshotNode)) {
      moves.push(Change.childMovedChange(/** @type {!string} */ (change.childName), change.snapshotNode));
    }
  });

  this.generateEventsForType_(events, Change.CHILD_REMOVED, changes, eventRegistrations, eventCache);
  this.generateEventsForType_(events, Change.CHILD_ADDED, changes, eventRegistrations, eventCache);
  this.generateEventsForType_(events, Change.CHILD_MOVED, moves, eventRegistrations, eventCache);
  this.generateEventsForType_(events, Change.CHILD_CHANGED, changes, eventRegistrations, eventCache);
  this.generateEventsForType_(events, Change.VALUE, changes, eventRegistrations, eventCache);

  return events;
};

/**
 * Given changes of a single change type, generate the corresponding events.
 *
 * @param {!Array.<!fb.core.view.Event>} events
 * @param {!string} eventType
 * @param {!Array.<!Change>} changes
 * @param {!Array.<!fb.core.view.EventRegistration>} registrations
 * @param {!Node} eventCache
 * @private
 */
EventGenerator.prototype.generateEventsForType_ = function(events, eventType, changes, registrations,
                                                                        eventCache) {
  var filteredChanges = changes.filter(function(change) {
    return change.type === eventType;
  });

  var self = this;
  filteredChanges.sort(this.compareChanges_.bind(this));
  filteredChanges.forEach(function(change) {
    var materializedChange = self.materializeSingleChange_(change, eventCache);
    registrations.forEach(function(registration) {
      if (registration.respondsTo(change.type)) {
        events.push(registration.createEvent(materializedChange, self.query_));
      }
    });
  });
};


/**
 * @param {!Change} change
 * @param {!Node} eventCache
 * @return {!Change}
 * @private
 */
EventGenerator.prototype.materializeSingleChange_ = function(change, eventCache) {
  if (change.type === 'value' || change.type === 'child_removed') {
    return change;
  } else {
    change.prevName = eventCache.getPredecessorChildName(/** @type {!string} */ (change.childName), change.snapshotNode,
        this.index_);
    return change;
  }
};

/**
 * @param {!Change} a
 * @param {!Change} b
 * @return {number}
 * @private
 */
EventGenerator.prototype.compareChanges_ = function(a, b) {
  if (a.childName == null || b.childName == null) {
    throw assertionError('Should only compare child_ events.');
  }
  var aWrapped = new NamedNode(a.childName, a.snapshotNode);
  var bWrapped = new NamedNode(b.childName, b.snapshotNode);
  return this.index_.compare(aWrapped, bWrapped);
};
