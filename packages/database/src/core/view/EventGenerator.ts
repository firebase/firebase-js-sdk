/**
 * @license
 * Copyright 2017 Google LLC
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

import { assertionError } from '@firebase/util';

import { Index } from '../snap/indexes/Index';
import { NamedNode, Node } from '../snap/Node';

import { Change, ChangeType, changeChildMoved } from './Change';
import { Event } from './Event';
import { EventRegistration, QueryContext } from './EventRegistration';

/**
 * An EventGenerator is used to convert "raw" changes (Change) as computed by the
 * CacheDiffer into actual events (Event) that can be raised.  See generateEventsForChanges()
 * for details.
 *
 */
export class EventGenerator {
  index_: Index;

  constructor(public query_: QueryContext) {
    this.index_ = this.query_._queryParams.getIndex();
  }
}

/**
 * Given a set of raw changes (no moved events and prevName not specified yet), and a set of
 * EventRegistrations that should be notified of these changes, generate the actual events to be raised.
 *
 * Notes:
 *  - child_moved events will be synthesized at this time for any child_changed events that affect
 *    our index.
 *  - prevName will be calculated based on the index ordering.
 */
export function eventGeneratorGenerateEventsForChanges(
  eventGenerator: EventGenerator,
  changes: Change[],
  eventCache: Node,
  eventRegistrations: EventRegistration[]
): Event[] {
  const events: Event[] = [];
  const moves: Change[] = [];

  changes.forEach(change => {
    if (
      change.type === ChangeType.CHILD_CHANGED &&
      eventGenerator.index_.indexedValueChanged(
        change.oldSnap as Node,
        change.snapshotNode
      )
    ) {
      moves.push(changeChildMoved(change.childName, change.snapshotNode));
    }
  });

  eventGeneratorGenerateEventsForType(
    eventGenerator,
    events,
    ChangeType.CHILD_REMOVED,
    changes,
    eventRegistrations,
    eventCache
  );
  eventGeneratorGenerateEventsForType(
    eventGenerator,
    events,
    ChangeType.CHILD_ADDED,
    changes,
    eventRegistrations,
    eventCache
  );
  eventGeneratorGenerateEventsForType(
    eventGenerator,
    events,
    ChangeType.CHILD_MOVED,
    moves,
    eventRegistrations,
    eventCache
  );
  eventGeneratorGenerateEventsForType(
    eventGenerator,
    events,
    ChangeType.CHILD_CHANGED,
    changes,
    eventRegistrations,
    eventCache
  );
  eventGeneratorGenerateEventsForType(
    eventGenerator,
    events,
    ChangeType.VALUE,
    changes,
    eventRegistrations,
    eventCache
  );

  return events;
}

/**
 * Given changes of a single change type, generate the corresponding events.
 */
function eventGeneratorGenerateEventsForType(
  eventGenerator: EventGenerator,
  events: Event[],
  eventType: string,
  changes: Change[],
  registrations: EventRegistration[],
  eventCache: Node
) {
  const filteredChanges = changes.filter(change => change.type === eventType);

  filteredChanges.sort((a, b) =>
    eventGeneratorCompareChanges(eventGenerator, a, b)
  );
  filteredChanges.forEach(change => {
    const materializedChange = eventGeneratorMaterializeSingleChange(
      eventGenerator,
      change,
      eventCache
    );
    registrations.forEach(registration => {
      if (registration.respondsTo(change.type)) {
        events.push(
          registration.createEvent(materializedChange, eventGenerator.query_)
        );
      }
    });
  });
}

function eventGeneratorMaterializeSingleChange(
  eventGenerator: EventGenerator,
  change: Change,
  eventCache: Node
): Change {
  if (change.type === 'value' || change.type === 'child_removed') {
    return change;
  } else {
    change.prevName = eventCache.getPredecessorChildName(
      change.childName,
      change.snapshotNode,
      eventGenerator.index_
    );
    return change;
  }
}

function eventGeneratorCompareChanges(
  eventGenerator: EventGenerator,
  a: Change,
  b: Change
) {
  if (a.childName == null || b.childName == null) {
    throw assertionError('Should only compare child_ events.');
  }
  const aWrapped = new NamedNode(a.childName, a.snapshotNode);
  const bWrapped = new NamedNode(b.childName, b.snapshotNode);
  return eventGenerator.index_.compare(aWrapped, bWrapped);
}
