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

import { Value as ProtoValue } from '../protos/firestore_proto_api';
import {
  CollectionReference as PublicCollectionReference,
  DocumentChange as PublicDocumentChange,
  DocumentChangeType,
  DocumentData,
  DocumentReference as PublicDocumentReference,
  DocumentSnapshot as PublicDocumentSnapshot,
  FirebaseFirestore as PublicFirestore,
  FirestoreDataConverter,
  GetOptions,
  LogLevel as PublicLogLevel,
  OrderByDirection,
  PersistenceSettings as PublicPersistenceSettings,
  Query as PublicQuery,
  QueryDocumentSnapshot as PublicQueryDocumentSnapshot,
  QuerySnapshot as PublicQuerySnapshot,
  SetOptions,
  Settings as PublicSettings,
  SnapshotListenOptions,
  SnapshotMetadata as PublicSnapshotMetadata,
  SnapshotOptions as PublicSnapshotOptions,
  Transaction as PublicTransaction,
  UpdateData,
  WhereFilterOp,
  WriteBatch as PublicWriteBatch
} from '@firebase/firestore-types';

import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseApp, FirebaseService } from '@firebase/app-types/private';
import { Blob } from './blob';
import { DatabaseId } from '../core/database_info';
import { ListenOptions } from '../core/event_manager';
import {
  FirestoreClient,
  firestoreClientAddSnapshotsInSyncListener,
  firestoreClientDisableNetwork,
  firestoreClientEnableNetwork,
  firestoreClientGetDocumentFromLocalCache,
  firestoreClientGetDocumentsFromLocalCache,
  firestoreClientGetDocumentsViaSnapshotListener,
  firestoreClientGetDocumentViaSnapshotListener,
  firestoreClientListen,
  firestoreClientTransaction,
  firestoreClientWaitForPendingWrites,
  firestoreClientWrite
} from '../core/firestore_client';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
  findFilterOperator,
  getFirstOrderByField,
  getInequalityFilterField,
  hasLimitToLast,
  isCollectionGroupQuery,
  LimitType,
  newQueryComparator,
  newQueryForCollectionGroup,
  newQueryForPath,
  Operator,
  OrderBy,
  Query as InternalQuery,
  queryEquals,
  queryOrderBy,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  queryWithEndAt,
  queryWithLimit,
  queryWithStartAt
} from '../core/query';
import { Transaction as InternalTransaction } from '../core/transaction';
import { ChangeType, ViewSnapshot } from '../core/view_snapshot';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { DeleteMutation, Mutation, Precondition } from '../model/mutation';
import { FieldPath, ResourcePath } from '../model/path';
import { isServerTimestamp } from '../model/server_timestamps';
import { refValue } from '../model/values';
import { debugAssert, fail } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import {
  cast,
  validateIsNotUsedTogether,
  validateNonEmptyArgument,
  validatePositiveNumber,
  validateSetOptions,
  valueDescription
} from '../util/input_validation';
import { logWarn, setLogLevel as setClientLogLevel } from '../util/log';
import { AutoId } from '../util/misc';
import { FieldPath as ExternalFieldPath } from './field_path';
import {
  CredentialsProvider,
  EmptyCredentialsProvider,
  FirebaseCredentialsProvider,
  makeCredentialsProvider
} from './credentials';
import {
  CompleteFn,
  ErrorFn,
  isPartialObserver,
  NextFn,
  PartialObserver,
  Unsubscribe
} from './observer';
import {
  _DocumentKeyReference,
  fieldPathFromArgument,
  parseQueryValue,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UntypedFirestoreDataConverter,
  UserDataReader
} from './user_data_reader';
import { UserDataWriter } from './user_data_writer';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import {
  clearIndexedDbPersistence,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence
} from '../../exp/src/api/database';
import { LRU_COLLECTION_DISABLED } from '../local/lru_garbage_collector';
import {
  FirestoreSettings,
  makeDatabaseInfo
} from '../../lite/src/api/database';
import { DEFAULT_HOST } from '../../lite/src/api/components';

/**
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * `Firestore` instance.
 */
export const CACHE_SIZE_UNLIMITED = LRU_COLLECTION_DISABLED;

/**
 * Options that can be provided in the Firestore constructor when not using
 * Firebase (aka standalone mode).
 */
export interface FirestoreDatabase {
  projectId: string;
  database?: string;
}

// TODO(firestore-compat): This interface exposes internal APIs that the Compat
// layer implements to interact with the firestore-exp SDK. We can remove this
// class once we have an actual compat class for FirebaseFirestore.
export interface FirestoreCompat {
  readonly _initialized: boolean;
  readonly _terminated: boolean;
  readonly _databaseId: DatabaseId;
  readonly _persistenceKey: string;
  readonly _queue: AsyncQueue;
  readonly _credentials: CredentialsProvider;
  _firestoreClient?: FirestoreClient;
  _getSettings(): FirestoreSettings;
}

/**
 * A persistence provider for either memory-only or IndexedDB persistence.
 * Mainly used to allow optional inclusion of IndexedDB code.
 */
export interface PersistenceProvider {
  enableIndexedDbPersistence(
    firestore: FirestoreCompat,
    forceOwnership: boolean
  ): Promise<void>;
  enableMultiTabIndexedDbPersistence(firestore: FirestoreCompat): Promise<void>;
  clearIndexedDbPersistence(firestore: FirestoreCompat): Promise<void>;
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
    firestore: FirestoreCompat,
    forceOwnership: boolean
  ): Promise<void> {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }

  enableMultiTabIndexedDbPersistence(
    firestore: FirestoreCompat
  ): Promise<void> {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }

  clearIndexedDbPersistence(firestore: FirestoreCompat): Promise<void> {
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
    firestore: FirestoreCompat,
    forceOwnership: boolean
  ): Promise<void> {
    return enableIndexedDbPersistence(firestore, { forceOwnership });
  }
  enableMultiTabIndexedDbPersistence = enableMultiTabIndexedDbPersistence.bind(
    null
  );
  clearIndexedDbPersistence = clearIndexedDbPersistence.bind(null);
}
/**
 * The root reference to the database.
 */
