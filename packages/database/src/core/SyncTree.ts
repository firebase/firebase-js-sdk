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

import { AckUserWrite } from './operation/AckUserWrite';
import { ListenComplete } from './operation/ListenComplete';
import { Merge } from './operation/Merge';
import {
  newOperationSourceServer,
  newOperationSourceServerTaggedQuery,
  newOperationSourceUser,
  Operation
} from './operation/Operation';
import { Overwrite } from './operation/Overwrite';
import { ChildrenNode } from './snap/ChildrenNode';
import { Node } from './snap/Node';
import {
  SyncPoint,
  syncPointAddEventRegistration,
  syncPointApplyOperation,
  syncPointGetCompleteServerCache,
  syncPointGetCompleteView,
  syncPointGetQueryViews,
  syncPointGetView,
  syncPointHasCompleteView,
  syncPointIsEmpty,
  syncPointRemoveEventRegistration,
  syncPointViewExistsForQuery,
  syncPointViewForQuery
} from './SyncPoint';
import { ImmutableTree } from './util/ImmutableTree';
import {
  newEmptyPath,
  newRelativePath,
  Path,
  pathGetFront,
  pathIsEmpty
} from './util/Path';
import { each, errorForServerCode } from './util/util';
import { CacheNode } from './view/CacheNode';
import { Event } from './view/Event';
import { EventRegistration, QueryContext } from './view/EventRegistration';
import { View, viewGetCompleteNode, viewGetServerCache } from './view/View';
import {
  newWriteTree,
  WriteTree,
  writeTreeAddMerge,
  writeTreeAddOverwrite,
  writeTreeCalcCompleteEventCache,
  writeTreeChildWrites,
  writeTreeGetWrite,
  WriteTreeRef,
  writeTreeRefChild,
  writeTreeRemoveWrite
} from './WriteTree';

let referenceConstructor: ReferenceConstructor;

export function syncTreeSetReferenceConstructor(
  val: ReferenceConstructor
): void {
  assert(
    !referenceConstructor,
    '__referenceConstructor has already been defined'
  );
  referenceConstructor = val;
}

function syncTreeGetReferenceConstructor(): ReferenceConstructor {
  assert(referenceConstructor, 'Reference.ts has not been loaded');
  return referenceConstructor;
}

export interface ListenProvider {
  startListening(
    query: QueryContext,
    tag: number | null,
    hashFn: () => string,
    onComplete: (a: string, b?: unknown) => Event[]
  ): Event[];

  stopListening(a: QueryContext, b: number | null): void;
}

/**
 * Static tracker for next query tag.
 */
let syncTreeNextQueryTag_ = 1;

/**
 * SyncTree is the central class for managing event callback registration, data caching, views
 * (query processing), and event generation.  There are typically two SyncTree instances for
 * each Repo, one for the normal Firebase data, and one for the .info data.
 *
 * It has a number of responsibilities, including:
 *  - Tracking all user event callbacks (registered via addEventRegistration() and removeEventRegistration()).
 *  - Applying and caching data changes for user set(), transaction(), and update() calls
 *    (applyUserOverwrite(), applyUserMerge()).
 *  - Applying and caching data changes for server data changes (applyServerOverwrite(),
 *    applyServerMerge()).
 *  - Generating user-facing events for server and user changes (all of the apply* methods
 *    return the set of events that need to be raised as a result).
 *  - Maintaining the appropriate set of server listens to ensure we are always subscribed
 *    to the correct set of paths and queries to satisfy the current set of user event
 *    callbacks (listens are started/stopped using the provided listenProvider).
 *
 * NOTE: Although SyncTree tracks event callbacks and calculates events to raise, the actual
 * events are returned to the caller rather than raised synchronously.
 *
 */
export class SyncTree {
  /**
   * Tree of SyncPoints.  There's a SyncPoint at any location that has 1 or more views.
   */
  syncPointTree_: ImmutableTree<SyncPoint> = new ImmutableTree<SyncPoint>(null);

