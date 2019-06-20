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

import { BatchId, ListenSequenceNumber, TargetId } from '../core/types';
import { ResourcePath } from '../model/path';
import * as api from '../protos/firestore_proto_api';
import { assert } from '../util/assert';

import { SnapshotVersion } from '../core/snapshot_version';
import { BATCHID_UNKNOWN } from '../model/mutation_batch';
import { decode, encode, EncodedResourcePath } from './encoded_resource_path';
import { removeMutationBatch } from './indexeddb_mutation_queue';
import { getHighestListenSequenceNumber } from './indexeddb_query_cache';
import { dbDocumentSize } from './indexeddb_remote_document_cache';
import { LocalSerializer } from './local_serializer';
import { MemoryCollectionParentIndex } from './memory_index_manager';
import { PersistencePromise } from './persistence_promise';
import { SimpleDbSchemaConverter, SimpleDbTransaction } from './simple_db';

/**
 * Schema Version for the Web client:
 * 1. Initial version including Mutation Queue, Query Cache, and Remote Document
 *    Cache
 * 2. Used to ensure a targetGlobal object exists and add targetCount to it. No
 *    longer required because migration 3 unconditionally clears it.
 * 3. Dropped and re-created Query Cache to deal with cache corruption related
 *    to limbo resolution. Addresses
 *    https://github.com/firebase/firebase-ios-sdk/issues/1548
 * 4. Multi-Tab Support.
 * 5. Removal of held write acks.
 * 6. Create document global for tracking document cache size.
 * 7. Ensure every cached document has a sentinel row with a sequence number.
 * 8. Add collection-parent index for Collection Group queries.
 */
export const SCHEMA_VERSION = 8;

/** Performs database creation and schema upgrades. */
export class SchemaConverter implements SimpleDbSchemaConverter {
  constructor(private readonly serializer: LocalSerializer) {}

  /**
   * Performs database creation and schema upgrades.
   *
   * Note that in production, this method is only ever used to upgrade the schema
   * to SCHEMA_VERSION. Different values of toVersion are only used for testing
   * and local feature development.
   */
  createOrUpgrade(
    db: IDBDatabase,
    txn: SimpleDbTransaction,
    fromVersion: number,
    toVersion: number
  ): PersistencePromise<void> {
    assert(
      fromVersion < toVersion &&
        fromVersion >= 0 &&
        toVersion <= SCHEMA_VERSION,
      `Unexpected schema upgrade from v${fromVersion} to v{toVersion}.`
    );

    if (fromVersion < 1 && toVersion >= 1) {
      createPrimaryClientStore(db);
      createMutationQueue(db);
      createQueryCache(db);
      createRemoteDocumentCache(db);
    }

    // Migration 2 to populate the targetGlobal object no longer needed since
    // migration 3 unconditionally clears it.

    let p = PersistencePromise.resolve();
    if (fromVersion < 3 && toVersion >= 3) {
      // Brand new clients don't need to drop and recreate--only clients that
      // potentially have corrupt data.
      if (fromVersion !== 0) {
        dropQueryCache(db);
        createQueryCache(db);
      }
      p = p.next(() => writeEmptyTargetGlobalEntry(txn));
    }

    if (fromVersion < 4 && toVersion >= 4) {
      if (fromVersion !== 0) {
        // Schema version 3 uses auto-generated keys to generate globally unique
        // mutation batch IDs (this was previously ensured internally by the
        // client). To migrate to the new schema, we have to read all mutations
        // and write them back out. We preserve the existing batch IDs to guarantee
        // consistency with other object stores. Any further mutation batch IDs will
        // be auto-generated.
        p = p.next(() => upgradeMutationBatchSchemaAndMigrateData(db, txn));
      }

      p = p.next(() => {
        createClientMetadataStore(db);
        createRemoteDocumentChangesStore(db);
      });
    }

    if (fromVersion < 5 && toVersion >= 5) {
      p = p.next(() => this.removeAcknowledgedMutations(txn));
    }

    if (fromVersion < 6 && toVersion >= 6) {
      p = p.next(() => {
        createDocumentGlobalStore(db);
        return this.addDocumentGlobal(txn);
      });
    }

    if (fromVersion < 7 && toVersion >= 7) {
      p = p.next(() => this.ensureSequenceNumbers(txn));
    }

    if (fromVersion < 8 && toVersion >= 8) {
      p = p.next(() => this.createCollectionParentIndex(db, txn));
    }

    return p;
  }

