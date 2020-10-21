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
import { CollectionReference as PublicCollectionReference, DocumentChange as PublicDocumentChange, DocumentChangeType, DocumentData, DocumentReference as PublicDocumentReference, DocumentSnapshot as PublicDocumentSnapshot, FirebaseFirestore as PublicFirestore, FirestoreDataConverter, GetOptions, LogLevel as PublicLogLevel, OrderByDirection, PersistenceSettings as PublicPersistenceSettings, Query as PublicQuery, QueryDocumentSnapshot as PublicQueryDocumentSnapshot, QuerySnapshot as PublicQuerySnapshot, SetOptions, Settings as PublicSettings, SnapshotListenOptions, SnapshotMetadata as PublicSnapshotMetadata, SnapshotOptions as PublicSnapshotOptions, Transaction as PublicTransaction, UpdateData, WhereFilterOp, WriteBatch as PublicWriteBatch } from '@firebase/firestore-types';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseService } from '@firebase/app-types/private';
import { DatabaseId } from '../core/database_info';
import { OfflineComponentProvider, OnlineComponentProvider } from '../core/component_provider';
import { FirestoreClient } from '../core/firestore_client';
import { Bound, Direction, FieldFilter, Operator, OrderBy, Query as InternalQuery } from '../core/query';
import { Transaction as InternalTransaction } from '../core/transaction';
import { ViewSnapshot } from '../core/view_snapshot';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { FieldPath, ResourcePath } from '../model/path';
import { AsyncQueue } from '../util/async_queue';
import { FieldPath as ExternalFieldPath } from './field_path';
import { CompleteFn, ErrorFn, NextFn, PartialObserver, Unsubscribe } from './observer';
import { _DocumentKeyReference, UntypedFirestoreDataConverter, UserDataReader } from './user_data_reader';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { LoadBundleTask } from './bundle';
/**
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * `Firestore` instance.
 */
export declare const CACHE_SIZE_UNLIMITED = -1;
/**
 * Options that can be provided in the Firestore constructor when not using
 * Firebase (aka standalone mode).
 */
export interface FirestoreDatabase {
    projectId: string;
    database?: string;
}
/**
 * A persistence provider for either memory-only or IndexedDB persistence.
 * Mainly used to allow optional inclusion of IndexedDB code.
 */
export interface PersistenceProvider {
    enableIndexedDbPersistence(firestore: Firestore, forceOwnership: boolean): Promise<void>;
    enableMultiTabIndexedDbPersistence(firestore: Firestore): Promise<void>;
    clearIndexedDbPersistence(firestore: Firestore): Promise<void>;
}
/**
 * The persistence provider included with the memory-only SDK. This provider
 * errors for all attempts to access persistence.
 */
export declare class MemoryPersistenceProvider implements PersistenceProvider {
    enableIndexedDbPersistence(firestore: Firestore, forceOwnership: boolean): Promise<void>;
    enableMultiTabIndexedDbPersistence(firestore: Firestore): Promise<void>;
    clearIndexedDbPersistence(firestore: Firestore): Promise<void>;
}
/**
 * The persistence provider included with the full Firestore SDK.
 */
export declare class IndexedDbPersistenceProvider implements PersistenceProvider {
    enableIndexedDbPersistence(firestore: Firestore, forceOwnership: boolean): Promise<void>;
    enableMultiTabIndexedDbPersistence(firestore: Firestore): Promise<void>;
    clearIndexedDbPersistence(firestore: Firestore): Promise<void>;
}
/**
 * The root reference to the database.
 */
