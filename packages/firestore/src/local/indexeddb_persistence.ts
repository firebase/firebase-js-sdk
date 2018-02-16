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
import { AsyncQueue, TimerId } from '../util/async_queue';
import { ClientKey } from './shared_client_state';

const LOG_TAG = 'IndexedDbPersistence';

/**
 * Oldest acceptable age in milliseconds for client states read from IndexedDB.
 * Client state and primary leases that are older than 5 seconds are ignored.
 */
const CLIENT_STATE_MAX_AGE_MS = 5000;
/**
 * Maximum refresh interval for the primary lease. Used for extending a
 * currently owned lease.
 */
const PRIMARY_LEASE_MAX_REFRESH_INTERVAL_MS = 4000;
/**
 * Minimum interval for attemots to acquire the primary lease. Used when
 * synchronizing client lease refreshes across all clients.
 */
const PRIMARY_LEASE_MIN_REFRESH_INTERVAL_MS = 4000;
/** LocalStorage location to indicate a zombied primary key (see class comment). */
const ZOMBIE_PRIMARY_LOCALSTORAGE_SUFFIX = 'zombiedOwnerId';
/** User-facing error when the primary lease is required but not available. */
const PRIMARY_LEASE_LOST_ERROR_MSG =
  'The current tab is not in the required state to perform this operation. ' +
  'It might be necessary to refresh the browser tab.';
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
 *
 * TODO(multitab): Update this comment with multi-tab changes.
 */
export class IndexedDbPersistence implements Persistence {
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
  private readonly clientKey = this.generateClientKey();

  /**
   * Set to an Error object if we encounter an unrecoverable error. All further
   * transactions will be failed with this error.
   */
  private persistenceError: Error | null;
  /** The setInterval() handle tied to refreshing the owner lease. */
  // tslint:disable-next-line:no-any setTimeout() type differs on browser / node
  private clientStateRefreshHandle: any;
  /** Our window.unload handler, if registered. */
  private windowUnloadHandler: (() => void) | null;
  private inForeground = false;

  private serializer: LocalSerializer;

  /** Our 'visibilitychange' listener if registered. */
  private documentVisibilityHandler: ((e?: Event) => void) | null;

  /** Callback for primary state notifications. */
  primaryStateListener: PrimaryStateListener = _ => Promise.resolve();

  constructor(
    prefix: string,
    platform: Platform,
    private readonly queue: AsyncQueue,
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

    return SimpleDb.openOrCreate(this.dbName, SCHEMA_VERSION, createOrUpgradeDb)
      .then(db => {
        this.simpleDb = db;
      })
      .then(() => {
        this.attachVisibilityHandler();
        this.attachWindowUnloadHook();
        return this.schedulePrimaryLeaseRefreshes(0);
      });
  }

  setPrimaryStateListener(primaryStateListener: PrimaryStateListener) {
    this.primaryStateListener = primaryStateListener;
    primaryStateListener(this.isPrimary);
  }

  /**
   * Schedules a recurring timer to refresh or acquire the owner lease.
   */
  private schedulePrimaryLeaseRefreshes(initialDelayMs: number): Promise<void> {
    return this.queue.enqueueAfterDelay(
      TimerId.ClientStateRefresh,
      initialDelayMs,
      () => {
        return this.tryBecomePrimary().then(currentPrimary => {
          let nextDelayMs;

          if (this.isLocalClient(currentPrimary)) {
            nextDelayMs = PRIMARY_LEASE_MAX_REFRESH_INTERVAL_MS;
          } else if (currentPrimary !== null) {
            nextDelayMs = Math.max(
              PRIMARY_LEASE_MIN_REFRESH_INTERVAL_MS,
              Date.now() -
                (currentPrimary.leaseTimestampMs + CLIENT_STATE_MAX_AGE_MS) +
                1
            );
          } else {
            nextDelayMs = PRIMARY_LEASE_MIN_REFRESH_INTERVAL_MS;
          }

          this.schedulePrimaryLeaseRefreshes(nextDelayMs);
        });
      }
    );
  }