export class Firestore
  implements PublicFirestore, FirebaseService, FirestoreCompat {
  // The objects that are a part of this API are exposed to third-parties as
  // compiled javascript so we want to flag our private members with a leading
  // underscore to discourage their use.
  readonly _databaseId: DatabaseId;
  readonly _persistenceKey: string;
  _credentials: CredentialsProvider;
  private readonly _firebaseApp: FirebaseApp | null = null;
  private _settings: FirestoreSettings;

  // The firestore client instance. This will be available as soon as
  // `configureFirestore()` is called, but any calls against it will block until
  // setup has completed.
  _firestoreClient?: FirestoreClient;

  // Public for use in tests.
  // TODO(mikelehen): Use modularized initialization instead.
  readonly _queue = new AsyncQueue();

  _userDataReader: UserDataReader | undefined;

  // Note: We are using `MemoryPersistenceProvider` as a default
  // ComponentProvider to ensure backwards compatibility with the format
  // expected by the console build.
  constructor(
    databaseIdOrApp: FirestoreDatabase | FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>,
    readonly _persistenceProvider: PersistenceProvider = new MemoryPersistenceProvider()
  ) {
    if (typeof (databaseIdOrApp as FirebaseApp).options === 'object') {
      // This is very likely a Firebase app object
      // TODO(b/34177605): Can we somehow use instanceof?
      const app = databaseIdOrApp as FirebaseApp;
      this._firebaseApp = app;
      this._databaseId = Firestore.databaseIdFromApp(app);
      this._persistenceKey = app.name;
      this._credentials = new FirebaseCredentialsProvider(authProvider);
    } else {
      const external = databaseIdOrApp as FirestoreDatabase;
      if (!external.projectId) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Must provide projectId'
        );
      }

      this._databaseId = new DatabaseId(external.projectId, external.database);
      // Use a default persistenceKey that lines up with FirebaseApp.
      this._persistenceKey = '[DEFAULT]';
      this._credentials = new EmptyCredentialsProvider();
    }

    this._settings = new FirestoreSettings({});
  }

  get _initialized(): boolean {
    return !!this._firestoreClient;
  }

  get _terminated(): boolean {
    return this._queue.isShuttingDown;
  }

  get _dataReader(): UserDataReader {
    debugAssert(
      !!this._firestoreClient,
      'Cannot obtain UserDataReader before instance is intitialized'
    );
    if (!this._userDataReader) {
      // Lazy initialize UserDataReader once the settings are frozen
      this._userDataReader = new UserDataReader(
        this._databaseId,
        this._settings.ignoreUndefinedProperties
      );
    }
    return this._userDataReader;
  }

  settings(settingsLiteral: PublicSettings): void {
    if (settingsLiteral.merge) {
      settingsLiteral = { ...this._settings, ...settingsLiteral };
      // Remove the property from the settings once the merge is completed
      delete settingsLiteral.merge;
    }

    const newSettings = new FirestoreSettings(settingsLiteral);
    if (this._firestoreClient && !this._settings.isEqual(newSettings)) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and its settings can no longer ' +
          'be changed. You can only modify settings before calling any other ' +
          'methods on a Firestore object.'
      );
    }

    this._settings = newSettings;
    if (newSettings.credentials !== undefined) {
      this._credentials = makeCredentialsProvider(newSettings.credentials);
    }
  }

  useEmulator(host: string, port: number): void {
    if (this._settings.host !== DEFAULT_HOST) {
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
    ensureFirestoreConfigured(this);
    return firestoreClientEnableNetwork(this._firestoreClient!);
  }

  disableNetwork(): Promise<void> {
    ensureFirestoreConfigured(this);
    return firestoreClientDisableNetwork(this._firestoreClient!);
  }

  enablePersistence(settings?: PublicPersistenceSettings): Promise<void> {
    if (this._firestoreClient) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and persistence can no longer ' +
          'be enabled. You can only call enablePersistence() before calling ' +
          'any other methods on a Firestore object.'
      );
    }

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

  async clearPersistence(): Promise<void> {
    return this._persistenceProvider.clearIndexedDbPersistence(this);
  }

  terminate(): Promise<void> {
    (this.app as _FirebaseApp)._removeServiceInstance('firestore');
    return this.INTERNAL.delete();
  }

  waitForPendingWrites(): Promise<void> {
    ensureFirestoreConfigured(this);
    return firestoreClientWaitForPendingWrites(this._firestoreClient!);
  }

  onSnapshotsInSync(observer: PartialObserver<void>): Unsubscribe;
  onSnapshotsInSync(onSync: () => void): Unsubscribe;
  onSnapshotsInSync(arg: unknown): Unsubscribe {
    ensureFirestoreConfigured(this);

    if (isPartialObserver(arg)) {
      return firestoreClientAddSnapshotsInSyncListener(
        this._firestoreClient!,
        arg as PartialObserver<void>
      );
    } else {
      const observer: PartialObserver<void> = {
        next: arg as () => void
      };
      return firestoreClientAddSnapshotsInSyncListener(
        this._firestoreClient!,
        observer
      );
    }
  }

  private static databaseIdFromApp(app: FirebaseApp): DatabaseId {
    if (!contains(app.options, 'projectId')) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        '"projectId" not provided in firebase.initializeApp.'
      );
    }

    const projectId = app.options.projectId;
    if (!projectId || typeof projectId !== 'string') {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'projectId must be a string in FirebaseApp.options'
      );
    }
    return new DatabaseId(projectId);
  }

  get app(): FirebaseApp {
    if (!this._firebaseApp) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        "Firestore was not initialized using the Firebase SDK. 'app' is " +
          'not available'
      );
    }
    return this._firebaseApp;
  }

  INTERNAL = {
    delete: async (): Promise<void> => {
      if (!this._firestoreClient) {
        // The client must be initialized to ensure that all subsequent API
        // usage throws an exception.
        configureFirestore(this);
      }
      await this._firestoreClient!.terminate();
    }
  };

  collection(pathString: string): PublicCollectionReference {
    validateNonEmptyArgument('Firestore.collection', 'path', pathString);
    ensureFirestoreConfigured(this);
    return new CollectionReference(
      ResourcePath.fromString(pathString),
      this,
      /* converter= */ null
    );
  }

  doc(pathString: string): PublicDocumentReference {
    validateNonEmptyArgument('Firestore.doc', 'path', pathString);
    ensureFirestoreConfigured(this);
    return DocumentReference.forPath(
      ResourcePath.fromString(pathString),
      this,
      /* converter= */ null
    );
  }

  collectionGroup(collectionId: string): PublicQuery {
    validateNonEmptyArgument(
      'Firestore.collectionGroup',
      'collectionId',
      collectionId
    );
    if (collectionId.indexOf('/') >= 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid collection ID '${collectionId}' passed to function ` +
          `Firestore.collectionGroup(). Collection IDs must not contain '/'.`
      );
    }
    ensureFirestoreConfigured(this);
    return new Query(
      newQueryForCollectionGroup(collectionId),
      this,
      /* converter= */ null
    );
  }

  runTransaction<T>(
    updateFunction: (transaction: PublicTransaction) => Promise<T>
  ): Promise<T> {
    const client = ensureFirestoreConfigured(this);
    return firestoreClientTransaction(
      client,
      (transaction: InternalTransaction) => {
        return updateFunction(new Transaction(this, transaction));
      }
    );
  }

  batch(): PublicWriteBatch {
    ensureFirestoreConfigured(this);
    return new WriteBatch(this);
  }

  _getSettings(): FirestoreSettings {
    return this._settings;
  }
}

export function ensureFirestoreConfigured(
  firestore: FirestoreCompat
): FirestoreClient {
  if (!firestore._firestoreClient) {
    configureFirestore(firestore);
  }
  firestore._firestoreClient!.verifyNotTerminated();
  return firestore._firestoreClient as FirestoreClient;
}

export function configureFirestore(firestore: FirestoreCompat): void {
  const settings = firestore._getSettings();
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

/**
 * A reference to a transaction.
 */
export class Transaction implements PublicTransaction {
  constructor(
    private _firestore: Firestore,
    private _transaction: InternalTransaction
  ) {}

  get<T>(
    documentRef: PublicDocumentReference<T>
  ): Promise<PublicDocumentSnapshot<T>> {
    const ref = validateReference(
      'Transaction.get',
      documentRef,
      this._firestore
    );
    return this._transaction
      .lookup([ref._key])
      .then((docs: MaybeDocument[]) => {
        if (!docs || docs.length !== 1) {
          return fail('Mismatch in docs returned from document lookup.');
        }
        const doc = docs[0];
        if (doc instanceof NoDocument) {
          return new DocumentSnapshot<T>(
            this._firestore,
            ref._key,
            null,
            /* fromCache= */ false,
            /* hasPendingWrites= */ false,
            ref._converter
          );
        } else if (doc instanceof Document) {
          return new DocumentSnapshot<T>(
            this._firestore,
            ref._key,
            doc,
            /* fromCache= */ false,
            /* hasPendingWrites= */ false,
            ref._converter
          );
        } else {
          throw fail(
            `BatchGetDocumentsRequest returned unexpected document type: ${doc.constructor.name}`
          );
        }
      });
  }

  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: SetOptions
  ): Transaction;
  set<T>(documentRef: DocumentReference<T>, data: T): Transaction;
  set<T>(
    documentRef: PublicDocumentReference<T>,
    value: T | Partial<T>,
    options?: SetOptions
  ): Transaction {
    const ref = validateReference(
      'Transaction.set',
      documentRef,
      this._firestore
    );
    options = validateSetOptions('Transaction.set', options);
    const convertedValue = applyFirestoreDataConverter(
      ref._converter,
      value,
      options
    );
    const parsed = parseSetData(
      this._firestore._dataReader,
      'Transaction.set',
      ref._key,
      convertedValue,
      ref._converter !== null,
      options
    );
    this._transaction.set(ref._key, parsed);
    return this;
  }

  update(
    documentRef: PublicDocumentReference<unknown>,
    value: UpdateData
  ): Transaction;
  update(
    documentRef: PublicDocumentReference<unknown>,
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Transaction;
  update(
    documentRef: PublicDocumentReference<unknown>,
    fieldOrUpdateData: string | ExternalFieldPath | UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Transaction {
    let ref;
    let parsed;

    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof ExternalFieldPath
    ) {
      ref = validateReference(
        'Transaction.update',
        documentRef,
        this._firestore
      );
      parsed = parseUpdateVarargs(
        this._firestore._dataReader,
        'Transaction.update',
        ref._key,
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      ref = validateReference(
        'Transaction.update',
        documentRef,
        this._firestore
      );
      parsed = parseUpdateData(
        this._firestore._dataReader,
        'Transaction.update',
        ref._key,
        fieldOrUpdateData
      );
    }

    this._transaction.update(ref._key, parsed);
    return this;
  }

  delete(documentRef: PublicDocumentReference<unknown>): Transaction {
    const ref = validateReference(
      'Transaction.delete',
      documentRef,
      this._firestore
    );
    this._transaction.delete(ref._key);
    return this;
  }
}

export class WriteBatch implements PublicWriteBatch {
  private _mutations = [] as Mutation[];
  private _committed = false;

  constructor(private _firestore: Firestore) {}

  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: SetOptions
  ): WriteBatch;
  set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch;
  set<T>(
    documentRef: PublicDocumentReference<T>,
    value: T | Partial<T>,
    options?: SetOptions
  ): WriteBatch {
    this.verifyNotCommitted();
    const ref = validateReference(
      'WriteBatch.set',
      documentRef,
      this._firestore
    );
    options = validateSetOptions('WriteBatch.set', options);
    const convertedValue = applyFirestoreDataConverter(
      ref._converter,
      value,
      options
    );
    const parsed = parseSetData(
      this._firestore._dataReader,
      'WriteBatch.set',
      ref._key,
      convertedValue,
      ref._converter !== null,
      options
    );
    this._mutations = this._mutations.concat(
      parsed.toMutations(ref._key, Precondition.none())
    );
    return this;
  }

  update(
    documentRef: PublicDocumentReference<unknown>,
    value: UpdateData
  ): WriteBatch;
  update(
    documentRef: PublicDocumentReference<unknown>,
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: PublicDocumentReference<unknown>,
    fieldOrUpdateData: string | ExternalFieldPath | UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch {
    this.verifyNotCommitted();

    let ref;
    let parsed;

    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof ExternalFieldPath
    ) {
      ref = validateReference(
        'WriteBatch.update',
        documentRef,
        this._firestore
      );
      parsed = parseUpdateVarargs(
        this._firestore._dataReader,
        'WriteBatch.update',
        ref._key,
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      ref = validateReference(
        'WriteBatch.update',
        documentRef,
        this._firestore
      );
      parsed = parseUpdateData(
        this._firestore._dataReader,
        'WriteBatch.update',
        ref._key,
        fieldOrUpdateData
      );
    }

    this._mutations = this._mutations.concat(
      parsed.toMutations(ref._key, Precondition.exists(true))
    );
    return this;
  }

  delete(documentRef: PublicDocumentReference<unknown>): WriteBatch {
    this.verifyNotCommitted();
    const ref = validateReference(
      'WriteBatch.delete',
      documentRef,
      this._firestore
    );
    this._mutations = this._mutations.concat(
      new DeleteMutation(ref._key, Precondition.none())
    );
    return this;
  }

  commit(): Promise<void> {
    this.verifyNotCommitted();
    this._committed = true;
    if (this._mutations.length > 0) {
      const client = ensureFirestoreConfigured(this._firestore);
      return firestoreClientWrite(client, this._mutations);
    }

    return Promise.resolve();
  }

  private verifyNotCommitted(): void {
    if (this._committed) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'A write batch can no longer be used after commit() ' +
          'has been called.'
      );
    }
  }
}

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = DocumentData>
  extends _DocumentKeyReference<T>
  implements PublicDocumentReference<T> {
  private _firestoreClient: FirestoreClient;

  constructor(
    public _key: DocumentKey,
    readonly firestore: Firestore,
    readonly _converter: FirestoreDataConverter<T> | null
  ) {
    super(firestore._databaseId, _key, _converter);
    this._firestoreClient = ensureFirestoreConfigured(firestore);
  }

  static forPath<U>(
    path: ResourcePath,
    firestore: Firestore,
    converter: FirestoreDataConverter<U> | null
  ): DocumentReference<U> {
    if (path.length % 2 !== 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid document reference. Document ' +
          'references must have an even number of segments, but ' +
          `${path.canonicalString()} has ${path.length}`
      );
    }
    return new DocumentReference(new DocumentKey(path), firestore, converter);
  }

  get id(): string {
    return this._key.path.lastSegment();
  }

  get parent(): PublicCollectionReference<T> {
    return new CollectionReference(
      this._key.path.popLast(),
      this.firestore,
      this._converter
    );
  }

  get path(): string {
    return this._key.path.canonicalString();
  }

  collection(pathString: string): PublicCollectionReference<DocumentData> {
    validateNonEmptyArgument(
      'DocumentReference.collection',
      'path',
      pathString
    );
    if (!pathString) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Must provide a non-empty collection name to collection()'
      );
    }
    const path = ResourcePath.fromString(pathString);
    return new CollectionReference(
      this._key.path.child(path),
      this.firestore,
      /* converter= */ null
    );
  }

  isEqual(other: PublicDocumentReference<T>): boolean {
    if (!(other instanceof DocumentReference)) {
      return false;
    }
    return (
      this.firestore === other.firestore &&
      this._key.isEqual(other._key) &&
      this._converter === other._converter
    );
  }

  set(value: Partial<T>, options: SetOptions): Promise<void>;
  set(value: T): Promise<void>;
  set(value: T | Partial<T>, options?: SetOptions): Promise<void> {
    options = validateSetOptions('DocumentReference.set', options);
    const convertedValue = applyFirestoreDataConverter(
      this._converter,
      value,
      options
    );
    const parsed = parseSetData(
      this.firestore._dataReader,
      'DocumentReference.set',
      this._key,
      convertedValue,
      this._converter !== null,
      options
    );
    return firestoreClientWrite(
      this._firestoreClient,
      parsed.toMutations(this._key, Precondition.none())
    );
  }

  update(value: UpdateData): Promise<void>;
  update(
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void>;
  update(
    fieldOrUpdateData: string | ExternalFieldPath | UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void> {
    let parsed;

    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof ExternalFieldPath
    ) {
      parsed = parseUpdateVarargs(
        this.firestore._dataReader,
        'DocumentReference.update',
        this._key,
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      parsed = parseUpdateData(
        this.firestore._dataReader,
        'DocumentReference.update',
        this._key,
        fieldOrUpdateData
      );
    }

    return firestoreClientWrite(
      this._firestoreClient,
      parsed.toMutations(this._key, Precondition.exists(true))
    );
  }

  delete(): Promise<void> {
    return firestoreClientWrite(this._firestoreClient, [
      new DeleteMutation(this._key, Precondition.none())
    ]);
  }

  onSnapshot(observer: PartialObserver<PublicDocumentSnapshot<T>>): Unsubscribe;
  onSnapshot(
    options: SnapshotListenOptions,
    observer: PartialObserver<PublicDocumentSnapshot<T>>
  ): Unsubscribe;
  onSnapshot(
    onNext: NextFn<PublicDocumentSnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;
  onSnapshot(
    options: SnapshotListenOptions,
    onNext: NextFn<PublicDocumentSnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;

  onSnapshot(...args: unknown[]): Unsubscribe {
    let options: ListenOptions = {
      includeMetadataChanges: false
    };
    let currArg = 0;
    if (
      typeof args[currArg] === 'object' &&
      !isPartialObserver(args[currArg])
    ) {
      options = args[currArg] as SnapshotListenOptions;
      currArg++;
    }

    const internalOptions = {
      includeMetadataChanges: options.includeMetadataChanges
    };

    if (isPartialObserver(args[currArg])) {
      const userObserver = args[currArg] as PartialObserver<
        PublicDocumentSnapshot<T>
      >;
      args[currArg] = userObserver.next?.bind(userObserver);
      args[currArg + 1] = userObserver.error?.bind(userObserver);
      args[currArg + 2] = userObserver.complete?.bind(userObserver);
    }

    const observer: PartialObserver<ViewSnapshot> = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<PublicDocumentSnapshot<T>>)(
            this._convertToDocSnapshot(snapshot)
          );
        }
      },
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };

    return firestoreClientListen(
      this._firestoreClient,
      newQueryForPath(this._key.path),
      internalOptions,
      observer
    );
  }

  get(options?: GetOptions): Promise<PublicDocumentSnapshot<T>> {
    if (options && options.source === 'cache') {
      return firestoreClientGetDocumentFromLocalCache(
        this._firestoreClient,
        this._key
      ).then(
        doc =>
          new DocumentSnapshot(
            this.firestore,
            this._key,
            doc,
            /*fromCache=*/ true,
            doc instanceof Document ? doc.hasLocalMutations : false,
            this._converter
          )
      );
    } else {
      return firestoreClientGetDocumentViaSnapshotListener(
        this._firestoreClient,
        this._key,
        options
      ).then(snapshot => this._convertToDocSnapshot(snapshot));
    }
  }

  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): PublicDocumentReference<U> {
    return new DocumentReference<U>(this._key, this.firestore, converter);
  }

  /**
   * Converts a ViewSnapshot that contains the current document to a
   * DocumentSnapshot.
   */
  private _convertToDocSnapshot(snapshot: ViewSnapshot): DocumentSnapshot<T> {
    debugAssert(
      snapshot.docs.size <= 1,
      'Too many documents returned on a document query'
    );
    const doc = snapshot.docs.get(this._key);

    return new DocumentSnapshot(
      this.firestore,
      this._key,
      doc,
      snapshot.fromCache,
      snapshot.hasPendingWrites,
      this._converter
    );
  }
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

export class DocumentSnapshot<T = DocumentData>
  implements PublicDocumentSnapshot<T> {
  constructor(
    private _firestore: Firestore,
    private _key: DocumentKey,
    public _document: Document | null,
    private _fromCache: boolean,
    private _hasPendingWrites: boolean,
    private readonly _converter: FirestoreDataConverter<T> | null
  ) {}

  data(options: PublicSnapshotOptions = {}): T | undefined {
    if (!this._document) {
      return undefined;
    } else {
      // We only want to use the converter and create a new DocumentSnapshot
      // if a converter has been provided.
      if (this._converter) {
        const snapshot = new QueryDocumentSnapshot(
          this._firestore,
          this._key,
          this._document,
          this._fromCache,
          this._hasPendingWrites,
          /* converter= */ null
        );
        return this._converter.fromFirestore(snapshot, options);
      } else {
        const userDataWriter = new UserDataWriter(
          this._firestore._databaseId,
          options.serverTimestamps || 'none',
          key =>
            new DocumentReference(key, this._firestore, /* converter= */ null),
          bytes => new Blob(bytes)
        );
        return userDataWriter.convertValue(this._document.toProto()) as T;
      }
    }
  }

  get(
    fieldPath: string | ExternalFieldPath,
    options: PublicSnapshotOptions = {}
  ): unknown {
    if (this._document) {
      const value = this._document
        .data()
        .field(
          fieldPathFromArgument('DocumentSnapshot.get', fieldPath, this._key)
        );
      if (value !== null) {
        const userDataWriter = new UserDataWriter(
          this._firestore._databaseId,
          options.serverTimestamps || 'none',
          key => new DocumentReference(key, this._firestore, this._converter),
          bytes => new Blob(bytes)
        );
        return userDataWriter.convertValue(value);
      }
    }
    return undefined;
  }

  get id(): string {
    return this._key.path.lastSegment();
  }

  get ref(): PublicDocumentReference<T> {
    return new DocumentReference<T>(
      this._key,
      this._firestore,
      this._converter
    );
  }

  get exists(): boolean {
    return this._document !== null;
  }

  get metadata(): PublicSnapshotMetadata {
    return new SnapshotMetadata(this._hasPendingWrites, this._fromCache);
  }

  isEqual(other: PublicDocumentSnapshot<T>): boolean {
    if (!(other instanceof DocumentSnapshot)) {
      return false;
    }
    return (
      this._firestore === other._firestore &&
      this._fromCache === other._fromCache &&
      this._key.isEqual(other._key) &&
      (this._document === null
        ? other._document === null
        : this._document.isEqual(other._document)) &&
      this._converter === other._converter
    );
  }
}

export class QueryDocumentSnapshot<T = DocumentData>
  extends DocumentSnapshot<T>
  implements PublicQueryDocumentSnapshot<T> {
  data(options?: SnapshotOptions): T {
    const data = super.data(options);
    debugAssert(
      data !== undefined,
      'Document in a QueryDocumentSnapshot should exist'
    );
    return data;
  }
}

export function newQueryFilter(
  query: InternalQuery,
  methodName: string,
  dataReader: UserDataReader,
  databaseId: DatabaseId,
  fieldPath: FieldPath,
  op: Operator,
  value: unknown
): FieldFilter {
  let fieldValue: ProtoValue;
  if (fieldPath.isKeyField()) {
    if (op === Operator.ARRAY_CONTAINS || op === Operator.ARRAY_CONTAINS_ANY) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid Query. You can't perform '${op}' ` +
          'queries on FieldPath.documentId().'
      );
    } else if (op === Operator.IN || op === Operator.NOT_IN) {
      validateDisjunctiveFilterElements(value, op);
      const referenceList: ProtoValue[] = [];
      for (const arrayValue of value as ProtoValue[]) {
        referenceList.push(parseDocumentIdValue(databaseId, query, arrayValue));
      }
      fieldValue = { arrayValue: { values: referenceList } };
    } else {
      fieldValue = parseDocumentIdValue(databaseId, query, value);
    }
  } else {
    if (
      op === Operator.IN ||
      op === Operator.NOT_IN ||
      op === Operator.ARRAY_CONTAINS_ANY
    ) {
      validateDisjunctiveFilterElements(value, op);
    }
    fieldValue = parseQueryValue(
      dataReader,
      methodName,
      value,
      /* allowArrays= */ op === Operator.IN || op === Operator.NOT_IN
    );
  }
  const filter = FieldFilter.create(fieldPath, op, fieldValue);
  validateNewFilter(query, filter);
  return filter;
}

