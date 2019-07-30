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

import {
  documentKeySet,
  DocumentKeySet,
  MaybeDocumentMap
} from '../model/collections';
import { Document, MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { DocumentSet } from '../model/document_set';
import { TargetChange } from '../remote/remote_event';
import { assert, fail } from '../util/assert';

import { Query } from './query';
import { OnlineState } from './types';
import {
  ChangeType,
  DocumentChangeSet,
  SyncState,
  ViewSnapshot
} from './view_snapshot';

export type LimboDocumentChange = AddedLimboDocument | RemovedLimboDocument;
export class AddedLimboDocument {
  constructor(public key: DocumentKey) {}
}
export class RemovedLimboDocument {
  constructor(public key: DocumentKey) {}
}

/** The result of applying a set of doc changes to a view. */
export interface ViewDocumentChanges {
  /** The new set of docs that should be in the view. */
  documentSet: DocumentSet;
  /** The diff of these docs with the previous set of docs. */
  changeSet: DocumentChangeSet;
  /**
   * Whether the set of documents passed in was not sufficient to calculate the
   * new state of the view and there needs to be another pass based on the
   * local cache.
   */
  needsRefill: boolean;

  mutatedKeys: DocumentKeySet;
}

export interface ViewChange {
  snapshot?: ViewSnapshot;
  limboChanges: LimboDocumentChange[];
}

/**
 * View is responsible for computing the final merged truth of what docs are in
 * a query. It gets notified of local and remote changes to docs, and applies
 * the query filters and limits to determine the most correct possible results.
 */
export class View {
  private syncState: SyncState | null = null;
  /**
   * A flag whether the view is current with the backend. A view is considered
   * current after it has seen the current flag from the backend and did not
   * lose consistency within the watch stream (e.g. because of an existence
   * filter mismatch).
   */
  private current = false;
  private documentSet: DocumentSet;
  /** Documents in the view but not in the remote target */
  private limboDocuments = documentKeySet();
  /** Document Keys that have local changes */
  private mutatedKeys = documentKeySet();

  constructor(
    private query: Query,
    /** Documents included in the remote target */
    private _syncedDocuments: DocumentKeySet
  ) {
    this.documentSet = new DocumentSet(query.docComparator.bind(query));
  }

  /**
   * The set of remote documents that the server has told us belongs to the target associated with
   * this view.
   */
  get syncedDocuments(): DocumentKeySet {
    return this._syncedDocuments;
  }

  /**
   * Iterates over a set of doc changes, applies the query limit, and computes
   * what the new results should be, what the changes were, and whether we may
   * need to go back to the local cache for more results. Does not make any
   * changes to the view.
   * @param docChanges The doc changes to apply to this view.
   * @param previousChanges If this is being called with a refill, then start
   *        with this set of docs and changes instead of the current view.
   * @return a new set of docs, changes, and refill flag.
   */
  computeDocChanges(
    docChanges: MaybeDocumentMap,
    previousChanges?: ViewDocumentChanges
  ): ViewDocumentChanges {
    const changeSet = previousChanges
      ? previousChanges.changeSet
      : new DocumentChangeSet();
    const oldDocumentSet = previousChanges
      ? previousChanges.documentSet
      : this.documentSet;
    let newMutatedKeys = previousChanges
      ? previousChanges.mutatedKeys
      : this.mutatedKeys;
    let newDocumentSet = oldDocumentSet;
    let needsRefill = false;

    // Track the last doc in a (full) limit. This is necessary, because some
    // update (a delete, or an update moving a doc past the old limit) might
    // mean there is some other document in the local cache that either should
    // come (1) between the old last limit doc and the new last document, in the
    // case of updates, or (2) after the new last document, in the case of
    // deletes. So we keep this doc at the old limit to compare the updates to.
    //
    // Note that this should never get used in a refill (when previousChanges is
    // set), because there will only be adds -- no deletes or updates.
    const lastDocInLimit =
      this.query.hasLimit() && oldDocumentSet.size === this.query.limit
        ? oldDocumentSet.last()
        : null;

    docChanges.inorderTraversal(
      (key: DocumentKey, newMaybeDoc: MaybeDocument) => {
        const oldDoc = oldDocumentSet.get(key);
        let newDoc = newMaybeDoc instanceof Document ? newMaybeDoc : null;
        if (newDoc) {
          assert(
            key.isEqual(newDoc.key),
            'Mismatching keys found in document changes: ' +
              key +
              ' != ' +
              newDoc.key
          );
          newDoc = this.query.matches(newDoc) ? newDoc : null;
        }

        const oldDocHadPendingMutations = oldDoc
          ? this.mutatedKeys.has(oldDoc.key)
          : false;
        const newDocHasPendingMutations = newDoc
          ? newDoc.hasLocalMutations ||
            // We only consider committed mutations for documents that were
            // mutated during the lifetime of the view.
            (this.mutatedKeys.has(newDoc.key) && newDoc.hasCommittedMutations)
          : false;

        let changeApplied = false;

        // Calculate change
        if (oldDoc && newDoc) {
          const docsEqual = oldDoc.data.isEqual(newDoc.data);
          if (!docsEqual) {
            if (!this.shouldWaitForSyncedDocument(oldDoc, newDoc)) {
              changeSet.track({
                type: ChangeType.Modified,
                doc: newDoc
              });
              changeApplied = true;

              if (
                lastDocInLimit &&
                this.query.docComparator(newDoc, lastDocInLimit) > 0
              ) {
                // This doc moved from inside the limit to after the limit.
                // That means there may be some doc in the local cache that's
                // actually less than this one.
                needsRefill = true;
              }
            }
          } else if (oldDocHadPendingMutations !== newDocHasPendingMutations) {
            changeSet.track({ type: ChangeType.Metadata, doc: newDoc });
            changeApplied = true;
          }
        } else if (!oldDoc && newDoc) {
          changeSet.track({ type: ChangeType.Added, doc: newDoc });
          changeApplied = true;
        } else if (oldDoc && !newDoc) {
          changeSet.track({ type: ChangeType.Removed, doc: oldDoc });
          changeApplied = true;

          if (lastDocInLimit) {
            // A doc was removed from a full limit query. We'll need to
            // requery from the local cache to see if we know about some other
            // doc that should be in the results.
            needsRefill = true;
          }
        }

        if (changeApplied) {
          if (newDoc) {
            newDocumentSet = newDocumentSet.add(newDoc);
            if (newDocHasPendingMutations) {
              newMutatedKeys = newMutatedKeys.add(key);
            } else {
              newMutatedKeys = newMutatedKeys.delete(key);
            }
          } else {
            newDocumentSet = newDocumentSet.delete(key);
            newMutatedKeys = newMutatedKeys.delete(key);
          }
        }
      }
    );
    if (this.query.hasLimit()) {
      while (newDocumentSet.size > this.query.limit!) {
        const oldDoc = newDocumentSet.last();
        newDocumentSet = newDocumentSet.delete(oldDoc!.key);
        newMutatedKeys = newMutatedKeys.delete(oldDoc!.key);
        changeSet.track({ type: ChangeType.Removed, doc: oldDoc! });
      }
    }
    assert(
      !needsRefill || !previousChanges,
      'View was refilled using docs that themselves needed refilling.'
    );
    return {
      documentSet: newDocumentSet,
      changeSet,
      needsRefill,
      mutatedKeys: newMutatedKeys
    };
  }

  private shouldWaitForSyncedDocument(
    oldDoc: Document,
    newDoc: Document
  ): boolean {
    // We suppress the initial change event for documents that were modified as
    // part of a write acknowledgment (e.g. when the value of a server transform
    // is applied) as Watch will send us the same document again.
    // By suppressing the event, we only raise two user visible events (one with
    // `hasPendingWrites` and the final state of the document) instead of three
    // (one with `hasPendingWrites`, the modified document with
    // `hasPendingWrites` and the final state of the document).
    return (
      oldDoc.hasLocalMutations &&
      newDoc.hasCommittedMutations &&
      !newDoc.hasLocalMutations
    );
  }

  /**
   * Updates the view with the given ViewDocumentChanges and optionally updates
   * limbo docs and sync state from the provided target change.
   * @param docChanges The set of changes to make to the view's docs.
   * @param updateLimboDocuments Whether to update limbo documents based on this
   *        change.
   * @param targetChange A target change to apply for computing limbo docs and
   *        sync state.
   * @return A new ViewChange with the given docs, changes, and sync state.
   */
  // PORTING NOTE: The iOS/Android clients always compute limbo document changes.
  applyChanges(
    docChanges: ViewDocumentChanges,
    updateLimboDocuments: boolean,
    targetChange?: TargetChange
  ): ViewChange {
    assert(!docChanges.needsRefill, 'Cannot apply changes that need a refill');
    const oldDocs = this.documentSet;
    this.documentSet = docChanges.documentSet;
    this.mutatedKeys = docChanges.mutatedKeys;
    // Sort changes based on type and query comparator
    const changes = docChanges.changeSet.getChanges();
    changes.sort((c1, c2) => {
      return (
        compareChangeType(c1.type, c2.type) ||
        this.query.docComparator(c1.doc, c2.doc)
      );
    });

    this.applyTargetChange(targetChange);
    const limboChanges = updateLimboDocuments
      ? this.updateLimboDocuments()
      : [];
    const synced = this.limboDocuments.size === 0 && this.current;
    const newSyncState = synced ? SyncState.Synced : SyncState.Local;
    const syncStateChanged = newSyncState !== this.syncState;
    this.syncState = newSyncState;

    if (changes.length === 0 && !syncStateChanged) {
      // no changes
      return { limboChanges };
    } else {
      const snap: ViewSnapshot = new ViewSnapshot(
        this.query,
        docChanges.documentSet,
        oldDocs,
        changes,
        docChanges.mutatedKeys,
        newSyncState === SyncState.Local,
        syncStateChanged,
        /* excludesMetadataChanges= */ false
      );
      return {
        snapshot: snap,
        limboChanges
      };
    }
  }

  /**
   * Applies an OnlineState change to the view, potentially generating a
   * ViewChange if the view's syncState changes as a result.
   */
  applyOnlineStateChange(onlineState: OnlineState): ViewChange {
    if (this.current && onlineState === OnlineState.Offline) {
      // If we're offline, set `current` to false and then call applyChanges()
      // to refresh our syncState and generate a ViewChange as appropriate. We
      // are guaranteed to get a new TargetChange that sets `current` back to
      // true once the client is back online.
      this.current = false;
      return this.applyChanges(
        {
          documentSet: this.documentSet,
          changeSet: new DocumentChangeSet(),
          mutatedKeys: this.mutatedKeys,
          needsRefill: false
        },
        /* updateLimboDocuments= */ false
      );
    } else {
      // No effect, just return a no-op ViewChange.
      return { limboChanges: [] };
    }
  }

  /**
   * Returns whether the doc for the given key should be in limbo.
   */
  private shouldBeInLimbo(key: DocumentKey): boolean {
    // If the remote end says it's part of this query, it's not in limbo.
    if (this._syncedDocuments.has(key)) {
      return false;
    }
    // The local store doesn't think it's a result, so it shouldn't be in limbo.
    if (!this.documentSet.has(key)) {
      return false;
    }
    // If there are local changes to the doc, they might explain why the server
    // doesn't know that it's part of the query. So don't put it in limbo.
    // TODO(klimt): Ideally, we would only consider changes that might actually
    // affect this specific query.
    if (this.documentSet.get(key)!.hasLocalMutations) {
      return false;
    }
    // Everything else is in limbo.
    return true;
  }

  /**
   * Updates syncedDocuments, current, and limbo docs based on the given change.
   * Returns the list of changes to which docs are in limbo.
   */
  private applyTargetChange(targetChange?: TargetChange): void {
    if (targetChange) {
      targetChange.addedDocuments.forEach(
        key => (this._syncedDocuments = this._syncedDocuments.add(key))
      );
      targetChange.modifiedDocuments.forEach(key =>
        assert(
          this._syncedDocuments.has(key),
          `Modified document ${key} not found in view.`
        )
      );
      targetChange.removedDocuments.forEach(
        key => (this._syncedDocuments = this._syncedDocuments.delete(key))
      );
      this.current = targetChange.current;
    }
  }

  private updateLimboDocuments(): LimboDocumentChange[] {
    // We can only determine limbo documents when we're in-sync with the server.
    if (!this.current) {
      return [];
    }

    // TODO(klimt): Do this incrementally so that it's not quadratic when
    // updating many documents.
    const oldLimboDocuments = this.limboDocuments;
    this.limboDocuments = documentKeySet();
    this.documentSet.forEach(doc => {
      if (this.shouldBeInLimbo(doc.key)) {
        this.limboDocuments = this.limboDocuments.add(doc.key);
      }
    });

    // Diff the new limbo docs with the old limbo docs.
    const changes: LimboDocumentChange[] = [];
    oldLimboDocuments.forEach(key => {
      if (!this.limboDocuments.has(key)) {
        changes.push(new RemovedLimboDocument(key));
      }
    });
    this.limboDocuments.forEach(key => {
      if (!oldLimboDocuments.has(key)) {
        changes.push(new AddedLimboDocument(key));
      }
    });
    return changes;
  }

  /**
   * Update the in-memory state of the current view with the state read from
   * persistence.
   *
   * We update the query view whenever a client's primary status changes:
   * - When a client transitions from primary to secondary, it can miss
   *   LocalStorage updates and its query views may temporarily not be
   *   synchronized with the state on disk.
   * - For secondary to primary transitions, the client needs to update the list
   *   of `syncedDocuments` since secondary clients update their query views
   *   based purely on synthesized RemoteEvents.
   *
   * @param localDocs - The documents that match the query according to the
   * LocalStore.
   * @param remoteKeys - The keys of the documents that match the query
   * according to the backend.
   *
   * @return The ViewChange that resulted from this synchronization.
   */
  // PORTING NOTE: Multi-tab only.
  synchronizeWithPersistedState(
    localDocs: MaybeDocumentMap,
    remoteKeys: DocumentKeySet
  ): ViewChange {
    this._syncedDocuments = remoteKeys;
    this.limboDocuments = documentKeySet();
    const docChanges = this.computeDocChanges(localDocs);
    return this.applyChanges(docChanges, /*updateLimboDocuments=*/ true);
  }

  /**
   * Returns a view snapshot as if this query was just listened to. Contains
   * a document add for every existing document and the `fromCache` and
   * `hasPendingWrites` status of the already established view.
   */
  // PORTING NOTE: Multi-tab only.
  computeInitialSnapshot(): ViewSnapshot {
    return ViewSnapshot.fromInitialDocuments(
      this.query,
      this.documentSet,
      this.mutatedKeys,
      this.syncState === SyncState.Local
    );
  }
}

function compareChangeType(c1: ChangeType, c2: ChangeType): number {
  const order = (change: ChangeType): 0 | 1 | 2 => {
    switch (change) {
      case ChangeType.Added:
        return 1;
      case ChangeType.Modified:
        return 2;
      case ChangeType.Metadata:
        // A metadata change is converted to a modified change at the public
        // api layer.  Since we sort by document key and then change type,
        // metadata and modified changes must be sorted equivalently.
        return 2;
      case ChangeType.Removed:
        return 0;
      default:
        return fail('Unknown ChangeType: ' + change);
    }
  };

  return order(c1) - order(c2);
}
