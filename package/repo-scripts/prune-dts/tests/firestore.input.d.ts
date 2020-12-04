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

import { DocumentData as DocumentData_2 } from '@firebase/firestore-types';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { _FirebaseService } from '@firebase/app-types';
import { LogLevel } from '@firebase/logger';
import { Provider } from '@firebase/component';
import { SetOptions as SetOptions_2 } from '@firebase/firestore-types';
import { SnapshotMetadata as SnapshotMetadata_2 } from '@firebase/firestore-types';
declare abstract class AbstractUserDataWriter {
  convertValue(
    value: Value,
    serverTimestampBehavior?: ServerTimestampBehavior
  ): unknown;
  private convertObject;
  private convertGeoPoint;
  private convertArray;
  private convertServerTimestamp;
  private convertTimestamp;
  protected convertDocumentKey(
    name: string,
    expectedDatabaseId: DatabaseId
  ): DocumentKey;
  protected abstract convertReference(name: string): unknown;
  protected abstract convertBytes(bytes: ByteString): unknown;
}
declare type ActiveTargets = SortedMap<TargetId, unknown>;
export declare function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>>;
declare interface ApiClientObjectMap<T> {
  [k: string]: T;
}
export declare function arrayRemove(...elements: unknown[]): FieldValue;
export declare function arrayUnion(...elements: unknown[]): FieldValue;
declare class AsyncQueue {
  private tail;
  private retryableOps;
  private _isShuttingDown;
  private delayedOperations;
  failure: FirestoreError | null;
  private operationInProgress;
  private timerIdsToSkip;
  private backoff;
  private visibilityHandler;
  constructor();
  get isShuttingDown(): boolean;
  enqueueAndForget<T extends unknown>(op: () => Promise<T>): void;
  enqueueAndForgetEvenWhileRestricted<T extends unknown>(
    op: () => Promise<T>
  ): void;
  enterRestrictedMode(): void;
  enqueue<T extends unknown>(op: () => Promise<T>): Promise<T>;
  enqueueRetryable(op: () => Promise<void>): void;
  private retryNextOp;
  private enqueueInternal;
  enqueueAfterDelay<T extends unknown>(
    timerId: TimerId,
    delayMs: number,
    op: () => Promise<T>
  ): DelayedOperation<T>;
  private verifyNotFailed;
  verifyOperationInProgress(): void;
  drain(): Promise<void>;
  containsDelayedOperation(timerId: TimerId): boolean;
  runAllDelayedOperationsUntil(lastTimerId: TimerId): Promise<void>;
  skipDelaysForTimerId(timerId: TimerId): void;
  private removeDelayedOperation;
}
declare abstract class BasePath<B extends BasePath<B>> {
  private segments;
  private offset;
  private len;
  constructor(segments: string[], offset?: number, length?: number);
  protected abstract construct(
    segments: string[],
    offset?: number,
    length?: number
  ): B;
  abstract toString(): string;
  get length(): number;
  isEqual(other: B): boolean;
  child(nameOrPath: string | B): B;
  private limit;
  popFirst(size?: number): B;
  popLast(): B;
  firstSegment(): string;
  lastSegment(): string;
  get(index: number): string;
  isEmpty(): boolean;
  isPrefixOf(other: this): boolean;
  isImmediateParentOf(potentialChild: this): boolean;
  forEach(fn: (segment: string) => void): void;
  toArray(): string[];
  static comparator<T extends BasePath<T>>(
    p1: BasePath<T>,
    p2: BasePath<T>
  ): number;
}
declare type BatchId = number;
declare class Bound {
  readonly position: Value[];
  readonly before: boolean;
  constructor(position: Value[], before: boolean);
}
declare interface Bundle {
  readonly id: string;
  readonly version: number;
  readonly createTime: SnapshotVersion;
}
declare interface BundleCache {
  getBundleMetadata(
    transaction: PersistenceTransaction,
    bundleId: string
  ): PersistencePromise<Bundle | undefined>;
  saveBundleMetadata(
    transaction: PersistenceTransaction,
    metadata: BundleMetadata
  ): PersistencePromise<void>;
  getNamedQuery(
    transaction: PersistenceTransaction,
    queryName: string
  ): PersistencePromise<NamedQuery | undefined>;
  saveNamedQuery(
    transaction: PersistenceTransaction,
    query: NamedQuery
  ): PersistencePromise<void>;
}
declare interface BundleMetadata {
  id?: string | null;
  createTime?: any | null;
  version?: number | null;
  totalDocuments?: number | null;
  totalBytes?: number | null;
}
export declare class Bytes {
  _byteString: ByteString;
  /** @hideconstructor */
  constructor(byteString: ByteString);
  static fromBase64String(base64: string): Bytes;
  static fromUint8Array(array: Uint8Array): Bytes;
  toBase64(): string;
  toUint8Array(): Uint8Array;
  toString(): string;
  isEqual(other: Bytes): boolean;
}
declare class ByteString {
  private readonly binaryString;
  static readonly EMPTY_BYTE_STRING: ByteString;
  private constructor();
  static fromBase64String(base64: string): ByteString;
  static fromUint8Array(array: Uint8Array): ByteString;
  toBase64(): string;
  toUint8Array(): Uint8Array;
  approximateByteSize(): number;
  compareTo(other: ByteString): number;
  isEqual(other: ByteString): boolean;
}
export declare const CACHE_SIZE_UNLIMITED = -1;
declare const enum ChangeType {
  Added = 0,
  Removed = 1,
  Modified = 2,
  Metadata = 3
}
export declare function clearIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void>;
declare type ClientId = string;
export declare function collection(
  firestore: FirebaseFirestore_2,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
export declare function collection(
  reference: CollectionReference<unknown>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
export declare function collection(
  reference: DocumentReference,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
export declare function collectionGroup(
  firestore: FirebaseFirestore_2,
  collectionId: string
): Query<DocumentData>;
export declare class CollectionReference<T = DocumentData> extends Query<T> {
  readonly firestore: FirebaseFirestore_2;
  readonly _path: ResourcePath;
  readonly type = 'collection';
  /** @hideconstructor */
  constructor(
    firestore: FirebaseFirestore_2,
    converter: FirestoreDataConverter_2<T> | null,
    _path: ResourcePath
  );
  get id(): string;
  get path(): string;
  get parent(): DocumentReference<DocumentData> | null;
  withConverter<U>(
    converter: FirestoreDataConverter_2<U>
  ): CollectionReference<U>;
}
declare type Comparator<K> = (key1: K, key2: K) => number;
declare interface ComponentConfiguration {
  asyncQueue: AsyncQueue;
  databaseInfo: DatabaseInfo;
  credentials: CredentialsProvider;
  clientId: ClientId;
  initialUser: User;
  maxConcurrentLimboResolutions: number;
}
declare type CompositeFilterOp = 'OPERATOR_UNSPECIFIED' | 'AND';
declare interface ContextSettings {
  readonly dataSource: UserDataSource;
  readonly methodName: string;
  readonly targetDoc?: DocumentKey;
  readonly path?: FieldPath_2;
  readonly arrayElement?: boolean;
  readonly hasConverter?: boolean;
}
declare type CredentialChangeListener = (user: User) => void;
declare interface CredentialsProvider {
  getToken(): Promise<Token | null>;
  invalidateToken(): void;
  setChangeListener(changeListener: CredentialChangeListener): void;
  removeChangeListener(): void;
}
declare type CredentialsSettings =
  | FirstPartyCredentialsSettings
  | ProviderCredentialsSettings;
declare class DatabaseId {
  readonly projectId: string;
  readonly database: string;
  constructor(projectId: string, database?: string);
  get isDefaultDatabase(): boolean;
  isEqual(other: {}): boolean;
}
declare class DatabaseInfo {
  readonly databaseId: DatabaseId;
  readonly persistenceKey: string;
  readonly host: string;
  readonly ssl: boolean;
  readonly forceLongPolling: boolean;
  readonly autoDetectLongPolling: boolean;
  constructor(
    databaseId: DatabaseId,
    persistenceKey: string,
    host: string,
    ssl: boolean,
    forceLongPolling: boolean,
    autoDetectLongPolling: boolean
  );
}
declare abstract class Datastore {
  abstract terminate(): void;
}
declare class DelayedOperation<T extends unknown> implements PromiseLike<T> {
  private readonly asyncQueue;
  readonly timerId: TimerId;
  readonly targetTimeMs: number;
  private readonly op;
  private readonly removalCallback;
  private timerHandle;
  private readonly deferred;
  private constructor();
  static createAndSchedule<R extends unknown>(
    asyncQueue: AsyncQueue,
    timerId: TimerId,
    delayMs: number,
    op: () => Promise<R>,
    removalCallback: (op: DelayedOperation<R>) => void
  ): DelayedOperation<R>;
  private start;
  skipDelay(): void;
  cancel(reason?: string): void;
  then: <TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined
  ) => Promise<TResult1 | TResult2>;
  private handleDelayElapsed;
  private clearTimeout;
}
export declare function deleteDoc(
  reference: DocumentReference<unknown>
): Promise<void>;
export declare function deleteField(): FieldValue;
declare const enum Direction {
  ASCENDING = 'asc',
  DESCENDING = 'desc'
}
export declare function disableNetwork(
  firestore: FirebaseFirestore
): Promise<void>;
export declare function doc(
  firestore: FirebaseFirestore_2,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData>;
export declare function doc<T>(
  reference: CollectionReference<T>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference<T>;
export declare function doc(
  reference: DocumentReference<unknown>,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData>;
declare class Document_2 extends MaybeDocument {
  private readonly objectValue;
  readonly hasLocalMutations: boolean;
  readonly hasCommittedMutations: boolean;
  constructor(
    key: DocumentKey,
    version: SnapshotVersion,
    objectValue: ObjectValue,
    options: DocumentOptions
  );
  field(path: FieldPath_2): Value | null;
  data(): ObjectValue;
  toProto(): {
    mapValue: MapValue;
  };
  isEqual(other: MaybeDocument | null | undefined): boolean;
  toString(): string;
  get hasPendingWrites(): boolean;
}
export declare interface DocumentChange<T = DocumentData> {
  readonly type: DocumentChangeType;
  readonly doc: QueryDocumentSnapshot<T>;
  readonly oldIndex: number;
  readonly newIndex: number;
}
export declare type DocumentChangeType = 'added' | 'removed' | 'modified';
declare type DocumentComparator = (
  doc1: Document_2,
  doc2: Document_2
) => number;
export declare interface DocumentData {
  [field: string]: any;
}
export declare function documentId(): FieldPath;
declare class DocumentKey {
  readonly path: ResourcePath;
  constructor(path: ResourcePath);
  static fromPath(path: string): DocumentKey;
  static fromName(name: string): DocumentKey;
  hasCollectionId(collectionId: string): boolean;
  isEqual(other: DocumentKey | null): boolean;
  toString(): string;
  static comparator(k1: DocumentKey, k2: DocumentKey): number;
  static isDocumentKey(path: ResourcePath): boolean;
  static fromSegments(segments: string[]): DocumentKey;
}
declare type DocumentKeySet = SortedSet<DocumentKey>;
declare type DocumentMap = SortedMap<DocumentKey, Document_2>;
declare interface DocumentOptions {
  hasLocalMutations?: boolean;
  hasCommittedMutations?: boolean;
}
export declare class DocumentReference<T = DocumentData> {
  readonly _converter: FirestoreDataConverter_2<T> | null;
  readonly _key: DocumentKey;
  readonly type = 'document';
  readonly firestore: FirebaseFirestore_2;
  /** @hideconstructor */
  constructor(
    firestore: FirebaseFirestore_2,
    _converter: FirestoreDataConverter_2<T> | null,
    _key: DocumentKey
  );
  get _path(): ResourcePath;
  get id(): string;
  get path(): string;
  get parent(): CollectionReference<T>;
  withConverter<U>(
    converter: FirestoreDataConverter_2<U>
  ): DocumentReference<U>;
}
declare class DocumentSet {
  static emptySet(oldSet: DocumentSet): DocumentSet;
  private comparator;
  private keyedMap;
  private sortedSet;
  constructor(comp?: DocumentComparator);
  has(key: DocumentKey): boolean;
  get(key: DocumentKey): Document_2 | null;
  first(): Document_2 | null;
  last(): Document_2 | null;
  isEmpty(): boolean;
  indexOf(key: DocumentKey): number;
  get size(): number;
  forEach(cb: (doc: Document_2) => void): void;
  add(doc: Document_2): DocumentSet;
  delete(key: DocumentKey): DocumentSet;
  isEqual(other: DocumentSet | null | undefined): boolean;
  toString(): string;
  private copy;
}
export declare class DocumentSnapshot<
  T = DocumentData
> extends DocumentSnapshot_2<T> {
  readonly _firestore: FirebaseFirestore;
  private readonly _firestoreImpl;
  readonly metadata: SnapshotMetadata;
  /** @hideconstructor protected */
  constructor(
    _firestore: FirebaseFirestore,
    userDataWriter: AbstractUserDataWriter,
    key: DocumentKey,
    document: Document_2 | null,
    metadata: SnapshotMetadata,
    converter: UntypedFirestoreDataConverter<T> | null
  );
  exists(): this is QueryDocumentSnapshot<T>;
  data(options?: SnapshotOptions): T | undefined;
  get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;
}
declare class DocumentSnapshot_2<T = DocumentData> {
  _firestore: FirebaseFirestore_2;
  _userDataWriter: AbstractUserDataWriter;
  _key: DocumentKey;
  _document: Document_2 | null;
  _converter: UntypedFirestoreDataConverter<T> | null;
  constructor(
    _firestore: FirebaseFirestore_2,
    _userDataWriter: AbstractUserDataWriter,
    _key: DocumentKey,
    _document: Document_2 | null,
    _converter: UntypedFirestoreDataConverter<T> | null
  );
  get id(): string;
  get ref(): DocumentReference<T>;
  exists(): this is QueryDocumentSnapshot_2<T>;
  data(): T | undefined;
  get(fieldPath: string | FieldPath): any;
}
declare type DocumentVersionMap = SortedMap<DocumentKey, SnapshotVersion>;
declare interface DocumentViewChange {
  type: ChangeType;
  doc: Document_2;
}
export declare function enableIndexedDbPersistence(
  firestore: FirebaseFirestore,
  persistenceSettings?: PersistenceSettings
): Promise<void>;
export declare function enableMultiTabIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void>;
export declare function enableNetwork(
  firestore: FirebaseFirestore
): Promise<void>;
export declare function endAt(
  snapshot: DocumentSnapshot_2<unknown>
): QueryConstraint;
export declare function endAt(...fieldValues: unknown[]): QueryConstraint;
export declare function endBefore(
  snapshot: DocumentSnapshot_2<unknown>
): QueryConstraint;
export declare function endBefore(...fieldValues: unknown[]): QueryConstraint;
declare interface Entry<K, V> {
  key: K;
  value: V;
}
declare interface EventManager {
  onListen?: (query: Query_2) => Promise<ViewSnapshot>;
  onUnlisten?: (query: Query_2) => Promise<void>;
}
declare type FieldFilterOp =
  | 'OPERATOR_UNSPECIFIED'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'ARRAY_CONTAINS'
  | 'IN'
  | 'ARRAY_CONTAINS_ANY'
  | 'NOT_IN';
declare class FieldMask {
  readonly fields: FieldPath_2[];
  constructor(fields: FieldPath_2[]);
  covers(fieldPath: FieldPath_2): boolean;
  isEqual(other: FieldMask): boolean;
}
export declare class FieldPath {
  readonly _internalPath: FieldPath_2;
  constructor(...fieldNames: string[]);
  isEqual(other: FieldPath): boolean;
}
declare class FieldPath_2 extends BasePath<FieldPath_2> {
  protected construct(
    segments: string[],
    offset?: number,
    length?: number
  ): FieldPath_2;
  private static isValidIdentifier;
  canonicalString(): string;
  toString(): string;
  isKeyField(): boolean;
  static keyField(): FieldPath_2;
  static fromServerFormat(path: string): FieldPath_2;
  static emptyPath(): FieldPath_2;
}
declare class FieldTransform {
  readonly field: FieldPath_2;
  readonly transform: TransformOperation;
  constructor(field: FieldPath_2, transform: TransformOperation);
}
declare type FieldTransformSetToServerValue =
  | 'SERVER_VALUE_UNSPECIFIED'
  | 'REQUEST_TIME';
export declare abstract class FieldValue {
  _methodName: string;
  constructor(_methodName: string);
  abstract isEqual(other: FieldValue): boolean;
  abstract _toFieldTransform(context: ParseContext): FieldTransform | null;
}
declare abstract class Filter {
  abstract matches(doc: Document_2): boolean;
}
export declare class FirebaseFirestore
  extends FirebaseFirestore_2
  implements _FirebaseService {
  readonly _queue: AsyncQueue;
  readonly _persistenceKey: string;
  _firestoreClient: FirestoreClient | undefined;
  /** @hideconstructor */
  constructor(
    databaseIdOrApp: DatabaseId | FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  );
  _terminate(): Promise<void>;
}
declare class FirebaseFirestore_2 implements _FirebaseService {
  readonly _databaseId: DatabaseId;
  readonly _persistenceKey: string;
  _credentials: CredentialsProvider;
  private _settings;
  private _settingsFrozen;
  private _terminateTask?;
  private _app?;
  constructor(
    databaseIdOrApp: DatabaseId | FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  );
  get app(): FirebaseApp;
  get _initialized(): boolean;
  get _terminated(): boolean;
  _setSettings(settings: PrivateSettings): void;
  _getSettings(): FirestoreSettings;
  _freezeSettings(): FirestoreSettings;
  _delete(): Promise<void>;
  protected _terminate(): Promise<void>;
}
declare class FirestoreClient {
  private credentials;
  asyncQueue: AsyncQueue;
  private databaseInfo;
  private user;
  private readonly clientId;
  private credentialListener;
  private readonly receivedInitialUser;
  offlineComponents?: OfflineComponentProvider;
  onlineComponents?: OnlineComponentProvider;
  constructor(
    credentials: CredentialsProvider,
    asyncQueue: AsyncQueue,
    databaseInfo: DatabaseInfo
  );
  getConfiguration(): Promise<ComponentConfiguration>;
  setCredentialChangeListener(listener: (user: User) => void): void;
  verifyNotTerminated(): void;
  terminate(): Promise<void>;
}
export declare interface FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;
  toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    options?: SnapshotOptions
  ): T;
}
declare interface FirestoreDataConverter_2<T>
  extends FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;
  toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
  fromFirestore(snapshot: QueryDocumentSnapshot_2<DocumentData>): T;
}
export declare class FirestoreError extends Error {
  readonly code: FirestoreErrorCode;
  readonly message: string;
  name: string;
  stack?: string;
  constructor(code: FirestoreErrorCode, message: string);
}
export declare type FirestoreErrorCode =
  | 'cancelled'
  | 'unknown'
  | 'invalid-argument'
  | 'deadline-exceeded'
  | 'not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unavailable'
  | 'data-loss'
  | 'unauthenticated';
declare class FirestoreSettings {
  readonly host: string;
  readonly ssl: boolean;
  readonly cacheSizeBytes: number;
  readonly experimentalForceLongPolling: boolean;
  readonly experimentalAutoDetectLongPolling: boolean;
  readonly ignoreUndefinedProperties: boolean;
  credentials?: any;
  constructor(settings: PrivateSettings);
  isEqual(other: FirestoreSettings): boolean;
}
declare namespace firestoreV1ApiClientInterfaces {
  interface ArrayValue {
    values?: Value[];
  }
  interface BatchGetDocumentsRequest {
    database?: string;
    documents?: string[];
    mask?: DocumentMask;
    transaction?: string;
    newTransaction?: TransactionOptions;
    readTime?: string;
  }
  interface BatchGetDocumentsResponse {
    found?: Document;
    missing?: string;
    transaction?: string;
    readTime?: string;
  }
  interface BeginTransactionRequest {
    options?: TransactionOptions;
  }
  interface BeginTransactionResponse {
    transaction?: string;
  }
  interface CollectionSelector {
    collectionId?: string;
    allDescendants?: boolean;
  }
  interface CommitRequest {
    database?: string;
    writes?: Write[];
    transaction?: string;
  }
  interface CommitResponse {
    writeResults?: WriteResult[];
    commitTime?: string;
  }
  interface CompositeFilter {
    op?: CompositeFilterOp;
    filters?: Filter[];
  }
  interface Cursor {
    values?: Value[];
    before?: boolean;
  }
  interface Document {
    name?: string;
    fields?: ApiClientObjectMap<Value>;
    createTime?: Timestamp_2;
    updateTime?: Timestamp_2;
  }
  interface DocumentChange {
    document?: Document;
    targetIds?: number[];
    removedTargetIds?: number[];
  }
  interface DocumentDelete {
    document?: string;
    removedTargetIds?: number[];
    readTime?: Timestamp_2;
  }
  interface DocumentMask {
    fieldPaths?: string[];
  }
  interface DocumentRemove {
    document?: string;
    removedTargetIds?: number[];
    readTime?: string;
  }
  interface DocumentTransform {
    document?: string;
    fieldTransforms?: FieldTransform[];
  }
  interface DocumentsTarget {
    documents?: string[];
  }
  interface Empty {}
  interface ExistenceFilter {
    targetId?: number;
    count?: number;
  }
  interface FieldFilter {
    field?: FieldReference;
    op?: FieldFilterOp;
    value?: Value;
  }
  interface FieldReference {
    fieldPath?: string;
  }
  interface FieldTransform {
    fieldPath?: string;
    setToServerValue?: FieldTransformSetToServerValue;
    appendMissingElements?: ArrayValue;
    removeAllFromArray?: ArrayValue;
    increment?: Value;
  }
  interface Filter {
    compositeFilter?: CompositeFilter;
    fieldFilter?: FieldFilter;
    unaryFilter?: UnaryFilter;
  }
  interface Index {
    name?: string;
    collectionId?: string;
    fields?: IndexField[];
    state?: IndexState;
  }
  interface IndexField {
    fieldPath?: string;
    mode?: IndexFieldMode;
  }
  interface LatLng {
    latitude?: number;
    longitude?: number;
  }
  interface ListCollectionIdsRequest {
    pageSize?: number;
    pageToken?: string;
  }
  interface ListCollectionIdsResponse {
    collectionIds?: string[];
    nextPageToken?: string;
  }
  interface ListDocumentsResponse {
    documents?: Document[];
    nextPageToken?: string;
  }
  interface ListIndexesResponse {
    indexes?: Index[];
    nextPageToken?: string;
  }
  interface ListenRequest {
    addTarget?: Target;
    removeTarget?: number;
    labels?: ApiClientObjectMap<string>;
  }
  interface ListenResponse {
    targetChange?: TargetChange;
    documentChange?: DocumentChange;
    documentDelete?: DocumentDelete;
    documentRemove?: DocumentRemove;
    filter?: ExistenceFilter;
  }
  interface MapValue {
    fields?: ApiClientObjectMap<Value>;
  }
  interface Operation {
    name?: string;
    metadata?: ApiClientObjectMap<any>;
    done?: boolean;
    error?: Status;
    response?: ApiClientObjectMap<any>;
  }
  interface Order {
    field?: FieldReference;
    direction?: OrderDirection;
  }
  interface Precondition {
    exists?: boolean;
    updateTime?: Timestamp_2;
  }
  interface Projection {
    fields?: FieldReference[];
  }
  interface QueryTarget {
    parent?: string;
    structuredQuery?: StructuredQuery;
  }
  interface ReadOnly {
    readTime?: string;
  }
  interface ReadWrite {
    retryTransaction?: string;
  }
  interface RollbackRequest {
    transaction?: string;
  }
  interface RunQueryRequest {
    parent?: string;
    structuredQuery?: StructuredQuery;
    transaction?: string;
    newTransaction?: TransactionOptions;
    readTime?: string;
  }
  interface RunQueryResponse {
    transaction?: string;
    document?: Document;
    readTime?: string;
    skippedResults?: number;
  }
  interface Status {
    code?: number;
    message?: string;
    details?: Array<ApiClientObjectMap<any>>;
  }
  interface StructuredQuery {
    select?: Projection;
    from?: CollectionSelector[];
    where?: Filter;
    orderBy?: Order[];
    startAt?: Cursor;
    endAt?: Cursor;
    offset?: number;
    limit?: number | { value: number };
  }
  interface Target {
    query?: QueryTarget;
    documents?: DocumentsTarget;
    resumeToken?: string | Uint8Array;
    readTime?: Timestamp_2;
    targetId?: number;
    once?: boolean;
  }
  interface TargetChange {
    targetChangeType?: TargetChangeTargetChangeType;
    targetIds?: number[];
    cause?: Status;
    resumeToken?: string | Uint8Array;
    readTime?: Timestamp_2;
  }
  interface TransactionOptions {
    readOnly?: ReadOnly;
    readWrite?: ReadWrite;
  }
  interface UnaryFilter {
    op?: UnaryFilterOp;
    field?: FieldReference;
  }
  interface Value {
    nullValue?: ValueNullValue;
    booleanValue?: boolean;
    integerValue?: string | number;
    doubleValue?: string | number;
    timestampValue?: Timestamp_2;
    stringValue?: string;
    bytesValue?: string | Uint8Array;
    referenceValue?: string;
    geoPointValue?: LatLng;
    arrayValue?: ArrayValue;
    mapValue?: MapValue;
  }
  interface Write {
    update?: Document;
    delete?: string;
    verify?: string;
    transform?: DocumentTransform;
    updateMask?: DocumentMask;
    currentDocument?: Precondition;
  }
  interface WriteRequest {
    streamId?: string;
    writes?: Write[];
    streamToken?: string | Uint8Array;
    labels?: ApiClientObjectMap<string>;
  }
  interface WriteResponse {
    streamId?: string;
    streamToken?: string | Uint8Array;
    writeResults?: WriteResult[];
    commitTime?: Timestamp_2;
  }
  interface WriteResult {
    updateTime?: Timestamp_2;
    transformResults?: Value[];
  }
}
declare interface FirstPartyCredentialsSettings {
  ['type']: 'gapi';
  ['client']: unknown;
  ['sessionIndex']: string;
}
declare type FulfilledHandler<T, R> =
  | ((result: T) => R | PersistencePromise<R>)
  | null;
declare interface GarbageCollectionScheduler {
  readonly started: boolean;
  start(localStore: LocalStore): void;
  stop(): void;
}
export declare class GeoPoint {
  private _lat;
  private _long;
  constructor(latitude: number, longitude: number);
  get latitude(): number;
  get longitude(): number;
  isEqual(other: GeoPoint): boolean;
  toJSON(): {
    latitude: number;
    longitude: number;
  };
  _compareTo(other: GeoPoint): number;
}
export declare function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export declare function getDocFromCache<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export declare function getDocFromServer<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export declare function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
export declare function getDocsFromCache<T>(
  query: Query<T>
): Promise<QuerySnapshot<T>>;
export declare function getDocsFromServer<T>(
  query: Query<T>
): Promise<QuerySnapshot<T>>;
export declare function getFirestore(app: FirebaseApp): FirebaseFirestore;
export declare function increment(n: number): FieldValue;
declare type IndexFieldMode = 'MODE_UNSPECIFIED' | 'ASCENDING' | 'DESCENDING';
declare interface IndexManager {
  addToCollectionParentIndex(
    transaction: PersistenceTransaction,
    collectionPath: ResourcePath
  ): PersistencePromise<void>;
  getCollectionParents(
    transaction: PersistenceTransaction,
    collectionId: string
  ): PersistencePromise<ResourcePath[]>;
}
declare type IndexState = 'STATE_UNSPECIFIED' | 'CREATING' | 'READY' | 'ERROR';
export declare function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore;
declare class JsonProtoSerializer {
  readonly databaseId: DatabaseId;
  readonly useProto3Json: boolean;
  constructor(databaseId: DatabaseId, useProto3Json: boolean);
}
export declare function limit(limit: number): QueryConstraint;
export declare function limitToLast(limit: number): QueryConstraint;
declare const enum LimitType {
  First = 'F',
  Last = 'L'
}
declare type ListenSequenceNumber = number;
declare class LLRBEmptyNode<K, V> {
  get key(): never;
  get value(): never;
  get color(): never;
  get left(): never;
  get right(): never;
  size: number;
  copy(
    key: K | null,
    value: V | null,
    color: boolean | null,
    left: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null,
    right: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null
  ): LLRBEmptyNode<K, V>;
  insert(key: K, value: V, comparator: Comparator<K>): LLRBNode<K, V>;
  remove(key: K, comparator: Comparator<K>): LLRBEmptyNode<K, V>;
  isEmpty(): boolean;
  inorderTraversal(action: (k: K, v: V) => boolean): boolean;
  reverseTraversal(action: (k: K, v: V) => boolean): boolean;
  minKey(): K | null;
  maxKey(): K | null;
  isRed(): boolean;
  checkMaxDepth(): boolean;
  protected check(): 0;
}
declare class LLRBNode<K, V> {
  key: K;
  value: V;
  readonly color: boolean;
  readonly left: LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  readonly right: LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  readonly size: number;
  static EMPTY: LLRBEmptyNode<any, any>;
  static RED: boolean;
  static BLACK: boolean;
  constructor(
    key: K,
    value: V,
    color?: boolean,
    left?: LLRBNode<K, V> | LLRBEmptyNode<K, V>,
    right?: LLRBNode<K, V> | LLRBEmptyNode<K, V>
  );
  copy(
    key: K | null,
    value: V | null,
    color: boolean | null,
    left: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null,
    right: LLRBNode<K, V> | LLRBEmptyNode<K, V> | null
  ): LLRBNode<K, V>;
  isEmpty(): boolean;
  inorderTraversal<T>(action: (k: K, v: V) => T): T;
  reverseTraversal<T>(action: (k: K, v: V) => T): T;
  private min;
  minKey(): K | null;
  maxKey(): K | null;
  insert(key: K, value: V, comparator: Comparator<K>): LLRBNode<K, V>;
  private removeMin;
  remove(
    key: K,
    comparator: Comparator<K>
  ): LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  isRed(): boolean;
  private fixUp;
  private moveRedLeft;
  private moveRedRight;
  private rotateLeft;
  private rotateRight;
  private colorFlip;
  checkMaxDepth(): boolean;
  protected check(): number;
}
declare interface LocalStore {
  collectGarbage(garbageCollector: LruGarbageCollector): Promise<LruResults>;
}
export { LogLevel };
declare interface LruDelegate {
  readonly garbageCollector: LruGarbageCollector;
  forEachTarget(
    txn: PersistenceTransaction,
    f: (target: TargetData) => void
  ): PersistencePromise<void>;
  getSequenceNumberCount(
    txn: PersistenceTransaction
  ): PersistencePromise<number>;
  forEachOrphanedDocumentSequenceNumber(
    txn: PersistenceTransaction,
    f: (sequenceNumber: ListenSequenceNumber) => void
  ): PersistencePromise<void>;
  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number>;
  removeOrphanedDocuments(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<number>;
  getCacheSize(txn: PersistenceTransaction): PersistencePromise<number>;
}
declare class LruGarbageCollector {
  private readonly delegate;
  readonly params: LruParams;
  constructor(delegate: LruDelegate, params: LruParams);
  calculateTargetCount(
    txn: PersistenceTransaction,
    percentile: number
  ): PersistencePromise<number>;
  nthSequenceNumber(
    txn: PersistenceTransaction,
    n: number
  ): PersistencePromise<ListenSequenceNumber>;
  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number>;
  removeOrphanedDocuments(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<number>;
  collect(
    txn: PersistenceTransaction,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<LruResults>;
  getCacheSize(txn: PersistenceTransaction): PersistencePromise<number>;
  private runGarbageCollection;
}
declare class LruParams {
  readonly cacheSizeCollectionThreshold: number;
  readonly percentileToCollect: number;
  readonly maximumSequenceNumbersToCollect: number;
  private static readonly DEFAULT_COLLECTION_PERCENTILE;
  private static readonly DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT;
  static withCacheSize(cacheSize: number): LruParams;
  static readonly DEFAULT: LruParams;
  static readonly DISABLED: LruParams;
  constructor(
    cacheSizeCollectionThreshold: number,
    percentileToCollect: number,
    maximumSequenceNumbersToCollect: number
  );
}
declare interface LruResults {
  readonly didRun: boolean;
  readonly sequenceNumbersCollected: number;
  readonly targetsRemoved: number;
  readonly documentsRemoved: number;
}
declare type MapValue = firestoreV1ApiClientInterfaces.MapValue;
declare abstract class MaybeDocument {
  readonly key: DocumentKey;
  readonly version: SnapshotVersion;
  constructor(key: DocumentKey, version: SnapshotVersion);
  abstract get hasPendingWrites(): boolean;
  abstract isEqual(other: MaybeDocument | null | undefined): boolean;
  abstract toString(): string;
}
declare type MaybeDocumentMap = SortedMap<DocumentKey, MaybeDocument>;
declare abstract class Mutation {
  abstract readonly type: MutationType;
  abstract readonly key: DocumentKey;
  abstract readonly precondition: Precondition;
}
declare class MutationBatch {
  batchId: BatchId;
  localWriteTime: Timestamp;
  baseMutations: Mutation[];
  mutations: Mutation[];
  constructor(
    batchId: BatchId,
    localWriteTime: Timestamp,
    baseMutations: Mutation[],
    mutations: Mutation[]
  );
  applyToRemoteDocument(
    docKey: DocumentKey,
    maybeDoc: MaybeDocument | null,
    batchResult: MutationBatchResult
  ): MaybeDocument | null;
  applyToLocalView(
    docKey: DocumentKey,
    maybeDoc: MaybeDocument | null
  ): MaybeDocument | null;
  applyToLocalDocumentSet(maybeDocs: MaybeDocumentMap): MaybeDocumentMap;
  keys(): DocumentKeySet;
  isEqual(other: MutationBatch): boolean;
}
declare class MutationBatchResult {
  readonly batch: MutationBatch;
  readonly commitVersion: SnapshotVersion;
  readonly mutationResults: MutationResult[];
  readonly docVersions: DocumentVersionMap;
  private constructor();
  static from(
    batch: MutationBatch,
    commitVersion: SnapshotVersion,
    results: MutationResult[]
  ): MutationBatchResult;
}
declare interface MutationQueue {
  checkEmpty(transaction: PersistenceTransaction): PersistencePromise<boolean>;
  addMutationBatch(
    transaction: PersistenceTransaction,
    localWriteTime: Timestamp,
    baseMutations: Mutation[],
    mutations: Mutation[]
  ): PersistencePromise<MutationBatch>;
  lookupMutationBatch(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch | null>;
  getNextMutationBatchAfterBatchId(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch | null>;
  getHighestUnacknowledgedBatchId(
    transaction: PersistenceTransaction
  ): PersistencePromise<BatchId>;
  getAllMutationBatches(
    transaction: PersistenceTransaction
  ): PersistencePromise<MutationBatch[]>;
  getAllMutationBatchesAffectingDocumentKey(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutationBatch[]>;
  getAllMutationBatchesAffectingDocumentKeys(
    transaction: PersistenceTransaction,
    documentKeys: SortedMap<DocumentKey, unknown>
  ): PersistencePromise<MutationBatch[]>;
  getAllMutationBatchesAffectingQuery(
    transaction: PersistenceTransaction,
    query: Query_2
  ): PersistencePromise<MutationBatch[]>;
  removeMutationBatch(
    transaction: PersistenceTransaction,
    batch: MutationBatch
  ): PersistencePromise<void>;
  performConsistencyCheck(
    transaction: PersistenceTransaction
  ): PersistencePromise<void>;
}
declare class MutationResult {
  readonly version: SnapshotVersion;
  readonly transformResults: Array<Value | null> | null;
  constructor(
    version: SnapshotVersion,
    transformResults: Array<Value | null> | null
  );
}
declare const enum MutationType {
  Set = 0,
  Patch = 1,
  Transform = 2,
  Delete = 3,
  Verify = 4
}
declare interface NamedQuery {
  readonly name: string;
  readonly query: Query_2;
  readonly readTime: SnapshotVersion;
}
declare type NullableMaybeDocumentMap = SortedMap<
  DocumentKey,
  MaybeDocument | null
>;
declare class ObjectMap<KeyType, ValueType> {
  private mapKeyFn;
  private equalsFn;
  private inner;
  constructor(
    mapKeyFn: (key: KeyType) => string,
    equalsFn: (l: KeyType, r: KeyType) => boolean
  );
  get(key: KeyType): ValueType | undefined;
  has(key: KeyType): boolean;
  set(key: KeyType, value: ValueType): void;
  delete(key: KeyType): boolean;
  forEach(fn: (key: KeyType, val: ValueType) => void): void;
  isEmpty(): boolean;
}
declare class ObjectValue {
  readonly proto: {
    mapValue: MapValue;
  };
  constructor(proto: { mapValue: MapValue });
  static empty(): ObjectValue;
  field(path: FieldPath_2): Value | null;
  isEqual(other: ObjectValue): boolean;
}
declare interface OfflineComponentProvider {
  persistence: Persistence;
  sharedClientState: SharedClientState;
  localStore: LocalStore;
  gcScheduler: GarbageCollectionScheduler | null;
  synchronizeTabs: boolean;
  initialize(cfg: ComponentConfiguration): Promise<void>;
  terminate(): Promise<void>;
}
declare class OnlineComponentProvider {
  protected localStore: LocalStore;
  protected sharedClientState: SharedClientState;
  datastore: Datastore;
  eventManager: EventManager;
  remoteStore: RemoteStore;
  syncEngine: SyncEngine;
  initialize(
    offlineComponentProvider: OfflineComponentProvider,
    cfg: ComponentConfiguration
  ): Promise<void>;
  createEventManager(cfg: ComponentConfiguration): EventManager;
  createDatastore(cfg: ComponentConfiguration): Datastore;
  createRemoteStore(cfg: ComponentConfiguration): RemoteStore;
  createSyncEngine(
    cfg: ComponentConfiguration,
    startAsPrimary: boolean
  ): SyncEngine;
  terminate(): Promise<void>;
}
declare const enum OnlineState {
  Unknown = 'Unknown',
  Online = 'Online',
  Offline = 'Offline'
}
export declare function onSnapshot<T>(
  reference: DocumentReference<T>,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export declare function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export declare function onSnapshot<T>(
  reference: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export declare function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export declare function onSnapshot<T>(
  query: Query<T>,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export declare function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export declare function onSnapshot<T>(
  query: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export declare function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export declare function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  observer: {
    next?: (value: void) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export declare function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  onSync: () => void
): Unsubscribe;
declare class OrderBy {
  readonly field: FieldPath_2;
  readonly dir: Direction;
  constructor(field: FieldPath_2, dir?: Direction);
}
export declare function orderBy(
  fieldPath: string | FieldPath,
  directionStr?: OrderByDirection
): QueryConstraint;
export declare type OrderByDirection = 'desc' | 'asc';
declare type OrderDirection =
  | 'DIRECTION_UNSPECIFIED'
  | 'ASCENDING'
  | 'DESCENDING';
declare class ParseContext {
  readonly settings: ContextSettings;
  readonly databaseId: DatabaseId;
  readonly serializer: JsonProtoSerializer;
  readonly ignoreUndefinedProperties: boolean;
  readonly fieldTransforms: FieldTransform[];
  readonly fieldMask: FieldPath_2[];
  constructor(
    settings: ContextSettings,
    databaseId: DatabaseId,
    serializer: JsonProtoSerializer,
    ignoreUndefinedProperties: boolean,
    fieldTransforms?: FieldTransform[],
    fieldMask?: FieldPath_2[]
  );
  get path(): FieldPath_2 | undefined;
  get dataSource(): UserDataSource;
  contextWith(configuration: Partial<ContextSettings>): ParseContext;
  childContextForField(field: string): ParseContext;
  childContextForFieldPath(field: FieldPath_2): ParseContext;
  childContextForArray(index: number): ParseContext;
  createError(reason: string): FirestoreError;
  contains(fieldPath: FieldPath_2): boolean;
  private validatePath;
  private validatePathSegment;
}
declare class ParsedSetData {
  readonly data: ObjectValue;
  readonly fieldMask: FieldMask | null;
  readonly fieldTransforms: FieldTransform[];
  constructor(
    data: ObjectValue,
    fieldMask: FieldMask | null,
    fieldTransforms: FieldTransform[]
  );
  toMutations(key: DocumentKey, precondition: Precondition): Mutation[];
}
declare class ParsedUpdateData {
  readonly data: ObjectValue;
  readonly fieldMask: FieldMask;
  readonly fieldTransforms: FieldTransform[];
  constructor(
    data: ObjectValue,
    fieldMask: FieldMask,
    fieldTransforms: FieldTransform[]
  );
  toMutations(key: DocumentKey, precondition: Precondition): Mutation[];
}
declare interface Persistence {
  readonly started: boolean;
  readonly referenceDelegate: ReferenceDelegate;
  start(): Promise<void>;
  shutdown(): Promise<void>;
  setDatabaseDeletedListener(
    databaseDeletedListener: () => Promise<void>
  ): void;
  setNetworkEnabled(networkEnabled: boolean): void;
  getMutationQueue(user: User): MutationQueue;
  getTargetCache(): TargetCache;
  getRemoteDocumentCache(): RemoteDocumentCache;
  getBundleCache(): BundleCache;
  getIndexManager(): IndexManager;
  runTransaction<T>(
    action: string,
    mode: PersistenceTransactionMode,
    transactionOperation: (
      transaction: PersistenceTransaction
    ) => PersistencePromise<T>
  ): Promise<T>;
}
declare class PersistencePromise<T> {
  private nextCallback;
  private catchCallback;
  private result;
  private error;
  private isDone;
  private callbackAttached;
  constructor(callback: (resolve: Resolver<T>, reject: Rejector) => void);
  catch<R>(
    fn: (error: Error) => R | PersistencePromise<R>
  ): PersistencePromise<R>;
  next<R>(
    nextFn?: FulfilledHandler<T, R>,
    catchFn?: RejectedHandler<R>
  ): PersistencePromise<R>;
  toPromise(): Promise<T>;
  private wrapUserFunction;
  private wrapSuccess;
  private wrapFailure;
  static resolve(): PersistencePromise<void>;
  static resolve<R>(result: R): PersistencePromise<R>;
  static reject<R>(error: Error): PersistencePromise<R>;
  static waitFor(all: {
    forEach: (cb: (el: PersistencePromise<any>) => void) => void;
  }): PersistencePromise<void>;
  static or(
    predicates: Array<() => PersistencePromise<boolean>>
  ): PersistencePromise<boolean>;
  static forEach<R, S>(
    collection: {
      forEach: (cb: (r: R, s: S) => void) => void;
    },
    f:
      | ((r: R, s: S) => PersistencePromise<void>)
      | ((r: R) => PersistencePromise<void>)
  ): PersistencePromise<void>;
  static forEach<R>(
    collection: {
      forEach: (cb: (r: R) => void) => void;
    },
    f: (r: R) => PersistencePromise<void>
  ): PersistencePromise<void>;
}
export declare interface PersistenceSettings {
  forceOwnership?: boolean;
}
declare abstract class PersistenceTransaction {
  private readonly onCommittedListeners;
  abstract readonly currentSequenceNumber: ListenSequenceNumber;
  addOnCommittedListener(listener: () => void): void;
  raiseOnCommittedEvent(): void;
}
declare type PersistenceTransactionMode =
  | 'readonly'
  | 'readwrite'
  | 'readwrite-primary';
declare class Precondition {
  readonly updateTime?: SnapshotVersion | undefined;
  readonly exists?: boolean | undefined;
  private constructor();
  static none(): Precondition;
  static exists(exists: boolean): Precondition;
  static updateTime(version: SnapshotVersion): Precondition;
  get isNone(): boolean;
  isEqual(other: Precondition): boolean;
}
declare interface PrivateSettings extends Settings {
  credentials?: CredentialsSettings;
}
declare interface ProviderCredentialsSettings {
  ['type']: 'provider';
  ['client']: CredentialsProvider;
}
export declare class Query<T = DocumentData> {
  readonly _converter: FirestoreDataConverter_2<T> | null;
  readonly _query: Query_2;
  readonly type: 'query' | 'collection';
  readonly firestore: FirebaseFirestore_2;
  /** @hideconstructor protected */
  constructor(
    firestore: FirebaseFirestore_2,
    _converter: FirestoreDataConverter_2<T> | null,
    _query: Query_2
  );
  withConverter<U>(converter: FirestoreDataConverter_2<U>): Query<U>;
}
export declare function query<T>(
  query: Query<T>,
  ...queryConstraints: QueryConstraint[]
): Query<T>;
declare interface Query_2 {
  readonly path: ResourcePath;
  readonly collectionGroup: string | null;
  readonly explicitOrderBy: OrderBy[];
  readonly filters: Filter[];
  readonly limit: number | null;
  readonly limitType: LimitType;
  readonly startAt: Bound | null;
  readonly endAt: Bound | null;
}
export declare abstract class QueryConstraint {
  abstract readonly type: QueryConstraintType;
  abstract _apply<T>(query: Query<T>): Query<T>;
}
export declare type QueryConstraintType =
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'limitToLast'
  | 'startAt'
  | 'startAfter'
  | 'endAt'
  | 'endBefore';
export declare class QueryDocumentSnapshot<
  T = DocumentData
> extends DocumentSnapshot<T> {
  data(options?: SnapshotOptions): T;
}
declare class QueryDocumentSnapshot_2<
  T = DocumentData
> extends DocumentSnapshot_2<T> {
  data(): T;
}
export declare function queryEqual<T>(left: Query<T>, right: Query<T>): boolean;
export declare class QuerySnapshot<T = DocumentData> {
  readonly _firestore: FirebaseFirestore;
  readonly _userDataWriter: AbstractUserDataWriter;
  readonly _snapshot: ViewSnapshot;
  readonly metadata: SnapshotMetadata;
  readonly query: Query<T>;
  private _cachedChanges?;
  private _cachedChangesIncludeMetadataChanges?;
  /** @hideconstructor */
  constructor(
    _firestore: FirebaseFirestore,
    _userDataWriter: AbstractUserDataWriter,
    query: Query<T>,
    _snapshot: ViewSnapshot
  );
  get docs(): Array<QueryDocumentSnapshot<T>>;
  get size(): number;
  get empty(): boolean;
  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
  ): void;
  docChanges(options?: SnapshotListenOptions): Array<DocumentChange<T>>;
}
declare type QueryTargetState = 'not-current' | 'current' | 'rejected';
export declare function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean;
declare interface ReferenceDelegate {
  addReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    doc: DocumentKey
  ): PersistencePromise<void>;
  removeReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    doc: DocumentKey
  ): PersistencePromise<void>;
  removeTarget(
    txn: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void>;
  markPotentiallyOrphaned(
    txn: PersistenceTransaction,
    doc: DocumentKey
  ): PersistencePromise<void>;
  updateLimboDocument(
    txn: PersistenceTransaction,
    doc: DocumentKey
  ): PersistencePromise<void>;
}
declare type RejectedHandler<R> =
  | ((reason: Error) => R | PersistencePromise<R>)
  | null;
declare type Rejector = (error: Error) => void;
declare interface RemoteDocumentCache {
  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null>;
  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap>;
  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query_2,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<DocumentMap>;
  newChangeBuffer(options?: {
    trackRemovals: boolean;
  }): RemoteDocumentChangeBuffer;
  getSize(transaction: PersistenceTransaction): PersistencePromise<number>;
}
declare interface RemoteDocumentChange {
  readonly maybeDocument: MaybeDocument | null;
  readonly readTime: SnapshotVersion | null;
}
declare abstract class RemoteDocumentChangeBuffer {
  protected changes: ObjectMap<DocumentKey, RemoteDocumentChange>;
  private changesApplied;
  protected abstract getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null>;
  protected abstract getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap>;
  protected abstract applyChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<void>;
  protected getReadTime(key: DocumentKey): SnapshotVersion;
  addEntry(maybeDocument: MaybeDocument, readTime: SnapshotVersion): void;
  removeEntry(key: DocumentKey, readTime?: SnapshotVersion | null): void;
  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null>;
  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap>;
  apply(transaction: PersistenceTransaction): PersistencePromise<void>;
  protected assertNotApplied(): void;
}
declare class RemoteEvent {
  readonly snapshotVersion: SnapshotVersion;
  readonly targetChanges: Map<TargetId, TargetChange>;
  readonly targetMismatches: SortedSet<TargetId>;
  readonly documentUpdates: MaybeDocumentMap;
  readonly resolvedLimboDocuments: DocumentKeySet;
  constructor(
    snapshotVersion: SnapshotVersion,
    targetChanges: Map<TargetId, TargetChange>,
    targetMismatches: SortedSet<TargetId>,
    documentUpdates: MaybeDocumentMap,
    resolvedLimboDocuments: DocumentKeySet
  );
  static createSynthesizedRemoteEventForCurrentChange(
    targetId: TargetId,
    current: boolean
  ): RemoteEvent;
}
declare interface RemoteStore {
  remoteSyncer: RemoteSyncer;
}
declare interface RemoteSyncer {
  applyRemoteEvent?(remoteEvent: RemoteEvent): Promise<void>;
  rejectListen?(targetId: TargetId, error: FirestoreError): Promise<void>;
  applySuccessfulWrite?(result: MutationBatchResult): Promise<void>;
  rejectFailedWrite?(batchId: BatchId, error: FirestoreError): Promise<void>;
  getRemoteKeysForTarget?(targetId: TargetId): DocumentKeySet;
  handleCredentialChange?(user: User): Promise<void>;
}
declare type Resolver<T> = (value?: T) => void;
declare class ResourcePath extends BasePath<ResourcePath> {
  protected construct(
    segments: string[],
    offset?: number,
    length?: number
  ): ResourcePath;
  canonicalString(): string;
  toString(): string;
  static fromString(...pathComponents: string[]): ResourcePath;
  static emptyPath(): ResourcePath;
}
export declare function runTransaction<T>(
  firestore: FirebaseFirestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T>;
export declare function serverTimestamp(): FieldValue;
declare type ServerTimestampBehavior = 'estimate' | 'previous' | 'none';
export declare function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
export declare function setDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T>,
  options: SetOptions
): Promise<void>;
export declare function setLogLevel(logLevel: LogLevel): void;
export declare type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };
declare interface Settings_2 {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
  experimentalAutoDetectLongPolling?: boolean;
}
export declare interface Settings extends Settings_2 {
  cacheSizeBytes?: number;
}
declare interface SharedClientState {
  onlineStateHandler: ((onlineState: OnlineState) => void) | null;
  sequenceNumberHandler:
    | ((sequenceNumber: ListenSequenceNumber) => void)
    | null;
  addPendingMutation(batchId: BatchId): void;
  updateMutationState(
    batchId: BatchId,
    state: 'acknowledged' | 'rejected',
    error?: FirestoreError
  ): void;
  addLocalQueryTarget(targetId: TargetId): QueryTargetState;
  removeLocalQueryTarget(targetId: TargetId): void;
  isLocalQueryTarget(targetId: TargetId): boolean;
  updateQueryState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void;
  clearQueryState(targetId: TargetId): void;
  getAllActiveQueryTargets(): SortedSet<TargetId>;
  isActiveQueryTarget(targetId: TargetId): boolean;
  start(): Promise<void>;
  shutdown(): void;
  handleUserChange(
    user: User,
    removedBatchIds: BatchId[],
    addedBatchIds: BatchId[]
  ): void;
  setOnlineState(onlineState: OnlineState): void;
  writeSequenceNumber(sequenceNumber: ListenSequenceNumber): void;
  notifyBundleLoaded(): void;
}
export declare function snapshotEqual<T>(
  left: DocumentSnapshot<T> | QuerySnapshot<T>,
  right: DocumentSnapshot<T> | QuerySnapshot<T>
): boolean;
export declare interface SnapshotListenOptions {
  readonly includeMetadataChanges?: boolean;
}
export declare class SnapshotMetadata implements SnapshotMetadata_2 {
  readonly hasPendingWrites: boolean;
  readonly fromCache: boolean;
  /** @hideconstructor */
  constructor(hasPendingWrites: boolean, fromCache: boolean);
  isEqual(other: SnapshotMetadata_2): boolean;
}
export declare interface SnapshotOptions {
  readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
}
declare class SnapshotVersion {
  private timestamp;
  static fromTimestamp(value: Timestamp): SnapshotVersion;
  static min(): SnapshotVersion;
  private constructor();
  compareTo(other: SnapshotVersion): number;
  isEqual(other: SnapshotVersion): boolean;
  toMicroseconds(): number;
  toString(): string;
  toTimestamp(): Timestamp;
}
declare class SortedMap<K, V> {
  comparator: Comparator<K>;
  root: LLRBNode<K, V> | LLRBEmptyNode<K, V>;
  constructor(
    comparator: Comparator<K>,
    root?: LLRBNode<K, V> | LLRBEmptyNode<K, V>
  );
  insert(key: K, value: V): SortedMap<K, V>;
  remove(key: K): SortedMap<K, V>;
  get(key: K): V | null;
  indexOf(key: K): number;
  isEmpty(): boolean;
  get size(): number;
  minKey(): K | null;
  maxKey(): K | null;
  inorderTraversal<T>(action: (k: K, v: V) => T): T;
  forEach(fn: (k: K, v: V) => void): void;
  toString(): string;
  reverseTraversal<T>(action: (k: K, v: V) => T): T;
  getIterator(): SortedMapIterator<K, V>;
  getIteratorFrom(key: K): SortedMapIterator<K, V>;
  getReverseIterator(): SortedMapIterator<K, V>;
  getReverseIteratorFrom(key: K): SortedMapIterator<K, V>;
}
declare class SortedMapIterator<K, V> {
  private isReverse;
  private nodeStack;
  constructor(
    node: LLRBNode<K, V> | LLRBEmptyNode<K, V>,
    startKey: K | null,
    comparator: Comparator<K>,
    isReverse: boolean
  );
  getNext(): Entry<K, V>;
  hasNext(): boolean;
  peek(): Entry<K, V> | null;
}
declare class SortedSet<T> {
  private comparator;
  private data;
  constructor(comparator: (left: T, right: T) => number);
  has(elem: T): boolean;
  first(): T | null;
  last(): T | null;
  get size(): number;
  indexOf(elem: T): number;
  forEach(cb: (elem: T) => void): void;
  forEachInRange(range: [T, T], cb: (elem: T) => void): void;
  forEachWhile(cb: (elem: T) => boolean, start?: T): void;
  firstAfterOrEqual(elem: T): T | null;
  getIterator(): SortedSetIterator<T>;
  getIteratorFrom(key: T): SortedSetIterator<T>;
  add(elem: T): SortedSet<T>;
  delete(elem: T): SortedSet<T>;
  isEmpty(): boolean;
  unionWith(other: SortedSet<T>): SortedSet<T>;
  isEqual(other: SortedSet<T>): boolean;
  toArray(): T[];
  toString(): string;
  private copy;
}
declare class SortedSetIterator<T> {
  private iter;
  constructor(iter: SortedMapIterator<T, boolean>);
  getNext(): T;
  hasNext(): boolean;
}
export declare function startAfter(
  snapshot: DocumentSnapshot_2<unknown>
): QueryConstraint;
export declare function startAfter(...fieldValues: unknown[]): QueryConstraint;
export declare function startAt(
  snapshot: DocumentSnapshot_2<unknown>
): QueryConstraint;
export declare function startAt(...fieldValues: unknown[]): QueryConstraint;
declare interface SyncEngine {
  isPrimaryClient: boolean;
}
declare interface Target {
  readonly path: ResourcePath;
  readonly collectionGroup: string | null;
  readonly orderBy: OrderBy[];
  readonly filters: Filter[];
  readonly limit: number | null;
  readonly startAt: Bound | null;
  readonly endAt: Bound | null;
}
declare interface TargetCache {
  getLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction
  ): PersistencePromise<SnapshotVersion>;
  getHighestSequenceNumber(
    transaction: PersistenceTransaction
  ): PersistencePromise<ListenSequenceNumber>;
  forEachTarget(
    txn: PersistenceTransaction,
    f: (q: TargetData) => void
  ): PersistencePromise<void>;
  setTargetsMetadata(
    transaction: PersistenceTransaction,
    highestListenSequenceNumber: number,
    lastRemoteSnapshotVersion?: SnapshotVersion
  ): PersistencePromise<void>;
  addTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void>;
  updateTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void>;
  removeTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void>;
  getTargetCount(
    transaction: PersistenceTransaction
  ): PersistencePromise<number>;
  getTargetData(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<TargetData | null>;
  addMatchingKeys(
    transaction: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void>;
  removeMatchingKeys(
    transaction: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void>;
  removeMatchingKeysForTargetId(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<void>;
  getMatchingKeysForTargetId(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<DocumentKeySet>;
  allocateTargetId(
    transaction: PersistenceTransaction
  ): PersistencePromise<TargetId>;
  containsKey(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean>;
}
declare class TargetChange {
  readonly resumeToken: ByteString;
  readonly current: boolean;
  readonly addedDocuments: DocumentKeySet;
  readonly modifiedDocuments: DocumentKeySet;
  readonly removedDocuments: DocumentKeySet;
  constructor(
    resumeToken: ByteString,
    current: boolean,
    addedDocuments: DocumentKeySet,
    modifiedDocuments: DocumentKeySet,
    removedDocuments: DocumentKeySet
  );
  static createSynthesizedTargetChangeForCurrentChange(
    targetId: TargetId,
    current: boolean
  ): TargetChange;
}
declare type TargetChangeTargetChangeType =
  | 'NO_CHANGE'
  | 'ADD'
  | 'REMOVE'
  | 'CURRENT'
  | 'RESET';
declare class TargetData {
  readonly target: Target;
  readonly targetId: TargetId;
  readonly purpose: TargetPurpose;
  readonly sequenceNumber: ListenSequenceNumber;
  readonly snapshotVersion: SnapshotVersion;
  readonly lastLimboFreeSnapshotVersion: SnapshotVersion;
  readonly resumeToken: ByteString;
  constructor(
    target: Target,
    targetId: TargetId,
    purpose: TargetPurpose,
    sequenceNumber: ListenSequenceNumber,
    snapshotVersion?: SnapshotVersion,
    lastLimboFreeSnapshotVersion?: SnapshotVersion,
    resumeToken?: ByteString
  );
  withSequenceNumber(sequenceNumber: number): TargetData;
  withResumeToken(
    resumeToken: ByteString,
    snapshotVersion: SnapshotVersion
  ): TargetData;
  withLastLimboFreeSnapshotVersion(
    lastLimboFreeSnapshotVersion: SnapshotVersion
  ): TargetData;
}
declare type TargetId = number;
declare const enum TargetPurpose {
  Listen = 0,
  ExistenceFilterMismatch = 1,
  LimboResolution = 2
}
export declare function terminate(firestore: FirebaseFirestore): Promise<void>;
declare const enum TimerId {
  All = 'all',
  ListenStreamIdle = 'listen_stream_idle',
  ListenStreamConnectionBackoff = 'listen_stream_connection_backoff',
  WriteStreamIdle = 'write_stream_idle',
  WriteStreamConnectionBackoff = 'write_stream_connection_backoff',
  OnlineStateTimeout = 'online_state_timeout',
  ClientMetadataRefresh = 'client_metadata_refresh',
  LruGarbageCollection = 'lru_garbage_collection',
  TransactionRetry = 'transaction_retry',
  AsyncQueueRetry = 'async_queue_retry'
}
export declare class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  static now(): Timestamp;
  static fromDate(date: Date): Timestamp;
  static fromMillis(milliseconds: number): Timestamp;
  constructor(seconds: number, nanoseconds: number);
  toDate(): Date;
  toMillis(): number;
  _compareTo(other: Timestamp): number;
  isEqual(other: Timestamp): boolean;
  toString(): string;
  toJSON(): {
    seconds: number;
    nanoseconds: number;
  };
  valueOf(): string;
}
declare type Timestamp_2 =
  | string
  | { seconds?: string | number; nanos?: number };
declare interface Token {
  type: TokenType;
  user: User;
  authHeaders: {
    [header: string]: string;
  };
}
declare type TokenType = 'OAuth' | 'FirstParty';
export declare class Transaction extends Transaction_2 {
  protected readonly _firestore: FirebaseFirestore;
  /** @hideconstructor */
  constructor(_firestore: FirebaseFirestore, _transaction: Transaction_3);
  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
}
declare class Transaction_2 {
  protected readonly _firestore: FirebaseFirestore_2;
  private readonly _transaction;
  private readonly _dataReader;
  constructor(_firestore: FirebaseFirestore_2, _transaction: Transaction_3);
  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot_2<T>>;
  set<T>(documentRef: DocumentReference<T>, data: T): this;
  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: SetOptions
  ): this;
  update(documentRef: DocumentReference<unknown>, data: UpdateData): this;
  update(
    documentRef: DocumentReference<unknown>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this;
  delete(documentRef: DocumentReference<unknown>): this;
}
declare class Transaction_3 {
  private datastore;
  private readVersions;
  private mutations;
  private committed;
  private lastWriteError;
  private writtenDocs;
  constructor(datastore: Datastore);
  lookup(keys: DocumentKey[]): Promise<MaybeDocument[]>;
  set(key: DocumentKey, data: ParsedSetData): void;
  update(key: DocumentKey, data: ParsedUpdateData): void;
  delete(key: DocumentKey): void;
  commit(): Promise<void>;
  private recordVersion;
  private precondition;
  private preconditionForUpdate;
  private write;
  private ensureCommitNotCalled;
}
declare class TransformOperation {
  private _;
}
declare type UnaryFilterOp =
  | 'OPERATOR_UNSPECIFIED'
  | 'IS_NAN'
  | 'IS_NULL'
  | 'IS_NOT_NAN'
  | 'IS_NOT_NULL';
export declare interface Unsubscribe {
  (): void;
}
declare interface UntypedFirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData_2;
  toFirestore(modelObject: Partial<T>, options: SetOptions_2): DocumentData_2;
  fromFirestore(snapshot: unknown, options?: unknown): T;
}
export declare interface UpdateData {
  [fieldPath: string]: any;
}
export declare function updateDoc(
  reference: DocumentReference<unknown>,
  data: UpdateData
): Promise<void>;
export declare function updateDoc(
  reference: DocumentReference<unknown>,
  field: string | FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
declare class User {
  readonly uid: string | null;
  static readonly UNAUTHENTICATED: User;
  static readonly GOOGLE_CREDENTIALS: User;
  static readonly FIRST_PARTY: User;
  constructor(uid: string | null);
  isAuthenticated(): boolean;
  toKey(): string;
  isEqual(otherUser: User): boolean;
}
declare const enum UserDataSource {
  Set = 0,
  Update = 1,
  MergeSet = 2,
  Argument = 3,
  ArrayArgument = 4
}
declare type Value = firestoreV1ApiClientInterfaces.Value;
declare type ValueNullValue = 'NULL_VALUE';
declare class ViewSnapshot {
  readonly query: Query_2;
  readonly docs: DocumentSet;
  readonly oldDocs: DocumentSet;
  readonly docChanges: DocumentViewChange[];
  readonly mutatedKeys: DocumentKeySet;
  readonly fromCache: boolean;
  readonly syncStateChanged: boolean;
  readonly excludesMetadataChanges: boolean;
  constructor(
    query: Query_2,
    docs: DocumentSet,
    oldDocs: DocumentSet,
    docChanges: DocumentViewChange[],
    mutatedKeys: DocumentKeySet,
    fromCache: boolean,
    syncStateChanged: boolean,
    excludesMetadataChanges: boolean
  );
  static fromInitialDocuments(
    query: Query_2,
    documents: DocumentSet,
    mutatedKeys: DocumentKeySet,
    fromCache: boolean
  ): ViewSnapshot;
  get hasPendingWrites(): boolean;
  isEqual(other: ViewSnapshot): boolean;
}
export declare function waitForPendingWrites(
  firestore: FirebaseFirestore
): Promise<void>;
export declare function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: unknown
): QueryConstraint;
export declare type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any'
  | 'not-in';
export declare class WriteBatch {
  private readonly _firestore;
  private readonly _commitHandler;
  private readonly _dataReader;
  private _mutations;
  private _committed;
  /** @hideconstructor */
  constructor(
    _firestore: FirebaseFirestore_2,
    _commitHandler: (m: Mutation[]) => Promise<void>
  );
  set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: SetOptions
  ): WriteBatch;
  update(documentRef: DocumentReference<unknown>, data: UpdateData): WriteBatch;
  update(
    documentRef: DocumentReference<unknown>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  delete(documentRef: DocumentReference<unknown>): WriteBatch;
  commit(): Promise<void>;
  private _verifyNotCommitted;
}
export declare function writeBatch(firestore: FirebaseFirestore): WriteBatch;
export {};
