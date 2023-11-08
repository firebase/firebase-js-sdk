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

import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseApp, FirebaseService } from '@firebase/app-types/private';
import {
  LoadBundleTask,
  Bytes,
  clearIndexedDbPersistence,
  disableNetwork,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  enableNetwork,
  ensureFirestoreConfigured,
  Firestore as ExpFirestore,
  connectFirestoreEmulator,
  waitForPendingWrites,
  FieldPath as ExpFieldPath,
  limit,
  limitToLast,
  where,
  orderBy,
  startAfter,
  startAt,
  query,
  endBefore,
  endAt,
  doc,
  collection,
  collectionGroup,
  queryEqual,
  Query as ExpQuery,
  CollectionReference as ExpCollectionReference,
  DocumentReference as ExpDocumentReference,
  refEqual,
  addDoc,
  deleteDoc,
  executeWrite,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  onSnapshotsInSync,
  setDoc,
  updateDoc,
  Unsubscribe,
  DocumentChange as ExpDocumentChange,
  DocumentSnapshot as ExpDocumentSnapshot,
  QueryDocumentSnapshot as ExpQueryDocumentSnapshot,
  QuerySnapshot as ExpQuerySnapshot,
  snapshotEqual,
  SnapshotMetadata,
  runTransaction,
  Transaction as ExpTransaction,
  WriteBatch as ExpWriteBatch,
  AbstractUserDataWriter,
  FirestoreError,
  FirestoreDataConverter as ModularFirestoreDataConverter,
  setLogLevel as setClientLogLevel,
  _DatabaseId,
  _validateIsNotUsedTogether,
  _cast,
  _DocumentKey,
  _debugAssert,
  _FieldPath,
  _ResourcePath,
  _ByteString,
  _logWarn,
  namedQuery,
  loadBundle,
  PartialWithFieldValue,
  WithFieldValue
} from '@firebase/firestore';
import {
  CollectionReference as PublicCollectionReference,
  DocumentChange as PublicDocumentChange,
  DocumentChangeType as PublicDocumentChangeType,
  DocumentData,
  DocumentData as PublicDocumentData,
  DocumentReference as PublicDocumentReference,
  DocumentSnapshot as PublicDocumentSnapshot,
  FieldPath as PublicFieldPath,
  FirebaseFirestore as PublicFirestore,
  FirestoreDataConverter as PublicFirestoreDataConverter,
  GetOptions as PublicGetOptions,
  LogLevel as PublicLogLevel,
  OrderByDirection as PublicOrderByDirection,
  PersistenceSettings as PublicPersistenceSettings,
  Query as PublicQuery,
  QueryDocumentSnapshot as PublicQueryDocumentSnapshot,
  QuerySnapshot as PublicQuerySnapshot,
  SetOptions as PublicSetOptions,
  Settings as PublicSettings,
  SnapshotListenOptions as PublicSnapshotListenOptions,
  SnapshotOptions as PublicSnapshotOptions,
  Transaction as PublicTransaction,
  UpdateData as PublicUpdateData,
  WhereFilterOp as PublicWhereFilterOp,
  WriteBatch as PublicWriteBatch
} from '@firebase/firestore-types';
import {
  Compat,
  EmulatorMockTokenOptions,
  getModularInstance
} from '@firebase/util';

import { validateSetOptions } from '../util/input_validation';

import { Blob } from './blob';
import {
  CompleteFn,
  ErrorFn,
  isPartialObserver,
  NextFn,
  PartialObserver
} from './observer';

/**
 * A persistence provider for either memory-only or IndexedDB persistence.
 * Mainly used to allow optional inclusion of IndexedDB code.
 */
export interface PersistenceProvider {
  enableIndexedDbPersistence(
    firestore: Firestore,
    forceOwnership: boolean
  ): Promise<void>;
  enableMultiTabIndexedDbPersistence(firestore: Firestore): Promise<void>;
  clearIndexedDbPersistence(firestore: Firestore): Promise<void>;
}

/**
 * The persistence provider included with the full Firestore SDK.
 */
export class IndexedDbPersistenceProvider implements PersistenceProvider {
  enableIndexedDbPersistence(
    firestore: Firestore,
    forceOwnership: boolean
  ): Promise<void> {
    return enableIndexedDbPersistence(firestore._delegate, { forceOwnership });
  }
  enableMultiTabIndexedDbPersistence(firestore: Firestore): Promise<void> {
    return enableMultiTabIndexedDbPersistence(firestore._delegate);
  }
  clearIndexedDbPersistence(firestore: Firestore): Promise<void> {
    return clearIndexedDbPersistence(firestore._delegate);
  }
}

