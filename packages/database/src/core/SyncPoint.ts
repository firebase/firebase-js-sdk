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

import { CacheNode } from './view/CacheNode';
import { ChildrenNode } from './snap/ChildrenNode';
import { assert } from '@firebase/util';
import { ViewCache } from './view/ViewCache';
import { View } from './view/View';
import { Operation } from './operation/Operation';
import { WriteTreeRef } from './WriteTree';
import { Query } from '../api/Query';
import { EventRegistration } from './view/EventRegistration';
import { Node } from './snap/Node';
import { Path } from './util/Path';
import { Event } from './view/Event';
import { Reference, ReferenceConstructor } from '../api/Reference';

let __referenceConstructor: ReferenceConstructor;

/**
 * SyncPoint represents a single location in a SyncTree with 1 or more event registrations, meaning we need to
 * maintain 1 or more Views at this location to cache server data and raise appropriate events for server changes
 * and user writes (set, transaction, update).
 *
 * It's responsible for:
 *  - Maintaining the set of 1 or more views necessary at this location (a SyncPoint with 0 views should be removed).
 *  - Proxying user / server operations to the views as appropriate (i.e. applyServerOverwrite,
 *    applyUserOverwrite, etc.)
 */
export class SyncPoint {
  static set __referenceConstructor(val: ReferenceConstructor) {
    assert(
      !__referenceConstructor,
      '__referenceConstructor has already been defined'
    );
    __referenceConstructor = val;
  }

  static get __referenceConstructor() {
    assert(__referenceConstructor, 'Reference.ts has not been loaded');
    return __referenceConstructor;
  }

  /**
   * The Views being tracked at this location in the tree, stored as a map where the key is a
   * queryId and the value is the View for that query.
   *
   * NOTE: This list will be quite small (usually 1, but perhaps 2 or 3; any more is an odd use case).
   */
  private readonly views: Map<string, View> = new Map();

  isEmpty(): boolean {
    return this.views.size === 0;
  }

  applyOperation(
    operation: Operation,
    writesCache: WriteTreeRef,
    optCompleteServerCache: Node | null
  ): Event[] {
    const queryId = operation.source.queryId;
    if (queryId !== null) {
      const view = this.views.get(queryId);
      assert(view != null, 'SyncTree gave us an op for an invalid query.');
      return view.applyOperation(
        operation,
        writesCache,
        optCompleteServerCache
      );
    } else {
      let events: Event[] = [];

      for (const view of this.views.values()) {
        events = events.concat(
          view.applyOperation(operation, writesCache, optCompleteServerCache)
        );
      }

      return events;
    }
  }

  /**
   * Add an event callback for the specified query.
   *
   * @param {!Query} query
   * @param {!EventRegistration} eventRegistration
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} serverCache Complete server cache, if we have it.
   * @param {boolean} serverCacheComplete
   * @return {!Array.<!Event>} Events to raise.
   */
  addEventRegistration(
    query: Query,
    eventRegistration: EventRegistration,
    writesCache: WriteTreeRef,
    serverCache: Node | null,
    serverCacheComplete: boolean
  ): Event[] {
    const queryId = query.queryIdentifier();
    let view = this.views.get(queryId);
    if (!view) {
      // TODO: make writesCache take flag for complete server node
      let eventCache = writesCache.calcCompleteEventCache(
        serverCacheComplete ? serverCache : null
      );
      let eventCacheComplete = false;
      if (eventCache) {
        eventCacheComplete = true;
      } else if (serverCache instanceof ChildrenNode) {
        eventCache = writesCache.calcCompleteEventChildren(serverCache);
        eventCacheComplete = false;
      } else {
        eventCache = ChildrenNode.EMPTY_NODE;
        eventCacheComplete = false;
      }
      const viewCache = new ViewCache(
        new CacheNode(
          /** @type {!Node} */ eventCache,
          eventCacheComplete,
          false
        ),
        new CacheNode(
          /** @type {!Node} */ serverCache,
          serverCacheComplete,
          false
        )
      );
      view = new View(query, viewCache);
      this.views.set(queryId, view);
    }

    // This is guaranteed to exist now, we just created anything that was missing
    view.addEventRegistration(eventRegistration);
    return view.getInitialEvents(eventRegistration);
  }

  /**
   * Remove event callback(s).  Return cancelEvents if a cancelError is specified.
   *
   * If query is the default query, we'll check all views for the specified eventRegistration.
   * If eventRegistration is null, we'll remove all callbacks for the specified view(s).
   *
   * @param {!Query} query
   * @param {?EventRegistration} eventRegistration If null, remove all callbacks.
   * @param {Error=} cancelError If a cancelError is provided, appropriate cancel events will be returned.
   * @return {{removed:!Array.<!Query>, events:!Array.<!Event>}} removed queries and any cancel events
   */
  removeEventRegistration(
    query: Query,
    eventRegistration: EventRegistration | null,
    cancelError?: Error
  ): { removed: Query[]; events: Event[] } {
    const queryId = query.queryIdentifier();
    const removed: Query[] = [];
    let cancelEvents: Event[] = [];
    const hadCompleteView = this.hasCompleteView();
    if (queryId === 'default') {
      // When you do ref.off(...), we search all views for the registration to remove.
      for (const [viewQueryId, view] of this.views.entries()) {
        cancelEvents = cancelEvents.concat(
          view.removeEventRegistration(eventRegistration, cancelError)
        );
        if (view.isEmpty()) {
          this.views.delete(viewQueryId);

          // We'll deal with complete views later.
          if (!view.getQuery().getQueryParams().loadsAllData()) {
            removed.push(view.getQuery());
          }
        }
      }
    } else {
      // remove the callback from the specific view.
      const view = this.views.get(queryId);
      if (view) {
        cancelEvents = cancelEvents.concat(
          view.removeEventRegistration(eventRegistration, cancelError)
        );
        if (view.isEmpty()) {
          this.views.delete(queryId);

          // We'll deal with complete views later.
          if (!view.getQuery().getQueryParams().loadsAllData()) {
            removed.push(view.getQuery());
          }
        }
      }
    }

    if (hadCompleteView && !this.hasCompleteView()) {
      // We removed our last complete view.
      removed.push(
        new SyncPoint.__referenceConstructor(query.repo, query.path)
      );
    }

    return { removed, events: cancelEvents };
  }

  getQueryViews(): View[] {
    const result = [];
    for (const view of this.views.values()) {
      if (!view.getQuery().getQueryParams().loadsAllData()) {
        result.push(view);
      }
    }
    return result;
  }

  /**
   * @param path The path to the desired complete snapshot
   * @return A complete cache, if it exists
   */
  getCompleteServerCache(path: Path): Node | null {
    let serverCache: Node | null = null;
    for (const view of this.views.values()) {
      serverCache = serverCache || view.getCompleteServerCache(path);
    }
    return serverCache;
  }

  viewForQuery(query: Query): View | null {
    const params = query.getQueryParams();
    if (params.loadsAllData()) {
      return this.getCompleteView();
    } else {
      const queryId = query.queryIdentifier();
      return this.views.get(queryId);
    }
  }

  viewExistsForQuery(query: Query): boolean {
    return this.viewForQuery(query) != null;
  }

  hasCompleteView(): boolean {
    return this.getCompleteView() != null;
  }

  getCompleteView(): View | null {
    for (const view of this.views.values()) {
      if (view.getQuery().getQueryParams().loadsAllData()) {
        return view;
      }
    }
    return null;
  }
}
