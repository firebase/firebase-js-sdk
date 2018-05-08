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

import { SnapshotVersion } from '../core/snapshot_version';
import { ProtoByteString, TargetId } from '../core/types';
import { QueryData, QueryPurpose } from '../local/query_data';
import { maybeDocumentMap, documentKeySet } from '../model/collections';
import { Document, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { emptyByteString } from '../platform/platform';
import { assert, fail } from '../util/assert';
import { FirestoreError } from '../util/error';
import * as objUtils from '../util/obj';

import { ExistenceFilter } from './existence_filter';
import {
  CurrentStatusUpdate,
  RemoteEvent,
  ResetMapping,
  TargetChange,
  UpdateMapping
} from './remote_event';

/**
 * Internal representation of the watcher API protocol buffers.
 */
export type WatchChange =
  | DocumentWatchChange
  | WatchTargetChange
  | ExistenceFilterChange;

/**
 * Represents a changed document and a list of target ids to which this change
 * applies.
 *
 * If document has been deleted NoDocument will be provided.
 */
export class DocumentWatchChange {
  constructor(
    /** The new document applies to all of these targets. */
    public updatedTargetIds: TargetId[],
    /** The new document is removed from all of these targets. */
    public removedTargetIds: TargetId[],
    /** The key of the document for this change. */
    public key: DocumentKey,
    /**
     * The new document or NoDocument if it was deleted. Is null if the
     * document went out of view without the server sending a new document.
     */
    public newDoc: Document | NoDocument | null
  ) {}
}

export class ExistenceFilterChange {
  constructor(
    public targetId: TargetId,
    public existenceFilter: ExistenceFilter
  ) {}
}

export enum WatchTargetChangeState {
  NoChange,
  Added,
  Removed,
  Current,
  Reset
}

export class WatchTargetChange {
  constructor(
    /** What kind of change occurred to the watch target. */
    public state: WatchTargetChangeState,
    /** The target IDs that were added/removed/set. */
    public targetIds: TargetId[],
    /**
     * An opaque, server-assigned token that allows watching a query to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the query. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */
    public resumeToken: ProtoByteString = emptyByteString(),
    /** An RPC error indicating why the watch failed. */
    public cause: FirestoreError | null = null
  ) {}
}

/**
 * A helper class to accumulate watch changes into a RemoteEvent and other
 * target information.
 */
export class WatchChangeAggregator {
  constructor(
    private snapshotVersion: SnapshotVersion,
    private readonly listenTargets: { [targetId: number]: QueryData },
    pendingTargetResponses: { [targetId: number]: number }
  ) {
    this.pendingTargetResponses = objUtils.shallowCopy(pendingTargetResponses);
  }

  /** The existence filter - if any - for the given target IDs. */
  readonly existenceFilters: { [targetId: number]: ExistenceFilter } = {};

  /** The number of pending responses that we are waiting on from watch. */
  readonly pendingTargetResponses: { [targetId: number]: number };

  /** Keeps track of the current target mappings */
  private targetChanges: { [targetId: number]: TargetChange } = {};

  /** Keeps track of document to update */
  private documentUpdates = maybeDocumentMap();

  /** Whether this aggregator was frozen and can no longer be modified */
  private frozen = false;

  /** Tracks which document updates are due only to limbo target resolution */
  private limboDocuments = documentKeySet();

  /** Aggregates a watch change into the current state */
  add(watchChange: WatchChange): void {
    assert(!this.frozen, 'Trying to modify frozen WatchChangeAggregator.');
    if (watchChange instanceof DocumentWatchChange) {
      this.addDocumentChange(watchChange);
    } else if (watchChange instanceof WatchTargetChange) {
      this.addTargetChange(watchChange);
    } else if (watchChange instanceof ExistenceFilterChange) {
      this.addExistenceFilterChange(watchChange);
    } else {
      fail('Unknown watch change: ' + watchChange);
    }
  }

  /** Aggregates all provided watch changes to the current state in order */
  addChanges(watchChanges: WatchChange[]): void {
    assert(!this.frozen, 'Trying to modify frozen WatchChangeAggregator.');
    watchChanges.forEach(change => this.add(change));
  }

  /**
   * Converts the current state into a remote event with the snapshot version
   * provided via the constructor.
   */
  createRemoteEvent(): RemoteEvent {
    const targetChanges = this.targetChanges;

    // Remove all the non-active targets from the remote event.
    objUtils.forEachNumber(this.targetChanges, targetId => {
      if (!this.isActiveTarget(targetId)) {
        delete targetChanges[targetId];
      }
    });

    // Mark this aggregator as frozen so no further modifications are made
    this.frozen = true;
    return new RemoteEvent(
      this.snapshotVersion,
      targetChanges,
      this.documentUpdates,
      this.limboDocuments
    );
  }

  private ensureTargetChange(targetId: TargetId): TargetChange {
    let change = this.targetChanges[targetId];
    if (!change) {
      // Create an UpdateMapping by default, since resets are always explicit.
      change = {
        currentStatusUpdate: CurrentStatusUpdate.None,
        snapshotVersion: this.snapshotVersion,
        mapping: new UpdateMapping(),
        resumeToken: emptyByteString()
      };
      this.targetChanges[targetId] = change;
    }
    return change;
  }

  /**
   * Returns the QueryData instance for the given targetId if the target is
   * active, or null otherwise. For a target to be considered active there must
   * be no pending acks we're waiting for and it must be in the current list of
   * targets that the client cares about.
   */
  protected queryDataForActiveTarget(targetId: TargetId): QueryData | null {
    const queryData = this.listenTargets[targetId];
    return queryData &&
      !objUtils.contains(this.pendingTargetResponses, targetId)
      ? queryData
      : null;
  }

  /**
   * Defers to queryForActiveTarget to determine if the given targetId
   * corresponds to an active target.
   *
   * This method is visible for testing.
   */
  protected isActiveTarget(targetId: TargetId): boolean {
    return this.queryDataForActiveTarget(targetId) !== null;
  }

  /**
   * Updates limbo document tracking for a given target-document mapping change.
   * If the target is a limbo target, and the change for the document has only
   * seen limbo targets so far, and we are not already tracking a change for
   * this document, then consider this document a limbo document update.
   * Otherwise, ensure that we don't consider this document a limbo document.
   * Returns true if the change still has only seen limbo resolution changes.
   */
  private updateLimboDocuments(
    key: DocumentKey,
    queryData: QueryData,
    isOnlyLimbo: boolean
  ): boolean {
    if (!isOnlyLimbo) {
      // It wasn't a limbo doc before, so it definitely isn't now.
      return false;
    }
    if (!this.documentUpdates.get(key)) {
      // We haven't seen the document update for this key yet.
      if (queryData.purpose === QueryPurpose.LimboResolution) {
        this.limboDocuments = this.limboDocuments.add(key);
        return true;
      } else {
        // We haven't seen the document before, but this is a non-limbo target.
        // Since we haven't seen it, we know it's not in our set of limbo docs.
        // Return false to ensure that this key is marked as non-limbo.
        return false;
      }
    } else if (queryData.purpose === QueryPurpose.LimboResolution) {
      // We have only seen limbo targets so far for this document, and this is
      // another limbo target.
      return true;
    } else {
      // We haven't marked this as non-limbo yet, but this target is not a limbo
      // target. Mark the key as non-limbo and make sure it isn't in our set.
      this.limboDocuments = this.limboDocuments.delete(key);
      return false;
    }
  }

  private addDocumentChange(docChange: DocumentWatchChange): void {
    let relevant = false;
    let isOnlyLimbo = true;

    for (const targetId of docChange.updatedTargetIds) {
      const queryData = this.queryDataForActiveTarget(targetId);
      if (queryData) {
        const change = this.ensureTargetChange(targetId);
        isOnlyLimbo = this.updateLimboDocuments(
          docChange.key,
          queryData,
          isOnlyLimbo
        );
        change.mapping.add(docChange.key);
        relevant = true;
      }
    }

    for (const targetId of docChange.removedTargetIds) {
      const queryData = this.queryDataForActiveTarget(targetId);
      if (queryData) {
        const change = this.ensureTargetChange(targetId);
        isOnlyLimbo = this.updateLimboDocuments(
          docChange.key,
          queryData,
          isOnlyLimbo
        );
        change.mapping.delete(docChange.key);
        relevant = true;
      }
    }

    // Only update the document if there is a new document to replace to an
    // active target that is being listened to, this might be just a target
    // update instead.
    if (docChange.newDoc && relevant) {
      this.documentUpdates = this.documentUpdates.insert(
        docChange.key,
        docChange.newDoc
      );
    }
  }

  private addTargetChange(targetChange: WatchTargetChange): void {
    targetChange.targetIds.forEach(targetId => {
      const change = this.ensureTargetChange(targetId);
      switch (targetChange.state) {
        case WatchTargetChangeState.NoChange:
          if (this.isActiveTarget(targetId)) {
            // Creating the change above satisfies the semantics of no-change.
            applyResumeToken(change, targetChange.resumeToken);
          }
          break;
        case WatchTargetChangeState.Added:
          // We need to decrement the number of pending acks needed from watch
          // for this targetId.
          this.recordTargetResponse(targetId);
          if (!objUtils.contains(this.pendingTargetResponses, targetId)) {
            // We have a freshly added target, so we need to reset any state
            // that we had previously This can happen e.g. when remove and add
            // back a target for existence filter mismatches.
            change.mapping = new UpdateMapping();
            change.currentStatusUpdate = CurrentStatusUpdate.None;
            delete this.existenceFilters[targetId];
          }
          applyResumeToken(change, targetChange.resumeToken);
          break;
        case WatchTargetChangeState.Removed:
          // We need to keep track of removed targets to we can
          // post-filter and remove any target changes.
          // We need to decrement the number of pending acks needed from watch
          // for this targetId.
          this.recordTargetResponse(targetId);
          assert(
            !targetChange.cause,
            'WatchChangeAggregator does not handle errored targets'
          );
          break;
        case WatchTargetChangeState.Current:
          if (this.isActiveTarget(targetId)) {
            change.currentStatusUpdate = CurrentStatusUpdate.MarkCurrent;
            applyResumeToken(change, targetChange.resumeToken);
          }
          break;
        case WatchTargetChangeState.Reset:
          if (this.isActiveTarget(targetId)) {
            // Overwrite any existing target mapping with a reset
            // mapping. Every subsequent update will modify the reset
            // mapping, not an update mapping.
            change.mapping = new ResetMapping();
            applyResumeToken(change, targetChange.resumeToken);
          }
          break;
        default:
          fail('Unknown target watch change state: ' + targetChange.state);
      }
    });
  }

  /**
   * Record that we get a watch target add/remove by decrementing the number of
   * pending target responses that we have.
   */
  private recordTargetResponse(targetId: TargetId): void {
    const newCount = (this.pendingTargetResponses[targetId] || 0) - 1;
    if (newCount === 0) {
      delete this.pendingTargetResponses[targetId];
    } else {
      this.pendingTargetResponses[targetId] = newCount;
    }
  }

  private addExistenceFilterChange(change: ExistenceFilterChange): void {
    if (this.isActiveTarget(change.targetId)) {
      this.existenceFilters[change.targetId] = change.existenceFilter;
    }
  }
}

/**
 * Applies the resume token to the TargetChange, but only when it has a new
 * value. null and empty resumeTokens are discarded.
 */
function applyResumeToken(
  change: TargetChange,
  resumeToken: ProtoByteString
): void {
  if (resumeToken.length > 0) {
    change.resumeToken = resumeToken;
  }
}
