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

// import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
//
export type DocumentData = { [field: string]: any };

export type UpdateData = { [fieldPath: string]: any };

export interface Settings {
  host?: string;
  ssl?: boolean;
}

export function initializeFirestore(
  firestore: FirebaseFirestore,
  settings: Settings
): void;

// export type LogLevel = 'debug' | 'error' | 'silent';
//
// export function setLogLevel(logLevel: LogLevel): void;
//
// export interface FirestoreDataConverter<T> {
//   toFirestore(modelObject: T): DocumentData;
//
//   fromFirestore(snapshot: QueryDocumentSnapshot): T;
// }

export class FirebaseFirestore {
  //   collectionGroup(collectionId: string): Query<DocumentData>;
}

// export class GeoPoint {
//   constructor(latitude: number, longitude: number);
//
//   readonly latitude: number;
//   readonly longitude: number;
//
//   isEqual(other: GeoPoint): boolean;
// }
//
// export class Timestamp {
//   constructor(seconds: number, nanoseconds: number);
//
//   static now(): Timestamp;
//
//   static fromDate(date: Date): Timestamp;
//
//   static fromMillis(milliseconds: number): Timestamp;
//
//   readonly seconds: number;
//   readonly nanoseconds: number;
//
//   toDate(): Date;
//
//   toMillis(): number;
//
//   isEqual(other: Timestamp): boolean;
//
//   valueOf(): string;
// }
//
// export class Blob {
//   private constructor();
//
//   static fromBase64String(base64: string): Blob;
//
//   static fromUint8Array(array: Uint8Array): Blob;
//
//   public toBase64(): string;
//
//   public toUint8Array(): Uint8Array;
//
//   isEqual(other: Blob): boolean;
// }
//
// export class Transaction {
//   private constructor();
//
//   get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
//
//   set<T>(
//     documentRef: DocumentReference<T>,
//     data: T,
//     options?: SetOptions
//   ): Transaction;
//
//   update(documentRef: DocumentReference<any>, data: UpdateData): Transaction;
//   update(
//     documentRef: DocumentReference<any>,
//     field: string | FieldPath,
//     value: any,
//     ...moreFieldsAndValues: any[]
//   ): Transaction;
//
//   delete(documentRef: DocumentReference<any>): Transaction;
// }
//
// export class WriteBatch {
//   private constructor();
//
//   set<T>(
//     documentRef: DocumentReference<T>,
//     data: T,
//     options?: SetOptions
//   ): WriteBatch;
//
//   update(documentRef: DocumentReference<any>, data: UpdateData): WriteBatch;
//   update(
//     documentRef: DocumentReference<any>,
//     field: string | FieldPath,
//     value: any,
//     ...moreFieldsAndValues: any[]
//   ): WriteBatch;
//
//   delete(documentRef: DocumentReference<any>): WriteBatch;
//
//   commit(): Promise<void>;
// }
//
export interface SetOptions {
  readonly merge?: boolean;
  readonly mergeFields?: (string | FieldPath)[];
}

export class DocumentReference<T = DocumentData> {
  //   readonly id: string;
  //   readonly firestore: FirebaseFirestore;
  //   readonly path: string;
  //
  //
  //   isEqual(other: DocumentReference<T>): boolean;
  //
  //   withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}
//
export class DocumentSnapshot<T = DocumentData> {
  readonly exists: boolean;
  // readonly ref: DocumentReference<T>;
  // readonly id: string;

  data(): T | undefined;

  // get(fieldPath: string | FieldPath): any;
  //
  // isEqual(other: DocumentSnapshot<T>): boolean;
}

export interface QueryDocumentSnapshot<T = DocumentData>
  extends DocumentSnapshot<T> {
  data(): T;
}
//
// export type OrderByDirection = 'desc' | 'asc';
//
// export type WhereFilterOp =
//   | '<'
//   | '<='
//   | '=='
//   | '>='
//   | '>'
//   | 'array-contains'
//   | 'in'
//   | 'array-contains-any';
//
export class Query<T = DocumentData> {
  readonly firestore: FirebaseFirestore;
  //
  //   where(
  //     fieldPath: string | FieldPath,
  //     opStr: WhereFilterOp,
  //     value: any
  //   ): Query<T>;
  //
  //   orderBy(
  //     fieldPath: string | FieldPath,
  //     directionStr?: OrderByDirection
  //   ): Query<T>;
  //
  //   limit(limit: number): Query<T>;
  //
  //   limitToLast(limit: number): Query<T>;
  //
  //   startAt(snapshot: DocumentSnapshot<any>): Query<T>;
  //   startAt(...fieldValues: any[]): Query<T>;
  //
  //   startAfter(snapshot: DocumentSnapshot<any>): Query<T>;
  //   startAfter(...fieldValues: any[]): Query<T>;
  //
  //   endBefore(snapshot: DocumentSnapshot<any>): Query<T>;
  //   endBefore(...fieldValues: any[]): Query<T>;
  //
  //   endAt(snapshot: DocumentSnapshot<any>): Query<T>;
  //   endAt(...fieldValues: any[]): Query<T>;
  //
  //   isEqual(other: Query<T>): boolean;
  //
  //   withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}

export class QuerySnapshot<T = DocumentData> {
  private constructor();