  /**
   * A tree of all pending user writes (user-initiated set()'s, transaction()'s, update()'s, etc.).
   */
  pendingWriteTree_: WriteTree = newWriteTree();

  readonly tagToQueryMap: Map<number, string> = new Map();
  readonly queryToTagMap: Map<string, number> = new Map();

  /**
   * @param listenProvider_ - Used by SyncTree to start / stop listening
   *   to server data.
   */
  constructor(public listenProvider_: ListenProvider) {}
}

/**
 * Apply the data changes for a user-generated set() or transaction() call.
 *
 * @returns Events to raise.
 */
export function syncTreeApplyUserOverwrite(
  syncTree: SyncTree,
  path: Path,
  newData: Node,
  writeId: number,
  visible?: boolean
): Event[] {
  // Record pending write.
  writeTreeAddOverwrite(
    syncTree.pendingWriteTree_,
    path,
    newData,
    writeId,
    visible
  );

  if (!visible) {
    return [];
  } else {
    return syncTreeApplyOperationToSyncPoints_(
      syncTree,
      new Overwrite(newOperationSourceUser(), path, newData)
    );
  }
}

/**
 * Apply the data from a user-generated update() call
 *
 * @returns Events to raise.
 */
export function syncTreeApplyUserMerge(
  syncTree: SyncTree,
  path: Path,
  changedChildren: { [k: string]: Node },
  writeId: number
): Event[] {
  // Record pending merge.
  writeTreeAddMerge(syncTree.pendingWriteTree_, path, changedChildren, writeId);

  const changeTree = ImmutableTree.fromObject(changedChildren);

  return syncTreeApplyOperationToSyncPoints_(
    syncTree,
    new Merge(newOperationSourceUser(), path, changeTree)
  );
}

/**
 * Acknowledge a pending user write that was previously registered with applyUserOverwrite() or applyUserMerge().
 *
 * @param revert - True if the given write failed and needs to be reverted
 * @returns Events to raise.
 */
export function syncTreeAckUserWrite(
  syncTree: SyncTree,
  writeId: number,
  revert: boolean = false
) {
  const write = writeTreeGetWrite(syncTree.pendingWriteTree_, writeId);
  const needToReevaluate = writeTreeRemoveWrite(
    syncTree.pendingWriteTree_,
    writeId
  );
  if (!needToReevaluate) {
    return [];
  } else {
    let affectedTree = new ImmutableTree<boolean>(null);
    if (write.snap != null) {
      // overwrite
      affectedTree = affectedTree.set(newEmptyPath(), true);
    } else {
      each(write.children, (pathString: string) => {
        affectedTree = affectedTree.set(new Path(pathString), true);
      });
    }
    return syncTreeApplyOperationToSyncPoints_(
      syncTree,
      new AckUserWrite(write.path, affectedTree, revert)
    );
  }
}

/**
 * Apply new server data for the specified path..
 *
 * @returns Events to raise.
 */
export function syncTreeApplyServerOverwrite(
  syncTree: SyncTree,
  path: Path,
  newData: Node
): Event[] {
  return syncTreeApplyOperationToSyncPoints_(
    syncTree,
    new Overwrite(newOperationSourceServer(), path, newData)
  );
}

/**
 * Apply new server data to be merged in at the specified path.
 *
 * @returns Events to raise.
 */
export function syncTreeApplyServerMerge(
  syncTree: SyncTree,
  path: Path,
  changedChildren: { [k: string]: Node }
): Event[] {
  const changeTree = ImmutableTree.fromObject(changedChildren);

  return syncTreeApplyOperationToSyncPoints_(
    syncTree,
    new Merge(newOperationSourceServer(), path, changeTree)
  );
}

/**
 * Apply a listen complete for a query
 *
 * @returns Events to raise.
 */
export function syncTreeApplyListenComplete(
  syncTree: SyncTree,
  path: Path
): Event[] {
  return syncTreeApplyOperationToSyncPoints_(
    syncTree,
    new ListenComplete(newOperationSourceServer(), path)
  );
}

