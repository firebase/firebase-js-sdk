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
  ComponentProvider,
  MemoryComponentProvider
} from '../core/component_provider';
import { FirestoreClient, PersistenceSettings } from '../core/firestore_client';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
  Operator,
  OrderBy,
  Query as InternalQuery
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
import { PlatformSupport } from '../platform/platform';
import { debugAssert, fail } from '../util/assert';
import { AsyncObserver } from '../util/async_observer';
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
import { Deferred, Rejecter, Resolver } from '../util/promise';
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
import { fieldPathFromArgument, UserDataReader } from './user_data_reader';
import { UserDataWriter } from './user_data_writer';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { LoadBundleTask } from '../core/bundle';

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
  private readonly _componentProvider: ComponentProvider;
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
    componentProvider: ComponentProvider = new MemoryComponentProvider()
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

    this._componentProvider = componentProvider;
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
    }

    return this.configureClient(this._componentProvider, {
      durable: true,
      cacheSizeBytes: this._settings.cacheSizeBytes,
      synchronizeTabs
    });
  }

  async clearPersistence(): Promise<void> {
    if (
      this._firestoreClient !== undefined &&
      !this._firestoreClient.clientTerminated
    ) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Persistence cannot be cleared after this Firestore instance is initialized.'
      );
    }

    const deferred = new Deferred<void>();
    this._queue.enqueueAndForgetEvenAfterShutdown(async () => {
      try {
        const databaseInfo = this.makeDatabaseInfo();
        await this._componentProvider.clearPersistence(databaseInfo);
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
      return this.onSnapshotsInSyncInternal(arg as PartialObserver<void>);
    } else {
      validateArgType('Firestore.onSnapshotsInSync', 'function', 1, arg);
      const observer: PartialObserver<void> = {
        next: arg as () => void
      };
      return this.onSnapshotsInSyncInternal(observer);
    }
  }

  private onSnapshotsInSyncInternal(
    observer: PartialObserver<void>
  ): Unsubscribe {
    const errHandler = (err: Error): void => {
      throw fail('Uncaught Error in onSnapshotsInSync');
    };
    const asyncObserver = new AsyncObserver<void>({
      next: () => {
        if (observer.next) {
          observer.next();
        }
      },
      error: errHandler
    });
    this._firestoreClient!.addSnapshotsInSyncListener(asyncObserver);
    return () => {
      asyncObserver.mute();
      this._firestoreClient!.removeSnapshotsInSyncListener(asyncObserver);
    };
  }

  loadBundle(
    bundleData: ArrayBuffer | ReadableStream /*| string */
  ): LoadBundleTask {
    this.ensureClientConfigured();
    return this._firestoreClient!.loadBundle(bundleData);
  }

  ensureClientConfigured(): FirestoreClient {
    if (!this._firestoreClient) {
      // Kick off starting the client but don't actually wait for it.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.configureClient(new MemoryComponentProvider(), {
        durable: false
      });
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
    componentProvider: ComponentProvider,
    persistenceSettings: PersistenceSettings
  ): Promise<void> {
    debugAssert(!!this._settings.host, 'FirestoreSettings.host is not set');

    debugAssert(
      !this._firestoreClient,
      'configureClient() called multiple times'
    );

    const databaseInfo = this.makeDatabaseInfo();

    this._firestoreClient = new FirestoreClient(
      PlatformSupport.getPlatform(),
      databaseInfo,
      this._credentials,
      this._queue
    );

    return this._firestoreClient.start(componentProvider, persistenceSettings);
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
    return new CollectionReference(ResourcePath.fromString(pathString), this);
  }

  doc(pathString: string): firestore.DocumentReference {
    validateExactNumberOfArgs('Firestore.doc', arguments, 1);
    validateArgType('Firestore.doc', 'non-empty string', 1, pathString);
    this.ensureClientConfigured();
    return DocumentReference.forPath(ResourcePath.fromString(pathString), this);
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
      new InternalQuery(ResourcePath.EMPTY_PATH, collectionId),
      this
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
      case LogLevel.SILENT:
        return 'silent';
      default:
        // The default log level is error
        return 'error';
    }
  }

  static setLogLevel(level: firestore.LogLevel): void {
    validateExactNumberOfArgs('Firestore.setLogLevel', arguments, 1);
    validateArgType('Firestore.setLogLevel', 'non-empty string', 1, level);
    switch (level) {
      case 'debug':
        setLogLevel(LogLevel.DEBUG);
        break;
      case 'error':
        setLogLevel(LogLevel.ERROR);
        break;
      case 'silent':
        setLogLevel(LogLevel.SILENT);
        break;
      default:
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Invalid log level: ' + level
        );
    }
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
    documentRef: firestore.DocumentReference<T>,
    value: T,
    options?: firestore.SetOptions
  ): Transaction {
    validateBetweenNumberOfArgs('Transaction.set', arguments, 2, 3);
    const ref = validateReference(
      'Transaction.set',
      documentRef,
      this._firestore
    );
    options = validateSetOptions('Transaction.set', options);
    const [convertedValue, functionName] = applyFirestoreDataConverter(
      ref._converter,
      value,
      'Transaction.set'
    );
    const parsed =
      options.merge || options.mergeFields
        ? this._firestore._dataReader.parseMergeData(
            functionName,
            convertedValue,
            options.mergeFields
          )
        : this._firestore._dataReader.parseSetData(
            functionName,
            convertedValue
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
      parsed = this._firestore._dataReader.parseUpdateVarargs(
        'Transaction.update',
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
      parsed = this._firestore._dataReader.parseUpdateData(
        'Transaction.update',
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
    documentRef: firestore.DocumentReference<T>,
    value: T,
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
    const [convertedValue, functionName] = applyFirestoreDataConverter(
      ref._converter,
      value,
      'WriteBatch.set'
    );
    const parsed =
      options.merge || options.mergeFields
        ? this._firestore._dataReader.parseMergeData(
            functionName,
            convertedValue,
            options.mergeFields
          )
        : this._firestore._dataReader.parseSetData(
            functionName,
            convertedValue
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
      parsed = this._firestore._dataReader.parseUpdateVarargs(
        'WriteBatch.update',
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
      parsed = this._firestore._dataReader.parseUpdateData(
        'WriteBatch.update',
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
  implements firestore.DocumentReference<T> {
  private _firestoreClient: FirestoreClient;

  constructor(
    public _key: DocumentKey,
    readonly firestore: Firestore,
    readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {
    this._firestoreClient = this.firestore.ensureClientConfigured();
  }

  static forPath<U>(
    path: ResourcePath,
    firestore: Firestore,
    converter?: firestore.FirestoreDataConverter<U>
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
    return new CollectionReference(this._key.path.child(path), this.firestore);
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

  set(
    value: firestore.DocumentData,
    options?: firestore.SetOptions
  ): Promise<void>;
  set(value: T, options?: firestore.SetOptions): Promise<void> {
    validateBetweenNumberOfArgs('DocumentReference.set', arguments, 1, 2);
    options = validateSetOptions('DocumentReference.set', options);
    const [convertedValue, functionName] = applyFirestoreDataConverter(
      this._converter,
      value,
      'DocumentReference.set'
    );
    const parsed =
      options.merge || options.mergeFields
        ? this.firestore._dataReader.parseMergeData(
            functionName,
            convertedValue,
            options.mergeFields
          )
        : this.firestore._dataReader.parseSetData(functionName, convertedValue);
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
      parsed = this.firestore._dataReader.parseUpdateVarargs(
        'DocumentReference.update',
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      validateExactNumberOfArgs('DocumentReference.update', arguments, 1);
      parsed = this.firestore._dataReader.parseUpdateData(
        'DocumentReference.update',
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
    let options: firestore.SnapshotListenOptions = {
      includeMetadataChanges: false
    };
    let observer: PartialObserver<firestore.DocumentSnapshot<T>>;
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
      observer = args[currArg] as PartialObserver<
        firestore.DocumentSnapshot<T>
      >;
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
      observer = {
        next: args[currArg] as NextFn<firestore.DocumentSnapshot<T>>,
        error: args[currArg + 1] as ErrorFn,
        complete: args[currArg + 2] as CompleteFn
      };
    }
    return this.onSnapshotInternal(internalOptions, observer);
  }

  private onSnapshotInternal(
    options: ListenOptions,
    observer: PartialObserver<firestore.DocumentSnapshot<T>>
  ): Unsubscribe {
    let errHandler = (err: Error): void => {
      console.error('Uncaught Error in onSnapshot:', err);
    };
    if (observer.error) {
      errHandler = observer.error.bind(observer);
    }

    const asyncObserver = new AsyncObserver<ViewSnapshot>({
      next: snapshot => {
        if (observer.next) {
          debugAssert(
            snapshot.docs.size <= 1,
            'Too many documents returned on a document query'
          );
          const doc = snapshot.docs.get(this._key);

          observer.next(
            new DocumentSnapshot(
              this.firestore,
              this._key,
              doc,
              snapshot.fromCache,
              snapshot.hasPendingWrites,
              this._converter
            )
          );
        }
      },
      error: errHandler
    });
    const internalListener = this._firestoreClient.listen(
      InternalQuery.atPath(this._key.path),
      asyncObserver,
      options
    );

    return () => {
      asyncObserver.mute();
      this._firestoreClient.unlisten(internalListener);
    };
  }

  get(options?: firestore.GetOptions): Promise<firestore.DocumentSnapshot<T>> {
    validateBetweenNumberOfArgs('DocumentReference.get', arguments, 0, 1);
    validateGetOptions('DocumentReference.get', options);
    return new Promise(
      (resolve: Resolver<firestore.DocumentSnapshot<T>>, reject: Rejecter) => {
        if (options && options.source === 'cache') {
          this.firestore
            .ensureClientConfigured()
            .getDocumentFromLocalCache(this._key)
            .then(doc => {
              resolve(
                new DocumentSnapshot(
                  this.firestore,
                  this._key,
                  doc,
                  /*fromCache=*/ true,
                  doc instanceof Document ? doc.hasLocalMutations : false,
                  this._converter
                )
              );
            }, reject);
        } else {
          this.getViaSnapshotListener(resolve, reject, options);
        }
      }
    );
  }

  private getViaSnapshotListener(
    resolve: Resolver<firestore.DocumentSnapshot<T>>,
    reject: Rejecter,
    options?: firestore.GetOptions
  ): void {
    const unlisten = this.onSnapshotInternal(
      {
        includeMetadataChanges: true,
        waitForSyncWhenOnline: true
      },
      {
        next: (snap: firestore.DocumentSnapshot<T>) => {
          // Remove query first before passing event to user to avoid
          // user actions affecting the now stale query.
          unlisten();

          if (!snap.exists && snap.metadata.fromCache) {
            // TODO(dimond): If we're online and the document doesn't
            // exist then we resolve with a doc.exists set to false. If
            // we're offline however, we reject the Promise in this
            // case. Two options: 1) Cache the negative response from
            // the server so we can deliver that even when you're
            // offline 2) Actually reject the Promise in the online case
            // if the document doesn't exist.
            reject(
              new FirestoreError(
                Code.UNAVAILABLE,
                'Failed to get document because the client is ' + 'offline.'
              )
            );
          } else if (
            snap.exists &&
            snap.metadata.fromCache &&
            options &&
            options.source === 'server'
          ) {
            reject(
              new FirestoreError(
                Code.UNAVAILABLE,
                'Failed to get document from server. (However, this ' +
                  'document does exist in the local cache. Run again ' +
                  'without setting source to "server" to ' +
                  'retrieve the cached document.)'
              )
            );
          } else {
            resolve(snap);
          }
        },
        error: reject
      }
    );
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.DocumentReference<U> {
    return new DocumentReference<U>(this._key, this.firestore, converter);
  }
}

class SnapshotMetadata implements firestore.SnapshotMetadata {
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
    private readonly _converter?: firestore.FirestoreDataConverter<T>
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
          this._hasPendingWrites
        );
        return this._converter.fromFirestore(snapshot, options);
      } else {
        const userDataWriter = new UserDataWriter(
          this._firestore,
          this._firestore._areTimestampsInSnapshotsEnabled(),
          options.serverTimestamps,
          /* converter= */ undefined
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
        .field(fieldPathFromArgument('DocumentSnapshot.get', fieldPath));
      if (value !== null) {
        const userDataWriter = new UserDataWriter(
          this._firestore,
          this._firestore._areTimestampsInSnapshotsEnabled(),
          options.serverTimestamps,
          this._converter
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

export class Query<T = firestore.DocumentData> implements firestore.Query<T> {
  constructor(
    public _query: InternalQuery,
    readonly firestore: Firestore,
    protected readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {}

  where(
    field: string | ExternalFieldPath,
    opStr: firestore.WhereFilterOp,
    value: unknown
  ): firestore.Query<T> {
    validateExactNumberOfArgs('Query.where', arguments, 3);
    validateDefined('Query.where', 3, value);

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
    const op = validateStringEnum('Query.where', whereFilterOpEnums, 2, opStr);

    let fieldValue: api.Value;
    const fieldPath = fieldPathFromArgument('Query.where', field);
    if (fieldPath.isKeyField()) {
      if (
        op === Operator.ARRAY_CONTAINS ||
        op === Operator.ARRAY_CONTAINS_ANY
      ) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid Query. You can't perform '${op}' ` +
            'queries on FieldPath.documentId().'
        );
      } else if (op === Operator.IN) {
        this.validateDisjunctiveFilterElements(value, op);
        const referenceList: api.Value[] = [];
        for (const arrayValue of value as api.Value[]) {
          referenceList.push(this.parseDocumentIdValue(arrayValue));
        }
        fieldValue = { arrayValue: { values: referenceList } };
      } else {
        fieldValue = this.parseDocumentIdValue(value);
      }
    } else {
      if (op === Operator.IN || op === Operator.ARRAY_CONTAINS_ANY) {
        this.validateDisjunctiveFilterElements(value, op);
      }
      fieldValue = this.firestore._dataReader.parseQueryValue(
        'Query.where',
        value,
        // We only allow nested arrays for IN queries.
        /** allowArrays = */ op === Operator.IN
      );
    }
    const filter = FieldFilter.create(fieldPath, op, fieldValue);
    this.validateNewFilter(filter);
    return new Query(
      this._query.addFilter(filter),
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
    if (this._query.startAt !== null) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. You must not call Query.startAt() or ' +
          'Query.startAfter() before calling Query.orderBy().'
      );
    }
    if (this._query.endAt !== null) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. You must not call Query.endAt() or ' +
          'Query.endBefore() before calling Query.orderBy().'
      );
    }
    const fieldPath = fieldPathFromArgument('Query.orderBy', field);
    const orderBy = new OrderBy(fieldPath, direction);
    this.validateNewOrderBy(orderBy);
    return new Query(
      this._query.addOrderBy(orderBy),
      this.firestore,
      this._converter
    );
  }

  limit(n: number): firestore.Query<T> {
    validateExactNumberOfArgs('Query.limit', arguments, 1);
    validateArgType('Query.limit', 'number', 1, n);
    validatePositiveNumber('Query.limit', 1, n);
    return new Query(
      this._query.withLimitToFirst(n),
      this.firestore,
      this._converter
    );
  }

  limitToLast(n: number): firestore.Query<T> {
    validateExactNumberOfArgs('Query.limitToLast', arguments, 1);
    validateArgType('Query.limitToLast', 'number', 1, n);
    validatePositiveNumber('Query.limitToLast', 1, n);
    return new Query(
      this._query.withLimitToLast(n),
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
      this._query.withStartAt(bound),
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
      this._query.withStartAt(bound),
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
      this._query.withEndAt(bound),
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
      this._query.withEndAt(bound),
      this.firestore,
      this._converter
    );
  }

  isEqual(other: firestore.Query<T>): boolean {
    if (!(other instanceof Query)) {
      throw invalidClassError('isEqual', 'Query', 1, other);
    }
    return (
      this.firestore === other.firestore && this._query.isEqual(other._query)
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
      if (fields.length > 0) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Too many arguments provided to ${methodName}().`
        );
      }
      const snap = docOrField;
      if (!snap.exists) {
        throw new FirestoreError(
          Code.NOT_FOUND,
          `Can't use a DocumentSnapshot that doesn't exist for ` +
            `${methodName}().`
        );
      }
      return this.boundFromDocument(snap._document!, before);
    } else {
      const allFields = [docOrField].concat(fields);
      return this.boundFromFields(methodName, allFields, before);
    }
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
  private boundFromDocument(doc: Document, before: boolean): Bound {
    const components: api.Value[] = [];

    // Because people expect to continue/end a query at the exact document
    // provided, we need to use the implicit sort order rather than the explicit
    // sort order, because it's guaranteed to contain the document key. That way
    // the position becomes unambiguous and the query continues/ends exactly at
    // the provided document. Without the key (by using the explicit sort
    // orders), multiple documents could match the position, yielding duplicate
    // results.
    for (const orderBy of this._query.orderBy) {
      if (orderBy.field.isKeyField()) {
        components.push(refValue(this.firestore._databaseId, doc.key));
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
  private boundFromFields(
    methodName: string,
    values: unknown[],
    before: boolean
  ): Bound {
    // Use explicit order by's because it has to match the query the user made
    const orderBy = this._query.explicitOrderBy;
    if (values.length > orderBy.length) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Too many arguments provided to ${methodName}(). ` +
          `The number of arguments must be less than or equal to the ` +
          `number of Query.orderBy() clauses`
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
        if (
          !this._query.isCollectionGroupQuery() &&
          rawValue.indexOf('/') !== -1
        ) {
          throw new FirestoreError(
            Code.INVALID_ARGUMENT,
            `Invalid query. When querying a collection and ordering by FieldPath.documentId(), ` +
              `the value passed to ${methodName}() must be a plain document ID, but ` +
              `'${rawValue}' contains a slash.`
          );
        }
        const path = this._query.path.child(ResourcePath.fromString(rawValue));
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
        components.push(refValue(this.firestore._databaseId, key));
      } else {
        const wrapped = this.firestore._dataReader.parseQueryValue(
          methodName,
          rawValue
        );
        components.push(wrapped);
      }
    }

    return new Bound(components, before);
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
    let options: firestore.SnapshotListenOptions = {};
    let observer: PartialObserver<firestore.QuerySnapshot<T>>;
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
      observer = args[currArg] as PartialObserver<firestore.QuerySnapshot<T>>;
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
      observer = {
        next: args[currArg] as NextFn<firestore.QuerySnapshot<T>>,
        error: args[currArg + 1] as ErrorFn,
        complete: args[currArg + 2] as CompleteFn
      };
    }
    this.validateHasExplicitOrderByForLimitToLast(this._query);
    return this.onSnapshotInternal(options, observer);
  }

  private onSnapshotInternal(
    options: ListenOptions,
    observer: PartialObserver<firestore.QuerySnapshot<T>>
  ): Unsubscribe {
    let errHandler = (err: Error): void => {
      console.error('Uncaught Error in onSnapshot:', err);
    };
    if (observer.error) {
      errHandler = observer.error.bind(observer);
    }

    const asyncObserver = new AsyncObserver<ViewSnapshot>({
      next: (result: ViewSnapshot): void => {
        if (observer.next) {
          observer.next(
            new QuerySnapshot(
              this.firestore,
              this._query,
              result,
              this._converter
            )
          );
        }
      },
      error: errHandler
    });

    const firestoreClient = this.firestore.ensureClientConfigured();
    const internalListener = firestoreClient.listen(
      this._query,
      asyncObserver,
      options
    );
    return (): void => {
      asyncObserver.mute();
      firestoreClient.unlisten(internalListener);
    };
  }

  private validateHasExplicitOrderByForLimitToLast(query: InternalQuery): void {
    if (query.hasLimitToLast() && query.explicitOrderBy.length === 0) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'limitToLast() queries require specifying at least one orderBy() clause'
      );
    }
  }

  get(options?: firestore.GetOptions): Promise<firestore.QuerySnapshot<T>> {
    validateBetweenNumberOfArgs('Query.get', arguments, 0, 1);
    validateGetOptions('Query.get', options);
    this.validateHasExplicitOrderByForLimitToLast(this._query);
    return new Promise(
      (resolve: Resolver<firestore.QuerySnapshot<T>>, reject: Rejecter) => {
        if (options && options.source === 'cache') {
          this.firestore
            .ensureClientConfigured()
            .getDocumentsFromLocalCache(this._query)
            .then((viewSnap: ViewSnapshot) => {
              resolve(
                new QuerySnapshot(
                  this.firestore,
                  this._query,
                  viewSnap,
                  this._converter
                )
              );
            }, reject);
        } else {
          this.getViaSnapshotListener(resolve, reject, options);
        }
      }
    );
  }

  private getViaSnapshotListener(
    resolve: Resolver<firestore.QuerySnapshot<T>>,
    reject: Rejecter,
    options?: firestore.GetOptions
  ): void {
    const unlisten = this.onSnapshotInternal(
      {
        includeMetadataChanges: true,
        waitForSyncWhenOnline: true
      },
      {
        next: (result: firestore.QuerySnapshot<T>) => {
          // Remove query first before passing event to user to avoid
          // user actions affecting the now stale query.
          unlisten();

          if (
            result.metadata.fromCache &&
            options &&
            options.source === 'server'
          ) {
            reject(
              new FirestoreError(
                Code.UNAVAILABLE,
                'Failed to get documents from server. (However, these ' +
                  'documents may exist in the local cache. Run again ' +
                  'without setting source to "server" to ' +
                  'retrieve the cached documents.)'
              )
            );
          } else {
            resolve(result);
          }
        },
        error: reject
      }
    );
  }

  /**
   * Parses the given documentIdValue into a ReferenceValue, throwing
   * appropriate errors if the value is anything other than a DocumentReference
   * or String, or if the string is malformed.
   */
  private parseDocumentIdValue(documentIdValue: unknown): api.Value {
    if (typeof documentIdValue === 'string') {
      if (documentIdValue === '') {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Invalid query. When querying with FieldPath.documentId(), you ' +
            'must provide a valid document ID, but it was an empty string.'
        );
      }
      if (
        !this._query.isCollectionGroupQuery() &&
        documentIdValue.indexOf('/') !== -1
      ) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. When querying a collection by ` +
            `FieldPath.documentId(), you must provide a plain document ID, but ` +
            `'${documentIdValue}' contains a '/' character.`
        );
      }
      const path = this._query.path.child(
        ResourcePath.fromString(documentIdValue)
      );
      if (!DocumentKey.isDocumentKey(path)) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. When querying a collection group by ` +
            `FieldPath.documentId(), the value provided must result in a valid document path, ` +
            `but '${path}' is not because it has an odd number of segments (${path.length}).`
        );
      }
      return refValue(this.firestore._databaseId, new DocumentKey(path));
    } else if (documentIdValue instanceof DocumentReference) {
      const ref = documentIdValue as DocumentReference<T>;
      return refValue(this.firestore._databaseId, ref._key);
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
   * Validates that the value passed into a disjunctrive filter satisfies all
   * array requirements.
   */
  private validateDisjunctiveFilterElements(
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

  private validateNewFilter(filter: Filter): void {
    if (filter instanceof FieldFilter) {
      const arrayOps = [Operator.ARRAY_CONTAINS, Operator.ARRAY_CONTAINS_ANY];
      const disjunctiveOps = [Operator.IN, Operator.ARRAY_CONTAINS_ANY];
      const isArrayOp = arrayOps.indexOf(filter.op) >= 0;
      const isDisjunctiveOp = disjunctiveOps.indexOf(filter.op) >= 0;

      if (filter.isInequality()) {
        const existingField = this._query.getInequalityFilterField();
        if (existingField !== null && !existingField.isEqual(filter.field)) {
          throw new FirestoreError(
            Code.INVALID_ARGUMENT,
            'Invalid query. All where filters with an inequality' +
              ' (<, <=, >, or >=) must be on the same field. But you have' +
              ` inequality filters on '${existingField.toString()}'` +
              ` and '${filter.field.toString()}'`
          );
        }

        const firstOrderByField = this._query.getFirstOrderByField();
        if (firstOrderByField !== null) {
          this.validateOrderByAndInequalityMatch(
            filter.field,
            firstOrderByField
          );
        }
      } else if (isDisjunctiveOp || isArrayOp) {
        // You can have at most 1 disjunctive filter and 1 array filter. Check if
        // the new filter conflicts with an existing one.
        let conflictingOp: Operator | null = null;
        if (isDisjunctiveOp) {
          conflictingOp = this._query.findFilterOperator(disjunctiveOps);
        }
        if (conflictingOp === null && isArrayOp) {
          conflictingOp = this._query.findFilterOperator(arrayOps);
        }
        if (conflictingOp != null) {
          // We special case when it's a duplicate op to give a slightly clearer error message.
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
    }
  }

  private validateNewOrderBy(orderBy: OrderBy): void {
    if (this._query.getFirstOrderByField() === null) {
      // This is the first order by. It must match any inequality.
      const inequalityField = this._query.getInequalityFilterField();
      if (inequalityField !== null) {
        this.validateOrderByAndInequalityMatch(inequalityField, orderBy.field);
      }
    }
  }

  private validateOrderByAndInequalityMatch(
    inequality: FieldPath,
    orderBy: FieldPath
  ): void {
    if (!orderBy.isEqual(inequality)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. You have a where filter with an inequality ` +
          `(<, <=, >, or >=) on field '${inequality.toString()}' ` +
          `and so you must also use '${inequality.toString()}' ` +
          `as your first Query.orderBy(), but your first Query.orderBy() ` +
          `is on field '${orderBy.toString()}' instead.`
      );
    }
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
    private readonly _converter?: firestore.FirestoreDataConverter<T>
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
      callback.call(thisArg, this.convertToDocumentImpl(doc));
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
      this._cachedChanges = changesFromSnapshot<T>(
        this._firestore,
        includeMetadataChanges,
        this._snapshot,
        this._converter
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
      this._originalQuery.isEqual(other._originalQuery) &&
      this._snapshot.isEqual(other._snapshot) &&
      this._converter === other._converter
    );
  }

  private convertToDocumentImpl(doc: Document): QueryDocumentSnapshot<T> {
    return new QueryDocumentSnapshot(
      this._firestore,
      doc.key,
      doc,
      this.metadata.fromCache,
      this._snapshot.mutatedKeys.has(doc.key),
      this._converter
    );
  }
}

export class CollectionReference<T = firestore.DocumentData> extends Query<T>
  implements firestore.CollectionReference<T> {
  constructor(
    readonly _path: ResourcePath,
    firestore: Firestore,
    _converter?: firestore.FirestoreDataConverter<T>
  ) {
    super(InternalQuery.atPath(_path), firestore, _converter);
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
        this.firestore
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
    if (pathString === '') {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Document path must be a non-empty string'
      );
    }
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
): DocumentReference<T> {
  if (!(documentRef instanceof DocumentReference)) {
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
 */
export function changesFromSnapshot<T>(
  firestore: Firestore,
  includeMetadataChanges: boolean,
  snapshot: ViewSnapshot,
  converter?: firestore.FirestoreDataConverter<T>
): Array<firestore.DocumentChange<T>> {
  if (snapshot.oldDocs.isEmpty()) {
    // Special case the first snapshot because index calculation is easy and
    // fast
    let lastDoc: Document;
    let index = 0;
    return snapshot.docChanges.map(change => {
      const doc = new QueryDocumentSnapshot<T>(
        firestore,
        change.doc.key,
        change.doc,
        snapshot.fromCache,
        snapshot.mutatedKeys.has(change.doc.key),
        converter
      );
      debugAssert(
        change.type === ChangeType.Added,
        'Invalid event type for first snapshot'
      );
      debugAssert(
        !lastDoc || snapshot.query.docComparator(lastDoc, change.doc) < 0,
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
        const doc = new QueryDocumentSnapshot<T>(
          firestore,
          change.doc.key,
          change.doc,
          snapshot.fromCache,
          snapshot.mutatedKeys.has(change.doc.key),
          converter
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
function applyFirestoreDataConverter<T>(
  converter: firestore.FirestoreDataConverter<T> | undefined,
  value: T,
  functionName: string
): [firestore.DocumentData, string] {
  let convertedValue;
  if (converter) {
    convertedValue = converter.toFirestore(value);
    functionName = 'toFirestore() in ' + functionName;
  } else {
    convertedValue = value as firestore.DocumentData;
  }
  return [convertedValue, functionName];
}

function contains(obj: object, key: string): obj is { key: unknown } {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
