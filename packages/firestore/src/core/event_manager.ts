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

import { debugAssert, debugCast } from '../util/assert';
import { wrapInUserErrorIfRecoverable } from '../util/async_queue';
import { FirestoreError } from '../util/error';
import { EventHandler } from '../util/misc';
import { ObjectMap } from '../util/obj_map';

import { canonifyQuery, Query, queryEquals, stringifyQuery } from './query';
import { OnlineState } from './types';
import { ChangeType, DocumentViewChange, ViewSnapshot } from './view_snapshot';

/**
 * Holds the listeners and the last received ViewSnapshot for a query being
 * tracked by EventManager.
 */
class QueryListenersInfo {
  viewSnap: ViewSnapshot | undefined = undefined;
  listeners: QueryListener[] = [];

  // Helper methods that checks if the query has listeners that listening to remote store
  hasRemoteListeners(): boolean {
    return this.listeners.some(listener => listener.listensToRemoteStore());
  }
}

/**
 * Interface for handling events from the EventManager.
 */
export interface Observer<T> {
  next: EventHandler<T>;
  error: EventHandler<FirestoreError>;
}

/**
 * EventManager is responsible for mapping queries to query event emitters.
 * It handles "fan-out". -- Identical queries will re-use the same watch on the
 * backend.
 *
 * PORTING NOTE: On Web, EventManager `onListen` and `onUnlisten` need to be
 * assigned to SyncEngine's `listen()` and `unlisten()` API before usage. This
 * allows users to tree-shake the Watch logic.
 */
export interface EventManager {
  onListen?: (
    query: Query,
    enableRemoteListen: boolean
  ) => Promise<ViewSnapshot>;
  onUnlisten?: (query: Query, disableRemoteListen: boolean) => Promise<void>;
  onFirstRemoteStoreListen?: (query: Query) => Promise<void>;
  onLastRemoteStoreUnlisten?: (query: Query) => Promise<void>;
}

export function newEventManager(): EventManager {
  return new EventManagerImpl();
}

export class EventManagerImpl implements EventManager {
  queries = new ObjectMap<Query, QueryListenersInfo>(
    q => canonifyQuery(q),
    queryEquals
  );

  onlineState = OnlineState.Unknown;

  snapshotsInSyncListeners: Set<Observer<void>> = new Set();

  /** Callback invoked when a Query is first listen to. */
  onListen?: (
    query: Query,
    enableRemoteListen: boolean
  ) => Promise<ViewSnapshot>;
  /** Callback invoked once all listeners to a Query are removed. */
  onUnlisten?: (query: Query, disableRemoteListen: boolean) => Promise<void>;

  /**
   * Callback invoked when a Query starts listening to the remote store, while
   * already listening to the cache.
   */
  onFirstRemoteStoreListen?: (query: Query) => Promise<void>;
  /**
   * Callback invoked when a Query stops listening to the remote store, while
   * still listening to the cache.
   */
  onLastRemoteStoreUnlisten?: (query: Query) => Promise<void>;
}

function validateEventManager(eventManagerImpl: EventManagerImpl): void {
  debugAssert(!!eventManagerImpl.onListen, 'onListen not set');
  debugAssert(
    !!eventManagerImpl.onFirstRemoteStoreListen,
    'onFirstRemoteStoreListen not set'
  );
  debugAssert(!!eventManagerImpl.onUnlisten, 'onUnlisten not set');
  debugAssert(
    !!eventManagerImpl.onLastRemoteStoreUnlisten,
    'onLastRemoteStoreUnlisten not set'
  );
}

const enum ListenerSetupAction {
  InitializeLocalListenAndRequireWatchConnection,
  InitializeLocalListenOnly,
  RequireWatchConnectionOnly,
  NoActionRequired
}

const enum ListenerRemovalAction {
  TerminateLocalListenAndRequireWatchDisconnection,
  TerminateLocalListenOnly,
  RequireWatchDisconnectionOnly,
  NoActionRequired
}

