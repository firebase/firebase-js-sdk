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
import { ClientId } from './shared_client_state';
import { CancelablePromise } from '../util/promise';

const LOG_TAG = 'IndexedDbPersistence';

/**
 * Oldest acceptable age in milliseconds for client metadata read from
 * IndexedDB. Client metadata and primary leases that are older than 5 seconds
 * are ignored.
 */
const CLIENT_METADATA_MAX_AGE_MS = 5000;
/**
 * The interval at which clients will update their metadata, including
 * refreshing their primary lease if held or potentially trying to acquire it if
 * not held.
 *
 * Primary clients may opportunistically refresh their metadata earlier
 * if they're already performing an IndexedDB operation.
 */
const CLIENT_METADATA_REFRESH_INTERVAL_MS = 4000;
/** LocalStorage location to indicate a zombied client id (see class comment). */
const ZOMBIED_PRIMARY_LOCALSTORAGE_SUFFIX = 'zombiedClientId';
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
 * the owner writes its ownerId to a "zombiedClientId" entry in LocalStorage
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

  private readonly document: Document | null;
  private readonly window: Window;

  private simpleDb: SimpleDb;
  private started: boolean;
  private isPrimary = false;
  private dbName: string;
  private localStoragePrefix: string;

  /**
   * Set to an Error object if we encounter an unrecoverable error. All further
   * transactions will be failed with this error.
   */
  private persistenceError: Error | null;
  /** Our window.unload handler, if registered. */
  private windowUnloadHandler: (() => void) | null;
  private inForeground = false;

  private serializer: LocalSerializer;

  /** Our 'visibilitychange' listener if registered. */
  private documentVisibilityHandler: ((e?: Event) => void) | null;

  /** The client metadata refresh task. */
  private clientMetadataRefresher: CancelablePromise<void>;

  /** A listener to notify on primary state changes. */
  private primaryStateListener: PrimaryStateListener = _ => Promise.resolve();

  constructor(
    prefix: string,
    private readonly clientId: ClientId,
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

    assert(this.window !== null, "Expected 'window' to be defined");

    return SimpleDb.openOrCreate(this.dbName, SCHEMA_VERSION, createOrUpgradeDb)
      .then(db => {
        this.simpleDb = db;
      })
      .then(() => {
        this.attachVisibilityHandler();
        this.attachWindowUnloadHook();
        return this.updateClientMetadataAndTryBecomePrimary().then(() =>
          this.scheduleClientMetadataAndPrimaryLeaseRefreshes()
        );
      });
  }

  setPrimaryStateListener(primaryStateListener: PrimaryStateListener): void {
    this.primaryStateListener = primaryStateListener;
    primaryStateListener(this.isPrimary);
  }

  /**
   * Updates the client metadata in IndexedDb and attempts to either obtain or
   * extend the primary lease for the local client. Asynchronously notifies the
   * primary state listener if the client either newly obtained or released its
   * primary lease.
   */
  private updateClientMetadataAndTryBecomePrimary(): Promise<void> {
    return this.simpleDb.runTransaction('readwrite', ALL_STORES, txn => {
      const metadataStore = clientMetadataStore(txn);
      metadataStore.put(
        new DbClientMetadata(this.clientId, Date.now(), this.inForeground)
      );

      return this.canActAsPrimary(txn).next(canActAsPrimary => {
        if (canActAsPrimary !== this.isPrimary) {
          this.isPrimary = canActAsPrimary;
          this.queue.enqueue(() => this.primaryStateListener(this.isPrimary));
        }

        if (this.isPrimary) {
          return this.acquireOrExtendPrimaryLease(txn);
        }
      });
    });
  }

  /**
   * Schedules a recurring timer to update the client metadata and to either
   * extend or acquire the primary lease if the client is eligible.
   */
  private scheduleClientMetadataAndPrimaryLeaseRefreshes(): void {
    this.clientMetadataRefresher = this.queue.enqueueAfterDelay(
      TimerId.ClientMetadataRefresh,
      CLIENT_METADATA_REFRESH_INTERVAL_MS,
      () => {
        return this.updateClientMetadataAndTryBecomePrimary().then(() =>
          this.scheduleClientMetadataAndPrimaryLeaseRefreshes()
        );
      }
    );
  }

  /** Checks whether `client` is the local client. */
  private isLocalClient(client: DbOwner | null): boolean {
    return client ? client.ownerId === this.clientId : false;
  }

  /**
   * Evaluate the state of all active clients and determine whether the local
   * client is or can act as the holder of the primary lease. Returns whether
   * the client is eligible for the lease, but does not actually acquire it.
   * May return 'false' even if there is no active leaseholder and another
   * (foreground) client should become leaseholder instead.
   */
  private canActAsPrimary(
    txn: SimpleDbTransaction
  ): PersistencePromise<boolean> {
    const store = ownerStore(txn);
    return store
      .get('owner')
      .next(currentPrimary => {
        const currentLeaseIsValid =
          currentPrimary !== null &&
          this.isWithinMaxAge(currentPrimary.leaseTimestampMs) &&
          currentPrimary.ownerId !== this.getZombiedClientId();

        if (currentLeaseIsValid) {
          return this.isLocalClient(currentPrimary);
        }

        // Check if this client is eligible for a primary lease based on its
        // visibility state and the visibility state of all active clients. A
        // client can obtain the primary lease if it is either in the foreground
        // or if this client and all other clients are in the background.
        if (this.inForeground) {
          return true;
        }

        let canActAsPrimary = true;
        return clientMetadataStore(txn)
          .iterate((key, value, control) => {
            if (this.clientId !== value.clientId) {
              if (
                this.isWithinMaxAge(value.updateTimeMs) &&
                value.inForeground
              ) {
                canActAsPrimary = false;
                control.done();
              }
            }
          })
          .next(() => canActAsPrimary);
      })
      .next(canActAsPrimary => {
        if (this.isPrimary !== canActAsPrimary) {
          log.debug(
            LOG_TAG,
            `Client ${
              canActAsPrimary ? 'is' : 'is not'
            } eligible for a primary lease.`
          );
        }
        return canActAsPrimary;
      });
  }

  shutdown(deleteData?: boolean): Promise<void> {
    if (!this.started) {
      return Promise.resolve();
    }
    this.started = false;
    this.clientMetadataRefresher.cancel();
    this.detachVisibilityHandler();
    this.detachWindowUnloadHook();
    return this.releasePrimaryLeaseIfHeld().then(() => {
      this.simpleDb.close();
      if (deleteData) {
        return SimpleDb.delete(this.dbName);
      }
    });
  }

  getActiveClients(): Promise<ClientId[]> {
    const clientIds: ClientId[] = [];
    return this.simpleDb
      .runTransaction('readonly', [DbClientMetadata.store], txn => {
        return clientMetadataStore(txn).iterate((key, value) => {
          if (this.isWithinMaxAge(value.updateTimeMs)) {
            clientIds.push(value.clientId);
          }
        });
      })
      .then(() => clientIds);
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
    // TODO(multitab): Consider removing `requirePrimaryLease` and exposing
    // three different write modes (readonly, readwrite, readwrite_primary).
    if (this.persistenceError) {
      return Promise.reject(this.persistenceError);
    }

    log.debug(LOG_TAG, 'Starting transaction:', action);

    // Do all transactions as readwrite against all object stores, since we
    // are the only reader/writer.
    return this.simpleDb.runTransaction('readwrite', ALL_STORES, txn => {
      if (requirePrimaryLease) {
        // While we merely verify that we have (or can acquire) the lease
        // immediately, we wait to extend the primary lease until after
        // executing transactionOperation(). This ensures that even if the
        // transactionOperation takes a long time, we'll use a recent
        // leaseTimestampMs in the extended (or newly acquired) lease.
        return this.canActAsPrimary(txn)
          .next(canActAsPrimary => {
            if (!canActAsPrimary) {
              // TODO(multitab): Handle this gracefully and transition back to
              // secondary state.
              log.error(
                `Failed to obtain primary lease for action '${action}'.`
              );
              throw new FirestoreError(
                Code.FAILED_PRECONDITION,
                PRIMARY_LEASE_LOST_ERROR_MSG
              );
            }
            return transactionOperation(txn);
          })
          .next(result => {
            return this.acquireOrExtendPrimaryLease(txn).next(() => result);
          });
      } else {
        return transactionOperation(txn);
      }
    });
  }

  /**
   * Obtains or extends the new primary lease for the local client. This
   * method does not verify that the client is eligible for this lease.
   */
  private acquireOrExtendPrimaryLease(txn): PersistencePromise<void> {
    const newPrimary = new DbOwner(this.clientId, Date.now());
    return ownerStore(txn).put('owner', newPrimary);
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

  /** Checks the primary lease and removes it if we are the current primary. */
  private releasePrimaryLeaseIfHeld(): Promise<void> {
    this.isPrimary = false;

    return this.simpleDb.runTransaction('readwrite', [DbOwner.store], txn => {
      const store = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
      return store.get('owner').next(primaryClient => {
        if (this.isLocalClient(primaryClient)) {
          log.debug(LOG_TAG, 'Releasing primary lease.');
          return store.delete('owner');
        } else {
          return PersistencePromise.resolve();
        }
      });
    });
  }

  /** Verifies that `updateTimeMs` is within CLIENT_STATE_MAX_AGE_MS. */
  private isWithinMaxAge(updateTimeMs: number): boolean {
    const now = Date.now();
    const minAcceptable = now - CLIENT_METADATA_MAX_AGE_MS;
    const maxAcceptable = now;
    if (updateTimeMs < minAcceptable) {
      return false;
    } else if (updateTimeMs > maxAcceptable) {
      log.error(
        `Detected an update time that is in the future: ${updateTimeMs} > ${maxAcceptable}`
      );
      return false;
    }

    return true;
  }

  private attachVisibilityHandler(): void {
    if (
      this.document !== null &&
      typeof this.document.addEventListener === 'function'
    ) {
      this.documentVisibilityHandler = () => {
        this.queue.enqueue<DbOwner | void>(() => {
          this.inForeground = this.document.visibilityState === 'visible';
          return this.updateClientMetadataAndTryBecomePrimary();
        });
      };

      this.document.addEventListener(
        'visibilitychange',
        this.documentVisibilityHandler
      );
    }
  }

  private detachVisibilityHandler(): void {
    if (this.documentVisibilityHandler) {
      assert(
        this.document !== null &&
          typeof this.document.addEventListener === 'function',
        "Expected 'document.addEventListener' to be a function"
      );
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
    if (typeof this.window.addEventListener === 'function') {
      this.windowUnloadHandler = () => {
        // Note: In theory, this should be scheduled on the AsyncQueue since it
        // accesses internal state. We execute this code directly during shutdown
        // to make sure it gets a chance to run.
        if (this.isPrimary) {
          this.setZombiedClientId(this.clientId);
        }

        this.queue.enqueue(() => {
          // Attempt graceful shutdown (including releasing our owner lease), but
          // there's no guarantee it will complete.
          return this.shutdown();
        });
      };
      this.window.addEventListener('unload', this.windowUnloadHandler);
    }
  }

  private detachWindowUnloadHook(): void {
    if (this.windowUnloadHandler) {
      assert(
        typeof this.window.removeEventListener === 'function',
        "Expected 'window.removeEventListener' to be a function"
      );
      this.window.removeEventListener('unload', this.windowUnloadHandler);
      this.windowUnloadHandler = null;
    }
  }

  /**
   * Returns any recorded "zombied owner" (i.e. a previous owner that became
   * zombied due to their tab closing) from LocalStorage, or null if no such
   * record exists.
   */
  private getZombiedClientId(): ClientId | null {
    if (this.window.localStorage === undefined) {
      assert(
        process.env.USE_MOCK_PERSISTENCE === 'YES',
        'Operating without LocalStorage is only supported with IndexedDbShim.'
      );
      return null;
    }

    try {
      const zombiedClientId = this.window.localStorage.getItem(
        this.zombiedClientLocalStorageKey()
      );
      log.debug(
        LOG_TAG,
        'Zombied clientId from LocalStorage:',
        zombiedClientId
      );
      return zombiedClientId;
    } catch (e) {
      // Gracefully handle if LocalStorage isn't available / working.
      log.error(LOG_TAG, 'Failed to get zombied client id.', e);
      return null;
    }
  }

  /**
   * Records a zombied primary client (a primary client that had its tab closed)
   * in LocalStorage or, if passed null, deletes any recorded zombied owner.
   */
  private setZombiedClientId(zombiedClientId: ClientId | null): void {
    try {
      if (zombiedClientId === null) {
        this.window.localStorage.removeItem(
          this.zombiedClientLocalStorageKey()
        );
      } else {
        this.window.localStorage.setItem(
          this.zombiedClientLocalStorageKey(),
          zombiedClientId
        );
      }
    } catch (e) {
      // Gracefully handle if LocalStorage isn't available / working.
      log.error('Failed to set zombie owner id.', e);
    }
  }

  private zombiedClientLocalStorageKey(): string {
    return this.localStoragePrefix + ZOMBIED_PRIMARY_LOCALSTORAGE_SUFFIX;
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
