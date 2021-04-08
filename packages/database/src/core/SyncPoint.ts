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

import { ReferenceConstructor } from '../exp/Reference';

import { Operation } from './operation/Operation';
import { ChildrenNode } from './snap/ChildrenNode';
import { Node } from './snap/Node';
import { Path } from './util/Path';
import { CacheNode } from './view/CacheNode';
import { Event } from './view/Event';
import { EventRegistration, QueryContext } from './view/EventRegistration';
import {
  View,
  viewAddEventRegistration,
  viewApplyOperation,
  viewGetCompleteServerCache,
  viewGetInitialEvents,
  viewIsEmpty,
  viewRemoveEventRegistration
} from './view/View';
import { newViewCache } from './view/ViewCache';
import {
  WriteTreeRef,
  writeTreeRefCalcCompleteEventCache,
  writeTreeRefCalcCompleteEventChildren
} from './WriteTree';

let referenceConstructor: ReferenceConstructor;

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
  /**
   * The Views being tracked at this location in the tree, stored as a map where the key is a
   * queryId and the value is the View for that query.
   *
   * NOTE: This list will be quite small (usually 1, but perhaps 2 or 3; any more is an odd use case).
   */
  readonly views: Map<string, View> = new Map();
}

export function syncPointSetReferenceConstructor(
  val: ReferenceConstructor
): void {
  assert(
    !referenceConstructor,
    '__referenceConstructor has already been defined'
  );
  referenceConstructor = val;
}

function syncPointGetReferenceConstructor(): ReferenceConstructor {
  assert(referenceConstructor, 'Reference.ts has not been loaded');
  return referenceConstructor;
}

export function syncPointIsEmpty(syncPoint: SyncPoint): boolean {
  return syncPoint.views.size === 0;
}

export function syncPointApplyOperation(
  syncPoint: SyncPoint,
  operation: Operation,
  writesCache: WriteTreeRef,
  optCompleteServerCache: Node | null
): Event[] {
  const queryId = operation.source.queryId;
  if (queryId !== null) {
    const view = syncPoint.views.get(queryId);
    assert(view != null, 'SyncTree gave us an op for an invalid query.');
    return viewApplyOperation(
      view,
      operation,
      writesCache,
      optCompleteServerCache
    );
  } else {
    let events: Event[] = [];

    for (const view of syncPoint.views.values()) {
      events = events.concat(
        viewApplyOperation(view, operation, writesCache, optCompleteServerCache)
      );
    }

    return events;
  }
}

/**
 * Get a view for the specified query.
 *
 * @param query - The query to return a view for
 * @param writesCache
 * @param serverCache
 * @param serverCacheComplete
 * @returns Events to raise.
 */
export function syncPointGetView(
  syncPoint: SyncPoint,
  query: QueryContext,
  writesCache: WriteTreeRef,
  serverCache: Node | null,
  serverCacheComplete: boolean
): View {
  const queryId = query._queryIdentifier;
  const view = syncPoint.views.get(queryId);
  if (!view) {
    // TODO: make writesCache take flag for complete server node
    let eventCache = writeTreeRefCalcCompleteEventCache(
      writesCache,
      serverCacheComplete ? serverCache : null
    );
    let eventCacheComplete = false;
    if (eventCache) {
      eventCacheComplete = true;
    } else if (serverCache instanceof ChildrenNode) {
      eventCache = writeTreeRefCalcCompleteEventChildren(
        writesCache,
        serverCache
      );
      eventCacheComplete = false;
    } else {
      eventCache = ChildrenNode.EMPTY_NODE;
      eventCacheComplete = false;
    }
    const viewCache = newViewCache(
      new CacheNode(eventCache, eventCacheComplete, false),
      new CacheNode(serverCache, serverCacheComplete, false)
    );
    return new View(query, viewCache);
  }
  return view;
}

/**
 * Add an event callback for the specified query.
 *
 * @param query
 * @param eventRegistration
 * @param writesCache
 * @param serverCache - Complete server cache, if we have it.
 * @param serverCacheComplete
 * @returns Events to raise.
 */