export async function eventManagerListen(
  eventManager: EventManager,
  listener: QueryListener
): Promise<void> {
  const eventManagerImpl = debugCast(eventManager, EventManagerImpl);
  validateEventManager(eventManagerImpl);

  let listenerAction = ListenerSetupAction.NoActionRequired;

  const query = listener.query;

  let queryInfo = eventManagerImpl.queries.get(query);
  if (!queryInfo) {
    queryInfo = new QueryListenersInfo();
    listenerAction = listener.listensToRemoteStore()
      ? ListenerSetupAction.InitializeLocalListenAndRequireWatchConnection
      : ListenerSetupAction.InitializeLocalListenOnly;
  } else if (
    !queryInfo.hasRemoteListeners() &&
    listener.listensToRemoteStore()
  ) {
    // Query has been listening to local cache, and tries to add a new listener sourced from watch.
    listenerAction = ListenerSetupAction.RequireWatchConnectionOnly;
  }

  try {
    switch (listenerAction) {
      case ListenerSetupAction.InitializeLocalListenAndRequireWatchConnection:
        queryInfo.viewSnap = await eventManagerImpl.onListen!(
          query,
          /** enableRemoteListen= */ true
        );
        break;
      case ListenerSetupAction.InitializeLocalListenOnly:
        queryInfo.viewSnap = await eventManagerImpl.onListen!(
          query,
          /** enableRemoteListen= */ false
        );
        break;
      case ListenerSetupAction.RequireWatchConnectionOnly:
        await eventManagerImpl.onFirstRemoteStoreListen!(query);
        break;
      default:
        break;
    }
  } catch (e) {
    const firestoreError = wrapInUserErrorIfRecoverable(
      e as Error,
      `Initialization of query '${stringifyQuery(listener.query)}' failed`
    );
    listener.onError(firestoreError);
    return;
  }

  eventManagerImpl.queries.set(query, queryInfo);
  queryInfo.listeners.push(listener);

  // Run global snapshot listeners if a consistent snapshot has been emitted.
  const raisedEvent = listener.applyOnlineStateChange(
    eventManagerImpl.onlineState
  );
  debugAssert(
    !raisedEvent,
    "applyOnlineStateChange() shouldn't raise an event for brand-new listeners."
  );

  if (queryInfo.viewSnap) {
    const raisedEvent = listener.onViewSnapshot(queryInfo.viewSnap);
    if (raisedEvent) {
      raiseSnapshotsInSyncEvent(eventManagerImpl);
    }
  }
}

export async function eventManagerUnlisten(
  eventManager: EventManager,
  listener: QueryListener
): Promise<void> {
  const eventManagerImpl = debugCast(eventManager, EventManagerImpl);
  validateEventManager(eventManagerImpl);

  const query = listener.query;
  let listenerAction = ListenerRemovalAction.NoActionRequired;

  const queryInfo = eventManagerImpl.queries.get(query);
  if (queryInfo) {
    const i = queryInfo.listeners.indexOf(listener);
    if (i >= 0) {
      queryInfo.listeners.splice(i, 1);

      if (queryInfo.listeners.length === 0) {
        listenerAction = listener.listensToRemoteStore()
          ? ListenerRemovalAction.TerminateLocalListenAndRequireWatchDisconnection
          : ListenerRemovalAction.TerminateLocalListenOnly;
      } else if (
        !queryInfo.hasRemoteListeners() &&
        listener.listensToRemoteStore()
      ) {
        // The removed listener is the last one that sourced from watch.
        listenerAction = ListenerRemovalAction.RequireWatchDisconnectionOnly;
      }
    }
  }
  switch (listenerAction) {
    case ListenerRemovalAction.TerminateLocalListenAndRequireWatchDisconnection:
      eventManagerImpl.queries.delete(query);
      return eventManagerImpl.onUnlisten!(
        query,
        /** disableRemoteListen= */ true
      );
    case ListenerRemovalAction.TerminateLocalListenOnly:
      eventManagerImpl.queries.delete(query);
      return eventManagerImpl.onUnlisten!(
        query,
        /** disableRemoteListen= */ false
      );
    case ListenerRemovalAction.RequireWatchDisconnectionOnly:
      return eventManagerImpl.onLastRemoteStoreUnlisten!(query);
    default:
      return;
  }
}

