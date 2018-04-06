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

import * as api from '../protos/firestore_proto_api';
import { BatchId } from '../core/types';
import { TargetId } from '../core/types';
import { ResourcePath } from '../model/path';
import { assert } from '../util/assert';

import { encode, EncodedResourcePath } from './encoded_resource_path';
import { SimpleDbTransaction } from './simple_db';
import { PersistencePromise } from './persistence_promise';
import { SnapshotVersion } from '../core/snapshot_version';

/**
 * Schema Version for the Web client:
 * 1. Initial version including Mutation Queue, Query Cache, and Remote Document
 *    Cache
 * 2. Added targetCount to targetGlobal row.
 */
export const SCHEMA_VERSION = 2;

/**
 * Performs database creation and schema upgrades.
 *
 * Note that in production, this method is only ever used to upgrade the schema
 * to SCHEMA_VERSION. Different values of toVersion are only used for testing
 * and local feature development.
 */
export function createOrUpgradeDb(
  db: IDBDatabase,
  txn: SimpleDbTransaction,
  fromVersion: number,
  toVersion: number
): PersistencePromise<void> {
  // This function currently supports migrating to schema version 1 (Mutation
  // Queue, Query and Remote Document Cache) and schema version 2 (Query
  // counting).
  assert(
    fromVersion < toVersion && fromVersion >= 0 && toVersion <= 2,
    'Unexpected schema upgrade from v${fromVersion} to v{toVersion}.'
  );

  if (fromVersion < 1 && toVersion >= 1) {
    createOwnerStore(db);
    createMutationQueue(db);
    createQueryCache(db);
    createRemoteDocumentCache(db);
  }

  let p = PersistencePromise.resolve();
  if (fromVersion < 2 && toVersion >= 2) {
    p = ensureTargetGlobalExists(txn).next(targetGlobal =>
      saveTargetCount(txn, targetGlobal)
    );
  }
  return p;
}

// TODO(mikelehen): Get rid of "as any" if/when TypeScript fixes their types.
// https://github.com/Microsoft/TypeScript/issues/14322
type KeyPath = any; // tslint:disable-line:no-any

/**
 * Wrapper class to store timestamps (seconds and nanos) in IndexedDb objects.
 */
export class DbTimestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
}

// The key for the singleton object in the 'owner' store is 'owner'.
export type DbOwnerKey = 'owner';

/**
 * A singleton object to be stored in the 'owner' store in IndexedDb.
 *
 * A given database can be owned by a single tab at a given time. That tab
 * must validate that it is still the owner before every write operation and
 * should regularly write an updated timestamp to prevent other tabs from
 * "stealing" ownership of the db.
 */
export class DbOwner {
  /** Name of the IndexedDb object store. */
  static store = 'owner';

  constructor(public ownerId: string, public leaseTimestampMs: number) {}
}

function createOwnerStore(db: IDBDatabase): void {
  db.createObjectStore(DbOwner.store);
}

/** Object keys in the 'mutationQueues' store are userId strings. */
export type DbMutationQueueKey = string;

/**
 * An object to be stored in the 'mutationQueues' store in IndexedDb.
 *
 * Each user gets a single queue of MutationBatches to apply to the server.
 * DbMutationQueue tracks the metadata about the queue.
 */
export class DbMutationQueue {
  /** Name of the IndexedDb object store.  */
  static store = 'mutationQueues';

  /** Keys are automatically assigned via the userId property. */
  static keyPath = 'userId';

  constructor(
    /**
     * The normalized user ID to which this queue belongs.
     */
    public userId: string,
    /**
     * An identifier for the highest numbered batch that has been acknowledged
     * by the server. All MutationBatches in this queue with batchIds less
     * than or equal to this value are considered to have been acknowledged by
     * the server.
     */
    public lastAcknowledgedBatchId: number,
    /**
     * A stream token that was previously sent by the server.
     *
     * See StreamingWriteRequest in datastore.proto for more details about
     * usage.
     *
     * After sending this token, earlier tokens may not be used anymore so
     * only a single stream token is retained.
     */
    public lastStreamToken: string
  ) {}
}

/** keys in the 'mutations' object store are [userId, batchId] pairs. */
export type DbMutationBatchKey = [string, BatchId];