/**
 * Apply a listen complete for a tagged query
 *
 * @returns Events to raise.
 */
export function syncTreeApplyTaggedListenComplete(
  syncTree: SyncTree,
  path: Path,
  tag: number
): Event[] {
  const queryKey = syncTreeQueryKeyForTag_(syncTree, tag);
  if (queryKey) {
    const r = syncTreeParseQueryKey_(queryKey);
    const queryPath = r.path,
      queryId = r.queryId;
    const relativePath = newRelativePath(queryPath, path);
    const op = new ListenComplete(
      newOperationSourceServerTaggedQuery(queryId),
      relativePath
    );
    return syncTreeApplyTaggedOperation_(syncTree, queryPath, op);
  } else {
    // We've already removed the query. No big deal, ignore the update
    return [];
  }
}

/**
 * Remove event callback(s).
 *
 * If query is the default query, we'll check all queries for the specified eventRegistration.
 * If eventRegistration is null, we'll remove all callbacks for the specified query/queries.
 *
 * @param eventRegistration - If null, all callbacks are removed.
 * @param cancelError - If a cancelError is provided, appropriate cancel events will be returned.
 * @returns Cancel events, if cancelError was provided.
 */
export function syncTreeRemoveEventRegistration(
  syncTree: SyncTree,
  query: QueryContext,
  eventRegistration: EventRegistration | null,
  cancelError?: Error
): Event[] {
  // Find the syncPoint first. Then deal with whether or not it has matching listeners
  const path = query._path;
  const maybeSyncPoint = syncTree.syncPointTree_.get(path);
  let cancelEvents: Event[] = [];
  // A removal on a default query affects all queries at that location. A removal on an indexed query, even one without
  // other query constraints, does *not* affect all queries at that location. So this check must be for 'default', and
  // not loadsAllData().
  if (
    maybeSyncPoint &&
    (query._queryIdentifier === 'default' ||
      syncPointViewExistsForQuery(maybeSyncPoint, query))
  ) {
    const removedAndEvents = syncPointRemoveEventRegistration(
      maybeSyncPoint,
      query,
      eventRegistration,
      cancelError
    );
    if (syncPointIsEmpty(maybeSyncPoint)) {
      syncTree.syncPointTree_ = syncTree.syncPointTree_.remove(path);
    }
    const removed = removedAndEvents.removed;
    cancelEvents = removedAndEvents.events;
    // We may have just removed one of many listeners and can short-circuit this whole process
    // We may also not have removed a default listener, in which case all of the descendant listeners should already be
    // properly set up.
    //
    // Since indexed queries can shadow if they don't have other query constraints, check for loadsAllData(), instead of
    // queryId === 'default'
    const removingDefault =
      -1 !==
      removed.findIndex(query => {
        return query._queryParams.loadsAllData();
      });
    const covered = syncTree.syncPointTree_.findOnPath(
      path,
      (relativePath, parentSyncPoint) =>
        syncPointHasCompleteView(parentSyncPoint)
    );

    if (removingDefault && !covered) {
      const subtree = syncTree.syncPointTree_.subtree(path);
      // There are potentially child listeners. Determine what if any listens we need to send before executing the
      // removal
      if (!subtree.isEmpty()) {
        // We need to fold over our subtree and collect the listeners to send
        const newViews = syncTreeCollectDistinctViewsForSubTree_(subtree);

        // Ok, we've collected all the listens we need. Set them up.
        for (let i = 0; i < newViews.length; ++i) {
          const view = newViews[i],
            newQuery = view.query;
          const listener = syncTreeCreateListenerForView_(syncTree, view);
          syncTree.listenProvider_.startListening(
            syncTreeQueryForListening_(newQuery),
            syncTreeTagForQuery_(syncTree, newQuery),
            listener.hashFn,
            listener.onComplete
          );
        }
      } else {
        // There's nothing below us, so nothing we need to start listening on
      }
    }
    // If we removed anything and we're not covered by a higher up listen, we need to stop listening on this query
    // The above block has us covered in terms of making sure we're set up on listens lower in the tree.
    // Also, note that if we have a cancelError, it's already been removed at the provider level.
    if (!covered && removed.length > 0 && !cancelError) {
      // If we removed a default, then we weren't listening on any of the other queries here. Just cancel the one
      // default. Otherwise, we need to iterate through and cancel each individual query
      if (removingDefault) {
        // We don't tag default listeners
        const defaultTag: number | null = null;
        syncTree.listenProvider_.stopListening(
          syncTreeQueryForListening_(query),
          defaultTag
        );
      } else {
        removed.forEach((queryToRemove: QueryContext) => {
          const tagToRemove = syncTree.queryToTagMap.get(
            syncTreeMakeQueryKey_(queryToRemove)
          );
          syncTree.listenProvider_.stopListening(
            syncTreeQueryForListening_(queryToRemove),
            tagToRemove
          );
        });
      }
    }
    // Now, clear all of the tags we're tracking for the removed listens
    syncTreeRemoveTags_(syncTree, removed);
  } else {
    // No-op, this listener must've been already removed
  }
  return cancelEvents;
}

