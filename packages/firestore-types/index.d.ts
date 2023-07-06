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

import { EmulatorMockTokenOptions } from '@firebase/util';

export type DocumentData = { [field: string]: any };

export type UpdateData = { [fieldPath: string]: any };

export const CACHE_SIZE_UNLIMITED: number;

export interface Settings {
  host?: string;
  ssl?: boolean;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
  experimentalAutoDetectLongPolling?: boolean;
  ignoreUndefinedProperties?: boolean;
  merge?: boolean;
}

export interface PersistenceSettings {
  synchronizeTabs?: boolean;
  experimentalTabSynchronization?: boolean;
  experimentalForceOwningTab?: boolean;
}

export type LogLevel =
  | 'debug'
  | 'error'
  | 'silent'
  | 'warn'
  | 'info'
  | 'verbose';

export function setLogLevel(logLevel: LogLevel): void;

export interface FirestoreDataConverter<
  AppModelType,
  DbModelType extends DocumentData = DocumentData
  > {
  toFirestore(modelObject: AppModelType): DocumentData;
  toFirestore(modelObject: Partial<AppModelType>, options: SetOptions): DocumentData;

  fromFirestore(snapshot: QueryDocumentSnapshot<AppModelType, DbModelType>, options: SnapshotOptions): AppModelType;
}

export class FirebaseFirestore {
  private constructor();

  settings(settings: Settings): void;

  useEmulator(
    host: string,
    port: number,
    options?: {
      mockUserToken?: EmulatorMockTokenOptions | string;
    }
  ): void;

  enablePersistence(settings?: PersistenceSettings): Promise<void>;

  collection(collectionPath: string): CollectionReference<DocumentData>;

  doc(documentPath: string): DocumentReference<DocumentData, DocumentData>;

  collectionGroup(collectionId: string): Query<DocumentData>;

  runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T>;

  batch(): WriteBatch;

  app: any;

  clearPersistence(): Promise<void>;

  enableNetwork(): Promise<void>;

  disableNetwork(): Promise<void>;

  waitForPendingWrites(): Promise<void>;

  onSnapshotsInSync(observer: {
    next?: (value: void) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshotsInSync(onSync: () => void): () => void;

  terminate(): Promise<void>;

  loadBundle(
    bundleData: ArrayBuffer | ReadableStream<Uint8Array> | string
  ): LoadBundleTask;

  namedQuery(name: string): Promise<Query<DocumentData> | null>;

  INTERNAL: { delete: () => Promise<void> };
}

export interface LoadBundleTask extends PromiseLike<LoadBundleTaskProgress> {
  onProgress(
    next?: (progress: LoadBundleTaskProgress) => any,
    error?: (error: Error) => any,
    complete?: () => void
  ): void;

  then<T, R>(
    onFulfilled?: (a: LoadBundleTaskProgress) => T | PromiseLike<T>,
    onRejected?: (a: Error) => R | PromiseLike<R>
  ): Promise<T | R>;

  catch<R>(
    onRejected: (a: Error) => R | PromiseLike<R>
  ): Promise<R | LoadBundleTaskProgress>;
}

export interface LoadBundleTaskProgress {
  documentsLoaded: number;
  totalDocuments: number;
  bytesLoaded: number;
  totalBytes: number;
  taskState: TaskState;
}

export type TaskState = 'Error' | 'Running' | 'Success';

export class GeoPoint {
  constructor(latitude: number, longitude: number);

  readonly latitude: number;
  readonly longitude: number;

  isEqual(other: GeoPoint): boolean;
}

export class Timestamp {
  constructor(seconds: number, nanoseconds: number);

  static now(): Timestamp;

  static fromDate(date: Date): Timestamp;

  static fromMillis(milliseconds: number): Timestamp;

  readonly seconds: number;
  readonly nanoseconds: number;

  toDate(): Date;

  toMillis(): number;

  isEqual(other: Timestamp): boolean;

  valueOf(): string;
}

export class Blob {
  private constructor();

  static fromBase64String(base64: string): Blob;

  static fromUint8Array(array: Uint8Array): Blob;

  public toBase64(): string;

  public toUint8Array(): Uint8Array;

  isEqual(other: Blob): boolean;
}

export class Transaction {
  private constructor();

  get<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>
  ): Promise<DocumentSnapshot<AppModelType, DbModelType>>;

  set<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: Partial<AppModelType>,
    options: SetOptions
  ): Transaction;
  set<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: Partial<AppModelType>
  ): Transaction;

  update<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: Partial<AppModelType>
  ): Transaction;
  update<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Transaction;

  delete<AppModelType, DbModelType extends DocumentData>(documentRef: DocumentReference<AppModelType, DbModelType>): Transaction;
}

