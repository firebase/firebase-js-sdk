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

import { Query } from './query';
import { SnapshotVersion } from './snapshot_version';
import {
  BundledDocumentMetadata as ProtoBundledDocumentMetadata,
  BundleMetadata as ProtoBundleMetadata
} from '../protos/firestore_bundle_proto';
import * as api from '../protos/firestore_proto_api';
import { MaybeDocumentMap } from '../model/collections';
import { ApiLoadBundleTaskProgress } from '../api/bundle';

/**
 * Represents a Firestore bundle saved by the SDK in its local storage.
 */
export interface Bundle {
  readonly id: string;
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
  readonly name: string;
  readonly query: Query;
  /** The time at which the results for this query were read. */
  readonly readTime: SnapshotVersion;
}

/**
 * Represents a bundled document, including the metadata and the document
 * itself, if it exists.
 */
export interface BundledDocument {
  metadata: ProtoBundledDocumentMetadata;
  document?: api.Document;
}

/**
 * An array of `BundledDocument`.
 */
export type BundledDocuments = BundledDocument[];

/**
 * Returns a `LoadBundleTaskProgress` representing the initial progress of
 * loading a bundle.
 */
export function bundleInitialProgress(
  metadata: ProtoBundleMetadata
): ApiLoadBundleTaskProgress {
  return {
    taskState: 'Running',
    documentsLoaded: 0,
    bytesLoaded: 0,
    totalDocuments: metadata.totalDocuments!,
    totalBytes: metadata.totalBytes!
  };
}

/**
 * Returns a `LoadBundleTaskProgress` representing the progress that the loading
 * has succeeded.
 */
export function bundleSuccessProgress(
  metadata: ProtoBundleMetadata
): ApiLoadBundleTaskProgress {
  return {
    taskState: 'Success',
    documentsLoaded: metadata.totalDocuments!,
    bytesLoaded: metadata.totalBytes!,
    totalDocuments: metadata.totalDocuments!,
    totalBytes: metadata.totalBytes!
  };
}

export class BundleLoadResult {
  constructor(
    readonly progress: ApiLoadBundleTaskProgress,
    readonly changedDocs: MaybeDocumentMap
  ) {}
}
