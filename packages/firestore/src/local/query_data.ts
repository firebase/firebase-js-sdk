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

import { SnapshotVersion } from '../core/snapshot_version';
import { Target } from '../core/target';
import { ListenSequenceNumber, ProtoByteString, TargetId } from '../core/types';
import { emptyByteString } from '../platform/platform';

/** An enumeration of the different purposes we have for queries. */
export enum QueryPurpose {
  /** A regular, normal query. */
  Listen,

  /**
   * The query was used to refill a query after an existence filter mismatch.
   */
  ExistenceFilterMismatch,

  /** The query was used to resolve a limbo document. */
  LimboResolution
}

/**
 * An immutable set of metadata that the local store tracks for each query.
 */
// TODO(wuandy): rename this to TargetData.
export class QueryData {
  constructor(
    /** The query being listened to. */
    readonly target: Target,
    /**
     * The target ID to which the query corresponds; Assigned by the
     * LocalStore for user listens and by the SyncEngine for limbo watches.
     */
    readonly targetId: TargetId,
    /** The purpose of the query. */
    readonly purpose: QueryPurpose,
    /**
     * The sequence number of the last transaction during which this query data
     * was modified.
     */
    readonly sequenceNumber: ListenSequenceNumber,
    /** The latest snapshot version seen for this target. */
    readonly snapshotVersion: SnapshotVersion = SnapshotVersion.MIN,
    /**
     * The maximum snapshot version at which the associated query view
     * contained no limbo documents.
     */
    readonly lastLimboFreeSnapshotVersion: SnapshotVersion = SnapshotVersion.MIN,
    /**
     * An opaque, server-assigned token that allows watching a query to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the query. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */
    readonly resumeToken: ProtoByteString = emptyByteString()
  ) {}

  /** Creates a new query data instance with an updated sequence number. */
  withSequenceNumber(sequenceNumber: number): QueryData {
    return new QueryData(
      this.target,
      this.targetId,
      this.purpose,
      sequenceNumber,
      this.snapshotVersion,
      this.lastLimboFreeSnapshotVersion,
      this.resumeToken
    );
  }

  /**
   * Creates a new query data instance with an updated resume token and
   * snapshot version.
   */
  withResumeToken(
    resumeToken: ProtoByteString,
    snapshotVersion: SnapshotVersion
  ): QueryData {
    return new QueryData(
      this.target,
      this.targetId,
      this.purpose,
      this.sequenceNumber,
      snapshotVersion,
      this.lastLimboFreeSnapshotVersion,
      resumeToken
    );
  }

  /**
   * Creates a new query data instance with an updated last limbo free
   * snapshot version number.
   */
  withLastLimboFreeSnapshotVersion(
    lastLimboFreeSnapshotVersion: SnapshotVersion
  ): QueryData {
    return new QueryData(
      this.target,
      this.targetId,
      this.purpose,
      this.sequenceNumber,
      this.snapshotVersion,
      lastLimboFreeSnapshotVersion,
      this.resumeToken
    );
  }

  isEqual(other: QueryData): boolean {
    return (
      this.targetId === other.targetId &&
      this.purpose === other.purpose &&
      this.sequenceNumber === other.sequenceNumber &&
      this.snapshotVersion.isEqual(other.snapshotVersion) &&
      this.lastLimboFreeSnapshotVersion.isEqual(
        other.lastLimboFreeSnapshotVersion
      ) &&
      this.resumeToken === other.resumeToken &&
      this.target.isEqual(other.target)
    );
  }
}