/**
 * Compat class for Firestore. Exposes Firestore Legacy API, but delegates
 * to the functional API of firestore-exp.
 */
export class Firestore
  implements PublicFirestore, FirebaseService, Compat<ExpFirestore>
{
  _appCompat?: FirebaseApp;
  constructor(
    databaseIdOrApp: _DatabaseId | FirebaseApp,
    readonly _delegate: ExpFirestore,
    private _persistenceProvider: PersistenceProvider
  ) {
    if (!(databaseIdOrApp instanceof _DatabaseId)) {
      this._appCompat = databaseIdOrApp as FirebaseApp;
    }
  }

  get _databaseId(): _DatabaseId {
    return this._delegate._databaseId;
  }

  settings(settingsLiteral: PublicSettings): void {
    const currentSettings = this._delegate._getSettings();
    if (
      !settingsLiteral.merge &&
      currentSettings.host !== settingsLiteral.host
    ) {
      _logWarn(
        'You are overriding the original host. If you did not intend ' +
          'to override your settings, use {merge: true}.'
      );
    }

    if (settingsLiteral.merge) {
      settingsLiteral = {
        ...currentSettings,
        ...settingsLiteral
      };
      // Remove the property from the settings once the merge is completed
      delete settingsLiteral.merge;
    }

    this._delegate._setSettings(settingsLiteral);
  }

  useEmulator(
    host: string,
    port: number,
    options: {
      mockUserToken?: EmulatorMockTokenOptions | string;
    } = {}
  ): void {
    connectFirestoreEmulator(this._delegate, host, port, options);
  }

  enableNetwork(): Promise<void> {
    return enableNetwork(this._delegate);
  }

  disableNetwork(): Promise<void> {
    return disableNetwork(this._delegate);
  }

  enablePersistence(settings?: PublicPersistenceSettings): Promise<void> {
    let synchronizeTabs = false;
    let experimentalForceOwningTab = false;

    if (settings) {
      synchronizeTabs = !!settings.synchronizeTabs;
      experimentalForceOwningTab = !!settings.experimentalForceOwningTab;

      _validateIsNotUsedTogether(
        'synchronizeTabs',
        synchronizeTabs,
        'experimentalForceOwningTab',
        experimentalForceOwningTab
      );
    }

    return synchronizeTabs
      ? this._persistenceProvider.enableMultiTabIndexedDbPersistence(this)
      : this._persistenceProvider.enableIndexedDbPersistence(
          this,
          experimentalForceOwningTab
        );
  }

  clearPersistence(): Promise<void> {
    return this._persistenceProvider.clearIndexedDbPersistence(this);
  }

  terminate(): Promise<void> {
    if (this._appCompat) {
      (this._appCompat as _FirebaseApp)._removeServiceInstance(
        'firestore-compat'
      );
      (this._appCompat as _FirebaseApp)._removeServiceInstance('firestore');
    }
    return this._delegate._delete();
  }

  waitForPendingWrites(): Promise<void> {
    return waitForPendingWrites(this._delegate);
  }

  onSnapshotsInSync(observer: PartialObserver<void>): Unsubscribe;
  onSnapshotsInSync(onSync: () => void): Unsubscribe;
  onSnapshotsInSync(arg: unknown): Unsubscribe {
    return onSnapshotsInSync(this._delegate, arg as PartialObserver<void>);
  }

  get app(): FirebaseApp {
    if (!this._appCompat) {
      throw new FirestoreError(
        'failed-precondition',
        "Firestore was not initialized using the Firebase SDK. 'app' is " +
          'not available'
      );
    }
    return this._appCompat as FirebaseApp;
  }

  INTERNAL = {
    delete: () => this.terminate()
  };

  collection(pathString: string): PublicCollectionReference {
    try {
      return new CollectionReference(
        this,
        collection(this._delegate, pathString)
      );
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        'collection()',
        'Firestore.collection()'
      );
    }
  }

  doc(pathString: string): PublicDocumentReference {
    try {
      return new DocumentReference(this, doc(this._delegate, pathString));
    } catch (e) {
      throw replaceFunctionName(e as Error, 'doc()', 'Firestore.doc()');
    }
  }

  collectionGroup(collectionId: string): PublicQuery {
    try {
      return new Query(this, collectionGroup(this._delegate, collectionId));
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        'collectionGroup()',
        'Firestore.collectionGroup()'
      );
    }
  }

  runTransaction<T>(
    updateFunction: (transaction: PublicTransaction) => Promise<T>
  ): Promise<T> {
    return runTransaction(this._delegate, transaction =>
      updateFunction(new Transaction(this, transaction))
    );
  }

  batch(): PublicWriteBatch {
    ensureFirestoreConfigured(this._delegate);
    return new WriteBatch(
      new ExpWriteBatch(this._delegate, mutations =>
        executeWrite(this._delegate, mutations)
      )
    );
  }

  loadBundle(
    bundleData: ArrayBuffer | ReadableStream<Uint8Array> | string
  ): LoadBundleTask {
    return loadBundle(this._delegate, bundleData);
  }

  namedQuery(name: string): Promise<PublicQuery<DocumentData> | null> {
    return namedQuery(this._delegate, name).then(expQuery => {
      if (!expQuery) {
        return null;
      }
      return new Query(
        this,
        // We can pass `expQuery` here directly since named queries don't have a UserDataConverter.
        // Otherwise, we would have to create a new ExpQuery and pass the old UserDataConverter.
        expQuery
      );
    });
  }
}

