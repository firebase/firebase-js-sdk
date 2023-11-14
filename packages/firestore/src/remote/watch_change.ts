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

import { DatabaseId } from '../core/database_info';
import { SnapshotVersion } from '../core/snapshot_version';
import { targetIsDocumentTarget } from '../core/target';
import { TargetId } from '../core/types';
import { ChangeType } from '../core/view_snapshot';
import { TargetData, TargetPurpose } from '../local/target_data';
import {
  documentKeySet,
  DocumentKeySet,
  mutableDocumentMap
} from '../model/collections';
import { MutableDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { normalizeByteString } from '../model/normalize';
import { debugAssert, fail, hardAssert } from '../util/assert';
import { Base64DecodeError } from '../util/base64_decode_error';
import { ByteString } from '../util/byte_string';
import { FirestoreError } from '../util/error';
import { logDebug, logWarn } from '../util/log';
import { primitiveComparator } from '../util/misc';
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';
import {
  testingHooksSpi,
  ExistenceFilterMismatchInfo as TestingHooksExistenceFilterMismatchInfo
} from '../util/testing_hooks_spi';

import { BloomFilter, BloomFilterError } from './bloom_filter';
import { ExistenceFilter } from './existence_filter';
import { RemoteEvent, TargetChange } from './remote_event';

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
    public newDoc: MutableDocument | null
  ) {}
}

export class ExistenceFilterChange {
  constructor(
    public targetId: TargetId,
    public existenceFilter: ExistenceFilter
  ) {}
}

export const enum WatchTargetChangeState {
  NoChange,
  Added,
  Removed,
  Current,
  Reset
}

const enum BloomFilterApplicationStatus {
  Success,
  Skipped,
  FalsePositive
}
export class WatchTargetChange {
  constructor(
    /** What kind of change occurred to the watch target. */
    public state: WatchTargetChangeState,
    /** The target IDs that were added/removed/set. */
    public targetIds: TargetId[],
    /**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */
    public resumeToken: ByteString = ByteString.EMPTY_BYTE_STRING,
    /** An RPC error indicating why the watch failed. */
    public cause: FirestoreError | null = null
  ) {}
}

/** Tracks the internal state of a Watch target. */
class TargetState {
  /**
   * The number of pending responses (adds or removes) that we are waiting on.
   * We only consider targets active that have no pending responses.
   */
  private pendingResponses = 0;

  /**
   * Keeps track of the document changes since the last raised snapshot.
   *
   * These changes are continuously updated as we receive document updates and
   * always reflect the current set of changes against the last issued snapshot.
   */
  private documentChanges: SortedMap<DocumentKey, ChangeType> =
    snapshotChangesMap();

  /** See public getters for explanations of these fields. */
  private _resumeToken: ByteString = ByteString.EMPTY_BYTE_STRING;
  private _current = false;

  /**
   * Whether this target state should be included in the next snapshot. We
   * initialize to true so that newly-added targets are included in the next
   * RemoteEvent.
   */
  private _hasPendingChanges = true;

  /**
   * Whether this target has been marked 'current'.
   *
   * 'Current' has special meaning in the RPC protocol: It implies that the
   * Watch backend has sent us all changes up to the point at which the target
   * was added and that the target is consistent with the rest of the watch
   * stream.
   */
  get current(): boolean {
    return this._current;
  }

  /** The last resume token sent to us for this target. */
  get resumeToken(): ByteString {
    return this._resumeToken;
  }

  /** Whether this target has pending target adds or target removes. */
  get isPending(): boolean {
    return this.pendingResponses !== 0;
  }

  /** Whether we have modified any state that should trigger a snapshot. */
  get hasPendingChanges(): boolean {
    return this._hasPendingChanges;
  }

  /**
   * Applies the resume token to the TargetChange, but only when it has a new
   * value. Empty resumeTokens are discarded.
   */
  updateResumeToken(resumeToken: ByteString): void {
    if (resumeToken.approximateByteSize() > 0) {
      this._hasPendingChanges = true;
      this._resumeToken = resumeToken;
    }
  }