  /**
   * Attempts to obtain the primary lease for the local client. If successful,
   * returns a `DbOwner` with the local client id. Otherwise, returns the
   * current leaseholder or 'null' (if the primary lease should be obtained
   * by another client running in the foreground).
   */
  private tryBecomePrimary(): Promise<DbOwner | null> {
    return this.simpleDb
      .runTransaction('readwrite', ALL_STORES, txn => {
        const metadataStore = clientMetadataStore(txn);
        metadataStore.put(
          new DbClientMetadata(this.clientKey, Date.now(), this.inForeground)
        );
        return this.tryElectPrimaryCandidate(txn).next(
          electedPrimaryCandidate => {
            if (this.isLocalClient(electedPrimaryCandidate)) {
              return this.acquirePrimaryLease(txn);
            }
            return electedPrimaryCandidate;
          }
        );
      })
      .then(suggestedPrimaryClient => {
        const isPrimary = this.isLocalClient(suggestedPrimaryClient);
        if (this.isPrimary !== isPrimary) {
          this.isPrimary = isPrimary;
          this.primaryStateListener(this.isPrimary);
        }
        return suggestedPrimaryClient;
      });
  }

  /** Checks whether the `primary` is the local client. */
  private isLocalClient(primary: DbOwner | null): boolean {
    return primary ? primary.ownerId === this.clientKey : false;
  }

  /**
   * Evaluate the state of all active instances and determine whether the local
   * client can obtain the primary lease. Returns the leaseholder to use for
   * pending operations, but does not actually acquire the lease. May return
   * 'null' if there is no active leaseholder and another foreground client
   * should become leaseholder instead.
   *
   * NOTE: To determine if the current leaseholder is zombied, this method reads
   * from LocalStorage which could be mildly expensive.
   */
  private tryElectPrimaryCandidate(txn): PersistencePromise<DbOwner | null> {
    const store = ownerStore(txn);
    return store.get('owner').next(currentPrimary => {
      if (
        currentPrimary !== null &&
        !this.isWithinMaxAge(currentPrimary.leaseTimestampMs)
      ) {
        currentPrimary = null; // primary lease has expired.
      } else if (
        currentPrimary !== null &&
        currentPrimary.ownerId === this.getZombiedClientId()
      ) {
        currentPrimary = null; // primary's tab closed.
      }

      if (currentPrimary) {
        return currentPrimary;
      }

      return this.canBecomePrimary(txn).next(canBecomePrimary => {
        if (canBecomePrimary) {
          log.debug(LOG_TAG, 'No valid primary. Acquiring primary lease.');
          return new DbOwner(this.clientKey, Date.now());
        } else {
          return null;
        }
      });
    });
  }