export class WriteBatch {
  private constructor();

  set<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: Partial<AppModelType>,
    options: SetOptions
  ): WriteBatch;
  set<AppModelType, DbModelType extends DocumentData>(documentRef: DocumentReference<AppModelType, DbModelType>, data: UpdateData): WriteBatch;

  update<AppModelType, DbModelType extends DocumentData>(documentRef: DocumentReference<AppModelType, DbModelType>, data: UpdateData): WriteBatch;
  update<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): WriteBatch;

  delete<AppModelType, DbModelType extends DocumentData>(documentRef: DocumentReference<AppModelType, DbModelType>): WriteBatch;

  commit(): Promise<void>;
}

export interface SnapshotListenOptions {
  readonly includeMetadataChanges?: boolean;
}

export interface SetOptions {
  readonly merge?: boolean;
  readonly mergeFields?: (string | FieldPath)[];
}

export interface GetOptions {
  readonly source?: 'default' | 'server' | 'cache';
}

export class DocumentReference<AppModelType, DbModelType> {
  private constructor();

  readonly id: string;
  readonly firestore: FirebaseFirestore;
  readonly parent: CollectionReference<AppModelType, DbModelType>;
  readonly path: string;

  collection(collectionPath: string): CollectionReference<DocumentData>;

  isEqual(other: DocumentReference<AppModelType, DbModelType>): boolean;

  set(data: Partial<AppModelType>, options: SetOptions): Promise<void>;
  set(data: Partial<AppModelType>): Promise<void>;

