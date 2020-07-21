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

import { FirebaseApp } from '@firebase/app-types-exp';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DocumentData {
  [field: string]: any;
}

export interface UpdateData {
  [fieldPath: string]: any;
}

export const CACHE_SIZE_UNLIMITED: number;

export interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
}

export interface SnapshotListenOptions {
  readonly includeMetadataChanges?: boolean;
}

export interface SnapshotOptions {
  readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
}

export interface SnapshotMetadata {
  readonly hasPendingWrites: boolean;
  readonly fromCache: boolean;

  isEqual(other: SnapshotMetadata): boolean;
}

export type LogLevel =
  | 'debug'
  | 'error'
  | 'silent'
  | 'warn'
  | 'info'
  | 'verbose';

export function setLogLevel(logLevel: LogLevel): void;

export interface FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;
  toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    // Make optional to make this assignable to the converter in the Lite SDK
    // This makes sure that the Lite API remains a true subset.
    options?: SnapshotOptions
  ): T;
}

export class FirebaseFirestore {
  private constructor();
  readonly app: FirebaseApp;
}

export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore;
export function getFirestore(app: FirebaseApp): FirebaseFirestore;

export function terminate(firestore: FirebaseFirestore): Promise<void>;
export function writeBatch(firestore: FirebaseFirestore): WriteBatch;
export function runTransaction<T>(
  firestore: FirebaseFirestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T>;
export function waitForPendingWrites(
  firestore: FirebaseFirestore
): Promise<void>;
export function enableNetwork(firestore: FirebaseFirestore): Promise<void>;
export function disableNetwork(firestore: FirebaseFirestore): Promise<void>;

export function enableIndexedDbPersistence(
  firestore: FirebaseFirestore,
  // `experimentalForceOwningTab` setting, which only makes sense for
  // non-multi-tab persistence.
  setting?: { forceOwnership: boolean }
): Promise<void>;
export function enableMultiTabIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void>;
export function clearIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void>;

export function collection(
  firestore: FirebaseFirestore,
  collectionPath: string
): CollectionReference<DocumentData>;
// This new method allows users to directly reference a subcollection, which is
// already supported by the overload above.
//
// Before: collection(doc(collRef1, 'foo'), 'bar'))
// After: collection(collRef1, 'foo/bar') - Matches collection(db, 'foo/bar')
export function collection(
  reference: CollectionReference<unknown>,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  reference: DocumentReference,
  collectionPath: string
): CollectionReference<DocumentData>;
export function doc(
  firestore: FirebaseFirestore,
  documentPath: string
): DocumentReference<DocumentData>;
export function doc(
  reference: DocumentReference<unknown>,
  documentPath: string
): DocumentReference<DocumentData>;
export function doc<T>(
  reference: CollectionReference<T>,
  documentPath?: string
): DocumentReference<T>;
export function parent(
  reference: CollectionReference<unknown>
): DocumentReference<DocumentData> | null;
export function parent<T>(
  reference: DocumentReference<T>
): CollectionReference<T>;
export function collectionGroup(
  firestore: FirebaseFirestore,
  collectionId: string
): Query<DocumentData>;

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

  toBase64(): string;

  toUint8Array(): Uint8Array;

  isEqual(other: Blob): boolean;
}

export class Transaction {
  private constructor();

  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;

  set<T>(documentRef: DocumentReference<T>, data: T): Transaction;
  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: SetOptions
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

  set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: SetOptions
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

export type SetOptions =
  | { merge: true }
  | { mergeFields: Array<string | FieldPath> };

export class DocumentReference<T = DocumentData> {
  private constructor();
  // Added a 'type' property to ensure that CollectionReferences and
  // DocumentReferences are not ducktype compatible.
  readonly type = 'document';
  readonly id: string;
  readonly firestore: FirebaseFirestore;
  readonly path: string;
  // Add a 'converter' property to match Query
  readonly converter: FirestoreDataConverter<T>|null;
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}

export class DocumentSnapshot<T = DocumentData> {
  protected constructor();

  readonly ref: DocumentReference<T>;
  readonly id: string;
  readonly metadata: SnapshotMetadata;

  exists(): this is QueryDocumentSnapshot<T>;

  data(options?: SnapshotOptions): T | undefined;

