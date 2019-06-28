/**
 * @license
 * Copyright 2017 Google Inc.
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

import { FirebaseApp } from '@firebase/app-types';
import { FirebaseService } from '@firebase/app-types/private';
import { DatabaseId, DatabaseInfo } from '../core/database_info';
import { ListenOptions } from '../core/event_manager';
import {
  FirestoreClient,
  IndexedDbPersistenceSettings,
  InternalPersistenceSettings,
  MemoryPersistenceSettings
} from '../core/firestore_client';
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
import { IndexedDbPersistence } from '../local/indexeddb_persistence';
import { LruParams } from '../local/lru_garbage_collector';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  ArrayValue,
  FieldValue,
  FieldValueOptions,
  ObjectValue,
  RefValue,
  ServerTimestampValue
} from '../model/field_value';
import { DeleteMutation, Mutation, Precondition } from '../model/mutation';
import { FieldPath, ResourcePath } from '../model/path';
import { PlatformSupport } from '../platform/platform';
import { makeConstructorPrivate } from '../util/api';
import { assert, fail } from '../util/assert';
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
  validateStringEnum,
  valueDescription
} from '../util/input_validation';
// eslint-disable-next-line import/no-duplicates
import * as log from '../util/log';
// eslint-disable-next-line import/no-duplicates
import { LogLevel } from '../util/log';
import { AutoId } from '../util/misc';
import * as objUtils from '../util/obj';
import { Rejecter, Resolver } from '../util/promise';
import { Deferred } from './../util/promise';
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
  UserDataConverter
} from './user_data_converter';

// settings() defaults:
const DEFAULT_HOST = 'firestore.googleapis.com';
const DEFAULT_SSL = true;
const DEFAULT_TIMESTAMPS_IN_SNAPSHOTS = true;
const DEFAULT_FORCE_LONG_POLLING = false;

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
      this.ssl = objUtils.defaulted(settings.ssl, DEFAULT_SSL);
    }
    validateOptionNames('settings', settings, [
      'host',
      'ssl',
      'credentials',
      'timestampsInSnapshots',
      'cacheSizeBytes',
      'experimentalForceLongPolling'
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

    // Nobody should set timestampsInSnapshots anymore, but the error depends on
    // whether they set it to true or false...
    if (settings.timestampsInSnapshots === true) {
      log.error(`
  The timestampsInSnapshots setting now defaults to true and you no
  longer need to explicitly set it. In a future release, the setting
  will be removed entirely and so it is recommended that you remove it
  from your firestore.settings() call now.`);
    } else if (settings.timestampsInSnapshots === false) {
      log.error(`
  The timestampsInSnapshots setting will soon be removed. YOU MUST UPDATE
  YOUR CODE.

  To hide this warning, stop using the timestampsInSnapshots setting in your
  firestore.settings({ ... }) call.

  Once you remove the setting, Timestamps stored in Cloud Firestore will be
  read back as Firebase Timestamp objects instead of as system Date objects.
  So you will also need to update code expecting a Date to instead expect a
  Timestamp. For example:

  // Old:
  const date = snapshot.get('created_at');
  // New:
  const timestamp = snapshot.get('created_at'); const date =
  timestamp.toDate();

  Please audit all existing usages of Date when you enable the new
  behavior.`);
    }
    this.timestampsInSnapshots = objUtils.defaulted(
      settings.timestampsInSnapshots,
      DEFAULT_TIMESTAMPS_IN_SNAPSHOTS
    );

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
          `cacheSizeBytes must be at least ${
            LruParams.MINIMUM_CACHE_SIZE_BYTES
          }`
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
      settings.experimentalForceLongPolling === undefined
        ? DEFAULT_FORCE_LONG_POLLING
        : settings.experimentalForceLongPolling;
  }

  isEqual(other: FirestoreSettings): boolean {
    return (
      this.host === other.host &&
      this.ssl === other.ssl &&
      this.timestampsInSnapshots === other.timestampsInSnapshots &&
      this.credentials === other.credentials &&
      this.cacheSizeBytes === other.cacheSizeBytes &&
      this.forceLongPolling === other.forceLongPolling
    );
  }
}

class FirestoreConfig {
  databaseId: DatabaseId;
  persistenceKey: string;
  credentials: CredentialsProvider;
  firebaseApp: FirebaseApp;
  settings: FirestoreSettings;
  persistence: boolean;
}

/**
 * The root reference to the database.
 */
export class Firestore implements firestore.FirebaseFirestore, FirebaseService {
  // The objects that are a part of this API are exposed to third-parties as
  // compiled javascript so we want to flag our private members with a leading
  // underscore to discourage their use.
  private readonly _config: FirestoreConfig;
  readonly _databaseId: DatabaseId;

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

  _dataConverter: UserDataConverter;

