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

import * as firestore from '@firebase/firestore-types';
import * as exp from '../../../exp/';

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  clearIndexedDbPersistence,
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  disableNetwork,
  doc,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  enableNetwork,
  FieldPath as FieldPathExp,
  getDoc,
  getQuery,
  getQueryFromCache,
  getQueryFromServer,
  increment,
  onSnapshot,
  onSnapshotsInSync,
  parent,
  queryEqual,
  refEqual,
  runTransaction,
  serverTimestamp,
  setDoc,
  snapshotEqual,
  terminate,
  updateDoc,
  waitForPendingWrites,
  writeBatch,
  getDocFromCache,
  getDocFromServer
} from '../../../exp/index.node';
import { UntypedFirestoreDataConverter } from '../../../src/api/user_data_reader';
import { isPartialObserver, PartialObserver } from '../../../src/api/observer';

export { GeoPoint, Blob, Timestamp } from '../../../exp/index.node';

/* eslint-disable @typescript-eslint/no-explicit-any */

// This module defines a shim layer that implements the legacy API on top
// of the experimental SDK. This shim is used to run integration tests against
// both SDK versions.

export class FirebaseFirestore implements firestore.FirebaseFirestore {
  constructor(private readonly _delegate: exp.FirebaseFirestore) {}

  settings(settings: firestore.Settings): void {
    throw new Error('setting() is not supported in shim');
  }

  enablePersistence(settings?: firestore.PersistenceSettings): Promise<void> {
    return settings?.synchronizeTabs
      ? enableMultiTabIndexedDbPersistence(this._delegate)
      : enableIndexedDbPersistence(this._delegate);
  }

  collection(
    collectionPath: string
  ): CollectionReference<firestore.DocumentData> {
    return new CollectionReference(collection(this._delegate, collectionPath));
  }

  doc(documentPath: string): DocumentReference<firestore.DocumentData> {
    return new DocumentReference(doc(this._delegate, documentPath));
  }

  collectionGroup(collectionId: string): Query<firestore.DocumentData> {
    return new Query(collectionGroup(this._delegate, collectionId));
  }

  runTransaction<T>(
    updateFunction: (transaction: firestore.Transaction) => Promise<T>
  ): Promise<T> {
    return runTransaction(this._delegate, t =>
      updateFunction(new Transaction(t))
    );
  }

  batch(): firestore.WriteBatch {
    return new WriteBatch(writeBatch(this._delegate));
  }

  app = this._delegate.app;

  clearPersistence(): Promise<void> {
    return clearIndexedDbPersistence(this._delegate);
  }

  enableNetwork(): Promise<void> {
    return enableNetwork(this._delegate);
  }

  disableNetwork(): Promise<void> {
    return disableNetwork(this._delegate);
  }

  waitForPendingWrites(): Promise<void> {
    return waitForPendingWrites(this._delegate);
  }

  onSnapshotsInSync(observer: {
    next?: (value: void) => void;
    error?: (error: Error) => void;
    complete?: () => void;
  }): () => void;
  onSnapshotsInSync(onSync: () => void): () => void;
  onSnapshotsInSync(arg: any): () => void {
    return onSnapshotsInSync(this._delegate, arg);
  }

  terminate(): Promise<void> {
    return terminate(this._delegate);
  }

  INTERNAL = {
    delete: () => {
      throw new Error('delete() is not supported in shim');
    }
  };
}

export class Transaction {
  constructor(private readonly _delegate: exp.Transaction) {}

  async get<T>(
    documentRef: DocumentReference<T>
  ): Promise<DocumentSnapshot<T>> {
    const result = await this._delegate.get(documentRef._delegate);
    return new DocumentSnapshot(result);
  }

  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: firestore.SetOptions
  ): Transaction {
    if (options) {
      this._delegate.set(documentRef._delegate, data, options);
    } else {
      this._delegate.set(documentRef._delegate, data);
    }
    return this;
  }

  update(
    documentRef: DocumentReference<any>,
    data: firestore.UpdateData
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
      this._delegate.update(documentRef._delegate, dataOrField);
    } else {
      this._delegate.update.apply(this._delegate, [
        documentRef._delegate,
        dataOrField,
        value,
        ...moreFieldsAndValues
      ]);
    }

    return this;
  }

  delete(documentRef: DocumentReference<any>): Transaction {
    this._delegate.delete(documentRef._delegate);
    return this;
  }
}

