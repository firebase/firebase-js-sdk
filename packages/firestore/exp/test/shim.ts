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

import * as legacy from '@firebase/firestore-types';
import * as exp from '../index';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentReference as DocumentReferenceExp,
  FieldPath as FieldPathExp,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  query,
  queryEqual,
  refEqual,
  setDoc,
  snapshotEqual,
  updateDoc,
  endAt,
  endBefore,
  startAfter,
  startAt,
  limitToLast,
  limit,
  orderBy,
  where,
  Bytes as BytesExp
} from '../../exp/index';
import { UntypedFirestoreDataConverter } from '../../src/api/user_data_reader';
import { isPartialObserver, PartialObserver } from '../../src/api/observer';
import {
  isPlainObject,
  validateSetOptions
} from '../../src/util/input_validation';
import { Compat } from '../../src/compat/compat';
import { Firestore, loadBundle, namedQuery } from '../../src/api/database';

export { GeoPoint, Timestamp } from '../index';
export { loadBundle, namedQuery };

/* eslint-disable @typescript-eslint/no-explicit-any */

// This module defines a shim layer that implements the legacy API on top
// of the experimental SDK. This shim is used to run integration tests against
// both SDK versions.

export class Transaction
  extends Compat<exp.Transaction>
  implements legacy.Transaction {
  constructor(
    private readonly _firestore: Firestore,
    delegate: exp.Transaction
  ) {
    super(delegate);
  }

  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
    return this._delegate
      .get(documentRef._delegate)
      .then(result => new DocumentSnapshot(this._firestore, result));
  }

  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: legacy.SetOptions
  ): Transaction {
    if (options) {
      validateSetOptions('Transaction.set', options);
      this._delegate.set(documentRef._delegate, unwrap(data), options);
    } else {
      this._delegate.set(documentRef._delegate, unwrap(data));
    }
    return this;
  }

  update(
    documentRef: DocumentReference<any>,
    data: legacy.UpdateData
  ): Transaction;
  update(
    documentRef: DocumentReference<any>,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Transaction;
  update(
    documentRef: DocumentReference<any>,
    dataOrField: any,
    value?: any,
    ...moreFieldsAndValues: any[]
  ): Transaction {
    if (arguments.length === 2) {
      this._delegate.update(documentRef._delegate, unwrap(dataOrField));
    } else {
      this._delegate.update(
        documentRef._delegate,
        unwrap(dataOrField),
        unwrap(value),
        ...unwrap(moreFieldsAndValues)
      );
    }

    return this;
  }

  delete(documentRef: DocumentReference<any>): Transaction {
    this._delegate.delete(documentRef._delegate);
    return this;
  }
}

export class WriteBatch
  extends Compat<exp.WriteBatch>
  implements legacy.WriteBatch {
  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: legacy.SetOptions
  ): WriteBatch {
    if (options) {
      validateSetOptions('WriteBatch.set', options);
      this._delegate.set(documentRef._delegate, unwrap(data), options);
    } else {
      this._delegate.set(documentRef._delegate, unwrap(data));
    }
    return this;
  }

  update(
    documentRef: DocumentReference<any>,
    data: legacy.UpdateData
  ): WriteBatch;
  update(
    documentRef: DocumentReference<any>,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): WriteBatch;
  update(
    documentRef: DocumentReference<any>,
    dataOrField: any,
    value?: any,
    ...moreFieldsAndValues: any[]
  ): WriteBatch {
    if (arguments.length === 2) {
      this._delegate.update(documentRef._delegate, unwrap(dataOrField));
    } else {
      this._delegate.update(
        documentRef._delegate,
        unwrap(dataOrField),
        unwrap(value),
        ...unwrap(moreFieldsAndValues)
      );
    }

    return this;
  }

  delete(documentRef: DocumentReference<any>): WriteBatch {
    this._delegate.delete(documentRef._delegate);
    return this;
  }

  commit(): Promise<void> {
    return this._delegate.commit();
  }
}

