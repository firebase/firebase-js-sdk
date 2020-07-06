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

import * as firestore from '@firebase/firestore-types';
import { Query } from './query';
import { SnapshotVersion } from './snapshot_version';
import {
  fromDocument,
  fromName,
  fromVersion,
  JsonProtoSerializer
} from '../remote/serializer';
import * as bundleProto from '../protos/firestore_bundle_proto';
import * as api from '../protos/firestore_proto_api';
import { DocumentKey } from '../model/document_key';
import { MaybeDocument, NoDocument } from '../model/document';
import { debugAssert } from '../util/assert';
import {
  applyBundleDocuments,
  LocalStore,
  saveNamedQuery
} from '../local/local_store';
import { SizedBundleElement } from '../util/bundle_reader';
import { MaybeDocumentMap } from '../model/collections';
import { BundleMetadata } from '../protos/firestore_bundle_proto';

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
interface BundledDocument {
  metadata: bundleProto.BundledDocumentMetadata;
  document: api.Document | undefined;
}

/**
 * An array of `BundledDocument`.
 */
export type BundledDocuments = BundledDocument[];

/**
 * Helper to convert objects from bundles to model objects in the SDK.
 */
export class BundleConverter {
  constructor(private serializer: JsonProtoSerializer) {}

  toDocumentKey(name: string): DocumentKey {
    return fromName(this.serializer, name);
  }

  /**
   * Converts a BundleDocument to a MaybeDocument.
   */
  toMaybeDocument(bundledDoc: BundledDocument): MaybeDocument {
    if (bundledDoc.metadata.exists) {
      debugAssert(
        !!bundledDoc.document,
        'Document is undefined when metadata.exist is true.'
      );
      return fromDocument(this.serializer, bundledDoc.document!, false);
    } else {
      return new NoDocument(
        this.toDocumentKey(bundledDoc.metadata.name!),
        this.toSnapshotVersion(bundledDoc.metadata.readTime!)
      );
    }
  }

  toSnapshotVersion(time: api.Timestamp): SnapshotVersion {
    return fromVersion(time);
  }
}

/**
 * Returns a `LoadBundleTaskProgress` representing the initial progress of
 * loading a bundle.
 */
export function initialProgress(
  metadata: BundleMetadata
): firestore.LoadBundleTaskProgress {
  return {
    taskState: 'Running',
    documentsLoaded: 0,
    bytesLoaded: 0,
    totalDocuments: metadata.totalDocuments!,
    totalBytes: metadata.totalBytes!
  };
}

/**
 * Returns a `LoadBundleTaskProgress` representing the progress if the bundle
 * is already loaded, and we are skipping current loading.
 */
export function skipLoadingProgress(
  metadata: BundleMetadata
): firestore.LoadBundleTaskProgress {
  return {
    taskState: 'Success',
    documentsLoaded: metadata.totalDocuments!,
    bytesLoaded: metadata.totalBytes!,
    totalDocuments: metadata.totalDocuments!,
    totalBytes: metadata.totalBytes!
  };
}

export class LoadResult {
  constructor(
    readonly progress: firestore.LoadBundleTaskProgress,
    readonly changedDocs?: MaybeDocumentMap
  ) {}
}

/**
 * A class to process the elements from a bundle, load them into local
 * storage and provide progress update while loading.
 */
export class BundleLoader {
  /** The current progress of loading */
  private progress: firestore.LoadBundleTaskProgress;
  /**
   * The threshold multiplier used to determine whether enough elements are
   * batched to be loaded, and a progress update is needed.
   *
   * Applies to both `documentsBuffered` and `bytesBuffered`, triggers storage
   * update and reports progress when either of them cross the threshold.
   */
  private thresholdMultiplier = 0.01;
  /** Batched queries to be saved into storage */
  private queries: bundleProto.NamedQuery[] = [];
  /** Batched documents to be saved into storage */
  private documents: BundledDocuments = [];
  /**
   * A BundleDocumentMetadata is added to the loader, it is saved here while
   * we wait for the actual document.
   */
  private unpairedDocumentMetadata: bundleProto.BundledDocumentMetadata | null = null;

  constructor(
    private metadata: bundleProto.BundleMetadata,
    private localStore: LocalStore
  ) {
    this.progress = initialProgress(metadata);
  }

  /**
   * Adds an element from the bundle to the loader.
   *
   * If adding this element leads to actually saving the batched elements into
   * storage, the returned promise will resolve to a `LoadResult`, otherwise
   * it will resolve to null.
   */
  addSizedElement(
    element: SizedBundleElement
  ): firestore.LoadBundleTaskProgress | null {
    debugAssert(!element.isBundleMetadata(), 'Unexpected bundle metadata.');

    this.progress.bytesLoaded += element.byteLength;
    if (element.payload.namedQuery) {
      this.queries.push(element.payload.namedQuery);
    }

    if (element.payload.documentMetadata) {
      if (element.payload.documentMetadata.exists) {
        this.unpairedDocumentMetadata = element.payload.documentMetadata;
      } else {
        this.documents.push({
          metadata: element.payload.documentMetadata,
          document: undefined
        });
        this.progress.documentsLoaded += 1;
      }
    }

    if (element.payload.document) {
      debugAssert(
        !!this.unpairedDocumentMetadata,
        'Unexpected document when no pairing metadata is found'
      );
      this.documents.push({
        metadata: this.unpairedDocumentMetadata!,
        document: element.payload.document
      });
      this.progress.documentsLoaded += 1;
      this.unpairedDocumentMetadata = null;
    }

    // Loading a document metadata will not update progress.
    if (this.unpairedDocumentMetadata) {
      return null;
    }

    return { ...this.progress };
  }

  /**
   * Update the progress to 'Success' and return the updated progress.
   */
  async complete(): Promise<LoadResult> {
    debugAssert(
      !this.unpairedDocumentMetadata,
      'Unexpected document when no pairing metadata is found'
    );

    for (const q of this.queries) {
      await saveNamedQuery(this.localStore, q);
    }

    let changedDocs;
    if (this.documents.length > 0) {
      changedDocs = await applyBundleDocuments(this.localStore, this.documents);
    }

    this.progress.taskState = 'Success';
    return new LoadResult({ ...this.progress }, changedDocs);
  }
}
