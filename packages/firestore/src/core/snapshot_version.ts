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

import { Timestamp } from '../api/timestamp';

/**
 * A version of a document in Firestore. This corresponds to the version
 * timestamp, such as update_time or read_time.
 */
export class SnapshotVersion {
  static readonly MIN = new SnapshotVersion(new Timestamp(0, 0));

  // TODO(b/34176344): Once we no longer need to use the old alpha protos,
  // delete this constructor and use a timestamp-backed version everywhere.
  static fromMicroseconds(value: number): SnapshotVersion {
    const seconds = Math.floor(value / 1e6);
    const nanos = (value % 1e6) * 1e3;
    return new SnapshotVersion(new Timestamp(seconds, nanos));
  }

  static fromTimestamp(value: Timestamp): SnapshotVersion {
    return new SnapshotVersion(value);
  }

  static forDeletedDoc(): SnapshotVersion {
    return SnapshotVersion.MIN;
  }

  private constructor(private timestamp: Timestamp) {}

  compareTo(other: SnapshotVersion): number {
    return this.timestamp._compareTo(other.timestamp);
  }

  isEqual(other: SnapshotVersion): boolean {
    return this.timestamp.isEqual(other.timestamp);
  }

  /** Returns a number representation of the version for use in spec tests. */
  toMicroseconds(): number {
    // Convert to microseconds.
    return this.timestamp.seconds * 1e6 + this.timestamp.nanoseconds / 1000;
  }

  toString(): string {
    return 'SnapshotVersion(' + this.timestamp.toString() + ')';
  }

  toTimestamp(): Timestamp {
    return this.timestamp;
  }
}