export function newQueryOrderBy(
  query: InternalQuery,
  fieldPath: FieldPath,
  direction: Direction
): OrderBy {
  if (query.startAt !== null) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Invalid query. You must not call startAt() or startAfter() before ' +
        'calling orderBy().'
    );
  }
  if (query.endAt !== null) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Invalid query. You must not call endAt() or endBefore() before ' +
        'calling orderBy().'
    );
  }
  const orderBy = new OrderBy(fieldPath, direction);
  validateNewOrderBy(query, orderBy);
  return orderBy;
}

/**
 * Create a Bound from a query and a document.
 *
 * Note that the Bound will always include the key of the document
 * and so only the provided document will compare equal to the returned
 * position.
 *
 * Will throw if the document does not contain all fields of the order by
 * of the query or if any of the fields in the order by are an uncommitted
 * server timestamp.
 */
export function newQueryBoundFromDocument(
  query: InternalQuery,
  databaseId: DatabaseId,
  methodName: string,
  doc: Document | null,
  before: boolean
): Bound {
  if (!doc) {
    throw new FirestoreError(
      Code.NOT_FOUND,
      `Can't use a DocumentSnapshot that doesn't exist for ` +
        `${methodName}().`
    );
  }

  const components: ProtoValue[] = [];

  // Because people expect to continue/end a query at the exact document
  // provided, we need to use the implicit sort order rather than the explicit
  // sort order, because it's guaranteed to contain the document key. That way
  // the position becomes unambiguous and the query continues/ends exactly at
  // the provided document. Without the key (by using the explicit sort
  // orders), multiple documents could match the position, yielding duplicate
  // results.
  for (const orderBy of queryOrderBy(query)) {
    if (orderBy.field.isKeyField()) {
      components.push(refValue(databaseId, doc.key));
    } else {
      const value = doc.field(orderBy.field);
      if (isServerTimestamp(value)) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Invalid query. You are trying to start or end a query using a ' +
            'document for which the field "' +
            orderBy.field +
            '" is an uncommitted server timestamp. (Since the value of ' +
            'this field is unknown, you cannot start/end a query with it.)'
        );
      } else if (value !== null) {
        components.push(value);
      } else {
        const field = orderBy.field.canonicalString();
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. You are trying to start or end a query using a ` +
            `document for which the field '${field}' (used as the ` +
            `orderBy) does not exist.`
        );
      }
    }
  }
  return new Bound(components, before);
}

/**
 * Converts a list of field values to a Bound for the given query.
 */
export function newQueryBoundFromFields(
  query: InternalQuery,
  databaseId: DatabaseId,
  dataReader: UserDataReader,
  methodName: string,
  values: unknown[],
  before: boolean
): Bound {
  // Use explicit order by's because it has to match the query the user made
  const orderBy = query.explicitOrderBy;
  if (values.length > orderBy.length) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Too many arguments provided to ${methodName}(). ` +
        `The number of arguments must be less than or equal to the ` +
        `number of orderBy() clauses`
    );
  }

  const components: ProtoValue[] = [];
  for (let i = 0; i < values.length; i++) {
    const rawValue = values[i];
    const orderByComponent = orderBy[i];
    if (orderByComponent.field.isKeyField()) {
      if (typeof rawValue !== 'string') {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. Expected a string for document ID in ` +
            `${methodName}(), but got a ${typeof rawValue}`
        );
      }
      if (!isCollectionGroupQuery(query) && rawValue.indexOf('/') !== -1) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. When querying a collection and ordering by FieldPath.documentId(), ` +
            `the value passed to ${methodName}() must be a plain document ID, but ` +
            `'${rawValue}' contains a slash.`
        );
      }
      const path = query.path.child(ResourcePath.fromString(rawValue));
      if (!DocumentKey.isDocumentKey(path)) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. When querying a collection group and ordering by ` +
            `FieldPath.documentId(), the value passed to ${methodName}() must result in a ` +
            `valid document path, but '${path}' is not because it contains an odd number ` +
            `of segments.`
        );
      }
      const key = new DocumentKey(path);
      components.push(refValue(databaseId, key));
    } else {
      const wrapped = parseQueryValue(dataReader, methodName, rawValue);
      components.push(wrapped);
    }
  }

  return new Bound(components, before);
}

/**
 * Parses the given documentIdValue into a ReferenceValue, throwing
 * appropriate errors if the value is anything other than a DocumentReference
 * or String, or if the string is malformed.
 */
function parseDocumentIdValue(
  databaseId: DatabaseId,
  query: InternalQuery,
  documentIdValue: unknown
): ProtoValue {
  if (typeof documentIdValue === 'string') {
    if (documentIdValue === '') {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. When querying with FieldPath.documentId(), you ' +
          'must provide a valid document ID, but it was an empty string.'
      );
    }
    if (!isCollectionGroupQuery(query) && documentIdValue.indexOf('/') !== -1) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. When querying a collection by ` +
          `FieldPath.documentId(), you must provide a plain document ID, but ` +
          `'${documentIdValue}' contains a '/' character.`
      );
    }
    const path = query.path.child(ResourcePath.fromString(documentIdValue));
    if (!DocumentKey.isDocumentKey(path)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. When querying a collection group by ` +
          `FieldPath.documentId(), the value provided must result in a valid document path, ` +
          `but '${path}' is not because it has an odd number of segments (${path.length}).`
      );
    }
    return refValue(databaseId, new DocumentKey(path));
  } else if (documentIdValue instanceof _DocumentKeyReference) {
    return refValue(databaseId, documentIdValue._key);
  } else {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid query. When querying with FieldPath.documentId(), you must provide a valid ` +
        `string or a DocumentReference, but it was: ` +
        `${valueDescription(documentIdValue)}.`
    );
  }
}