  private addDocumentGlobal(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    let byteCount = 0;
    return txn
      .store<DbRemoteDocumentKey, DbRemoteDocument>(DbRemoteDocument.store)
      .iterate((_, doc) => {
        byteCount += dbDocumentSize(doc);
      })
      .next(() => {
        const metadata = new DbRemoteDocumentGlobal(byteCount);
        return txn
          .store<DbRemoteDocumentGlobalKey, DbRemoteDocumentGlobal>(
            DbRemoteDocumentGlobal.store
          )
          .put(DbRemoteDocumentGlobal.key, metadata);
      });
  }

  private removeAcknowledgedMutations(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    const queuesStore = txn.store<DbMutationQueueKey, DbMutationQueue>(
      DbMutationQueue.store
    );
    const mutationsStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
      DbMutationBatch.store
    );

    return queuesStore.loadAll().next(queues => {
      return PersistencePromise.forEach(queues, (queue: DbMutationQueue) => {
        const range = IDBKeyRange.bound(
          [queue.userId, BATCHID_UNKNOWN],
          [queue.userId, queue.lastAcknowledgedBatchId]
        );

        return mutationsStore
          .loadAll(DbMutationBatch.userMutationsIndex, range)
          .next(dbBatches => {
            return PersistencePromise.forEach(
              dbBatches,
              (dbBatch: DbMutationBatch) => {
                assert(
                  dbBatch.userId === queue.userId,
                  `Cannot process batch ${dbBatch.batchId} from unexpected user`
                );
                const batch = this.serializer.fromDbMutationBatch(dbBatch);

                return removeMutationBatch(txn, queue.userId, batch).next(
                  () => {}
                );
              }
            );
          });
      });
    });
  }

  /**
   * Ensures that every document in the remote document cache has a corresponding sentinel row
   * with a sequence number. Missing rows are given the most recently used sequence number.
   */
  private ensureSequenceNumbers(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    const documentTargetStore = txn.store<
      DbTargetDocumentKey,
      DbTargetDocument
    >(DbTargetDocument.store);
    const documentsStore = txn.store<DbRemoteDocumentKey, DbRemoteDocument>(
      DbRemoteDocument.store
    );

    return getHighestListenSequenceNumber(txn).next(currentSequenceNumber => {
      const writeSentinelKey = (
        path: ResourcePath
      ): PersistencePromise<void> => {
        return documentTargetStore.put(
          new DbTargetDocument(0, encode(path), currentSequenceNumber)
        );
      };

      const promises: Array<PersistencePromise<void>> = [];
      return documentsStore
        .iterate((key, doc) => {
          const path = new ResourcePath(key);
          const docSentinelKey = sentinelKey(path);
          promises.push(
            documentTargetStore.get(docSentinelKey).next(maybeSentinel => {
              if (!maybeSentinel) {
                return writeSentinelKey(path);
              } else {
                return PersistencePromise.resolve();
              }
            })
          );
        })
        .next(() => PersistencePromise.waitFor(promises));
    });
  }

  private createCollectionParentIndex(
    db: IDBDatabase,
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    // Create the index.
    db.createObjectStore(DbCollectionParent.store, {
      keyPath: DbCollectionParent.keyPath
    });

    const collectionParentsStore = txn.store<
      DbCollectionParentKey,
      DbCollectionParent
    >(DbCollectionParent.store);

    // Helper to add an index entry iff we haven't already written it.
    const cache = new MemoryCollectionParentIndex();
    const addEntry = (
      collectionPath: ResourcePath
    ): PersistencePromise<void> | undefined => {
      if (cache.add(collectionPath)) {
        const collectionId = collectionPath.lastSegment();
        const parentPath = collectionPath.popLast();
        return collectionParentsStore.put({
          collectionId,
          parent: encode(parentPath)
        });
      }
    };

    // Index existing remote documents.
    return txn
      .store<DbRemoteDocumentKey, DbRemoteDocument>(DbRemoteDocument.store)
      .iterate({ keysOnly: true }, (pathSegments, _) => {
        const path = new ResourcePath(pathSegments);
        return addEntry(path.popLast());
      })
      .next(() => {
        // Index existing mutations.
        return txn
          .store<DbDocumentMutationKey, DbDocumentMutation>(
            DbDocumentMutation.store
          )
          .iterate({ keysOnly: true }, ([userID, encodedPath, batchId], _) => {
            const path = decode(encodedPath);
            return addEntry(path.popLast());
          });
      });
  }
}

