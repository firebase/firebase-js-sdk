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

export class FirebaseFirestore {
  private constructor();
  
  settings(settings: Settings): void;
  
  enablePersistence(settings?: PersistenceSettings): Promise<void>;
  
  collection(collectionPath: string): CollectionReference;
  
  doc(documentPath: string): DocumentReference;
  
  collectionGroup(collectionId: string): Query;
  
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

  get(documentRef: DocumentReference): Promise<DocumentSnapshot>;

  set(
    documentRef: DocumentReference,
    data: DocumentData,
    options?: SetOptions
  ): Transaction;
  
  update(documentRef: DocumentReference, data: UpdateData): Transaction;
  update(
    documentRef: DocumentReference,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Transaction;

 
  delete(documentRef: DocumentReference): Transaction;
}

export class WriteBatch {
  private constructor();

  set(
    documentRef: DocumentReference,
    data: DocumentData,
    options?: SetOptions
  ): WriteBatch;

  update(documentRef: DocumentReference, data: UpdateData): WriteBatch;
  update(
    documentRef: DocumentReference,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): WriteBatch;
 
  delete(documentRef: DocumentReference): WriteBatch;
 
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

export class DocumentReference {
  private constructor();

  readonly id: string;
  readonly firestore: FirebaseFirestore;
  readonly parent: CollectionReference;
  readonly path: string;

  collection(collectionPath: string): CollectionReference;

  isEqual(other: DocumentReference): boolean;

  set(data: DocumentData, options?: SetOptions): Promise<void>;

  update(data: UpdateData): Promise<void>;
  update(
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Promise<void>;

  delete(): Promise<void>;

  get(options?: GetOptions): Promise<DocumentSnapshot>;

  onSnapshot(observer: {
    next?: (snapshot: DocumentSnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    observer: {
      next?: (snapshot: DocumentSnapshot) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: DocumentSnapshot) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    onNext: (snapshot: DocumentSnapshot) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
}

export interface SnapshotOptions {
  readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
}

/** Metadata about a snapshot, describing the state of the snapshot. */
export interface SnapshotMetadata {
  readonly hasPendingWrites: boolean;
  readonly fromCache: boolean;

  isEqual(other: SnapshotMetadata): boolean;
}

export class DocumentSnapshot {
  protected constructor();

  readonly exists: boolean;
  readonly ref: DocumentReference;
  readonly id: string;
  readonly metadata: SnapshotMetadata;

  data(options?: SnapshotOptions): DocumentData | undefined;

  get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;

  isEqual(other: DocumentSnapshot): boolean;
}

export class QueryDocumentSnapshot extends DocumentSnapshot {
  private constructor();
  data(options?: SnapshotOptions): DocumentData;
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

export class Query {
  protected constructor();

  readonly firestore: FirebaseFirestore;

  where(fieldPath: string | FieldPath, opStr: WhereFilterOp, value: any): Query;

  orderBy(
    fieldPath: string | FieldPath,
    directionStr?: OrderByDirection
  ): Query;

  limit(limit: number): Query;

  limitToLast(limit: number): Query;

  startAt(snapshot: DocumentSnapshot): Query;
  startAt(...fieldValues: any[]): Query;
  
  startAfter(snapshot: DocumentSnapshot): Query;
  startAfter(...fieldValues: any[]): Query;

  endBefore(snapshot: DocumentSnapshot): Query;
  endBefore(...fieldValues: any[]): Query;


  endAt(snapshot: DocumentSnapshot): Query;
  endAt(...fieldValues: any[]): Query;

  isEqual(other: Query): boolean;

  get(options?: GetOptions): Promise<QuerySnapshot>;

  onSnapshot(observer: {
    next?: (snapshot: QuerySnapshot) => void;
    error?: (error: Error) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    observer: {
      next?: (snapshot: QuerySnapshot) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: QuerySnapshot) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: SnapshotListenOptions,
    onNext: (snapshot: QuerySnapshot) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
}

export class QuerySnapshot {
  private constructor();

  readonly query: Query;
  readonly metadata: SnapshotMetadata;
  readonly docs: QueryDocumentSnapshot[];
  readonly size: number;
  readonly empty: boolean;

  docChanges(options?: SnapshotListenOptions): DocumentChange[];

  forEach(
    callback: (result: QueryDocumentSnapshot) => void,
    thisArg?: any
  ): void;

  isEqual(other: QuerySnapshot): boolean;
}

export type DocumentChangeType = 'added' | 'removed' | 'modified';

export interface DocumentChange {
  readonly type: DocumentChangeType;
  readonly doc: QueryDocumentSnapshot;
  readonly oldIndex: number;
  readonly newIndex: number;
}

export class CollectionReference extends Query {
  private constructor();
  
  readonly id: string;
  readonly parent: DocumentReference | null;
  readonly path: string;
  
  doc(documentPath?: string): DocumentReference;
  
  add(data: DocumentData): Promise<DocumentReference>;
  
  isEqual(other: CollectionReference): boolean;
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