/**
 * Validates that the value passed into a disjunctive filter satisfies all
 * array requirements.
 */
function validateDisjunctiveFilterElements(
  value: unknown,
  operator: Operator
): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Invalid Query. A non-empty array is required for ' +
        `'${operator.toString()}' filters.`
    );
  }
  if (value.length > 10) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid Query. '${operator.toString()}' filters support a ` +
        'maximum of 10 elements in the value array.'
    );
  }
}

/**
 * Given an operator, returns the set of operators that cannot be used with it.
 *
 * Operators in a query must adhere to the following set of rules:
 * 1. Only one array operator is allowed.
 * 2. Only one disjunctive operator is allowed.
 * 3. NOT_EQUAL cannot be used with another NOT_EQUAL operator.
 * 4. NOT_IN cannot be used with array, disjunctive, or NOT_EQUAL operators.
 *
 * Array operators: ARRAY_CONTAINS, ARRAY_CONTAINS_ANY
 * Disjunctive operators: IN, ARRAY_CONTAINS_ANY, NOT_IN
 */
function conflictingOps(op: Operator): Operator[] {
  switch (op) {
    case Operator.NOT_EQUAL:
      return [Operator.NOT_EQUAL, Operator.NOT_IN];
    case Operator.ARRAY_CONTAINS:
      return [
        Operator.ARRAY_CONTAINS,
        Operator.ARRAY_CONTAINS_ANY,
        Operator.NOT_IN
      ];
    case Operator.IN:
      return [Operator.ARRAY_CONTAINS_ANY, Operator.IN, Operator.NOT_IN];
    case Operator.ARRAY_CONTAINS_ANY:
      return [
        Operator.ARRAY_CONTAINS,
        Operator.ARRAY_CONTAINS_ANY,
        Operator.IN,
        Operator.NOT_IN
      ];
    case Operator.NOT_IN:
      return [
        Operator.ARRAY_CONTAINS,
        Operator.ARRAY_CONTAINS_ANY,
        Operator.IN,
        Operator.NOT_IN,
        Operator.NOT_EQUAL
      ];
    default:
      return [];
  }
}

function validateNewFilter(query: InternalQuery, filter: Filter): void {
  debugAssert(filter instanceof FieldFilter, 'Only FieldFilters are supported');

  if (filter.isInequality()) {
    const existingField = getInequalityFilterField(query);
    if (existingField !== null && !existingField.isEqual(filter.field)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. All where filters with an inequality' +
          ' (<, <=, >, or >=) must be on the same field. But you have' +
          ` inequality filters on '${existingField.toString()}'` +
          ` and '${filter.field.toString()}'`
      );
    }

    const firstOrderByField = getFirstOrderByField(query);
    if (firstOrderByField !== null) {
      validateOrderByAndInequalityMatch(query, filter.field, firstOrderByField);
    }
  }

  const conflictingOp = findFilterOperator(query, conflictingOps(filter.op));
  if (conflictingOp !== null) {
    // Special case when it's a duplicate op to give a slightly clearer error message.
    if (conflictingOp === filter.op) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. You cannot use more than one ' +
          `'${filter.op.toString()}' filter.`
      );
    } else {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. You cannot use '${filter.op.toString()}' filters ` +
          `with '${conflictingOp.toString()}' filters.`
      );
    }
  }
}