function sentinelKey(path: ResourcePath): DbTargetDocumentKey {
  return [0, encode(path)];
}

/**
 * Wrapper class to store timestamps (seconds and nanos) in IndexedDb objects.
 */
export class DbTimestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
}

// The key for the singleton object in the DbPrimaryClient is a single string.
export type DbPrimaryClientKey = typeof DbPrimaryClient.key;

/**
 * A singleton object to be stored in the 'owner' store in IndexedDb.
 *
 * A given database can have a single primary tab assigned at a given time. That
 * tab must validate that it is still holding the primary lease before every
 * operation that requires locked access. The primary tab should regularly
 * write an updated timestamp to this lease to prevent other tabs from
 * "stealing" the primary lease
 */
export class DbPrimaryClient {
  /**
   * Name of the IndexedDb object store.
   *
   * Note that the name 'owner' is chosen to ensure backwards compatibility with
   * older clients that only supported single locked access to the persistence
   * layer.
   */
  static store = 'owner';

  /**
   * The key string used for the single object that exists in the
   * DbPrimaryClient store.
   */
  static key = 'owner';

  constructor(
    public ownerId: string,
    /** Whether to allow shared access from multiple tabs. */
    public allowTabSynchronization: boolean,
    public leaseTimestampMs: number
  ) {}
}