export class DocumentReference<T = legacy.DocumentData>
  extends Compat<exp.DocumentReference<T>>
  implements legacy.DocumentReference<T> {
  constructor(
    readonly firestore: Firestore,
    delegate: exp.DocumentReference<T>
  ) {
    super(delegate);
  }

  readonly id = this._delegate.id;
  readonly path = this._delegate.path;

  get parent(): legacy.CollectionReference<T> {
    return new CollectionReference<T>(this.firestore, this._delegate.parent);
  }

  collection(
    collectionPath: string
  ): legacy.CollectionReference<legacy.DocumentData> {
    return new CollectionReference(
      this.firestore,
      collection(this._delegate, collectionPath)
    );
  }

  isEqual(other: DocumentReference<T>): boolean {
    return refEqual(this._delegate, other._delegate);
  }

  set(data: Partial<T>, options?: legacy.SetOptions): Promise<void> {
    if (options) {
      validateSetOptions('DocumentReference.set', options);
      return setDoc(this._delegate, unwrap(data), options);
    } else {
      return setDoc(this._delegate, unwrap(data));
    }
  }

  update(data: legacy.UpdateData): Promise<void>;
  update(
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Promise<void>;
  update(
    dataOrField: any,
    value?: any,
    ...moreFieldsAndValues: any[]
  ): Promise<void> {
    if (arguments.length === 1) {
      return updateDoc(this._delegate, unwrap(dataOrField));
    } else {
      return updateDoc(
        this._delegate,
        unwrap(dataOrField),
        unwrap(value),
        ...unwrap(moreFieldsAndValues)
      );
    }
  }

  delete(): Promise<void> {
    return deleteDoc(this._delegate);
  }

  get(options?: legacy.GetOptions): Promise<DocumentSnapshot<T>> {
    let snap: Promise<exp.DocumentSnapshot<T>>;
    if (options?.source === 'cache') {
      snap = getDocFromCache(this._delegate);
    } else if (options?.source === 'server') {
      snap = getDocFromServer(this._delegate);
    } else {
      snap = getDoc(this._delegate);
    }
    return snap.then(result => new DocumentSnapshot(this.firestore, result));
  }

  onSnapshot(observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: legacy.FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: legacy.SnapshotListenOptions,
    observer: {
      next?: (snapshot: DocumentSnapshot<T>) => void;
      error?: (error: legacy.FirestoreError) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: legacy.FirestoreError) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: legacy.SnapshotListenOptions,
    onNext: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: legacy.FirestoreError) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(...args: any): () => void {
    const options = extractSnapshotOptions(args);
    const observer = wrapObserver<DocumentSnapshot<T>, exp.DocumentSnapshot<T>>(
      args,
      snap => new DocumentSnapshot(this.firestore, snap)
    );
    return onSnapshot(this._delegate, options, observer);
  }

  withConverter<U>(
    converter: legacy.FirestoreDataConverter<U>
  ): DocumentReference<U> {
    return new DocumentReference<U>(
      this.firestore,
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
    );
  }
}

export class DocumentSnapshot<T = legacy.DocumentData>
  extends Compat<exp.DocumentSnapshot<T>>
  implements legacy.DocumentSnapshot<T> {
  constructor(
    private readonly _firestore: Firestore,
    delegate: exp.DocumentSnapshot<T>
  ) {
    super(delegate);
  }

  readonly ref = new DocumentReference<T>(this._firestore, this._delegate.ref);
  readonly id = this._delegate.id;
  readonly metadata = this._delegate.metadata;

  get exists(): boolean {
    return this._delegate.exists();
  }

  data(options?: legacy.SnapshotOptions): T | undefined {
    return wrap(this._firestore, this._delegate.data(options));
  }

  get(fieldPath: string | FieldPath, options?: legacy.SnapshotOptions): any {
    return wrap(
      this._firestore,
      this._delegate.get(unwrap(fieldPath), options)
    );
  }

  isEqual(other: DocumentSnapshot<T>): boolean {
    return snapshotEqual(this._delegate, other._delegate);
  }
}

export class QueryDocumentSnapshot<T = legacy.DocumentData>
  extends DocumentSnapshot<T>
  implements legacy.QueryDocumentSnapshot<T> {
  data(options?: legacy.SnapshotOptions): T {
    return this._delegate.data(options)!;
  }
}

export class Query<T = legacy.DocumentData>
  extends Compat<exp.Query<T>>
  implements legacy.Query<T> {
  constructor(readonly firestore: Firestore, delegate: exp.Query<T>) {
    super(delegate);
  }

  where(
    fieldPath: string | FieldPath,
    opStr: legacy.WhereFilterOp,
    value: any
  ): Query<T> {
    return new Query<T>(
      this.firestore,
      query(this._delegate, where(unwrap(fieldPath), opStr, unwrap(value)))
    );
  }

  orderBy(
    fieldPath: string | FieldPath,
    directionStr?: legacy.OrderByDirection
  ): Query<T> {
    return new Query<T>(
      this.firestore,
      query(this._delegate, orderBy(unwrap(fieldPath), directionStr))
    );
  }

  limit(n: number): Query<T> {
    return new Query<T>(this.firestore, query(this._delegate, limit(n)));
  }

  limitToLast(n: number): Query<T> {
    return new Query<T>(this.firestore, query(this._delegate, limitToLast(n)));
  }

  startAt(...args: any[]): Query<T> {
    return new Query(
      this.firestore,
      query(this._delegate, startAt(...unwrap(args)))
    );
  }

  startAfter(...args: any[]): Query<T> {
    return new Query(
      this.firestore,
      query(this._delegate, startAfter(...unwrap(args)))
    );
  }

  endBefore(...args: any[]): Query<T> {
    return new Query(
      this.firestore,
      query(this._delegate, endBefore(...unwrap(args)))
    );
  }

  endAt(...args: any[]): Query<T> {
    return new Query(
      this.firestore,
      query(this._delegate, endAt(...unwrap(args)))
    );
  }

  isEqual(other: legacy.Query<T>): boolean {
    return queryEqual(this._delegate, (other as Query<T>)._delegate);
  }

  get(options?: legacy.GetOptions): Promise<QuerySnapshot<T>> {
    let query: Promise<exp.QuerySnapshot<T>>;
    if (options?.source === 'cache') {
      query = getDocsFromCache(this._delegate);
    } else if (options?.source === 'server') {
      query = getDocsFromServer(this._delegate);
    } else {
      query = getDocs(this._delegate);
    }
    return query.then(result => new QuerySnapshot(this.firestore, result));
  }

  onSnapshot(observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: legacy.FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: legacy.SnapshotListenOptions,
    observer: {
      next?: (snapshot: QuerySnapshot<T>) => void;
      error?: (error: legacy.FirestoreError) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: legacy.FirestoreError) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: legacy.SnapshotListenOptions,
    onNext: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: legacy.FirestoreError) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(...args: any): () => void {
    const options = extractSnapshotOptions(args);
    const observer = wrapObserver<QuerySnapshot<T>, exp.QuerySnapshot<T>>(
      args,
      snap => new QuerySnapshot(this.firestore, snap)
    );
    return onSnapshot(this._delegate, options, observer);
  }

  withConverter<U>(converter: legacy.FirestoreDataConverter<U>): Query<U> {
    return new Query<U>(
      this.firestore,
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
    );
  }
}

export class QuerySnapshot<T = legacy.DocumentData>
  implements legacy.QuerySnapshot<T> {
  constructor(
    readonly _firestore: Firestore,
    readonly _delegate: exp.QuerySnapshot<T>
  ) {}

  readonly query = new Query(this._firestore, this._delegate.query);
  readonly metadata = this._delegate.metadata;
  readonly size = this._delegate.size;
  readonly empty = this._delegate.empty;

  get docs(): Array<QueryDocumentSnapshot<T>> {
    return this._delegate.docs.map(
      doc => new QueryDocumentSnapshot<T>(this._firestore, doc)
    );
  }

  docChanges(options?: legacy.SnapshotListenOptions): Array<DocumentChange<T>> {
    return this._delegate
      .docChanges(options)
      .map(docChange => new DocumentChange<T>(this._firestore, docChange));
  }

  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: any
  ): void {
    this._delegate.forEach(snapshot => {
      callback.call(
        thisArg,
        new QueryDocumentSnapshot(this._firestore, snapshot)
      );
    });
  }

  isEqual(other: QuerySnapshot<T>): boolean {
    return snapshotEqual(this._delegate, other._delegate);
  }
}

