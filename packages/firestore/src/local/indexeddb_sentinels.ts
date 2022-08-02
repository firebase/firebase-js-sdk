/**
 * @license
 * Copyright 2022 Google LLC
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

import { BatchId, TargetId } from '../core/types';
import { ResourcePath } from '../model/path';
import { fail } from '../util/assert';

import {
  EncodedResourcePath,
  encodeResourcePath
} from './encoded_resource_path';
import { DbDocumentMutation } from './indexeddb_schema';
import { DbRemoteDocumentStore as DbRemoteDocumentStoreLegacy } from './indexeddb_schema_legacy';

// This file contains static constants and helper functions for IndexedDB.
// It is split from indexeddb_schema to allow for minification.

/** A timestamp type that can be used in IndexedDb keys. */
export type DbTimestampKey = [/* seconds */ number, /* nanos */ number];

// The key for the singleton object in the DbPrimaryClient is a single string.
export type DbPrimaryClientKey = typeof DbPrimaryClientKey;

/**
 * Name of the IndexedDb object store.
 *
 * Note that the name 'owner' is chosen to ensure backwards compatibility with
 * older clients that only supported single locked access to the persistence
 * layer.
 */
export const DbPrimaryClientStore = 'owner';

/**
 * The key string used for the single object that exists in the
 * DbPrimaryClient store.
 */

export const DbPrimaryClientKey = 'owner';

/** Object keys in the 'mutationQueues' store are userId strings. */
export type DbMutationQueueKey = string;

/** Name of the IndexedDb object store.  */
export const DbMutationQueueStore = 'mutationQueues';

/** Keys are automatically assigned via the userId property. */
export const DbMutationQueueKeyPath = 'userId';

/** The 'mutations' store  is keyed by batch ID. */
export type DbMutationBatchKey = BatchId;

/** Name of the IndexedDb object store.  */
export const DbMutationBatchStore = 'mutations';

/** Keys are automatically assigned via the userId, batchId properties. */
export const DbMutationBatchKeyPath = 'batchId';

/** The index name for lookup of mutations by user. */

export const DbMutationBatchUserMutationsIndex = 'userMutationsIndex';

/** The user mutations index is keyed by [userId, batchId] pairs. */
export const DbMutationBatchUserMutationsKeyPath = ['userId', 'batchId'];

/**
 * The key for a db document mutation, which is made up of a userID, path, and
 * batchId. Note that the path must be serialized into a form that indexedDB can
 * sort.
 */
export type DbDocumentMutationKey = [string, EncodedResourcePath, BatchId];

/**
 * Creates a [userId] key for use in the DbDocumentMutations index to iterate
 * over all of a user's document mutations.
 */
export function newDbDocumentMutationPrefixForUser(userId: string): [string] {
  return [userId];
}

/**
 * Creates a [userId, encodedPath] key for use in the DbDocumentMutations
 * index to iterate over all at document mutations for a given path or lower.
 */
export function newDbDocumentMutationPrefixForPath(
  userId: string,
  path: ResourcePath
): [string, EncodedResourcePath] {
  return [userId, encodeResourcePath(path)];
}

/**
 * Creates a full index key of [userId, encodedPath, batchId] for inserting
 * and deleting into the DbDocumentMutations index.
 */
export function newDbDocumentMutationKey(
  userId: string,
  path: ResourcePath,
  batchId: BatchId
): DbDocumentMutationKey {
  return [userId, encodeResourcePath(path), batchId];
}

/**
 * Because we store all the useful information for this store in the key,
 * there is no useful information to store as the value. The raw (unencoded)
 * path cannot be stored because IndexedDb doesn't store prototype
 * information.
 */
export const DbDocumentMutationPlaceholder: DbDocumentMutation = {};

export const DbDocumentMutationStore = 'documentMutations';

export const DbRemoteDocumentStore = 'remoteDocumentsV14';

/**
 * A key in the 'remoteDocumentsV14' object store is an array containing the
 * collection path, the collection group, the read time and the document id.
 */
export type DbRemoteDocumentKey = [
  /** path to collection */ string[],
  /** collection group */ string,
  /** read time */ DbTimestampKey,
  /** document ID */ string
];

/**
 * The primary key of the remote documents store, which allows for efficient
 * access by collection path and read time.
 */
export const DbRemoteDocumentKeyPath = [
  'prefixPath',
  'collectionGroup',
  'readTime',
  'documentId'
];

/** An index that provides access to documents by key. */
export const DbRemoteDocumentDocumentKeyIndex = 'documentKeyIndex';