  /**
   * Creates a target change from the current set of changes.
   *
   * To reset the document changes after raising this snapshot, call
   * `clearPendingChanges()`.
   */
  toTargetChange(): TargetChange {
    let addedDocuments = documentKeySet();
    let modifiedDocuments = documentKeySet();
    let removedDocuments = documentKeySet();

    this.documentChanges.forEach((key, changeType) => {
      switch (changeType) {
        case ChangeType.Added:
          addedDocuments = addedDocuments.add(key);
          break;
        case ChangeType.Modified:
          modifiedDocuments = modifiedDocuments.add(key);
          break;
        case ChangeType.Removed:
          removedDocuments = removedDocuments.add(key);
          break;
        default:
          fail('Encountered invalid change type: ' + changeType);
      }
    });

    return new TargetChange(
      this._resumeToken,
      this._current,
      addedDocuments,
      modifiedDocuments,
      removedDocuments
    );
  }

  /**
   * Resets the document changes and sets `hasPendingChanges` to false.
   */
  clearPendingChanges(): void {
    this._hasPendingChanges = false;
    this.documentChanges = snapshotChangesMap();
  }

  addDocumentChange(key: DocumentKey, changeType: ChangeType): void {
    this._hasPendingChanges = true;
    this.documentChanges = this.documentChanges.insert(key, changeType);
  }

  removeDocumentChange(key: DocumentKey): void {
    this._hasPendingChanges = true;
    this.documentChanges = this.documentChanges.remove(key);
  }

  recordPendingTargetRequest(): void {
    this.pendingResponses += 1;
  }

  recordTargetResponse(): void {
    this.pendingResponses -= 1;
    hardAssert(
      this.pendingResponses >= 0,
      '`pendingResponses` is less than 0. Actual value: ' +
        this.pendingResponses +
        '. This indicates that the SDK received more target acks from the ' +
        'server than expected. The SDK should not continue to operate.'
    );
  }

  markCurrent(): void {
    this._hasPendingChanges = true;
    this._current = true;
  }
}

/**
 * Interface implemented by RemoteStore to expose target metadata to the
 * WatchChangeAggregator.
 */
export interface TargetMetadataProvider {
  /**
   * Returns the set of remote document keys for the given target ID as of the
   * last raised snapshot.
   */
  getRemoteKeysForTarget(targetId: TargetId): DocumentKeySet;

  /**
   * Returns the TargetData for an active target ID or 'null' if this target
   * has become inactive
   */
  getTargetDataForTarget(targetId: TargetId): TargetData | null;

  /**
   * Returns the database ID of the Firestore instance.
   */
  getDatabaseId(): DatabaseId;
}

const LOG_TAG = 'WatchChangeAggregator';

/**
 * A helper class to accumulate watch changes into a RemoteEvent.
 */
export class WatchChangeAggregator {
  constructor(private metadataProvider: TargetMetadataProvider) {}

  /** The internal state of all tracked targets. */
  private targetStates = new Map<TargetId, TargetState>();

  /** Keeps track of the documents to update since the last raised snapshot. */
  private pendingDocumentUpdates = mutableDocumentMap();

  /** A mapping of document keys to their set of target IDs. */
  private pendingDocumentTargetMapping = documentTargetMap();

  /**
   * A map of targets with existence filter mismatches. These targets are
   * known to be inconsistent and their listens needs to be re-established by
   * RemoteStore.
   */
  private pendingTargetResets = new SortedMap<TargetId, TargetPurpose>(
    primitiveComparator
  );

  /**
   * Processes and adds the DocumentWatchChange to the current set of changes.
   */
  handleDocumentChange(docChange: DocumentWatchChange): void {
    for (const targetId of docChange.updatedTargetIds) {
      if (docChange.newDoc && docChange.newDoc.isFoundDocument()) {
        this.addDocumentToTarget(targetId, docChange.newDoc);
      } else {
        this.removeDocumentFromTarget(
          targetId,
          docChange.key,
          docChange.newDoc
        );
      }
    }

    for (const targetId of docChange.removedTargetIds) {
      this.removeDocumentFromTarget(targetId, docChange.key, docChange.newDoc);
    }
  }

