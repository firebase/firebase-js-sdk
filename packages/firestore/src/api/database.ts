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

import * as firestore from '@firebase/firestore-types';

import * as api from '../protos/firestore_proto_api';

import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseApp, FirebaseService } from '@firebase/app-types/private';
import { DatabaseId, DatabaseInfo } from '../core/database_info';
import { ListenOptions } from '../core/event_manager';
import {
  MemoryOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from '../core/component_provider';
import { FirestoreClient, PersistenceSettings } from '../core/firestore_client';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
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
import { LruParams } from '../local/lru_garbage_collector';
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
  invalidClassError,
  validateArgType,
  validateAtLeastNumberOfArgs,
  validateBetweenNumberOfArgs,
  validateDefined,
  validateExactNumberOfArgs,
  validateNamedOptionalPropertyEquals,
  validateNamedOptionalType,
  validateNamedType,
  validateOptionalArgType,
  validateOptionalArrayElements,
  validateOptionNames,
  validatePositiveNumber,
  validateStringEnum,
  valueDescription
} from '../util/input_validation';
import { getLogLevel, logError, LogLevel, setLogLevel } from '../util/log';
import { AutoId } from '../util/misc';
import { Deferred } from '../util/promise';
import { FieldPath as ExternalFieldPath } from './field_path';
import {
  CredentialsProvider,
  CredentialsSettings,
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
  DocumentKeyReference,
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

// settings() defaults:
const DEFAULT_HOST = 'firestore.googleapis.com';
const DEFAULT_SSL = true;
const DEFAULT_TIMESTAMPS_IN_SNAPSHOTS = true;
const DEFAULT_FORCE_LONG_POLLING = false;
const DEFAULT_IGNORE_UNDEFINED_PROPERTIES = false;

/**
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * `Firestore` instance.
 */
export const CACHE_SIZE_UNLIMITED = LruParams.COLLECTION_DISABLED;

// enablePersistence() defaults:
const DEFAULT_SYNCHRONIZE_TABS = false;

/** Undocumented, private additional settings not exposed in our public API. */
interface PrivateSettings extends firestore.Settings {
  // Can be a google-auth-library or gapi client.
  credentials?: CredentialsSettings;
}

/**
 * Options that can be provided in the Firestore constructor when not using
 * Firebase (aka standalone mode).
 */
export interface FirestoreDatabase {
  projectId: string;
  database?: string;
}

/**
 * A concrete type describing all the values that can be applied via a
 * user-supplied firestore.Settings object. This is a separate type so that
 * defaults can be supplied and the value can be checked for equality.
 */
class FirestoreSettings {
  /** The hostname to connect to. */
  readonly host: string;

  /** Whether to use SSL when connecting. */
  readonly ssl: boolean;

  readonly timestampsInSnapshots: boolean;

  readonly cacheSizeBytes: number;

  readonly forceLongPolling: boolean;

  readonly ignoreUndefinedProperties: boolean;

  // Can be a google-auth-library or gapi client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credentials?: any;

  constructor(settings: PrivateSettings) {
    if (settings.host === undefined) {
      if (settings.ssl !== undefined) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          "Can't provide ssl option if host option is not set"
        );
      }
      this.host = DEFAULT_HOST;
      this.ssl = DEFAULT_SSL;
    } else {
      validateNamedType('settings', 'non-empty string', 'host', settings.host);
      this.host = settings.host;

      validateNamedOptionalType('settings', 'boolean', 'ssl', settings.ssl);
      this.ssl = settings.ssl ?? DEFAULT_SSL;
    }
    validateOptionNames('settings', settings, [
      'host',
      'ssl',
      'credentials',
      'timestampsInSnapshots',
      'cacheSizeBytes',
      'experimentalForceLongPolling',
      'ignoreUndefinedProperties'
    ]);

    validateNamedOptionalType(
      'settings',
      'object',
      'credentials',
      settings.credentials
    );
    this.credentials = settings.credentials;

    validateNamedOptionalType(
      'settings',
      'boolean',
      'timestampsInSnapshots',
      settings.timestampsInSnapshots
    );

    validateNamedOptionalType(
      'settings',
      'boolean',
      'ignoreUndefinedProperties',
      settings.ignoreUndefinedProperties
    );

    // Nobody should set timestampsInSnapshots anymore, but the error depends on
    // whether they set it to true or false...
    if (settings.timestampsInSnapshots === true) {
      logError(
        "The setting 'timestampsInSnapshots: true' is no longer required " +
          'and should be removed.'
      );
    } else if (settings.timestampsInSnapshots === false) {
      logError(
        "Support for 'timestampsInSnapshots: false' will be removed soon. " +
          'You must update your code to handle Timestamp objects.'
      );
    }
    this.timestampsInSnapshots =
      settings.timestampsInSnapshots ?? DEFAULT_TIMESTAMPS_IN_SNAPSHOTS;
    this.ignoreUndefinedProperties =
      settings.ignoreUndefinedProperties ?? DEFAULT_IGNORE_UNDEFINED_PROPERTIES;

    validateNamedOptionalType(
      'settings',
      'number',
      'cacheSizeBytes',
      settings.cacheSizeBytes
    );
    if (settings.cacheSizeBytes === undefined) {
      this.cacheSizeBytes = LruParams.DEFAULT_CACHE_SIZE_BYTES;
    } else {
      if (
        settings.cacheSizeBytes !== CACHE_SIZE_UNLIMITED &&
        settings.cacheSizeBytes < LruParams.MINIMUM_CACHE_SIZE_BYTES
      ) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `cacheSizeBytes must be at least ${LruParams.MINIMUM_CACHE_SIZE_BYTES}`
        );
      } else {
        this.cacheSizeBytes = settings.cacheSizeBytes;
      }
    }

    validateNamedOptionalType(
      'settings',
      'boolean',
      'experimentalForceLongPolling',
      settings.experimentalForceLongPolling
    );
    this.forceLongPolling =
      settings.experimentalForceLongPolling ?? DEFAULT_FORCE_LONG_POLLING;
  }

  isEqual(other: FirestoreSettings): boolean {
    return (
      this.host === other.host &&
      this.ssl === other.ssl &&
      this.timestampsInSnapshots === other.timestampsInSnapshots &&
      this.credentials === other.credentials &&
      this.cacheSizeBytes === other.cacheSizeBytes &&
      this.forceLongPolling === other.forceLongPolling &&
      this.ignoreUndefinedProperties === other.ignoreUndefinedProperties
    );
  }
}