export class UserDataWriter extends AbstractUserDataWriter {
  constructor(protected firestore: Firestore) {
    super();
  }

  protected convertBytes(bytes: _ByteString): Blob {
    return new Blob(new Bytes(bytes));
  }

  protected convertReference(name: string): DocumentReference {
    const key = this.convertDocumentKey(name, this.firestore._databaseId);
    return DocumentReference.forKey(key, this.firestore, /* converter= */ null);
  }
}

export function setLogLevel(level: PublicLogLevel): void {
  setClientLogLevel(level);
}

/**
 * A reference to a transaction.
 */
export class Transaction implements PublicTransaction, Compat<ExpTransaction> {
  private _userDataWriter: UserDataWriter;

  constructor(
    private readonly _firestore: Firestore,
    readonly _delegate: ExpTransaction
  ) {
    this._userDataWriter = new UserDataWriter(_firestore);
  }

  get<T>(
    documentRef: PublicDocumentReference<T>
  ): Promise<PublicDocumentSnapshot<T>> {
    const ref = castReference(documentRef);
    return this._delegate
      .get(ref)
      .then(
        result =>
          new DocumentSnapshot(
            this._firestore,
            new ExpDocumentSnapshot<T>(
              this._firestore._delegate,
              this._userDataWriter,
              result._key,
              result._document,
              result.metadata,
              ref.converter
            )
          )
      );
  }

  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: PublicSetOptions
  ): Transaction;
  set<T>(documentRef: DocumentReference<T>, data: T): Transaction;
  set<T>(
    documentRef: PublicDocumentReference<T>,
    data: T | Partial<T>,
    options?: PublicSetOptions
  ): Transaction {
    const ref = castReference(documentRef);
    if (options) {
      validateSetOptions('Transaction.set', options);
      this._delegate.set(ref, data as PartialWithFieldValue<T>, options);
    } else {
      this._delegate.set(ref, data as WithFieldValue<T>);
    }
    return this;
  }

  update(
    documentRef: PublicDocumentReference<unknown>,
    data: PublicUpdateData
  ): Transaction;
  update(
    documentRef: PublicDocumentReference<unknown>,
    field: string | PublicFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Transaction;
  update(
    documentRef: PublicDocumentReference<unknown>,
    dataOrField: unknown,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Transaction {
    const ref = castReference(documentRef);
    if (arguments.length === 2) {
      this._delegate.update(ref, dataOrField as PublicUpdateData);
    } else {
      this._delegate.update(
        ref,
        dataOrField as string | ExpFieldPath,
        value,
        ...moreFieldsAndValues
      );
    }

    return this;
  }

  delete(documentRef: PublicDocumentReference<unknown>): Transaction {
    const ref = castReference(documentRef);
    this._delegate.delete(ref);
    return this;
  }
}

export class WriteBatch implements PublicWriteBatch, Compat<ExpWriteBatch> {
  constructor(readonly _delegate: ExpWriteBatch) {}
  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: PublicSetOptions
  ): WriteBatch;
  set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch;
  set<T>(
    documentRef: PublicDocumentReference<T>,
    data: T | Partial<T>,
    options?: PublicSetOptions
  ): WriteBatch {
    const ref = castReference(documentRef);
    if (options) {
      validateSetOptions('WriteBatch.set', options);
      this._delegate.set(ref, data as PartialWithFieldValue<T>, options);
    } else {
      this._delegate.set(ref, data as WithFieldValue<T>);
    }
    return this;
  }

  update(
    documentRef: PublicDocumentReference<unknown>,
    data: PublicUpdateData
  ): WriteBatch;
  update(
    documentRef: PublicDocumentReference<unknown>,
    field: string | PublicFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: PublicDocumentReference<unknown>,
    dataOrField: string | PublicFieldPath | PublicUpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch {
    const ref = castReference(documentRef);
    if (arguments.length === 2) {
      this._delegate.update(ref, dataOrField as PublicUpdateData);
    } else {
      this._delegate.update(
        ref,
        dataOrField as string | ExpFieldPath,
        value,
        ...moreFieldsAndValues
      );
    }
    return this;
  }

  delete(documentRef: PublicDocumentReference<unknown>): WriteBatch {
    const ref = castReference(documentRef);
    this._delegate.delete(ref);
    return this;
  }

  commit(): Promise<void> {
    return this._delegate.commit();
  }
}

/**
 * Wraps a `PublicFirestoreDataConverter` translating the types from the
 * experimental SDK into corresponding types from the Classic SDK before passing
 * them to the wrapped converter.
 */
class FirestoreDataConverter<U>
  implements
    ModularFirestoreDataConverter<U>,
    Compat<PublicFirestoreDataConverter<U>>
{
  private static readonly INSTANCES = new WeakMap();

  private constructor(
    private readonly _firestore: Firestore,
    private readonly _userDataWriter: UserDataWriter,
    readonly _delegate: PublicFirestoreDataConverter<U>
  ) {}

  fromFirestore(
    snapshot: ExpQueryDocumentSnapshot,
    options?: PublicSnapshotOptions
  ): U {
    const expSnapshot = new ExpQueryDocumentSnapshot(
      this._firestore._delegate,
      this._userDataWriter,
      snapshot._key,
      snapshot._document,
      snapshot.metadata,
      /* converter= */ null
    );
    return this._delegate.fromFirestore(
      new QueryDocumentSnapshot(this._firestore, expSnapshot),
      options ?? {}
    );
  }

  toFirestore(modelObject: WithFieldValue<U>): PublicDocumentData;
  toFirestore(
    modelObject: PartialWithFieldValue<U>,
    options: PublicSetOptions
  ): PublicDocumentData;
  toFirestore(
    modelObject: WithFieldValue<U> | PartialWithFieldValue<U>,
    options?: PublicSetOptions
  ): PublicDocumentData {
    if (!options) {
      return this._delegate.toFirestore(modelObject as U);
    } else {
      return this._delegate.toFirestore(modelObject as Partial<U>, options);
    }
  }

  // Use the same instance of `FirestoreDataConverter` for the given instances
  // of `Firestore` and `PublicFirestoreDataConverter` so that isEqual() will
  // compare equal for two objects created with the same converter instance.
  static getInstance<U>(
    firestore: Firestore,
    converter: PublicFirestoreDataConverter<U>
  ): FirestoreDataConverter<U> {
    const converterMapByFirestore = FirestoreDataConverter.INSTANCES;
    let untypedConverterByConverter = converterMapByFirestore.get(firestore);
    if (!untypedConverterByConverter) {
      untypedConverterByConverter = new WeakMap();
      converterMapByFirestore.set(firestore, untypedConverterByConverter);
    }

    let instance = untypedConverterByConverter.get(converter);
    if (!instance) {
      instance = new FirestoreDataConverter(
        firestore,
        new UserDataWriter(firestore),
        converter
      );
      untypedConverterByConverter.set(converter, instance);
    }

    return instance;
  }
}

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = PublicDocumentData>
  implements PublicDocumentReference<T>, Compat<ExpDocumentReference<T>>
{
  private _userDataWriter: UserDataWriter;

  constructor(
    readonly firestore: Firestore,
    readonly _delegate: ExpDocumentReference<T>
  ) {
    this._userDataWriter = new UserDataWriter(firestore);
  }

  static forPath<U>(
    path: _ResourcePath,
    firestore: Firestore,
    converter: ModularFirestoreDataConverter<U> | null
  ): DocumentReference<U> {
    if (path.length % 2 !== 0) {
      throw new FirestoreError(
        'invalid-argument',
        'Invalid document reference. Document ' +
          'references must have an even number of segments, but ' +
          `${path.canonicalString()} has ${path.length}`
      );
    }
    return new DocumentReference(
      firestore,
      new ExpDocumentReference(
        firestore._delegate,
        converter,
        new _DocumentKey(path)
      )
    );
  }

  static forKey<U>(
    key: _DocumentKey,
    firestore: Firestore,
    converter: ModularFirestoreDataConverter<U> | null
  ): DocumentReference<U> {
    return new DocumentReference(
      firestore,
      new ExpDocumentReference(firestore._delegate, converter, key)
    );
  }

  get id(): string {
    return this._delegate.id;
  }

  get parent(): PublicCollectionReference<T> {
    return new CollectionReference(this.firestore, this._delegate.parent);
  }

  get path(): string {
    return this._delegate.path;
  }

  collection(
    pathString: string
  ): PublicCollectionReference<PublicDocumentData> {
    try {
      return new CollectionReference(
        this.firestore,
        collection(this._delegate, pathString)
      );
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        'collection()',
        'DocumentReference.collection()'
      );
    }
  }

  isEqual(other: PublicDocumentReference<T>): boolean {
    other = getModularInstance<PublicDocumentReference<T>>(other);

    if (!(other instanceof ExpDocumentReference)) {
      return false;
    }
    return refEqual(this._delegate, other);
  }

  set(value: Partial<T>, options: PublicSetOptions): Promise<void>;
  set(value: T): Promise<void>;
  set(value: T | Partial<T>, options?: PublicSetOptions): Promise<void> {
    options = validateSetOptions('DocumentReference.set', options);
    try {
      if (options) {
        return setDoc(
          this._delegate,
          value as PartialWithFieldValue<T>,
          options
        );
      } else {
        return setDoc(this._delegate, value as WithFieldValue<T>);
      }
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        'setDoc()',
        'DocumentReference.set()'
      );
    }
  }

  update(value: PublicUpdateData): Promise<void>;
  update(
    field: string | PublicFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void>;
  update(
    fieldOrUpdateData: string | PublicFieldPath | PublicUpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void> {
    try {
      if (arguments.length === 1) {
        return updateDoc(this._delegate, fieldOrUpdateData as PublicUpdateData);
      } else {
        return updateDoc(
          this._delegate,
          fieldOrUpdateData as string | ExpFieldPath,
          value,
          ...moreFieldsAndValues
        );
      }
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        'updateDoc()',
        'DocumentReference.update()'
      );
    }
  }

  delete(): Promise<void> {
    return deleteDoc(this._delegate);
  }

  onSnapshot(observer: PartialObserver<PublicDocumentSnapshot<T>>): Unsubscribe;
  onSnapshot(
    options: PublicSnapshotListenOptions,
    observer: PartialObserver<PublicDocumentSnapshot<T>>
  ): Unsubscribe;
  onSnapshot(
    onNext: NextFn<PublicDocumentSnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;
  onSnapshot(
    options: PublicSnapshotListenOptions,
    onNext: NextFn<PublicDocumentSnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;

  onSnapshot(...args: unknown[]): Unsubscribe {
    const options = extractSnapshotOptions(args);
    const observer = wrapObserver<DocumentSnapshot<T>, ExpDocumentSnapshot<T>>(
      args,
      result =>
        new DocumentSnapshot(
          this.firestore,
          new ExpDocumentSnapshot(
            this.firestore._delegate,
            this._userDataWriter,
            result._key,
            result._document,
            result.metadata,
            this._delegate.converter
          )
        )
    );
    return onSnapshot(this._delegate, options, observer);
  }

  get(options?: PublicGetOptions): Promise<PublicDocumentSnapshot<T>> {
    let snap: Promise<ExpDocumentSnapshot<T>>;
    if (options?.source === 'cache') {
      snap = getDocFromCache(this._delegate);
    } else if (options?.source === 'server') {
      snap = getDocFromServer(this._delegate);
    } else {
      snap = getDoc(this._delegate);
    }

    return snap.then(
      result =>
        new DocumentSnapshot(
          this.firestore,
          new ExpDocumentSnapshot(
            this.firestore._delegate,
            this._userDataWriter,
            result._key,
            result._document,
            result.metadata,
            this._delegate.converter
          )
        )
    );
  }

  withConverter(converter: null): PublicDocumentReference<PublicDocumentData>;
  withConverter<U>(
    converter: PublicFirestoreDataConverter<U>
  ): PublicDocumentReference<U>;
  withConverter<U>(
    converter: PublicFirestoreDataConverter<U> | null
  ): PublicDocumentReference<U> {
    return new DocumentReference<U>(
      this.firestore,
      converter
        ? this._delegate.withConverter(
            FirestoreDataConverter.getInstance(this.firestore, converter)
          )
        : (this._delegate.withConverter(null) as ExpDocumentReference<U>)
    );
  }
}

/**
 * Replaces the function name in an error thrown by the firestore-exp API
 * with the function names used in the classic API.
 */
function replaceFunctionName(
  e: Error,
  original: string | RegExp,
  updated: string
): Error {
  e.message = e.message.replace(original, updated);
  return e;
}

/**
 * Iterates the list of arguments from an `onSnapshot` call and returns the
 * first argument that may be an `SnapshotListenOptions` object. Returns an
 * empty object if none is found.
 */
export function extractSnapshotOptions(
  args: unknown[]
): PublicSnapshotListenOptions {
  for (const arg of args) {
    if (typeof arg === 'object' && !isPartialObserver(arg)) {
      return arg as PublicSnapshotListenOptions;
    }
  }
  return {};
}

/**
 * Creates an observer that can be passed to the firestore-exp SDK. The
 * observer converts all observed values into the format expected by the classic
 * SDK.
 *
 * @param args - The list of arguments from an `onSnapshot` call.
 * @param wrapper - The function that converts the firestore-exp type into the
 * type used by this shim.
 */
export function wrapObserver<CompatType, ExpType>(
  args: unknown[],
  wrapper: (val: ExpType) => CompatType
): PartialObserver<ExpType> {
  let userObserver: PartialObserver<CompatType>;
  if (isPartialObserver(args[0])) {
    userObserver = args[0] as PartialObserver<CompatType>;
  } else if (isPartialObserver(args[1])) {
    userObserver = args[1];
  } else if (typeof args[0] === 'function') {
    userObserver = {
      next: args[0] as NextFn<CompatType> | undefined,
      error: args[1] as ErrorFn | undefined,
      complete: args[2] as CompleteFn | undefined
    };
  } else {
    userObserver = {
      next: args[1] as NextFn<CompatType> | undefined,
      error: args[2] as ErrorFn | undefined,
      complete: args[3] as CompleteFn | undefined
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
 * Options interface that can be provided to configure the deserialization of
 * DocumentSnapshots.
 */
export interface SnapshotOptions extends PublicSnapshotOptions {}

export class DocumentSnapshot<T = PublicDocumentData>
  implements PublicDocumentSnapshot<T>, Compat<ExpDocumentSnapshot<T>>
{
  constructor(
    private readonly _firestore: Firestore,
    readonly _delegate: ExpDocumentSnapshot<T>
  ) {}

  get ref(): DocumentReference<T> {
    return new DocumentReference<T>(this._firestore, this._delegate.ref);
  }

  get id(): string {
    return this._delegate.id;
  }

  get metadata(): SnapshotMetadata {
    return this._delegate.metadata;
  }

  get exists(): boolean {
    return this._delegate.exists();
  }

  data(options?: PublicSnapshotOptions): T | undefined {
    return this._delegate.data(options);
  }

  get(
    fieldPath: string | PublicFieldPath,
    options?: PublicSnapshotOptions
    // We are using `any` here to avoid an explicit cast by our users.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    return this._delegate.get(fieldPath as string | ExpFieldPath, options);
  }

  isEqual(other: DocumentSnapshot<T>): boolean {
    return snapshotEqual(this._delegate, other._delegate);
  }
}

export class QueryDocumentSnapshot<T = PublicDocumentData>
  extends DocumentSnapshot<T>
  implements PublicQueryDocumentSnapshot<T>
{
  data(options?: PublicSnapshotOptions): T {
    const data = this._delegate.data(options);
    if (this._delegate._converter) {
      // Undefined is a possible valid value from converter.
      return data as T;
    } else {
      _debugAssert(
        data !== undefined,
        'Document in a QueryDocumentSnapshot should exist'
      );
      return data;
    }
  }
}

export class Query<T = PublicDocumentData>
  implements PublicQuery<T>, Compat<ExpQuery<T>>
{
  private readonly _userDataWriter: UserDataWriter;

  constructor(readonly firestore: Firestore, readonly _delegate: ExpQuery<T>) {
    this._userDataWriter = new UserDataWriter(firestore);
  }

  where(
    fieldPath: string | _FieldPath,
    opStr: PublicWhereFilterOp,
    value: unknown
  ): Query<T> {
    try {
      // The "as string" cast is a little bit of a hack. `where` accepts the
      // FieldPath Compat type as input, but is not typed as such in order to
      // not expose this via our public typings file.
      return new Query<T>(
        this.firestore,
        query(this._delegate, where(fieldPath as string, opStr, value))
      );
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        /(orderBy|where)\(\)/,
        'Query.$1()'
      );
    }
  }

  orderBy(
    fieldPath: string | _FieldPath,
    directionStr?: PublicOrderByDirection
  ): Query<T> {
    try {
      // The "as string" cast is a little bit of a hack. `orderBy` accepts the
      // FieldPath Compat type as input, but is not typed as such in order to
      // not expose this via our public typings file.
      return new Query<T>(
        this.firestore,
        query(this._delegate, orderBy(fieldPath as string, directionStr))
      );
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        /(orderBy|where)\(\)/,
        'Query.$1()'
      );
    }
  }

  limit(n: number): Query<T> {
    try {
      return new Query<T>(this.firestore, query(this._delegate, limit(n)));
    } catch (e) {
      throw replaceFunctionName(e as Error, 'limit()', 'Query.limit()');
    }
  }

  limitToLast(n: number): Query<T> {
    try {
      return new Query<T>(
        this.firestore,
        query(this._delegate, limitToLast(n))
      );
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        'limitToLast()',
        'Query.limitToLast()'
      );
    }
  }

  startAt(...args: any[]): Query<T> {
    try {
      return new Query(this.firestore, query(this._delegate, startAt(...args)));
    } catch (e) {
      throw replaceFunctionName(e as Error, 'startAt()', 'Query.startAt()');
    }
  }

  startAfter(...args: any[]): Query<T> {
    try {
      return new Query(
        this.firestore,
        query(this._delegate, startAfter(...args))
      );
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        'startAfter()',
        'Query.startAfter()'
      );
    }
  }

  endBefore(...args: any[]): Query<T> {
    try {
      return new Query(
        this.firestore,
        query(this._delegate, endBefore(...args))
      );
    } catch (e) {
      throw replaceFunctionName(e as Error, 'endBefore()', 'Query.endBefore()');
    }
  }

  endAt(...args: any[]): Query<T> {
    try {
      return new Query(this.firestore, query(this._delegate, endAt(...args)));
    } catch (e) {
      throw replaceFunctionName(e as Error, 'endAt()', 'Query.endAt()');
    }
  }

  isEqual(other: PublicQuery<T>): boolean {
    return queryEqual(this._delegate, (other as Query<T>)._delegate);
  }

  get(options?: PublicGetOptions): Promise<QuerySnapshot<T>> {
    let query: Promise<ExpQuerySnapshot<T>>;
    if (options?.source === 'cache') {
      query = getDocsFromCache(this._delegate);
    } else if (options?.source === 'server') {
      query = getDocsFromServer(this._delegate);
    } else {
      query = getDocs(this._delegate);
    }
    return query.then(
      result =>
        new QuerySnapshot(
          this.firestore,
          new ExpQuerySnapshot<T>(
            this.firestore._delegate,
            this._userDataWriter,
            this._delegate,
            result._snapshot
          )
        )
    );
  }

  onSnapshot(observer: PartialObserver<PublicQuerySnapshot<T>>): Unsubscribe;
  onSnapshot(
    options: PublicSnapshotListenOptions,
    observer: PartialObserver<PublicQuerySnapshot<T>>
  ): Unsubscribe;
  onSnapshot(
    onNext: NextFn<PublicQuerySnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;
  onSnapshot(
    options: PublicSnapshotListenOptions,
    onNext: NextFn<PublicQuerySnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;

  onSnapshot(...args: unknown[]): Unsubscribe {
    const options = extractSnapshotOptions(args);
    const observer = wrapObserver<QuerySnapshot<T>, ExpQuerySnapshot<T>>(
      args,
      snap =>
        new QuerySnapshot(
          this.firestore,
          new ExpQuerySnapshot<T>(
            this.firestore._delegate,
            this._userDataWriter,
            this._delegate,
            snap._snapshot
          )
        )
    );
    return onSnapshot(this._delegate, options, observer);
  }

  withConverter(converter: null): Query<PublicDocumentData>;
  withConverter<U>(converter: PublicFirestoreDataConverter<U>): Query<U>;
  withConverter<U>(
    converter: PublicFirestoreDataConverter<U> | null
  ): Query<U> {
    return new Query<U>(
      this.firestore,
      converter
        ? this._delegate.withConverter(
            FirestoreDataConverter.getInstance(this.firestore, converter)
          )
        : (this._delegate.withConverter(null) as ExpQuery<U>)
    );
  }
}

export class DocumentChange<T = PublicDocumentData>
  implements PublicDocumentChange<T>, Compat<ExpDocumentChange<T>>
{
  constructor(
    private readonly _firestore: Firestore,
    readonly _delegate: ExpDocumentChange<T>
  ) {}

  get type(): PublicDocumentChangeType {
    return this._delegate.type;
  }

  get doc(): QueryDocumentSnapshot<T> {
    return new QueryDocumentSnapshot<T>(this._firestore, this._delegate.doc);
  }

  get oldIndex(): number {
    return this._delegate.oldIndex;
  }

  get newIndex(): number {
    return this._delegate.newIndex;
  }
}

export class QuerySnapshot<T = PublicDocumentData>
  implements PublicQuerySnapshot<T>, Compat<ExpQuerySnapshot<T>>
{
  constructor(
    readonly _firestore: Firestore,
    readonly _delegate: ExpQuerySnapshot<T>
  ) {}

  get query(): Query<T> {
    return new Query(this._firestore, this._delegate.query);
  }

  get metadata(): SnapshotMetadata {
    return this._delegate.metadata;
  }

  get size(): number {
    return this._delegate.size;
  }

  get empty(): boolean {
    return this._delegate.empty;
  }

  get docs(): Array<QueryDocumentSnapshot<T>> {
    return this._delegate.docs.map(
      doc => new QueryDocumentSnapshot<T>(this._firestore, doc)
    );
  }

  docChanges(
    options?: PublicSnapshotListenOptions
  ): Array<PublicDocumentChange<T>> {
    return this._delegate
      .docChanges(options)
      .map(docChange => new DocumentChange<T>(this._firestore, docChange));
  }

  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
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

export class CollectionReference<T = PublicDocumentData>
  extends Query<T>
  implements PublicCollectionReference<T>
{
  constructor(
    readonly firestore: Firestore,
    readonly _delegate: ExpCollectionReference<T>
  ) {
    super(firestore, _delegate);
  }

  get id(): string {
    return this._delegate.id;
  }

  get path(): string {
    return this._delegate.path;
  }

  get parent(): DocumentReference<PublicDocumentData> | null {
    const docRef = this._delegate.parent;
    return docRef ? new DocumentReference(this.firestore, docRef) : null;
  }

  doc(documentPath?: string): DocumentReference<T> {
    try {
      if (documentPath === undefined) {
        // Call `doc` without `documentPath` if `documentPath` is `undefined`
        // as `doc` validates the number of arguments to prevent users from
        // accidentally passing `undefined`.
        return new DocumentReference(this.firestore, doc(this._delegate));
      } else {
        return new DocumentReference(
          this.firestore,
          doc(this._delegate, documentPath)
        );
      }
    } catch (e) {
      throw replaceFunctionName(
        e as Error,
        'doc()',
        'CollectionReference.doc()'
      );
    }
  }

  add(data: T): Promise<DocumentReference<T>> {
    return addDoc(this._delegate, data as WithFieldValue<T>).then(
      docRef => new DocumentReference(this.firestore, docRef)
    );
  }

  isEqual(other: CollectionReference<T>): boolean {
    return refEqual(this._delegate, other._delegate);
  }

  withConverter(converter: null): CollectionReference<PublicDocumentData>;
  withConverter<U>(
    converter: PublicFirestoreDataConverter<U>
  ): CollectionReference<U>;
  withConverter<U>(
    converter: PublicFirestoreDataConverter<U> | null
  ): CollectionReference<U> {
    return new CollectionReference<U>(
      this.firestore,
      converter
        ? this._delegate.withConverter(
            FirestoreDataConverter.getInstance(this.firestore, converter)
          )
        : (this._delegate.withConverter(null) as ExpCollectionReference<U>)
    );
  }
}

function castReference<T>(
  documentRef: PublicDocumentReference<T>
): ExpDocumentReference<T> {
  return _cast<ExpDocumentReference<T>>(documentRef, ExpDocumentReference);
}
