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
export interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
}
export class FirebaseFirestore {
  readonly app: FirebaseApp;
  private constructor();
}
export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore;
export function getFirestore(app: FirebaseApp): FirebaseFirestore;
export function terminate(firestore: FirebaseFirestore): Promise<void>;
export type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };
export interface DocumentData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}
export interface UpdateData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [fieldPath: string]: any;
}
export class DocumentReference<T = DocumentData> {
  readonly type = 'document';
  readonly firestore: FirebaseFirestore;
  readonly converter: FirestoreDataConverter<T> | null;
  private constructor();
  get id(): string;
  get path(): string;
  get parent(): CollectionReference<T>;
  collection(path: string): CollectionReference<DocumentData>;
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}
export class Query<T = DocumentData> {
  readonly type: 'query' | 'collection';
  readonly firestore: FirebaseFirestore;
  readonly converter: FirestoreDataConverter<T> | null;
  protected constructor();
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}
export abstract class QueryConstraint {
  abstract readonly type: QueryConstraintType;
}
export type QueryConstraintType =
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'limitToLast'
  | 'startAt'
  | 'startAfter'
  | 'endAt'
  | 'endBefore';
export class CollectionReference<T = DocumentData> extends Query<T> {
  readonly type = 'collection';
  readonly firestore: FirebaseFirestore;
  private constructor();
  get id(): string;
  get path(): string;
  get parent(): DocumentReference<DocumentData> | null;
  doc(path?: string): DocumentReference<T>;
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U>;
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
export function collection(
  firestore: FirebaseFirestore,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  reference: CollectionReference<unknown>,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  reference: DocumentReference,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  parent:
    | FirebaseFirestore
    | DocumentReference<unknown>
    | CollectionReference<unknown>,
  relativePath: string
): CollectionReference<DocumentData>;
export function collectionGroup(
  firestore: FirebaseFirestore,
  collectionId: string
): Query<DocumentData>;
export function doc(
  firestore: FirebaseFirestore,
  documentPath: string
): DocumentReference<DocumentData>;
export function doc<T>(
  reference: CollectionReference<T>,
  documentPath?: string
): DocumentReference<T>;
export function doc(
  reference: DocumentReference<unknown>,
  documentPath: string
): DocumentReference<DocumentData>;
export function doc<T>(
  parent:
    | FirebaseFirestore
    | CollectionReference<T>
    | DocumentReference<unknown>,
  relativePath?: string
): DocumentReference;
export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
export function deleteDoc(reference: DocumentReference): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T>,
  options: SetOptions
): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T,
  options?: SetOptions
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  data: UpdateData
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  field: string | FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  fieldOrUpdateData: string | FieldPath | UpdateData,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>>;
export function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean;
export function queryEqual<T>(left: Query<T>, right: Query<T>): boolean;
export function startAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint;
export function startAfter(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint;
export function endAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint;
export function endBefore(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint;
export function query<T>(
  query: Query<T>,
  ...queryConstraints: QueryConstraint[]
): Query<T>;
export function limit(n: number): QueryConstraint;
export function limitToLast(n: number): QueryConstraint;
export function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: unknown
): QueryConstraint;
export function orderBy(
  field: string | FieldPath,
  directionStr: OrderByDirection
): QueryConstraint;
export class FieldPath {
  isEqual(other: FieldPath): boolean;
}
export function documentId(): FieldPath;
export abstract class FieldValue {}
export function deleteField(): FieldValue;
export function increment(n: number): FieldValue;
export function arrayRemove(...elements: unknown[]): FieldValue;
export function arrayUnion(...elements: unknown[]): FieldValue;
export function serverTimestamp(): FieldValue;
export interface FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;
  toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T;
}
export class DocumentSnapshot<T = DocumentData> {
  protected constructor();
  get id(): string;
  get ref(): DocumentReference<T>;
  exists(): this is QueryDocumentSnapshot<T>;
  data(): T | undefined;
  // We are using `any` here to avoid an explicit cast by our users.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(fieldPath: string | FieldPath): any;
}
export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<
  T
> {
  data(): T;
}
export class QuerySnapshot<T = DocumentData> {
  readonly query: Query<T>;
  private constructor();
  get docs(): Array<QueryDocumentSnapshot<T>>;
  get size(): number;
  get empty(): boolean;
  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
  ): void;
}
export function snapshotEqual<T>(
  left: DocumentSnapshot<T> | QuerySnapshot<T>,
  right: DocumentSnapshot<T> | QuerySnapshot<T>
): boolean;
export class WriteBatch {
  private constructor();
  set<T>(documentRef: DocumentReference<T>, value: T): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    value: Partial<T>,
    options: SetOptions
  ): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    value: T,
    options?: SetOptions
  ): WriteBatch;
  update(
    documentRef: DocumentReference<unknown>,
    value: UpdateData
  ): WriteBatch;
  update(
    documentRef: DocumentReference<unknown>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: DocumentReference<unknown>,
    fieldOrUpdateData: string | FieldPath | UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  delete(documentRef: DocumentReference<unknown>): WriteBatch;
  commit(): Promise<void>;
  private verifyNotCommitted(): void;
}
export function writeBatch(firestore: FirebaseFirestore): WriteBatch;
export class Transaction {
  private constructor();
  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
  set<T>(documentRef: DocumentReference<T>, value: T): this;
  set<T>(
    documentRef: DocumentReference<T>,
    value: Partial<T>,
    options: SetOptions
  ): this;
  set<T>(
    documentRef: DocumentReference<T>,
    value: T,
    options?: SetOptions
  ): this;
  update(documentRef: DocumentReference<unknown>, value: UpdateData): this;
  update(
    documentRef: DocumentReference<unknown>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this;
  update(
    documentRef: DocumentReference<unknown>,
    fieldOrUpdateData: string | FieldPath | UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this;
  delete(documentRef: DocumentReference<unknown>): this;
}
export function runTransaction<T>(
  firestore: FirebaseFirestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T>;
export function setLogLevel(newLevel: LogLevelString | LogLevel): void;
export declare enum LogLevel {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}
export declare type LogLevelString =
  | 'debug'
  | 'verbose'
  | 'info'
  | 'warn'
  | 'error'
  | 'silent';
export class Bytes {
  private constructor();
  static fromBase64String(base64: string): Bytes;
  static fromUint8Array(array: Uint8Array): Bytes;
  toBase64(): string;
  toUint8Array(): Uint8Array;
  toString(): string;
  isEqual(other: Bytes): boolean;
}
export class GeoPoint {
  /**
   * Returns the latitude of this geo point, a number between -90 and 90.
   */
  get latitude(): number;
  /**
   * Returns the longitude of this geo point, a number between -180 and 180.
   */
  get longitude(): number;
  isEqual(other: GeoPoint): boolean;
  toJSON(): {
    latitude: number;
    longitude: number;
  };
}
export class Timestamp {
  static now(): Timestamp;
  static fromDate(date: Date): Timestamp;
  static fromMillis(milliseconds: number): Timestamp;
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
  isEqual(other: Timestamp): boolean;
  toString(): string;
  toJSON(): {
    seconds: number;
    nanoseconds: number;
  };
  valueOf(): string;
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
export class FirestoreError extends Error {
  name = 'FirebaseError';
  stack?: string;
  readonly code: FirestoreErrorCode;
  readonly message: string;
}