export function eventManagerOnWatchChange(
  eventManager: EventManager,
  viewSnaps: ViewSnapshot[]
): void {
  const eventManagerImpl = debugCast(eventManager, EventManagerImpl);

  let raisedEvent = false;
  for (const viewSnap of viewSnaps) {
    const query = viewSnap.query;
    const queryInfo = eventManagerImpl.queries.get(query);
    if (queryInfo) {
      for (const listener of queryInfo.listeners) {
        if (listener.onViewSnapshot(viewSnap)) {
          raisedEvent = true;
        }
      }
      queryInfo.viewSnap = viewSnap;
    }
  }
  if (raisedEvent) {
    raiseSnapshotsInSyncEvent(eventManagerImpl);
  }
}

export function eventManagerOnWatchError(
  eventManager: EventManager,
  query: Query,
  error: FirestoreError
): void {
  const eventManagerImpl = debugCast(eventManager, EventManagerImpl);

  const queryInfo = eventManagerImpl.queries.get(query);
  if (queryInfo) {
    for (const listener of queryInfo.listeners) {
      listener.onError(error);
    }
  }

  // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
  // after an error.
  eventManagerImpl.queries.delete(query);
}

export function eventManagerOnOnlineStateChange(
  eventManager: EventManager,
  onlineState: OnlineState
): void {
  const eventManagerImpl = debugCast(eventManager, EventManagerImpl);

  eventManagerImpl.onlineState = onlineState;
  let raisedEvent = false;
  eventManagerImpl.queries.forEach((_, queryInfo) => {
    for (const listener of queryInfo.listeners) {
      // Run global snapshot listeners if a consistent snapshot has been emitted.
      if (listener.applyOnlineStateChange(onlineState)) {
        raisedEvent = true;
      }
    }
  });
  if (raisedEvent) {
    raiseSnapshotsInSyncEvent(eventManagerImpl);
  }
}

export function addSnapshotsInSyncListener(
  eventManager: EventManager,
  observer: Observer<void>
): void {
  const eventManagerImpl = debugCast(eventManager, EventManagerImpl);

  eventManagerImpl.snapshotsInSyncListeners.add(observer);
  // Immediately fire an initial event, indicating all existing listeners
  // are in-sync.
  observer.next();
}

export function removeSnapshotsInSyncListener(
  eventManager: EventManager,
  observer: Observer<void>
): void {
  const eventManagerImpl = debugCast(eventManager, EventManagerImpl);
  eventManagerImpl.snapshotsInSyncListeners.delete(observer);
}

// Call all global snapshot listeners that have been set.
function raiseSnapshotsInSyncEvent(eventManagerImpl: EventManagerImpl): void {
  eventManagerImpl.snapshotsInSyncListeners.forEach(observer => {
    observer.next();
  });
}

export enum ListenerDataSource {
  /** Listen to both cache and server changes */
  Default = 'default',

  /** Listen to changes in cache only */
  Cache = 'cache'
}

export interface ListenOptions {
  /** Raise events even when only the metadata changes */
  readonly includeMetadataChanges?: boolean;

  /**
   * Wait for a sync with the server when online, but still raise events while
   * offline.
   */
  readonly waitForSyncWhenOnline?: boolean;

  /** Set the source events raised from. */
  readonly source?: ListenerDataSource;
}

/**
 * QueryListener takes a series of internal view snapshots and determines
 * when to raise the event.
 *
 * It uses an Observer to dispatch events.
 */
export class QueryListener {
  /**
   * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
   * observer. This flag is set to true once we've actually raised an event.
   */
  private raisedInitialEvent = false;

  private options: ListenOptions;

  private snap: ViewSnapshot | null = null;

  private onlineState = OnlineState.Unknown;

  constructor(
    readonly query: Query,
    private queryObserver: Observer<ViewSnapshot>,
    options?: ListenOptions
  ) {
    this.options = options || {};
  }

