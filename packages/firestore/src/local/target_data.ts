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
import { ListenSequenceNumber, TargetId } from '../core/types';
import { ByteString } from '../util/byte_string';

/** An enumeration of the different purposes we have for targets. */
export const enum TargetPurpose {
  /** A regular, normal query target. */
  Listen,

  /**
   * The query target was used to refill a query after an existence filter mismatch.
   */
  ExistenceFilterMismatch,

  /** The query target was used to resolve a limbo document. */
  LimboResolution
}

/**
 * An immutable set of metadata that the local store tracks for each target.
 */
export class TargetData {
  constructor(
    /** The target being listened to. */
    readonly target: Target,
    /**
     * The target ID to which the target corresponds; Assigned by the
     * LocalStore for user listens and by the SyncEngine for limbo watches.
     */
    readonly targetId: TargetId,
    /** The purpose of the target. */
    readonly purpose: TargetPurpose,
    /**
     * The sequence number of the last transaction during which this target data
     * was modified.
     */
    readonly sequenceNumber: ListenSequenceNumber,
    /** The latest snapshot version seen for this target. */
    readonly snapshotVersion: SnapshotVersion = SnapshotVersion.MIN,
    /**
     * The maximum snapshot version at which the associated view
     * contained no limbo documents.
     */
    readonly lastLimboFreeSnapshotVersion: SnapshotVersion = SnapshotVersion.MIN,
    /**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */
    readonly resumeToken: ByteString = ByteString.EMPTY_BYTE_STRING
  ) {}

  /** Creates a new target data instance with an updated sequence number. */
  withSequenceNumber(sequenceNumber: number): TargetData {
    return new TargetData(
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
   * Creates a new target data instance with an updated resume token and
   * snapshot version.
   */
  withResumeToken(
    resumeToken: ByteString,
    snapshotVersion: SnapshotVersion
  ): TargetData {
    return new TargetData(
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
   * Creates a new target data instance with an updated last limbo free
   * snapshot version number.
   */
  withLastLimboFreeSnapshotVersion(
    lastLimboFreeSnapshotVersion: SnapshotVersion
  ): TargetData {
    return new TargetData(
      this.target,
      this.targetId,
      this.purpose,
      this.sequenceNumber,
      this.snapshotVersion,
      lastLimboFreeSnapshotVersion,
      this.resumeToken
    );
  }

  isEqual(other: TargetData): boolean {
    return (
      this.targetId === other.targetId &&
      this.purpose === other.purpose &&
      this.sequenceNumber === other.sequenceNumber &&
      this.snapshotVersion.isEqual(other.snapshotVersion) &&
      this.lastLimboFreeSnapshotVersion.isEqual(
        other.lastLimboFreeSnapshotVersion
      ) &&
      this.resumeToken.isEqual(other.resumeToken) &&
      this.target.isEqual(other.target)
    );
  }
}