/**
 * Apply new server data for the specified tagged query.
 *
 * @returns Events to raise.
 */
export function syncTreeApplyTaggedQueryOverwrite(
  syncTree: SyncTree,
  path: Path,
  snap: Node,
  tag: number
): Event[] {
  const queryKey = syncTreeQueryKeyForTag_(syncTree, tag);
  if (queryKey != null) {
    const r = syncTreeParseQueryKey_(queryKey);
    const queryPath = r.path,
      queryId = r.queryId;
    const relativePath = newRelativePath(queryPath, path);
    const op = new Overwrite(
      newOperationSourceServerTaggedQuery(queryId),
      relativePath,
      snap
    );
    return syncTreeApplyTaggedOperation_(syncTree, queryPath, op);
  } else {
    // Query must have been removed already
    return [];
  }
}

/**
 * Apply server data to be merged in for the specified tagged query.
 *
 * @returns Events to raise.
 */
export function syncTreeApplyTaggedQueryMerge(
  syncTree: SyncTree,
  path: Path,
  changedChildren: { [k: string]: Node },
  tag: number
): Event[] {
  const queryKey = syncTreeQueryKeyForTag_(syncTree, tag);
  if (queryKey) {
    const r = syncTreeParseQueryKey_(queryKey);
    const queryPath = r.path,
      queryId = r.queryId;
    const relativePath = newRelativePath(queryPath, path);
    const changeTree = ImmutableTree.fromObject(changedChildren);
    const op = new Merge(
      newOperationSourceServerTaggedQuery(queryId),
      relativePath,
      changeTree
    );
    return syncTreeApplyTaggedOperation_(syncTree, queryPath, op);
  } else {
    // We've already removed the query. No big deal, ignore the update
    return [];
  }
}

/**
 * Add an event callback for the specified query.
 *
 * @returns Events to raise.
 */
