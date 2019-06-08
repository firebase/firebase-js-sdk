/**
 * @license
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

import { assert } from '../util/assert';
import { EventHandler } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { Query } from './query';
import { SyncEngine, SyncEngineListener } from './sync_engine';
import { OnlineState, TargetId } from './types';
import { DocumentViewChange } from './view_snapshot';
import { ChangeType, ViewSnapshot } from './view_snapshot';

/**
 * Holds the listeners and the last received ViewSnapshot for a query being
 * tracked by EventManager.
 */
class QueryListenersInfo {
  viewSnap: ViewSnapshot | null;
  targetId: TargetId;
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

  private onlineState: OnlineState = OnlineState.Unknown;

  constructor(private syncEngine: SyncEngine) {
    this.syncEngine.subscribe(this);
  }

  listen(listener: QueryListener): Promise<TargetId> {
    const query = listener.query;
    let firstListen = false;

    let queryInfo = this.queries.get(query);
    if (!queryInfo) {
      firstListen = true;
      queryInfo = new QueryListenersInfo();
      this.queries.set(query, queryInfo);
    }
    queryInfo.listeners.push(listener);

    listener.applyOnlineStateChange(this.onlineState);

    if (queryInfo.viewSnap) {listener.onViewSnapshot(queryInfo.viewSnap);}

    if (firstListen) {
      return this.syncEngine.listen(query).then(targetId => {
        queryInfo!.targetId = targetId;
        return targetId;
      });
    } else {
      return Promise.resolve(queryInfo.targetId);
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
    for (const viewSnap of viewSnaps) {
      const query = viewSnap.query;
      const queryInfo = this.queries.get(query);
      if (queryInfo) {
        for (const listener of queryInfo.listeners) {
          listener.onViewSnapshot(viewSnap);
        }
        queryInfo.viewSnap = viewSnap;
      }
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
    this.queries.forEach((_, queryInfo) => {
      for (const listener of queryInfo.listeners) {
        listener.applyOnlineStateChange(onlineState);
      }
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

  private snap: ViewSnapshot;

  private onlineState: OnlineState = OnlineState.Unknown;

  constructor(
    readonly query: Query,
    private queryObserver: Observer<ViewSnapshot>,
    options?: ListenOptions
  ) {
    this.options = options || {};
  }

  onViewSnapshot(snap: ViewSnapshot): void {
    assert(
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

    if (!this.raisedInitialEvent) {
      if (this.shouldRaiseInitialEvent(snap, this.onlineState)) {
        this.raiseInitialEvent(snap);
      }
    } else if (this.shouldRaiseEvent(snap)) {
      this.queryObserver.next(snap);
    }

    this.snap = snap;
  }

  onError(error: Error): void {
    this.queryObserver.error(error);
  }

  applyOnlineStateChange(onlineState: OnlineState): void {
    this.onlineState = onlineState;
    if (
      this.snap &&
      !this.raisedInitialEvent &&
      this.shouldRaiseInitialEvent(this.snap, onlineState)
    ) {
      this.raiseInitialEvent(this.snap);
    }
  }

  private shouldRaiseInitialEvent(
    snap: ViewSnapshot,
    onlineState: OnlineState
  ): boolean {
    assert(
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
      assert(
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
    assert(
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
