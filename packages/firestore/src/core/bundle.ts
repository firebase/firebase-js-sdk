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
import { JsonProtoSerializer } from '../remote/serializer';
import * as bundleProto from '../protos/firestore_bundle_proto';
import * as api from '../protos/firestore_proto_api';
import { DocumentKey } from '../model/document_key';
import { MaybeDocument, NoDocument } from '../model/document';
import { debugAssert } from '../util/assert';

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
 * itself, if exists.
 */
interface BundledDocument {
  metadata: bundleProto.BundledDocumentMetadata;
  document: api.Document | undefined;
}

/**
 * An array of `BundledDocument`.
 */
export type BundledDocuments = Array<{
  metadata: bundleProto.BundledDocumentMetadata;
  document: api.Document | undefined;
}>;

/**
 * Helper to convert objects from bundles to model objects in the SDK.
 */
export class BundleConverter {
  constructor(private serializer: JsonProtoSerializer) {}

  toDocumentKey(name: string): DocumentKey {
    return this.serializer.fromName(name);
  }

  /**
   * Converts a [metadata, document] pair to a MaybeDocument.
   */
  toMaybeDocument(bundledDoc: BundledDocument): MaybeDocument {
    if (bundledDoc.metadata.exists) {
      debugAssert(
        !!bundledDoc.document,
        'Document is undefined when metadata.exist is true.'
      );
      return this.serializer.fromDocument(bundledDoc.document!, false);
    } else {
      return new NoDocument(
        this.toDocumentKey(bundledDoc.metadata.name!),
        this.toSnapshotVersion(bundledDoc.metadata.readTime!)
      );
    }
  }

  toSnapshotVersion(time: api.Timestamp): SnapshotVersion {
    return this.serializer.fromVersion(time);
  }
}