function validateNewOrderBy(query: InternalQuery, orderBy: OrderBy): void {
  if (getFirstOrderByField(query) === null) {
    // This is the first order by. It must match any inequality.
    const inequalityField = getInequalityFilterField(query);
    if (inequalityField !== null) {
      validateOrderByAndInequalityMatch(query, inequalityField, orderBy.field);
    }
  }
}

function validateOrderByAndInequalityMatch(
  baseQuery: InternalQuery,
  inequality: FieldPath,
  orderBy: FieldPath
): void {
  if (!orderBy.isEqual(inequality)) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid query. You have a where filter with an inequality ` +
        `(<, <=, >, or >=) on field '${inequality.toString()}' ` +
        `and so you must also use '${inequality.toString()}' ` +
        `as your first orderBy(), but your first orderBy() ` +
        `is on field '${orderBy.toString()}' instead.`
    );
  }
}

export function validateHasExplicitOrderByForLimitToLast(
  query: InternalQuery
): void {
  if (hasLimitToLast(query) && query.explicitOrderBy.length === 0) {
    throw new FirestoreError(
      Code.UNIMPLEMENTED,
      'limitToLast() queries require specifying at least one orderBy() clause'
    );
  }
}

export class Query<T = DocumentData> implements PublicQuery<T> {
  constructor(
    public _query: InternalQuery,
    readonly firestore: Firestore,
    protected readonly _converter: FirestoreDataConverter<T> | null
  ) {}

  where(
    field: string | ExternalFieldPath,
    opStr: WhereFilterOp,
    value: unknown
  ): PublicQuery<T> {
    const fieldPath = fieldPathFromArgument('Query.where', field);
    const filter = newQueryFilter(
      this._query,
      'Query.where',
      this.firestore._dataReader,
      this.firestore._databaseId,
      fieldPath,
      opStr as Operator,
      value
    );
    return new Query(
      queryWithAddedFilter(this._query, filter),
      this.firestore,
      this._converter
    );
  }

  orderBy(
    field: string | ExternalFieldPath,
    directionStr?: OrderByDirection
  ): PublicQuery<T> {
    let direction: Direction;
    if (directionStr === undefined || directionStr === 'asc') {
      direction = Direction.ASCENDING;
    } else if (directionStr === 'desc') {
      direction = Direction.DESCENDING;
    } else {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Function Query.orderBy() has unknown direction '${directionStr}', ` +
          `expected 'asc' or 'desc'.`
      );
    }
    const fieldPath = fieldPathFromArgument('Query.orderBy', field);
    const orderBy = newQueryOrderBy(this._query, fieldPath, direction);
    return new Query(
      queryWithAddedOrderBy(this._query, orderBy),
      this.firestore,
      this._converter
    );
  }

  limit(n: number): PublicQuery<T> {
    validatePositiveNumber('Query.limit', n);
    return new Query(
      queryWithLimit(this._query, n, LimitType.First),
      this.firestore,
      this._converter
    );
  }

  limitToLast(n: number): PublicQuery<T> {
    validatePositiveNumber('Query.limitToLast', n);
    return new Query(
      queryWithLimit(this._query, n, LimitType.Last),
      this.firestore,
      this._converter
    );
  }

  startAt(
    docOrField: unknown | PublicDocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): PublicQuery<T> {
    const bound = this.boundFromDocOrFields(
      'Query.startAt',
      docOrField,
      fields,
      /*before=*/ true
    );
    return new Query(
      queryWithStartAt(this._query, bound),
      this.firestore,
      this._converter
    );
  }

  startAfter(
    docOrField: unknown | PublicDocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): PublicQuery<T> {
    const bound = this.boundFromDocOrFields(
      'Query.startAfter',
      docOrField,
      fields,
      /*before=*/ false
    );
    return new Query(
      queryWithStartAt(this._query, bound),
      this.firestore,
      this._converter
    );
  }

  endBefore(
    docOrField: unknown | PublicDocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): PublicQuery<T> {
    const bound = this.boundFromDocOrFields(
      'Query.endBefore',
      docOrField,
      fields,
      /*before=*/ true
    );
    return new Query(
      queryWithEndAt(this._query, bound),
      this.firestore,
      this._converter
    );
  }

  endAt(
    docOrField: unknown | PublicDocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): PublicQuery<T> {
    const bound = this.boundFromDocOrFields(
      'Query.endAt',
      docOrField,
      fields,
      /*before=*/ false
    );
    return new Query(
      queryWithEndAt(this._query, bound),
      this.firestore,
      this._converter
    );
  }

  isEqual(other: PublicQuery<T>): boolean {
    if (!(other instanceof Query)) {
      return false;
    }
    return (
      this.firestore === other.firestore &&
      queryEquals(this._query, other._query) &&
      this._converter === other._converter
    );
  }

  withConverter<U>(converter: FirestoreDataConverter<U>): PublicQuery<U> {
    return new Query<U>(this._query, this.firestore, converter);
  }

  /** Helper function to create a bound from a document or fields */
  private boundFromDocOrFields(
    methodName: string,
    docOrField: unknown | PublicDocumentSnapshot<T>,
    fields: unknown[],
    before: boolean
  ): Bound {
    if (docOrField instanceof DocumentSnapshot) {
      return newQueryBoundFromDocument(
        this._query,
        this.firestore._databaseId,
        methodName,
        docOrField._document,
        before
      );
    } else {
      const allFields = [docOrField].concat(fields);
      return newQueryBoundFromFields(
        this._query,
        this.firestore._databaseId,
        this.firestore._dataReader,
        methodName,
        allFields,
        before
      );
    }
  }

  onSnapshot(observer: PartialObserver<PublicQuerySnapshot<T>>): Unsubscribe;
  onSnapshot(
    options: SnapshotListenOptions,
    observer: PartialObserver<PublicQuerySnapshot<T>>
  ): Unsubscribe;
  onSnapshot(
    onNext: NextFn<PublicQuerySnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;
  onSnapshot(
    options: SnapshotListenOptions,
    onNext: NextFn<PublicQuerySnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;

  onSnapshot(...args: unknown[]): Unsubscribe {
    let options: ListenOptions = {};
    let currArg = 0;
    if (
      typeof args[currArg] === 'object' &&
      !isPartialObserver(args[currArg])
    ) {
      options = args[currArg] as SnapshotListenOptions;
      currArg++;
    }

    if (isPartialObserver(args[currArg])) {
      const userObserver = args[currArg] as PartialObserver<
        PublicQuerySnapshot<T>
      >;
      args[currArg] = userObserver.next?.bind(userObserver);
      args[currArg + 1] = userObserver.error?.bind(userObserver);
      args[currArg + 2] = userObserver.complete?.bind(userObserver);
    } else {
    }

    const observer: PartialObserver<ViewSnapshot> = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<PublicQuerySnapshot<T>>)(
            new QuerySnapshot(
              this.firestore,
              this._query,
              snapshot,
              this._converter
            )
          );
        }
      },
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };

    validateHasExplicitOrderByForLimitToLast(this._query);
    const client = ensureFirestoreConfigured(this.firestore);
    return firestoreClientListen(client, this._query, options, observer);
  }

  get(options?: GetOptions): Promise<PublicQuerySnapshot<T>> {
    validateHasExplicitOrderByForLimitToLast(this._query);

    const client = ensureFirestoreConfigured(this.firestore);
    return (options && options.source === 'cache'
      ? firestoreClientGetDocumentsFromLocalCache(client, this._query)
      : firestoreClientGetDocumentsViaSnapshotListener(
          client,
          this._query,
          options
        )
    ).then(
      snap =>
        new QuerySnapshot(this.firestore, this._query, snap, this._converter)
    );
  }
}