  readonly query: Query<T>;
  readonly docs: Array<QueryDocumentSnapshot<T>>;
  readonly size: number;
  readonly empty: boolean;

  // docChanges(): Array<DocumentChange<T>>;

  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: any
  ): void;

  // isEqual(other: QuerySnapshot<T>): boolean;
}
//
// export type DocumentChangeType = 'added' | 'removed' | 'modified';
//
// export interface DocumentChange<T = DocumentData> {
//   readonly type: DocumentChangeType;
//   readonly doc: QueryDocumentSnapshot<T>;
//   readonly oldIndex: number;
//   readonly newIndex: number;
// }

export class CollectionReference<T = DocumentData> extends Query<T> {
  // readonly id: string;
  // readonly parent: DocumentReference<DocumentData> | null;
  // readonly path: string;
  //
  // add(data: T): Promise<DocumentReference<T>>;
  //
  // isEqual(other: CollectionReference<T>): boolean;
  //
  // withConverter<U>(
  //   converter: FirestoreDataConverter<U>
  // ): CollectionReference<U>;
}

export class FieldValue {
  private constructor();
}

export class FieldPath {
  constructor(...fieldNames: string[]);
  isEqual(other: FieldPath): boolean;
}
//
// // MARK: Initialization methods
//
// export function initializeFirestore(
//   firestore: FirebaseFirestore,
//   settings: Settings
// ): Promise<void>;
//
// // MARK: Firestore methods
//
// export function terminate(firestore: FirebaseFirestore): Promise<void>;
//
// export function writeBatch(firestore: FirebaseFirestore): WriteBatch;
//
// export function runTransaction<T>(
//   firestore: FirebaseFirestore,
//   updateFunction: (transaction: Transaction) => Promise<T>
// ): Promise<T>;

export function collection(
  parent: FirebaseFirestore | CollectionReference,
  relativePath: string
): CollectionReference;

export function doc(
  parent: CollectionReference,
  relativePath?: string
): DocumentReference;
//
// export function parent(collection: CollectionReference): DocumentReference;
//
// export function parent(docRef: DocumentReference): CollectionReference;

//
// // MARK: DocumentReference methods
//
export function getDocument<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;

export function deleteDocument(reference: DocumentReference): Promise<void>;

export function updateDocument(
  reference: DocumentReference,
  data: UpdateData
): Promise<void>;

export function updateDocument(
  reference: DocumentReference,
  field: string | FieldPath,
  value: any,
  ...moreFieldsAndValues: any[]
): Promise<void>;

export function setDocument<T>(
  reference: DocumentReference<T>,
  data: T,
  options?: SetOptions
): Promise<void>;

// export function addDocument<T>(
//   reference: CollectionReference<T>,
//   data: T
// ): Promise<DocumentSnapshot<T>>;
//
// MARK: CollectionReference methods
export function getQuery<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
//
// // MARK: FieldPath methods
// export function documentId(): FieldPath;
//
// // MARK: FieldValue methods
export function serverTimestamp(): FieldValue;
export function deleteField(): FieldValue;
export function arrayUnion(...elements: any[]): FieldValue;
export function arrayRemove(...elements: any[]): FieldValue;
export function increment(n: number): FieldValue;
//
// export type FirestoreErrorCode =
//   | 'cancelled'
//   | 'unknown'
//   | 'invalid-argument'
//   | 'deadline-exceeded'
//   | 'not-found'
//   | 'already-exists'
//   | 'permission-denied'
//   | 'resource-exhausted'
//   | 'failed-precondition'
//   | 'aborted'
//   | 'out-of-range'
//   | 'unimplemented'
//   | 'internal'
//   | 'unavailable'
//   | 'data-loss'
//   | 'unauthenticated';
//
// export interface FirestoreError {
//   code: FirestoreErrorCode;
//   message: string;
//   name: string;
//   stack?: string;
// }