export const DbRemoteDocumentDocumentKeyIndexPath = [
  'prefixPath',
  'collectionGroup',
  'documentId'
];

/**
 * An index that provides access to documents by collection group and read
 * time.
 *
 * This index is used by the index backfiller.
 */
export const DbRemoteDocumentCollectionGroupIndex = 'collectionGroupIndex';

export const DbRemoteDocumentCollectionGroupIndexPath = [
  'collectionGroup',
  'readTime',
  'prefixPath',
  'documentId'
];

export const DbRemoteDocumentGlobalStore = 'remoteDocumentGlobal';

export const DbRemoteDocumentGlobalKey = 'remoteDocumentGlobalKey';

export type DbRemoteDocumentGlobalKey = typeof DbRemoteDocumentGlobalKey;

/**
 * A key in the 'targets' object store is a targetId of the query.
 */
export type DbTargetKey = TargetId;

export const DbTargetStore = 'targets';

/** Keys are automatically assigned via the targetId property. */
export const DbTargetKeyPath = 'targetId';

/** The name of the queryTargets index. */
export const DbTargetQueryTargetsIndexName = 'queryTargetsIndex';

/**
 * The index of all canonicalIds to the targets that they match. This is not
 * a unique mapping because canonicalId does not promise a unique name for all
 * possible queries, so we append the targetId to make the mapping unique.
 */
export const DbTargetQueryTargetsKeyPath = ['canonicalId', 'targetId'];

/**
 * The key for a DbTargetDocument, containing a targetId and an encoded resource
 * path.
 */
export type DbTargetDocumentKey = [TargetId, EncodedResourcePath];

/** Name of the IndexedDb object store.  */
export const DbTargetDocumentStore = 'targetDocuments';

/** Keys are automatically assigned via the targetId, path properties. */
export const DbTargetDocumentKeyPath = ['targetId', 'path'];

/** The index name for the reverse index. */
export const DbTargetDocumentDocumentTargetsIndex = 'documentTargetsIndex';

/** We also need to create the reverse index for these properties. */
export const DbTargetDocumentDocumentTargetsKeyPath = ['path', 'targetId'];

/**
 * The type to represent the single allowed key for the DbTargetGlobal store.
 */
export type DbTargetGlobalKey = typeof DbTargetGlobalKey;
/**
 * The key string used for the single object that exists in the
 * DbTargetGlobal store.
 */
export const DbTargetGlobalKey = 'targetGlobalKey';

export const DbTargetGlobalStore = 'targetGlobal';

/**
 * The key for a DbCollectionParent entry, containing the collection ID
 * and the parent path that contains it. Note that the parent path will be an
 * empty path in the case of root-level collections.
 */
export type DbCollectionParentKey = [string, EncodedResourcePath];

/** Name of the IndexedDb object store. */
export const DbCollectionParentStore = 'collectionParents';

/** Keys are automatically assigned via the collectionId, parent properties. */
export const DbCollectionParentKeyPath = ['collectionId', 'parent'];

/** Name of the IndexedDb object store. */
export const DbClientMetadataStore = 'clientMetadata';

/** Keys are automatically assigned via the clientId properties. */
export const DbClientMetadataKeyPath = 'clientId';

/** Object keys in the 'clientMetadata' store are clientId strings. */
export type DbClientMetadataKey = string;

export type DbBundlesKey = string;

/** Name of the IndexedDb object store. */
export const DbBundleStore = 'bundles';

export const DbBundleKeyPath = 'bundleId';

export type DbNamedQueriesKey = string;

/** Name of the IndexedDb object store. */
export const DbNamedQueryStore = 'namedQueries';

export const DbNamedQueryKeyPath = 'name';

/** The key for each index consisting of just the index id. */
export type DbIndexConfigurationKey = number;

/** Name of the IndexedDb object store. */
export const DbIndexConfigurationStore = 'indexConfiguration';

export const DbIndexConfigurationKeyPath = 'indexId';

/**
 * An index that provides access to the index configurations by collection
 * group.
 *
 * PORTING NOTE: iOS and Android maintain this index in-memory, but this is
 * not possible here as the Web client supports concurrent access to
 * persistence via multi-tab.
 */
export const DbIndexConfigurationCollectionGroupIndex = 'collectionGroupIndex';

export const DbIndexConfigurationCollectionGroupIndexPath = 'collectionGroup';

/** The key for each index state consisting of the index id and its user id. */
export type DbIndexStateKey = [number, string];