export class WriteBatch {
  constructor(private readonly _delegate: exp.WriteBatch) {}

  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: firestore.SetOptions
  ): WriteBatch {
    if (options) {
      this._delegate.set(documentRef._delegate, data, options);
    } else {
      this._delegate.set(documentRef._delegate, data);
    }
    return this;
  }

  update(
    documentRef: DocumentReference<any>,
    data: firestore.UpdateData
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
      this._delegate.update(documentRef._delegate, dataOrField);
    } else {
      this._delegate.update.apply(this._delegate, [
        documentRef._delegate,
        dataOrField,
        value,
        ...moreFieldsAndValues
      ]);
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

export class DocumentReference<T = firestore.DocumentData>
  implements firestore.DocumentReference<T> {
  constructor(readonly _delegate: exp.DocumentReference<T>) {}

  readonly id = this._delegate.id;
  readonly firestore = new FirebaseFirestore(this._delegate.firestore);
  readonly path = this._delegate.path;

  get parent(): firestore.CollectionReference<T> {
    return new CollectionReference<T>(parent(this._delegate));
  }

  collection(
    collectionPath: string
  ): firestore.CollectionReference<firestore.DocumentData> {
    return new CollectionReference(collection(this._delegate, collectionPath));
  }

  isEqual(other: DocumentReference<T>): boolean {
    return refEqual(this._delegate, other._delegate);
  }

  set(data: Partial<T>, options?: firestore.SetOptions): Promise<void> {
    if (options) {
      return setDoc(this._delegate, data, options);
    } else {
      return setDoc(this._delegate, data);
    }
  }

  update(data: firestore.UpdateData): Promise<void>;
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
      return updateDoc(this._delegate, dataOrField);
    } else {
      return updateDoc.apply(null, [
        this._delegate,
        dataOrField,
        value,
        ...moreFieldsAndValues
      ]);
    }
  }

  delete(): Promise<void> {
    return deleteDoc(this._delegate);
  }

  async get(options?: firestore.GetOptions): Promise<DocumentSnapshot<T>> {
    let doc: exp.DocumentSnapshot<T>;
    if (options?.source === 'cache') {
      doc = await getDocFromCache(this._delegate);
    } else if (options?.source === 'server') {
      doc = await getDocFromServer(this._delegate);
    } else {
      doc = await getDoc(this._delegate);
    }
    return new DocumentSnapshot(doc);
  }

  onSnapshot(observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: firestore.FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
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
    options: firestore.SnapshotListenOptions,
    onNext: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(...args: any): () => void {
    let options: firestore.SnapshotListenOptions = {};
    let userObserver: PartialObserver<DocumentSnapshot<T>>;

    if (isPartialObserver(args[0])) {
      userObserver = args[0] as PartialObserver<DocumentSnapshot<T>>;
    } else if (isPartialObserver(args[1])) {
      options = args[0];
      userObserver = args[1];
    } else if (typeof args[0] === 'function') {
      userObserver = {
        next: args[0],
        error: args[1],
        complete: args[2]
      };
    } else {
      options = args[0];
      userObserver = {
        next: args[1],
        error: args[2],
        complete: args[3]
      };
    }

    const apiObserver: PartialObserver<exp.DocumentSnapshot<T>> = {
      next: snapshot => {
        if (userObserver!.next) {
          userObserver!.next(new DocumentSnapshot(snapshot));
        }
      },
      error: userObserver.error?.bind(userObserver),
      complete: userObserver.complete?.bind(userObserver)
    };

    return onSnapshot(this._delegate, options, apiObserver);
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): DocumentReference<U> {
    return new DocumentReference<U>(
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
    );
  }
}

