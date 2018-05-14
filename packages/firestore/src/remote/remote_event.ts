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
import {
  documentKeySet,
  DocumentKeySet,
  MaybeDocumentMap
} from '../model/collections';
import { MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { emptyByteString } from '../platform/platform';

/**
 * An event from the RemoteStore. It is split into targetChanges (changes to the
 * state or the set of documents in our watched targets) and documentUpdates
 * (changes to the actual documents).
 */
export class RemoteEvent {
  constructor(
    /**
     * The snapshot version this event brings us up to, or MIN if not set.
     */
    readonly snapshotVersion: SnapshotVersion,
    /**
     * A map from target to changes to the target. See TargetChange.
     */
    readonly targetChanges: { [targetId: number]: TargetChange },
    /**
     * A set of which documents have changed or been deleted, along with the
     * doc's new values (if not deleted).
     */
    public documentUpdates: MaybeDocumentMap,
    /**
     * A set of which document updates are due only to limbo resolution targets.
     */
    public limboDocuments: DocumentKeySet
  ) {}

  addDocumentUpdate(doc: MaybeDocument): void {
    this.documentUpdates = this.documentUpdates.insert(doc.key, doc);
  }

  handleExistenceFilterMismatch(targetId: TargetId): void {
    /*
     * An existence filter mismatch will reset the query and we need to reset
     * the mapping to contain no documents and an empty resume token.
     *
     * Note:
     *   * The reset mapping is empty, specifically forcing the consumer of the
     *     change to forget all keys for this targetID;
     *   * The resume snapshot for this target must be reset
     *   * The target must be unacked because unwatching and rewatching
     *     introduces a race for changes.
     */
    this.targetChanges[targetId] = {
      mapping: new ResetMapping(),
      snapshotVersion: SnapshotVersion.MIN,
      currentStatusUpdate: CurrentStatusUpdate.MarkNotCurrent,
      resumeToken: emptyByteString()
    };
  }

  /**
   * Synthesize a delete change if necessary for the given limbo target.
   */
  synthesizeDeleteForLimboTargetChange(
    targetChange: TargetChange,
    key: DocumentKey
  ): void {
    if (
      targetChange.currentStatusUpdate === CurrentStatusUpdate.MarkCurrent &&
      !this.documentUpdates.get(key)
    ) {
      // When listening to a query the server responds with a snapshot
      // containing documents matching the query and a current marker
      // telling us we're now in sync. It's possible for these to arrive
      // as separate remote events or as a single remote event.
      // For a document query, there will be no documents sent in the
      // response if the document doesn't exist.
      //
      // If the snapshot arrives separately from the current marker,
      // we handle it normally and updateTrackedLimbos will resolve the
      // limbo status of the document, removing it from limboDocumentRefs.
      // This works because clients only initiate limbo resolution when
      // a target is current and because all current targets are
      // always at a consistent snapshot.
      //
      // However, if the document doesn't exist and the current marker
      // arrives, the document is not present in the snapshot and our
      // normal view handling would consider the document to remain in
      // limbo indefinitely because there are no updates to the document.
      // To avoid this, we specially handle this case here:
      // synthesizing a delete.
      //
      // TODO(dimond): Ideally we would have an explicit lookup query
      // instead resulting in an explicit delete message and we could
      // remove this special logic.
      this.documentUpdates = this.documentUpdates.insert(
        key,
        new NoDocument(key, this.snapshotVersion)
      );
      this.limboDocuments = this.limboDocuments.add(key);
    }
  }
}

/**
 * Represents an update to the current status of a target, either explicitly
 * having no new state, or the new value to set. Note "current" has special
 * meaning for in the RPC protocol that implies that a target is both up-to-date
 * and consistent with the rest of the watch stream.
 */
export enum CurrentStatusUpdate {
  /** The current status is not affected and should not be modified. */
  None,
  /** The target must be marked as no longer "current". */
  MarkNotCurrent,
  /** The target must be marked as "current". */
  MarkCurrent
}

/**
 * A part of a RemoteEvent specifying set of changes to a specific target. These
 * changes track what documents are currently included in the target as well as
 * the current snapshot version and resume token but the actual changes *to*
 * documents are not part of the TargetChange since documents may be part of
 * multiple targets.
 */
export interface TargetChange {
  /**
   * The new "current" (synced) status of this target. Set to
   * CurrentStatusUpdateNone if the status should not be updated. Note "current"
   * has special meaning in the RPC protocol that implies that a target is
   * both up-to-date and consistent with the rest of the watch stream.
   */
  currentStatusUpdate: CurrentStatusUpdate;

  /**
   * A set of changes to documents in this target.
   */
  mapping: TargetMapping;

  /** The snapshot version that this target change brings us up to. */
  snapshotVersion: SnapshotVersion;

  /**
   * An opaque, server-assigned token that allows watching a query to be resumed
   * after disconnecting without retransmitting all the data that matches the
   * query. The resume token essentially identifies a point in time from which
   * the server should resume sending results.
   */
  resumeToken: ProtoByteString;
}

export type TargetMapping = ResetMapping | UpdateMapping;

const EMPTY_KEY_SET = documentKeySet();

export class ResetMapping {
  private docs: DocumentKeySet = EMPTY_KEY_SET;

  get documents(): DocumentKeySet {
    return this.docs;
  }

  add(key: DocumentKey): void {
    this.docs = this.docs.add(key);
  }

  delete(key: DocumentKey): void {
    this.docs = this.docs.delete(key);
  }

  isEqual(other: ResetMapping): boolean {
    return other !== null && this.docs.isEqual(other.docs);
  }

  filterUpdates(existingKeys: DocumentKeySet): void {
    // No-op. Resets don't get filtered.
  }
}

export class UpdateMapping {
  addedDocuments: DocumentKeySet = EMPTY_KEY_SET;
  removedDocuments: DocumentKeySet = EMPTY_KEY_SET;

  applyToKeySet(keys: DocumentKeySet): DocumentKeySet {
    let result = keys;
    this.addedDocuments.forEach(key => (result = result.add(key)));
    this.removedDocuments.forEach(key => (result = result.delete(key)));
    return result;
  }

  add(key: DocumentKey): void {
    this.addedDocuments = this.addedDocuments.add(key);
    this.removedDocuments = this.removedDocuments.delete(key);
  }

  delete(key: DocumentKey): void {
    this.addedDocuments = this.addedDocuments.delete(key);
    this.removedDocuments = this.removedDocuments.add(key);
  }

  isEqual(other: UpdateMapping): boolean {
    return (
      other !== null &&
      this.addedDocuments.isEqual(other.addedDocuments) &&
      this.removedDocuments.isEqual(other.removedDocuments)
    );
  }

  /**
   * Strips out mapping changes that aren't actually changes. That is, if the document already
   * existed in the target, and is being added in the target, and this is not a reset, we can
   * skip doing the work to associate the document with the target because it has already been done.
   */
  filterUpdates(existingKeys: DocumentKeySet): void {
    let results = this.addedDocuments;
    this.addedDocuments.forEach(docKey => {
      if (existingKeys.has(docKey)) {
        results = results.delete(docKey);
      }
    });
    this.addedDocuments = results;
  }
}
