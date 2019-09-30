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

import { Target } from '../core/target';
import { SnapshotVersion } from '../core/snapshot_version';
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
export class QueryData {
  constructor(
    /** The target query being listened to. */
    readonly target: Target,
    /**
     * The target ID to which the query corresponds; Assigned by the
     * LocalStore for user listens and by the SyncEngine for limbo watches.
     */
    readonly targetId: TargetId,
    /** The purpose of the target query. */
    readonly purpose: QueryPurpose,
    /** The sequence number of the last transaction during which this target data was modified */
    readonly sequenceNumber: ListenSequenceNumber,
    /** The latest snapshot version seen for this target. */
    readonly snapshotVersion: SnapshotVersion = SnapshotVersion.MIN,
    /**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */
    readonly resumeToken: ProtoByteString = emptyByteString()
  ) {}

  /** Creates a new target data instance with an updated sequence number. */
  withSequenceNumber(sequenceNumber: number): QueryData {
    return new QueryData(
      this.target,
      this.targetId,
      this.purpose,
      sequenceNumber,
      this.snapshotVersion,
      this.resumeToken
    );
  }

  /**
   * Creates a new target data instance with an updated resume token and
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
      resumeToken
    );
  }

  isEqual(other: QueryData): boolean {
    return (
      this.targetId === other.targetId &&
      this.purpose === other.purpose &&
      this.sequenceNumber === other.sequenceNumber &&
      this.snapshotVersion.isEqual(other.snapshotVersion) &&
      this.resumeToken === other.resumeToken &&
      this.target.isEqual(other.target)
    );
  }
}