  shutdown(): Promise<void> {
    if (!this.started) {
      return Promise.resolve();
    }
    this.started = false;
    this.detachVisibilityHandler();
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
    requirePrimaryLease: boolean,
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
      if (requirePrimaryLease) {
        // While we merely verify that we can obtain the lease at first,
        // IndexedDb's transaction guarantees that we will be able to obtain
        // the lease before we commit. We do this to not immediately lose our
        // lease after long-running operations.
        return this.tryElectPrimaryCandidate(txn)
          .next(suggestedPrimary => {
            if (!this.isLocalClient(suggestedPrimary)) {
              // TODO(multitab): Handle this gracefully and transition back to
              // secondary state.
              throw new FirestoreError(
                Code.FAILED_PRECONDITION,
                PRIMARY_LEASE_LOST_ERROR_MSG
              );
            }
            return transactionOperation(txn);
          })
          .next(result => {
            return this.acquirePrimaryLease(txn).next(() => result);
          });
      } else {
        return transactionOperation(txn);
      }
    });
  }

  /**
   * Obtains or extends the new primary lease for the current client. This
   * method does not verify that the client is eligible for this lease.
   */
  private acquirePrimaryLease(txn): PersistencePromise<DbOwner> {
    const newPrimary = new DbOwner(this.clientKey, Date.now());
    return ownerStore(txn)
      .put('owner', newPrimary)
      .next(() => newPrimary);
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
   * Checks if this client is eligible for a primary lease based on its
   * visibility state and the visibility state of all active clients. A client
   * can obtain the primary lease if it is either in the foreground or if it
   * and all other clients are in the background.
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
        if (this.clientKey !== value.clientId) {
          if (this.isWithinMaxAge(value.updateTimeMs) && value.inForeground) {
            canBecomePrimary = false;
            control.done();
          }
        }
      })
      .next(() => {
        return canBecomePrimary;
      });
  }

  /** Checks the primary lease and removes it if we are the current primary. */
  private releasePrimaryLease(): Promise<void> {
    return this.simpleDb
      .runTransaction('readwrite', [DbOwner.store], txn => {
        const store = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
        return store.get('owner').next(dbOwner => {
          if (dbOwner !== null && dbOwner.ownerId === this.clientKey) {
            log.debug(LOG_TAG, 'Releasing primary lease.');
            return store.delete('owner');
          } else {
            return PersistencePromise.resolve();
          }
        });
      })
      .then(() => {
        if (this.isPrimary) {
          this.isPrimary = false;
          return this.primaryStateListener(false);
        }
      });
  }

  /** Verifies that `updateTimeMs` is within CLIENT_STATE_MAX_AGE_MS. */
  private isWithinMaxAge(updateTimeMs: number): boolean {
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

  private stopClientStateRefreshes(): void {
    if (this.clientStateRefreshHandle) {
      clearInterval(this.clientStateRefreshHandle);
      this.clientStateRefreshHandle = null;
    }
  }

  private attachVisibilityHandler(): void {
    this.documentVisibilityHandler = () => {
      this.queue.enqueue<DbOwner | void>(() => {
        const inForeground = this.document.visibilityState === 'visible';
        if (inForeground !== this.inForeground) {
          this.inForeground = inForeground;
          return this.tryBecomePrimary();
        } else {
          return Promise.resolve();
        }
      });
    };

    this.document.addEventListener(
      'visibilitychange',
      this.documentVisibilityHandler
    );
  }

  private detachVisibilityHandler(): void {
    if (this.documentVisibilityHandler) {
      this.document.removeEventListener(
        'visibilitychange',
        this.documentVisibilityHandler
      );
      this.documentVisibilityHandler = null;
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
      // Note: In theory, this should be scheduled on the AsyncQueue since it
      // accesses internal state. We execute this code directly during shutdown
      // to make sure it gets a chance to run.
      if (this.isPrimary) {
        this.setZombiedClientId(this.clientKey);
      }
      this.queue.enqueue(() => {
        // Attempt graceful shutdown (including releasing our owner lease), but
        // there's no guarantee it will complete.
        return this.shutdown();
      });
    };
    this.window.addEventListener('unload', this.windowUnloadHandler);
  }

  private detachWindowUnloadHook(): void {
    if (this.windowUnloadHandler) {
      this.window.removeEventListener('unload', this.windowUnloadHandler);
      this.windowUnloadHandler = null;
    }
  }

  /**
   * Returns any recorded "zombied owner" (i.e. a previous owner that became
   * zombied due to their tab closing) from LocalStorage, or null if no such
   * record exists.
   */
  private getZombiedClientId(): string | null {
    try {
      const zombiedOwnerId = window.localStorage.getItem(
        this.zombiedClientLocalStorageKey()
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
   * Records a zombied primary client (a primary client that had its tab closed)
   * in LocalStorage or, if passed null, deletes any recorded zombied owner.
   */
  private setZombiedClientId(zombieOwnerId: string | null) {
    try {
      if (zombieOwnerId === null) {
        window.localStorage.removeItem(this.zombiedClientLocalStorageKey());
      } else {
        window.localStorage.setItem(
          this.zombiedClientLocalStorageKey(),
          zombieOwnerId
        );
      }
    } catch (e) {
      // Gracefully handle if LocalStorage isn't available / working.
      log.error('Failed to set zombie owner id.', e);
    }
  }

  private zombiedClientLocalStorageKey(): string {
    return this.localStoragePrefix + ZOMBIE_PRIMARY_LOCALSTORAGE_SUFFIX;
  }

  private generateClientKey(): ClientKey {
    // For convenience, just use an AutoId.
    return AutoId.newId();
  }
}

/**
 * Helper to get a typed SimpleDbStore for the owner object store.
 */
function ownerStore(
  txn: SimpleDbTransaction
): SimpleDbStore<DbOwnerKey, DbOwner> {
  return txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
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
