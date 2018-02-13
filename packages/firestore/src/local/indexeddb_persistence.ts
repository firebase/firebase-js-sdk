/**
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

import { User } from '../auth/user';
import { DatabaseInfo } from '../core/database_info';
import { JsonProtoSerializer } from '../remote/serializer';
import { assert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import * as log from '../util/log';
import { AutoId } from '../util/misc';

import { IndexedDbMutationQueue } from './indexeddb_mutation_queue';
import { IndexedDbQueryCache } from './indexeddb_query_cache';
import { IndexedDbRemoteDocumentCache } from './indexeddb_remote_document_cache';
import {
  ALL_STORES,
  createOrUpgradeDb,
  DbClientMetadataKey,
  DbClientMetadata,
  DbOwner,
  DbOwnerKey,
  SCHEMA_VERSION
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { MutationQueue } from './mutation_queue';
import {
  Persistence,
  PersistenceTransaction,
  PrimaryStateListener
} from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryCache } from './query_cache';
import { RemoteDocumentCache } from './remote_document_cache';
import { SimpleDb, SimpleDbStore, SimpleDbTransaction } from './simple_db';
import { Platform } from '../platform/platform';

const LOG_TAG = 'IndexedDbPersistence';

/**
 * Oldest acceptable age in milliseconds for client states read from IndexedDB.
 * Client state and primary leases that are older than 5 seconds are ignored.
 */
const CLIENT_STATE_MAX_AGE_MS = 5000;

/** Refresh interval for the client state. Currently set to four seconds. */
const CLIENT_STATE_REFRESH_INTERVAL_MS = 4000;

/** LocalStorage location to indicate a zombied primary key (see class comment). */
const ZOMBIE_PRIMARY_LOCALSTORAGE_SUFFIX = 'zombiedOwnerId';
/** Error when the primary lease is required but not available. */
const PRIMARY_LEASE_LOST_ERROR_MSG =
  'The current tab is not the required state to perform the current ' +
  'operation. It might be necessary to refresh the browser tab.';
const UNSUPPORTED_PLATFORM_ERROR_MSG =
  'This platform is either missing' +
  ' IndexedDB or is known to have an incomplete implementation. Offline' +
  ' persistence has been disabled.';

/**
 * An IndexedDB-backed instance of Persistence. Data is stored persistently
 * across sessions.
 *
 * Currently the Firestore SDK only supports a single consumer of the database,
 * but browsers obviously support multiple tabs. IndexedDbPersistence ensures a
 * single consumer of the database via an "owner lease" stored in the database.
 *
 * On startup, IndexedDbPersistence assigns itself a random "ownerId" and writes
 * it to a special "owner" object in the database (if no entry exists already or
 * the current entry is expired). This owner lease is then verified inside every
 * transaction to ensure the lease has not been lost.
 *
 * If a tab opts not to acquire the owner lease (because there's an existing
 * non-expired owner) or loses the owner lease, IndexedDbPersistence enters a
 * failed state and all subsequent operations will automatically fail.
 *
 * The current owner regularly refreshes the owner lease with new timestamps to
 * prevent newly-opened tabs from taking over ownership.
 *
 * Additionally there is an optimization so that when a tab is closed, the owner
 * lease is released immediately (this is especially important to make sure that
 * a refreshed tab is able to immediately re-acquire the owner lease).
 * Unfortunately, IndexedDB cannot be reliably used in window.unload since it is
 * an asynchronous API. So in addition to attempting to give up the lease,
 * the owner writes its ownerId to a "zombiedOwnerId" entry in LocalStorage
 * which acts as an indicator that another tab should go ahead and take the
 * owner lease immediately regardless of the current lease timestamp.
 */
export class IndexedDbPersistence implements Persistence {
  private static EMPTY_PRIMARY_STATE_LISTENER: PrimaryStateListener = {
    applyPrimaryState: () => {}
  };

  /**
   * The name of the main (and currently only) IndexedDB database. this name is
   * appended to the prefix provided to the IndexedDbPersistence constructor.
   */
  static MAIN_DATABASE = 'main';

  private readonly document: Document;
  private readonly window: Window;

  private simpleDb: SimpleDb;
  private started: boolean;
  private isPrimary = false;
  private dbName: string;
  private localStoragePrefix: string;
  private clientKey: string = this.generateClientKey();

  /**
   * Set to an Error object if we encounter an unrecoverable error. All further
   * transactions will be failed with this error.
   */
  private persistenceError: Error | null;
  /** The setInterval() handle tied to refreshing the owner lease. */
  // tslint:disable-next-line:no-any setTimeout() type differs on browser / node
  private clientStateRefreshHandler: any;
  /** Our window.unload handler, if registered. */
  private windowUnloadHandler: (() => void) | null;
  private inForeground = false;