function createPrimaryClientStore(db: IDBDatabase): void {
  db.createObjectStore(DbPrimaryClient.store);
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
     *
     * NOTE: this is deprecated and no longer used by the code.
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

/** The 'mutations' store  is keyed by batch ID. */
export type DbMutationBatchKey = BatchId;

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
  static keyPath = 'batchId';

  /** The index name for lookup of mutations by user. */
  static userMutationsIndex = 'userMutationsIndex';

  /** The user mutations index is keyed by [userId, batchId] pairs. */
  static userMutationsKeyPath = ['userId', 'batchId'];

  constructor(
    /**
     * The normalized user ID to which this batch belongs.
     */
    public userId: string,
    /**
     * An identifier for this batch, allocated using an auto-generated key.
     */
    public batchId: BatchId,
    /**
     * The local write time of the batch, stored as milliseconds since the
     * epoch.
     */
    public localWriteTimeMs: number,
    /**
     * A list of "mutations" that represent a partial base state from when this
     * write batch was initially created. During local application of the write
     * batch, these baseMutations are applied prior to the real writes in order
     * to override certain document fields from the remote document cache. This
     * is necessary in the case of non-idempotent writes (e.g. `increment()`
     * transforms) to make sure that the local view of the modified documents
     * doesn't flicker if the remote document cache receives the result of the
     * non-idempotent write before the write is removed from the queue.
     *
     * These mutations are never sent to the backend.
     */
    public baseMutations: api.Write[] | undefined,
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

  const mutationBatchesStore = db.createObjectStore(DbMutationBatch.store, {
    keyPath: DbMutationBatch.keyPath,
    autoIncrement: true
  });
  mutationBatchesStore.createIndex(
    DbMutationBatch.userMutationsIndex,
    DbMutationBatch.userMutationsKeyPath,
    { unique: true }
  );

  db.createObjectStore(DbDocumentMutation.store);
}

/**
 * Upgrade function to migrate the 'mutations' store from V1 to V3. Loads
 * and rewrites all data.
 */
function upgradeMutationBatchSchemaAndMigrateData(
  db: IDBDatabase,
  txn: SimpleDbTransaction
): PersistencePromise<void> {
  const v1MutationsStore = txn.store<[string, number], DbMutationBatch>(
    DbMutationBatch.store
  );
  return v1MutationsStore.loadAll().next(existingMutations => {
    db.deleteObjectStore(DbMutationBatch.store);

    const mutationsStore = db.createObjectStore(DbMutationBatch.store, {
      keyPath: DbMutationBatch.keyPath,
      autoIncrement: true
    });
    mutationsStore.createIndex(
      DbMutationBatch.userMutationsIndex,
      DbMutationBatch.userMutationsKeyPath,
      { unique: true }
    );

    const v3MutationsStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
      DbMutationBatch.store
    );
    const writeAll = existingMutations.map(mutation =>
      v3MutationsStore.put(mutation)
    );

    return PersistencePromise.waitFor(writeAll);
  });
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
 * Represents a document that is known to exist but whose data is unknown.
 * Stored in IndexedDb as part of a DbRemoteDocument object.
 */
export class DbUnknownDocument {
  constructor(public path: string[], public version: DbTimestamp) {}
}

/**
 * An object to be stored in the 'remoteDocuments' store in IndexedDb.
 * It represents either:
 *
 * - A complete document.
 * - A "no document" representing a document that is known not to exist (at
 * some version).
 * - An "unknown document" representing a document that is known to exist (at
 * some version) but whose contents are unknown.
 *
 * Note: This is the persisted equivalent of a MaybeDocument and could perhaps
 * be made more general if necessary.
 */
export class DbRemoteDocument {
  static store = 'remoteDocuments';

  constructor(
    /**
     * Set to an instance of DbUnknownDocument if the data for a document is
     * not known, but it is known that a document exists at the specified
     * version (e.g. it had a successful update applied to it)
     */
    public unknownDocument: DbUnknownDocument | null | undefined,
    /**
     * Set to an instance of a DbNoDocument if it is known that no document
     * exists.
     */
    public noDocument: DbNoDocument | null,
    /**
     * Set to an instance of a Document if there's a cached version of the
     * document.
     */
    public document: api.Document | null,
    /**
     * Documents that were written to the remote document store based on
     * a write acknowledgment are marked with `hasCommittedMutations`. These
     * documents are potentially inconsistent with the backend's copy and use
     * the write's commit version as their document version.
     */
    public hasCommittedMutations: boolean | undefined
  ) {}
}

/**
 * Contains a single entry that has metadata about the remote document cache.
 */
export class DbRemoteDocumentGlobal {
  static store = 'remoteDocumentGlobal';

  static key = 'remoteDocumentGlobalKey';

  /**
   * @param byteSize Approximately the total size in bytes of all the documents in the document
   * cache.
   */
  constructor(public byteSize: number) {}
}

export type DbRemoteDocumentGlobalKey = typeof DbRemoteDocumentGlobal.key;

function createDocumentGlobalStore(db: IDBDatabase): void {
  db.createObjectStore(DbRemoteDocumentGlobal.store);
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
 * An object representing an association between a target and a document, or a
 * sentinel row marking the last sequence number at which a document was used.
 * Each document cached must have a corresponding sentinel row before lru
 * garbage collection is enabled.
 *
 * The target associations and sentinel rows are co-located so that orphaned
 * documents and their sequence numbers can be identified efficiently via a scan
 * of this store.
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
     * The targetId identifying a target or 0 for a sentinel row.
     */
    public targetId: TargetId,
    /**
     * The path to the document, as encoded in the key.
     */
    public path: EncodedResourcePath,
    /**
     * If this is a sentinel row, this should be the sequence number of the last
     * time the document specified by `path` was used. Otherwise, it should be
     * `undefined`.
     */
    public sequenceNumber?: ListenSequenceNumber
  ) {
    assert(
      (targetId === 0) === (sequenceNumber !== undefined),
      'A target-document row must either have targetId == 0 and a defined sequence number, or a non-zero targetId and no sequence number'
    );
  }
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

/**
 * The key for a DbCollectionParent entry, containing the collection ID
 * and the parent path that contains it. Note that the parent path will be an
 * empty path in the case of root-level collections.
 */
export type DbCollectionParentKey = [string, EncodedResourcePath];

/**
 * An object representing an association between a Collection id (e.g. 'messages')
 * to a parent path (e.g. '/chats/123') that contains it as a (sub)collection.
 * This is used to efficiently find all collections to query when performing
 * a Collection Group query.
 */
export class DbCollectionParent {
  /** Name of the IndexedDb object store. */
  static store = 'collectionParents';

  /** Keys are automatically assigned via the collectionId, parent properties. */
  static keyPath = ['collectionId', 'parent'];

  constructor(
    /**
     * The collectionId (e.g. 'messages')
     */
    public collectionId: string,
    /**
     * The path to the parent (either a document location or an empty path for
     * a root-level collection).
     */
    public parent: EncodedResourcePath
  ) {}
}

function createQueryCache(db: IDBDatabase): void {
  const targetDocumentsStore = db.createObjectStore(DbTargetDocument.store, {
    keyPath: DbTargetDocument.keyPath
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

function dropQueryCache(db: IDBDatabase): void {
  db.deleteObjectStore(DbTargetDocument.store);
  db.deleteObjectStore(DbTarget.store);
  db.deleteObjectStore(DbTargetGlobal.store);
}

/**
 * Creates the target global singleton row.
 *
 * @param {IDBTransaction} txn The version upgrade transaction for indexeddb
 */
function writeEmptyTargetGlobalEntry(
  txn: SimpleDbTransaction
): PersistencePromise<void> {
  const globalStore = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
    DbTargetGlobal.store
  );
  const metadata = new DbTargetGlobal(
    /*highestTargetId=*/ 0,
    /*lastListenSequenceNumber=*/ 0,
    SnapshotVersion.MIN.toTimestamp(),
    /*targetCount=*/ 0
  );
  return globalStore.put(DbTargetGlobal.key, metadata);
}

/**
 * An object store to store the keys of changed documents. This is used to
 * facilitate storing document changelogs in the Remote Document Cache.
 *
 * PORTING NOTE: This is used for change propagation during multi-tab syncing
 * and not needed on iOS and Android.
 */
export class DbRemoteDocumentChanges {
  /** Name of the IndexedDb object store.  */
  static store = 'remoteDocumentChanges';

  /** Keys are auto-generated via the `id` property. */
  static keyPath = 'id';

  /** The auto-generated key of this entry. */
  id?: number;

  constructor(
    /** The keys of the changed documents. */
    public changes: EncodedResourcePath[]
  ) {}
}

/*
 * The key for DbRemoteDocumentChanges, consisting of an auto-incrementing
 * number.
 */
export type DbRemoteDocumentChangesKey = number;

function createRemoteDocumentChangesStore(db: IDBDatabase): void {
  db.createObjectStore(DbRemoteDocumentChanges.store, {
    keyPath: 'id',
    autoIncrement: true
  });
}

/**
 * A record of the metadata state of each client.
 *
 * PORTING NOTE: This is used to synchronize multi-tab state and does not need
 * to be ported to iOS or Android.
 */
export class DbClientMetadata {
  /** Name of the IndexedDb object store. */
  static store = 'clientMetadata';

  /** Keys are automatically assigned via the clientId properties. */
  static keyPath = 'clientId';

  constructor(
    /** The auto-generated client id assigned at client startup. */
    public clientId: string,
    /** The last time this state was updated. */
    public updateTimeMs: number,
    /** Whether the client's network connection is enabled. */
    public networkEnabled: boolean,
    /** Whether this client is running in a foreground tab. */
    public inForeground: boolean,
    /**
     * The last change read from the DbRemoteDocumentChanges store.
     * Can be undefined for backwards compatibility.
     */
    public lastProcessedDocumentChangeId: number | undefined
  ) {}
}

/** Object keys in the 'clientMetadata' store are clientId strings. */
export type DbClientMetadataKey = string;

function createClientMetadataStore(db: IDBDatabase): void {
  db.createObjectStore(DbClientMetadata.store, {
    keyPath: DbClientMetadata.keyPath
  });
}

// Visible for testing
export const V1_STORES = [
  DbMutationQueue.store,
  DbMutationBatch.store,
  DbDocumentMutation.store,
  DbRemoteDocument.store,
  DbTarget.store,
  DbPrimaryClient.store,
  DbTargetGlobal.store,
  DbTargetDocument.store
];

// V2 is no longer usable (see comment at top of file)

// Visible for testing
export const V3_STORES = V1_STORES;

// Visible for testing
export const V4_STORES = [
  ...V3_STORES,
  DbClientMetadata.store,
  DbRemoteDocumentChanges.store
];

// V5 does not change the set of stores.

export const V6_STORES = [...V4_STORES, DbRemoteDocumentGlobal.store];

// V7 does not change the set of stores.

export const V8_STORES = [...V6_STORES, DbCollectionParent.store];

/**
 * The list of all default IndexedDB stores used throughout the SDK. This is
 * used when creating transactions so that access across all stores is done
 * atomically.
 */
export const ALL_STORES = V8_STORES;