export class DocumentSnapshot<T = firestore.DocumentData>
  implements firestore.DocumentSnapshot<T> {
  constructor(readonly _delegate: exp.DocumentSnapshot<T>) {}

  readonly ref = new DocumentReference<T>(this._delegate.ref);
  readonly id = this._delegate.id;
  readonly metadata = this._delegate.metadata;

  get exists(): boolean {
    return this._delegate.exists();
  }

  data(options?: firestore.SnapshotOptions): T | undefined {
    return this._delegate.data(options);
  }

  get(fieldPath: string | FieldPath, options?: firestore.SnapshotOptions): any {
    return this._delegate.get(fieldPath, options);
  }

  isEqual(other: DocumentSnapshot<T>): boolean {
    return snapshotEqual(this._delegate, other._delegate);
  }
}

export class QueryDocumentSnapshot<T = firestore.DocumentData>
  extends DocumentSnapshot<T>
  implements firestore.QueryDocumentSnapshot<T> {
  constructor(readonly _delegate: exp.QueryDocumentSnapshot<T>) {
    super(_delegate);
  }

  data(options?: firestore.SnapshotOptions): T {
    return this._delegate.data(options);
  }
}

export class Query<T = firestore.DocumentData> implements firestore.Query<T> {
  constructor(readonly _delegate: exp.Query<T>) {}

  readonly firestore = new FirebaseFirestore(this._delegate.firestore);

  where(
    fieldPath: string | FieldPath,
    opStr: firestore.WhereFilterOp,
    value: any
  ): Query<T> {
    if (typeof fieldPath === 'string') {
      return new Query<T>(this._delegate.where(fieldPath, opStr, value));
    } else {
      return new Query<T>(
        this._delegate.where(fieldPath._delegate, opStr, value)
      );
    }
  }

  orderBy(
    fieldPath: string | FieldPath,
    directionStr?: firestore.OrderByDirection
  ): Query<T> {
    if (typeof fieldPath === 'string') {
      return new Query<T>(this._delegate.orderBy(fieldPath, directionStr));
    } else {
      return new Query<T>(
        this._delegate.orderBy(fieldPath._delegate, directionStr)
      );
    }
  }

  limit(limit: number): Query<T> {
    return new Query<T>(this._delegate.limit(limit));
  }

  limitToLast(limit: number): Query<T> {
    return new Query<T>(this._delegate.limitToLast(limit));
  }

  startAt(...args: any[]): Query<T> {
    return new Query<T>(
      this._delegate.startAt.apply(this._delegate, [args[0], ...args.slice(1)])
    );
  }

  startAfter(...args: any[]): Query<T> {
    return new Query<T>(
      this._delegate.startAfter.apply(this._delegate, [
        args[0],
        ...args.slice(1)
      ])
    );
  }

  endBefore(...args: any[]): Query<T> {
    return new Query<T>(
      this._delegate.endBefore.apply(this._delegate, [
        args[0],
        ...args.slice(1)
      ])
    );
  }

  endAt(...args: any[]): Query<T> {
    return new Query<T>(
      this._delegate.endAt.apply(this._delegate, [args[0], ...args.slice(1)])
    );
  }

  isEqual(other: firestore.Query<T>): boolean {
    return queryEqual(this._delegate, (other as Query<T>)._delegate);
  }

  async get(options?: firestore.GetOptions): Promise<QuerySnapshot<T>> {
    let result: exp.QuerySnapshot<T>;
    if (options?.source === 'cache') {
      result = await getQueryFromCache(this._delegate);
    } else if (options?.source === 'server') {
      result = await getQueryFromServer(this._delegate);
    } else {
      result = await getQuery(this._delegate);
    }
    return new QuerySnapshot(result);
  }

  onSnapshot(observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: Error) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
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
    options: firestore.SnapshotListenOptions,
    onNext: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(...args: any): () => void {
    let options: firestore.SnapshotListenOptions = {};
    let userObserver: PartialObserver<QuerySnapshot<T>>;

    if (isPartialObserver(args[0])) {
      userObserver = args[0] as PartialObserver<QuerySnapshot<T>>;
    } else if (isPartialObserver(args[1])) {
      options = args[0];
      userObserver = args[1];
    } else if (typeof args[0] === 'function') {
      userObserver = {
        next: args[0],
        error: args[1],
        complete: args[2]
      };
    } else {
      options = args[0];
      userObserver = {
        next: args[1],
        error: args[2],
        complete: args[3]
      };
    }

    const apiObserver: PartialObserver<exp.QuerySnapshot<T>> = {
      next: snapshot => {
        if (userObserver!.next) {
          userObserver!.next(new QuerySnapshot(snapshot));
        }
      },
      error: userObserver.error?.bind(userObserver),
      complete: userObserver.complete?.bind(userObserver)
    };

    return onSnapshot(this._delegate, options, apiObserver);
  }