export class DocumentChange<T = legacy.DocumentData>
  implements legacy.DocumentChange<T> {
  constructor(
    private readonly _firestore: Firestore,
    private readonly _delegate: exp.DocumentChange<T>
  ) {}
  readonly type = this._delegate.type;
  readonly doc = new QueryDocumentSnapshot<T>(
    this._firestore,
    this._delegate.doc
  );
  readonly oldIndex = this._delegate.oldIndex;
  readonly newIndex = this._delegate.oldIndex;
}

export class CollectionReference<T = legacy.DocumentData>
  extends Query<T>
  implements legacy.CollectionReference<T> {
  constructor(
    readonly firestore: Firestore,
    readonly _delegate: exp.CollectionReference<T>
  ) {
    super(firestore, _delegate);
  }

  readonly id = this._delegate.id;
  readonly path = this._delegate.path;

  get parent(): DocumentReference<legacy.DocumentData> | null {
    const docRef = this._delegate.parent;
    return docRef
      ? new DocumentReference<legacy.DocumentData>(this.firestore, docRef)
      : null;
  }

  doc(documentPath?: string): DocumentReference<T> {
    if (documentPath !== undefined) {
      return new DocumentReference(
        this.firestore,
        doc(this._delegate, documentPath)
      );
    } else {
      return new DocumentReference(this.firestore, doc(this._delegate));
    }
  }

  add(data: T): Promise<DocumentReference<T>> {
    return addDoc(this._delegate, unwrap(data)).then(
      docRef => new DocumentReference(this.firestore, docRef)
    );
  }

  isEqual(other: CollectionReference<T>): boolean {
    return refEqual(this._delegate, other._delegate);
  }

  withConverter<U>(
    converter: legacy.FirestoreDataConverter<U>
  ): CollectionReference<U> {
    return new CollectionReference<U>(
      this.firestore,
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
    );
  }
}

