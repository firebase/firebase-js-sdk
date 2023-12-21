import { PersistenceTransaction } from '../local/persistence_transaction';
import { Query } from '../core/query';
import { QueryContext } from '../local/query_context';
import { PersistencePromise } from '../local/persistence_promise';
import { DocumentMap } from '../model/collections';
import { IndexType} from '../local/index_manager';
import { LocalDocumentsView } from '../local/local_documents_view';
import {FieldIndex, IndexOffset} from "../model/field_index";
import {Target} from "../core/target";
import {DocumentKey} from "../model/document_key";
import {User} from "../auth/user";

/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export interface FieldIndexManagementApi {
  indexAutoCreationEnabled: boolean;

  createCacheIndexes(
    transaction: PersistenceTransaction,
    user: User,
    query: Query,
    context: QueryContext,
    resultSize: number
  ): PersistencePromise<void>;

  performQueryUsingIndex(
    transaction: PersistenceTransaction,
    user: User,
    localDocumentsView: LocalDocumentsView,
    query: Query
  ): PersistencePromise<DocumentMap | null>;

  /**
   * Adds a field path index.
   *
   * Values for this index are persisted via the index backfill, which runs
   * asynchronously in the background. Once the first values are written,
   * an index can be used to serve partial results for any matching queries.
   * Any unindexed portion of the database will continue to be served via
   * collection scons.
   */
  addFieldIndex(
    transaction: PersistenceTransaction,
    user: User,
    index: FieldIndex
  ): PersistencePromise<void>;

  /** Removes the given field index and deletes all index values. */
  deleteFieldIndex(
    transaction: PersistenceTransaction,
    index: FieldIndex
  ): PersistencePromise<void>;

  /** Removes all field indexes and deletes all index values. */
  deleteAllFieldIndexes(
    transaction: PersistenceTransaction
  ): PersistencePromise<void>;

  /** Creates a full matched field index which serves the given target. */
  createTargetIndexes(
    transaction: PersistenceTransaction,
    user: User,
    target: Target
  ): PersistencePromise<void>;

  /**
   * Returns a list of field indexes that correspond to the specified collection
   * group.
   *
   * @param collectionGroup The collection group to get matching field indexes
   * for.
   * @return A collection of field indexes for the specified collection group.
   */
  getFieldIndexes(
    transaction: PersistenceTransaction,
    user: User,
    collectionGroup: string
  ): PersistencePromise<FieldIndex[]>;

  /** Returns all configured field indexes. */
  getFieldIndexes(
    transaction: PersistenceTransaction,
    user: User
  ): PersistencePromise<FieldIndex[]>;

  /**
   * Returns the type of index (if any) that can be used to serve the given
   * target.
   */
  getIndexType(
    transaction: PersistenceTransaction,
    user: User,
    target: Target
  ): PersistencePromise<IndexType>;

  /**
   * Returns the documents that match the given target based on the provided
   * index or `null` if the target does not have a matching index.
   */
  getDocumentsMatchingTarget(
    transaction: PersistenceTransaction,
    user: User,
    target: Target
  ): PersistencePromise<DocumentKey[] | null>;

  /**
   * Returns the next collection group to update. Returns `null` if no group
   * exists.
   */
  getNextCollectionGroupToUpdate(
    transaction: PersistenceTransaction,
    user: User
  ): PersistencePromise<string | null>;

  /**
   * Sets the collection group's latest read time.
   *
   * This method updates the index offset for all field indices for the
   * collection group and increments their sequence number. Subsequent calls to
   * `getNextCollectionGroupToUpdate()` will return a different collection group
   * (unless only one collection group is configured).
   */
  updateCollectionGroup(
    transaction: PersistenceTransaction,
    user: User,
    collectionGroup: string,
    offset: IndexOffset
  ): PersistencePromise<void>;

  /** Updates the index entries for the provided documents. */
  updateIndexEntries(
    transaction: PersistenceTransaction,
    user: User,
    documents: DocumentMap
  ): PersistencePromise<void>;

  /**
   * Iterates over all field indexes that are used to serve the given target,
   * and returns the minimum offset of them all.
   */
  getMinOffset(
    transaction: PersistenceTransaction,
    user: User,
    target: Target
  ): PersistencePromise<IndexOffset>;

  /** Returns the minimum offset for the given collection group. */
  getMinOffsetFromCollectionGroup(
    transaction: PersistenceTransaction,
    user: User,
    collectionGroup: string
  ): PersistencePromise<IndexOffset>;

}