  withConverter<U>(converter: firestore.FirestoreDataConverter<U>): Query<U> {
    return new Query<U>(
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
    );
  }
}

export class QuerySnapshot<T = firestore.DocumentData>
  implements firestore.QuerySnapshot<T> {
  constructor(readonly _delegate: exp.QuerySnapshot<T>) {}

  readonly query = new Query(this._delegate.query);
  readonly metadata = this._delegate.metadata;
  readonly size = this._delegate.size;
  readonly empty = this._delegate.empty;

  get docs(): Array<QueryDocumentSnapshot<T>> {
    return this._delegate.docs.map(doc => new QueryDocumentSnapshot<T>(doc));
  }

  docChanges(
    options?: firestore.SnapshotListenOptions
  ): Array<DocumentChange<T>> {
    return this._delegate
      .docChanges(options)
      .map(docChange => new DocumentChange<T>(docChange));
  }

  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: any
  ): void {
    this._delegate.forEach(snapshot => {
      callback.call(thisArg, new QueryDocumentSnapshot(snapshot));
    });
  }

  isEqual(other: QuerySnapshot<T>): boolean {
    return snapshotEqual(this._delegate, other._delegate);
  }
}

export class DocumentChange<T = firestore.DocumentData>
  implements firestore.DocumentChange<T> {
  constructor(private readonly _delegate: exp.DocumentChange<T>) {}
  readonly type = this._delegate.type;
  readonly doc = new QueryDocumentSnapshot<T>(this._delegate.doc);
  readonly oldIndex = this._delegate.oldIndex;
  readonly newIndex = this._delegate.oldIndex;
}

export class CollectionReference<T = firestore.DocumentData> extends Query<T>
  implements firestore.CollectionReference<T> {
  constructor(readonly _delegate: exp.CollectionReference<T>) {
    super(_delegate);
  }

  readonly id = this._delegate.id;
  readonly path = this._delegate.path;

  get parent(): DocumentReference<firestore.DocumentData> | null {
    const docRef = parent(this._delegate);
    return docRef
      ? new DocumentReference<firestore.DocumentData>(docRef)
      : null;
  }

  doc(documentPath?: string): DocumentReference<T> {
    if (documentPath) {
      return new DocumentReference<T>(doc(this._delegate, documentPath));
    } else {
      return new DocumentReference<T>(doc(this._delegate));
    }
  }

  async add(data: T): Promise<DocumentReference<T>> {
    const docRef = await addDoc(this._delegate, data);
    return new DocumentReference<T>(docRef);
  }

  isEqual(other: CollectionReference<T>): boolean {
    return refEqual(this._delegate, other._delegate);
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): CollectionReference<U> {
    return new CollectionReference<U>(
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
    );
  }
}

export class FieldValue implements firestore.FieldValue {
  static serverTimestamp(): FieldValue {
    return serverTimestamp();
  }

  static delete(): FieldValue {
    return deleteField();
  }

  static arrayUnion(...elements: any[]): FieldValue {
    return arrayUnion(...elements);
  }

  static arrayRemove(...elements: any[]): FieldValue {
    return arrayRemove(...elements);
  }

  static increment(n: number): FieldValue {
    return increment(n);
  }

  isEqual(other: FieldValue): boolean {
    throw new Error('isEqual() is not supported in shim');
  }
}

export class FieldPath implements firestore.FieldPath {
  private fieldNames: string[];

  constructor(...fieldNames: string[]) {
    this.fieldNames = fieldNames;
  }

  static documentId(): FieldPath {
    return new FieldPath('__name__');
  }

  get _delegate(): FieldPathExp {
    return new FieldPathExp(...this.fieldNames);
  }

  isEqual(other: FieldPath): boolean {
    throw new Error('isEqual() is not supported in shim');
  }
}
