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
import { DatabaseId } from '../core/database_info';
import {
  FirestoreClient,
  firestoreClientGetNamedQuery,
  firestoreClientLoadBundle
} from '../core/firestore_client';
import { DocumentKey } from '../model/document_key';
import { FieldPath, ResourcePath } from '../model/path';
import { debugAssert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import {
  cast,
  validateIsNotUsedTogether,
  validateSetOptions
} from '../util/input_validation';
import { logWarn, setLogLevel as setClientLogLevel } from '../util/log';
import { FieldPath as ExpFieldPath } from '../../lite/src/api/field_path';
import {
  CompleteFn,
  ErrorFn,
  isPartialObserver,
  NextFn,
  PartialObserver,
  Unsubscribe
} from './observer';
import { UntypedFirestoreDataConverter } from './user_data_reader';
import { UserDataWriter } from './user_data_writer';
import {
  clearIndexedDbPersistence,
  disableNetwork,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  enableNetwork,
  FirebaseFirestore,
  FirebaseFirestore as ExpFirebaseFirestore,
  waitForPendingWrites
} from '../../exp/src/api/database';
import {
  DocumentChange as ExpDocumentChange,
  DocumentSnapshot as ExpDocumentSnapshot,
  QuerySnapshot as ExpQuerySnapshot,
  snapshotEqual
} from '../../exp/src/api/snapshot';
import { refEqual } from '../../lite/src/api/reference';
import {
  addDoc,
  collection,
  collectionGroup,
  CollectionReference as ExpCollectionReference,
  deleteDoc,
  doc,
  DocumentReference as ExpDocumentReference,
  endAt,
  endBefore,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  limit,
  limitToLast,
  onSnapshot,
  onSnapshotsInSync,
  orderBy,
  query,
  Query as ExpQuery,
  queryEqual,
  setDoc,
  startAfter,
  startAt,
  updateDoc,
  where,
  executeWrite
} from '../../exp/src/api/reference';
import { LRU_COLLECTION_DISABLED } from '../local/lru_garbage_collector';
import { Compat } from '../compat/compat';
import { ApiLoadBundleTask, LoadBundleTask } from './bundle';
import { makeDatabaseInfo } from '../../lite/src/api/database';
import { DEFAULT_HOST } from '../../lite/src/api/components';
import { WriteBatch as ExpWriteBatch } from '../../exp/src/api/write_batch';
import {
  runTransaction,
  Transaction as ExpTransaction
} from '../../exp/src/api/transaction';

import {
  CollectionReference as PublicCollectionReference,
  DocumentChange as PublicDocumentChange,
  DocumentChangeType as PublicDocumentChangeType,
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
  SnapshotMetadata as PublicSnapshotMetadata,
  SnapshotOptions as PublicSnapshotOptions,
  Transaction as PublicTransaction,
  UpdateData as PublicUpdateData,
  WhereFilterOp as PublicWhereFilterOp,
  WriteBatch as PublicWriteBatch
} from '@firebase/firestore-types';

/**
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * `Firestore` instance.
 */
export const CACHE_SIZE_UNLIMITED = LRU_COLLECTION_DISABLED;

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

const MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE =
  'You are using the memory-only build of Firestore. Persistence support is ' +
  'only available via the @firebase/firestore bundle or the ' +
  'firebase-firestore.js build.';

/**
 * The persistence provider included with the memory-only SDK. This provider
 * errors for all attempts to access persistence.
 */
export class MemoryPersistenceProvider implements PersistenceProvider {
  enableIndexedDbPersistence(
    firestore: Firestore,
    forceOwnership: boolean
  ): Promise<void> {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }

  enableMultiTabIndexedDbPersistence(firestore: Firestore): Promise<void> {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }

  clearIndexedDbPersistence(firestore: Firestore): Promise<void> {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }
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
  extends Compat<ExpFirebaseFirestore>
  implements PublicFirestore, FirebaseService {
  _appCompat?: FirebaseApp;
  constructor(
    databaseIdOrApp: DatabaseId | FirebaseApp,
    delegate: ExpFirebaseFirestore,
    private _persistenceProvider: PersistenceProvider
  ) {
    super(delegate);

    if (!(databaseIdOrApp instanceof DatabaseId)) {
      this._appCompat = databaseIdOrApp as FirebaseApp;
    }
  }

  get _databaseId(): DatabaseId {
    return this._delegate._databaseId;
  }

  settings(settingsLiteral: PublicSettings): void {
    if (settingsLiteral.merge) {
      settingsLiteral = {
        ...this._delegate._getSettings(),
        ...settingsLiteral
      };
      // Remove the property from the settings once the merge is completed
      delete settingsLiteral.merge;
    }
    this._delegate._setSettings(settingsLiteral);
  }

  useEmulator(host: string, port: number): void {
    if (this._delegate._getSettings().host !== DEFAULT_HOST) {
      logWarn(
        'Host has been set in both settings() and useEmulator(), emulator host will be used'
      );
    }

    this.settings({
      host: `${host}:${port}`,
      ssl: false,
      merge: true
    });
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

      validateIsNotUsedTogether(
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
    (this.app as _FirebaseApp)._removeServiceInstance('firestore');
    (this.app as _FirebaseApp)._removeServiceInstance('firestore-exp');
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
        Code.FAILED_PRECONDITION,
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
      throw replaceFunctionName(e, 'collection()', 'Firestore.collection()');
    }
  }

  doc(pathString: string): PublicDocumentReference {
    try {
      return new DocumentReference(this, doc(this._delegate, pathString));
    } catch (e) {
      throw replaceFunctionName(e, 'doc()', 'Firestore.doc()');
    }
  }

  collectionGroup(collectionId: string): PublicQuery {
    try {
      return new Query(this, collectionGroup(this._delegate, collectionId));
    } catch (e) {
      throw replaceFunctionName(
        e,
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
}

export function ensureFirestoreConfigured(
  firestore: FirebaseFirestore
): FirestoreClient {
  if (!firestore._firestoreClient) {
    configureFirestore(firestore);
  }
  firestore._firestoreClient!.verifyNotTerminated();
  return firestore._firestoreClient as FirestoreClient;
}

export function configureFirestore(firestore: FirebaseFirestore): void {
  const settings = firestore._freezeSettings();
  debugAssert(!!settings.host, 'FirestoreSettings.host is not set');
  debugAssert(
    !firestore._firestoreClient,
    'configureFirestore() called multiple times'
  );

  const databaseInfo = makeDatabaseInfo(
    firestore._databaseId,
    firestore._persistenceKey,
    settings
  );
  firestore._firestoreClient = new FirestoreClient(
    firestore._credentials,
    firestore._queue,
    databaseInfo
  );
}

export function setLogLevel(level: PublicLogLevel): void {
  setClientLogLevel(level);
}

export function loadBundle(
  db: Firestore,
  bundleData: ArrayBuffer | ReadableStream<Uint8Array> | string
): ApiLoadBundleTask {
  const resultTask = new LoadBundleTask();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  firestoreClientLoadBundle(
    ensureFirestoreConfigured(db._delegate),
    bundleData,
    resultTask
  );
  return resultTask;
}

export function namedQuery(
  db: Firestore,
  name: string
): Promise<PublicQuery | null> {
  return firestoreClientGetNamedQuery(
    ensureFirestoreConfigured(db._delegate),
    name
  ).then(namedQuery => {
    if (!namedQuery) {
      return null;
    }
    return new Query(db, new ExpQuery(db._delegate, null, namedQuery.query));
  });
}

/**
 * A reference to a transaction.
 */
export class Transaction
  extends Compat<ExpTransaction>
  implements PublicTransaction {
  constructor(
    private readonly _firestore: Firestore,
    delegate: ExpTransaction
  ) {
    super(delegate);
  }

  get<T>(
    documentRef: PublicDocumentReference<T>
  ): Promise<PublicDocumentSnapshot<T>> {
    const ref = castReference(documentRef);
    return this._delegate
      .get(ref)
      .then(result => new DocumentSnapshot(this._firestore, result));
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
      this._delegate.set(ref, data, options);
    } else {
      this._delegate.set(ref, data);
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

export class WriteBatch
  extends Compat<ExpWriteBatch>
  implements PublicWriteBatch {
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
      this._delegate.set(ref, data, options);
    } else {
      this._delegate.set(ref, data);
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
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = PublicDocumentData>
  extends Compat<ExpDocumentReference<T>>
  implements PublicDocumentReference<T> {
  private _userDataWriter: UserDataWriter;

  constructor(
    readonly firestore: Firestore,
    delegate: ExpDocumentReference<T>
  ) {
    super(delegate);
    this._userDataWriter = new UserDataWriter(firestore);
  }

  static forPath<U>(
    path: ResourcePath,
    firestore: Firestore,
    converter: UntypedFirestoreDataConverter<U> | null
  ): DocumentReference<U> {
    if (path.length % 2 !== 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
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
        new DocumentKey(path)
      )
    );
  }

  static forKey<U>(
    key: DocumentKey,
    firestore: Firestore,
    converter: UntypedFirestoreDataConverter<U> | null
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
        e,
        'collection()',
        'DocumentReference.collection()'
      );
    }
  }

  isEqual(other: PublicDocumentReference<T>): boolean {
    if (other instanceof Compat) {
      other = other._delegate;
    }
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
      return setDoc(this._delegate, value, options);
    } catch (e) {
      throw replaceFunctionName(e, 'setDoc()', 'DocumentReference.set()');
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
      throw replaceFunctionName(e, 'updateDoc()', 'DocumentReference.update()');
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
            this._delegate._converter
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
            this._delegate._converter as UntypedFirestoreDataConverter<T>
          )
        )
    );
  }

  withConverter<U>(
    converter: PublicFirestoreDataConverter<U>
  ): PublicDocumentReference<U> {
    return new DocumentReference<U>(
      this.firestore,
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
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
 * @param args The list of arguments from an `onSnapshot` call.
 * @param wrapper The function that converts the firestore-exp type into the
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
 * Metadata about a snapshot, describing the state of the snapshot.
 */
export class SnapshotMetadata implements PublicSnapshotMetadata {
  /**
   * True if the snapshot contains the result of local writes (for example
   * `set()` or `update()` calls) that have not yet been committed to the
   * backend. If your listener has opted into metadata updates (via
   * `SnapshotListenOptions`) you will receive another snapshot with
   * `hasPendingWrites` equal to false once the writes have been committed to
   * the backend.
   */
  readonly hasPendingWrites: boolean;

  /**
   * True if the snapshot was created from cached data rather than guaranteed
   * up-to-date server data. If your listener has opted into metadata updates
   * (via `SnapshotListenOptions`) you will receive another snapshot with
   * `fromCache` set to false once the client has received up-to-date data from
   * the backend.
   */
  readonly fromCache: boolean;

  constructor(hasPendingWrites: boolean, fromCache: boolean) {
    this.hasPendingWrites = hasPendingWrites;
    this.fromCache = fromCache;
  }

  /**
   * Returns true if this `SnapshotMetadata` is equal to the provided one.
   *
   * @param other The `SnapshotMetadata` to compare against.
   * @return true if this `SnapshotMetadata` is equal to the provided one.
   */
  isEqual(other: PublicSnapshotMetadata): boolean {
    return (
      this.hasPendingWrites === other.hasPendingWrites &&
      this.fromCache === other.fromCache
    );
  }
}

/**
 * Options interface that can be provided to configure the deserialization of
 * DocumentSnapshots.
 */
export interface SnapshotOptions extends PublicSnapshotOptions {}

export class DocumentSnapshot<T = PublicDocumentData>
  extends Compat<ExpDocumentSnapshot<T>>
  implements PublicDocumentSnapshot<T> {
  constructor(
    private readonly _firestore: Firestore,
    delegate: ExpDocumentSnapshot<T>
  ) {
    super(delegate);
  }

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
  implements PublicQueryDocumentSnapshot<T> {
  data(options?: PublicSnapshotOptions): T {
    const data = this._delegate.data(options);
    debugAssert(
      data !== undefined,
      'Document in a QueryDocumentSnapshot should exist'
    );
    return data;
  }
}

export class Query<T = PublicDocumentData>
  extends Compat<ExpQuery<T>>
  implements PublicQuery<T> {
  constructor(readonly firestore: Firestore, delegate: ExpQuery<T>) {
    super(delegate);
  }

  where(
    fieldPath: string | FieldPath,
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
      throw replaceFunctionName(e, /(orderBy|where)\(\)/, 'Query.$1()');
    }
  }

  orderBy(
    fieldPath: string | FieldPath,
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
      throw replaceFunctionName(e, /(orderBy|where)\(\)/, 'Query.$1()');
    }
  }

  limit(n: number): Query<T> {
    try {
      return new Query<T>(this.firestore, query(this._delegate, limit(n)));
    } catch (e) {
      throw replaceFunctionName(e, 'limit()', 'Query.limit()');
    }
  }

  limitToLast(n: number): Query<T> {
    try {
      return new Query<T>(
        this.firestore,
        query(this._delegate, limitToLast(n))
      );
    } catch (e) {
      throw replaceFunctionName(e, 'limitToLast()', 'Query.limitToLast()');
    }
  }

  startAt(...args: any[]): Query<T> {
    try {
      return new Query(this.firestore, query(this._delegate, startAt(...args)));
    } catch (e) {
      throw replaceFunctionName(e, 'startAt()', 'Query.startAt()');
    }
  }

  startAfter(...args: any[]): Query<T> {
    try {
      return new Query(
        this.firestore,
        query(this._delegate, startAfter(...args))
      );
    } catch (e) {
      throw replaceFunctionName(e, 'startAfter()', 'Query.startAfter()');
    }
  }

  endBefore(...args: any[]): Query<T> {
    try {
      return new Query(
        this.firestore,
        query(this._delegate, endBefore(...args))
      );
    } catch (e) {
      throw replaceFunctionName(e, 'endBefore()', 'Query.endBefore()');
    }
  }

  endAt(...args: any[]): Query<T> {
    try {
      return new Query(this.firestore, query(this._delegate, endAt(...args)));
    } catch (e) {
      throw replaceFunctionName(e, 'endAt()', 'Query.endAt()');
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
    return query.then(result => new QuerySnapshot(this.firestore, result));
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
      snap => new QuerySnapshot(this.firestore, snap)
    );
    return onSnapshot(this._delegate, options, observer);
  }

  withConverter<U>(converter: PublicFirestoreDataConverter<U>): Query<U> {
    return new Query<U>(
      this.firestore,
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
    );
  }
}

export class DocumentChange<T = PublicDocumentData>
  extends Compat<ExpDocumentChange<T>>
  implements PublicDocumentChange<T> {
  constructor(
    private readonly _firestore: Firestore,
    delegate: ExpDocumentChange<T>
  ) {
    super(delegate);
  }

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
  extends Compat<ExpQuerySnapshot<T>>
  implements PublicQuerySnapshot<T> {
  constructor(readonly _firestore: Firestore, delegate: ExpQuerySnapshot<T>) {
    super(delegate);
  }

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
  implements PublicCollectionReference<T> {
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
      throw replaceFunctionName(e, 'doc()', 'CollectionReference.doc()');
    }
  }

  add(data: T): Promise<DocumentReference<T>> {
    return addDoc(this._delegate, data).then(
      docRef => new DocumentReference(this.firestore, docRef)
    );
  }

  isEqual(other: CollectionReference<T>): boolean {
    return refEqual(this._delegate, other._delegate);
  }

  withConverter<U>(
    converter: PublicFirestoreDataConverter<U>
  ): CollectionReference<U> {
    return new CollectionReference<U>(
      this.firestore,
      this._delegate.withConverter(
        converter as UntypedFirestoreDataConverter<U>
      )
    );
  }
}

function castReference<T>(
  documentRef: PublicDocumentReference<T>
): ExpDocumentReference<T> {
  if (documentRef instanceof Compat) {
    documentRef = documentRef._delegate;
  }
  return cast<ExpDocumentReference<T>>(documentRef, ExpDocumentReference);
}

/**
 * Converts custom model object of type T into DocumentData by applying the
 * converter if it exists.
 *
 * This function is used when converting user objects to DocumentData
 * because we want to provide the user with a more specific error message if
 * their set() or fails due to invalid data originating from a toFirestore()
 * call.
 */
export function applyFirestoreDataConverter<T>(
  converter: UntypedFirestoreDataConverter<T> | null,
  value: T,
  options?: PublicSetOptions
): PublicDocumentData {
  let convertedValue;
  if (converter) {
    if (options && (options.merge || options.mergeFields)) {
      // Cast to `any` in order to satisfy the union type constraint on
      // toFirestore().
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      convertedValue = (converter as any).toFirestore(value, options);
    } else {
      convertedValue = converter.toFirestore(value);
    }
  } else {
    convertedValue = value as PublicDocumentData;
  }
  return convertedValue;
}