export function syncPointAddEventRegistration(
  syncPoint: SyncPoint,
  query: QueryContext,
  eventRegistration: EventRegistration,
  writesCache: WriteTreeRef,
  serverCache: Node | null,
  serverCacheComplete: boolean
): Event[] {
  const view = syncPointGetView(
    syncPoint,
    query,
    writesCache,
    serverCache,
    serverCacheComplete
  );
  if (!syncPoint.views.has(query._queryIdentifier)) {
    syncPoint.views.set(query._queryIdentifier, view);
  }
  // This is guaranteed to exist now, we just created anything that was missing
  viewAddEventRegistration(view, eventRegistration);
  return viewGetInitialEvents(view, eventRegistration);
}

/**
 * Remove event callback(s).  Return cancelEvents if a cancelError is specified.
 *
 * If query is the default query, we'll check all views for the specified eventRegistration.
 * If eventRegistration is null, we'll remove all callbacks for the specified view(s).
 *
 * @param eventRegistration - If null, remove all callbacks.
 * @param cancelError - If a cancelError is provided, appropriate cancel events will be returned.
 * @returns removed queries and any cancel events
 */
export function syncPointRemoveEventRegistration(
  syncPoint: SyncPoint,
  query: QueryContext,
  eventRegistration: EventRegistration | null,
  cancelError?: Error
): { removed: QueryContext[]; events: Event[] } {
  const queryId = query._queryIdentifier;
  const removed: QueryContext[] = [];
  let cancelEvents: Event[] = [];
  const hadCompleteView = syncPointHasCompleteView(syncPoint);
  if (queryId === 'default') {
    // When you do ref.off(...), we search all views for the registration to remove.
    for (const [viewQueryId, view] of syncPoint.views.entries()) {
      cancelEvents = cancelEvents.concat(
        viewRemoveEventRegistration(view, eventRegistration, cancelError)
      );
      if (viewIsEmpty(view)) {
        syncPoint.views.delete(viewQueryId);

        // We'll deal with complete views later.
        if (!view.query._queryParams.loadsAllData()) {
          removed.push(view.query);
        }
      }
    }
  } else {
    // remove the callback from the specific view.
    const view = syncPoint.views.get(queryId);
    if (view) {
      cancelEvents = cancelEvents.concat(
        viewRemoveEventRegistration(view, eventRegistration, cancelError)
      );
      if (viewIsEmpty(view)) {
        syncPoint.views.delete(queryId);

        // We'll deal with complete views later.
        if (!view.query._queryParams.loadsAllData()) {
          removed.push(view.query);
        }
      }
    }
  }

  if (hadCompleteView && !syncPointHasCompleteView(syncPoint)) {
    // We removed our last complete view.
    removed.push(
      new (syncPointGetReferenceConstructor())(query._repo, query._path)
    );
  }

  return { removed, events: cancelEvents };
}

export function syncPointGetQueryViews(syncPoint: SyncPoint): View[] {
  const result = [];
  for (const view of syncPoint.views.values()) {
    if (!view.query._queryParams.loadsAllData()) {
      result.push(view);
    }
  }
  return result;
}

/**
 * @param path - The path to the desired complete snapshot
 * @returns A complete cache, if it exists
 */
export function syncPointGetCompleteServerCache(
  syncPoint: SyncPoint,
  path: Path
): Node | null {
  let serverCache: Node | null = null;
  for (const view of syncPoint.views.values()) {
    serverCache = serverCache || viewGetCompleteServerCache(view, path);
  }
  return serverCache;
}

export function syncPointViewForQuery(
  syncPoint: SyncPoint,
  query: QueryContext
): View | null {
  const params = query._queryParams;
  if (params.loadsAllData()) {
    return syncPointGetCompleteView(syncPoint);
  } else {
    const queryId = query._queryIdentifier;
    return syncPoint.views.get(queryId);
  }
}

export function syncPointViewExistsForQuery(
  syncPoint: SyncPoint,
  query: QueryContext
): boolean {
  return syncPointViewForQuery(syncPoint, query) != null;
}

export function syncPointHasCompleteView(syncPoint: SyncPoint): boolean {
  return syncPointGetCompleteView(syncPoint) != null;
}

export function syncPointGetCompleteView(syncPoint: SyncPoint): View | null {
  for (const view of syncPoint.views.values()) {
    if (view.query._queryParams.loadsAllData()) {
      return view;
    }
  }
  return null;
}
