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
  doc,
  FieldPath as FieldPathExp,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  query,
  queryEqual,
  refEqual,
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
import {
  isPlainObject,
  validateSetOptions
} from '../../src/util/input_validation';
import { Compat } from '../../src/compat/compat';
import {
  Firestore,
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot,
  wrapObserver,
  extractSnapshotOptions
} from '../../src/api/database';

export { GeoPoint, Timestamp } from '../index';
export { loadBundle, namedQuery } from '../../src/api/bundle';

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