/**
 * An object to be stored in the 'mutations' store in IndexedDb.
 *
 * Represents a batch of user-level mutations intended to be sent to the server
 * in a single write. Each user-level batch gets a separate DbMutationBatch
 * with a new batchId.
 */
export class DbMutationBatch {
  /** Name of the IndexedDb object store.  */
  static store = 'mutations';

  /** Keys are automatically assigned via the userId, batchId properties. */
  static keyPath = ['userId', 'batchId'];

  constructor(
    /**
     * The normalized user ID to which this batch belongs.
     */
    public userId: string,
    /**
     * An identifier for this batch, allocated by the mutation queue in a
     * monotonically increasing manner.
     */
    public batchId: BatchId,
    /**
     * The local write time of the batch, stored as milliseconds since the
     * epoch.
     */
    public localWriteTimeMs: number,
    /**
     * A list of mutations to apply. All mutations will be applied atomically.
     *
     * Mutations are serialized via JsonProtoSerializer.toMutation().
     */
    public mutations: api.Write[]
  ) {}
}

/**
 * The key for a db document mutation, which is made up of a userID, path, and
 * batchId. Note that the path must be serialized into a form that indexedDB can
 * sort.
 */
export type DbDocumentMutationKey = [string, EncodedResourcePath, BatchId];

function createMutationQueue(db: IDBDatabase): void {
  db.createObjectStore(DbMutationQueue.store, {
    keyPath: DbMutationQueue.keyPath
  });

  db.createObjectStore(DbMutationBatch.store, {
    keyPath: DbMutationBatch.keyPath as KeyPath
  });

  db.createObjectStore(DbDocumentMutation.store);
}

/**
 * An object to be stored in the 'documentMutations' store in IndexedDb.
 *
 * A manually maintained index of all the mutation batches that affect a given
 * document key. The rows in this table are references based on the contents of
 * DbMutationBatch.mutations.
 */
export class DbDocumentMutation {
  static store = 'documentMutations';

  /**
   * Creates a [userId] key for use in the DbDocumentMutations index to iterate
   * over all of a user's document mutations.
   */
  static prefixForUser(userId: string): [string] {
    return [userId];
  }

  /**
   * Creates a [userId, encodedPath] key for use in the DbDocumentMutations
   * index to iterate over all at document mutations for a given path or lower.
   */
  static prefixForPath(
    userId: string,
    path: ResourcePath
  ): [string, EncodedResourcePath] {
    return [userId, encode(path)];
  }

  /**
   * Creates a full index key of [userId, encodedPath, batchId] for inserting
   * and deleting into the DbDocumentMutations index.
   */
  static key(
    userId: string,
    path: ResourcePath,
    batchId: BatchId
  ): DbDocumentMutationKey {
    return [userId, encode(path), batchId];
  }

  /**
   * Because we store all the useful information for this store in the key,
   * there is no useful information to store as the value. The raw (unencoded)
   * path cannot be stored because IndexedDb doesn't store prototype
   * information.
   */
  static PLACEHOLDER = new DbDocumentMutation();

  private constructor() {}
}

/**
 * A key in the 'remoteDocuments' object store is a string array containing the
 * segments that make up the path.
 */
export type DbRemoteDocumentKey = string[];

function createRemoteDocumentCache(db: IDBDatabase): void {
  db.createObjectStore(DbRemoteDocument.store);
}

/**
 * Represents the known absence of a document at a particular version.
 * Stored in IndexedDb as part of a DbRemoteDocument object.
 */
export class DbNoDocument {
  constructor(public path: string[], public readTime: DbTimestamp) {}
}

/**
 * An object to be stored in the 'remoteDocuments' store in IndexedDb. It
 * represents either a cached document (if it exists) or a cached "no-document"
 * (if it is known to not exist).
 *
 * Note: This is the persisted equivalent of a MaybeDocument and could perhaps
 * be made more general if necessary.
 */
export class DbRemoteDocument {
  static store = 'remoteDocuments';

  constructor(
    /**
     * Set to an instance of a DbNoDocument if it is known that no document
     * exists.
     */
    public noDocument: DbNoDocument | null,
    /**
     * Set to an instance of a Document if there's a cached version of the
     * document.
     */
    public document: api.Document | null
  ) {}
}

