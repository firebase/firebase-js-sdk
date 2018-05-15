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
import { ProtoByteString } from '../core/types';
import { DocumentKeySet, MaybeDocumentMap } from '../model/collections';

/**
 * An event from the RemoteStore. It is split into targetChanges (changes to the
 * state or the set of documents in our watched targets) and documentUpdates
 * (changes to the actual documents).
 */
export class RemoteEvent {
  /**
   * The snapshot version this event brings us up to, or MIN if not set.
   */
  readonly snapshotVersion: SnapshotVersion;
  /**
   * A map from target to changes to the target. See TargetChange.
   */
  readonly targetChanges: { [targetId: number]: TargetChange };
  /**
   * A set of which documents have changed or been deleted, along with the
   * doc's new values (if not deleted).
   */
  readonly documentUpdates: MaybeDocumentMap;
  /**
   * A set of which document updates are due only to limbo resolution targets.
   */
  readonly resolvedLimboDocuments: DocumentKeySet;

  constructor(options: {
    snapshotVersion: SnapshotVersion,
    targetChanges: { [targetId: number]: TargetChange },
    documentUpdates: MaybeDocumentMap,
    resolvedLimboDocuments: DocumentKeySet
  }) {
    this.snapshotVersion = options.snapshotVersion;
    this.targetChanges = options.targetChanges;
    this.documentUpdates = options.documentUpdates;
    this.resolvedLimboDocuments = options.resolvedLimboDocuments;
  }
}

/**
 * A part of a RemoteEvent specifying set of changes to a specific target. These
 * changes track which documents are assigned or removed fom the target as well
 * as the current snapshot version and resume token but the actual changes *to*
 * documents are not part of the TargetChange since documents may be part of
 * multiple targets.
 */
export class TargetChange {
  /**
   * The "current" (synced) status of this target. Note that "current"
   * has special meaning in the RPC protocol that implies that a target is
   * both up-to-date and consistent with the rest of the watch stream.
   */
  readonly current: boolean;

  /**
   * An opaque, server-assigned token that allows watching a query to be resumed
   * after disconnecting without retransmitting all the data that matches the
   * query. The resume token essentially identifies a point in time from which
   * the server should resume sending results.
   */
  readonly resumeToken: ProtoByteString;

  /**
   * The set of documents that were newly assigned to this target as part of
   * this remote event.
   */
  readonly addedDocuments: DocumentKeySet;

  /**
   * The set of documents that were already assigned to this target but received
   * an update during this remote event.
   */
  readonly modifiedDocuments: DocumentKeySet;

  /**
   * The set of documents that were removed from this target as part of this
   * remote event.
   */
  readonly removedDocuments: DocumentKeySet;

  constructor(options: {
    resumeToken: ProtoByteString,
    current: boolean,
    addedDocuments: DocumentKeySet,
    modifiedDocuments: DocumentKeySet,
    removedDocuments: DocumentKeySet
  }) {
    this.current = options.current;
    this.resumeToken = options.resumeToken;
    this.addedDocuments = options.addedDocuments;
    this.modifiedDocuments = options.modifiedDocuments;
    this.removedDocuments = options.removedDocuments;
  }
}