  update(data: UpdateData): Promise<void>;
  update(
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Promise<void>;

  delete(): Promise<void>;

  get(options?: GetOptions): Promise<DocumentSnapshot<AppModelType, DbModelType>>;

  onSnapshot(observer: {
    next?: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    observer: {
      next?: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void;
      error?: (error: FirestoreError) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void,
    onError?: (error: FirestoreError) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    onNext: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void,
    onError?: (error: FirestoreError) => void,
    onCompletion?: () => void
  ): () => void;

  withConverter(converter: null): DocumentReference<AppModelType, DbModelType>;
  withConverter<AppModelType, DbModelType>(
    converter: FirestoreDataConverter<AppModelType, DbModelType>
  ): DocumentReference<AppModelType, DbModelType>;
}

export interface SnapshotOptions {
  readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
}

export interface SnapshotMetadata {
  readonly hasPendingWrites: boolean;
  readonly fromCache: boolean;

  isEqual(other: SnapshotMetadata): boolean;
}

export class DocumentSnapshot<AppModelType, DbModelType> {
  protected constructor();

  readonly exists: boolean;
  readonly ref: DocumentReference<AppModelType, DbModelType>;
  readonly id: string;
  readonly metadata: SnapshotMetadata;

  data(options?: SnapshotOptions): AppModelType | undefined;

  get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;

  isEqual(other: DocumentSnapshot<AppModelType, DbModelType>): boolean;
}

export class QueryDocumentSnapshot<AppModelType, DbModelType>
  extends DocumentSnapshot<AppModelType, DbModelType> {
  private constructor();

  data(options?: SnapshotOptions): AppModelType;
}

export type OrderByDirection = 'desc' | 'asc';

export type WhereFilterOp =
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

export class Query<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>{
  protected constructor();

  readonly firestore: FirebaseFirestore;

  where(
    fieldPath: string | FieldPath,
    opStr: WhereFilterOp,
    value: any
  ): Query<AppModelType, DbModelType>;

  orderBy(
    fieldPath: string | FieldPath,
    directionStr?: OrderByDirection
  ): Query<AppModelType, DbModelType>;

  limit(limit: number): Query<AppModelType, DbModelType>;

  limitToLast(limit: number): Query<AppModelType, DbModelType>;

  startAt(snapshot: DocumentSnapshot<AppModelType, DbModelType>): Query<AppModelType, DbModelType>;
  startAt(...fieldValues: any[]): Query<AppModelType, DbModelType>;

  startAfter(snapshot: DocumentSnapshot<AppModelType, DbModelType>): Query<AppModelType, DbModelType>;
  startAfter(...fieldValues: any[]): Query<AppModelType, DbModelType>;

  endBefore(snapshot: DocumentSnapshot<AppModelType, DbModelType>): Query<AppModelType, DbModelType>;
  endBefore(...fieldValues: any[]): Query<AppModelType, DbModelType>;

  endAt(snapshot: DocumentSnapshot<AppModelType, DbModelType>): Query<AppModelType, DbModelType>;
  endAt(...fieldValues: any[]): Query<AppModelType, DbModelType>;

  isEqual(other: Query<AppModelType, DbModelType>): boolean;

  get(options?: GetOptions): Promise<QuerySnapshot<AppModelType, DbModelType>>;

  onSnapshot(observer: {
    next?: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    observer: {
      next?: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void;
      error?: (error: FirestoreError) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void,
    onError?: (error: FirestoreError) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    onNext: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void,
    onError?: (error: FirestoreError) => void,
    onCompletion?: () => void
  ): () => void;

  withConverter(converter: null): Query<DocumentData>;
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}

export class QuerySnapshot<AppModelType, DbModelType> {
  private constructor();

  readonly query: Query<AppModelType, DbModelType>;
  readonly metadata: SnapshotMetadata;
  readonly docs: Array<QueryDocumentSnapshot<AppModelType, DbModelType>>;
  readonly size: number;
  readonly empty: boolean;

  docChanges(options?: SnapshotListenOptions): Array<DocumentChange<AppModelType, DbModelType>>;

  forEach(
    callback: (result: QueryDocumentSnapshot<AppModelType, DbModelType>) => void,
    thisArg?: any
  ): void;

  isEqual(other: QuerySnapshot<AppModelType, DbModelType>): boolean;
}

export type DocumentChangeType = 'added' | 'removed' | 'modified';

export interface DocumentChange<AppModelType, DbModelType> {
  readonly type: DocumentChangeType;
  readonly doc: QueryDocumentSnapshot<AppModelType, DbModelType>;
  readonly oldIndex: number;
  readonly newIndex: number;
}

export class CollectionReference<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
  > extends Query<AppModelType, DbModelType>  {
  private constructor();

  readonly id: string;
  readonly parent: DocumentReference<AppModelType, DbModelType> | null;
  readonly path: string;

  doc(documentPath?: string): DocumentReference<AppModelType, DbModelType>;

  add(data: AppModelType): Promise<DocumentReference<AppModelType, DbModelType>>;

  isEqual(other: CollectionReference<AppModelType, DbModelType>): boolean;

  withConverter(converter: null): CollectionReference<DocumentData>;
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U>;
}

export class FieldValue {
  private constructor();

  static serverTimestamp(): FieldValue;

  static delete(): FieldValue;

  static arrayUnion(...elements: any[]): FieldValue;

  static arrayRemove(...elements: any[]): FieldValue;

  static increment(n: number): FieldValue;

  isEqual(other: FieldValue): boolean;
}

export class FieldPath {
  constructor(...fieldNames: string[]);

  static documentId(): FieldPath;

  isEqual(other: FieldPath): boolean;
}

export type FirestoreErrorCode =
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

export interface FirestoreError {
  code: FirestoreErrorCode;
  message: string;
  name: string;
  stack?: string;
}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'firestore-compat': FirebaseFirestore;
  }
}