  constructor(databaseIdOrApp: FirestoreDatabase | FirebaseApp) {
    const config = new FirestoreConfig();
    if (typeof (databaseIdOrApp as FirebaseApp).options === 'object') {
      // This is very likely a Firebase app object
      // TODO(b/34177605): Can we somehow use instanceof?
      const app = databaseIdOrApp as FirebaseApp;
      config.firebaseApp = app;
      config.databaseId = Firestore.databaseIdFromApp(app);
      config.persistenceKey = config.firebaseApp.name;
      config.credentials = new FirebaseCredentialsProvider(app);
    } else {
      const external = databaseIdOrApp as FirestoreDatabase;
      if (!external.projectId) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Must provide projectId'
        );
      }

      config.databaseId = new DatabaseId(external.projectId, external.database);
      // Use a default persistenceKey that lines up with FirebaseApp.
      config.persistenceKey = '[DEFAULT]';
      config.credentials = new EmptyCredentialsProvider();
    }

    config.settings = new FirestoreSettings({});
    this._config = config;
    this._databaseId = config.databaseId;
  }

  settings(settingsLiteral: firestore.Settings): void {
    validateExactNumberOfArgs('Firestore.settings', arguments, 1);
    validateArgType('Firestore.settings', 'object', 1, settingsLiteral);

    if (
      objUtils.contains(settingsLiteral as objUtils.Dict<{}>, 'persistence')
    ) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        '"persistence" is now specified with a separate call to ' +
          'firestore.enablePersistence().'
      );
    }

    const newSettings = new FirestoreSettings(settingsLiteral);
    if (this._firestoreClient && !this._config.settings.isEqual(newSettings)) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and its settings can no longer ' +
          'be changed. You can only call settings() before calling any other ' +
          'methods on a Firestore object.'
      );
    }

    this._config.settings = newSettings;
    if (newSettings.credentials !== undefined) {
      this._config.credentials = makeCredentialsProvider(
        newSettings.credentials
      );
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
        log.error(
          "The 'experimentalTabSynchronization' setting has been renamed to " +
            "'synchronizeTabs'. In a future release, the setting will be removed " +
            'and it is recommended that you update your ' +
            "firestore.enablePersistence() call to use 'synchronizeTabs'."
        );
      }
      synchronizeTabs = objUtils.defaulted(
        settings.synchronizeTabs !== undefined
          ? settings.synchronizeTabs
          : settings.experimentalTabSynchronization,
        DEFAULT_SYNCHRONIZE_TABS
      );
    }

    return this.configureClient(
      new IndexedDbPersistenceSettings(
        this._config.settings.cacheSizeBytes,
        synchronizeTabs
      )
    );
  }

  clearPersistence(): Promise<void> {
    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      this.makeDatabaseInfo()
    );
    const deferred = new Deferred<void>();
    this._queue.enqueueAndForget(async () => {
      try {
        if (
          this._firestoreClient !== undefined &&
          !this._firestoreClient.clientShutdown
        ) {
          throw new FirestoreError(
            Code.FAILED_PRECONDITION,
            'Persistence cannot be cleared after this Firestore instance is initialized.'
          );
        }
        await IndexedDbPersistence.clearPersistence(persistenceKey);
        deferred.resolve();
      } catch (e) {
        deferred.reject(e);
      }
    });
    return deferred.promise;
  }

  ensureClientConfigured(): FirestoreClient {
    if (!this._firestoreClient) {
      // Kick off starting the client but don't actually wait for it.
      // tslint:disable-next-line:no-floating-promises
      this.configureClient(new MemoryPersistenceSettings());
    }
    return this._firestoreClient as FirestoreClient;
  }

  private makeDatabaseInfo(): DatabaseInfo {
    return new DatabaseInfo(
      this._config.databaseId,
      this._config.persistenceKey,
      this._config.settings.host,
      this._config.settings.ssl,
      this._config.settings.forceLongPolling
    );
  }

  private configureClient(
    persistenceSettings: InternalPersistenceSettings
  ): Promise<void> {
    assert(
      !!this._config.settings.host,
      'FirestoreSettings.host cannot be falsey'
    );

    assert(!this._firestoreClient, 'configureClient() called multiple times');

    const databaseInfo = this.makeDatabaseInfo();

    const preConverter = (value: unknown): unknown => {
      if (value instanceof DocumentReference) {
        const thisDb = this._config.databaseId;
        const otherDb = value.firestore._config.databaseId;
        if (!otherDb.isEqual(thisDb)) {
          throw new FirestoreError(
            Code.INVALID_ARGUMENT,
            'Document reference is for database ' +
              `${otherDb.projectId}/${otherDb.database} but should be ` +
              `for database ${thisDb.projectId}/${thisDb.database}`
          );
        }
        return new DocumentKeyReference(this._config.databaseId, value._key);
      } else {
        return value;
      }
    };
    this._dataConverter = new UserDataConverter(preConverter);

    this._firestoreClient = new FirestoreClient(
      PlatformSupport.getPlatform(),
      databaseInfo,
      this._config.credentials,
      this._queue
    );

    return this._firestoreClient.start(persistenceSettings);
  }

  private static databaseIdFromApp(app: FirebaseApp): DatabaseId {
    const options = app.options as objUtils.Dict<{}>;
    if (!objUtils.contains(options, 'projectId')) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        '"projectId" not provided in firebase.initializeApp.'
      );
    }

    const projectId = options['projectId'];
    if (!projectId || typeof projectId !== 'string') {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'projectId must be a string in FirebaseApp.options'
      );
    }
    return new DatabaseId(projectId);
  }

  get app(): FirebaseApp {
    if (!this._config.firebaseApp) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        "Firestore was not initialized using the Firebase SDK. 'app' is " +
          'not available'
      );
    }
    return this._config.firebaseApp;
  }

  INTERNAL = {
    delete: async (): Promise<void> => {
      // The client must be initalized to ensure that all subsequent API usage
      // throws an exception.
      this.ensureClientConfigured();
      await this._firestoreClient!.shutdown();
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
    switch (log.getLogLevel()) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.SILENT:
        return 'silent';
      default:
        return fail('Unknown log level: ' + log.getLogLevel());
    }
  }

  static setLogLevel(level: firestore.LogLevel): void {
    validateExactNumberOfArgs('Firestore.setLogLevel', arguments, 1);
    validateArgType('Firestore.setLogLevel', 'non-empty string', 1, level);
    switch (level) {
      case 'debug':
        log.setLogLevel(log.LogLevel.DEBUG);
        break;
      case 'error':
        log.setLogLevel(log.LogLevel.ERROR);
        break;
      case 'silent':
        log.setLogLevel(log.LogLevel.SILENT);
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
    return this._config.settings.timestampsInSnapshots;
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

  get(
    documentRef: firestore.DocumentReference
  ): Promise<firestore.DocumentSnapshot> {
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
          return new DocumentSnapshot(
            this._firestore,
            ref._key,
            null,
            /* fromCache= */ false,
            /* hasPendingWrites= */ false
          );
        } else if (doc instanceof Document) {
          return new DocumentSnapshot(
            this._firestore,
            ref._key,
            doc,
            /* fromCache= */ false,
            /* hasPendingWrites= */ false
          );
        } else {
          throw fail(
            `BatchGetDocumentsRequest returned unexpected document type: ${
              doc.constructor.name
            }`
          );
        }
      });
  }

  set(
    documentRef: firestore.DocumentReference,
    value: firestore.DocumentData,
    options?: firestore.SetOptions
  ): Transaction {
    validateBetweenNumberOfArgs('Transaction.set', arguments, 2, 3);
    const ref = validateReference(
      'Transaction.set',
      documentRef,
      this._firestore
    );
    options = validateSetOptions('Transaction.set', options);
    const parsed =
      options.merge || options.mergeFields
        ? this._firestore._dataConverter.parseMergeData(
            'Transaction.set',
            value,
            options.mergeFields
          )
        : this._firestore._dataConverter.parseSetData('Transaction.set', value);
    this._transaction.set(ref._key, parsed);
    return this;
  }

  update(
    documentRef: firestore.DocumentReference,
    value: firestore.UpdateData
  ): Transaction;
  update(
    documentRef: firestore.DocumentReference,
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): Transaction;
  update(
    documentRef: firestore.DocumentReference,
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
      parsed = this._firestore._dataConverter.parseUpdateVarargs(
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
      parsed = this._firestore._dataConverter.parseUpdateData(
        'Transaction.update',
        fieldOrUpdateData
      );
    }

    this._transaction.update(ref._key, parsed);
    return this;
  }

  delete(documentRef: firestore.DocumentReference): Transaction {
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

  set(
    documentRef: firestore.DocumentReference,
    value: firestore.DocumentData,
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
    const parsed =
      options.merge || options.mergeFields
        ? this._firestore._dataConverter.parseMergeData(
            'WriteBatch.set',
            value,
            options.mergeFields
          )
        : this._firestore._dataConverter.parseSetData('WriteBatch.set', value);
    this._mutations = this._mutations.concat(
      parsed.toMutations(ref._key, Precondition.NONE)
    );
    return this;
  }

  update(
    documentRef: firestore.DocumentReference,
    value: firestore.UpdateData
  ): WriteBatch;
  update(
    documentRef: firestore.DocumentReference,
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: firestore.DocumentReference,
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
      parsed = this._firestore._dataConverter.parseUpdateVarargs(
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
      parsed = this._firestore._dataConverter.parseUpdateData(
        'WriteBatch.update',
        fieldOrUpdateData
      );
    }

    this._mutations = this._mutations.concat(
      parsed.toMutations(ref._key, Precondition.exists(true))
    );
    return this;
  }

  delete(documentRef: firestore.DocumentReference): WriteBatch {
    validateExactNumberOfArgs('WriteBatch.delete', arguments, 1);
    this.verifyNotCommitted();
    const ref = validateReference(
      'WriteBatch.delete',
      documentRef,
      this._firestore
    );
    this._mutations = this._mutations.concat(
      new DeleteMutation(ref._key, Precondition.NONE)
    );
    return this;
  }

  async commit(): Promise<void> {
    this.verifyNotCommitted();
    this._committed = true;
    if (this._mutations.length > 0) {
      return this._firestore.ensureClientConfigured().write(this._mutations);
    }
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
export class DocumentReference implements firestore.DocumentReference {
  private _firestoreClient: FirestoreClient;

  constructor(public _key: DocumentKey, readonly firestore: Firestore) {
    this._firestoreClient = this.firestore.ensureClientConfigured();
  }

  static forPath(path: ResourcePath, firestore: Firestore): DocumentReference {
    if (path.length % 2 !== 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid document reference. Document ' +
          'references must have an even number of segments, but ' +
          `${path.canonicalString()} has ${path.length}`
      );
    }
    return new DocumentReference(new DocumentKey(path), firestore);
  }

  get id(): string {
    return this._key.path.lastSegment();
  }

  get parent(): firestore.CollectionReference {
    return new CollectionReference(this._key.path.popLast(), this.firestore);
  }

  get path(): string {
    return this._key.path.canonicalString();
  }

  collection(pathString: string): firestore.CollectionReference {
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

  isEqual(other: firestore.DocumentReference): boolean {
    if (!(other instanceof DocumentReference)) {
      throw invalidClassError('isEqual', 'DocumentReference', 1, other);
    }
    return this.firestore === other.firestore && this._key.isEqual(other._key);
  }

  set(
    value: firestore.DocumentData,
    options?: firestore.SetOptions
  ): Promise<void> {
    validateBetweenNumberOfArgs('DocumentReference.set', arguments, 1, 2);
    options = validateSetOptions('DocumentReference.set', options);

    const parsed =
      options.merge || options.mergeFields
        ? this.firestore._dataConverter.parseMergeData(
            'DocumentReference.set',
            value,
            options.mergeFields
          )
        : this.firestore._dataConverter.parseSetData(
            'DocumentReference.set',
            value
          );
    return this._firestoreClient.write(
      parsed.toMutations(this._key, Precondition.NONE)
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
      parsed = this.firestore._dataConverter.parseUpdateVarargs(
        'DocumentReference.update',
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      validateExactNumberOfArgs('DocumentReference.update', arguments, 1);
      parsed = this.firestore._dataConverter.parseUpdateData(
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
      new DeleteMutation(this._key, Precondition.NONE)
    ]);
  }

  onSnapshot(
    observer: PartialObserver<firestore.DocumentSnapshot>
  ): Unsubscribe;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
    observer: PartialObserver<firestore.DocumentSnapshot>
  ): Unsubscribe;
  onSnapshot(
    onNext: NextFn<firestore.DocumentSnapshot>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
    onNext: NextFn<firestore.DocumentSnapshot>,
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
    let observer: PartialObserver<firestore.DocumentSnapshot>;
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
      observer = args[currArg] as PartialObserver<firestore.DocumentSnapshot>;
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
        next: args[currArg] as NextFn<firestore.DocumentSnapshot>,
        error: args[currArg + 1] as ErrorFn,
        complete: args[currArg + 2] as CompleteFn
      };
    }
    return this.onSnapshotInternal(internalOptions, observer);
  }

  private onSnapshotInternal(
    options: ListenOptions,
    observer: PartialObserver<firestore.DocumentSnapshot>
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
          assert(
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
              snapshot.hasPendingWrites
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

  get(options?: firestore.GetOptions): Promise<firestore.DocumentSnapshot> {
    validateBetweenNumberOfArgs('DocumentReference.get', arguments, 0, 1);
    validateGetOptions('DocumentReference.get', options);
    return new Promise(
      (resolve: Resolver<firestore.DocumentSnapshot>, reject: Rejecter) => {
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
                  doc instanceof Document ? doc.hasLocalMutations : false
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
    resolve: Resolver<firestore.DocumentSnapshot>,
    reject: Rejecter,
    options?: firestore.GetOptions
  ): void {
    const unlisten = this.onSnapshotInternal(
      {
        includeMetadataChanges: true,
        waitForSyncWhenOnline: true
      },
      {
        next: (snap: firestore.DocumentSnapshot) => {
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

export class DocumentSnapshot implements firestore.DocumentSnapshot {
  constructor(
    private _firestore: Firestore,
    private _key: DocumentKey,
    public _document: Document | null,
    private _fromCache: boolean,
    private _hasPendingWrites: boolean
  ) {}

  data(
    options?: firestore.SnapshotOptions
  ): firestore.DocumentData | undefined {
    validateBetweenNumberOfArgs('DocumentSnapshot.data', arguments, 0, 1);
    options = validateSnapshotOptions('DocumentSnapshot.data', options);
    return !this._document
      ? undefined
      : this.convertObject(
          this._document.data,
          FieldValueOptions.fromSnapshotOptions(
            options,
            this._firestore._areTimestampsInSnapshotsEnabled()
          )
        );
  }

  get(
    fieldPath: string | ExternalFieldPath,
    options?: firestore.SnapshotOptions
  ): unknown {
    validateBetweenNumberOfArgs('DocumentSnapshot.get', arguments, 1, 2);
    options = validateSnapshotOptions('DocumentSnapshot.get', options);
    if (this._document) {
      const value = this._document.data.field(
        fieldPathFromArgument('DocumentSnapshot.get', fieldPath)
      );
      if (value !== null) {
        return this.convertValue(
          value,
          FieldValueOptions.fromSnapshotOptions(
            options,
            this._firestore._areTimestampsInSnapshotsEnabled()
          )
        );
      }
    }
    return undefined;
  }

  get id(): string {
    return this._key.path.lastSegment();
  }

  get ref(): firestore.DocumentReference {
    return new DocumentReference(this._key, this._firestore);
  }

  get exists(): boolean {
    return this._document !== null;
  }

  get metadata(): firestore.SnapshotMetadata {
    return new SnapshotMetadata(this._hasPendingWrites, this._fromCache);
  }

  isEqual(other: firestore.DocumentSnapshot): boolean {
    if (!(other instanceof DocumentSnapshot)) {
      throw invalidClassError('isEqual', 'DocumentSnapshot', 1, other);
    }
    return (
      this._firestore === other._firestore &&
      this._fromCache === other._fromCache &&
      this._key.isEqual(other._key) &&
      (this._document === null
        ? other._document === null
        : this._document.isEqual(other._document))
    );
  }

  private convertObject(
    data: ObjectValue,
    options: FieldValueOptions
  ): firestore.DocumentData {
    const result: firestore.DocumentData = {};
    data.forEach((key, value) => {
      result[key] = this.convertValue(value, options);
    });
    return result;
  }

  private convertValue(value: FieldValue, options: FieldValueOptions): unknown {
    if (value instanceof ObjectValue) {
      return this.convertObject(value, options);
    } else if (value instanceof ArrayValue) {
      return this.convertArray(value, options);
    } else if (value instanceof RefValue) {
      const key = value.value(options);
      const database = this._firestore.ensureClientConfigured().databaseId();
      if (!value.databaseId.isEqual(database)) {
        // TODO(b/64130202): Somehow support foreign references.
        log.error(
          `Document ${this._key.path} contains a document ` +
            `reference within a different database (` +
            `${value.databaseId.projectId}/${
              value.databaseId.database
            }) which is not ` +
            `supported. It will be treated as a reference in the current ` +
            `database (${database.projectId}/${database.database}) ` +
            `instead.`
        );
      }
      return new DocumentReference(key, this._firestore);
    } else {
      return value.value(options);
    }
  }

  private convertArray(
    data: ArrayValue,
    options: FieldValueOptions
  ): unknown[] {
    return data.internalValue.map(value => {
      return this.convertValue(value, options);
    });
  }
}

export class QueryDocumentSnapshot extends DocumentSnapshot
  implements firestore.QueryDocumentSnapshot {
  data(options?: SnapshotOptions): firestore.DocumentData {
    const data = super.data(options);
    assert(
      typeof data === 'object',
      'Document in a QueryDocumentSnapshot should exist'
    );
    return data as firestore.DocumentData;
  }
}

export class Query implements firestore.Query {
  constructor(public _query: InternalQuery, readonly firestore: Firestore) {}

  where(
    field: string | ExternalFieldPath,
    opStr: firestore.WhereFilterOp,
    value: unknown
  ): firestore.Query {
    validateExactNumberOfArgs('Query.where', arguments, 3);
    validateDefined('Query.where', 3, value);

    // TODO(in-queries): Add 'in' and 'array-contains-any' to validation.
    if (
      (opStr as unknown) !== 'in' &&
      (opStr as unknown) !== 'array-contains-any'
    ) {
      // Enumerated from the WhereFilterOp type in index.d.ts.
      const whereFilterOpEnums = ['<', '<=', '==', '>=', '>', 'array-contains'];
      validateStringEnum('Query.where', whereFilterOpEnums, 2, opStr);
    }

    let fieldValue: FieldValue;
    const fieldPath = fieldPathFromArgument('Query.where', field);
    const operator = Operator.fromString(opStr);
    if (fieldPath.isKeyField()) {
      if (
        operator === Operator.ARRAY_CONTAINS ||
        operator === Operator.ARRAY_CONTAINS_ANY
      ) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid Query. You can't perform '${operator.toString()}' ` +
            'queries on FieldPath.documentId().'
        );
      } else if (operator === Operator.IN) {
        this.validateDisjunctiveFilterElements(value, operator);
        const referenceList: FieldValue[] = [];
        for (const arrayValue of value as FieldValue[]) {
          referenceList.push(this.parseDocumentIdValue(arrayValue));
        }
        fieldValue = new ArrayValue(referenceList);
      } else {
        fieldValue = this.parseDocumentIdValue(value);
      }
    } else {
      if (
        operator === Operator.IN ||
        operator === Operator.ARRAY_CONTAINS_ANY
      ) {
        this.validateDisjunctiveFilterElements(value, operator);
      }
      fieldValue = this.firestore._dataConverter.parseQueryValue(
        'Query.where',
        value
      );
    }
    const filter = FieldFilter.create(fieldPath, operator, fieldValue);
    this.validateNewFilter(filter);
    return new Query(this._query.addFilter(filter), this.firestore);
  }

  orderBy(
    field: string | ExternalFieldPath,
    directionStr?: firestore.OrderByDirection
  ): firestore.Query {
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
    return new Query(this._query.addOrderBy(orderBy), this.firestore);
  }

  limit(n: number): firestore.Query {
    validateExactNumberOfArgs('Query.limit', arguments, 1);
    validateArgType('Query.limit', 'number', 1, n);
    if (n <= 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid Query. Query limit (${n}) is invalid. Limit must be ` +
          'positive.'
      );
    }
    return new Query(this._query.withLimit(n), this.firestore);
  }

  startAt(
    docOrField: unknown | firestore.DocumentSnapshot,
    ...fields: unknown[]
  ): firestore.Query {
    validateAtLeastNumberOfArgs('Query.startAt', arguments, 1);
    const bound = this.boundFromDocOrFields(
      'Query.startAt',
      docOrField,
      fields,
      /*before=*/ true
    );
    return new Query(this._query.withStartAt(bound), this.firestore);
  }

  startAfter(
    docOrField: unknown | firestore.DocumentSnapshot,
    ...fields: unknown[]
  ): firestore.Query {
    validateAtLeastNumberOfArgs('Query.startAfter', arguments, 1);
    const bound = this.boundFromDocOrFields(
      'Query.startAfter',
      docOrField,
      fields,
      /*before=*/ false
    );
    return new Query(this._query.withStartAt(bound), this.firestore);
  }

  endBefore(
    docOrField: unknown | firestore.DocumentSnapshot,
    ...fields: unknown[]
  ): firestore.Query {
    validateAtLeastNumberOfArgs('Query.endBefore', arguments, 1);
    const bound = this.boundFromDocOrFields(
      'Query.endBefore',
      docOrField,
      fields,
      /*before=*/ true
    );
    return new Query(this._query.withEndAt(bound), this.firestore);
  }

  endAt(
    docOrField: unknown | firestore.DocumentSnapshot,
    ...fields: unknown[]
  ): firestore.Query {
    validateAtLeastNumberOfArgs('Query.endAt', arguments, 1);
    const bound = this.boundFromDocOrFields(
      'Query.endAt',
      docOrField,
      fields,
      /*before=*/ false
    );
    return new Query(this._query.withEndAt(bound), this.firestore);
  }

  isEqual(other: firestore.Query): boolean {
    if (!(other instanceof Query)) {
      throw invalidClassError('isEqual', 'Query', 1, other);
    }
    return (
      this.firestore === other.firestore && this._query.isEqual(other._query)
    );
  }

  /** Helper function to create a bound from a document or fields */
  private boundFromDocOrFields(
    methodName: string,
    docOrField: unknown | firestore.DocumentSnapshot,
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
      return this.boundFromDocument(methodName, snap._document!, before);
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
  private boundFromDocument(
    methodName: string,
    doc: Document,
    before: boolean
  ): Bound {
    const components: FieldValue[] = [];

    // Because people expect to continue/end a query at the exact document
    // provided, we need to use the implicit sort order rather than the explicit
    // sort order, because it's guaranteed to contain the document key. That way
    // the position becomes unambiguous and the query continues/ends exactly at
    // the provided document. Without the key (by using the explicit sort
    // orders), multiple documents could match the position, yielding duplicate
    // results.
    for (const orderBy of this._query.orderBy) {
      if (orderBy.field.isKeyField()) {
        components.push(new RefValue(this.firestore._databaseId, doc.key));
      } else {
        const value = doc.field(orderBy.field);
        if (value instanceof ServerTimestampValue) {
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

    const components: FieldValue[] = [];
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
        components.push(new RefValue(this.firestore._databaseId, key));
      } else {
        const wrapped = this.firestore._dataConverter.parseQueryValue(
          methodName,
          rawValue
        );
        components.push(wrapped);
      }
    }

    return new Bound(components, before);
  }

  onSnapshot(observer: PartialObserver<firestore.QuerySnapshot>): Unsubscribe;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
    observer: PartialObserver<firestore.QuerySnapshot>
  ): Unsubscribe;
  onSnapshot(
    onNext: NextFn<firestore.QuerySnapshot>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;
  onSnapshot(
    options: firestore.SnapshotListenOptions,
    onNext: NextFn<firestore.QuerySnapshot>,
    onError?: ErrorFn,
    onCompletion?: CompleteFn
  ): Unsubscribe;

  onSnapshot(...args: unknown[]): Unsubscribe {
    validateBetweenNumberOfArgs('Query.onSnapshot', arguments, 1, 4);
    let options: firestore.SnapshotListenOptions = {};
    let observer: PartialObserver<firestore.QuerySnapshot>;
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
      observer = args[currArg] as PartialObserver<firestore.QuerySnapshot>;
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
        next: args[currArg] as NextFn<firestore.QuerySnapshot>,
        error: args[currArg + 1] as ErrorFn,
        complete: args[currArg + 2] as CompleteFn
      };
    }
    return this.onSnapshotInternal(options, observer);
  }

  private onSnapshotInternal(
    options: ListenOptions,
    observer: PartialObserver<firestore.QuerySnapshot>
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
          observer.next(new QuerySnapshot(this.firestore, this._query, result));
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

  get(options?: firestore.GetOptions): Promise<firestore.QuerySnapshot> {
    validateBetweenNumberOfArgs('Query.get', arguments, 0, 1);
    validateGetOptions('Query.get', options);
    return new Promise(
      (resolve: Resolver<firestore.QuerySnapshot>, reject: Rejecter) => {
        if (options && options.source === 'cache') {
          this.firestore
            .ensureClientConfigured()
            .getDocumentsFromLocalCache(this._query)
            .then((viewSnap: ViewSnapshot) => {
              resolve(new QuerySnapshot(this.firestore, this._query, viewSnap));
            }, reject);
        } else {
          this.getViaSnapshotListener(resolve, reject, options);
        }
      }
    );
  }

  private getViaSnapshotListener(
    resolve: Resolver<firestore.QuerySnapshot>,
    reject: Rejecter,
    options?: firestore.GetOptions
  ): void {
    const unlisten = this.onSnapshotInternal(
      {
        includeMetadataChanges: true,
        waitForSyncWhenOnline: true
      },
      {
        next: (result: firestore.QuerySnapshot) => {
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
  private parseDocumentIdValue(documentIdValue: unknown): RefValue {
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
            `but '${path}' is not because it has an odd number of segments (${
              path.length
            }).`
        );
      }
      return new RefValue(this.firestore._databaseId, new DocumentKey(path));
    } else if (documentIdValue instanceof DocumentReference) {
      const ref = documentIdValue as DocumentReference;
      return new RefValue(this.firestore._databaseId, ref._key);
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

export class QuerySnapshot implements firestore.QuerySnapshot {
  private _cachedChanges: firestore.DocumentChange[] | null = null;
  private _cachedChangesIncludeMetadataChanges: boolean | null = null;

  readonly metadata: firestore.SnapshotMetadata;

  constructor(
    private _firestore: Firestore,
    private _originalQuery: InternalQuery,
    private _snapshot: ViewSnapshot
  ) {
    this.metadata = new SnapshotMetadata(
      _snapshot.hasPendingWrites,
      _snapshot.fromCache
    );
  }

  get docs(): firestore.QueryDocumentSnapshot[] {
    const result: firestore.QueryDocumentSnapshot[] = [];
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
    callback: (result: firestore.QueryDocumentSnapshot) => void,
    thisArg?: unknown
  ): void {
    validateBetweenNumberOfArgs('QuerySnapshot.forEach', arguments, 1, 2);
    validateArgType('QuerySnapshot.forEach', 'function', 1, callback);
    this._snapshot.docs.forEach(doc => {
      callback.call(thisArg, this.convertToDocumentImpl(doc));
    });
  }

  get query(): firestore.Query {
    return new Query(this._originalQuery, this._firestore);
  }

  docChanges(
    options?: firestore.SnapshotListenOptions
  ): firestore.DocumentChange[] {
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
      this._cachedChanges = changesFromSnapshot(
        this._firestore,
        includeMetadataChanges,
        this._snapshot
      );
      this._cachedChangesIncludeMetadataChanges = includeMetadataChanges;
    }

    return this._cachedChanges;
  }

  /** Check the equality. The call can be very expensive. */
  isEqual(other: firestore.QuerySnapshot): boolean {
    if (!(other instanceof QuerySnapshot)) {
      throw invalidClassError('isEqual', 'QuerySnapshot', 1, other);
    }

    return (
      this._firestore === other._firestore &&
      this._originalQuery.isEqual(other._originalQuery) &&
      this._snapshot.isEqual(other._snapshot)
    );
  }

  private convertToDocumentImpl(doc: Document): QueryDocumentSnapshot {
    return new QueryDocumentSnapshot(
      this._firestore,
      doc.key,
      doc,
      this.metadata.fromCache,
      this._snapshot.mutatedKeys.has(doc.key)
    );
  }
}

// TODO(2018/11/01): As of 2018/04/17 we're changing docChanges from an array
// into a method. Because this is a runtime breaking change and somewhat subtle
// (both Array and Function have a .length, etc.), we'll replace commonly-used
// properties (including Symbol.iterator) to throw a custom error message. In
// ~6 months we can delete the custom error as most folks will have hopefully
// migrated.
function throwDocChangesMethodError(): never {
  throw new FirestoreError(
    Code.INVALID_ARGUMENT,
    'QuerySnapshot.docChanges has been changed from a property into a ' +
      'method, so usages like "querySnapshot.docChanges" should become ' +
      '"querySnapshot.docChanges()"'
  );
}

const docChangesPropertiesToOverride = [
  'length',
  'forEach',
  'map',
  ...(typeof Symbol !== 'undefined' ? [Symbol.iterator] : [])
];
docChangesPropertiesToOverride.forEach(property => {
  /**
   * We are (re-)defining properties on QuerySnapshot.prototype.docChanges which
   * is a Function. This could fail, in particular in the case of 'length' which
   * already exists on Function.prototype and on IE11 is improperly defined with
   * `{ configurable: false }`. So we wrap this in a try/catch to ensure that we
   * still have a functional SDK.
   */
  try {
    Object.defineProperty(QuerySnapshot.prototype.docChanges, property, {
      get: () => throwDocChangesMethodError()
    });
  } catch (err) {} // Ignore this failure intentionally
});

export class CollectionReference extends Query
  implements firestore.CollectionReference {
  constructor(path: ResourcePath, firestore: Firestore) {
    super(InternalQuery.atPath(path), firestore);
    if (path.length % 2 !== 1) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid collection reference. Collection ' +
          'references must have an odd number of segments, but ' +
          `${path.canonicalString()} has ${path.length}`
      );
    }
  }

  get id(): string {
    return this._query.path.lastSegment();
  }

  get parent(): firestore.DocumentReference | null {
    const parentPath = this._query.path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference(new DocumentKey(parentPath), this.firestore);
    }
  }

  get path(): string {
    return this._query.path.canonicalString();
  }

  doc(pathString?: string): firestore.DocumentReference {
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
    return DocumentReference.forPath(
      this._query.path.child(path),
      this.firestore
    );
  }

  add(value: firestore.DocumentData): Promise<firestore.DocumentReference> {
    validateExactNumberOfArgs('CollectionReference.add', arguments, 1);
    validateArgType('CollectionReference.add', 'object', 1, value);
    const docRef = this.doc();
    return docRef.set(value).then(() => docRef);
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

function validateReference(
  methodName: string,
  documentRef: firestore.DocumentReference,
  firestore: Firestore
): DocumentReference {
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
export function changesFromSnapshot(
  firestore: Firestore,
  includeMetadataChanges: boolean,
  snapshot: ViewSnapshot
): firestore.DocumentChange[] {
  if (snapshot.oldDocs.isEmpty()) {
    // Special case the first snapshot because index calculation is easy and
    // fast
    let lastDoc: Document;
    let index = 0;
    return snapshot.docChanges.map(change => {
      const doc = new QueryDocumentSnapshot(
        firestore,
        change.doc.key,
        change.doc,
        snapshot.fromCache,
        snapshot.mutatedKeys.has(change.doc.key)
      );
      assert(
        change.type === ChangeType.Added,
        'Invalid event type for first snapshot'
      );
      assert(
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
        const doc = new QueryDocumentSnapshot(
          firestore,
          change.doc.key,
          change.doc,
          snapshot.fromCache,
          snapshot.mutatedKeys.has(change.doc.key)
        );
        let oldIndex = -1;
        let newIndex = -1;
        if (change.type !== ChangeType.Added) {
          oldIndex = indexTracker.indexOf(change.doc.key);
          assert(oldIndex >= 0, 'Index for document not found');
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

// Export the classes with a private constructor (it will fail if invoked
// at runtime). Note that this still allows instanceof checks.

// We're treating the variables as class names, so disable checking for lower
// case variable names.
export const PublicFirestore = makeConstructorPrivate(
  Firestore,
  'Use firebase.firestore() instead.'
);
export const PublicTransaction = makeConstructorPrivate(
  Transaction,
  'Use firebase.firestore().runTransaction() instead.'
);
export const PublicWriteBatch = makeConstructorPrivate(
  WriteBatch,
  'Use firebase.firestore().batch() instead.'
);
export const PublicDocumentReference = makeConstructorPrivate(
  DocumentReference,
  'Use firebase.firestore().doc() instead.'
);
export const PublicDocumentSnapshot = makeConstructorPrivate(DocumentSnapshot);
export const PublicQueryDocumentSnapshot = makeConstructorPrivate(
  QueryDocumentSnapshot
);
export const PublicQuery = makeConstructorPrivate(Query);
export const PublicQuerySnapshot = makeConstructorPrivate(QuerySnapshot);
export const PublicCollectionReference = makeConstructorPrivate(
  CollectionReference,
  'Use firebase.firestore().collection() instead.'
);