/**
 * A key in the 'targets' object store is a targetId of the query.
 */
export type DbTargetKey = TargetId;

/**
 * The persisted type for a query nested with in the 'targets' store in
 * IndexedDb. We use the proto definitions for these two kinds of queries in
 * order to avoid writing extra serialization logic.
 */
export type DbQuery = api.QueryTarget | api.DocumentsTarget;

/**
 * An object to be stored in the 'targets' store in IndexedDb.
 *
 * This is based on and should be kept in sync with the proto used in the iOS
 * client.
 *
 * Each query the client listens to against the server is tracked on disk so
 * that the query can be efficiently resumed on restart.
 */
export class DbTarget {
  static store = 'targets';

  /** Keys are automatically assigned via the targetId property. */
  static keyPath = 'targetId';

  /** The name of the queryTargets index. */
  static queryTargetsIndexName = 'queryTargetsIndex';

  /**
   * The index of all canonicalIds to the targets that they match. This is not
   * a unique mapping because canonicalId does not promise a unique name for all
   * possible queries, so we append the targetId to make the mapping unique.
   */
  static queryTargetsKeyPath = ['canonicalId', 'targetId'];

  constructor(
    /**
     * An auto-generated sequential numeric identifier for the query.
     *
     * Queries are stored using their canonicalId as the key, but these
     * canonicalIds can be quite long so we additionally assign a unique
     * queryId which can be used by referenced data structures (e.g.
     * indexes) to minimize the on-disk cost.
     */
    public targetId: TargetId,
    /**
     * The canonical string representing this query. This is not unique.
     */
    public canonicalId: string,
    /**
     * The last readTime received from the Watch Service for this query.
     *
     * This is the same value as TargetChange.read_time in the protos.
     */
    public readTime: DbTimestamp,
    /**
     * An opaque, server-assigned token that allows watching a query to be
     * resumed after disconnecting without retransmitting all the data
     * that matches the query. The resume token essentially identifies a
     * point in time from which the server should resume sending results.
     *
     * This is related to the snapshotVersion in that the resumeToken
     * effectively also encodes that value, but the resumeToken is opaque
     * and sometimes encodes additional information.
     *
     * A consequence of this is that the resumeToken should be used when
     * asking the server to reason about where this client is in the watch
     * stream, but the client should use the snapshotVersion for its own
     * purposes.
     *
     * This is the same value as TargetChange.resume_token in the protos.
     */
    public resumeToken: string,
    /**
     * A sequence number representing the last time this query was
     * listened to, used for garbage collection purposes.
     *
     * Conventionally this would be a timestamp value, but device-local
     * clocks are unreliable and they must be able to create new listens
     * even while disconnected. Instead this should be a monotonically
     * increasing number that's incremented on each listen call.
     *
     * This is different from the queryId since the queryId is an
     * immutable identifier assigned to the Query on first use while
     * lastListenSequenceNumber is updated every time the query is
     * listened to.
     */
    public lastListenSequenceNumber: number,
    /**
     * The query for this target.
     *
     * Because canonical ids are not unique we must store the actual query. We
     * use the proto to have an object we can persist without having to
     * duplicate translation logic to and from a `Query` object.
     */
    public query: DbQuery
  ) {}
}

/**
 * The key for a DbTargetDocument, containing a targetId and an encoded resource
 * path.
 */
export type DbTargetDocumentKey = [TargetId, EncodedResourcePath];

/**
 * An object representing an association between a target and a document.
 * Stored in the targetDocument object store to store the documents tracked by a
 * particular target.
 */
export class DbTargetDocument {
  /** Name of the IndexedDb object store.  */
  static store = 'targetDocuments';

  /** Keys are automatically assigned via the targetId, path properties. */
  static keyPath = ['targetId', 'path'];

  /** The index name for the reverse index. */
  static documentTargetsIndex = 'documentTargetsIndex';

  /** We also need to create the reverse index for these properties. */
  static documentTargetsKeyPath = ['path', 'targetId'];

