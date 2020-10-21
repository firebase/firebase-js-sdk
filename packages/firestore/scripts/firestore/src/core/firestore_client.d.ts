/**
 * @license
 * Copyright 2017 Google LLC
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
import { GetOptions } from '@firebase/firestore-types';
import { CredentialsProvider } from '../api/credentials';
import { LocalStore } from '../local/local_store';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { AsyncQueue } from '../util/async_queue';
import { Deferred } from '../util/promise';
import { EventManager, ListenOptions, Observer } from './event_manager';
import { DatabaseId, DatabaseInfo } from './database_info';
import { Query } from './query';
import { Transaction } from './transaction';
import { ViewSnapshot } from './view_snapshot';
import { OfflineComponentProvider, OnlineComponentProvider } from './component_provider';
import { BundleReader } from '../util/bundle_reader';
import { LoadBundleTask } from '../api/bundle';
import { NamedQuery } from './bundle';
import { JsonProtoSerializer } from '../remote/serializer';
export declare const MAX_CONCURRENT_LIMBO_RESOLUTIONS = 100;
/**
 * FirestoreClient is a top-level class that constructs and owns all of the
 * pieces of the client SDK architecture. It is responsible for creating the
 * async queue that is shared by all of the other components in the system.
 */
export declare class FirestoreClient {
    private credentials;
    /**
     * Asynchronous queue responsible for all of our internal processing. When
     * we get incoming work from the user (via public API) or the network
     * (incoming GRPC messages), we should always schedule onto this queue.
     * This ensures all of our work is properly serialized (e.g. we don't
     * start processing a new operation while the previous one is waiting for
     * an async I/O to complete).
     */
    private asyncQueue;
    private databaseInfo;
    private eventMgr;
    private persistence;
    private localStore;
    private datastore;
    private remoteStore;
    private syncEngine;
    private gcScheduler;
    private sharedClientState;
    private readonly clientId;
    private readonly initializationDone;
    constructor(credentials: CredentialsProvider, 
    /**
     * Asynchronous queue responsible for all of our internal processing. When
     * we get incoming work from the user (via public API) or the network
     * (incoming GRPC messages), we should always schedule onto this queue.
     * This ensures all of our work is properly serialized (e.g. we don't
     * start processing a new operation while the previous one is waiting for
     * an async I/O to complete).
     */
    asyncQueue: AsyncQueue);
    /**
     * Starts up the FirestoreClient, returning only whether or not enabling
     * persistence succeeded.
     *
     * The intent here is to "do the right thing" as far as users are concerned.
     * Namely, in cases where offline persistence is requested and possible,
     * enable it, but otherwise fall back to persistence disabled. For the most
     * part we expect this to succeed one way or the other so we don't expect our
     * users to actually wait on the firestore.enablePersistence Promise since
     * they generally won't care.
     *
     * Of course some users actually do care about whether or not persistence
     * was successfully enabled, so the Promise returned from this method
     * indicates this outcome.
     *
     * This presents a problem though: even before enablePersistence resolves or
     * rejects, users may have made calls to e.g. firestore.collection() which
     * means that the FirestoreClient in there will be available and will be
     * enqueuing actions on the async queue.
     *
     * Meanwhile any failure of an operation on the async queue causes it to
     * panic and reject any further work, on the premise that unhandled errors
     * are fatal.
     *
     * Consequently the fallback is handled internally here in start, and if the
     * fallback succeeds we signal success to the async queue even though the
     * start() itself signals failure.
     *
     * @param databaseInfo The connection information for the current instance.
     * @param offlineComponentProvider Provider that returns all components
     * required for memory-only or IndexedDB persistence.
     * @param onlineComponentProvider Provider that returns all components
     * required for online support.
     * @returns A deferred result indicating the user-visible result of enabling
     *     offline persistence. This method will reject this if IndexedDB fails to
     *     start for any reason. If usePersistence is false this is
     *     unconditionally resolved.
     */
    start(databaseInfo: DatabaseInfo, offlineComponentProvider: OfflineComponentProvider, onlineComponentProvider: OnlineComponentProvider): Promise<void>;
    /** Enables the network connection and requeues all pending operations. */
    enableNetwork(): Promise<void>;
    /**
     * Initializes persistent storage, attempting to use IndexedDB if
     * usePersistence is true or memory-only if false.
     *
     * If IndexedDB fails because it's already open in another tab or because the
     * platform can't possibly support our implementation then this method rejects
     * the persistenceResult and falls back on memory-only persistence.
     *
     * @param offlineComponentProvider Provider that returns all components
     * required for memory-only or IndexedDB persistence.
     * @param onlineComponentProvider Provider that returns all components
     * required for online support.
     * @param user The initial user
     * @param persistenceResult A deferred result indicating the user-visible
     *     result of enabling offline persistence. This method will reject this if
     *     IndexedDB fails to start for any reason. If usePersistence is false
     *     this is unconditionally resolved.
     * @returns a Promise indicating whether or not initialization should
     *     continue, i.e. that one of the persistence implementations actually
     *     succeeded.
     */
    private initializeComponents;
    /**
     * Checks that the client has not been terminated. Ensures that other methods on
     * this class cannot be called after the client is terminated.
     */
    private verifyNotTerminated;
    /** Disables the network connection. Pending operations will not complete. */
    disableNetwork(): Promise<void>;
    terminate(): Promise<void>;
    /**
     * Returns a Promise that resolves when all writes that were pending at the time this
     * method was called received server acknowledgement. An acknowledgement can be either acceptance
     * or rejection.
     */
    waitForPendingWrites(): Promise<void>;
    listen(query: Query, options: ListenOptions, observer: Partial<Observer<ViewSnapshot>>): () => void;
    getDocumentFromLocalCache(docKey: DocumentKey): Promise<Document | null>;
    getDocumentViaSnapshotListener(key: DocumentKey, options?: GetOptions): Promise<ViewSnapshot>;
    getDocumentsFromLocalCache(query: Query): Promise<ViewSnapshot>;
    getDocumentsViaSnapshotListener(query: Query, options?: GetOptions): Promise<ViewSnapshot>;
    write(mutations: Mutation[]): Promise<void>;
    databaseId(): DatabaseId;
    addSnapshotsInSyncListener(observer: Partial<Observer<void>>): () => void;
    get clientTerminated(): boolean;
    /**
     * Takes an updateFunction in which a set of reads and writes can be performed
     * atomically. In the updateFunction, the client can read and write values
     * using the supplied transaction object. After the updateFunction, all
     * changes will be committed. If a retryable error occurs (ex: some other
     * client has changed any of the data referenced), then the updateFunction
     * will be called again after a backoff. If the updateFunction still fails
     * after all retries, then the transaction will be rejected.
     *
     * The transaction object passed to the updateFunction contains methods for
     * accessing documents and collections. Unlike other datastore access, data
     * accessed with the transaction will not reflect local changes that have not
     * been committed. For this reason, it is required that all reads are
     * performed before any writes. Transactions must be performed while online.
     */
    transaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T>;
    loadBundle(data: ReadableStream<Uint8Array> | ArrayBuffer | string, resultTask: LoadBundleTask): void;
    getNamedQuery(queryName: string): Promise<NamedQuery | undefined>;
}
export declare function readDocumentFromCache(localStore: LocalStore, docKey: DocumentKey, result: Deferred<Document | null>): Promise<void>;
/**
 * Retrieves a latency-compensated document from the backend via a
 * SnapshotListener.
 */
export declare function readDocumentViaSnapshotListener(eventManager: EventManager, asyncQueue: AsyncQueue, key: DocumentKey, options: GetOptions, result: Deferred<ViewSnapshot>): Promise<void>;
export declare function executeQueryFromCache(localStore: LocalStore, query: Query, result: Deferred<ViewSnapshot>): Promise<void>;
/**
 * Retrieves a latency-compensated query snapshot from the backend via a
 * SnapshotListener.
 */
export declare function executeQueryViaSnapshotListener(eventManager: EventManager, asyncQueue: AsyncQueue, query: Query, options: GetOptions, result: Deferred<ViewSnapshot>): Promise<void>;
export declare function createBundleReader(data: ReadableStream<Uint8Array> | ArrayBuffer | string, serializer: JsonProtoSerializer): BundleReader;
