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


import { Document } from '../protos/firestore_proto_api';
import {
  BundleElement as ProtoBundleElement,
  BundleMetadata as ProtoBundleMetadata,
  BundledDocumentMetadata as ProtoBundledDocumentMetadata,
  NamedQuery as ProtoNamedQuery,
} from '../protos/firestore_bundle_proto';

import { DocumentSnapshot } from '../lite-api/snapshot';
import { QuerySnapshot } from '../lite-api/snapshot';
import { Timestamp } from '../lite-api/timestamp';
import { queryToTarget } from '../../src/core/query';

import {
  JsonProtoSerializer,
  toDocument,
  toName,
  toQueryTarget,
  toTimestamp,
  toVersion,
} from '../../src/remote/serializer';

import {
  invalidArgumentMessage,
  validateMaxNumberOfArguments,
  validateMinNumberOfArguments,
  validateString,
} from './bundle_builder_validation_utils';
import { DatabaseId } from '../core/database_info';



//import api = google.firestore.v1;


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

  constructor(readonly bundleId: string) {}

  add(databaseId: DatabaseId, documentSnapshot: DocumentSnapshot): BundleBuilder;
  add(databaseId: DatabaseId, queryName: string, querySnapshot: QuerySnapshot): BundleBuilder;

  /**
   * Adds a Firestore document snapshot or query snapshot to the bundle.
   * Both the documents data and the query read time will be included in the bundle.
   *
   * @param {DocumentSnapshot | string} documentOrName A document snapshot to add or a name of a query.
   * @param {Query=} querySnapshot A query snapshot to add to the bundle, if provided.
   * @returns {BundleBuilder} This instance.
   *
   * @example
   * ```
   * const bundle = firestore.bundle('data-bundle');
   * const docSnapshot = await firestore.doc('abc/123').get();
   * const querySnapshot = await firestore.collection('coll').get();
   *
   * const bundleBuffer = bundle.add(docSnapshot) // Add a document
   *                            .add('coll-query', querySnapshot) // Add a named query.
   *                            .build()
   * // Save `bundleBuffer` to CDN or stream it to clients.
   * ```
   */
  add(
    databaseId: DatabaseId,
    documentOrName: DocumentSnapshot | string,
    querySnapshot?: QuerySnapshot
  ): BundleBuilder {
    // eslint-disable-next-line prefer-rest-params
    validateMinNumberOfArguments('BundleBuilder.add', arguments, 1);
    // eslint-disable-next-line prefer-rest-params
    validateMaxNumberOfArguments('BundleBuilder.add', arguments, 2);
    if (arguments.length === 1) {
      validateDocumentSnapshot('documentOrName', documentOrName);
      this.addBundledDocument(databaseId, documentOrName as DocumentSnapshot);
    } else {
      validateString('documentOrName', documentOrName);
      validateQuerySnapshot('querySnapshot', querySnapshot);
      this.addNamedQuery(databaseId, documentOrName as string, querySnapshot!);
    }
    return this;
  }
  
  private addBundledDocument(databaseId: DatabaseId, snap: DocumentSnapshot, queryName?: string): void {
    // TODO:  is this a valid shortcut out?
    if(!snap._document || !snap._document.isValidDocument()) {
      return;
    }
    const originalDocument = this.documents.get(snap.ref.path);
    const originalQueries = originalDocument?.metadata.queries;
    const mutableCopy = snap._document.mutableCopy();

    // Update with document built from `snap` because it is newer.
    const snapReadTime = snap.readTime;
    if ( !originalDocument ||
        (!snapReadTime && !originalDocument.metadata.readTime) ||
        (snapReadTime && originalDocument.metadata.readTime! < snapReadTime)
    ) {
      const serializer = new JsonProtoSerializer(databaseId, /*useProto3Json=*/ false);
      
      this.documents.set(snap.ref.path, {
        document: snap._document.isFoundDocument() ? toDocument(serializer, mutableCopy) : undefined,
        metadata: {
          name: toName(serializer, mutableCopy.key),
          readTime: snapReadTime,
          exists: snap.exists(),
        },
      });
    }

    // Update `queries` to include both original and `queryName`.
    const newDocument = this.documents.get(snap.ref.path)!;
    newDocument.metadata.queries = originalQueries || [];
    if (queryName) {
      newDocument.metadata.queries!.push(queryName);
    }

    const readTime = snap.readTime;
    if (readTime && readTime > this.latestReadTime) {
      this.latestReadTime = readTime;
    }
  }

  private addNamedQuery(databaseId: DatabaseId, name: string, querySnap: QuerySnapshot): void {
    if (this.namedQueries.has(name)) {
      throw new Error(`Query name conflict: ${name} has already been added.`);
    }

    const serializer = new JsonProtoSerializer(databaseId, /*useProto3Json=*/ false);
    const queryTarget = toQueryTarget(serializer, queryToTarget(querySnap.query._query));

    for (const snap of querySnap.docs) {
      this.addBundledDocument(databaseId, snap, name);
      const readTime = snap.readTime;
      if (readTime && readTime > this.latestReadTime) {
        this.latestReadTime = readTime;
      }
    }
  }

  /**
   * Converts a IBundleElement to a Buffer whose content is the length prefixed JSON representation
   * of the element.
   * @private
   * @internal
   */
  private elementToLengthPrefixedBuffer(
    bundleElement: ProtoBundleElement
  ): Buffer {
    // Convert to a valid proto message object then take its JSON representation.
    // This take cares of stuff like converting internal byte array fields
    // to Base64 encodings.
    // We lazy-load the Proto file to reduce cold-start times.
    const message = require('../protos/firestore_v1_proto_api')
      .firestore.BundleElement.fromObject(bundleElement)
      .toJSON();
    const buffer = Buffer.from(JSON.stringify(message), 'utf-8');
    const lengthBuffer = Buffer.from(buffer.length.toString());
    return Buffer.concat([lengthBuffer, buffer]);
  }

  build(): Buffer {
    
    let bundleBuffer = Buffer.alloc(0);

    for (const namedQuery of this.namedQueries.values()) {
      bundleBuffer = Buffer.concat([
        bundleBuffer,
        this.elementToLengthPrefixedBuffer({namedQuery}),
      ]);
    }

    for (const bundledDocument of this.documents.values()) {
      const documentMetadata: ProtoBundledDocumentMetadata =
        bundledDocument.metadata;

      bundleBuffer = Buffer.concat([
        bundleBuffer,
        this.elementToLengthPrefixedBuffer({documentMetadata}),
      ]);
      // Write to the bundle if document exists.
      const document = bundledDocument.document;
      if (document) {
        bundleBuffer = Buffer.concat([
          bundleBuffer,
          this.elementToLengthPrefixedBuffer({document}),
        ]);
      }
    }

    const metadata: ProtoBundleMetadata = {
      id: this.bundleId,
      createTime: this.latestReadTime.toProto().timestampValue,
      version: BUNDLE_VERSION,
      totalDocuments: this.documents.size,
      totalBytes: bundleBuffer.length,
    };
    // Prepends the metadata element to the bundleBuffer: `bundleBuffer` is the second argument to `Buffer.concat`.
    bundleBuffer = Buffer.concat([
      this.elementToLengthPrefixedBuffer({metadata}),
      bundleBuffer,
    ]);
    return bundleBuffer;
  }
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

/**
 * Validates that 'value' is DocumentSnapshot.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @param value The input to validate.
 */
function validateDocumentSnapshot(arg: string | number, value: unknown): void {
  if (!(value instanceof DocumentSnapshot)) {
    throw new Error(invalidArgumentMessage(arg, 'DocumentSnapshot'));
  }
}

/**
 * Validates that 'value' is QuerySnapshot.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @param value The input to validate.
 */
function validateQuerySnapshot(arg: string | number, value: unknown): void {
  if (!(value instanceof QuerySnapshot)) {
    throw new Error(invalidArgumentMessage(arg, 'QuerySnapshot'));
  }
}