  constructor(
    /**
     * The targetId identifying a target.
     */
    public targetId: TargetId,
    /**
     * The path to the document, as encoded in the key.
     */
    public path: EncodedResourcePath
  ) {}
}

/**
 * The type to represent the single allowed key for the DbTargetGlobal store.
 */
export type DbTargetGlobalKey = typeof DbTargetGlobal.key;

/**
 * A record of global state tracked across all Targets, tracked separately
 * to avoid the need for extra indexes.
 *
 * This should be kept in-sync with the proto used in the iOS client.
 */
export class DbTargetGlobal {
  /**
   * The key string used for the single object that exists in the
   * DbTargetGlobal store.
   */
  static key = 'targetGlobalKey';
  static store = 'targetGlobal';

  constructor(
    /**
     * The highest numbered target id across all targets.
     *
     * See DbTarget.targetId.
     */
    public highestTargetId: TargetId,
    /**
     * The highest numbered lastListenSequenceNumber across all targets.
     *
     * See DbTarget.lastListenSequenceNumber.
     */
    public highestListenSequenceNumber: number,
    /**
     * A global snapshot version representing the last consistent snapshot we
     * received from the backend. This is monotonically increasing and any
     * snapshots received from the backend prior to this version (e.g. for
     * targets resumed with a resumeToken) should be suppressed (buffered)
     * until the backend has caught up to this snapshot version again. This
     * prevents our cache from ever going backwards in time.
     */
    public lastRemoteSnapshotVersion: DbTimestamp,
    /**
     * The number of targets persisted.
     */
    public targetCount: number
  ) {}
}

function createQueryCache(db: IDBDatabase): void {
  const targetDocumentsStore = db.createObjectStore(DbTargetDocument.store, {
    keyPath: DbTargetDocument.keyPath as KeyPath
  });
  targetDocumentsStore.createIndex(
    DbTargetDocument.documentTargetsIndex,
    DbTargetDocument.documentTargetsKeyPath,
    { unique: true }
  );

  const targetStore = db.createObjectStore(DbTarget.store, {
    keyPath: DbTarget.keyPath
  });

  // NOTE: This is unique only because the TargetId is the suffix.
  targetStore.createIndex(
    DbTarget.queryTargetsIndexName,
    DbTarget.queryTargetsKeyPath,
    { unique: true }
  );
  db.createObjectStore(DbTargetGlobal.store);
}

/**
 * Counts the number of targets persisted and adds that value to the target
 * global singleton.
 */
function saveTargetCount(
  txn: SimpleDbTransaction,
  metadata: DbTargetGlobal
): PersistencePromise<void> {
  const globalStore = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
    DbTargetGlobal.store
  );
  const targetStore = txn.store<DbTargetKey, DbTarget>(DbTarget.store);
  return targetStore.count().next(count => {
    metadata.targetCount = count;
    return globalStore.put(DbTargetGlobal.key, metadata);
  });
}

/**
 * Ensures that the target global singleton row exists by adding it if it's
 * missing.
 *
 * @param {IDBTransaction} txn The version upgrade transaction for indexeddb
 */
function ensureTargetGlobalExists(
  txn: SimpleDbTransaction
): PersistencePromise<DbTargetGlobal> {
  const globalStore = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
    DbTargetGlobal.store
  );
  return globalStore.get(DbTargetGlobal.key).next(metadata => {
    if (metadata != null) {
      return PersistencePromise.resolve(metadata);
    } else {
      metadata = new DbTargetGlobal(
        /*highestTargetId=*/ 0,
        /*lastListenSequenceNumber=*/ 0,
        SnapshotVersion.MIN.toTimestamp(),
        /*targetCount=*/ 0
      );
      return globalStore.put(DbTargetGlobal.key, metadata).next(() => metadata);
    }
  });
}

/**
 * The list of all default IndexedDB stores used throughout the SDK. This is
 * used when creating transactions so that access across all stores is done
 * atomically.
 */
export const ALL_STORES = [
  DbMutationQueue.store,
  DbMutationBatch.store,
  DbDocumentMutation.store,
  DbRemoteDocument.store,
  DbTarget.store,
  DbOwner.store,
  DbTargetGlobal.store,
  DbTargetDocument.store
];
