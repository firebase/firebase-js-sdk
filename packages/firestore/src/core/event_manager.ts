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

import { debugAssert } from '../util/assert';
import { EventHandler } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { Query } from './query';
import { SyncEngine, SyncEngineListener } from './sync_engine';
import { OnlineState } from './types';
import { ChangeType, DocumentViewChange, ViewSnapshot } from './view_snapshot';
import { wrapInUserErrorIfRecoverable } from '../util/async_queue';
import { SnapshotVersion } from './snapshot_version';

/**
 * Holds the listeners and the last received ViewSnapshot for a query being
 * tracked by EventManager.
 */
class QueryListenersInfo {
  viewSnap: ViewSnapshot | undefined = undefined;
  listeners: QueryListener[] = [];
}

/**
 * Interface for handling events from the EventManager.
 */
export interface Observer<T> {
  next: EventHandler<T>;
  error: EventHandler<Error>;
}

/**
 * EventManager is responsible for mapping queries to query event emitters.
 * It handles "fan-out". -- Identical queries will re-use the same watch on the
 * backend.
 */
export class EventManager implements SyncEngineListener {
  private queries = new ObjectMap<Query, QueryListenersInfo>(q =>
    q.canonicalId()
  );

  private onlineState = OnlineState.Unknown;

  private snapshotsInSyncListeners: Set<Observer<void>> = new Set();

  constructor(private syncEngine: SyncEngine) {
    this.syncEngine.subscribe(this);
  }

  async listen(
    listener: QueryListener,
    readFrom?: SnapshotVersion
  ): Promise<void> {
    const query = listener.query;
    let firstListen = false;

    let queryInfo = this.queries.get(query);
    if (!queryInfo) {
      firstListen = true;
      queryInfo = new QueryListenersInfo();
    }

    if (firstListen) {
      try {
        queryInfo.viewSnap = await this.syncEngine.listen(query, readFrom);
      } catch (e) {
        const firestoreError = wrapInUserErrorIfRecoverable(
          e,
          `Initialization of query '${listener.query}' failed`
        );
        listener.onError(firestoreError);
        return;
      }
    }

    this.queries.set(query, queryInfo);
    queryInfo.listeners.push(listener);

    // Run global snapshot listeners if a consistent snapshot has been emitted.
    const raisedEvent = listener.applyOnlineStateChange(this.onlineState);
    debugAssert(
      !raisedEvent,
      "applyOnlineStateChange() shouldn't raise an event for brand-new listeners."
    );

    if (queryInfo.viewSnap) {
      const raisedEvent = listener.onViewSnapshot(queryInfo.viewSnap);
      if (raisedEvent) {
        this.raiseSnapshotsInSyncEvent();
      }
    }
  }

  async unlisten(listener: QueryListener): Promise<void> {
    const query = listener.query;
    let lastListen = false;

    const queryInfo = this.queries.get(query);
    if (queryInfo) {
      const i = queryInfo.listeners.indexOf(listener);
      if (i >= 0) {
        queryInfo.listeners.splice(i, 1);
        lastListen = queryInfo.listeners.length === 0;
      }
    }

    if (lastListen) {
      this.queries.delete(query);
      return this.syncEngine.unlisten(query);
    }
  }

  onWatchChange(viewSnaps: ViewSnapshot[]): void {
    let raisedEvent = false;
    for (const viewSnap of viewSnaps) {
      const query = viewSnap.query;
      const queryInfo = this.queries.get(query);
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
      this.raiseSnapshotsInSyncEvent();
    }
  }

  onWatchError(query: Query, error: Error): void {
    const queryInfo = this.queries.get(query);
    if (queryInfo) {
      for (const listener of queryInfo.listeners) {
        listener.onError(error);
      }
    }

    // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
    // after an error.
    this.queries.delete(query);
  }

  onOnlineStateChange(onlineState: OnlineState): void {
    this.onlineState = onlineState;
    let raisedEvent = false;
    this.queries.forEach((_, queryInfo) => {
      for (const listener of queryInfo.listeners) {
        // Run global snapshot listeners if a consistent snapshot has been emitted.
        if (listener.applyOnlineStateChange(onlineState)) {
          raisedEvent = true;
        }
      }
    });
    if (raisedEvent) {
      this.raiseSnapshotsInSyncEvent();
    }
  }

  addSnapshotsInSyncListener(observer: Observer<void>): void {
    this.snapshotsInSyncListeners.add(observer);
    // Immediately fire an initial event, indicating all existing listeners
    // are in-sync.
    observer.next();
  }

  removeSnapshotsInSyncListener(observer: Observer<void>): void {
    this.snapshotsInSyncListeners.delete(observer);
  }

  // Call all global snapshot listeners that have been set.
  private raiseSnapshotsInSyncEvent(): void {
    this.snapshotsInSyncListeners.forEach(observer => {
      observer.next();
    });
  }
}

export interface ListenOptions {
  /** Raise events even when only the metadata changes */
  readonly includeMetadataChanges?: boolean;

  /**
   * Wait for a sync with the server when online, but still raise events while
   * offline.
   */
  readonly waitForSyncWhenOnline?: boolean;

  /**
   * Tells the backend whether the client already has the query results up to
   * a point in time, and the backend will only send deltas from that point
   * on if applicable (for example, backend might already lose track of this
   * particular query, and has to restart and send everything anyways).
   *
   * When not set, backend simply assumes the client does not have anything.
   */
  readFrom?: SnapshotVersion | undefined;
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
        /* excludesMetadataChanges= */ true
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

  onError(error: Error): void {
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

    // Raise data from cache if we have any documents or we are offline
    return !snap.docs.isEmpty() || onlineState === OnlineState.Offline;
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
      snap.fromCache
    );
    this.raisedInitialEvent = true;
    this.queryObserver.next(snap);
  }
}