export class QuerySnapshot<T = DocumentData> implements PublicQuerySnapshot<T> {
  private _cachedChanges: Array<PublicDocumentChange<T>> | null = null;
  private _cachedChangesIncludeMetadataChanges: boolean | null = null;

  readonly metadata: PublicSnapshotMetadata;

  constructor(
    private readonly _firestore: Firestore,
    private readonly _originalQuery: InternalQuery,
    private readonly _snapshot: ViewSnapshot,
    private readonly _converter: FirestoreDataConverter<T> | null
  ) {
    this.metadata = new SnapshotMetadata(
      _snapshot.hasPendingWrites,
      _snapshot.fromCache
    );
  }

  get docs(): Array<PublicQueryDocumentSnapshot<T>> {
    const result: Array<PublicQueryDocumentSnapshot<T>> = [];
    this.forEach(doc => result.push(doc));
    return result;
  }

  get empty(): boolean {
    return this._snapshot.docs.isEmpty();
  }

  get size(): number {
    return this._snapshot.docs.size;
  }

  forEach(
    callback: (result: PublicQueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
  ): void {
    this._snapshot.docs.forEach(doc => {
      callback.call(
        thisArg,
        this.convertToDocumentImpl(
          doc,
          this.metadata.fromCache,
          this._snapshot.mutatedKeys.has(doc.key)
        )
      );
    });
  }

  get query(): PublicQuery<T> {
    return new Query(this._originalQuery, this._firestore, this._converter);
  }

  docChanges(options?: SnapshotListenOptions): Array<PublicDocumentChange<T>> {
    if (options) {
    }

    const includeMetadataChanges = !!(
      options && options.includeMetadataChanges
    );

    if (includeMetadataChanges && this._snapshot.excludesMetadataChanges) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'To include metadata changes with your document changes, you must ' +
          'also pass { includeMetadataChanges:true } to onSnapshot().'
      );
    }