/**
 * The root reference to the database.
 */
export class Firestore implements firestore.FirebaseFirestore, FirebaseService {
  // The objects that are a part of this API are exposed to third-parties as
  // compiled javascript so we want to flag our private members with a leading
  // underscore to discourage their use.
  readonly _databaseId: DatabaseId;
  private readonly _persistenceKey: string;
  private _credentials: CredentialsProvider;
  private readonly _firebaseApp: FirebaseApp | null = null;
  private _settings: FirestoreSettings;

  // The firestore client instance. This will be available as soon as
  // configureClient is called, but any calls against it will block until
  // setup has completed.
  //
  // Operations on the _firestoreClient don't block on _firestoreReady. Those
  // are already set to synchronize on the async queue.
  private _firestoreClient: FirestoreClient | undefined;

  // Public for use in tests.
  // TODO(mikelehen): Use modularized initialization instead.
  readonly _queue = new AsyncQueue();

  _userDataReader: UserDataReader | undefined;

  // Note: We are using `MemoryComponentProvider` as a default
  // ComponentProvider to ensure backwards compatibility with the format
  // expected by the console build.
  constructor(
    databaseIdOrApp: FirestoreDatabase | FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>,
    private _offlineComponentProvider: OfflineComponentProvider = new MemoryOfflineComponentProvider(),
    private _onlineComponentProvider = new OnlineComponentProvider()
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

  settings(settingsLiteral: firestore.Settings): void {
    validateExactNumberOfArgs('Firestore.settings', arguments, 1);
    validateArgType('Firestore.settings', 'object', 1, settingsLiteral);

    const newSettings = new FirestoreSettings(settingsLiteral);
    if (this._firestoreClient && !this._settings.isEqual(newSettings)) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and its settings can no longer ' +
          'be changed. You can only call settings() before calling any other ' +
          'methods on a Firestore object.'
      );
    }

