/**
 * @license
 * Copyright 2019 Google LLC
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
import { Bound } from '../core/bound';
import { DatabaseId } from '../core/database_info';
import {
  CompositeFilter,
  CompositeOperator,
  FieldFilter,
  Filter,
  Operator
} from '../core/filter';
import {
  canonifyTarget,
  newTarget,
  Target,
  targetEquals,
  targetGetArrayValues,
  targetGetLowerBound,
  targetGetNotInValues,
  targetGetSegmentCount,
  targetGetUpperBound,
  targetHasLimit
} from '../core/target';
import { FirestoreIndexValueWriter } from '../index/firestore_index_value_writer';
import { IndexByteEncoder } from '../index/index_byte_encoder';
import { IndexEntry, indexEntryComparator } from '../index/index_entry';
import { documentKeySet, DocumentMap } from '../model/collections';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  FieldIndex,
  fieldIndexGetArraySegment,
  fieldIndexGetDirectionalSegments,
  fieldIndexGetKeyOrder,
  fieldIndexToString,
  IndexKind,
  IndexOffset,
  indexOffsetComparator,
  IndexSegment
} from '../model/field_index';
import { FieldPath, ResourcePath } from '../model/path';
import { TargetIndexMatcher } from '../model/target_index_matcher';
import { isArray, refValue } from '../model/values';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { debugAssert, fail, hardAssert } from '../util/assert';
import { logDebug } from '../util/log';
import { getDnfTerms } from '../util/logic_utils';
import { immediateSuccessor, primitiveComparator } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { diffSortedSets, SortedSet } from '../util/sorted_set';

import {
  decodeResourcePath,
  encodeResourcePath
} from './encoded_resource_path';
import { IndexManager, IndexType } from './index_manager';
import {
  DbCollectionParent,
  DbIndexConfiguration,
  DbIndexEntry,
  DbIndexState
} from './indexeddb_schema';
import {
  DbCollectionParentKey,
  DbCollectionParentStore,
  DbIndexConfigurationCollectionGroupIndex,
  DbIndexConfigurationKey,
  DbIndexConfigurationStore,
  DbIndexEntryDocumentKeyIndex,
  DbIndexEntryKey,
  DbIndexEntryStore,
  DbIndexStateKey,
  DbIndexStateSequenceNumberIndex,
  DbIndexStateStore
} from './indexeddb_sentinels';
import { getStore } from './indexeddb_transaction';
import {
  fromDbIndexConfiguration,
  toDbIndexConfiguration,
  toDbIndexState
} from './local_serializer';
import { MemoryCollectionParentIndex } from './memory_index_manager';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';

const LOG_TAG = 'IndexedDbIndexManager';

const EMPTY_VALUE = new Uint8Array(0);

/**
 * A persisted implementation of IndexManager.
 *
 * PORTING NOTE: Unlike iOS and Android, the Web SDK does not memoize index
 * data as it supports multi-tab access.
 */
export class IndexedDbIndexManager implements IndexManager {
  /**
   * An in-memory copy of the index entries we've already written since the SDK
   * launched. Used to avoid re-writing the same entry repeatedly.
   *
   * This is *NOT* a complete cache of what's in persistence and so can never be
   * used to satisfy reads.
   */
  private collectionParentsCache = new MemoryCollectionParentIndex();

  private readonly uid: string;

  /**
   * Maps from a target to its equivalent list of sub-targets. Each sub-target
   * contains only one term from the target's disjunctive normal form (DNF).
   */
  private targetToDnfSubTargets = new ObjectMap<Target, Target[]>(
    t => canonifyTarget(t),
    (l, r) => targetEquals(l, r)
  );

  constructor(user: User, private readonly databaseId: DatabaseId) {
    this.uid = user.uid || '';
  }

