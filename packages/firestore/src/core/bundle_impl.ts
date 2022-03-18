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

import { LoadBundleTaskProgress } from '@firebase/firestore-types';

import { LocalStore } from '../local/local_store';
import {
  localStoreApplyBundledDocuments,
  localStoreSaveNamedQuery
} from '../local/local_store_impl';
import { documentKeySet, DocumentKeySet } from '../model/collections';
import { MutableDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { ResourcePath } from '../model/path';
import {
  BundleMetadata as ProtoBundleMetadata,
  NamedQuery as ProtoNamedQuery
} from '../protos/firestore_bundle_proto';
import { Timestamp as ApiTimestamp } from '../protos/firestore_proto_api';
import {
  fromDocument,
  fromName,
  fromVersion,
  JsonProtoSerializer
} from '../remote/serializer';
import { debugAssert } from '../util/assert';
import { SizedBundleElement } from '../util/bundle_reader';

import {
  BundleConverter,
  BundledDocument,
  BundledDocuments,
  BundleLoadResult
} from './bundle';
import { SnapshotVersion } from './snapshot_version';

/**
 * Helper to convert objects from bundles to model objects in the SDK.
 */
export class BundleConverterImpl implements BundleConverter {
  constructor(private readonly serializer: JsonProtoSerializer) {}

  toDocumentKey(name: string): DocumentKey {
    return fromName(this.serializer, name);
  }

  /**
   * Converts a BundleDocument to a MutableDocument.
   */
  toMutableDocument(bundledDoc: BundledDocument): MutableDocument {
    if (bundledDoc.metadata.exists) {
      debugAssert(
        !!bundledDoc.document,
        'Document is undefined when metadata.exist is true.'
      );
      return fromDocument(this.serializer, bundledDoc.document!, false);
    } else {
      return MutableDocument.newNoDocument(
        this.toDocumentKey(bundledDoc.metadata.name!),
        this.toSnapshotVersion(bundledDoc.metadata.readTime!)
      );
    }
  }

  toSnapshotVersion(time: ApiTimestamp): SnapshotVersion {
    return fromVersion(time);
  }
}

/**
 * A class to process the elements from a bundle, load them into local
 * storage and provide progress update while loading.
 */
export class BundleLoader {
  /** The current progress of loading */
  private progress: LoadBundleTaskProgress;
  /** Batched queries to be saved into storage */
  private queries: ProtoNamedQuery[] = [];
  /** Batched documents to be saved into storage */
  private documents: BundledDocuments = [];
  /** The collection groups affected by this bundle. */
  private collectionGroups = new Set<string>();

  constructor(
    private bundleMetadata: ProtoBundleMetadata,
    private localStore: LocalStore,
    private serializer: JsonProtoSerializer
  ) {
    this.progress = bundleInitialProgress(bundleMetadata);
  }

  /**
   * Adds an element from the bundle to the loader.
   *
   * Returns a new progress if adding the element leads to a new progress,
   * otherwise returns null.
   */
  addSizedElement(element: SizedBundleElement): LoadBundleTaskProgress | null {
    debugAssert(!element.isBundleMetadata(), 'Unexpected bundle metadata.');

    this.progress.bytesLoaded += element.byteLength;

    let documentsLoaded = this.progress.documentsLoaded;

    if (element.payload.namedQuery) {
      this.queries.push(element.payload.namedQuery);
    } else if (element.payload.documentMetadata) {
      this.documents.push({ metadata: element.payload.documentMetadata });
      if (!element.payload.documentMetadata.exists) {
        ++documentsLoaded;
      }
      const path = ResourcePath.fromString(
        element.payload.documentMetadata.name!
      );
      debugAssert(
        path.length >= 2,
        'The document name does not point to a document.'
      );
      this.collectionGroups.add(path.get(path.length - 2));
    } else if (element.payload.document) {
      debugAssert(
        this.documents.length > 0 &&
          this.documents[this.documents.length - 1].metadata.name ===
            element.payload.document.name,
        'The document being added does not match the stored metadata.'
      );
      this.documents[this.documents.length - 1].document =
        element.payload.document;
      ++documentsLoaded;
    }

    if (documentsLoaded !== this.progress.documentsLoaded) {
      this.progress.documentsLoaded = documentsLoaded;
      return { ...this.progress };
    }

    return null;
  }

  private getQueryDocumentMapping(
    documents: BundledDocuments
  ): Map<string, DocumentKeySet> {
    const queryDocumentMap = new Map<string, DocumentKeySet>();
    const bundleConverter = new BundleConverterImpl(this.serializer);
    for (const bundleDoc of documents) {
      if (bundleDoc.metadata.queries) {
        const documentKey = bundleConverter.toDocumentKey(
          bundleDoc.metadata.name!
        );
        for (const queryName of bundleDoc.metadata.queries) {
          const documentKeys = (
            queryDocumentMap.get(queryName) || documentKeySet()
          ).add(documentKey);
          queryDocumentMap.set(queryName, documentKeys);
        }
      }
    }

    return queryDocumentMap;
  }

  /**
   * Update the progress to 'Success' and return the updated progress.
   */
  async complete(): Promise<BundleLoadResult> {
    debugAssert(
      this.documents[this.documents.length - 1]?.metadata.exists !== true ||
        !!this.documents[this.documents.length - 1].document,
      'Bundled documents end with a document metadata element instead of a document.'
    );
    debugAssert(!!this.bundleMetadata.id, 'Bundle ID must be set.');

    const changedDocs = await localStoreApplyBundledDocuments(
      this.localStore,
      new BundleConverterImpl(this.serializer),
      this.documents,
      this.bundleMetadata.id!
    );

    const queryDocumentMap = this.getQueryDocumentMapping(this.documents);

    for (const q of this.queries) {
      await localStoreSaveNamedQuery(
        this.localStore,
        q,
        queryDocumentMap.get(q.name!)
      );
    }

    this.progress.taskState = 'Success';
    return {
      progress: this.progress,
      changedCollectionGroups: this.collectionGroups,
      changedDocs
    };
  }
}

/**
 * Returns a `LoadBundleTaskProgress` representing the initial progress of
 * loading a bundle.
 */
export function bundleInitialProgress(
  metadata: ProtoBundleMetadata
): LoadBundleTaskProgress {
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
): LoadBundleTaskProgress {
  return {
    taskState: 'Success',
    documentsLoaded: metadata.totalDocuments!,
    bytesLoaded: metadata.totalBytes!,
    totalDocuments: metadata.totalDocuments!,
    totalBytes: metadata.totalBytes!
  };
}