export declare class Firestore implements PublicFirestore, FirebaseService {
    readonly _persistenceProvider: PersistenceProvider;
    readonly _databaseId: DatabaseId;
    readonly _persistenceKey: string;
    private _credentials;
    private readonly _firebaseApp;
    private _settings;
    private _firestoreClient;
    readonly _queue: AsyncQueue;
    _userDataReader: UserDataReader | undefined;
    constructor(databaseIdOrApp: FirestoreDatabase | FirebaseApp, authProvider: Provider<FirebaseAuthInternalName>, _persistenceProvider?: PersistenceProvider);
    get _dataReader(): UserDataReader;
    settings(settingsLiteral: PublicSettings): void;
    useEmulator(host: string, port: number): void;
    enableNetwork(): Promise<void>;
    disableNetwork(): Promise<void>;
    enablePersistence(settings?: PublicPersistenceSettings): Promise<void>;
    clearPersistence(): Promise<void>;
    terminate(): Promise<void>;
    get _isTerminated(): boolean;
    waitForPendingWrites(): Promise<void>;
    onSnapshotsInSync(observer: PartialObserver<void>): Unsubscribe;
    onSnapshotsInSync(onSync: () => void): Unsubscribe;
    _loadBundle(bundleData: ArrayBuffer | ReadableStream<Uint8Array> | string): LoadBundleTask;
    _namedQuery(name: string): Promise<PublicQuery | null>;
    ensureClientConfigured(): FirestoreClient;
    private makeDatabaseInfo;
    _configureClient(offlineComponentProvider: OfflineComponentProvider, onlineComponentProvider: OnlineComponentProvider): Promise<void>;
    private static databaseIdFromApp;
    get app(): FirebaseApp;
    INTERNAL: {
        delete: () => Promise<void>;
    };
    collection(pathString: string): PublicCollectionReference;
    doc(pathString: string): PublicDocumentReference;
    collectionGroup(collectionId: string): PublicQuery;
    runTransaction<T>(updateFunction: (transaction: PublicTransaction) => Promise<T>): Promise<T>;
    batch(): PublicWriteBatch;
    _getSettings(): PublicSettings;
}
export declare function setLogLevel(level: PublicLogLevel): void;
/**
 * A reference to a transaction.
 */
export declare class Transaction implements PublicTransaction {
    private _firestore;
    private _transaction;
    constructor(_firestore: Firestore, _transaction: InternalTransaction);
    get<T>(documentRef: PublicDocumentReference<T>): Promise<PublicDocumentSnapshot<T>>;
    set<T>(documentRef: DocumentReference<T>, data: Partial<T>, options: SetOptions): Transaction;
    set<T>(documentRef: DocumentReference<T>, data: T): Transaction;
    update(documentRef: PublicDocumentReference<unknown>, value: UpdateData): Transaction;
    update(documentRef: PublicDocumentReference<unknown>, field: string | ExternalFieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): Transaction;
    delete(documentRef: PublicDocumentReference<unknown>): Transaction;
}
export declare class WriteBatch implements PublicWriteBatch {
    private _firestore;
    private _mutations;
    private _committed;
    constructor(_firestore: Firestore);
    set<T>(documentRef: DocumentReference<T>, data: Partial<T>, options: SetOptions): WriteBatch;
    set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch;
    update(documentRef: PublicDocumentReference<unknown>, value: UpdateData): WriteBatch;
    update(documentRef: PublicDocumentReference<unknown>, field: string | ExternalFieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): WriteBatch;
    delete(documentRef: PublicDocumentReference<unknown>): WriteBatch;
    commit(): Promise<void>;
    private verifyNotCommitted;
}
/**
 * A reference to a particular document in a collection in the database.
 */
export declare class DocumentReference<T = DocumentData> extends _DocumentKeyReference<T> implements PublicDocumentReference<T> {
    _key: DocumentKey;
    readonly firestore: Firestore;
    readonly _converter: FirestoreDataConverter<T> | null;
    private _firestoreClient;
    constructor(_key: DocumentKey, firestore: Firestore, _converter: FirestoreDataConverter<T> | null);
    static forPath<U>(path: ResourcePath, firestore: Firestore, converter: FirestoreDataConverter<U> | null): DocumentReference<U>;
    get id(): string;
    get parent(): PublicCollectionReference<T>;
    get path(): string;
    collection(pathString: string): PublicCollectionReference<DocumentData>;
    isEqual(other: PublicDocumentReference<T>): boolean;
    set(value: Partial<T>, options: SetOptions): Promise<void>;
    set(value: T): Promise<void>;
    update(value: UpdateData): Promise<void>;
    update(field: string | ExternalFieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): Promise<void>;
    delete(): Promise<void>;
    onSnapshot(observer: PartialObserver<PublicDocumentSnapshot<T>>): Unsubscribe;
    onSnapshot(options: SnapshotListenOptions, observer: PartialObserver<PublicDocumentSnapshot<T>>): Unsubscribe;
    onSnapshot(onNext: NextFn<PublicDocumentSnapshot<T>>, onError?: ErrorFn, onCompletion?: CompleteFn): Unsubscribe;
    onSnapshot(options: SnapshotListenOptions, onNext: NextFn<PublicDocumentSnapshot<T>>, onError?: ErrorFn, onCompletion?: CompleteFn): Unsubscribe;
    get(options?: GetOptions): Promise<PublicDocumentSnapshot<T>>;
    withConverter<U>(converter: FirestoreDataConverter<U>): PublicDocumentReference<U>;
    /**
     * Converts a ViewSnapshot that contains the current document to a
     * DocumentSnapshot.
     */
    private _convertToDocSnapshot;
}
/**
 * Metadata about a snapshot, describing the state of the snapshot.
 */