  /** Processes and adds the WatchTargetChange to the current set of changes. */
  handleTargetChange(targetChange: WatchTargetChange): void {
    this.forEachTarget(targetChange, targetId => {
      const targetState = this.ensureTargetState(targetId);
      switch (targetChange.state) {
        case WatchTargetChangeState.NoChange:
          if (this.isActiveTarget(targetId)) {
            targetState.updateResumeToken(targetChange.resumeToken);
          }
          break;
        case WatchTargetChangeState.Added:
          // We need to decrement the number of pending acks needed from watch
          // for this targetId.
          targetState.recordTargetResponse();
          if (!targetState.isPending) {
            // We have a freshly added target, so we need to reset any state
            // that we had previously. This can happen e.g. when remove and add
            // back a target for existence filter mismatches.
            targetState.clearPendingChanges();
          }
          targetState.updateResumeToken(targetChange.resumeToken);
          break;
        case WatchTargetChangeState.Removed:
          // We need to keep track of removed targets to we can post-filter and
          // remove any target changes.
          // We need to decrement the number of pending acks needed from watch
          // for this targetId.
          targetState.recordTargetResponse();
          if (!targetState.isPending) {
            this.removeTarget(targetId);
          }
          debugAssert(
            !targetChange.cause,
            'WatchChangeAggregator does not handle errored targets'
          );
          break;
        case WatchTargetChangeState.Current:
          if (this.isActiveTarget(targetId)) {
            targetState.markCurrent();
            targetState.updateResumeToken(targetChange.resumeToken);
          }
          break;
        case WatchTargetChangeState.Reset:
          if (this.isActiveTarget(targetId)) {
            // Reset the target and synthesizes removes for all existing
            // documents. The backend will re-add any documents that still
            // match the target before it sends the next global snapshot.
            this.resetTarget(targetId);
            targetState.updateResumeToken(targetChange.resumeToken);
          }
          break;
        default:
          fail('Unknown target watch change state: ' + targetChange.state);
      }
    });
  }

  /**
   * Iterates over all targetIds that the watch change applies to: either the
   * targetIds explicitly listed in the change or the targetIds of all currently
   * active targets.
   */
  forEachTarget(
    targetChange: WatchTargetChange,
    fn: (targetId: TargetId) => void
  ): void {
    if (targetChange.targetIds.length > 0) {
      targetChange.targetIds.forEach(fn);
    } else {
      this.targetStates.forEach((_, targetId) => {
        if (this.isActiveTarget(targetId)) {
          fn(targetId);
        }
      });
    }
  }

  /**
   * Handles existence filters and synthesizes deletes for filter mismatches.
   * Targets that are invalidated by filter mismatches are added to
   * `pendingTargetResets`.
   */
  handleExistenceFilter(watchChange: ExistenceFilterChange): void {
    const targetId = watchChange.targetId;
    const expectedCount = watchChange.existenceFilter.count;

    const targetData = this.targetDataForActiveTarget(targetId);
    if (targetData) {
      const target = targetData.target;
      if (targetIsDocumentTarget(target)) {
        if (expectedCount === 0) {
          // The existence filter told us the document does not exist. We deduce
          // that this document does not exist and apply a deleted document to
          // our updates. Without applying this deleted document there might be
          // another query that will raise this document as part of a snapshot
          // until it is resolved, essentially exposing inconsistency between
          // queries.
          const key = new DocumentKey(target.path);
          this.removeDocumentFromTarget(
            targetId,
            key,
            MutableDocument.newNoDocument(key, SnapshotVersion.min())
          );
        } else {
          hardAssert(
            expectedCount === 1,
            'Single document existence filter with count: ' + expectedCount
          );
        }
      } else {
        const currentSize = this.getCurrentDocumentCountForTarget(targetId);
        // Existence filter mismatch. Mark the documents as being in limbo, and
        // raise a snapshot with `isFromCache:true`.
        if (currentSize !== expectedCount) {
          // Apply bloom filter to identify and mark removed documents.
          const bloomFilter = this.parseBloomFilter(watchChange);
          const status = bloomFilter
            ? this.applyBloomFilter(bloomFilter, watchChange, currentSize)
            : BloomFilterApplicationStatus.Skipped;

          if (status !== BloomFilterApplicationStatus.Success) {
            // If bloom filter application fails, we reset the mapping and
            // trigger re-run of the query.
            this.resetTarget(targetId);

            const purpose: TargetPurpose =
              status === BloomFilterApplicationStatus.FalsePositive
                ? TargetPurpose.ExistenceFilterMismatchBloom
                : TargetPurpose.ExistenceFilterMismatch;
            this.pendingTargetResets = this.pendingTargetResets.insert(
              targetId,
              purpose
            );
          }
          testingHooksSpi?.notifyOnExistenceFilterMismatch(
            createExistenceFilterMismatchInfoForTestingHooks(
              currentSize,
              watchChange.existenceFilter,
              this.metadataProvider.getDatabaseId(),
              bloomFilter,
              status
            )
          );
        }
      }
    }
  }

