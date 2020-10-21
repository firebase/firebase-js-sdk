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
import { JsonProtoSerializer } from '../remote/serializer';
import * as bundleProto from '../protos/firestore_bundle_proto';
import { BundleMetadata } from '../protos/firestore_bundle_proto';
import * as api from '../protos/firestore_proto_api';
import { DocumentKey } from '../model/document_key';
import { MaybeDocument } from '../model/document';
import { LocalStore } from '../local/local_store';
import { SizedBundleElement } from '../util/bundle_reader';
import { MaybeDocumentMap } from '../model/collections';
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
    document?: api.Document;
}
/**
 * An array of `BundledDocument`.
 */
export declare type BundledDocuments = BundledDocument[];
/**
 * Helper to convert objects from bundles to model objects in the SDK.
 */
export declare class BundleConverter {
    private readonly serializer;
    constructor(serializer: JsonProtoSerializer);
    toDocumentKey(name: string): DocumentKey;
    /**
     * Converts a BundleDocument to a MaybeDocument.
     */
    toMaybeDocument(bundledDoc: BundledDocument): MaybeDocument;
    toSnapshotVersion(time: api.Timestamp): SnapshotVersion;
}
/**
 * Returns a `LoadBundleTaskProgress` representing the initial progress of
 * loading a bundle.
 */
export declare function bundleInitialProgress(metadata: BundleMetadata): firestore.LoadBundleTaskProgress;
/**
 * Returns a `LoadBundleTaskProgress` representing the progress that the loading
 * has succeeded.
 */
export declare function bundleSuccessProgress(metadata: BundleMetadata): firestore.LoadBundleTaskProgress;
export declare class BundleLoadResult {
    readonly progress: firestore.LoadBundleTaskProgress;
    readonly changedDocs: MaybeDocumentMap;
    constructor(progress: firestore.LoadBundleTaskProgress, changedDocs: MaybeDocumentMap);
}
/**
 * A class to process the elements from a bundle, load them into local
 * storage and provide progress update while loading.
 */
export declare class BundleLoader {
    private bundleMetadata;
    private localStore;
    private serializer;
    /** The current progress of loading */
    private progress;
    /** Batched queries to be saved into storage */
    private queries;
    /** Batched documents to be saved into storage */
    private documents;
    constructor(bundleMetadata: bundleProto.BundleMetadata, localStore: LocalStore, serializer: JsonProtoSerializer);
    /**
     * Adds an element from the bundle to the loader.
     *
     * Returns a new progress if adding the element leads to a new progress,
     * otherwise returns null.
     */
    addSizedElement(element: SizedBundleElement): firestore.LoadBundleTaskProgress | null;
    private getQueryDocumentMapping;
    /**
     * Update the progress to 'Success' and return the updated progress.
     */
    complete(): Promise<BundleLoadResult>;
}
export {};
