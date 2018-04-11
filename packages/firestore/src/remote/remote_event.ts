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
import { MaybeDocument } from '../model/document';
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
    public documentUpdates: MaybeDocumentMap
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
}
