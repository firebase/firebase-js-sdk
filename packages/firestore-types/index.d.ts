/**
 * @license
 * Copyright 2017 Google Inc.
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

import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';

export type DocumentData = { [field: string]: any };

export type UpdateData = { [fieldPath: string]: any };

export const CACHE_SIZE_UNLIMITED: number;

export interface Settings {
  host?: string;
  ssl?: boolean;
  timestampsInSnapshots?: boolean;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
}

export interface PersistenceSettings {
  synchronizeTabs?: boolean;
  experimentalTabSynchronization?: boolean;
}

export type LogLevel = 'debug' | 'error' | 'silent';

export function setLogLevel(logLevel: LogLevel): void;

export interface FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;

  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T;
}

export class FirebaseFirestore {
  private constructor();

  settings(settings: Settings): void;

  enablePersistence(settings?: PersistenceSettings): Promise<void>;

  collection(collectionPath: string): CollectionReference<DocumentData>;

  doc(documentPath: string): DocumentReference<DocumentData>;

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
    error?: (error: Error) => void;
    complete?: () => void;
  }): () => void;
  onSnapshotsInSync(onSync: () => void): () => void;

  terminate(): Promise<void>;

  INTERNAL: { delete: () => Promise<void> };
}

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

  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;

  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: SetOptions
  ): Transaction;

  update(documentRef: DocumentReference<any>, data: UpdateData): Transaction;
  update(
    documentRef: DocumentReference<any>,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Transaction;

  delete(documentRef: DocumentReference<any>): Transaction;
}

export class WriteBatch {
  private constructor();

  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: SetOptions
  ): WriteBatch;

  update(documentRef: DocumentReference<any>, data: UpdateData): WriteBatch;
  update(
    documentRef: DocumentReference<any>,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): WriteBatch;

  delete(documentRef: DocumentReference<any>): WriteBatch;

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

export class DocumentReference<T = DocumentData> {
  private constructor();

  readonly id: string;
  readonly firestore: FirebaseFirestore;
  readonly parent: CollectionReference<T>;
  readonly path: string;

  collection(collectionPath: string): CollectionReference<DocumentData>;

  isEqual(other: DocumentReference<T>): boolean;

  set(data: T, options?: SetOptions): Promise<void>;

  update(data: UpdateData): Promise<void>;
  update(
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Promise<void>;

  delete(): Promise<void>;

  get(options?: GetOptions): Promise<DocumentSnapshot<T>>;

  onSnapshot(observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    observer: {
      next?: (snapshot: DocumentSnapshot<T>) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    onNext: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;

  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}

export interface SnapshotOptions {
  readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
}

export interface SnapshotMetadata {
  readonly hasPendingWrites: boolean;
  readonly fromCache: boolean;

  isEqual(other: SnapshotMetadata): boolean;
}

export class DocumentSnapshot<T = DocumentData> {
  protected constructor();

  readonly exists: boolean;
  readonly ref: DocumentReference<T>;
  readonly id: string;
  readonly metadata: SnapshotMetadata;

  data(options?: SnapshotOptions): T | undefined;

  get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;

  isEqual(other: DocumentSnapshot<T>): boolean;
}

export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<
  T
> {
  private constructor();

  data(options?: SnapshotOptions): T;
}

export type OrderByDirection = 'desc' | 'asc';

export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any';

export class Query<T = DocumentData> {
  protected constructor();

  readonly firestore: FirebaseFirestore;

  where(
    fieldPath: string | FieldPath,
    opStr: WhereFilterOp,
    value: any
  ): Query<T>;

  orderBy(
    fieldPath: string | FieldPath,
    directionStr?: OrderByDirection
  ): Query<T>;

  limit(limit: number): Query<T>;

  limitToLast(limit: number): Query<T>;

  startAt(snapshot: DocumentSnapshot<any>): Query<T>;
  startAt(...fieldValues: any[]): Query<T>;

  startAfter(snapshot: DocumentSnapshot<any>): Query<T>;
  startAfter(...fieldValues: any[]): Query<T>;

  endBefore(snapshot: DocumentSnapshot<any>): Query<T>;
  endBefore(...fieldValues: any[]): Query<T>;

  endAt(snapshot: DocumentSnapshot<any>): Query<T>;
  endAt(...fieldValues: any[]): Query<T>;

  isEqual(other: Query<T>): boolean;

  get(options?: GetOptions): Promise<QuerySnapshot<T>>;

  onSnapshot(observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: Error) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    observer: {
      next?: (snapshot: QuerySnapshot<T>) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    onNext: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;

  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}

export class QuerySnapshot<T = DocumentData> {
  private constructor();

  readonly query: Query<T>;
  readonly metadata: SnapshotMetadata;
  readonly docs: Array<QueryDocumentSnapshot<T>>;
  readonly size: number;
  readonly empty: boolean;

  docChanges(options?: SnapshotListenOptions): Array<DocumentChange<T>>;

  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: any
  ): void;

  isEqual(other: QuerySnapshot<T>): boolean;
}

export type DocumentChangeType = 'added' | 'removed' | 'modified';

export interface DocumentChange<T = DocumentData> {
  readonly type: DocumentChangeType;
  readonly doc: QueryDocumentSnapshot<T>;
  readonly oldIndex: number;
  readonly newIndex: number;
}

export class CollectionReference<T = DocumentData> extends Query<T> {
  private constructor();

  readonly id: string;
  readonly parent: DocumentReference<DocumentData> | null;
  readonly path: string;

  doc(documentPath?: string): DocumentReference<T>;

  add(data: T): Promise<DocumentReference<T>>;

  isEqual(other: CollectionReference<T>): boolean;

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
    'firestore': FirebaseFirestore;
  }
}
