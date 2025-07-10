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

import { User } from '../auth/user';
import { TargetId } from '../core/types';
import { DocumentKey } from '../model/document_key';

import { BundleCache } from './bundle_cache';
import { DocumentOverlayCache } from './document_overlay_cache';
import { GlobalsCache } from './globals_cache';
import { IndexManager } from './index_manager';
import { MutationQueue } from './mutation_queue';
import { PersistencePromise } from './persistence_promise';
import {
  PersistenceTransaction,
  PersistenceTransactionMode
} from './persistence_transaction';
import { RemoteDocumentCache } from './remote_document_cache';
import { TargetCache } from './target_cache';
import { TargetData } from './target_data';

/**
 * Callback type for primary state notifications. This callback can be
 * registered with the persistence layer to get notified when we transition from
 * primary to secondary state and vice versa.
 *
 * Note: Instances can only toggle between Primary and Secondary state if
 * IndexedDB persistence is enabled and multiple clients are active. If this
 * listener is registered with MemoryPersistence, the callback will be called
 * exactly once marking the current instance as Primary.
 */
export type PrimaryStateListener = (isPrimary: boolean) => Promise<void>;

/**
 * A ReferenceDelegate instance handles all of the hooks into the document-reference lifecycle. This
 * includes being added to a target, being removed from a target, being subject to mutation, and
 * being mutated by the user.
 *
 * Different implementations may do different things with each of these events. Not every
 * implementation needs to do something with every lifecycle hook.
 *
 * PORTING NOTE: since sequence numbers are attached to transactions in this
 * client, the ReferenceDelegate does not need to deal in transactional
 * semantics (onTransactionStarted/Committed()), nor does it need to track and
 * generate sequence numbers (getCurrentSequenceNumber()).
 */
export interface ReferenceDelegate {
  /** Notify the delegate that the given document was added to a target. */
  addReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    doc: DocumentKey
  ): PersistencePromise<void>;

  /** Notify the delegate that the given document was removed from a target. */
  removeReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    doc: DocumentKey
  ): PersistencePromise<void>;

  /**
   * Notify the delegate that a target was removed. The delegate may, but is not obligated to,
   * actually delete the target and associated data.
   */
  removeTarget(
    txn: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void>;

  /**
   * Notify the delegate that a document may no longer be part of any views or
   * have any mutations associated.
   */
  markPotentiallyOrphaned(
    txn: PersistenceTransaction,
    doc: DocumentKey
  ): PersistencePromise<void>;

  /** Notify the delegate that a limbo document was updated. */
  updateLimboDocument(
    txn: PersistenceTransaction,
    doc: DocumentKey
  ): PersistencePromise<void>;
}

/**
 * A {@link DatabaseDeletedListener} event indicating that the IndexedDB
 * database received a "versionchange" event with a null value for "newVersion".
 * This event indicates that another tab in multi-tab IndexedDB persistence mode
 * has called `clearIndexedDbPersistence()` and requires this tab to close its
 * IndexedDB connection in order to allow the "clear" operation to proceed.
 */
export class VersionChangeDatabaseDeletedEvent {
  /** A type discriminator. */
  readonly type = 'VersionChangeDatabaseDeletedEvent' as const;

  constructor(
    readonly data: {
      /** A unique ID for this event. */
      eventId: string;
      /**
       * The value of the "newVersion" property of the "versionchange" event
       * that triggered this event. Its value is _always_ `null`, but is kept
       * here for posterity.
       */
      eventNewVersion: null;
    }
  ) {}
}

/**
 * A {@link DatabaseDeletedListener} event indicating that the "Clear Site Data"
 * button in a web browser was (likely) clicked, deleting the IndexedDB
 * database.
 */
export class ClearSiteDataDatabaseDeletedEvent {
  /** A type discriminator. */
  readonly type = 'ClearSiteDataDatabaseDeletedEvent' as const;

  constructor(
    readonly data: {
      /** A unique ID for this event. */
      eventId: string;
      /** The IndexedDB version that was last reported by the database. */
      lastClosedVersion: number;
      /**
       * The value of the "oldVersion" property of the "onupgradeneeded"
       * IndexedDB event that triggered this event.
       */
      eventOldVersion: number;
      /**
       * The value of the "newVersion" property of the "onupgradeneeded"
       * IndexedDB event that triggered this event.
       */
      eventNewVersion: number | null;
      /**
       * The value of the "version" property of the "IDBDatabase" object.
       */
      dbVersion: number;
    }
  ) {}
}

/**
 * The type of the "event" parameter of {@link DatabaseDeletedListener}.
 */
export type DatabaseDeletedListenerEvent =
  | VersionChangeDatabaseDeletedEvent
  | ClearSiteDataDatabaseDeletedEvent;

export type DatabaseDeletedListener = (
  event: DatabaseDeletedListenerEvent
) => void;

