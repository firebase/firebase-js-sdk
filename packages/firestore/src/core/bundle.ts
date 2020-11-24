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
import { SnapshotVersion } from './snapshot_version';
import {
  fromDocument,
  fromName,
  fromVersion,
  JsonProtoSerializer
} from '../remote/serializer';
import * as bundleProto from '../protos/firestore_bundle_proto';
import { BundleMetadata } from '../protos/firestore_bundle_proto';
import * as api from '../protos/firestore_proto_api';
import { DocumentKey } from '../model/document_key';
import { MaybeDocument, NoDocument } from '../model/document';
import { debugAssert, debugCast } from '../util/assert';
import { LocalStore } from '../local/local_store';
import { SizedBundleElement, BundleReader } from '../util/bundle_reader';
import {
  documentKeySet,
  DocumentKeySet,
  MaybeDocumentMap
} from '../model/collections';
import {
  FirestoreClient,
  getLocalStore,
  getSyncEngine
} from './firestore_client';
import { LoadBundleTask } from '../api/bundle';
import { newSerializer, newTextEncoder } from '../platform/serializer';
import { toByteStreamReader } from '../platform/byte_stream_reader';
import {
  emitNewSnapsAndNotifyLocalStore,
  SyncEngine,
  SyncEngineImpl
} from './sync_engine';
import { logWarn } from '../util/log';
import { LOG_TAG } from '../../lite/src/api/components';
import {
  applyBundleDocuments,
  getNamedQuery,
  hasNewerBundle,
  saveBundle,
  saveNamedQuery
} from '../local/local_store_bundle';
import { NamedQuery } from './bundle_types';
/**
 * Represents a bundled document, including the metadata and the document
 * itself, if it exists.
 */
interface BundledDocument {
  metadata: bundleProto.BundledDocumentMetadata;
  document?: api.Document;
}

/**
 * An array of `BundledDocument`.
 */
export type BundledDocuments = BundledDocument[];

/**
 * Helper to convert objects from bundles to model objects in the SDK.
 */
export class BundleConverter {
  constructor(private readonly serializer: JsonProtoSerializer) {}

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
function bundleInitialProgress(
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
 * Returns a `LoadBundleTaskProgress` representing the progress that the loading
 * has succeeded.
 */
function bundleSuccessProgress(
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

class BundleLoadResult {
  constructor(
    readonly progress: firestore.LoadBundleTaskProgress,
    readonly changedDocs: MaybeDocumentMap
  ) {}
}

/**
 * A class to process the elements from a bundle, load them into local
 * storage and provide progress update while loading.
 */
class BundleLoader {
  /** The current progress of loading */
  private progress: firestore.LoadBundleTaskProgress;
  /** Batched queries to be saved into storage */
  private queries: bundleProto.NamedQuery[] = [];
  /** Batched documents to be saved into storage */
  private documents: BundledDocuments = [];

  constructor(
    private bundleMetadata: bundleProto.BundleMetadata,
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
  addSizedElement(
    element: SizedBundleElement
  ): firestore.LoadBundleTaskProgress | null {
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
    const bundleConverter = new BundleConverter(this.serializer);
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
      'Bundled documents ends with a document metadata and missing document.'
    );
    debugAssert(!!this.bundleMetadata.id, 'Bundle ID must be set.');

    const changedDocuments = await applyBundleDocuments(
      this.localStore,
      this.documents,
      this.bundleMetadata.id!
    );

    const queryDocumentMap = this.getQueryDocumentMapping(this.documents);

    for (const q of this.queries) {
      await saveNamedQuery(this.localStore, q, queryDocumentMap.get(q.name!));
    }

    this.progress.taskState = 'Success';
    return new BundleLoadResult({ ...this.progress }, changedDocuments);
  }
}

export async function firestoreClientLoadBundle(
  client: FirestoreClient,
  data: ReadableStream<Uint8Array> | ArrayBuffer | string,
  resultTask: LoadBundleTask
): Promise<void> {
  const reader = createBundleReader(
    data,
    newSerializer((await client.getConfiguration()).databaseInfo.databaseId)
  );
  client.asyncQueue.enqueueAndForget(async () => {
    syncEngineLoadBundle(await getSyncEngine(client), reader, resultTask);
  });
}

export function firestoreClientGetNamedQuery(
  client: FirestoreClient,
  queryName: string
): Promise<NamedQuery | undefined> {
  return client.asyncQueue.enqueue(async () =>
    getNamedQuery(await getLocalStore(client), queryName)
  );
}

function createBundleReader(
  data: ReadableStream<Uint8Array> | ArrayBuffer | string,
  serializer: JsonProtoSerializer
): BundleReader {
  let content: ReadableStream<Uint8Array> | ArrayBuffer;
  if (typeof data === 'string') {
    content = newTextEncoder().encode(data);
  } else {
    content = data;
  }
  return new BundleReader(toByteStreamReader(content), serializer);
}

/**
 * Loads a Firestore bundle into the SDK. The returned promise resolves when
 * the bundle finished loading.
 *
 * @param bundleReader Bundle to load into the SDK.
 * @param task LoadBundleTask used to update the loading progress to public API.
 */
export function syncEngineLoadBundle(
  syncEngine: SyncEngine,
  bundleReader: BundleReader,
  task: LoadBundleTask
): void {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  loadBundleImpl(syncEngineImpl, bundleReader, task).then(() => {
    syncEngineImpl.sharedClientState.notifyBundleLoaded();
  });
}

async function loadBundleImpl(
  syncEngine: SyncEngineImpl,
  reader: BundleReader,
  task: LoadBundleTask
): Promise<void> {
  try {
    const metadata = await reader.getMetadata();
    const skip = await hasNewerBundle(syncEngine.localStore, metadata);
    if (skip) {
      await reader.close();
      task._completeWith(bundleSuccessProgress(metadata));
      return;
    }

    task._updateProgress(bundleInitialProgress(metadata));

    const loader = new BundleLoader(
      metadata,
      syncEngine.localStore,
      reader.serializer
    );
    let element = await reader.nextElement();
    while (element) {
      debugAssert(
        !element.payload.metadata,
        'Unexpected BundleMetadata element.'
      );
      const progress = await loader.addSizedElement(element);
      if (progress) {
        task._updateProgress(progress);
      }

      element = await reader.nextElement();
    }

    const result = await loader.complete();
    // TODO(b/160876443): This currently raises snapshots with
    // `fromCache=false` if users already listen to some queries and bundles
    // has newer version.
    await emitNewSnapsAndNotifyLocalStore(
      syncEngine,
      result.changedDocs,
      /* remoteEvent */ undefined
    );

    // Save metadata, so loading the same bundle will skip.
    await saveBundle(syncEngine.localStore, metadata);
    task._completeWith(result.progress);
  } catch (e) {
    logWarn(LOG_TAG, `Loading bundle failed with ${e}`);
    task._failWith(e);
  }
}