  private serializer: LocalSerializer;

  /** Our 'visibilitychange` listener if registered. */
  private documentVisibilityHandler: ((e?: Event) => void) | null;

  /** Callback for primary state notifications. */
  private primaryStateListener = IndexedDbPersistence.EMPTY_PRIMARY_STATE_LISTENER;

  constructor(
    prefix: string,
    platform: Platform,
    serializer: JsonProtoSerializer
  ) {
    this.dbName = prefix + IndexedDbPersistence.MAIN_DATABASE;
    this.serializer = new LocalSerializer(serializer);
    this.localStoragePrefix = prefix;
    this.document = platform.document;
    this.window = platform.window;
  }

  start(): Promise<void> {
    if (!IndexedDbPersistence.isAvailable()) {
      this.persistenceError = new FirestoreError(
        Code.UNIMPLEMENTED,
        UNSUPPORTED_PLATFORM_ERROR_MSG
      );
      return Promise.reject(this.persistenceError);
    }

    assert(!this.started, 'IndexedDbPersistence double-started!');
    this.started = true;

    assert(
      this.window !== null && this.document !== null,
      "Expected 'window' and 'document' to be defined"
    );

    this.documentVisibilityHandler = () => {
      const inForeground = this.document.visibilityState === 'visible';
      if (inForeground !== this.inForeground) {
        this.inForeground = inForeground;
        this.refreshClientState();
      }
    };

    return SimpleDb.openOrCreate(this.dbName, SCHEMA_VERSION, createOrUpgradeDb)
      .then(db => {
        this.simpleDb = db;
      })
      .then(() => {
        this.document.addEventListener(
          'visibilitychange',
          this.documentVisibilityHandler
        );
        this.inForeground = this.document.visibilityState === 'visible';
        this.refreshClientState();
        this.scheduleClientStateRefresh();
        this.attachWindowUnloadHook();
      });
  }

  setPrimaryStateListener(primaryStateListener: PrimaryStateListener) {
    this.primaryStateListener = primaryStateListener;
    primaryStateListener.applyPrimaryState(this.isPrimary);
  }

  tryBecomePrimary(): Promise<boolean> {
    return this.refreshClientState();
  }

  /**
   * Updates the state of the client in IndexedDb. This operation may acquire
   * the primary lease.
   *
   * @return Whether the client holds the primary lease.
   */
  private refreshClientState(): Promise<boolean> {
    return this.simpleDb
      .runTransaction(
        'readwrite',
        [DbOwner.store, DbClientMetadata.store],
        txn => {
          const metadataStore = clientMetadataStore(txn);
          metadataStore.put(
            new DbClientMetadata(this.clientKey, Date.now(), this.inForeground)
          );
          return this.tryAcquirePrimaryLease(txn);
        }
      )
      .then(isPrimary => {
        if (isPrimary !== this.isPrimary) {
          this.isPrimary = isPrimary;
          this.primaryStateListener.applyPrimaryState(this.isPrimary);
        }
      })
      .then(() => this.isPrimary);
  }

  shutdown(): Promise<void> {
    if (!this.started) {
      return Promise.resolve();
    }
    this.started = false;
    this.detachWindowUnloadHook();
    this.stopClientStateRefreshes();
    return this.releasePrimaryLease().then(() => {
      this.simpleDb.close();
    });
  }

  getMutationQueue(user: User): MutationQueue {
    return IndexedDbMutationQueue.forUser(user, this.serializer);
  }

  getQueryCache(): QueryCache {
    return new IndexedDbQueryCache(this.serializer);
  }

  getRemoteDocumentCache(): RemoteDocumentCache {
    return new IndexedDbRemoteDocumentCache(this.serializer);
  }

  runTransaction<T>(
    action: string,
    requireOwnerLease: boolean,
    transactionOperation: (
      transaction: PersistenceTransaction
    ) => PersistencePromise<T>
  ): Promise<T> {
    if (this.persistenceError) {
      return Promise.reject(this.persistenceError);
    }

    log.debug(LOG_TAG, 'Starting transaction:', action);

    // Do all transactions as readwrite against all object stores, since we
    // are the only reader/writer.
    return this.simpleDb.runTransaction('readwrite', ALL_STORES, txn => {
      if (requireOwnerLease) {
        return this.ensurePrimaryLease(txn).next(() =>
          transactionOperation(txn)
        );
      } else {
        return transactionOperation(txn);
      }
    });
  }

  static isAvailable(): boolean {
    return SimpleDb.isAvailable();
  }