export function syncTreeAddEventRegistration(
  syncTree: SyncTree,
  query: QueryContext,
  eventRegistration: EventRegistration
): Event[] {
  const path = query._path;

  let serverCache: Node | null = null;
  let foundAncestorDefaultView = false;
  // Any covering writes will necessarily be at the root, so really all we need to find is the server cache.
  // Consider optimizing this once there's a better understanding of what actual behavior will be.
  syncTree.syncPointTree_.foreachOnPath(path, (pathToSyncPoint, sp) => {
    const relativePath = newRelativePath(pathToSyncPoint, path);
    serverCache =
      serverCache || syncPointGetCompleteServerCache(sp, relativePath);
    foundAncestorDefaultView =
      foundAncestorDefaultView || syncPointHasCompleteView(sp);
  });
  let syncPoint = syncTree.syncPointTree_.get(path);
  if (!syncPoint) {
    syncPoint = new SyncPoint();
    syncTree.syncPointTree_ = syncTree.syncPointTree_.set(path, syncPoint);
  } else {
    foundAncestorDefaultView =
      foundAncestorDefaultView || syncPointHasCompleteView(syncPoint);
    serverCache =
      serverCache || syncPointGetCompleteServerCache(syncPoint, newEmptyPath());
  }

  let serverCacheComplete;
  if (serverCache != null) {
    serverCacheComplete = true;
  } else {
    serverCacheComplete = false;
    serverCache = ChildrenNode.EMPTY_NODE;
    const subtree = syncTree.syncPointTree_.subtree(path);
    subtree.foreachChild((childName, childSyncPoint) => {
      const completeCache = syncPointGetCompleteServerCache(
        childSyncPoint,
        newEmptyPath()
      );
      if (completeCache) {
        serverCache = serverCache.updateImmediateChild(
          childName,
          completeCache
        );
      }
    });
  }

  const viewAlreadyExists = syncPointViewExistsForQuery(syncPoint, query);
  if (!viewAlreadyExists && !query._queryParams.loadsAllData()) {
    // We need to track a tag for this query
    const queryKey = syncTreeMakeQueryKey_(query);
    assert(
      !syncTree.queryToTagMap.has(queryKey),
      'View does not exist, but we have a tag'
    );
    const tag = syncTreeGetNextQueryTag_();
    syncTree.queryToTagMap.set(queryKey, tag);
    syncTree.tagToQueryMap.set(tag, queryKey);
  }
  const writesCache = writeTreeChildWrites(syncTree.pendingWriteTree_, path);
  let events = syncPointAddEventRegistration(
    syncPoint,
    query,
    eventRegistration,
    writesCache,
    serverCache,
    serverCacheComplete
  );
  if (!viewAlreadyExists && !foundAncestorDefaultView) {
    const view = syncPointViewForQuery(syncPoint, query);
    events = events.concat(syncTreeSetupListener_(syncTree, query, view));
  }
  return events;
}

/**
 * Returns a complete cache, if we have one, of the data at a particular path. If the location does not have a
 * listener above it, we will get a false "null". This shouldn't be a problem because transactions will always
 * have a listener above, and atomic operations would correctly show a jitter of <increment value> ->
 *     <incremented total> as the write is applied locally and then acknowledged at the server.
 *
 * Note: this method will *include* hidden writes from transaction with applyLocally set to false.
 *
 * @param path - The path to the data we want
 * @param writeIdsToExclude - A specific set to be excluded
 */
export function syncTreeCalcCompleteEventCache(
  syncTree: SyncTree,
  path: Path,
  writeIdsToExclude?: number[]
): Node {
  const includeHiddenSets = true;
  const writeTree = syncTree.pendingWriteTree_;
  const serverCache = syncTree.syncPointTree_.findOnPath(
    path,
    (pathSoFar, syncPoint) => {
      const relativePath = newRelativePath(pathSoFar, path);
      const serverCache = syncPointGetCompleteServerCache(
        syncPoint,
        relativePath
      );
      if (serverCache) {
        return serverCache;
      }
    }
  );
  return writeTreeCalcCompleteEventCache(
    writeTree,
    path,
    serverCache,
    writeIdsToExclude,
    includeHiddenSets
  );
}