/**
 * Persistence is the lowest-level shared interface to persistent storage in
 * Firestore.
 *
 * Persistence is used to create MutationQueue and RemoteDocumentCache
 * instances backed by persistence (which might be in-memory or LevelDB).
 *
 * Persistence also exposes an API to create and run PersistenceTransactions
 * against persistence. All read / write operations must be wrapped in a
 * transaction. Implementations of PersistenceTransaction / Persistence only
 * need to guarantee that writes made against the transaction are not made to
 * durable storage until the transaction resolves its PersistencePromise.
 * Since memory-only storage components do not alter durable storage, they are
 * free to ignore the transaction.
 *
 * This contract is enough to allow the LocalStore be be written
 * independently of whether or not the stored state actually is durably
 * persisted. If persistent storage is enabled, writes are grouped together to
 * avoid inconsistent state that could cause crashes.
 *
 * Concretely, when persistent storage is enabled, the persistent versions of
 * MutationQueue, RemoteDocumentCache, and others (the mutators) will
 * defer their writes into a transaction. Once the local store has completed
 * one logical operation, it commits the transaction.
 *
 * When persistent storage is disabled, the non-persistent versions of the
 * mutators ignore the transaction. This short-cut is allowed because
 * memory-only storage leaves no state so it cannot be inconsistent.
 *
 * This simplifies the implementations of the mutators and allows memory-only
 * implementations to supplement the persistent ones without requiring any
 * special dual-store implementation of Persistence. The cost is that the
 * LocalStore needs to be slightly careful about the order of its reads and
 * writes in order to avoid relying on being able to read back uncommitted
 * writes.
 */
export interface Persistence {
  /**
   * Whether or not this persistence instance has been started.
   */
  readonly started: boolean;

  readonly referenceDelegate: ReferenceDelegate;

  /** Starts persistence. */
  start(): Promise<void>;

  /**
   * Releases any resources held during eager shutdown.
   */
  shutdown(): Promise<void>;

  /**
   * Registers a listener that gets called when the underlying database receives
   * an event indicating that it either has been deleted or is pending deletion
   * and must be closed.
   *
   * For example, this callback will be called in the case that multi-tab
   * IndexedDB persistence is in use and another tab calls
   * clearIndexedDbPersistence(). In that case, this Firestore instance must
   * close its IndexedDB connection in order to allow the deletion initiated by
   * the other tab to proceed.
   *
   * This method may only be called once; subsequent invocations will result in
   * an exception, refusing to supersede the previously-registered listener.
   *
   * PORTING NOTE: This is only used for Web multi-tab.
   */
  setDatabaseDeletedListener(
    databaseDeletedListener: DatabaseDeletedListener
  ): void;

  /**
   * Adjusts the current network state in the client's metadata, potentially
   * affecting the primary lease.
   *
   * PORTING NOTE: This is only used for Web multi-tab.
   */
  setNetworkEnabled(networkEnabled: boolean): void;

  /**
   * Returns GlobalCache representing a general purpose cache for global values.
   */
  getGlobalsCache(): GlobalsCache;

  /**
   * Returns a MutationQueue representing the persisted mutations for the
   * given user.
   *
   * Note: The implementation is free to return the same instance every time
   * this is called for a given user. In particular, the memory-backed
   * implementation does this to emulate the persisted implementation to the
   * extent possible (e.g. in the case of uid switching from
   * sally=&gt;jack=&gt;sally, sally's mutation queue will be preserved).
   */
  getMutationQueue(user: User, indexManager: IndexManager): MutationQueue;

  /**
   * Returns a TargetCache representing the persisted cache of targets.
   *
   * Note: The implementation is free to return the same instance every time
   * this is called. In particular, the memory-backed implementation does this
   * to emulate the persisted implementation to the extent possible.
   */
  getTargetCache(): TargetCache;

  /**
   * Returns a RemoteDocumentCache representing the persisted cache of remote
   * documents.
   *
   * Note: The implementation is free to return the same instance every time
   * this is called. In particular, the memory-backed implementation does this
   * to emulate the persisted implementation to the extent possible.
   */
  getRemoteDocumentCache(): RemoteDocumentCache;

  /**
   * Returns a BundleCache representing the persisted cache of loaded bundles.
   *
   * Note: The implementation is free to return the same instance every time
   * this is called. In particular, the memory-backed implementation does this
   * to emulate the persisted implementation to the extent possible.
   */
  getBundleCache(): BundleCache;

  /**
   * Returns an IndexManager instance that manages our persisted query indexes.
   *
   * Note: The implementation is free to return the same instance every time
   * this is called. In particular, the memory-backed implementation does this
   * to emulate the persisted implementation to the extent possible.
   */
  getIndexManager(user: User): IndexManager;

  /**
   * Returns a DocumentOverlayCache representing the documents that are mutated
   * locally.
   */
  getDocumentOverlayCache(user: User): DocumentOverlayCache;

  /**
   * Performs an operation inside a persistence transaction. Any reads or writes
   * against persistence must be performed within a transaction. Writes will be
   * committed atomically once the transaction completes.
   *
   * Persistence operations are asynchronous and therefore the provided
   * transactionOperation must return a PersistencePromise. When it is resolved,
   * the transaction will be committed and the Promise returned by this method
   * will resolve.
   *
   * @param action - A description of the action performed by this transaction,
   * used for logging.
   * @param mode - The underlying mode of the IndexedDb transaction. Can be
   * 'readonly', 'readwrite' or 'readwrite-primary'. Transactions marked
   * 'readwrite-primary' can only be executed by the primary client. In this
   * mode, the transactionOperation will not be run if the primary lease cannot
   * be acquired and the returned promise will be rejected with a
   * FAILED_PRECONDITION error.
   * @param transactionOperation - The operation to run inside a transaction.
   * @returns A `Promise` that is resolved once the transaction completes.
   */
  runTransaction<T>(
    action: string,
    mode: PersistenceTransactionMode,
    transactionOperation: (
      transaction: PersistenceTransaction
    ) => PersistencePromise<T>
  ): Promise<T>;
}

/**
 * Interface to schedule periodic tasks within SDK.
 */
export interface Scheduler {
  readonly started: boolean;
  start(): void;
  stop(): void;
}