    if (
      !this._cachedChanges ||
      this._cachedChangesIncludeMetadataChanges !== includeMetadataChanges
    ) {
      this._cachedChanges = changesFromSnapshot<QueryDocumentSnapshot<T>>(
        this._snapshot,
        includeMetadataChanges,
        this.convertToDocumentImpl.bind(this)
      );
      this._cachedChangesIncludeMetadataChanges = includeMetadataChanges;
    }

    return this._cachedChanges;
  }

  /** Check the equality. The call can be very expensive. */
  isEqual(other: PublicQuerySnapshot<T>): boolean {
    if (!(other instanceof QuerySnapshot)) {
      return false;
    }

    return (
      this._firestore === other._firestore &&
      queryEquals(this._originalQuery, other._originalQuery) &&
      this._snapshot.isEqual(other._snapshot) &&
      this._converter === other._converter
    );
  }

  private convertToDocumentImpl(
    doc: Document,
    fromCache: boolean,
    hasPendingWrites: boolean
  ): QueryDocumentSnapshot<T> {
    return new QueryDocumentSnapshot(
      this._firestore,
      doc.key,
      doc,
      fromCache,
      hasPendingWrites,
      this._converter
    );
  }
}

export class CollectionReference<T = DocumentData>
  extends Query<T>
  implements PublicCollectionReference<T> {
  constructor(
    readonly _path: ResourcePath,
    firestore: Firestore,
    _converter: FirestoreDataConverter<T> | null
  ) {
    super(newQueryForPath(_path), firestore, _converter);
    if (_path.length % 2 !== 1) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid collection reference. Collection ' +
          'references must have an odd number of segments, but ' +
          `${_path.canonicalString()} has ${_path.length}`
      );
    }
  }

  get id(): string {
    return this._query.path.lastSegment();
  }

  get parent(): PublicDocumentReference<DocumentData> | null {
    const parentPath = this._query.path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference<DocumentData>(
        new DocumentKey(parentPath),
        this.firestore,
        /* converter= */ null
      );
    }
  }

  get path(): string {
    return this._query.path.canonicalString();
  }

  doc(pathString?: string): PublicDocumentReference<T> {
    // We allow omission of 'pathString' but explicitly prohibit passing in both
    // 'undefined' and 'null'.
    if (arguments.length === 0) {
      pathString = AutoId.newId();
    }
    validateNonEmptyArgument('CollectionReference.doc', 'path', pathString);
    const path = ResourcePath.fromString(pathString!);
    return DocumentReference.forPath<T>(
      this._query.path.child(path),
      this.firestore,
      this._converter
    );
  }

  add(value: T): Promise<PublicDocumentReference<T>> {
    const convertedValue = this._converter
      ? this._converter.toFirestore(value)
      : value;
    const docRef = this.doc();

    // Call set() with the converted value directly to avoid calling toFirestore() a second time.
    return new DocumentReference(
      (docRef as DocumentReference<T>)._key,
      this.firestore,
      null
    )
      .set(convertedValue)
      .then(() => docRef);
  }

  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): PublicCollectionReference<U> {
    return new CollectionReference<U>(this._path, this.firestore, converter);
  }
}