export declare class SnapshotMetadata implements PublicSnapshotMetadata {
    /**
     * True if the snapshot contains the result of local writes (for example
     * `set()` or `update()` calls) that have not yet been committed to the
     * backend. If your listener has opted into metadata updates (via
     * `SnapshotListenOptions`) you will receive another snapshot with
     * `hasPendingWrites` equal to false once the writes have been committed to
     * the backend.
     */
    readonly hasPendingWrites: boolean;
    /**
     * True if the snapshot was created from cached data rather than guaranteed
     * up-to-date server data. If your listener has opted into metadata updates
     * (via `SnapshotListenOptions`) you will receive another snapshot with
     * `fromCache` set to false once the client has received up-to-date data from
     * the backend.
     */
    readonly fromCache: boolean;
    constructor(hasPendingWrites: boolean, fromCache: boolean);
    /**
     * Returns true if this `SnapshotMetadata` is equal to the provided one.
     *
     * @param other The `SnapshotMetadata` to compare against.
     * @return true if this `SnapshotMetadata` is equal to the provided one.
     */
    isEqual(other: PublicSnapshotMetadata): boolean;
}
/**
 * Options interface that can be provided to configure the deserialization of
 * DocumentSnapshots.
 */
export interface SnapshotOptions extends PublicSnapshotOptions {
}
export declare class DocumentSnapshot<T = DocumentData> implements PublicDocumentSnapshot<T> {
    private _firestore;
    private _key;
    _document: Document | null;
    private _fromCache;
    private _hasPendingWrites;
    private readonly _converter;
    constructor(_firestore: Firestore, _key: DocumentKey, _document: Document | null, _fromCache: boolean, _hasPendingWrites: boolean, _converter: FirestoreDataConverter<T> | null);
    data(options?: PublicSnapshotOptions): T | undefined;
    get(fieldPath: string | ExternalFieldPath, options?: PublicSnapshotOptions): unknown;
    get id(): string;
    get ref(): PublicDocumentReference<T>;
    get exists(): boolean;
    get metadata(): PublicSnapshotMetadata;
    isEqual(other: PublicDocumentSnapshot<T>): boolean;
}
export declare class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> implements PublicQueryDocumentSnapshot<T> {
    data(options?: SnapshotOptions): T;
}
export declare function newQueryFilter(query: InternalQuery, methodName: string, dataReader: UserDataReader, databaseId: DatabaseId, fieldPath: FieldPath, op: Operator, value: unknown): FieldFilter;
export declare function newQueryOrderBy(query: InternalQuery, fieldPath: FieldPath, direction: Direction): OrderBy;
/**
 * Create a Bound from a query and a document.
 *
 * Note that the Bound will always include the key of the document
 * and so only the provided document will compare equal to the returned
 * position.
 *
 * Will throw if the document does not contain all fields of the order by
 * of the query or if any of the fields in the order by are an uncommitted
 * server timestamp.
 */
export declare function newQueryBoundFromDocument(query: InternalQuery, databaseId: DatabaseId, methodName: string, doc: Document | null, before: boolean): Bound;
/**
 * Converts a list of field values to a Bound for the given query.
 */