  get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;
}

export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<
  T
> {
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
  readonly type: 'collection' | 'query';
  readonly firestore: FirebaseFirestore;
  // Add a 'converter' property since Typescript cannot deduce the generic type
  // param `T` if it is not referenced in the API.
  readonly converter: FirestoreDataConverter<T>|null;

  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}

// We changed the Query API to become tree-shakeable, which has major size
// savings for users that don't use query filters or query cursors (at least
// relative ot the size of the Lite SDK).
//
// Usage before:
// const collRef = collection(db, 'foo');
// const query1 = collRef.where(..).orderBy(...);
// const query2 = query1.limit(1);
//
// Usage after:
// const collRef = collection(db, 'foo');
// const query1 = query(collRef, where(..), orderBy(...));
// const query2 = query(query1, limit(1));
//
// Notes:
// - We opted not to use the "standard" pattern of passing in the Query instance
//   to the free-standing functions since users would have to build up their
//   queries in reverse.
// - QueryConstraint is its own type to prevent users from passing in other
//   objects.

export type QueryConstraintType =
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'limitToLast'
  | 'startAt'
  | 'startAfter'
  | 'endAt'
  | 'endBefore';

export class QueryConstraint {
  private constructor();
  readonly type: QueryConstraintType;
}

export function query<T>(
  query: CollectionReference<T> | Query<T>,
  ...constraints: QueryConstraint[]
): Query<T>;

export function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: any
): QueryConstraint;
export function orderBy(
  fieldPath: string | FieldPath,
  directionStr?: OrderByDirection
): QueryConstraint;
export function limit(limit: number): QueryConstraint;
export function limitToLast(limit: number): QueryConstraint;
export function startAt(snapshot: DocumentSnapshot<any>): QueryConstraint;
export function startAt(...fieldValues: any[]): QueryConstraint;
export function startAfter(snapshot: DocumentSnapshot<any>): QueryConstraint;
export function startAfter(...fieldValues: any[]): QueryConstraint;
export function endBefore(snapshot: DocumentSnapshot<any>): QueryConstraint;
export function endBefore(...fieldValues: any[]): QueryConstraint;
export function endAt(snapshot: DocumentSnapshot<any>): QueryConstraint;
export function endAt(...fieldValues: any[]): QueryConstraint;

export class QuerySnapshot<T = DocumentData> {
  private constructor();
  readonly query: Query<T>;
  readonly docs: Array<QueryDocumentSnapshot<T>>;
  readonly metadata: SnapshotMetadata;
  readonly size: number;
  readonly empty: boolean;
  docChanges(options?: SnapshotListenOptions): Array<DocumentChange<T>>;
  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: any
  ): void;
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
  readonly type = 'collection';
  readonly id: string;
  readonly path: string;
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U>;
}

export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export function getDocFromCache<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export function getDocFromServer<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
// Renamed back to from `getQuery` to `getDocs` as multiple code reviewers found
// it confusing that `getQuery` takes a `query` and returns documents.
export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
export function getDocsFromCache<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
export function getDocsFromServer<T>(
  query: Query<T>
): Promise<QuerySnapshot<T>>;

export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T>,
  options: SetOptions
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  data: UpdateData
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  field: string | FieldPath,
  value: any,
  ...moreFieldsAndValues: any[]
): Promise<void>;
export function deleteDoc(reference: DocumentReference<unknown>): Promise<void>;

export function onSnapshot<T>(
  reference: DocumentReference<T>,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): () => void;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): () => void;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): () => void;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): () => void;
export function onSnapshot<T>(
  query: Query<T>,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): () => void;
export function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): () => void;
export function onSnapshot<T>(
  query: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): () => void;
export function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): () => void;
export function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  observer: {
    next?: (value: void) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): () => void;
export function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  onSync: () => void
): () => void;

export class FieldValue {
  private constructor();
  isEqual(other: FieldValue): boolean;
}

export function serverTimestamp(): FieldValue;
export function deleteField(): FieldValue;
export function arrayUnion(...elements: any[]): FieldValue;
export function arrayRemove(...elements: any[]): FieldValue;
export function increment(n: number): FieldValue;

export class FieldPath {
  constructor(...fieldNames: string[]);
  isEqual(other: FieldPath): boolean;
}

export function documentId(): FieldPath;

export function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean;
export function queryEqual<T>(left: Query<T>, right: Query<T>): boolean;
export function snapshotEqual<T>(
  left: DocumentSnapshot<T> | QuerySnapshot<T>,
  right: DocumentSnapshot<T> | QuerySnapshot<T>
): boolean;

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
    'firestore-exp': FirebaseFirestore;
  }
}
