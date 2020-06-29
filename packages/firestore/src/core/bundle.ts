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
import { Deferred } from '../util/promise';
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
 * Returns a `LoadBundleTaskProgress` representing the first progress of
 * loading a bundle.
 */
export function initialProgress(
  state: firestore.TaskState,
  metadata: BundleMetadata
): firestore.LoadBundleTaskProgress {
  return {
    taskState: state,
    documentsLoaded: state === 'Success' ? metadata.totalDocuments! : 0,
    bytesLoaded: state === 'Success' ? metadata.totalBytes! : 0,
    totalDocuments: metadata.totalDocuments!,
    totalBytes: metadata.totalBytes!
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class LoadBundleTaskImpl implements firestore.LoadBundleTask {
  private progressResolver = new Deferred<any>();
  private progressNext?: (progress: firestore.LoadBundleTaskProgress) => any;
  private progressError?: (err: Error) => any;
  private progressComplete?: (
    progress?: firestore.LoadBundleTaskProgress
  ) => any;

  private promiseResolver = new Deferred<any>();
  private promiseFulfilled?: (
    progress: firestore.LoadBundleTaskProgress
  ) => any;
  private promiseRejected?: (err: Error) => any;

  private lastProgress: firestore.LoadBundleTaskProgress = {
    taskState: 'Running',
    totalBytes: 0,
    totalDocuments: 0,
    bytesLoaded: 0,
    documentsLoaded: 0
  };

  onProgress(
    next?: (progress: firestore.LoadBundleTaskProgress) => any,
    error?: (err: Error) => any,
    complete?: (progress?: firestore.LoadBundleTaskProgress) => void
  ): Promise<any> {
    this.progressNext = next;
    this.progressError = error;
    this.progressComplete = complete;
    return this.progressResolver.promise;
  }

  catch(onRejected: (a: Error) => any): Promise<any> {
    this.promiseRejected = onRejected;
    return this.promiseResolver.promise;
  }

  then(
    onFulfilled?: (a: firestore.LoadBundleTaskProgress) => any,
    onRejected?: (a: Error) => any
  ): Promise<any> {
    this.promiseFulfilled = onFulfilled;
    this.promiseRejected = onRejected;
    return this.promiseResolver.promise;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /**
   * Notifies the completion of loading a bundle, with a provided
   * `LoadBundleTaskProgress` object.
   */
  completeWith(progress: firestore.LoadBundleTaskProgress): void {
    let result;
    if (this.progressComplete) {
      result = this.progressComplete(progress);
    }
    this.progressResolver.resolve(result);

    result = undefined;
    if (this.promiseFulfilled) {
      result = this.promiseFulfilled(progress);
    }
    this.promiseResolver.resolve(result);
  }

  /**
   * Notifies a failure of loading a bundle, with a provided `Error`
   * as the reason.
   */
  failedWith(error: Error): void {
    if (this.progressNext) {
      this.lastProgress.taskState = 'Error';
      this.progressNext(this.lastProgress);
    }

    let result;
    if (this.progressError) {
      result = this.progressError(error);
    }
    this.progressResolver.reject(result);

    result = undefined;
    if (this.promiseRejected) {
      this.promiseRejected(error);
    }
    this.promiseResolver.reject(result);
  }

  /**
   * Notifies a progress update of loading a bundle.
   * @param progress The new progress.
   */
  updateProgress(progress: firestore.LoadBundleTaskProgress): void {
    this.lastProgress = progress;
    if (this.progressNext) {
      this.progressNext(progress);
    }
  }
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
   * Applies to either number of documents or bytes, triggers storage update
   * when either of them cross the threshold.
   */
  private thresholdMultiplier = 0.01;
  /** Batched queries to be saved into storage */
  private queries: bundleProto.NamedQuery[] = [];
  /** Batched documents to be saved into storage */
  private documents: BundledDocuments = [];
  /** How many bytes in the bundle are being batched. */
  private bytesIncrement = 0;
  /** How many documents in the bundle are being batched. */
  private documentsIncrement = 0;
  /**
   * A BundleDocumentMetadata is added to the loader, it is saved here while
   * we wait for the actual document.
   */
  private unpairedDocumentMetadata: bundleProto.BundledDocumentMetadata | null = null;

  constructor(
    private metadata: bundleProto.BundleMetadata,
    private localStore: LocalStore
  ) {
    this.progress = initialProgress('Running', metadata);
  }

  /**
   * Adds an element from the bundle to the loader.
   *
   * If adding this element leads to actually saving the batched elements into
   * storage, the returned promise will resolve to a `LoadResult`, otherwise
   * it will resolve to null.
   */
  addSizedElement(element: SizedBundleElement): Promise<LoadResult | null> {
    debugAssert(!element.isBundleMetadata(), 'Unexpected bundle metadata.');

    this.bytesIncrement += element.byteLength;
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
        this.documentsIncrement += 1;
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
      this.documentsIncrement += 1;
      this.unpairedDocumentMetadata = null;
    }

    return this.saveAndReportProgress();
  }

  private async saveAndReportProgress(): Promise<LoadResult | null> {
    if (
      this.unpairedDocumentMetadata ||
      (this.documentsIncrement <
        this.progress.totalDocuments * this.thresholdMultiplier &&
        this.bytesIncrement <
          this.progress.totalBytes * this.thresholdMultiplier)
    ) {
      return null;
    }

    for (const q of this.queries) {
      await saveNamedQuery(this.localStore, q);
    }

    let changedDocs;
    if (this.documents.length > 0) {
      changedDocs = await applyBundleDocuments(this.localStore, this.documents);
    }

    this.progress.bytesLoaded += this.bytesIncrement;
    this.progress.documentsLoaded += this.documentsIncrement;
    this.bytesIncrement = 0;
    this.documentsIncrement = 0;
    this.queries = [];
    this.documents = [];

    return new LoadResult({ ...this.progress }, changedDocs);
  }

  /**
   * Update the progress to 'Success' and return the updated progress.
   */
  complete(): firestore.LoadBundleTaskProgress {
    debugAssert(
      this.queries.length === 0 && this.documents.length === 0,
      'There are more items needs to be saved but complete() is called.'
    );
    this.progress.taskState = 'Success';

    return this.progress;
  }
}