  /**
   * Parse the bloom filter from the "unchanged_names" field of an existence
   * filter.
   */
  private parseBloomFilter(
    watchChange: ExistenceFilterChange
  ): BloomFilter | null {
    const unchangedNames = watchChange.existenceFilter.unchangedNames;
    if (!unchangedNames || !unchangedNames.bits) {
      return null;
    }

    const {
      bits: { bitmap = '', padding = 0 },
      hashCount = 0
    } = unchangedNames;

    let normalizedBitmap: Uint8Array;
    try {
      normalizedBitmap = normalizeByteString(bitmap).toUint8Array();
    } catch (err) {
      if (err instanceof Base64DecodeError) {
        logWarn(
          'Decoding the base64 bloom filter in existence filter failed (' +
            err.message +
            '); ignoring the bloom filter and falling back to full re-query.'
        );
        return null;
      } else {
        throw err;
      }
    }

    let bloomFilter: BloomFilter;
    try {
      // BloomFilter throws error if the inputs are invalid.
      bloomFilter = new BloomFilter(normalizedBitmap, padding, hashCount);
    } catch (err) {
      if (err instanceof BloomFilterError) {
        logWarn('BloomFilter error: ', err);
      } else {
        logWarn('Applying bloom filter failed: ', err);
      }
      return null;
    }

    if (bloomFilter.bitCount === 0) {
      return null;
    }

    return bloomFilter;
  }

  /**
   * Apply bloom filter to remove the deleted documents, and return the
   * application status.
   */
  private applyBloomFilter(
    bloomFilter: BloomFilter,
    watchChange: ExistenceFilterChange,
    currentCount: number
  ): BloomFilterApplicationStatus {
    const expectedCount = watchChange.existenceFilter.count;

    const removedDocumentCount = this.filterRemovedDocuments(
      bloomFilter,
      watchChange.targetId
    );

    return expectedCount === currentCount - removedDocumentCount
      ? BloomFilterApplicationStatus.Success
      : BloomFilterApplicationStatus.FalsePositive;
  }

  /**
   * Filter out removed documents based on bloom filter membership result and
   * return number of documents removed.
   */
  private filterRemovedDocuments(
    bloomFilter: BloomFilter,
    targetId: number
  ): number {
    const existingKeys = this.metadataProvider.getRemoteKeysForTarget(targetId);
    let removalCount = 0;

    existingKeys.forEach(key => {
      const databaseId = this.metadataProvider.getDatabaseId();
      const documentPath =
        `projects/${databaseId.projectId}` +
        `/databases/${databaseId.database}` +
        `/documents/${key.path.canonicalString()}`;

      if (!bloomFilter.mightContain(documentPath)) {
        this.removeDocumentFromTarget(targetId, key, /*updatedDocument=*/ null);
        removalCount++;
      }
    });

    return removalCount;
  }