    this._settings = newSettings;
    if (newSettings.credentials !== undefined) {
      this._credentials = makeCredentialsProvider(newSettings.credentials);
    }
  }

  enableNetwork(): Promise<void> {
    this.ensureClientConfigured();
    return this._firestoreClient!.enableNetwork();
  }

  disableNetwork(): Promise<void> {
    this.ensureClientConfigured();
    return this._firestoreClient!.disableNetwork();
  }

  enablePersistence(settings?: firestore.PersistenceSettings): Promise<void> {
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
      if (settings.experimentalTabSynchronization !== undefined) {
        logError(
          "The 'experimentalTabSynchronization' setting will be removed. Use 'synchronizeTabs' instead."
        );
      }
      synchronizeTabs =
        settings.synchronizeTabs ??
        settings.experimentalTabSynchronization ??
        DEFAULT_SYNCHRONIZE_TABS;

      experimentalForceOwningTab = settings.experimentalForceOwningTab
        ? settings.experimentalForceOwningTab
        : false;

      if (synchronizeTabs && experimentalForceOwningTab) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          "The 'experimentalForceOwningTab' setting cannot be used with 'synchronizeTabs'."
        );
      }
    }

    return this.configureClient(
      this._offlineComponentProvider,
      this._onlineComponentProvider,
      {
        durable: true,
        cacheSizeBytes: this._settings.cacheSizeBytes,
        synchronizeTabs,
        forceOwningTab: experimentalForceOwningTab
      }
    );
  }

  async clearPersistence(): Promise<void> {
    if (
      this._firestoreClient !== undefined &&
      !this._firestoreClient.clientTerminated
    ) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Persistence can only be cleared before a Firestore instance is ' +
          'initialized or after it is terminated.'
      );
    }

    const deferred = new Deferred<void>();
    this._queue.enqueueAndForgetEvenWhileRestricted(async () => {
      try {
        await this._offlineComponentProvider.clearPersistence(
          this._databaseId,
          this._persistenceKey
        );
        deferred.resolve();
      } catch (e) {
        deferred.reject(e);
      }
    });
    return deferred.promise;
  }

  terminate(): Promise<void> {
    (this.app as _FirebaseApp)._removeServiceInstance('firestore');
    return this.INTERNAL.delete();
  }

  get _isTerminated(): boolean {
    this.ensureClientConfigured();
    return this._firestoreClient!.clientTerminated;
  }

  waitForPendingWrites(): Promise<void> {
    this.ensureClientConfigured();
    return this._firestoreClient!.waitForPendingWrites();
  }

  onSnapshotsInSync(observer: PartialObserver<void>): Unsubscribe;
  onSnapshotsInSync(onSync: () => void): Unsubscribe;
  onSnapshotsInSync(arg: unknown): Unsubscribe {
    this.ensureClientConfigured();

    if (isPartialObserver(arg)) {
      return this._firestoreClient!.addSnapshotsInSyncListener(
        arg as PartialObserver<void>
      );
    } else {
      validateArgType('Firestore.onSnapshotsInSync', 'function', 1, arg);
      const observer: PartialObserver<void> = {
        next: arg as () => void
      };
      return this._firestoreClient!.addSnapshotsInSyncListener(observer);
    }
  }

  ensureClientConfigured(): FirestoreClient {
    if (!this._firestoreClient) {
      // Kick off starting the client but don't actually wait for it.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.configureClient(
        new MemoryOfflineComponentProvider(),
        new OnlineComponentProvider(),
        {
          durable: false
        }
      );
    }
    return this._firestoreClient as FirestoreClient;
  }

  private makeDatabaseInfo(): DatabaseInfo {
    return new DatabaseInfo(
      this._databaseId,
      this._persistenceKey,
      this._settings.host,
      this._settings.ssl,
      this._settings.forceLongPolling
    );
  }

  private configureClient(
    offlineComponentProvider: OfflineComponentProvider,
    onlineComponentProvider: OnlineComponentProvider,
    persistenceSettings: PersistenceSettings
  ): Promise<void> {
    debugAssert(!!this._settings.host, 'FirestoreSettings.host is not set');

    debugAssert(
      !this._firestoreClient,
      'configureClient() called multiple times'
    );

    const databaseInfo = this.makeDatabaseInfo();

    this._firestoreClient = new FirestoreClient(this._credentials, this._queue);

    return this._firestoreClient.start(
      databaseInfo,
      offlineComponentProvider,
      onlineComponentProvider,
      persistenceSettings
    );
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
      // The client must be initalized to ensure that all subsequent API usage
      // throws an exception.
      this.ensureClientConfigured();
      await this._firestoreClient!.terminate();
    }
  };

  collection(pathString: string): firestore.CollectionReference {
    validateExactNumberOfArgs('Firestore.collection', arguments, 1);
    validateArgType('Firestore.collection', 'non-empty string', 1, pathString);
    this.ensureClientConfigured();
    return new CollectionReference(
      ResourcePath.fromString(pathString),
      this,
      /* converter= */ null
    );
  }

  doc(pathString: string): firestore.DocumentReference {
    validateExactNumberOfArgs('Firestore.doc', arguments, 1);
    validateArgType('Firestore.doc', 'non-empty string', 1, pathString);
    this.ensureClientConfigured();
    return DocumentReference.forPath(
      ResourcePath.fromString(pathString),
      this,
      /* converter= */ null
    );
  }

  collectionGroup(collectionId: string): firestore.Query {
    validateExactNumberOfArgs('Firestore.collectionGroup', arguments, 1);
    validateArgType(
      'Firestore.collectionGroup',
      'non-empty string',
      1,
      collectionId
    );
    if (collectionId.indexOf('/') >= 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid collection ID '${collectionId}' passed to function ` +
          `Firestore.collectionGroup(). Collection IDs must not contain '/'.`
      );
    }
    this.ensureClientConfigured();
    return new Query(
      newQueryForCollectionGroup(collectionId),
      this,
      /* converter= */ null
    );
  }

  runTransaction<T>(
    updateFunction: (transaction: firestore.Transaction) => Promise<T>
  ): Promise<T> {
    validateExactNumberOfArgs('Firestore.runTransaction', arguments, 1);
    validateArgType('Firestore.runTransaction', 'function', 1, updateFunction);
    return this.ensureClientConfigured().transaction(
      (transaction: InternalTransaction) => {
        return updateFunction(new Transaction(this, transaction));
      }
    );
  }

  batch(): firestore.WriteBatch {
    this.ensureClientConfigured();

    return new WriteBatch(this);
  }

  static get logLevel(): firestore.LogLevel {
    switch (getLogLevel()) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.SILENT:
        return 'silent';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.VERBOSE:
        return 'verbose';
      default:
        // The default log level is error
        return 'error';
    }
  }

  static setLogLevel(level: firestore.LogLevel): void {
    validateExactNumberOfArgs('Firestore.setLogLevel', arguments, 1);
    validateStringEnum(
      'setLogLevel',
      ['debug', 'error', 'silent', 'warn', 'info', 'verbose'],
      1,
      level
    );
    setLogLevel(level);
  }

  // Note: this is not a property because the minifier can't work correctly with
  // the way TypeScript compiler outputs properties.
  _areTimestampsInSnapshotsEnabled(): boolean {
    return this._settings.timestampsInSnapshots;
  }
}

/**
 * A reference to a transaction.
 */
export class Transaction implements firestore.Transaction {
  constructor(
    private _firestore: Firestore,
    private _transaction: InternalTransaction
  ) {}

  get<T>(
    documentRef: firestore.DocumentReference<T>
  ): Promise<firestore.DocumentSnapshot<T>> {
    validateExactNumberOfArgs('Transaction.get', arguments, 1);
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
    options: firestore.SetOptions
  ): Transaction;
  set<T>(documentRef: DocumentReference<T>, data: T): Transaction;
  set<T>(
    documentRef: firestore.DocumentReference<T>,
    value: T | Partial<T>,
    options?: firestore.SetOptions
  ): Transaction {
    validateBetweenNumberOfArgs('Transaction.set', arguments, 2, 3);
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
    documentRef: firestore.DocumentReference<unknown>,
    value: firestore.UpdateData
  ): Transaction;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Transaction;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    fieldOrUpdateData: string | ExternalFieldPath | firestore.UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Transaction {
    let ref;
    let parsed;

    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof ExternalFieldPath
    ) {
      validateAtLeastNumberOfArgs('Transaction.update', arguments, 3);
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
      validateExactNumberOfArgs('Transaction.update', arguments, 2);
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

  delete(documentRef: firestore.DocumentReference<unknown>): Transaction {
    validateExactNumberOfArgs('Transaction.delete', arguments, 1);
    const ref = validateReference(
      'Transaction.delete',
      documentRef,
      this._firestore
    );
    this._transaction.delete(ref._key);
    return this;
  }
}

export class WriteBatch implements firestore.WriteBatch {
  private _mutations = [] as Mutation[];
  private _committed = false;

  constructor(private _firestore: Firestore) {}

  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: firestore.SetOptions
  ): WriteBatch;
  set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch;
  set<T>(
    documentRef: firestore.DocumentReference<T>,
    value: T | Partial<T>,
    options?: firestore.SetOptions
  ): WriteBatch {
    validateBetweenNumberOfArgs('WriteBatch.set', arguments, 2, 3);
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
    documentRef: firestore.DocumentReference<unknown>,
    value: firestore.UpdateData
  ): WriteBatch;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    fieldOrUpdateData: string | ExternalFieldPath | firestore.UpdateData,
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
      validateAtLeastNumberOfArgs('WriteBatch.update', arguments, 3);
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
      validateExactNumberOfArgs('WriteBatch.update', arguments, 2);
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

  delete(documentRef: firestore.DocumentReference<unknown>): WriteBatch {
    validateExactNumberOfArgs('WriteBatch.delete', arguments, 1);
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
      return this._firestore.ensureClientConfigured().write(this._mutations);
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
export class DocumentReference<T = firestore.DocumentData>
  extends DocumentKeyReference<T>
  implements firestore.DocumentReference<T> {
  private _firestoreClient: FirestoreClient;

  constructor(
    public _key: DocumentKey,
    readonly firestore: Firestore,
    readonly _converter: firestore.FirestoreDataConverter<T> | null
  ) {
    super(firestore._databaseId, _key, _converter);
    this._firestoreClient = this.firestore.ensureClientConfigured();
  }

  static forPath<U>(
    path: ResourcePath,
    firestore: Firestore,
    converter: firestore.FirestoreDataConverter<U> | null
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

  get parent(): firestore.CollectionReference<T> {
    return new CollectionReference(
      this._key.path.popLast(),
      this.firestore,
      this._converter
    );
  }

  get path(): string {
    return this._key.path.canonicalString();
  }

  collection(
    pathString: string
  ): firestore.CollectionReference<firestore.DocumentData> {
    validateExactNumberOfArgs('DocumentReference.collection', arguments, 1);
    validateArgType(
      'DocumentReference.collection',
      'non-empty string',
      1,
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

  isEqual(other: firestore.DocumentReference<T>): boolean {
    if (!(other instanceof DocumentReference)) {
      throw invalidClassError('isEqual', 'DocumentReference', 1, other);
    }
    return (
      this.firestore === other.firestore &&
      this._key.isEqual(other._key) &&
      this._converter === other._converter
    );
  }

  set(value: Partial<T>, options: firestore.SetOptions): Promise<void>;
  set(value: T): Promise<void>;
  set(value: T | Partial<T>, options?: firestore.SetOptions): Promise<void> {
    validateBetweenNumberOfArgs('DocumentReference.set', arguments, 1, 2);
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
    return this._firestoreClient.write(
      parsed.toMutations(this._key, Precondition.none())
    );
  }

  update(value: firestore.UpdateData): Promise<void>;
  update(
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void>;
  update(
    fieldOrUpdateData: string | ExternalFieldPath | firestore.UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Promise<void> {
    let parsed;

    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof ExternalFieldPath
    ) {
      validateAtLeastNumberOfArgs('DocumentReference.update', arguments, 2);
      parsed = parseUpdateVarargs(
        this.firestore._dataReader,
        'DocumentReference.update',
        this._key,
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      validateExactNumberOfArgs('DocumentReference.update', arguments, 1);
      parsed = parseUpdateData(
        this.firestore._dataReader,
        'DocumentReference.update',
        this._key,
        fieldOrUpdateData
      );
    }

    return this._firestoreClient.write(
      parsed.toMutations(this._key, Precondition.exists(true))
    );
  }

  delete(): Promise<void> {
    validateExactNumberOfArgs('DocumentReference.delete', arguments, 0);
    return this._firestoreClient.write([
      new DeleteMutation(this._key, Precondition.none())
    ]);
  }

  onSnapshot(
    observer: PartialObserver<firestore.DocumentSnapshot<T>>
  ): Unsubscribe;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
    observer: PartialObserver<firestore.DocumentSnapshot<T>>
  ): Unsubscribe;
  onSnapshot(
    onNext: NextFn<firestore.DocumentSnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
    onNext: NextFn<firestore.DocumentSnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;

  onSnapshot(...args: unknown[]): Unsubscribe {
    validateBetweenNumberOfArgs(
      'DocumentReference.onSnapshot',
      arguments,
      1,
      4
    );
    let options: ListenOptions = {
      includeMetadataChanges: false
    };
    let currArg = 0;
    if (
      typeof args[currArg] === 'object' &&
      !isPartialObserver(args[currArg])
    ) {
      options = args[currArg] as firestore.SnapshotListenOptions;
      validateOptionNames('DocumentReference.onSnapshot', options, [
        'includeMetadataChanges'
      ]);
      validateNamedOptionalType(
        'DocumentReference.onSnapshot',
        'boolean',
        'includeMetadataChanges',
        options.includeMetadataChanges
      );
      currArg++;
    }

    const internalOptions = {
      includeMetadataChanges: options.includeMetadataChanges
    };

    if (isPartialObserver(args[currArg])) {
      const userObserver = args[currArg] as PartialObserver<
        firestore.DocumentSnapshot<T>
      >;
      args[currArg] = userObserver.next?.bind(userObserver);
      args[currArg + 1] = userObserver.error?.bind(userObserver);
      args[currArg + 2] = userObserver.complete?.bind(userObserver);
    } else {
      validateArgType(
        'DocumentReference.onSnapshot',
        'function',
        currArg,
        args[currArg]
      );
      validateOptionalArgType(
        'DocumentReference.onSnapshot',
        'function',
        currArg + 1,
        args[currArg + 1]
      );
      validateOptionalArgType(
        'DocumentReference.onSnapshot',
        'function',
        currArg + 2,
        args[currArg + 2]
      );
    }

    const observer: PartialObserver<ViewSnapshot> = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<firestore.DocumentSnapshot<T>>)(
            this._convertToDocSnapshot(snapshot)
          );
        }
      },
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };

    return this._firestoreClient.listen(
      newQueryForPath(this._key.path),
      internalOptions,
      observer
    );
  }

  get(options?: firestore.GetOptions): Promise<firestore.DocumentSnapshot<T>> {
    validateBetweenNumberOfArgs('DocumentReference.get', arguments, 0, 1);
    validateGetOptions('DocumentReference.get', options);

    const firestoreClient = this.firestore.ensureClientConfigured();
    if (options && options.source === 'cache') {
      return firestoreClient
        .getDocumentFromLocalCache(this._key)
        .then(
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
      return firestoreClient
        .getDocumentViaSnapshotListener(this._key, options)
        .then(snapshot => this._convertToDocSnapshot(snapshot));
    }
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.DocumentReference<U> {
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

export class SnapshotMetadata implements firestore.SnapshotMetadata {
  constructor(
    readonly hasPendingWrites: boolean,
    readonly fromCache: boolean
  ) {}

  isEqual(other: firestore.SnapshotMetadata): boolean {
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
export interface SnapshotOptions extends firestore.SnapshotOptions {}

export class DocumentSnapshot<T = firestore.DocumentData>
  implements firestore.DocumentSnapshot<T> {
  constructor(
    private _firestore: Firestore,
    private _key: DocumentKey,
    public _document: Document | null,
    private _fromCache: boolean,
    private _hasPendingWrites: boolean,
    private readonly _converter: firestore.FirestoreDataConverter<T> | null
  ) {}

  data(options?: firestore.SnapshotOptions): T | undefined {
    validateBetweenNumberOfArgs('DocumentSnapshot.data', arguments, 0, 1);
    options = validateSnapshotOptions('DocumentSnapshot.data', options);
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
          this._firestore._areTimestampsInSnapshotsEnabled(),
          options.serverTimestamps || 'none',
          key =>
            new DocumentReference(key, this._firestore, /* converter= */ null)
        );
        return userDataWriter.convertValue(this._document.toProto()) as T;
      }
    }
  }

  get(
    fieldPath: string | ExternalFieldPath,
    options?: firestore.SnapshotOptions
  ): unknown {
    validateBetweenNumberOfArgs('DocumentSnapshot.get', arguments, 1, 2);
    options = validateSnapshotOptions('DocumentSnapshot.get', options);
    if (this._document) {
      const value = this._document
        .data()
        .field(
          fieldPathFromArgument('DocumentSnapshot.get', fieldPath, this._key)
        );
      if (value !== null) {
        const userDataWriter = new UserDataWriter(
          this._firestore._databaseId,
          this._firestore._areTimestampsInSnapshotsEnabled(),
          options.serverTimestamps || 'none',
          key => new DocumentReference(key, this._firestore, this._converter)
        );
        return userDataWriter.convertValue(value);
      }
    }
    return undefined;
  }

  get id(): string {
    return this._key.path.lastSegment();
  }

  get ref(): firestore.DocumentReference<T> {
    return new DocumentReference<T>(
      this._key,
      this._firestore,
      this._converter
    );
  }

  get exists(): boolean {
    return this._document !== null;
  }

  get metadata(): firestore.SnapshotMetadata {
    return new SnapshotMetadata(this._hasPendingWrites, this._fromCache);
  }

  isEqual(other: firestore.DocumentSnapshot<T>): boolean {
    if (!(other instanceof DocumentSnapshot)) {
      throw invalidClassError('isEqual', 'DocumentSnapshot', 1, other);
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

export class QueryDocumentSnapshot<T = firestore.DocumentData>
  extends DocumentSnapshot<T>
  implements firestore.QueryDocumentSnapshot<T> {
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
  let fieldValue: api.Value;
  if (fieldPath.isKeyField()) {
    if (op === Operator.ARRAY_CONTAINS || op === Operator.ARRAY_CONTAINS_ANY) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid Query. You can't perform '${op}' ` +
          'queries on FieldPath.documentId().'
      );
    } else if (op === Operator.IN || op === Operator.NOT_IN) {
      validateDisjunctiveFilterElements(value, op);
      const referenceList: api.Value[] = [];
      for (const arrayValue of value as api.Value[]) {
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

  const components: api.Value[] = [];

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

  const components: api.Value[] = [];
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
): api.Value {
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
  } else if (documentIdValue instanceof DocumentKeyReference) {
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
  if (operator === Operator.IN || operator === Operator.ARRAY_CONTAINS_ANY) {
    if (value.indexOf(null) >= 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid Query. '${operator.toString()}' filters cannot contain 'null' ` +
          'in the value array.'
      );
    }
    if (value.filter(element => Number.isNaN(element)).length > 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid Query. '${operator.toString()}' filters cannot contain 'NaN' ` +
          'in the value array.'
      );
    }
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
    const existingField = query.getInequalityFilterField();
    if (existingField !== null && !existingField.isEqual(filter.field)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. All where filters with an inequality' +
          ' (<, <=, >, or >=) must be on the same field. But you have' +
          ` inequality filters on '${existingField.toString()}'` +
          ` and '${filter.field.toString()}'`
      );
    }

    const firstOrderByField = query.getFirstOrderByField();
    if (firstOrderByField !== null) {
      validateOrderByAndInequalityMatch(query, filter.field, firstOrderByField);
    }
  }

  const conflictingOp = query.findFilterOperator(conflictingOps(filter.op));
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
  if (query.getFirstOrderByField() === null) {
    // This is the first order by. It must match any inequality.
    const inequalityField = query.getInequalityFilterField();
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
  if (query.hasLimitToLast() && query.explicitOrderBy.length === 0) {
    throw new FirestoreError(
      Code.UNIMPLEMENTED,
      'limitToLast() queries require specifying at least one orderBy() clause'
    );
  }
}