  /**
   * Adds a new entry to the collection parent index.
   *
   * Repeated calls for the same collectionPath should be avoided within a
   * transaction as IndexedDbIndexManager only caches writes once a transaction
   * has been committed.
   */
  addToCollectionParentIndex(
    transaction: PersistenceTransaction,
    collectionPath: ResourcePath
  ): PersistencePromise<void> {
    debugAssert(collectionPath.length % 2 === 1, 'Expected a collection path.');
    if (!this.collectionParentsCache.has(collectionPath)) {
      const collectionId = collectionPath.lastSegment();
      const parentPath = collectionPath.popLast();

      transaction.addOnCommittedListener(() => {
        // Add the collection to the in memory cache only if the transaction was
        // successfully committed.
        this.collectionParentsCache.add(collectionPath);
      });

      const collectionParent: DbCollectionParent = {
        collectionId,
        parent: encodeResourcePath(parentPath)
      };
      return collectionParentsStore(transaction).put(collectionParent);
    }
    return PersistencePromise.resolve();
  }

  getCollectionParents(
    transaction: PersistenceTransaction,
    collectionId: string
  ): PersistencePromise<ResourcePath[]> {
    const parentPaths = [] as ResourcePath[];
    const range = IDBKeyRange.bound(
      [collectionId, ''],
      [immediateSuccessor(collectionId), ''],
      /*lowerOpen=*/ false,
      /*upperOpen=*/ true
    );
    return collectionParentsStore(transaction)
      .loadAll(range)
      .next(entries => {
        for (const entry of entries) {
          // This collectionId guard shouldn't be necessary (and isn't as long
          // as we're running in a real browser), but there's a bug in
          // indexeddbshim that breaks our range in our tests running in node:
          // https://github.com/axemclion/IndexedDBShim/issues/334
          if (entry.collectionId !== collectionId) {
            break;
          }
          parentPaths.push(decodeResourcePath(entry.parent));
        }
        return parentPaths;
      });
  }

  addFieldIndex(
    transaction: PersistenceTransaction,
    index: FieldIndex
  ): PersistencePromise<void> {
    // TODO(indexing): Verify that the auto-incrementing index ID works in
    // Safari & Firefox.
    const indexes = indexConfigurationStore(transaction);
    const dbIndex = toDbIndexConfiguration(index);
    delete dbIndex.indexId; // `indexId` is auto-populated by IndexedDb
    const result = indexes.add(dbIndex);
    if (index.indexState) {
      const states = indexStateStore(transaction);
      return result.next(indexId => {
        states.put(
          toDbIndexState(
            indexId,
            this.uid,
            index.indexState.sequenceNumber,
            index.indexState.offset
          )
        );
      });
    } else {
      return result.next();
    }
  }

  deleteFieldIndex(
    transaction: PersistenceTransaction,
    index: FieldIndex
  ): PersistencePromise<void> {
    const indexes = indexConfigurationStore(transaction);
    const states = indexStateStore(transaction);
    const entries = indexEntriesStore(transaction);
    return indexes
      .delete(index.indexId)
      .next(() =>
        states.delete(
          IDBKeyRange.bound(
            [index.indexId],
            [index.indexId + 1],
            /*lowerOpen=*/ false,
            /*upperOpen=*/ true
          )
        )
      )
      .next(() =>
        entries.delete(
          IDBKeyRange.bound(
            [index.indexId],
            [index.indexId + 1],
            /*lowerOpen=*/ false,
            /*upperOpen=*/ true
          )
        )
      );
  }

  deleteAllFieldIndexes(
    transaction: PersistenceTransaction
  ): PersistencePromise<void> {
    const indexes = indexConfigurationStore(transaction);
    const entries = indexEntriesStore(transaction);
    const states = indexStateStore(transaction);

    return indexes
      .deleteAll()
      .next(() => entries.deleteAll())
      .next(() => states.deleteAll());
  }