export class FieldPath
  extends Compat<FieldPathExp>
  implements legacy.FieldPath {
  constructor(...fieldNames: string[]) {
    super(new FieldPathExp(...fieldNames));
  }

  static documentId(): FieldPath {
    return new FieldPath('__name__');
  }

  isEqual(other: FieldPath): boolean {
    throw new Error('isEqual() is not supported in shim');
  }
}

export class Blob extends Compat<BytesExp> implements legacy.Blob {
  static fromBase64String(base64: string): Blob {
    return new Blob(BytesExp.fromBase64String(base64));
  }

  static fromUint8Array(array: Uint8Array): Blob {
    return new Blob(BytesExp.fromUint8Array(array));
  }

  toBase64(): string {
    return this._delegate.toBase64();
  }

  toUint8Array(): Uint8Array {
    return this._delegate.toUint8Array();
  }

  isEqual(other: Blob): boolean {
    return this._delegate.isEqual(other._delegate);
  }
}

/**
 * Takes document data that uses the firestore-exp API types and replaces them
 * with the API types defined in this shim.
 */
function wrap(firestore: Firestore, value: any): any {
  if (Array.isArray(value)) {
    return value.map(v => wrap(firestore, v));
  } else if (value instanceof FieldPathExp) {
    return new FieldPath(...value._internalPath.toArray());
  } else if (value instanceof BytesExp) {
    return new Blob(value);
  } else if (value instanceof DocumentReferenceExp) {
    return new DocumentReference(firestore, value);
  } else if (isPlainObject(value)) {
    const obj: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        obj[key] = wrap(firestore, value[key]);
      }
    }
    return obj;
  } else {
    return value;
  }
}

/**
 * Takes user data that uses API types from this shim and replaces them
 * with the the firestore-exp API types.
 */
function unwrap(value: any): any {
  if (Array.isArray(value)) {
    return value.map(v => unwrap(v));
  } else if (value instanceof Compat) {
    return value._delegate;
  } else if (value instanceof FieldPath) {
    return value._delegate;
  } else if (isPlainObject(value)) {
    const obj: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        obj[key] = unwrap(value[key]);
      }
    }
    return obj;
  } else {
    return value;
  }
}

/**
 * Creates an observer that can be passed to the firestore-exp SDK. The
 * observer converts all observed values into the format expected by the shim.
 *
 * @param args The list of arguments from an `onSnapshot` call.
 * @param wrapper The function that converts the firestore-exp type into the
 * type used by this shim.
 */
function wrapObserver<ShimType, ExpType>(
  args: any,
  wrapper: (val: ExpType) => ShimType
): PartialObserver<ExpType> {
  let userObserver: PartialObserver<ShimType>;
  if (isPartialObserver(args[0])) {
    userObserver = args[0] as PartialObserver<ShimType>;
  } else if (isPartialObserver(args[1])) {
    userObserver = args[1];
  } else if (typeof args[0] === 'function') {
    userObserver = {
      next: args[0],
      error: args[1],
      complete: args[2]
    };
  } else {
    userObserver = {
      next: args[1],
      error: args[2],
      complete: args[3]
    };
  }

  return {
    next: val => {
      if (userObserver!.next) {
        userObserver!.next(wrapper(val));
      }
    },
    error: userObserver.error?.bind(userObserver),
    complete: userObserver.complete?.bind(userObserver)
  };
}

/**
 * Iterates the list of arguments from an `onSnapshot` call and returns the
 * first argument that may be an `SnapshotListenOptions` object. Returns an
 * empty object if none is found.
 */
function extractSnapshotOptions(args: any): exp.SnapshotListenOptions {
  for (const arg of args) {
    if (typeof arg === 'object' && !isPartialObserver(arg)) {
      return arg as exp.SnapshotListenOptions;
    }
  }
  return {};
}
