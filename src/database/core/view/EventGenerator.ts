import { NamedNode, Node } from '../snap/Node';
import { Change } from "./Change";
import { assertionError } from "../../../utils/assert";
import { Query } from '../../api/Query';
import { Index } from '../snap/indexes/Index';
import { EventRegistration } from './EventRegistration';
import { Event } from './Event';

/**
 * An EventGenerator is used to convert "raw" changes (Change) as computed by the
 * CacheDiffer into actual events (Event) that can be raised.  See generateEventsForChanges()
 * for details.
 *
 * @param {!Query} query
 * @constructor
 */
export class EventGenerator {
  private index_: Index;

  constructor(private query_: Query) {
    /**
     * @private
     * @type {!Index}
     */
    this.index_ = this.query_.getQueryParams().getIndex();
  }

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
   * @param {!Array.<!EventRegistration>} eventRegistrations
   * @return {!Array.<!Event>}
   */
  generateEventsForChanges(changes: Change[], eventCache: Node, eventRegistrations: EventRegistration[]): Event[] {
    const events = [];
    const moves = [];

    changes.forEach((change) => {
      if (change.type === Change.CHILD_CHANGED &&
        this.index_.indexedValueChanged(/** @type {!Node} */ (change.oldSnap), change.snapshotNode)) {
        moves.push(Change.childMovedChange(/** @type {!string} */ (change.childName), change.snapshotNode));
      }
    });

    this.generateEventsForType_(events, Change.CHILD_REMOVED, changes, eventRegistrations, eventCache);
    this.generateEventsForType_(events, Change.CHILD_ADDED, changes, eventRegistrations, eventCache);
    this.generateEventsForType_(events, Change.CHILD_MOVED, moves, eventRegistrations, eventCache);
    this.generateEventsForType_(events, Change.CHILD_CHANGED, changes, eventRegistrations, eventCache);
    this.generateEventsForType_(events, Change.VALUE, changes, eventRegistrations, eventCache);

    return events;
  }

  /**
   * Given changes of a single change type, generate the corresponding events.
   *
   * @param {!Array.<!Event>} events
   * @param {!string} eventType
   * @param {!Array.<!Change>} changes
   * @param {!Array.<!EventRegistration>} registrations
   * @param {!Node} eventCache
   * @private
   */
  private generateEventsForType_(events: Event[], eventType: string, changes: Change[],
                                 registrations: EventRegistration[], eventCache: Node) {
    const filteredChanges = changes.filter((change) => change.type === eventType);

    filteredChanges.sort(this.compareChanges_.bind(this));
    filteredChanges.forEach((change) => {
      const materializedChange = this.materializeSingleChange_(change, eventCache);
      registrations.forEach((registration) => {
        if (registration.respondsTo(change.type)) {
          events.push(registration.createEvent(materializedChange, this.query_));
        }
      });
    });
  }

  /**
   * @param {!Change} change
   * @param {!Node} eventCache
   * @return {!Change}
   * @private
   */
  private materializeSingleChange_(change: Change, eventCache: Node): Change {
    if (change.type === 'value' || change.type === 'child_removed') {
      return change;
    } else {
      change.prevName = eventCache.getPredecessorChildName(/** @type {!string} */ (change.childName), change.snapshotNode,
        this.index_);
      return change;
    }
  }

  /**
   * @param {!Change} a
   * @param {!Change} b
   * @return {number}
   * @private
   */
  private compareChanges_(a: Change, b: Change) {
    if (a.childName == null || b.childName == null) {
      throw assertionError('Should only compare child_ events.');
    }
    const aWrapped = new NamedNode(a.childName, a.snapshotNode);
    const bWrapped = new NamedNode(b.childName, b.snapshotNode);
    return this.index_.compare(aWrapped, bWrapped);
  }
}