export function syncTreeGetServerValue(
  syncTree: SyncTree,
  query: QueryContext
): Node | null {
  const path = query._path;
  let serverCache: Node | null = null;
  // Any covering writes will necessarily be at the root, so really all we need to find is the server cache.
  // Consider optimizing this once there's a better understanding of what actual behavior will be.
  syncTree.syncPointTree_.foreachOnPath(path, (pathToSyncPoint, sp) => {
    const relativePath = newRelativePath(pathToSyncPoint, path);
    serverCache =
      serverCache || syncPointGetCompleteServerCache(sp, relativePath);
  });
  let syncPoint = syncTree.syncPointTree_.get(path);
  if (!syncPoint) {
    syncPoint = new SyncPoint();
    syncTree.syncPointTree_ = syncTree.syncPointTree_.set(path, syncPoint);
  } else {
    serverCache =
      serverCache || syncPointGetCompleteServerCache(syncPoint, newEmptyPath());
  }
  const serverCacheComplete = serverCache != null;
  const serverCacheNode: CacheNode | null = serverCacheComplete
    ? new CacheNode(serverCache, true, false)
    : null;
  const writesCache: WriteTreeRef | null = writeTreeChildWrites(
    syncTree.pendingWriteTree_,
    query._path
  );
  const view: View = syncPointGetView(
    syncPoint,
    query,
    writesCache,
    serverCacheComplete ? serverCacheNode.getNode() : ChildrenNode.EMPTY_NODE,
    serverCacheComplete
  );
  return viewGetCompleteNode(view);
}

/**
 * A helper method that visits all descendant and ancestor SyncPoints, applying the operation.
 *
 * NOTES:
 * - Descendant SyncPoints will be visited first (since we raise events depth-first).
 *
 * - We call applyOperation() on each SyncPoint passing three things:
 *   1. A version of the Operation that has been made relative to the SyncPoint location.
 *   2. A WriteTreeRef of any writes we have cached at the SyncPoint location.
 *   3. A snapshot Node with cached server data, if we have it.
 *
 * - We concatenate all of the events returned by each SyncPoint and return the result.
 */
function syncTreeApplyOperationToSyncPoints_(
  syncTree: SyncTree,
  operation: Operation
): Event[] {
  return syncTreeApplyOperationHelper_(
    operation,
    syncTree.syncPointTree_,
    /*serverCache=*/ null,
    writeTreeChildWrites(syncTree.pendingWriteTree_, newEmptyPath())
  );
}

/**
 * Recursive helper for applyOperationToSyncPoints_
 */
function syncTreeApplyOperationHelper_(
  operation: Operation,
  syncPointTree: ImmutableTree<SyncPoint>,
  serverCache: Node | null,
  writesCache: WriteTreeRef
): Event[] {
  if (pathIsEmpty(operation.path)) {
    return syncTreeApplyOperationDescendantsHelper_(
      operation,
      syncPointTree,
      serverCache,
      writesCache
    );
  } else {
    const syncPoint = syncPointTree.get(newEmptyPath());

    // If we don't have cached server data, see if we can get it from this SyncPoint.
    if (serverCache == null && syncPoint != null) {
      serverCache = syncPointGetCompleteServerCache(syncPoint, newEmptyPath());
    }

    let events: Event[] = [];
    const childName = pathGetFront(operation.path);
    const childOperation = operation.operationForChild(childName);
    const childTree = syncPointTree.children.get(childName);
    if (childTree && childOperation) {
      const childServerCache = serverCache
        ? serverCache.getImmediateChild(childName)
        : null;
      const childWritesCache = writeTreeRefChild(writesCache, childName);
      events = events.concat(
        syncTreeApplyOperationHelper_(
          childOperation,
          childTree,
          childServerCache,
          childWritesCache
        )
      );
    }

    if (syncPoint) {
      events = events.concat(
        syncPointApplyOperation(syncPoint, operation, writesCache, serverCache)
      );
    }

    return events;
  }
}

/**
 * Recursive helper for applyOperationToSyncPoints_
 */
