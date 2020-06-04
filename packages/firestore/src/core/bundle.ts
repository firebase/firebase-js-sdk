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
import { LocalStore } from '../local/local_store';
import { SizedBundleElement } from '../util/bundle_reader';
import { MaybeDocumentMap } from '../model/collections';
import { Deferred } from '../util/promise';

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

export type BundledDocuments = Array<
  [bundleProto.BundledDocumentMetadata, api.Document | undefined]
>;

export class BundleConverter {
  constructor(private serializer: JsonProtoSerializer) {}

  toDocumentKey(name: string): DocumentKey {
    return this.serializer.fromName(name);
  }

  toMaybeDocument(
    metadata: bundleProto.BundledDocumentMetadata,
    doc: api.Document | undefined
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

  toSnapshotVersion(time: api.Timestamp): SnapshotVersion {
    return this.serializer.fromVersion(time);
  }
}

export interface LoadBundleTaskProgress {
  documentsLoaded: number;
  totalDocuments: number;
  bytesLoaded: number;
  totalBytes: number;
  taskState: TaskState;
}
export type TaskState = 'Error' | 'Running' | 'Success';

export interface LoadBundleTask {
  onProgress(
    next?: (a: LoadBundleTaskProgress) => any,
    error?: (a: Error) => any,
    complete?: () => void
  ): Promise<void>;

  then(
    onFulfilled?: (a: LoadBundleTaskProgress) => any,
    onRejected?: (a: Error) => any
  ): Promise<any>;

  catch(onRejected: (a: Error) => any): Promise<any>;
}

export class LoadBundleTaskImpl implements LoadBundleTask {
  private progressResolver = new Deferred<any>();
  private progressNext?: (a: LoadBundleTaskProgress) => any;
  private progressError?: (a: Error) => any;
  private progressComplete?: () => any;

  private promiseResolver = new Deferred<any>();
  private promiseFulfilled?: (a: LoadBundleTaskProgress) => any;
  private promiseRejected?: (a: Error) => any;

  private lastProgress: LoadBundleTaskProgress = {
    taskState: 'Running',
    totalBytes: 0,
    totalDocuments: 0,
    bytesLoaded: 0,
    documentsLoaded: 0
  };

  onProgress(
    next?: (a: LoadBundleTaskProgress) => any,
    error?: (a: Error) => any,
    complete?: () => void
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
    onFulfilled?: (a: LoadBundleTaskProgress) => any,
    onRejected?: (a: Error) => any
  ): Promise<any> {
    this.promiseFulfilled = onFulfilled;
    this.promiseRejected = onRejected;
    return this.promiseResolver.promise;
  }

  completeWith(progress: LoadBundleTaskProgress): void {
    let result;
    if (this.progressComplete) {
      result = this.progressComplete();
    }
    this.progressResolver.resolve(result);

    result = undefined;
    if (this.promiseFulfilled) {
      result = this.promiseFulfilled(progress);
    }
    this.promiseResolver.resolve(result);
  }

  failedWith(error: Error): void {
    if (this.progressNext) {
      this.lastProgress!.taskState = 'Error';
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

  updateProgress(progress: LoadBundleTaskProgress): void {
    this.lastProgress = progress;
    if (this.progressNext) {
      this.progressNext(progress);
    }
  }
}

export class LoadResult {
  constructor(
    readonly progress: LoadBundleTaskProgress,
    readonly changedDocs?: MaybeDocumentMap
  ) {}
}

export class BundleLoader {
  private progress: LoadBundleTaskProgress;
  private step = 0.01;
  private queries: bundleProto.NamedQuery[] = [];
  private documents: BundledDocuments = [];
  private bytesIncrement = 0;
  private documentsIncrement = 0;
  private unpairedDocumentMetadata: bundleProto.BundledDocumentMetadata | null = null;

  constructor(
    private metadata: bundleProto.BundleMetadata,
    private localStore: LocalStore
  ) {
    this.progress = {
      documentsLoaded: 0,
      totalDocuments: metadata.totalDocuments!,
      bytesLoaded: 0,
      totalBytes: metadata.totalBytes!,
      taskState: 'Running'
    };
  }

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
        this.documents.push([element.payload.documentMetadata, undefined]);
        this.documentsIncrement += 1;
      }
    }

    if (element.payload.document) {
      debugAssert(
        !this.unpairedDocumentMetadata,
        'Unexpected document when no paring metadata is found'
      );
      this.documents.push([
        this.unpairedDocumentMetadata!,
        element.payload.document
      ]);
      this.documentsIncrement += 1;
      this.unpairedDocumentMetadata = null;
    }

    return this.saveAndReportProgress();
  }

  private async saveAndReportProgress(): Promise<LoadResult | null> {
    if (
      this.unpairedDocumentMetadata ||
      (this.documentsIncrement < this.progress.totalDocuments * this.step &&
        this.bytesIncrement < this.progress.totalBytes * this.step)
    ) {
      return null;
    }

    for (const q of this.queries) {
      await this.localStore.saveNamedQuery(q);
    }

    let changedDocs;
    if (this.documents.length > 0) {
      changedDocs = await this.localStore.applyBundledDocuments(this.documents);
    }

    this.progress.bytesLoaded += this.bytesIncrement;
    this.progress.documentsLoaded += this.documentsIncrement;
    this.bytesIncrement = 0;
    this.documentsIncrement = 0;
    this.queries = [];
    this.documents = [];

    return new LoadResult({ ...this.progress }, changedDocs);
  }

  async complete(): Promise<LoadBundleTaskProgress> {
    debugAssert(
      this.queries.length === 0 && this.documents.length === 0,
      'There are more items needs to be saved but complete() is called.'
    );
    this.progress.taskState = 'Success';

    return this.progress;
  }
}