  createTargetIndexes(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<void> {
    return PersistencePromise.forEach(
      this.getSubTargets(target),
      (subTarget: Target) => {
        return this.getIndexType(transaction, subTarget).next(type => {
          if (type === IndexType.NONE || type === IndexType.PARTIAL) {
            const targetIndexMatcher = new TargetIndexMatcher(subTarget);
            const fieldIndex = targetIndexMatcher.buildTargetIndex();
            if (fieldIndex != null) {
              return this.addFieldIndex(transaction, fieldIndex);
            }
          }
        });
      }
    );
  }

  getDocumentsMatchingTarget(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<DocumentKey[] | null> {
    const indexEntries = indexEntriesStore(transaction);

    let canServeTarget = true;
    const indexes = new Map<Target, FieldIndex | null>();

    return PersistencePromise.forEach(
      this.getSubTargets(target),
      (subTarget: Target) => {
        return this.getFieldIndex(transaction, subTarget).next(index => {
          canServeTarget &&= !!index;
          indexes.set(subTarget, index);
        });
      }
    ).next(() => {
      if (!canServeTarget) {
        return PersistencePromise.resolve(null as DocumentKey[] | null);
      } else {
        let existingKeys = documentKeySet();
        const result: DocumentKey[] = [];
        return PersistencePromise.forEach(indexes, (index, subTarget) => {
          logDebug(
            LOG_TAG,
            `Using index ${fieldIndexToString(
              index!
            )} to execute ${canonifyTarget(target)}`
          );

          const arrayValues = targetGetArrayValues(subTarget, index!);
          const notInValues = targetGetNotInValues(subTarget, index!);
          const lowerBound = targetGetLowerBound(subTarget, index!);
          const upperBound = targetGetUpperBound(subTarget, index!);

          const lowerBoundEncoded = this.encodeBound(
            index!,
            subTarget,
            lowerBound
          );
          const upperBoundEncoded = this.encodeBound(
            index!,
            subTarget,
            upperBound
          );
          const notInEncoded = this.encodeValues(
            index!,
            subTarget,
            notInValues
          );

          const indexRanges = this.generateIndexRanges(
            index!.indexId,
            arrayValues,
            lowerBoundEncoded,
            lowerBound.inclusive,
            upperBoundEncoded,
            upperBound.inclusive,
            notInEncoded
          );
          return PersistencePromise.forEach(
            indexRanges,
            (indexRange: IDBKeyRange) => {
              return indexEntries
                .loadFirst(indexRange, target.limit)
                .next(entries => {
                  entries.forEach(entry => {
                    const documentKey = DocumentKey.fromSegments(
                      entry.documentKey
                    );
                    if (!existingKeys.has(documentKey)) {
                      existingKeys = existingKeys.add(documentKey);
                      result.push(documentKey);
                    }
                  });
                });
            }
          );
        }).next(() => result as DocumentKey[] | null);
      }
    });
  }

  private getSubTargets(target: Target): Target[] {
    let subTargets = this.targetToDnfSubTargets.get(target);
    if (subTargets) {
      return subTargets;
    }

    if (target.filters.length === 0) {
      subTargets = [target];
    } else {
      // There is an implicit AND operation between all the filters stored in the target
      const dnf: Filter[] = getDnfTerms(
        CompositeFilter.create(target.filters, CompositeOperator.AND)
      );

      subTargets = dnf.map(term =>
        newTarget(
          target.path,
          target.collectionGroup,
          target.orderBy,
          term.getFilters(),
          target.limit,
          target.startAt,
          target.endAt
        )
      );
    }

    this.targetToDnfSubTargets.set(target, subTargets);
    return subTargets;
  }

  /**
   * Constructs a key range query on `DbIndexEntryStore` that unions all
   * bounds.
   */
  private generateIndexRanges(
    indexId: number,
    arrayValues: ProtoValue[] | null,
    lowerBounds: Uint8Array[],
    lowerBoundInclusive: boolean,
    upperBounds: Uint8Array[],
    upperBoundInclusive: boolean,
    notInValues: Uint8Array[]
  ): IDBKeyRange[] {
    // The number of total index scans we union together. This is similar to a
    // distributed normal form, but adapted for array values. We create a single
    // index range per value in an ARRAY_CONTAINS or ARRAY_CONTAINS_ANY filter
    // combined with the values from the query bounds.
    const totalScans =
      (arrayValues != null ? arrayValues.length : 1) *
      Math.max(lowerBounds.length, upperBounds.length);
    const scansPerArrayElement =
      totalScans / (arrayValues != null ? arrayValues.length : 1);

    const indexRanges: IDBKeyRange[] = [];
    for (let i = 0; i < totalScans; ++i) {
      const arrayValue = arrayValues
        ? this.encodeSingleElement(arrayValues[i / scansPerArrayElement])
        : EMPTY_VALUE;

      const lowerBound = this.generateLowerBound(
        indexId,
        arrayValue,
        lowerBounds[i % scansPerArrayElement],
        lowerBoundInclusive
      );
      const upperBound = this.generateUpperBound(
        indexId,
        arrayValue,
        upperBounds[i % scansPerArrayElement],
        upperBoundInclusive
      );

      const notInBound = notInValues.map(notIn =>
        this.generateLowerBound(
          indexId,
          arrayValue,
          notIn,
          /* inclusive= */ true
        )
      );

      indexRanges.push(...this.createRange(lowerBound, upperBound, notInBound));
    }

    return indexRanges;
  }

  /** Generates the lower bound for `arrayValue` and `directionalValue`. */
  private generateLowerBound(
    indexId: number,
    arrayValue: Uint8Array,
    directionalValue: Uint8Array,
    inclusive: boolean
  ): IndexEntry {
    const entry = new IndexEntry(
      indexId,
      DocumentKey.empty(),
      arrayValue,
      directionalValue
    );
    return inclusive ? entry : entry.successor();
  }

  /** Generates the upper bound for `arrayValue` and `directionalValue`. */
  private generateUpperBound(
    indexId: number,
    arrayValue: Uint8Array,
    directionalValue: Uint8Array,
    inclusive: boolean
  ): IndexEntry {
    const entry = new IndexEntry(
      indexId,
      DocumentKey.empty(),
      arrayValue,
      directionalValue
    );
    return inclusive ? entry.successor() : entry;
  }

  private getFieldIndex(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<FieldIndex | null> {
    const targetIndexMatcher = new TargetIndexMatcher(target);
    const collectionGroup =
      target.collectionGroup != null
        ? target.collectionGroup
        : target.path.lastSegment();

    return this.getFieldIndexes(transaction, collectionGroup).next(indexes => {
      // Return the index with the most number of segments.
      let index: FieldIndex | null = null;
      for (const candidate of indexes) {
        const matches = targetIndexMatcher.servedByIndex(candidate);
        if (
          matches &&
          (!index || candidate.fields.length > index.fields.length)
        ) {
          index = candidate;
        }
      }
      return index;
    });
  }

  getIndexType(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<IndexType> {
    let indexType = IndexType.FULL;
    const subTargets = this.getSubTargets(target);
    return PersistencePromise.forEach(subTargets, (target: Target) => {
      return this.getFieldIndex(transaction, target).next(index => {
        if (!index) {
          indexType = IndexType.NONE;
        } else if (
          indexType !== IndexType.NONE &&
          index.fields.length < targetGetSegmentCount(target)
        ) {
          indexType = IndexType.PARTIAL;
        }
      });
    }).next(() => {
      // OR queries have more than one sub-target (one sub-target per DNF term). We currently consider
      // OR queries that have a `limit` to have a partial index. For such queries we perform sorting
      // and apply the limit in memory as a post-processing step.
      if (
        targetHasLimit(target) &&
        subTargets.length > 1 &&
        indexType === IndexType.FULL
      ) {
        return IndexType.PARTIAL;
      }

      return indexType;
    });
  }

  /**
   * Returns the byte encoded form of the directional values in the field index.
   * Returns `null` if the document does not have all fields specified in the
   * index.
   */
  private encodeDirectionalElements(
    fieldIndex: FieldIndex,
    document: Document
  ): Uint8Array | null {
    const encoder = new IndexByteEncoder();
    for (const segment of fieldIndexGetDirectionalSegments(fieldIndex)) {
      const field = document.data.field(segment.fieldPath);
      if (field == null) {
        return null;
      }
      const directionalEncoder = encoder.forKind(segment.kind);
      FirestoreIndexValueWriter.INSTANCE.writeIndexValue(
        field,
        directionalEncoder
      );
    }
    return encoder.encodedBytes();
  }

  /** Encodes a single value to the ascending index format. */
  private encodeSingleElement(value: ProtoValue): Uint8Array {
    const encoder = new IndexByteEncoder();
    FirestoreIndexValueWriter.INSTANCE.writeIndexValue(
      value,
      encoder.forKind(IndexKind.ASCENDING)
    );
    return encoder.encodedBytes();
  }

  /**
   * Returns an encoded form of the document key that sorts based on the key
   * ordering of the field index.
   */
  private encodeDirectionalKey(
    fieldIndex: FieldIndex,
    documentKey: DocumentKey
  ): Uint8Array {
    const encoder = new IndexByteEncoder();
    FirestoreIndexValueWriter.INSTANCE.writeIndexValue(
      refValue(this.databaseId, documentKey),
      encoder.forKind(fieldIndexGetKeyOrder(fieldIndex))
    );
    return encoder.encodedBytes();
  }

  /**
   * Encodes the given field values according to the specification in `target`.
   * For IN queries, a list of possible values is returned.
   */
  private encodeValues(
    fieldIndex: FieldIndex,
    target: Target,
    values: ProtoValue[] | null
  ): Uint8Array[] {
    if (values === null) {
      return [];
    }

    let encoders: IndexByteEncoder[] = [];
    encoders.push(new IndexByteEncoder());

    let valueIdx = 0;
    for (const segment of fieldIndexGetDirectionalSegments(fieldIndex)) {
      const value = values[valueIdx++];
      for (const encoder of encoders) {
        if (this.isInFilter(target, segment.fieldPath) && isArray(value)) {
          encoders = this.expandIndexValues(encoders, segment, value);
        } else {
          const directionalEncoder = encoder.forKind(segment.kind);
          FirestoreIndexValueWriter.INSTANCE.writeIndexValue(
            value,
            directionalEncoder
          );
        }
      }
    }
    return this.getEncodedBytes(encoders);
  }

  /**
   * Encodes the given bounds according to the specification in `target`. For IN
   * queries, a list of possible values is returned.
   */
  private encodeBound(
    fieldIndex: FieldIndex,
    target: Target,
    bound: Bound
  ): Uint8Array[] {
    return this.encodeValues(fieldIndex, target, bound.position);
  }

  /** Returns the byte representation for the provided encoders. */
  private getEncodedBytes(encoders: IndexByteEncoder[]): Uint8Array[] {
    const result: Uint8Array[] = [];
    for (let i = 0; i < encoders.length; ++i) {
      result[i] = encoders[i].encodedBytes();
    }
    return result;
  }

  /**
   * Creates a separate encoder for each element of an array.
   *
   * The method appends each value to all existing encoders (e.g. filter("a",
   * "==", "a1").filter("b", "in", ["b1", "b2"]) becomes ["a1,b1", "a1,b2"]). A
   * list of new encoders is returned.
   */
  private expandIndexValues(
    encoders: IndexByteEncoder[],
    segment: IndexSegment,
    value: ProtoValue
  ): IndexByteEncoder[] {
    const prefixes = [...encoders];
    const results: IndexByteEncoder[] = [];
    for (const arrayElement of value.arrayValue!.values || []) {
      for (const prefix of prefixes) {
        const clonedEncoder = new IndexByteEncoder();
        clonedEncoder.seed(prefix.encodedBytes());
        FirestoreIndexValueWriter.INSTANCE.writeIndexValue(
          arrayElement,
          clonedEncoder.forKind(segment.kind)
        );
        results.push(clonedEncoder);
      }
    }
    return results;
  }

  private isInFilter(target: Target, fieldPath: FieldPath): boolean {
    return !!target.filters.find(
      f =>
        f instanceof FieldFilter &&
        f.field.isEqual(fieldPath) &&
        (f.op === Operator.IN || f.op === Operator.NOT_IN)
    );
  }

  getFieldIndexes(
    transaction: PersistenceTransaction,
    collectionGroup?: string
  ): PersistencePromise<FieldIndex[]> {
    const indexes = indexConfigurationStore(transaction);
    const states = indexStateStore(transaction);

    return (
      collectionGroup
        ? indexes.loadAll(
            DbIndexConfigurationCollectionGroupIndex,
            IDBKeyRange.bound(collectionGroup, collectionGroup)
          )
        : indexes.loadAll()
    ).next(indexConfigs => {
      const result: FieldIndex[] = [];
      return PersistencePromise.forEach(
        indexConfigs,
        (indexConfig: DbIndexConfiguration) => {
          return states
            .get([indexConfig.indexId!, this.uid])
            .next(indexState => {
              result.push(fromDbIndexConfiguration(indexConfig, indexState));
            });
        }
      ).next(() => result);
    });
  }

  getNextCollectionGroupToUpdate(
    transaction: PersistenceTransaction
  ): PersistencePromise<string | null> {
    return this.getFieldIndexes(transaction).next(indexes => {
      if (indexes.length === 0) {
        return null;
      }
      indexes.sort((l, r) => {
        const cmp = l.indexState.sequenceNumber - r.indexState.sequenceNumber;
        return cmp !== 0
          ? cmp
          : primitiveComparator(l.collectionGroup, r.collectionGroup);
      });
      return indexes[0].collectionGroup;
    });
  }

  updateCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string,
    offset: IndexOffset
  ): PersistencePromise<void> {
    const indexes = indexConfigurationStore(transaction);
    const states = indexStateStore(transaction);
    return this.getNextSequenceNumber(transaction).next(nextSequenceNumber =>
      indexes
        .loadAll(
          DbIndexConfigurationCollectionGroupIndex,
          IDBKeyRange.bound(collectionGroup, collectionGroup)
        )
        .next(configs =>
          PersistencePromise.forEach(configs, (config: DbIndexConfiguration) =>
            states.put(
              toDbIndexState(
                config.indexId!,
                this.uid,
                nextSequenceNumber,
                offset
              )
            )
          )
        )
    );
  }

  updateIndexEntries(
    transaction: PersistenceTransaction,
    documents: DocumentMap
  ): PersistencePromise<void> {
    // Porting Note: `getFieldIndexes()` on Web does not cache index lookups as
    // it could be used across different IndexedDB transactions. As any cached
    // data might be invalidated by other multi-tab clients, we can only trust
    // data within a single IndexedDB transaction. We therefore add a cache
    // here.
    const memoizedIndexes = new Map<string, FieldIndex[]>();
    return PersistencePromise.forEach(documents, (key, doc) => {
      const memoizedCollectionIndexes = memoizedIndexes.get(
        key.collectionGroup
      );
      const fieldIndexes = memoizedCollectionIndexes
        ? PersistencePromise.resolve(memoizedCollectionIndexes)
        : this.getFieldIndexes(transaction, key.collectionGroup);

      return fieldIndexes.next(fieldIndexes => {
        memoizedIndexes.set(key.collectionGroup, fieldIndexes);
        return PersistencePromise.forEach(
          fieldIndexes,
          (fieldIndex: FieldIndex) => {
            return this.getExistingIndexEntries(
              transaction,
              key,
              fieldIndex
            ).next(existingEntries => {
              const newEntries = this.computeIndexEntries(doc, fieldIndex);
              if (!existingEntries.isEqual(newEntries)) {
                return this.updateEntries(
                  transaction,
                  doc,
                  fieldIndex,
                  existingEntries,
                  newEntries
                );
              }
              return PersistencePromise.resolve();
            });
          }
        );
      });
    });
  }

  private addIndexEntry(
    transaction: PersistenceTransaction,
    document: Document,
    fieldIndex: FieldIndex,
    indexEntry: IndexEntry
  ): PersistencePromise<void> {
    const indexEntries = indexEntriesStore(transaction);
    return indexEntries.put({
      indexId: indexEntry.indexId,
      uid: this.uid,
      arrayValue: indexEntry.arrayValue,
      directionalValue: indexEntry.directionalValue,
      orderedDocumentKey: this.encodeDirectionalKey(fieldIndex, document.key),
      documentKey: document.key.path.toArray()
    });
  }

  private deleteIndexEntry(
    transaction: PersistenceTransaction,
    document: Document,
    fieldIndex: FieldIndex,
    indexEntry: IndexEntry
  ): PersistencePromise<void> {
    const indexEntries = indexEntriesStore(transaction);
    return indexEntries.delete([
      indexEntry.indexId,
      this.uid,
      indexEntry.arrayValue,
      indexEntry.directionalValue,
      this.encodeDirectionalKey(fieldIndex, document.key),
      document.key.path.toArray()
    ]);
  }

  private getExistingIndexEntries(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey,
    fieldIndex: FieldIndex
  ): PersistencePromise<SortedSet<IndexEntry>> {
    const indexEntries = indexEntriesStore(transaction);
    let results = new SortedSet<IndexEntry>(indexEntryComparator);
    return indexEntries
      .iterate(
        {
          index: DbIndexEntryDocumentKeyIndex,
          range: IDBKeyRange.only([
            fieldIndex.indexId,
            this.uid,
            this.encodeDirectionalKey(fieldIndex, documentKey)
          ])
        },
        (_, entry) => {
          results = results.add(
            new IndexEntry(
              fieldIndex.indexId,
              documentKey,
              entry.arrayValue,
              entry.directionalValue
            )
          );
        }
      )
      .next(() => results);
  }

  /** Creates the index entries for the given document. */
  private computeIndexEntries(
    document: Document,
    fieldIndex: FieldIndex
  ): SortedSet<IndexEntry> {
    let results = new SortedSet<IndexEntry>(indexEntryComparator);

    const directionalValue = this.encodeDirectionalElements(
      fieldIndex,
      document
    );
    if (directionalValue == null) {
      return results;
    }

    const arraySegment = fieldIndexGetArraySegment(fieldIndex);
    if (arraySegment != null) {
      const value = document.data.field(arraySegment.fieldPath);
      if (isArray(value)) {
        for (const arrayValue of value.arrayValue!.values || []) {
          results = results.add(
            new IndexEntry(
              fieldIndex.indexId,
              document.key,
              this.encodeSingleElement(arrayValue),
              directionalValue
            )
          );
        }
      }
    } else {
      results = results.add(
        new IndexEntry(
          fieldIndex.indexId,
          document.key,
          EMPTY_VALUE,
          directionalValue
        )
      );
    }

    return results;
  }

  /**
   * Updates the index entries for the provided document by deleting entries
   * that are no longer referenced in `newEntries` and adding all newly added
   * entries.
   */
  private updateEntries(
    transaction: PersistenceTransaction,
    document: Document,
    fieldIndex: FieldIndex,
    existingEntries: SortedSet<IndexEntry>,
    newEntries: SortedSet<IndexEntry>
  ): PersistencePromise<void> {
    logDebug(LOG_TAG, "Updating index entries for document '%s'", document.key);

    const promises: Array<PersistencePromise<void>> = [];
    diffSortedSets(
      existingEntries,
      newEntries,
      indexEntryComparator,
      /* onAdd= */ entry => {
        promises.push(
          this.addIndexEntry(transaction, document, fieldIndex, entry)
        );
      },
      /* onRemove= */ entry => {
        promises.push(
          this.deleteIndexEntry(transaction, document, fieldIndex, entry)
        );
      }
    );

    return PersistencePromise.waitFor(promises);
  }

  private getNextSequenceNumber(
    transaction: PersistenceTransaction
  ): PersistencePromise<number> {
    let nextSequenceNumber = 1;
    const states = indexStateStore(transaction);
    return states
      .iterate(
        {
          index: DbIndexStateSequenceNumberIndex,
          reverse: true,
          range: IDBKeyRange.upperBound([this.uid, Number.MAX_SAFE_INTEGER])
        },
        (_, state, controller) => {
          controller.done();
          nextSequenceNumber = state.sequenceNumber + 1;
        }
      )
      .next(() => nextSequenceNumber);
  }

  /**
   * Returns a new set of IDB ranges that splits the existing range and excludes
   * any values that match the `notInValue` from these ranges. As an example,
   * '[foo > 2 && foo != 3]` becomes  `[foo > 2 && < 3, foo > 3]`.
   */
  private createRange(
    lower: IndexEntry,
    upper: IndexEntry,
    notInValues: IndexEntry[]
  ): IDBKeyRange[] {
    // The notIn values need to be sorted and unique so that we can return a
    // sorted set of non-overlapping ranges.
    notInValues = notInValues
      .sort((l, r) => indexEntryComparator(l, r))
      .filter(
        (el, i, values) => !i || indexEntryComparator(el, values[i - 1]) !== 0
      );

    const bounds: IndexEntry[] = [];
    bounds.push(lower);
    for (const notInValue of notInValues) {
      const cmpToLower = indexEntryComparator(notInValue, lower);
      const cmpToUpper = indexEntryComparator(notInValue, upper);

      if (cmpToLower === 0) {
        // `notInValue` is the lower bound. We therefore need to raise the bound
        // to the next value.
        bounds[0] = lower.successor();
      } else if (cmpToLower > 0 && cmpToUpper < 0) {
        // `notInValue` is in the middle of the range
        bounds.push(notInValue);
        bounds.push(notInValue.successor());
      } else if (cmpToUpper > 0) {
        // `notInValue` (and all following values) are out of the range
        break;
      }
    }
    bounds.push(upper);

    const ranges: IDBKeyRange[] = [];
    for (let i = 0; i < bounds.length; i += 2) {
      // If we encounter two bounds that will create an unmatchable key range,
      // then we return an empty set of key ranges.
      if (this.isRangeMatchable(bounds[i], bounds[i + 1])) {
        return [];
      }

      const lowerBound = [
        bounds[i].indexId,
        this.uid,
        bounds[i].arrayValue,
        bounds[i].directionalValue,
        EMPTY_VALUE,
        []
      ] as DbIndexEntryKey;

      const upperBound = [
        bounds[i + 1].indexId,
        this.uid,
        bounds[i + 1].arrayValue,
        bounds[i + 1].directionalValue,
        EMPTY_VALUE,
        []
      ] as DbIndexEntryKey;

      ranges.push(IDBKeyRange.bound(lowerBound, upperBound));
    }
    return ranges;
  }

  isRangeMatchable(lowerBound: IndexEntry, upperBound: IndexEntry): boolean {
    // If lower bound is greater than the upper bound, then the key
    // range can never be matched.
    return indexEntryComparator(lowerBound, upperBound) > 0;
  }

  getMinOffsetFromCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string
  ): PersistencePromise<IndexOffset> {
    return this.getFieldIndexes(transaction, collectionGroup).next(
      getMinOffsetFromFieldIndexes
    );
  }

  getMinOffset(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<IndexOffset> {
    return PersistencePromise.mapArray(
      this.getSubTargets(target),
      (subTarget: Target) =>
        this.getFieldIndex(transaction, subTarget).next(index =>
          index ? index : fail('Target cannot be served from index')
        )
    ).next(getMinOffsetFromFieldIndexes);
  }
}

/**
 * Helper to get a typed SimpleDbStore for the collectionParents
 * document store.
 */
function collectionParentsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbCollectionParentKey, DbCollectionParent> {
  return getStore<DbCollectionParentKey, DbCollectionParent>(
    txn,
    DbCollectionParentStore
  );
}

/**
 * Helper to get a typed SimpleDbStore for the index entry object store.
 */
function indexEntriesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbIndexEntryKey, DbIndexEntry> {
  return getStore<DbIndexEntryKey, DbIndexEntry>(txn, DbIndexEntryStore);
}

/**
 * Helper to get a typed SimpleDbStore for the index configuration object store.
 */
function indexConfigurationStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbIndexConfigurationKey, DbIndexConfiguration> {
  return getStore<DbIndexConfigurationKey, DbIndexConfiguration>(
    txn,
    DbIndexConfigurationStore
  );
}

/**
 * Helper to get a typed SimpleDbStore for the index state object store.
 */
function indexStateStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbIndexStateKey, DbIndexState> {
  return getStore<DbIndexStateKey, DbIndexState>(txn, DbIndexStateStore);
}

function getMinOffsetFromFieldIndexes(fieldIndexes: FieldIndex[]): IndexOffset {
  hardAssert(
    fieldIndexes.length !== 0,
    'Found empty index group when looking for least recent index offset.'
  );

  let minOffset: IndexOffset = fieldIndexes[0].indexState.offset;
  let maxBatchId: number = minOffset.largestBatchId;
  for (let i = 1; i < fieldIndexes.length; i++) {
    const newOffset: IndexOffset = fieldIndexes[i].indexState.offset;
    if (indexOffsetComparator(newOffset, minOffset) < 0) {
      minOffset = newOffset;
    }
    if (maxBatchId < newOffset.largestBatchId) {
      maxBatchId = newOffset.largestBatchId;
    }
  }
  return new IndexOffset(minOffset.readTime, minOffset.documentKey, maxBatchId);
}