  /**
   * Converts the currently accumulated state into a remote event at the
   * provided snapshot version. Resets the accumulated changes before returning.
   */
  createRemoteEvent(snapshotVersion: SnapshotVersion): RemoteEvent {
    const targetChanges = new Map<TargetId, TargetChange>();

    this.targetStates.forEach((targetState, targetId) => {
      const targetData = this.targetDataForActiveTarget(targetId);
      if (targetData) {
        if (targetState.current && targetIsDocumentTarget(targetData.target)) {
          // Document queries for document that don't exist can produce an empty
          // result set. To update our local cache, we synthesize a document
          // delete if we have not previously received the document. This
          // resolves the limbo state of the document, removing it from
          // limboDocumentRefs.
          //
          // TODO(dimond): Ideally we would have an explicit lookup target
          // instead resulting in an explicit delete message and we could
          // remove this special logic.
          const key = new DocumentKey(targetData.target.path);
          if (
            this.pendingDocumentUpdates.get(key) === null &&
            !this.targetContainsDocument(targetId, key)
          ) {
            this.removeDocumentFromTarget(
              targetId,
              key,
              MutableDocument.newNoDocument(key, snapshotVersion)
            );
          }
        }

        if (targetState.hasPendingChanges) {
          targetChanges.set(targetId, targetState.toTargetChange());
          targetState.clearPendingChanges();
        }
      }
    });

    let resolvedLimboDocuments = documentKeySet();

    // We extract the set of limbo-only document updates as the GC logic
    // special-cases documents that do not appear in the target cache.
    //
    // TODO(gsoltis): Expand on this comment once GC is available in the JS
    // client.
    this.pendingDocumentTargetMapping.forEach((key, targets) => {
      let isOnlyLimboTarget = true;

      targets.forEachWhile(targetId => {
        const targetData = this.targetDataForActiveTarget(targetId);
        if (
          targetData &&
          targetData.purpose !== TargetPurpose.LimboResolution
        ) {
          isOnlyLimboTarget = false;
          return false;
        }

        return true;
      });

      if (isOnlyLimboTarget) {
        resolvedLimboDocuments = resolvedLimboDocuments.add(key);
      }
    });

    this.pendingDocumentUpdates.forEach((_, doc) =>
      doc.setReadTime(snapshotVersion)
    );

    const remoteEvent = new RemoteEvent(
      snapshotVersion,
      targetChanges,
      this.pendingTargetResets,
      this.pendingDocumentUpdates,
      resolvedLimboDocuments
    );

    this.pendingDocumentUpdates = mutableDocumentMap();
    this.pendingDocumentTargetMapping = documentTargetMap();
    this.pendingTargetResets = new SortedMap<TargetId, TargetPurpose>(
      primitiveComparator
    );

    return remoteEvent;
  }

  /**
   * Adds the provided document to the internal list of document updates and
   * its document key to the given target's mapping.
   */
  // Visible for testing.
  addDocumentToTarget(targetId: TargetId, document: MutableDocument): void {
    if (!this.isActiveTarget(targetId)) {
      return;
    }

    const changeType = this.targetContainsDocument(targetId, document.key)
      ? ChangeType.Modified
      : ChangeType.Added;

    const targetState = this.ensureTargetState(targetId);
    targetState.addDocumentChange(document.key, changeType);

    this.pendingDocumentUpdates = this.pendingDocumentUpdates.insert(
      document.key,
      document
    );

    this.pendingDocumentTargetMapping =
      this.pendingDocumentTargetMapping.insert(
        document.key,
        this.ensureDocumentTargetMapping(document.key).add(targetId)
      );
  }

  /**
   * Removes the provided document from the target mapping. If the
   * document no longer matches the target, but the document's state is still
   * known (e.g. we know that the document was deleted or we received the change
   * that caused the filter mismatch), the new document can be provided
   * to update the remote document cache.
   */
  // Visible for testing.
  removeDocumentFromTarget(
    targetId: TargetId,
    key: DocumentKey,
    updatedDocument: MutableDocument | null
  ): void {
    if (!this.isActiveTarget(targetId)) {
      return;
    }

    const targetState = this.ensureTargetState(targetId);
    if (this.targetContainsDocument(targetId, key)) {
      targetState.addDocumentChange(key, ChangeType.Removed);
    } else {
      // The document may have entered and left the target before we raised a
      // snapshot, so we can just ignore the change.
      targetState.removeDocumentChange(key);
    }

    this.pendingDocumentTargetMapping =
      this.pendingDocumentTargetMapping.insert(
        key,
        this.ensureDocumentTargetMapping(key).delete(targetId)
      );

    if (updatedDocument) {
      this.pendingDocumentUpdates = this.pendingDocumentUpdates.insert(
        key,
        updatedDocument
      );
    }
  }

  removeTarget(targetId: TargetId): void {
    this.targetStates.delete(targetId);
  }

  /**
   * Returns the current count of documents in the target. This includes both
   * the number of documents that the LocalStore considers to be part of the
   * target as well as any accumulated changes.
   */
  private getCurrentDocumentCountForTarget(targetId: TargetId): number {
    const targetState = this.ensureTargetState(targetId);
    const targetChange = targetState.toTargetChange();
    return (
      this.metadataProvider.getRemoteKeysForTarget(targetId).size +
      targetChange.addedDocuments.size -
      targetChange.removedDocuments.size
    );
  }

