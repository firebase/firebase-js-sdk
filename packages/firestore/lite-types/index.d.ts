import { DocumentData as DocumentData_2 } from '@firebase/firestore-types';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { _FirebaseService } from '@firebase/app-types';
import { LogLevel } from '@firebase/logger';
import { LogLevelString } from '@firebase/logger';
import { Provider } from '@firebase/component';
import { SetOptions as SetOptions_2 } from '@firebase/firestore-types';
export declare function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>>;
export declare function arrayRemove(...elements: unknown[]): FieldValue;
export declare function arrayUnion(...elements: unknown[]): FieldValue;
/** Immutable class holding binary data in the Lite and modular SDK. */
export declare class Bytes {
  private constructor();
  static fromBase64String(base64: string): Bytes;
  static fromUint8Array(array: Uint8Array): Bytes;
  toBase64(): string;
  toUint8Array(): Uint8Array;
  toString(): string;
  isEqual(other: Bytes): boolean;
}
export declare function collection(
  firestore: FirebaseFirestore,
  path: string,
  ...pathComponents: string[]
): CollectionReference<DocumentData>;
export declare function collection(
  reference: CollectionReference<unknown>,
  path: string,
  ...pathComponents: string[]
): CollectionReference<DocumentData>;
export declare function collection(
  reference: DocumentReference,
  path: string,
  ...pathComponents: string[]
): CollectionReference<DocumentData>;
export declare function collectionGroup(
  firestore: FirebaseFirestore,
  collectionId: string
): Query<DocumentData>;
export declare class CollectionReference<T = DocumentData> extends Query<T> {
  readonly firestore: FirebaseFirestore;
  readonly type = 'collection';
  private constructor();
  get id(): string;
  get path(): string;
  get parent(): DocumentReference<DocumentData> | null;
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U>;
}
export declare function deleteDoc(reference: DocumentReference): Promise<void>;
export declare function deleteField(): FieldValue;
export declare function doc(
  firestore: FirebaseFirestore,
  path: string,
  ...pathComponents: string[]
): DocumentReference<DocumentData>;
export declare function doc<T>(
  reference: CollectionReference<T>,
  path?: string,
  ...pathComponents: string[]
): DocumentReference<T>;
export declare function doc(
  reference: DocumentReference<unknown>,
  path: string,
  ...pathComponents: string[]
): DocumentReference<DocumentData>;
export declare interface DocumentData {
  [field: string]: any;
}
export declare function documentId(): FieldPath;
/**
 * A reference to a particular document in a collection in the database.
 */
export declare class DocumentReference<T = DocumentData> {
  readonly firestore: FirebaseFirestore;
  readonly type = 'document';
  private constructor();
  get id(): string;
  get path(): string;
  get parent(): CollectionReference<T>;
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}
export declare class DocumentSnapshot<T = DocumentData> {
  protected constructor();
  get id(): string;
  get ref(): DocumentReference<T>;
  exists(): this is QueryDocumentSnapshot<T>;
  data(): T | undefined;
  get(fieldPath: string | FieldPath): any;
}
export declare function endAt(
  snapshot: DocumentSnapshot<unknown>
): QueryConstraint;
export declare function endAt(...fieldValues: unknown[]): QueryConstraint;
export declare function endBefore(
  snapshot: DocumentSnapshot<unknown>
): QueryConstraint;
export declare function endBefore(...fieldValues: unknown[]): QueryConstraint;
/**
 * A FieldPath refers to a field in a document. The path may consist of a single
 * field name (referring to a top-level field in the document), or a list of
 * field names (referring to a nested field in the document).
 */
export declare class FieldPath {
  /**
   * Creates a FieldPath from the provided field names. If more than one field
   * name is provided, the path will point to a nested field in a document.
   *
   * @param fieldNames A list of field names.
   */
  constructor(...fieldNames: string[]);
  isEqual(other: FieldPath): boolean;
}
/** The public FieldValue class of the lite API. */
export declare abstract class FieldValue {
  /**
   * @param _methodName The public API endpoint that returns this class.
   */
  constructor(_methodName: string);
  abstract isEqual(other: FieldValue): boolean;
}
/**
 * The root reference to the Firestore Lite database.
 */
export declare class FirebaseFirestore {
  readonly app: FirebaseApp;
  private constructor();
}
export declare interface FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;
  toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T;
}
/**
 * An error class used for Firestore-generated errors. Ideally we should be
 * using FirebaseError, but integrating with it is overly arduous at the moment,
 * so we define our own compatible error class (with a `name` of 'FirebaseError'
 * and compatible `code` and `message` fields.)
 */
export declare class FirestoreError {
  readonly code: FirestoreErrorCode;
  readonly message: string;
  readonly name: string;
  readonly stack?: string;
  private constructor();
}
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
/**
 * Immutable class representing a geo point as latitude-longitude pair.
 * This class is directly exposed in the public API, including its constructor.
 */
export declare class GeoPoint {
  constructor(latitude: number, longitude: number);
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
export declare function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>>;
export declare function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
export declare function getFirestore(app: FirebaseApp): FirebaseFirestore;
export declare function increment(n: number): FieldValue;
export declare function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore;
export declare function limit(limit: number): QueryConstraint;
export declare function limitToLast(limit: number): QueryConstraint;
export { LogLevel };
export { LogLevelString };
export declare function orderBy(
  fieldPath: string | FieldPath,
  directionStr?: OrderByDirection
): QueryConstraint;
export declare type OrderByDirection = 'desc' | 'asc';
export declare class Query<T = DocumentData> {
  readonly firestore: FirebaseFirestore;
  readonly type: 'query' | 'collection';
  protected constructor();
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}
export declare function query<T>(
  query: Query<T>,
  ...queryConstraints: QueryConstraint[]
): Query<T>;
export declare abstract class QueryConstraint {
  abstract readonly type: QueryConstraintType;
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
  data(): T;
}
export declare function queryEqual<T>(left: Query<T>, right: Query<T>): boolean;
export declare class QuerySnapshot<T = DocumentData> {
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
export declare function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean;
export declare function runTransaction<T>(
  firestore: FirebaseFirestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T>;
export declare function serverTimestamp(): FieldValue;
export declare function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
export declare function setDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T>,
  options: SetOptions
): Promise<void>;
export declare function setLogLevel(newLevel: LogLevelString): void;
export declare type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };
export declare interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
}
export declare function snapshotEqual<T>(
  left: DocumentSnapshot<T> | QuerySnapshot<T>,
  right: DocumentSnapshot<T> | QuerySnapshot<T>
): boolean;
export declare function startAfter(
  snapshot: DocumentSnapshot<unknown>
): QueryConstraint;
export declare function startAfter(...fieldValues: unknown[]): QueryConstraint;
export declare function startAt(
  snapshot: DocumentSnapshot<unknown>
): QueryConstraint;
export declare function startAt(...fieldValues: unknown[]): QueryConstraint;
export declare function terminate(firestore: FirebaseFirestore): Promise<void>;
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
export declare class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  static now(): Timestamp;
  static fromDate(date: Date): Timestamp;
  static fromMillis(milliseconds: number): Timestamp;
  constructor(seconds: number, nanoseconds: number);
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
export declare class Transaction {
  private constructor();
  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
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
    data: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this;
  delete(documentRef: DocumentReference<unknown>): this;
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
  private constructor();
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
    data: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  delete(documentRef: DocumentReference<unknown>): WriteBatch;
  commit(): Promise<void>;
}
export declare function writeBatch(firestore: FirebaseFirestore): WriteBatch;
export {};