  /**
   * Applies the new ViewSnapshot to this listener, raising a user-facing event
   * if applicable (depending on what changed, whether the user has opted into
   * metadata-only changes, etc.). Returns true if a user-facing event was
   * indeed raised.
   */
  onViewSnapshot(snap: ViewSnapshot): boolean {
    debugAssert(
      snap.docChanges.length > 0 || snap.syncStateChanged,
      'We got a new snapshot with no changes?'
    );

    if (!this.options.includeMetadataChanges) {
      // Remove the metadata only changes.
      const docChanges: DocumentViewChange[] = [];
      for (const docChange of snap.docChanges) {
        if (docChange.type !== ChangeType.Metadata) {
          docChanges.push(docChange);
        }
      }
      snap = new ViewSnapshot(
        snap.query,
        snap.docs,
        snap.oldDocs,
        docChanges,
        snap.mutatedKeys,
        snap.fromCache,
        snap.syncStateChanged,
        /* excludesMetadataChanges= */ true,
        snap.hasCachedResults
      );
    }
    let raisedEvent = false;
    if (!this.raisedInitialEvent) {
      if (this.shouldRaiseInitialEvent(snap, this.onlineState)) {
        this.raiseInitialEvent(snap);
        raisedEvent = true;
      }
    } else if (this.shouldRaiseEvent(snap)) {
      this.queryObserver.next(snap);
      raisedEvent = true;
    }

    this.snap = snap;
    return raisedEvent;
  }

  onError(error: FirestoreError): void {
    this.queryObserver.error(error);
  }

  /** Returns whether a snapshot was raised. */
  applyOnlineStateChange(onlineState: OnlineState): boolean {
    this.onlineState = onlineState;
    let raisedEvent = false;
    if (
      this.snap &&
      !this.raisedInitialEvent &&
      this.shouldRaiseInitialEvent(this.snap, onlineState)
    ) {
      this.raiseInitialEvent(this.snap);
      raisedEvent = true;
    }
    return raisedEvent;
  }

  private shouldRaiseInitialEvent(
    snap: ViewSnapshot,
    onlineState: OnlineState
  ): boolean {
    debugAssert(
      !this.raisedInitialEvent,
      'Determining whether to raise first event but already had first event'
    );

    // Always raise the first event when we're synced
    if (!snap.fromCache) {
      return true;
    }

    // Always raise event if listening to cache
    if (!this.listensToRemoteStore()) {
      return true;
    }

    // NOTE: We consider OnlineState.Unknown as online (it should become Offline
    // or Online if we wait long enough).
    const maybeOnline = onlineState !== OnlineState.Offline;
    // Don't raise the event if we're online, aren't synced yet (checked
    // above) and are waiting for a sync.
    if (this.options.waitForSyncWhenOnline && maybeOnline) {
      debugAssert(
        snap.fromCache,
        'Waiting for sync, but snapshot is not from cache'
      );
      return false;
    }

    // Raise data from cache if we have any documents, have cached results before,
    // or we are offline.
    return (
      !snap.docs.isEmpty() ||
      snap.hasCachedResults ||
      onlineState === OnlineState.Offline
    );
  }

  private shouldRaiseEvent(snap: ViewSnapshot): boolean {
    // We don't need to handle includeDocumentMetadataChanges here because
    // the Metadata only changes have already been stripped out if needed.
    // At this point the only changes we will see are the ones we should
    // propagate.
    if (snap.docChanges.length > 0) {
      return true;
    }

    const hasPendingWritesChanged =
      this.snap && this.snap.hasPendingWrites !== snap.hasPendingWrites;
    if (snap.syncStateChanged || hasPendingWritesChanged) {
      return this.options.includeMetadataChanges === true;
    }

    // Generally we should have hit one of the cases above, but it's possible
    // to get here if there were only metadata docChanges and they got
    // stripped out.
    return false;
  }

  private raiseInitialEvent(snap: ViewSnapshot): void {
    debugAssert(
      !this.raisedInitialEvent,
      'Trying to raise initial events for second time'
    );
    snap = ViewSnapshot.fromInitialDocuments(
      snap.query,
      snap.docs,
      snap.mutatedKeys,
      snap.fromCache,
      snap.hasCachedResults
    );
    this.raisedInitialEvent = true;
    this.queryObserver.next(snap);
  }

  listensToRemoteStore(): boolean {
    return this.options.source !== ListenerDataSource.Cache;
  }
}