  /**
   * Increment the number of acks needed from watch before we can consider the
   * server to be 'in-sync' with the client's active targets.
   */
  recordPendingTargetRequest(targetId: TargetId): void {
    // For each request we get we need to record we need a response for it.
    const targetState = this.ensureTargetState(targetId);
    targetState.recordPendingTargetRequest();
  }

  private ensureTargetState(targetId: TargetId): TargetState {
    let result = this.targetStates.get(targetId);
    if (!result) {
      result = new TargetState();
      this.targetStates.set(targetId, result);
    }
    return result;
  }

  private ensureDocumentTargetMapping(key: DocumentKey): SortedSet<TargetId> {
    let targetMapping = this.pendingDocumentTargetMapping.get(key);

    if (!targetMapping) {
      targetMapping = new SortedSet<TargetId>(primitiveComparator);
      this.pendingDocumentTargetMapping =
        this.pendingDocumentTargetMapping.insert(key, targetMapping);
    }

    return targetMapping;
  }

  /**
   * Verifies that the user is still interested in this target (by calling
   * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
   * from watch.
   */
  protected isActiveTarget(targetId: TargetId): boolean {
    const targetActive = this.targetDataForActiveTarget(targetId) !== null;
    if (!targetActive) {
      logDebug(LOG_TAG, 'Detected inactive target', targetId);
    }
    return targetActive;
  }

  /**
   * Returns the TargetData for an active target (i.e. a target that the user
   * is still interested in that has no outstanding target change requests).
   */
  protected targetDataForActiveTarget(targetId: TargetId): TargetData | null {
    const targetState = this.targetStates.get(targetId);
    return targetState && targetState.isPending
      ? null
      : this.metadataProvider.getTargetDataForTarget(targetId);
  }

  /**
   * Resets the state of a Watch target to its initial state (e.g. sets
   * 'current' to false, clears the resume token and removes its target mapping
   * from all documents).
   */
  private resetTarget(targetId: TargetId): void {
    debugAssert(
      !this.targetStates.get(targetId)!.isPending,
      'Should only reset active targets'
    );
    this.targetStates.set(targetId, new TargetState());

    // Trigger removal for any documents currently mapped to this target.
    // These removals will be part of the initial snapshot if Watch does not
    // resend these documents.
    const existingKeys = this.metadataProvider.getRemoteKeysForTarget(targetId);
    existingKeys.forEach(key => {
      this.removeDocumentFromTarget(targetId, key, /*updatedDocument=*/ null);
    });
  }
  /**
   * Returns whether the LocalStore considers the document to be part of the
   * specified target.
   */
  private targetContainsDocument(
    targetId: TargetId,
    key: DocumentKey
  ): boolean {
    const existingKeys = this.metadataProvider.getRemoteKeysForTarget(targetId);
    return existingKeys.has(key);
  }
}

function documentTargetMap(): SortedMap<DocumentKey, SortedSet<TargetId>> {
  return new SortedMap<DocumentKey, SortedSet<TargetId>>(
    DocumentKey.comparator
  );
}

function snapshotChangesMap(): SortedMap<DocumentKey, ChangeType> {
  return new SortedMap<DocumentKey, ChangeType>(DocumentKey.comparator);
}

function createExistenceFilterMismatchInfoForTestingHooks(
  localCacheCount: number,
  existenceFilter: ExistenceFilter,
  databaseId: DatabaseId,
  bloomFilter: BloomFilter | null,
  bloomFilterStatus: BloomFilterApplicationStatus
): TestingHooksExistenceFilterMismatchInfo {
  const result: TestingHooksExistenceFilterMismatchInfo = {
    localCacheCount,
    existenceFilterCount: existenceFilter.count,
    databaseId: databaseId.database,
    projectId: databaseId.projectId
  };

  const unchangedNames = existenceFilter.unchangedNames;
  if (unchangedNames) {
    result.bloomFilter = {
      applied: bloomFilterStatus === BloomFilterApplicationStatus.Success,
      hashCount: unchangedNames?.hashCount ?? 0,
      bitmapLength: unchangedNames?.bits?.bitmap?.length ?? 0,
      padding: unchangedNames?.bits?.padding ?? 0,
      mightContain: (value: string): boolean =>
        bloomFilter?.mightContain(value) ?? false
    };
  }

  return result;
}
