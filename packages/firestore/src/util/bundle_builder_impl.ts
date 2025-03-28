/**
 * @license
 * Copyright 2025 Google LLC
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

import {
  JsonProtoSerializer,
  fromTimestamp,
  toName,
  toQueryTarget,
  toTimestamp
} from '../../src/remote/serializer';
import { encoder } from '../../test/unit/util/bundle_data';
import { Firestore } from '../api/database';
import { DatabaseId } from '../core/database_info';
import { Query, queryToTarget } from '../core/query';
import { DocumentData } from '../lite-api/reference';
import { Timestamp } from '../lite-api/timestamp';
import {
  parseObject,
  UserDataReader,
  UserDataSource
} from '../lite-api/user_data_reader';
import { DocumentKey } from '../model/document_key';
import {
  BundledDocumentMetadata as ProtoBundledDocumentMetadata,
  BundleElement as ProtoBundleElement,
  BundleMetadata as ProtoBundleMetadata,
  NamedQuery as ProtoNamedQuery
} from '../protos/firestore_bundle_proto';
import {
  Document as ProtoDocument,
  Document
} from '../protos/firestore_proto_api';
import { AutoId } from '../util/misc';

import { debugAssert } from './assert';

const BUNDLE_VERSION = 1;

/**
 * Builds a Firestore data bundle with results from the given document and query snapshots.
 */
export class BundleBuilder {
  // Resulting documents for the bundle, keyed by full document path.
  private documents: Map<string, BundledDocument> = new Map();
  // Named queries saved in the bundle, keyed by query name.
  private namedQueries: Map<string, ProtoNamedQuery> = new Map();

  // The latest read time among all bundled documents and queries.
  private latestReadTime = new Timestamp(0, 0);

  // Database identifier which is part of the serialized bundle.
  private databaseId: DatabaseId;

  // Tools to convert public data types into their serialized form.
  private readonly serializer: JsonProtoSerializer;
  private readonly userDataReader: UserDataReader;

  constructor(private firestore: Firestore, readonly bundleId: string) {
    this.databaseId = firestore._databaseId;

    // useProto3Json is true because the objects will be serialized to JSON string
    // before being written to the bundle buffer.
    this.serializer = new JsonProtoSerializer(
      this.databaseId,
      /*useProto3Json=*/ true
    );

    this.userDataReader = new UserDataReader(
      this.databaseId,
      true,
      this.serializer
    );
  }

  /**
   * Adds data from a DocumentSnapshot to the bundle.
   * @internal
   * @param docBundleData A DocumentSnapshotBundleData containing information from the
   * DocumentSnapshot. Note we cannot accept a DocumentSnapshot directly due to a circular
   * dependency error.
   * @param queryName The name of the QuerySnapshot if this document is part of a Query.
   */
  addBundleDocument(
    docBundleData: DocumentSnapshotBundleData,
    queryName?: string
  ): void {
    const originalDocument = this.documents.get(docBundleData.documentPath);
    const originalQueries = originalDocument?.metadata.queries;
    const docReadTime: Timestamp | undefined = docBundleData.readTime;
    const origDocReadTime: Timestamp | null = !!originalDocument?.metadata
      .readTime
      ? fromTimestamp(originalDocument.metadata.readTime)
      : null;

    const neitherHasReadTime: boolean = !docReadTime && origDocReadTime == null;
    const docIsNewer: boolean = docReadTime !== undefined && (origDocReadTime == null || origDocReadTime < docReadTime);
    if (neitherHasReadTime || docIsNewer) {
      // Store document.
      this.documents.set(docBundleData.documentPath, {
        document: this.toBundleDocument(docBundleData),
        metadata: {
          name: toName(this.serializer, docBundleData.documentKey),
          readTime: !!docReadTime
            ? toTimestamp(this.serializer, docReadTime) // Convert Timestamp to proto format.
            : undefined,
          exists: docBundleData.documentExists
        }
      });
    } 
    if (docReadTime && docReadTime > this.latestReadTime) {
      this.latestReadTime = docReadTime;
    }
    // Update `queries` to include both original and `queryName`.
    if (queryName) {
      const newDocument = this.documents.get(docBundleData.documentPath)!;
      newDocument.metadata.queries = originalQueries || [];
      newDocument.metadata.queries!.push(queryName);
    }
  }

