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

import { assert } from '@firebase/util';

import { Operation, OperationType } from '../operation/Operation';
import { ChildrenNode } from '../snap/ChildrenNode';
import { PRIORITY_INDEX } from '../snap/indexes/PriorityIndex';
import { Node } from '../snap/Node';
import { Path, pathGetFront, pathIsEmpty } from '../util/Path';
import { WriteTreeRef } from '../WriteTree';

import { CacheNode } from './CacheNode';
import { Change, changeChildAdded, changeValue } from './Change';
import { CancelEvent, Event } from './Event';
import {
  EventGenerator,
  eventGeneratorGenerateEventsForChanges
} from './EventGenerator';
import { EventRegistration, QueryContext } from './EventRegistration';
import { IndexedFilter } from './filter/IndexedFilter';
import { queryParamsGetNodeFilter } from './QueryParams';
import {
  newViewCache,
  ViewCache,
  viewCacheGetCompleteEventSnap,
  viewCacheGetCompleteServerSnap
} from './ViewCache';
import {
  newViewProcessor,
  ViewProcessor,
  viewProcessorApplyOperation,
  viewProcessorAssertIndexed
} from './ViewProcessor';

/**
 * A view represents a specific location and query that has 1 or more event registrations.
 *
 * It does several things:
 *  - Maintains the list of event registrations for this location/query.
 *  - Maintains a cache of the data visible for this location/query.
 *  - Applies new operations (via applyOperation), updates the cache, and based on the event
 *    registrations returns the set of events to be raised.
 */
export class View {
  processor_: ViewProcessor;
  viewCache_: ViewCache;
  eventRegistrations_: EventRegistration[] = [];
  eventGenerator_: EventGenerator;

  constructor(private query_: QueryContext, initialViewCache: ViewCache) {
    const params = this.query_._queryParams;

    const indexFilter = new IndexedFilter(params.getIndex());
    const filter = queryParamsGetNodeFilter(params);

    this.processor_ = newViewProcessor(filter);

    const initialServerCache = initialViewCache.serverCache;
    const initialEventCache = initialViewCache.eventCache;

    // Don't filter server node with other filter than index, wait for tagged listen
    const serverSnap = indexFilter.updateFullNode(
      ChildrenNode.EMPTY_NODE,
      initialServerCache.getNode(),
      null
    );
    const eventSnap = filter.updateFullNode(
      ChildrenNode.EMPTY_NODE,
      initialEventCache.getNode(),
      null
    );
    const newServerCache = new CacheNode(
      serverSnap,
      initialServerCache.isFullyInitialized(),
      indexFilter.filtersNodes()
    );
    const newEventCache = new CacheNode(
      eventSnap,
      initialEventCache.isFullyInitialized(),
      filter.filtersNodes()
    );

    this.viewCache_ = newViewCache(newEventCache, newServerCache);
    this.eventGenerator_ = new EventGenerator(this.query_);
  }

  get query(): QueryContext {
    return this.query_;
  }
}

export function viewGetServerCache(view: View): Node | null {
  return view.viewCache_.serverCache.getNode();
}

export function viewGetCompleteNode(view: View): Node | null {
  return viewCacheGetCompleteEventSnap(view.viewCache_);
}

export function viewGetCompleteServerCache(
  view: View,
  path: Path
): Node | null {
  const cache = viewCacheGetCompleteServerSnap(view.viewCache_);
  if (cache) {
    // If this isn't a "loadsAllData" view, then cache isn't actually a complete cache and
    // we need to see if it contains the child we're interested in.
    if (
      view.query._queryParams.loadsAllData() ||
      (!pathIsEmpty(path) &&
        !cache.getImmediateChild(pathGetFront(path)).isEmpty())
    ) {
      return cache.getChild(path);
    }
  }
  return null;
}

export function viewIsEmpty(view: View): boolean {
  return view.eventRegistrations_.length === 0;
}

