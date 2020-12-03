/**
 * @license
 * Copyright 2020 Google LLC
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

// This is a separate file because rollup (or typescript) treat it as circular
// dependency when it was in `./bundle.ts`, which breaks the bundle's module
// build.

import { Query } from './query';
import { SnapshotVersion } from './snapshot_version';

/**
 * Represents a Firestore bundle saved by the SDK in its local storage.
 */
export interface Bundle {
  /**
   * Id of the bundle. It is used together with `createTime` to determine if a
   * bundle has been loaded by the SDK.
   */
  readonly id: string;

  /** Schema version of the bundle. */
  readonly version: number;

  /**
   * Set to the snapshot version of the bundle if created by the Server SDKs.
   * Otherwise set to SnapshotVersion.MIN.
   */
  readonly createTime: SnapshotVersion;
}

/**
 * Represents a Query saved by the SDK in its local storage.
 */
export interface NamedQuery {
  /** The name of the query. */
  readonly name: string;
  /** The underlying query associated with `name`. */
  readonly query: Query;
  /** The time at which the results for this query were read. */
  readonly readTime: SnapshotVersion;
}