  /**
   * Adds data from a QuerySnapshot to the bundle.
   * @internal
   * @param docBundleData A QuerySnapshotBundleData containing information from the
   * QuerySnapshot. Note we cannot accept a QuerySnapshot directly due to a circular
   * dependency error.
   */
  addBundleQuery(queryBundleData: QuerySnapshotBundleData): void {
    const name = AutoId.newId();
    if (this.namedQueries.has(name)) {
      throw new Error(`Query name conflict: ${name} has already been added.`);
    }
    let latestReadTime = new Timestamp(0, 0);
    for (const docBundleData of queryBundleData.docBundleDataArray) {
      this.addBundleDocument(docBundleData, name);
      if (docBundleData.readTime && docBundleData.readTime > latestReadTime) {
        latestReadTime = docBundleData.readTime;
      }
    }
    const queryTarget = toQueryTarget(
      this.serializer,
      queryToTarget(queryBundleData.query)
    );
    const bundledQuery = {
      parent: queryBundleData.parent,
      structuredQuery: queryTarget.queryTarget.structuredQuery
    };
    this.namedQueries.set(name, {
      name,
      bundledQuery,
      readTime: toTimestamp(this.serializer, latestReadTime)
    });
  }

  /**
   * Convert data from a DocumentSnapshot into the serialized form within a bundle.
   * @private
   * @internal
   * @param docBundleData a DocumentSnapshotBundleData containing the data required to
   * serialize a document.
   */
  private toBundleDocument(
    docBundleData: DocumentSnapshotBundleData
  ): ProtoDocument {
    // TODO handle documents that have mutations
    debugAssert(
      !docBundleData.documentData.hasLocalMutations,
      "Can't serialize documents with mutations."
    );

    // a parse context is typically used for validating and parsing user data, but in this
    // case we are using it internally to convert DocumentData to Proto3 JSON
    const context = this.userDataReader.createContext(
      UserDataSource.ArrayArgument,
      'internal toBundledDocument'
    );
    const proto3Fields = parseObject(docBundleData.documentData, context);

    return {
      name: toName(this.serializer, docBundleData.documentKey),
      fields: proto3Fields.mapValue.fields,
      updateTime: toTimestamp(this.serializer, docBundleData.versionTime),
      createTime: toTimestamp(this.serializer, docBundleData.createdTime)
    };
  }

  /**
   * Converts a IBundleElement to a Buffer whose content is the length prefixed JSON representation
   * of the element.
   * @private
   * @internal
   * @param bundleElement A ProtoBundleElement that is expected to be Proto3 JSON compatible.
   */
  private lengthPrefixedString(bundleElement: ProtoBundleElement): string {
    const str = JSON.stringify(bundleElement);
    // TODO: it's not ideal to have to re-encode all of these strings multiple times
    //       It may be more performant to return a UInt8Array that is concatenated to other
    //       UInt8Arrays instead of returning and concatenating strings and then
    //       converting the full string to UInt8Array.
    const l = encoder.encode(str).byteLength;
    return `${l}${str}`;
  }

  /**
   * Construct a serialized string containing document and query information that has previously
   * been added to the BundleBuilder through the addBundleDocument and addBundleQuery methods.
   * @internal
   */
  build(): string {
    let bundleString = '';

    for (const namedQuery of this.namedQueries.values()) {
      bundleString += this.lengthPrefixedString({ namedQuery });
    }

    for (const bundledDocument of this.documents.values()) {
      const documentMetadata: ProtoBundledDocumentMetadata =
        bundledDocument.metadata;

      bundleString += this.lengthPrefixedString({ documentMetadata });
      // Write to the bundle if document exists.
      const document = bundledDocument.document;
      if (document) {
        bundleString += this.lengthPrefixedString({ document });
      }
    }

    const metadata: ProtoBundleMetadata = {
      id: this.bundleId,
      createTime: toTimestamp(this.serializer, this.latestReadTime),
      version: BUNDLE_VERSION,
      totalDocuments: this.documents.size,
      // TODO: it's not ideal to have to re-encode all of these strings multiple times
      totalBytes: encoder.encode(bundleString).length
    };
    // Prepends the metadata element to the bundleBuffer: `bundleBuffer` is the second argument to `Buffer.concat`.
    bundleString = this.lengthPrefixedString({ metadata }) + bundleString;

    return bundleString;
  }
}

/**
 * Interface for an object that contains data required to bundle a DocumentSnapshot.
 * @internal
 */
export interface DocumentSnapshotBundleData {
  documentData: DocumentData;
  documentKey: DocumentKey;
  documentPath: string;
  documentExists: boolean;
  createdTime: Timestamp;
  readTime?: Timestamp;
  versionTime: Timestamp;
}

/**
 * Interface for an object that contains data required to bundle a QuerySnapshot.
 * @internal
 */
export interface QuerySnapshotBundleData {
  query: Query;
  parent: string;
  docBundleDataArray: DocumentSnapshotBundleData[];
}

/**
 * Convenient class to hold both the metadata and the actual content of a document to be bundled.
 * @private
 * @internal
 */
class BundledDocument {
  constructor(
    readonly metadata: ProtoBundledDocumentMetadata,
    readonly document?: Document
  ) {}
}
