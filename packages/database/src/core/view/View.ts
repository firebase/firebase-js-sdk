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

import { IndexedFilter } from './filter/IndexedFilter';
import { ViewProcessor } from './ViewProcessor';
import { ChildrenNode } from '../snap/ChildrenNode';
import { CacheNode } from './CacheNode';
import { ViewCache } from './ViewCache';
import { EventGenerator } from './EventGenerator';
import { assert } from '@firebase/util';
import { Operation, OperationType } from '../operation/Operation';
import { Change } from './Change';
import { PRIORITY_INDEX } from '../snap/indexes/PriorityIndex';
import { Query } from '../../api/Query';
import { EventRegistration } from './EventRegistration';
import { Node } from '../snap/Node';
import { Path } from '../util/Path';
import { WriteTreeRef } from '../WriteTree';
import { CancelEvent, Event } from './Event';

/**
 * A view represents a specific location and query that has 1 or more event registrations.
 *
 * It does several things:
 *  - Maintains the list of event registrations for this location/query.
 *  - Maintains a cache of the data visible for this location/query.
 *  - Applies new operations (via applyOperation), updates the cache, and based on the event
 *    registrations returns the set of events to be raised.
 * @constructor
 */
export class View {
  private processor_: ViewProcessor;
  private viewCache_: ViewCache;
  private eventRegistrations_: EventRegistration[] = [];
  private eventGenerator_: EventGenerator;

  /**
   *
   * @param {!Query} query_
   * @param {!ViewCache} initialViewCache
   */
  constructor(private query_: Query, initialViewCache: ViewCache) {
    const params = this.query_.getQueryParams();

    const indexFilter = new IndexedFilter(params.getIndex());
    const filter = params.getNodeFilter();

    /**
     * @type {ViewProcessor}
     * @private
     */
    this.processor_ = new ViewProcessor(filter);

    const initialServerCache = initialViewCache.getServerCache();
    const initialEventCache = initialViewCache.getEventCache();

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

    /**
     * @type {!ViewCache}
     * @private
     */
    this.viewCache_ = new ViewCache(newEventCache, newServerCache);

    /**
     * @type {!EventGenerator}
     * @private
     */
    this.eventGenerator_ = new EventGenerator(this.query_);
  }

  /**
   * @return {!Query}
   */
  getQuery(): Query {
    return this.query_;
  }

  /**
   * @return {?Node}
   */
  getServerCache(): Node | null {
    return this.viewCache_.getServerCache().getNode();
  }

  /**
   * @param {!Path} path
   * @return {?Node}
   */
  getCompleteServerCache(path: Path): Node | null {
    const cache = this.viewCache_.getCompleteServerSnap();
    if (cache) {
      // If this isn't a "loadsAllData" view, then cache isn't actually a complete cache and
      // we need to see if it contains the child we're interested in.
      if (
        this.query_.getQueryParams().loadsAllData() ||
        (!path.isEmpty() && !cache.getImmediateChild(path.getFront()).isEmpty())
      ) {
        return cache.getChild(path);
      }
    }
    return null;
  }

  /**
   * @return {boolean}
   */
  isEmpty(): boolean {
    return this.eventRegistrations_.length === 0;
  }

  /**
   * @param {!EventRegistration} eventRegistration
   */
  addEventRegistration(eventRegistration: EventRegistration) {
    this.eventRegistrations_.push(eventRegistration);
  }

  /**
   * @param {?EventRegistration} eventRegistration If null, remove all callbacks.
   * @param {Error=} cancelError If a cancelError is provided, appropriate cancel events will be returned.
   * @return {!Array.<!Event>} Cancel events, if cancelError was provided.
   */
  removeEventRegistration(
    eventRegistration: EventRegistration | null,
    cancelError?: Error
  ): Event[] {
    const cancelEvents: CancelEvent[] = [];
    if (cancelError) {
      assert(
        eventRegistration == null,
        'A cancel should cancel all event registrations.'
      );
      const path = this.query_.path;
      this.eventRegistrations_.forEach(function(registration) {
        cancelError /** @type {!Error} */ = cancelError;
        const maybeEvent = registration.createCancelEvent(cancelError, path);
        if (maybeEvent) {
          cancelEvents.push(maybeEvent);
        }
      });
    }

    if (eventRegistration) {
      let remaining = [];
      for (let i = 0; i < this.eventRegistrations_.length; ++i) {
        const existing = this.eventRegistrations_[i];
        if (!existing.matches(eventRegistration)) {
          remaining.push(existing);
        } else if (eventRegistration.hasAnyCallback()) {
          // We're removing just this one
          remaining = remaining.concat(this.eventRegistrations_.slice(i + 1));
          break;
        }
      }
      this.eventRegistrations_ = remaining;
    } else {
      this.eventRegistrations_ = [];
    }
    return cancelEvents;
  }

  /**
   * Applies the given Operation, updates our cache, and returns the appropriate events.
   *
   * @param {!Operation} operation
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} completeServerCache
   * @return {!Array.<!Event>}
   */
  applyOperation(
    operation: Operation,
    writesCache: WriteTreeRef,
    completeServerCache: Node | null
  ): Event[] {
    if (
      operation.type === OperationType.MERGE &&
      operation.source.queryId !== null
    ) {
      assert(
        this.viewCache_.getCompleteServerSnap(),
        'We should always have a full cache before handling merges'
      );
      assert(
        this.viewCache_.getCompleteEventSnap(),
        'Missing event cache, even though we have a server cache'
      );
    }

    const oldViewCache = this.viewCache_;
    const result = this.processor_.applyOperation(
      oldViewCache,
      operation,
      writesCache,
      completeServerCache
    );
    this.processor_.assertIndexed(result.viewCache);

    assert(
      result.viewCache.getServerCache().isFullyInitialized() ||
        !oldViewCache.getServerCache().isFullyInitialized(),
      'Once a server snap is complete, it should never go back'
    );

    this.viewCache_ = result.viewCache;

    return this.generateEventsForChanges_(
      result.changes,
      result.viewCache.getEventCache().getNode(),
      null
    );
  }

  /**
   * @param {!EventRegistration} registration
   * @return {!Array.<!Event>}
   */
  getInitialEvents(registration: EventRegistration): Event[] {
    const eventSnap = this.viewCache_.getEventCache();
    const initialChanges: Change[] = [];
    if (!eventSnap.getNode().isLeafNode()) {
      const eventNode = eventSnap.getNode() as ChildrenNode;
      eventNode.forEachChild(PRIORITY_INDEX, function(key, childNode) {
        initialChanges.push(Change.childAddedChange(key, childNode));
      });
    }
    if (eventSnap.isFullyInitialized()) {
      initialChanges.push(Change.valueChange(eventSnap.getNode()));
    }
    return this.generateEventsForChanges_(
      initialChanges,
      eventSnap.getNode(),
      registration
    );
  }

  /**
   * @private
   * @param {!Array.<!Change>} changes
   * @param {!Node} eventCache
   * @param {EventRegistration=} eventRegistration
   * @return {!Array.<!Event>}
   */
  generateEventsForChanges_(
    changes: Change[],
    eventCache: Node,
    eventRegistration?: EventRegistration
  ): Event[] {
    const registrations = eventRegistration
      ? [eventRegistration]
      : this.eventRegistrations_;
    return this.eventGenerator_.generateEventsForChanges(
      changes,
      eventCache,
      registrations
    );
  }
}
