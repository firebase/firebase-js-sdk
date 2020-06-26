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

export interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
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
  fromFirestore(snapshot: QueryDocumentSnapshot): T;
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

export function collection(
  firestore: FirebaseFirestore,
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

export interface SetOptions {
  readonly merge?: boolean;
  readonly mergeFields?: Array<string | FieldPath>;
}

export class DocumentReference<T = DocumentData> {
  private constructor();
  readonly id: string;
  readonly firestore: FirebaseFirestore;
  readonly path: string;
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}

export class DocumentSnapshot<T = DocumentData> {
  readonly ref: DocumentReference<T>;
  readonly id: string;
  exists(): this is QueryDocumentSnapshot<T>;
  data(): T | undefined;
  get(fieldPath: string | FieldPath): any;
}

export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<
  T
> {
  data(): T;
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
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}

export class QuerySnapshot<T = DocumentData> {
  private constructor();
  readonly query: Query<T>;
  readonly docs: Array<QueryDocumentSnapshot<T>>;
  readonly size: number;
  readonly empty: boolean;
  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: any
  ): void;
}

export class CollectionReference<T = DocumentData> extends Query<T> {
  private constructor();
  readonly id: string;
  readonly path: string;
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U>;
}

export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export function getQuery<T>(query: Query<T>): Promise<QuerySnapshot<T>>;

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
    'firestore/lite': FirebaseFirestore;
  }
}
