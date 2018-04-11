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
  DbOwner,
  DbOwnerKey,
  SCHEMA_VERSION
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { MutationQueue } from './mutation_queue';
import { Persistence } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryCache } from './query_cache';
import { RemoteDocumentCache } from './remote_document_cache';
import { SimpleDb, SimpleDbTransaction } from './simple_db';

const LOG_TAG = 'IndexedDbPersistence';

/** If the owner lease is older than 5 seconds, try to take ownership. */
const OWNER_LEASE_MAX_AGE_MS = 5000;
/** Refresh the owner lease every 4 seconds while owner. */
const OWNER_LEASE_REFRESH_INTERVAL_MS = 4000;

/** LocalStorage location to indicate a zombied ownerId (see class comment). */
const ZOMBIE_OWNER_LOCALSTORAGE_SUFFIX = 'zombiedOwnerId';
/** Error when the owner lease cannot be acquired or is lost. */
const EXISTING_OWNER_ERROR_MSG =
  'There is another tab open with offline' +
  ' persistence enabled. Only one such tab is allowed at a time. The' +
  ' other tab must be closed or persistence must be disabled.';
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
  /**
   * The name of the main (and currently only) IndexedDB database. this name is
   * appended to the prefix provided to the IndexedDbPersistence constructor.
   */
  static MAIN_DATABASE = 'main';

  private simpleDb: SimpleDb;
  private started: boolean;
  private dbName: string;
  private localStoragePrefix: string;
  private ownerId: string = this.generateOwnerId();

  /**
   * Set to an Error object if we encounter an unrecoverable error. All further
   * transactions will be failed with this error.
   */
  private persistenceError: Error | null;
  /** The setInterval() handle tied to refreshing the owner lease. */
  // tslint:disable-next-line:no-any setTimeout() type differs on browser / node
  private ownerLeaseRefreshHandle: any;
  /** Our window.unload handler, if registered. */
  private windowUnloadHandler: (() => void) | null;

  private serializer: LocalSerializer;

  constructor(prefix: string, serializer: JsonProtoSerializer) {
    this.dbName = prefix + IndexedDbPersistence.MAIN_DATABASE;
    this.serializer = new LocalSerializer(serializer);
    this.localStoragePrefix = prefix;
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

    return SimpleDb.openOrCreate(this.dbName, SCHEMA_VERSION, createOrUpgradeDb)
      .then(db => {
        this.simpleDb = db;
      })
      .then(() => this.tryAcquireOwnerLease())
      .then(() => {
        this.scheduleOwnerLeaseRefreshes();
        this.attachWindowUnloadHook();
      });
  }

  shutdown(): Promise<void> {
    assert(this.started, 'IndexedDbPersistence shutdown without start!');
    this.started = false;
    this.detachWindowUnloadHook();
    this.stopOwnerLeaseRefreshes();
    return this.releaseOwnerLease().then(() => {
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
    operation: (transaction: SimpleDbTransaction) => PersistencePromise<T>
  ): Promise<T> {
    if (this.persistenceError) {
      return Promise.reject(this.persistenceError);
    }

    log.debug(LOG_TAG, 'Starting transaction:', action);

    // Do all transactions as readwrite against all object stores, since we
    // are the only reader/writer.
    return this.simpleDb.runTransaction('readwrite', ALL_STORES, txn => {
      // Verify that we still have the owner lease as part of every transaction.
      return this.ensureOwnerLease(txn).next(() => operation(txn));
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
   * Acquires the owner lease if there's no valid owner. Else returns a rejected
   * promise.
   */
  private tryAcquireOwnerLease(): Promise<void> {
    // NOTE: Don't use this.runTransaction, since it requires us to already
    // have the lease.
    return this.simpleDb.runTransaction('readwrite', [DbOwner.store], txn => {
      const store = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
      return store.get('owner').next(dbOwner => {
        if (!this.validOwner(dbOwner)) {
          const newDbOwner = new DbOwner(this.ownerId, Date.now());
          log.debug(
            LOG_TAG,
            'No valid owner. Acquiring owner lease. Current owner:',
            dbOwner,
            'New owner:',
            newDbOwner
          );
          return store.put('owner', newDbOwner);
        } else {
          log.debug(
            LOG_TAG,
            'Valid owner already. Failing. Current owner:',
            dbOwner
          );
          this.persistenceError = new FirestoreError(
            Code.FAILED_PRECONDITION,
            EXISTING_OWNER_ERROR_MSG
          );
          return PersistencePromise.reject<void>(this.persistenceError);
        }
      });
    });
  }

  /** Checks the owner lease and deletes it if we are the current owner. */
  private releaseOwnerLease(): Promise<void> {
    // NOTE: Don't use this.runTransaction, since it requires us to already
    // have the lease.
    return this.simpleDb.runTransaction('readwrite', [DbOwner.store], txn => {
      const store = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
      return store.get('owner').next(dbOwner => {
        if (dbOwner !== null && dbOwner.ownerId === this.ownerId) {
          log.debug(LOG_TAG, 'Releasing owner lease.');
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
  private ensureOwnerLease(txn: SimpleDbTransaction): PersistencePromise<void> {
    const store = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
    return store.get('owner').next(dbOwner => {
      if (dbOwner === null || dbOwner.ownerId !== this.ownerId) {
        this.persistenceError = new FirestoreError(
          Code.FAILED_PRECONDITION,
          EXISTING_OWNER_ERROR_MSG
        );
        return PersistencePromise.reject<void>(this.persistenceError);
      } else {
        return PersistencePromise.resolve();
      }
    });
  }

  /**
   * Returns true if the provided owner exists, has a recent timestamp, and
   * isn't zombied.
   *
   * NOTE: To determine if the owner is zombied, this method reads from
   * LocalStorage which could be mildly expensive.
   */
  private validOwner(dbOwner: DbOwner | null): boolean {
    const now = Date.now();
    const minAcceptable = now - OWNER_LEASE_MAX_AGE_MS;
    const maxAcceptable = now;
    if (dbOwner === null) {
      return false; // no owner.
    } else if (dbOwner.leaseTimestampMs < minAcceptable) {
      return false; // owner lease has expired.
    } else if (dbOwner.leaseTimestampMs > maxAcceptable) {
      log.error(
        'Persistence owner-lease is in the future. Discarding.',
        dbOwner
      );
      return false;
    } else if (dbOwner.ownerId === this.getZombiedOwnerId()) {
      return false; // owner's tab closed.
    } else {
      return true;
    }
  }

  /**
   * Schedules a recurring timer to update the owner lease timestamp to prevent
   * other tabs from taking the lease.
   */
  private scheduleOwnerLeaseRefreshes(): void {
    // NOTE: This doesn't need to be scheduled on the async queue and doing so
    // would increase the chances of us not refreshing on time if the queue is
    // backed up for some reason.
    this.ownerLeaseRefreshHandle = setInterval(() => {
      const txResult = this.runTransaction('Refresh owner timestamp', txn => {
        // NOTE: We don't need to validate the current owner contents, since
        // runTransaction does that automatically.
        const store = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
        return store.put('owner', new DbOwner(this.ownerId, Date.now()));
      });

      txResult.catch(reason => {
        // Probably means we lost the lease. Report the error and stop trying to
        // refresh the lease.
        log.error(reason);
        this.stopOwnerLeaseRefreshes();
      });
    }, OWNER_LEASE_REFRESH_INTERVAL_MS);
  }

  private stopOwnerLeaseRefreshes(): void {
    if (this.ownerLeaseRefreshHandle) {
      clearInterval(this.ownerLeaseRefreshHandle);
      this.ownerLeaseRefreshHandle = null;
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
      // Record that we're zombied.
      this.setZombiedOwnerId(this.ownerId);

      // Attempt graceful shutdown (including releasing our owner lease), but
      // there's no guarantee it will complete.
      this.shutdown();
    };
    window.addEventListener('unload', this.windowUnloadHandler);
  }

  private detachWindowUnloadHook(): void {
    if (this.windowUnloadHandler) {
      window.removeEventListener('unload', this.windowUnloadHandler);
      this.windowUnloadHandler = null;
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
        this.zombiedOwnerLocalStorageKey()
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
   * Records a zombied owner (an owner that had its tab closed) in LocalStorage
   * or, if passed null, deletes any recorded zombied owner.
   */
  private setZombiedOwnerId(zombieOwnerId: string | null): void {
    try {
      if (zombieOwnerId === null) {
        window.localStorage.removeItem(this.zombiedOwnerLocalStorageKey());
      } else {
        window.localStorage.setItem(
          this.zombiedOwnerLocalStorageKey(),
          zombieOwnerId
        );
      }
    } catch (e) {
      // Gracefully handle if LocalStorage isn't available / working.
      log.error('Failed to set zombie owner id.', e);
    }
  }

  private zombiedOwnerLocalStorageKey(): string {
    return this.localStoragePrefix + ZOMBIE_OWNER_LOCALSTORAGE_SUFFIX;
  }

  private generateOwnerId(): string {
    // For convenience, just use an AutoId.
    return AutoId.newId();
  }
}