export class Query<T = firestore.DocumentData> implements firestore.Query<T> {
  constructor(
    public _query: InternalQuery,
    readonly firestore: Firestore,
    protected readonly _converter: firestore.FirestoreDataConverter<T> | null
  ) {}

  where(
    field: string | ExternalFieldPath,
    opStr: firestore.WhereFilterOp,
    value: unknown
  ): firestore.Query<T> {
    validateExactNumberOfArgs('Query.where', arguments, 3);
    validateDefined('Query.where', 3, value);

    // TODO(ne-queries): Add 'not-in' and '!=' to validation.
    let op: Operator;
    if ((opStr as unknown) === 'not-in' || (opStr as unknown) === '!=') {
      op = opStr as Operator;
    } else {
      // Enumerated from the WhereFilterOp type in index.d.ts.
      const whereFilterOpEnums = [
        Operator.LESS_THAN,
        Operator.LESS_THAN_OR_EQUAL,
        Operator.EQUAL,
        Operator.GREATER_THAN_OR_EQUAL,
        Operator.GREATER_THAN,
        Operator.ARRAY_CONTAINS,
        Operator.IN,
        Operator.ARRAY_CONTAINS_ANY
      ];
      op = validateStringEnum('Query.where', whereFilterOpEnums, 2, opStr);
    }

    const fieldPath = fieldPathFromArgument('Query.where', field);
    const filter = newQueryFilter(
      this._query,
      'Query.where',
      this.firestore._dataReader,
      this.firestore._databaseId,
      fieldPath,
      op,
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
    directionStr?: firestore.OrderByDirection
  ): firestore.Query<T> {
    validateBetweenNumberOfArgs('Query.orderBy', arguments, 1, 2);
    validateOptionalArgType(
      'Query.orderBy',
      'non-empty string',
      2,
      directionStr
    );
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

  limit(n: number): firestore.Query<T> {
    validateExactNumberOfArgs('Query.limit', arguments, 1);
    validateArgType('Query.limit', 'number', 1, n);
    validatePositiveNumber('Query.limit', 1, n);
    return new Query(
      queryWithLimit(this._query, n, LimitType.First),
      this.firestore,
      this._converter
    );
  }

  limitToLast(n: number): firestore.Query<T> {
    validateExactNumberOfArgs('Query.limitToLast', arguments, 1);
    validateArgType('Query.limitToLast', 'number', 1, n);
    validatePositiveNumber('Query.limitToLast', 1, n);
    return new Query(
      queryWithLimit(this._query, n, LimitType.Last),
      this.firestore,
      this._converter
    );
  }

  startAt(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    validateAtLeastNumberOfArgs('Query.startAt', arguments, 1);
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
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    validateAtLeastNumberOfArgs('Query.startAfter', arguments, 1);
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
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    validateAtLeastNumberOfArgs('Query.endBefore', arguments, 1);
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
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    validateAtLeastNumberOfArgs('Query.endAt', arguments, 1);
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

  isEqual(other: firestore.Query<T>): boolean {
    if (!(other instanceof Query)) {
      throw invalidClassError('isEqual', 'Query', 1, other);
    }
    return (
      this.firestore === other.firestore &&
      queryEquals(this._query, other._query) &&
      this._converter === other._converter
    );
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.Query<U> {
    return new Query<U>(this._query, this.firestore, converter);
  }

  /** Helper function to create a bound from a document or fields */
  private boundFromDocOrFields(
    methodName: string,
    docOrField: unknown | firestore.DocumentSnapshot<T>,
    fields: unknown[],
    before: boolean
  ): Bound {
    validateDefined(methodName, 1, docOrField);
    if (docOrField instanceof DocumentSnapshot) {
      validateExactNumberOfArgs(methodName, [docOrField, ...fields], 1);
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

  onSnapshot(
    observer: PartialObserver<firestore.QuerySnapshot<T>>
  ): Unsubscribe;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
    observer: PartialObserver<firestore.QuerySnapshot<T>>
  ): Unsubscribe;
  onSnapshot(
    onNext: NextFn<firestore.QuerySnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
    onNext: NextFn<firestore.QuerySnapshot<T>>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;

  onSnapshot(...args: unknown[]): Unsubscribe {
    validateBetweenNumberOfArgs('Query.onSnapshot', arguments, 1, 4);
    let options: ListenOptions = {};
    let currArg = 0;
    if (
      typeof args[currArg] === 'object' &&
      !isPartialObserver(args[currArg])
    ) {
      options = args[currArg] as firestore.SnapshotListenOptions;
      validateOptionNames('Query.onSnapshot', options, [
        'includeMetadataChanges'
      ]);
      validateNamedOptionalType(
        'Query.onSnapshot',
        'boolean',
        'includeMetadataChanges',
        options.includeMetadataChanges
      );
      currArg++;
    }

    if (isPartialObserver(args[currArg])) {
      const userObserver = args[currArg] as PartialObserver<
        firestore.QuerySnapshot<T>
      >;
      args[currArg] = userObserver.next?.bind(userObserver);
      args[currArg + 1] = userObserver.error?.bind(userObserver);
      args[currArg + 2] = userObserver.complete?.bind(userObserver);
    } else {
      validateArgType('Query.onSnapshot', 'function', currArg, args[currArg]);
      validateOptionalArgType(
        'Query.onSnapshot',
        'function',
        currArg + 1,
        args[currArg + 1]
      );
      validateOptionalArgType(
        'Query.onSnapshot',
        'function',
        currArg + 2,
        args[currArg + 2]
      );
    }

    const observer: PartialObserver<ViewSnapshot> = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<firestore.QuerySnapshot<T>>)(
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
    const firestoreClient = this.firestore.ensureClientConfigured();
    return firestoreClient.listen(this._query, options, observer);
  }

  get(options?: firestore.GetOptions): Promise<firestore.QuerySnapshot<T>> {
    validateBetweenNumberOfArgs('Query.get', arguments, 0, 1);
    validateGetOptions('Query.get', options);
    validateHasExplicitOrderByForLimitToLast(this._query);

    const firestoreClient = this.firestore.ensureClientConfigured();
    return (options && options.source === 'cache'
      ? firestoreClient.getDocumentsFromLocalCache(this._query)
      : firestoreClient.getDocumentsViaSnapshotListener(this._query, options)
    ).then(
      snap =>
        new QuerySnapshot(this.firestore, this._query, snap, this._converter)
    );
  }
}

export class QuerySnapshot<T = firestore.DocumentData>
  implements firestore.QuerySnapshot<T> {
  private _cachedChanges: Array<firestore.DocumentChange<T>> | null = null;
  private _cachedChangesIncludeMetadataChanges: boolean | null = null;

  readonly metadata: firestore.SnapshotMetadata;

  constructor(
    private readonly _firestore: Firestore,
    private readonly _originalQuery: InternalQuery,
    private readonly _snapshot: ViewSnapshot,
    private readonly _converter: firestore.FirestoreDataConverter<T> | null
  ) {
    this.metadata = new SnapshotMetadata(
      _snapshot.hasPendingWrites,
      _snapshot.fromCache
    );
  }

  get docs(): Array<firestore.QueryDocumentSnapshot<T>> {
    const result: Array<firestore.QueryDocumentSnapshot<T>> = [];
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
    callback: (result: firestore.QueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
  ): void {
    validateBetweenNumberOfArgs('QuerySnapshot.forEach', arguments, 1, 2);
    validateArgType('QuerySnapshot.forEach', 'function', 1, callback);
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

  get query(): firestore.Query<T> {
    return new Query(this._originalQuery, this._firestore, this._converter);
  }

  docChanges(
    options?: firestore.SnapshotListenOptions
  ): Array<firestore.DocumentChange<T>> {
    if (options) {
      validateOptionNames('QuerySnapshot.docChanges', options, [
        'includeMetadataChanges'
      ]);
      validateNamedOptionalType(
        'QuerySnapshot.docChanges',
        'boolean',
        'includeMetadataChanges',
        options.includeMetadataChanges
      );
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
  isEqual(other: firestore.QuerySnapshot<T>): boolean {
    if (!(other instanceof QuerySnapshot)) {
      throw invalidClassError('isEqual', 'QuerySnapshot', 1, other);
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

export class CollectionReference<T = firestore.DocumentData> extends Query<T>
  implements firestore.CollectionReference<T> {
  constructor(
    readonly _path: ResourcePath,
    firestore: Firestore,
    _converter: firestore.FirestoreDataConverter<T> | null
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

  get parent(): firestore.DocumentReference<firestore.DocumentData> | null {
    const parentPath = this._query.path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference<firestore.DocumentData>(
        new DocumentKey(parentPath),
        this.firestore,
        /* converter= */ null
      );
    }
  }

  get path(): string {
    return this._query.path.canonicalString();
  }

  doc(pathString?: string): firestore.DocumentReference<T> {
    validateBetweenNumberOfArgs('CollectionReference.doc', arguments, 0, 1);
    // We allow omission of 'pathString' but explicitly prohibit passing in both
    // 'undefined' and 'null'.
    if (arguments.length === 0) {
      pathString = AutoId.newId();
    }
    validateArgType(
      'CollectionReference.doc',
      'non-empty string',
      1,
      pathString
    );
    const path = ResourcePath.fromString(pathString!);
    return DocumentReference.forPath<T>(
      this._query.path.child(path),
      this.firestore,
      this._converter
    );
  }

  add(value: T): Promise<firestore.DocumentReference<T>> {
    validateExactNumberOfArgs('CollectionReference.add', arguments, 1);
    const convertedValue = this._converter
      ? this._converter.toFirestore(value)
      : value;
    validateArgType('CollectionReference.add', 'object', 1, convertedValue);
    const docRef = this.doc();
    return docRef.set(value).then(() => docRef);
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.CollectionReference<U> {
    return new CollectionReference<U>(this._path, this.firestore, converter);
  }
}

function validateSetOptions(
  methodName: string,
  options: firestore.SetOptions | undefined
): firestore.SetOptions {
  if (options === undefined) {
    return {
      merge: false
    };
  }

  validateOptionNames(methodName, options, ['merge', 'mergeFields']);
  validateNamedOptionalType(methodName, 'boolean', 'merge', options.merge);
  validateOptionalArrayElements(
    methodName,
    'mergeFields',
    'a string or a FieldPath',
    options.mergeFields,
    element =>
      typeof element === 'string' || element instanceof ExternalFieldPath
  );

  if (options.mergeFields !== undefined && options.merge !== undefined) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid options passed to function ${methodName}(): You cannot specify both "merge" ` +
        `and "mergeFields".`
    );
  }

  return options;
}

function validateSnapshotOptions(
  methodName: string,
  options: firestore.SnapshotOptions | undefined
): firestore.SnapshotOptions {
  if (options === undefined) {
    return {};
  }

  validateOptionNames(methodName, options, ['serverTimestamps']);
  validateNamedOptionalPropertyEquals(
    methodName,
    'options',
    'serverTimestamps',
    options.serverTimestamps,
    ['estimate', 'previous', 'none']
  );
  return options;
}

function validateGetOptions(
  methodName: string,
  options: firestore.GetOptions | undefined
): void {
  validateOptionalArgType(methodName, 'object', 1, options);
  if (options) {
    validateOptionNames(methodName, options, ['source']);
    validateNamedOptionalPropertyEquals(
      methodName,
      'options',
      'source',
      options.source,
      ['default', 'server', 'cache']
    );
  }
}

function validateReference<T>(
  methodName: string,
  documentRef: firestore.DocumentReference<T>,
  firestore: Firestore
): DocumentKeyReference<T> {
  if (!(documentRef instanceof DocumentKeyReference)) {
    throw invalidClassError(methodName, 'DocumentReference', 1, documentRef);
  } else if (documentRef.firestore !== firestore) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Provided document reference is from a different Firestore instance.'
    );
  } else {
    return documentRef;
  }
}

/**
 * Calculates the array of firestore.DocumentChange's for a given ViewSnapshot.
 *
 * Exported for testing.
 *
 * @param snapshot The ViewSnapshot that represents the expected state.
 * @param includeMetadataChanges Whether to include metadata changes.
 * @param converter A factory function that returns a QueryDocumentSnapshot.
 * @return An objecyt that matches the firestore.DocumentChange API.
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
  type: firestore.DocumentChangeType;
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
        type: 'added' as firestore.DocumentChangeType,
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

function resultChangeType(type: ChangeType): firestore.DocumentChangeType {
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
  options?: firestore.SetOptions
): firestore.DocumentData {
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
    convertedValue = value as firestore.DocumentData;
  }
  return convertedValue;
}

function contains(obj: object, key: string): obj is { key: unknown } {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
