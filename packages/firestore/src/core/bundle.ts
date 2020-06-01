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
import {
  firestoreV1ApiClientInterfaces,
  Timestamp
} from '../protos/firestore_proto_api';
import Document = firestoreV1ApiClientInterfaces.Document;
import { DocumentKey } from '../model/document_key';
import { MaybeDocument, NoDocument } from '../model/document';
import { BundledDocumentMetadata } from '../protos/firestore_bundle_proto';
import { debugAssert } from '../util/assert';

/**
 * Represents a Firestore bundle saved by the SDK in its local storage.
 */
export interface Bundle {
  readonly id: string;
  readonly version: number;
  // When the saved bundle is built from the server SDKs.
  readonly createTime: SnapshotVersion;
}

/**
 * Represents a Query saved by the SDK in its local storage.
 */
export interface NamedQuery {
  readonly name: string;
  readonly query: Query;
  // When the results for this query are read to the saved bundle.
  readonly readTime: SnapshotVersion;
}

export class BundleConverter {
  constructor(private serializer: JsonProtoSerializer) {}

  toDocumentKey(name: string): DocumentKey {
    return this.serializer.fromName(name);
  }

  toMaybeDocument(
    metadata: BundledDocumentMetadata,
    doc: Document | undefined
  ): MaybeDocument {
    if (metadata.exists) {
      debugAssert(!!doc, 'Document is undefined when metadata.exist is true.');
      return this.serializer.fromDocument(doc!, false);
    } else {
      return new NoDocument(
        this.toDocumentKey(metadata.name!),
        this.toSnapshotVersion(metadata.readTime!)
      );
    }
  }

  toSnapshotVersion(time: Timestamp): SnapshotVersion {
    return this.serializer.fromVersion(time);
  }
}