function validateReference<T>(
  methodName: string,
  documentRef: PublicDocumentReference<T>,
  firestore: Firestore
): _DocumentKeyReference<T> {
  const reference = cast<DocumentReference<T>>(documentRef, DocumentReference);
  if (reference.firestore !== firestore) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Provided document reference is from a different Firestore instance.'
    );
  } else {
    return reference;
  }
}

/**
 * Calculates the array of DocumentChanges for a given ViewSnapshot.
 *
 * Exported for testing.
 *
 * @param snapshot The ViewSnapshot that represents the expected state.
 * @param includeMetadataChanges Whether to include metadata changes.
 * @param converter A factory function that returns a QueryDocumentSnapshot.
 * @return An object that matches the DocumentChange API.
 */
export function changesFromSnapshot<DocSnap>(
  snapshot: ViewSnapshot,
  includeMetadataChanges: boolean,
  converter: (
    doc: Document,
    fromCache: boolean,
    hasPendingWrite: boolean
  ) => DocSnap
): Array<{
  type: DocumentChangeType;
  doc: DocSnap;
  oldIndex: number;
  newIndex: number;
}> {
  if (snapshot.oldDocs.isEmpty()) {
    // Special case the first snapshot because index calculation is easy and
    // fast
    let lastDoc: Document;
    let index = 0;
    return snapshot.docChanges.map(change => {
      const doc = converter(
        change.doc,
        snapshot.fromCache,
        snapshot.mutatedKeys.has(change.doc.key)
      );
      debugAssert(
        change.type === ChangeType.Added,
        'Invalid event type for first snapshot'
      );
      debugAssert(
        !lastDoc || newQueryComparator(snapshot.query)(lastDoc, change.doc) < 0,
        'Got added events in wrong order'
      );
      lastDoc = change.doc;
      return {
        type: 'added' as DocumentChangeType,
        doc,
        oldIndex: -1,
        newIndex: index++
      };
    });
  } else {
    // A DocumentSet that is updated incrementally as changes are applied to use
    // to lookup the index of a document.
    let indexTracker = snapshot.oldDocs;
    return snapshot.docChanges
      .filter(
        change => includeMetadataChanges || change.type !== ChangeType.Metadata
      )
      .map(change => {
        const doc = converter(
          change.doc,
          snapshot.fromCache,
          snapshot.mutatedKeys.has(change.doc.key)
        );
        let oldIndex = -1;
        let newIndex = -1;
        if (change.type !== ChangeType.Added) {
          oldIndex = indexTracker.indexOf(change.doc.key);
          debugAssert(oldIndex >= 0, 'Index for document not found');
          indexTracker = indexTracker.delete(change.doc.key);
        }
        if (change.type !== ChangeType.Removed) {
          indexTracker = indexTracker.add(change.doc);
          newIndex = indexTracker.indexOf(change.doc.key);
        }
        return { type: resultChangeType(change.type), doc, oldIndex, newIndex };
      });
  }
}

function resultChangeType(type: ChangeType): DocumentChangeType {
  switch (type) {
    case ChangeType.Added:
      return 'added';
    case ChangeType.Modified:
    case ChangeType.Metadata:
      return 'modified';
    case ChangeType.Removed:
      return 'removed';
    default:
      return fail('Unknown change type: ' + type);
  }
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
  options?: SetOptions
): DocumentData {
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
    convertedValue = value as DocumentData;
  }
  return convertedValue;
}

function contains(obj: object, key: string): obj is { key: unknown } {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