export function viewAddEventRegistration(
  view: View,
  eventRegistration: EventRegistration
) {
  view.eventRegistrations_.push(eventRegistration);
}

/**
 * @param eventRegistration - If null, remove all callbacks.
 * @param cancelError - If a cancelError is provided, appropriate cancel events will be returned.
 * @returns Cancel events, if cancelError was provided.
 */
export function viewRemoveEventRegistration(
  view: View,
  eventRegistration: EventRegistration | null,
  cancelError?: Error
): Event[] {
  const cancelEvents: CancelEvent[] = [];
  if (cancelError) {
    assert(
      eventRegistration == null,
      'A cancel should cancel all event registrations.'
    );
    const path = view.query._path;
    view.eventRegistrations_.forEach(registration => {
      const maybeEvent = registration.createCancelEvent(cancelError, path);
      if (maybeEvent) {
        cancelEvents.push(maybeEvent);
      }
    });
  }

  if (eventRegistration) {
    let remaining = [];
    for (let i = 0; i < view.eventRegistrations_.length; ++i) {
      const existing = view.eventRegistrations_[i];
      if (!existing.matches(eventRegistration)) {
        remaining.push(existing);
      } else if (eventRegistration.hasAnyCallback()) {
        // We're removing just this one
        remaining = remaining.concat(view.eventRegistrations_.slice(i + 1));
        break;
      }
    }
    view.eventRegistrations_ = remaining;
  } else {
    view.eventRegistrations_ = [];
  }
  return cancelEvents;
}

/**
 * Applies the given Operation, updates our cache, and returns the appropriate events.
 */
export function viewApplyOperation(
  view: View,
  operation: Operation,
  writesCache: WriteTreeRef,
  completeServerCache: Node | null
): Event[] {
  if (
    operation.type === OperationType.MERGE &&
    operation.source.queryId !== null
  ) {
    assert(
      viewCacheGetCompleteServerSnap(view.viewCache_),
      'We should always have a full cache before handling merges'
    );
    assert(
      viewCacheGetCompleteEventSnap(view.viewCache_),
      'Missing event cache, even though we have a server cache'
    );
  }

  const oldViewCache = view.viewCache_;
  const result = viewProcessorApplyOperation(
    view.processor_,
    oldViewCache,
    operation,
    writesCache,
    completeServerCache
  );
  viewProcessorAssertIndexed(view.processor_, result.viewCache);

  assert(
    result.viewCache.serverCache.isFullyInitialized() ||
      !oldViewCache.serverCache.isFullyInitialized(),
    'Once a server snap is complete, it should never go back'
  );

  view.viewCache_ = result.viewCache;

  return viewGenerateEventsForChanges_(
    view,
    result.changes,
    result.viewCache.eventCache.getNode(),
    null
  );
}

export function viewGetInitialEvents(
  view: View,
  registration: EventRegistration
): Event[] {
  const eventSnap = view.viewCache_.eventCache;
  const initialChanges: Change[] = [];
  if (!eventSnap.getNode().isLeafNode()) {
    const eventNode = eventSnap.getNode() as ChildrenNode;
    eventNode.forEachChild(PRIORITY_INDEX, (key, childNode) => {
      initialChanges.push(changeChildAdded(key, childNode));
    });
  }
  if (eventSnap.isFullyInitialized()) {
    initialChanges.push(changeValue(eventSnap.getNode()));
  }
  return viewGenerateEventsForChanges_(
    view,
    initialChanges,
    eventSnap.getNode(),
    registration
  );
}

function viewGenerateEventsForChanges_(
  view: View,
  changes: Change[],
  eventCache: Node,
  eventRegistration?: EventRegistration
): Event[] {
  const registrations = eventRegistration
    ? [eventRegistration]
    : view.eventRegistrations_;
  return eventGeneratorGenerateEventsForChanges(
    view.eventGenerator_,
    changes,
    eventCache,
    registrations
  );
}