export declare function newQueryBoundFromFields(query: InternalQuery, databaseId: DatabaseId, dataReader: UserDataReader, methodName: string, values: unknown[], before: boolean): Bound;
export declare function validateHasExplicitOrderByForLimitToLast(query: InternalQuery): void;
export declare class Query<T = DocumentData> implements PublicQuery<T> {
    _query: InternalQuery;
    readonly firestore: Firestore;
    protected readonly _converter: FirestoreDataConverter<T> | null;
    constructor(_query: InternalQuery, firestore: Firestore, _converter: FirestoreDataConverter<T> | null);
    where(field: string | ExternalFieldPath, opStr: WhereFilterOp, value: unknown): PublicQuery<T>;
    orderBy(field: string | ExternalFieldPath, directionStr?: OrderByDirection): PublicQuery<T>;
    limit(n: number): PublicQuery<T>;
    limitToLast(n: number): PublicQuery<T>;
    startAt(docOrField: unknown | PublicDocumentSnapshot<unknown>, ...fields: unknown[]): PublicQuery<T>;
    startAfter(docOrField: unknown | PublicDocumentSnapshot<unknown>, ...fields: unknown[]): PublicQuery<T>;
    endBefore(docOrField: unknown | PublicDocumentSnapshot<unknown>, ...fields: unknown[]): PublicQuery<T>;
    endAt(docOrField: unknown | PublicDocumentSnapshot<unknown>, ...fields: unknown[]): PublicQuery<T>;
    isEqual(other: PublicQuery<T>): boolean;
    withConverter<U>(converter: FirestoreDataConverter<U>): PublicQuery<U>;
    /** Helper function to create a bound from a document or fields */
    private boundFromDocOrFields;
    onSnapshot(observer: PartialObserver<PublicQuerySnapshot<T>>): Unsubscribe;
    onSnapshot(options: SnapshotListenOptions, observer: PartialObserver<PublicQuerySnapshot<T>>): Unsubscribe;
    onSnapshot(onNext: NextFn<PublicQuerySnapshot<T>>, onError?: ErrorFn, onCompletion?: CompleteFn): Unsubscribe;
    onSnapshot(options: SnapshotListenOptions, onNext: NextFn<PublicQuerySnapshot<T>>, onError?: ErrorFn, onCompletion?: CompleteFn): Unsubscribe;
    get(options?: GetOptions): Promise<PublicQuerySnapshot<T>>;
}
export declare class QuerySnapshot<T = DocumentData> implements PublicQuerySnapshot<T> {
    private readonly _firestore;
    private readonly _originalQuery;
    private readonly _snapshot;
    private readonly _converter;
    private _cachedChanges;
    private _cachedChangesIncludeMetadataChanges;
    readonly metadata: PublicSnapshotMetadata;
    constructor(_firestore: Firestore, _originalQuery: InternalQuery, _snapshot: ViewSnapshot, _converter: FirestoreDataConverter<T> | null);
    get docs(): Array<PublicQueryDocumentSnapshot<T>>;
    get empty(): boolean;
    get size(): number;
    forEach(callback: (result: PublicQueryDocumentSnapshot<T>) => void, thisArg?: unknown): void;
    get query(): PublicQuery<T>;
    docChanges(options?: SnapshotListenOptions): Array<PublicDocumentChange<T>>;
    /** Check the equality. The call can be very expensive. */
    isEqual(other: PublicQuerySnapshot<T>): boolean;
    private convertToDocumentImpl;
}
export declare class CollectionReference<T = DocumentData> extends Query<T> implements PublicCollectionReference<T> {
    readonly _path: ResourcePath;
    constructor(_path: ResourcePath, firestore: Firestore, _converter: FirestoreDataConverter<T> | null);
    get id(): string;
    get parent(): PublicDocumentReference<DocumentData> | null;
    get path(): string;
    doc(pathString?: string): PublicDocumentReference<T>;
    add(value: T): Promise<PublicDocumentReference<T>>;
    withConverter<U>(converter: FirestoreDataConverter<U>): PublicCollectionReference<U>;
}
/**
 * Calculates the array of DocumentChanges for a given ViewSnapshot.
 *
 * Exported for testing.
 *
 * @param snapshot The ViewSnapshot that represents the expected state.
 * @param includeMetadataChanges Whether to include metadata changes.
 * @param converter A factory function that returns a QueryDocumentSnapshot.
 * @return An object that matches the DocumentChange API.
 */
export declare function changesFromSnapshot<DocSnap>(snapshot: ViewSnapshot, includeMetadataChanges: boolean, converter: (doc: Document, fromCache: boolean, hasPendingWrite: boolean) => DocSnap): Array<{
    type: DocumentChangeType;
    doc: DocSnap;
    oldIndex: number;
    newIndex: number;
}>;
/**
 * Converts custom model object of type T into DocumentData by applying the
 * converter if it exists.
 *
 * This function is used when converting user objects to DocumentData
 * because we want to provide the user with a more specific error message if
 * their set() or fails due to invalid data originating from a toFirestore()
 * call.
 */
export declare function applyFirestoreDataConverter<T>(converter: UntypedFirestoreDataConverter<T> | null, value: T, options?: SetOptions): DocumentData;