/** Name of the IndexedDb object store. */
export const DbIndexStateStore = 'indexState';

export const DbIndexStateKeyPath = ['indexId', 'uid'];

/**
 * An index that provides access to documents in a collection sorted by last
 * update time. Used by the backfiller.
 *
 * PORTING NOTE: iOS and Android maintain this index in-memory, but this is
 * not possible here as the Web client supports concurrent access to
 * persistence via multi-tab.
 */
export const DbIndexStateSequenceNumberIndex = 'sequenceNumberIndex';

export const DbIndexStateSequenceNumberIndexPath = ['uid', 'sequenceNumber'];

/**
 * The key for each index entry consists of the index id and its user id,
 * the encoded array and directional value for the indexed fields as well as
 * an ordered and an encoded document path for the indexed document.
 */
export type DbIndexEntryKey = [
  number,
  string,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  string[]
];

/** Name of the IndexedDb object store. */
export const DbIndexEntryStore = 'indexEntries';

export const DbIndexEntryKeyPath = [
  'indexId',
  'uid',
  'arrayValue',
  'directionalValue',
  'orderedDocumentKey',
  'documentKey'
];

export const DbIndexEntryDocumentKeyIndex = 'documentKeyIndex';

export const DbIndexEntryDocumentKeyIndexPath = [
  'indexId',
  'uid',
  'orderedDocumentKey'
];

export type DbDocumentOverlayKey = [
  /* userId */ string,
  /* collectionPath */ string,
  /* documentId */ string
];

/** Name of the IndexedDb object store. */
export const DbDocumentOverlayStore = 'documentOverlays';

export const DbDocumentOverlayKeyPath = [
  'userId',
  'collectionPath',
  'documentId'
];

export const DbDocumentOverlayCollectionPathOverlayIndex =
  'collectionPathOverlayIndex';

export const DbDocumentOverlayCollectionPathOverlayIndexPath = [
  'userId',
  'collectionPath',
  'largestBatchId'
];

export const DbDocumentOverlayCollectionGroupOverlayIndex =
  'collectionGroupOverlayIndex';

export const DbDocumentOverlayCollectionGroupOverlayIndexPath = [
  'userId',
  'collectionGroup',
  'largestBatchId'
];

// Visible for testing
export const V1_STORES = [
  DbMutationQueueStore,
  DbMutationBatchStore,
  DbDocumentMutationStore,
  DbRemoteDocumentStoreLegacy,
  DbTargetStore,
  DbPrimaryClientStore,
  DbTargetGlobalStore,
  DbTargetDocumentStore
];

// Visible for testing
export const V3_STORES = V1_STORES;
// Note: DbRemoteDocumentChanges is no longer used and dropped with v9.
export const V4_STORES = [...V3_STORES, DbClientMetadataStore];
export const V6_STORES = [...V4_STORES, DbRemoteDocumentGlobalStore];
export const V8_STORES = [...V6_STORES, DbCollectionParentStore];
export const V11_STORES = [...V8_STORES, DbBundleStore, DbNamedQueryStore];
export const V12_STORES = [...V11_STORES, DbDocumentOverlayStore];
export const V13_STORES = [
  DbMutationQueueStore,
  DbMutationBatchStore,
  DbDocumentMutationStore,
  DbRemoteDocumentStore,
  DbTargetStore,
  DbPrimaryClientStore,
  DbTargetGlobalStore,
  DbTargetDocumentStore,
  DbClientMetadataStore,
  DbRemoteDocumentGlobalStore,
  DbCollectionParentStore,
  DbBundleStore,
  DbNamedQueryStore,
  DbDocumentOverlayStore
];
export const V14_STORES = V13_STORES;
export const V15_STORES = [
  ...V14_STORES,
  DbIndexConfigurationStore,
  DbIndexStateStore,
  DbIndexEntryStore
];

/**
 * The list of all default IndexedDB stores used throughout the SDK. This is
 * used when creating transactions so that access across all stores is done
 * atomically.
 */
export const ALL_STORES = V12_STORES;

/** Returns the object stores for the provided schema. */
export function getObjectStores(schemaVersion: number): string[] {
  if (schemaVersion === 15) {
    return V15_STORES;
  } else if (schemaVersion === 14) {
    return V14_STORES;
  } else if (schemaVersion === 13) {
    return V13_STORES;
  } else if (schemaVersion === 12) {
    return V12_STORES;
  } else if (schemaVersion === 11) {
    return V11_STORES;
  } else {
    fail('Only schema version 11 and 12 and 13 are supported');
  }
}