  /**
   * Generates a string used as a prefix when storing data in IndexedDB and
   * LocalStorage.
   */
  static buildStoragePrefix(databaseInfo: DatabaseInfo): string {
    // Use two different prefix formats:
    //
    //   * firestore / persistenceKey / projectID . databaseID / ...
    //   * firestore / persistenceKey / projectID / ...
    //
    // projectIDs are DNS-compatible names and cannot contain dots
    // so there's no danger of collisions.
    let database = databaseInfo.databaseId.projectId;
    if (!databaseInfo.databaseId.isDefaultDatabase) {
      database += '.' + databaseInfo.databaseId.database;
    }

    return 'firestore/' + databaseInfo.persistenceKey + '/' + database + '/';
  }

  /**
   * Tries to acquire and extend the primary lease. Returns whether the client
   * holds the primary lease.
   */
  private tryAcquirePrimaryLease(
    txn: SimpleDbTransaction
  ): PersistencePromise<boolean> {
    const ownerStore = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
    return ownerStore.get('owner').next(dbOwner => {
      const currentOwner = this.extractCurrentOwner(dbOwner);
      if (currentOwner === null) {
        return this.canBecomePrimary(txn).next(canBecomePrimary => {
          if (canBecomePrimary) {
            const newDbOwner = new DbOwner(this.clientKey, Date.now());
            log.debug(
              LOG_TAG,
              'No valid primary. Acquiring primary lease. Current primary client:',
              dbOwner,
              'New owner:',
              newDbOwner
            );
            return ownerStore.put('owner', newDbOwner).next(() => true);
          } else {
            return PersistencePromise.resolve(false);
          }
        });
      } else if (currentOwner === this.clientKey) {
        // Refresh the primary lease
        const newDbOwner = new DbOwner(this.clientKey, Date.now());
        return ownerStore.put('owner', newDbOwner).next(() => true);
      } else {
        return PersistencePromise.resolve(false);
      }
    });
  }

  /**
   * Checks if this client is eligible for a primary lease based on its
   * visibility state and the visibility state of all active instances. A
   * client can obtain the primary lease if it is either in the foreground
   * or if it and all other clients are in the background.
   */
  private canBecomePrimary(
    txn: SimpleDbTransaction
  ): PersistencePromise<boolean> {
    if (this.inForeground) {
      return PersistencePromise.resolve(true);
    }

    let canBecomePrimary = true;

    return clientMetadataStore(txn)
      .iterate((key, value, control) => {
        if (this.clientKey !== value.clientKey) {
          if (
            this.isRecentlyUpdated(value.updateTimeMs) &&
            value.inForeground
          ) {
            canBecomePrimary = false;
            control.done();
          }
        }
      })
      .next(() => canBecomePrimary);
  }

  /** Checks the primary lease and removes it if we are the current primary. */
  private releasePrimaryLease(): Promise<void> {
    // NOTE: Don't use this.runTransaction, since it acquires a lock on all
    // object stores.
    return this.simpleDb.runTransaction('readwrite', [DbOwner.store], txn => {
      const store = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
      return store.get('owner').next(dbOwner => {
        if (dbOwner !== null && dbOwner.ownerId === this.clientKey) {
          log.debug(LOG_TAG, 'Releasing owner lease.');
          this.primaryStateListener.applyPrimaryState(false);
          return store.delete('owner');
        } else {
          return PersistencePromise.resolve();
        }
      });
    });
  }

  /**
   * Checks the owner lease and returns a rejected promise if we are not the
   * current owner. This should be included in every transaction to guard
   * against losing the owner lease.
   */
  private ensurePrimaryLease(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    return this.tryAcquirePrimaryLease(txn).next(owner => {
      if (!owner) {
        this.persistenceError = new FirestoreError(
          Code.FAILED_PRECONDITION,
          PRIMARY_LEASE_LOST_ERROR_MSG
        );
        return PersistencePromise.reject<void>(this.persistenceError);
      } else {
        return PersistencePromise.resolve();
      }
    });
  }

  /** Verifies that that `updateTimeMs` is within CLIENT_STATE_MAX_AGE_MS. */
  private isRecentlyUpdated(updateTimeMs: number): boolean {
    const now = Date.now();
    const minAcceptable = now - CLIENT_STATE_MAX_AGE_MS;
    const maxAcceptable = now;
    if (updateTimeMs < minAcceptable) {
      return false;
    } else if (updateTimeMs > maxAcceptable) {
      log.error('Detected an update time that is in the future.');
      return false;
    }

    return true;
  }

