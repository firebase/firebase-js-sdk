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

import { queryToTarget } from '../../src/core/query';
import {
  JsonProtoSerializer,
  toName,
  toQueryTarget,
  toTimestamp
} from '../../src/remote/serializer';
import { encoder } from '../../test/unit/util/bundle_data';
import { Firestore } from '../api/database';
import { ExpUserDataWriter } from '../api/reference_impl';
import { DatabaseId } from '../core/database_info';
import { DocumentSnapshot, QuerySnapshot } from '../lite-api/snapshot';
import { Timestamp } from '../lite-api/timestamp';
import {
  parseObject,
  UserDataReader,
  UserDataSource
} from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import { MutableDocument } from '../model/document';
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

  private databaseId: DatabaseId;

  private readonly serializer: JsonProtoSerializer;
  private readonly userDataReader: UserDataReader;
  private readonly userDataWriter: AbstractUserDataWriter;

  constructor(private firestore: Firestore, readonly bundleId: string) {
    this.databaseId = firestore._databaseId;

    // useProto3Json is true because the objects will be serialized to JSON string
    // before being written to the bundle buffer.
    this.serializer = new JsonProtoSerializer(
      this.databaseId,
      /*useProto3Json=*/ true
    );

    this.userDataWriter = new ExpUserDataWriter(firestore);
    this.userDataReader = new UserDataReader(
      this.databaseId,
      true,
      this.serializer
    );
  }

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
    documentOrName: DocumentSnapshot | string,
    querySnapshot?: QuerySnapshot
  ): BundleBuilder {
    if (arguments.length < 1 || arguments.length > 2) {
      throw new Error(
        'Function BundleBuilder.add() requires 1 or 2 arguments.'
      );
    }
    if (arguments.length === 1) {
      validateDocumentSnapshot('documentOrName', documentOrName);
      this.addBundledDocument(documentOrName as DocumentSnapshot);
    } else {
      validateString('documentOrName', documentOrName);
      validateQuerySnapshot('querySnapshot', querySnapshot);
      this.addNamedQuery(documentOrName as string, querySnapshot!);
    }
    return this;
  }

  toBundleDocument(document: MutableDocument): ProtoDocument {
    // TODO handle documents that have mutations
    debugAssert(
      !document.hasLocalMutations,
      "Can't serialize documents with mutations."
    );

    // Convert document fields proto to DocumentData and then back
    // to Proto3 JSON objects. This is the same approach used in
    // bundling in the nodejs-firestore SDK. It may not be the most
    // performant approach.
    const documentData = this.userDataWriter.convertObjectMap(
      document.data.value.mapValue.fields,
      'previous'
    );
    // a parse context is typically used for validating and parsing user data, but in this
    // case we are using it internally to convert DocumentData to Proto3 JSON
    const context = this.userDataReader.createContext(
      UserDataSource.ArrayArgument,
      'internal toBundledDocument'
    );
    const proto3Fields = parseObject(documentData, context);

    return {
      name: toName(this.serializer, document.key),
      fields: proto3Fields.mapValue.fields,
      updateTime: toTimestamp(this.serializer, document.version.toTimestamp()),
      createTime: toTimestamp(
        this.serializer,
        document.createTime.toTimestamp()
      )
    };
  }

  private addBundledDocument(snap: DocumentSnapshot, queryName?: string): void {
    if (
      !snap._document ||
      !snap._document.isValidDocument() ||
      !snap._document.isFoundDocument()
    ) {
      return;
    }
    const originalDocument = this.documents.get(snap.ref.path);
    const originalQueries = originalDocument?.metadata.queries;
    const mutableCopy = snap._document.mutableCopy();

    // Update with document built from `snap` because it is newer.
    const snapReadTime = snap.readTime;
    if (
      !originalDocument ||
      (!snapReadTime && !originalDocument.metadata.readTime) ||
      (snapReadTime && originalDocument.metadata.readTime! < snapReadTime)
    ) {
      this.documents.set(snap.ref.path, {
        document: this.toBundleDocument(mutableCopy),
        metadata: {
          name: toName(this.serializer, mutableCopy.key),
          readTime: !!snapReadTime
            ? toTimestamp(this.serializer, snapReadTime)
            : undefined,
          exists: snap.exists()
        }
      });
    }

    // Update `queries` to include both original and `queryName`.
    const newDocument = this.documents.get(snap.ref.path)!;
    newDocument.metadata.queries = originalQueries || [];
    if (queryName) {
      newDocument.metadata.queries!.push(queryName);
    }

    if (snapReadTime && snapReadTime > this.latestReadTime) {
      this.latestReadTime = snapReadTime;
    }
  }

  // TODO: remove this since we're not planning to serialize named queries.
  private addNamedQuery(name: string, querySnap: QuerySnapshot): void {
    if (this.namedQueries.has(name)) {
      throw new Error(`Query name conflict: ${name} has already been added.`);
    }
    const queryTarget = toQueryTarget(
      this.serializer,
      queryToTarget(querySnap.query._query)
    );

    let latestReadTime = new Timestamp(0, 0);
    for (const snap of querySnap.docs) {
      const readTime = snap.readTime;
      if (readTime && readTime > latestReadTime) {
        latestReadTime = readTime;
      }
      this.addBundledDocument(snap, name);
    }

    const bundledQuery = {
      parent: queryTarget.parent.canonicalString(),
      structuredQuery: queryTarget.queryTarget.structuredQuery,
      limitType: null
    };

    this.namedQueries.set(name, {
      name,
      bundledQuery,
      readTime: toTimestamp(this.serializer, latestReadTime)
    });
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

  build(): Uint8Array {
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

    // TODO: it's not ideal to have to re-encode all of these strings multiple times
    //       the implementation in nodejs-firestore concatenates Buffers instead of
    //       concatenating strings.
    return encoder.encode(bundleString);
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

/**
 * Validates that 'value' is a string.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @param value The input to validate.
 * @param options Options that specify whether the string can be omitted.
 */
export function validateString(arg: string | number, value: unknown): void {
  if (typeof value !== 'string') {
    throw new Error(invalidArgumentMessage(arg, 'string'));
  }
}

/**
 * Generates an error message to use with invalid arguments.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @param expectedType The expected input type.
 */
export function invalidArgumentMessage(
  arg: string | number,
  expectedType: string
): string {
  return `${formatArgumentName(arg)} is not a valid ${expectedType}.`;
}

/**
 * Creates a descriptive name for the provided argument name or index.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @return Either the argument name or its index description.
 */
function formatArgumentName(arg: string | number): string {
  return typeof arg === 'string'
    ? `Value for argument "${arg}"`
    : `Element at index ${arg}`;
}