function syncTreeApplyOperationDescendantsHelper_(
  operation: Operation,
  syncPointTree: ImmutableTree<SyncPoint>,
  serverCache: Node | null,
  writesCache: WriteTreeRef
): Event[] {
  const syncPoint = syncPointTree.get(newEmptyPath());

  // If we don't have cached server data, see if we can get it from this SyncPoint.
  if (serverCache == null && syncPoint != null) {
    serverCache = syncPointGetCompleteServerCache(syncPoint, newEmptyPath());
  }

  let events: Event[] = [];
  syncPointTree.children.inorderTraversal((childName, childTree) => {
    const childServerCache = serverCache
      ? serverCache.getImmediateChild(childName)
      : null;
    const childWritesCache = writeTreeRefChild(writesCache, childName);
    const childOperation = operation.operationForChild(childName);
    if (childOperation) {
      events = events.concat(
        syncTreeApplyOperationDescendantsHelper_(
          childOperation,
          childTree,
          childServerCache,
          childWritesCache
        )
      );
    }
  });

  if (syncPoint) {
    events = events.concat(
      syncPointApplyOperation(syncPoint, operation, writesCache, serverCache)
    );
  }

  return events;
}

function syncTreeCreateListenerForView_(
  syncTree: SyncTree,
  view: View
): { hashFn(): string; onComplete(a: string, b?: unknown): Event[] } {
  const query = view.query;
  const tag = syncTreeTagForQuery_(syncTree, query);

  return {
    hashFn: () => {
      const cache = viewGetServerCache(view) || ChildrenNode.EMPTY_NODE;
      return cache.hash();
    },
    onComplete: (status: string): Event[] => {
      if (status === 'ok') {
        if (tag) {
          return syncTreeApplyTaggedListenComplete(syncTree, query._path, tag);
        } else {
          return syncTreeApplyListenComplete(syncTree, query._path);
        }
      } else {
        // If a listen failed, kill all of the listeners here, not just the one that triggered the error.
        // Note that this may need to be scoped to just this listener if we change permissions on filtered children
        const error = errorForServerCode(status, query);
        return syncTreeRemoveEventRegistration(
          syncTree,
          query,
          /*eventRegistration*/ null,
          error
        );
      }
    }
  };
}

/**
 * Return the tag associated with the given query.
 */
function syncTreeTagForQuery_(
  syncTree: SyncTree,
  query: QueryContext
): number | null {
  const queryKey = syncTreeMakeQueryKey_(query);
  return syncTree.queryToTagMap.get(queryKey);
}

/**
 * Given a query, computes a "queryKey" suitable for use in our queryToTagMap_.
 */
function syncTreeMakeQueryKey_(query: QueryContext): string {
  return query._path.toString() + '$' + query._queryIdentifier;
}

/**
 * Return the query associated with the given tag, if we have one
 */
function syncTreeQueryKeyForTag_(
  syncTree: SyncTree,
  tag: number
): string | null {
  return syncTree.tagToQueryMap.get(tag);
}

/**
 * Given a queryKey (created by makeQueryKey), parse it back into a path and queryId.
 */
function syncTreeParseQueryKey_(
  queryKey: string
): { queryId: string; path: Path } {
  const splitIndex = queryKey.indexOf('$');
  assert(
    splitIndex !== -1 && splitIndex < queryKey.length - 1,
    'Bad queryKey.'
  );
  return {
    queryId: queryKey.substr(splitIndex + 1),
    path: new Path(queryKey.substr(0, splitIndex))
  };
}

/**
 * A helper method to apply tagged operations
 */
function syncTreeApplyTaggedOperation_(
  syncTree: SyncTree,
  queryPath: Path,
  operation: Operation
): Event[] {
  const syncPoint = syncTree.syncPointTree_.get(queryPath);
  assert(syncPoint, "Missing sync point for query tag that we're tracking");
  const writesCache = writeTreeChildWrites(
    syncTree.pendingWriteTree_,
    queryPath
  );
  return syncPointApplyOperation(syncPoint, operation, writesCache, null);
}

/**
 * This collapses multiple unfiltered views into a single view, since we only need a single
 * listener for them.
 */