  /**
   * Returns true if the provided owner exists, has a recent timestamp, and
   * isn't zombied.
   *
   * NOTE: To determine if the owner is zombied, this method reads from
   * LocalStorage which could be mildly expensive.
   */
  private extractCurrentOwner(dbOwner: DbOwner): string | null {
    if (dbOwner === null) {
      return null; // no owner.
    } else if (!this.isRecentlyUpdated(dbOwner.leaseTimestampMs)) {
      return null; // primary lease has expired.
    } else if (dbOwner.ownerId === this.getZombiedOwnerId()) {
      return null; // owner's tab closed.
    } else {
      return dbOwner.ownerId;
    }
  }

  /**
   * Schedules a recurring timer to update the owner lease timestamp to prevent
   * other tabs from taking the lease.
   */
  private scheduleClientStateRefresh(): void {
    // NOTE: This doesn't need to be scheduled on the async queue and doing so
    // would increase the chances of us not refreshing on time if the queue is
    // backed up for some reason.

    // TODO(mutlitab): To transition stale clients faster, we should synchronize
    // the execution of this callback with primary client's lease expiry.
    this.clientStateRefreshHandler = setInterval(() => {
      this.refreshClientState();
    }, CLIENT_STATE_REFRESH_INTERVAL_MS);
  }

  private stopClientStateRefreshes(): void {
    if (this.clientStateRefreshHandler) {
      clearInterval(this.clientStateRefreshHandler);
      this.clientStateRefreshHandler = null;
    }
  }

  /**
   * Attaches a window.unload handler that will synchronously write our
   * ownerId to a "zombie owner id" location in localstorage. This can be used
   * by tabs trying to acquire the lease to determine that the lease should be
   * acquired immediately even if the timestamp is recent. This is particularly
   * important for the refresh case (so the tab correctly re-acquires the owner
   * lease). LocalStorage is used for this rather than IndexedDb because it is
   * a synchronous API and so can be used reliably from an unload handler.
   */
  private attachWindowUnloadHook(): void {
    this.windowUnloadHandler = () => {
      if (this.isPrimary) {
        this.setZombiePrimaryKey(this.clientKey);
      }

      // Attempt graceful shutdown (including releasing our owner lease), but
      // there's no guarantee it will complete.
      this.shutdown();
    };
    this.window.addEventListener('unload', this.windowUnloadHandler);
  }

  private detachWindowUnloadHook(): void {
    if (this.windowUnloadHandler) {
      this.window.removeEventListener('unload', this.windowUnloadHandler);
      this.windowUnloadHandler = null;
    }
    if (this.documentVisibilityHandler) {
      this.document.removeEventListener(
        'visibilitychange',
        this.documentVisibilityHandler
      );
      this.documentVisibilityHandler = null;
    }
  }

  /**
   * Returns any recorded "zombied owner" (i.e. a previous owner that became
   * zombied due to their tab closing) from LocalStorage, or null if no such
   * record exists.
   */
  private getZombiedOwnerId(): string | null {
    try {
      const zombiedOwnerId = window.localStorage.getItem(
        this.zombiedPrimaryLocalStorageKey()
      );
      log.debug(LOG_TAG, 'Zombied ownerID from LocalStorage:', zombiedOwnerId);
      return zombiedOwnerId;
    } catch (e) {
      // Gracefully handle if LocalStorage isn't available / working.
      log.error('Failed to get zombie owner id.', e);
      return null;
    }
  }

  /**
   * Records a zombied primary key (a client that had its tab closed) in
   * LocalStorage or, if passed null, deletes any recorded zombied owner.
   */
  private setZombiePrimaryKey(zombieOwnerId: string | null) {
    try {
      if (zombieOwnerId === null) {
        window.localStorage.removeItem(this.zombiedPrimaryLocalStorageKey());
      } else {
        window.localStorage.setItem(
          this.zombiedPrimaryLocalStorageKey(),
          zombieOwnerId
        );
      }
    } catch (e) {
      // Gracefully handle if LocalStorage isn't available / working.
      log.error('Failed to set zombie owner id.', e);
    }
  }

  private zombiedPrimaryLocalStorageKey(): string {
    return this.localStoragePrefix + ZOMBIE_PRIMARY_LOCALSTORAGE_SUFFIX;
  }

  private generateClientKey(): string {
    // For convenience, just use an AutoId.
    return AutoId.newId();
  }
}

/**
 * Helper to get a typed SimpleDbStore for the client metadata object store.
 */
function clientMetadataStore(
  txn: SimpleDbTransaction
): SimpleDbStore<DbClientMetadataKey, DbClientMetadata> {
  return txn.store<DbClientMetadataKey, DbClientMetadata>(
    DbClientMetadata.store
  );
}