function syncTreeCollectDistinctViewsForSubTree_(
  subtree: ImmutableTree<SyncPoint>
): View[] {
  return subtree.fold<View[]>((relativePath, maybeChildSyncPoint, childMap) => {
    if (maybeChildSyncPoint && syncPointHasCompleteView(maybeChildSyncPoint)) {
      const completeView = syncPointGetCompleteView(maybeChildSyncPoint);
      return [completeView];
    } else {
      // No complete view here, flatten any deeper listens into an array
      let views: View[] = [];
      if (maybeChildSyncPoint) {
        views = syncPointGetQueryViews(maybeChildSyncPoint);
      }
      each(childMap, (_key: string, childViews: View[]) => {
        views = views.concat(childViews);
      });
      return views;
    }
  });
}

/**
 * Normalizes a query to a query we send the server for listening
 *
 * @returns The normalized query
 */
function syncTreeQueryForListening_(query: QueryContext): QueryContext {
  if (query._queryParams.loadsAllData() && !query._queryParams.isDefault()) {
    // We treat queries that load all data as default queries
    // Cast is necessary because ref() technically returns Firebase which is actually fb.api.Firebase which inherits
    // from Query
    return new (syncTreeGetReferenceConstructor())(query._repo, query._path);
  } else {
    return query;
  }
}

function syncTreeRemoveTags_(syncTree: SyncTree, queries: QueryContext[]) {
  for (let j = 0; j < queries.length; ++j) {
    const removedQuery = queries[j];
    if (!removedQuery._queryParams.loadsAllData()) {
      // We should have a tag for this
      const removedQueryKey = syncTreeMakeQueryKey_(removedQuery);
      const removedQueryTag = syncTree.queryToTagMap.get(removedQueryKey);
      syncTree.queryToTagMap.delete(removedQueryKey);
      syncTree.tagToQueryMap.delete(removedQueryTag);
    }
  }
}

/**
 * Static accessor for query tags.
 */
function syncTreeGetNextQueryTag_(): number {
  return syncTreeNextQueryTag_++;
}

/**
 * For a given new listen, manage the de-duplication of outstanding subscriptions.
 *
 * @returns This method can return events to support synchronous data sources
 */
function syncTreeSetupListener_(
  syncTree: SyncTree,
  query: QueryContext,
  view: View
): Event[] {
  const path = query._path;
  const tag = syncTreeTagForQuery_(syncTree, query);
  const listener = syncTreeCreateListenerForView_(syncTree, view);

  const events = syncTree.listenProvider_.startListening(
    syncTreeQueryForListening_(query),
    tag,
    listener.hashFn,
    listener.onComplete
  );

  const subtree = syncTree.syncPointTree_.subtree(path);
  // The root of this subtree has our query. We're here because we definitely need to send a listen for that, but we
  // may need to shadow other listens as well.
  if (tag) {
    assert(
      !syncPointHasCompleteView(subtree.value),
      "If we're adding a query, it shouldn't be shadowed"
    );
  } else {
    // Shadow everything at or below this location, this is a default listener.
    const queriesToStop = subtree.fold<QueryContext[]>(
      (relativePath, maybeChildSyncPoint, childMap) => {
        if (
          !pathIsEmpty(relativePath) &&
          maybeChildSyncPoint &&
          syncPointHasCompleteView(maybeChildSyncPoint)
        ) {
          return [syncPointGetCompleteView(maybeChildSyncPoint).query];
        } else {
          // No default listener here, flatten any deeper queries into an array
          let queries: QueryContext[] = [];
          if (maybeChildSyncPoint) {
            queries = queries.concat(
              syncPointGetQueryViews(maybeChildSyncPoint).map(
                view => view.query
              )
            );
          }
          each(childMap, (_key: string, childQueries: QueryContext[]) => {
            queries = queries.concat(childQueries);
          });
          return queries;
        }
      }
    );
    for (let i = 0; i < queriesToStop.length; ++i) {
      const queryToStop = queriesToStop[i];
      syncTree.listenProvider_.stopListening(
        syncTreeQueryForListening_(queryToStop),
        syncTreeTagForQuery_(syncTree, queryToStop)
      );
    }
  }
  return events;
}
