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
import {FieldIndexManagementApi} from './field_index_management_api';
import {PersistenceTransaction} from '../local/persistence_transaction';
import {
  LimitType,
  Query,
  queryMatchesAllDocuments,
  queryToTarget,
  queryWithLimit,
  stringifyQuery
} from '../core/query';
import {QueryContext} from '../local/query_context';
import {PersistencePromise} from '../local/persistence_promise';
import {getLogLevel, logDebug, LogLevel} from '../util/log';
import {documentKeySet, DocumentMap} from '../model/collections';
import {IndexType} from '../local/index_manager';
import {debugAssert, fail, hardAssert} from '../util/assert';
import {LocalDocumentsView} from '../local/local_documents_view';
import {
  appendRemainingResults,
  applyQuery,
  needsRefill
} from '../local/query_engine';
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
} from "../model/field_index";
import {
  fromDbIndexConfiguration,
  toDbIndexConfiguration,
  toDbIndexState
} from "../local/local_serializer";
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
} from "../core/target";
import {TargetIndexMatcher} from "../model/target_index_matcher";
import {DocumentKey} from "../model/document_key";
import {
  CompositeFilter,
  CompositeOperator,
  FieldFilter,
  Filter,
  Operator
} from "../core/filter";
import {getDnfTerms} from "../util/logic_utils";
import {Value as ProtoValue} from "../protos/firestore_proto_api";
import {IndexEntry, indexEntryComparator} from "./index_entry";
import {Document} from "../model/document";
import {IndexByteEncoder} from "./index_byte_encoder";
import {FirestoreIndexValueWriter} from "./firestore_index_value_writer";
import {isArray, refValue} from "../model/values";
import {Bound} from "../core/bound";
import {FieldPath} from "../model/path";
import {
  DbIndexConfigurationCollectionGroupIndex,
  DbIndexConfigurationKey,
  DbIndexConfigurationStore,
  DbIndexEntryDocumentKeyIndex,
  DbIndexEntryKey,
  DbIndexEntryStore,
  DbIndexStateKey,
  DbIndexStateSequenceNumberIndex,
  DbIndexStateStore
} from "../local/indexeddb_sentinels";
import {
  DbIndexConfiguration,
  DbIndexEntry,
  DbIndexState
} from "../local/indexeddb_schema";
import {primitiveComparator} from "../util/misc";
import {diffSortedSets, SortedSet} from "../util/sorted_set";
import {SimpleDbStore} from "../local/simple_db";
import {getStore} from "../local/indexeddb_transaction";
import {User} from "../auth/user";
import {ObjectMap} from "../util/obj_map";
import {DatabaseId} from "../core/database_info";

export class FieldIndexManagementApiImpl implements FieldIndexManagementApi {
  indexAutoCreationEnabled = false;

  /**
   * SDK only decides whether it should create index when collection size is
   * larger than this.
   */
  indexAutoCreationMinCollectionSize =
    DEFAULT_INDEX_AUTO_CREATION_MIN_COLLECTION_SIZE;

  relativeIndexReadCostPerDocument =
    DEFAULT_RELATIVE_INDEX_READ_COST_PER_DOCUMENT;

  constructor(private readonly databaseId: DatabaseId) {
  }

  /**
   * Maps from a target to its equivalent list of sub-targets. Each sub-target
   * contains only one term from the target's disjunctive normal form (DNF).
   */
  private targetToDnfSubTargets = new ObjectMap<Target, Target[]>(
    t => canonifyTarget(t),
    (l, r) => targetEquals(l, r)
  );

  createCacheIndexes(
    transaction: PersistenceTransaction,
    user: User,
    query: Query,
    context: QueryContext,
    resultSize: number
  ): PersistencePromise<void> {
    if (context.documentReadCount < this.indexAutoCreationMinCollectionSize) {
      if (getLogLevel() <= LogLevel.DEBUG) {
        logDebug(
          'QueryEngine',
          'SDK will not create cache indexes for query:',
          stringifyQuery(query),
          'since it only creates cache indexes for collection contains',
          'more than or equal to',
          this.indexAutoCreationMinCollectionSize,
          'documents'
        );
      }
      return PersistencePromise.resolve();
    }

    if (getLogLevel() <= LogLevel.DEBUG) {
      logDebug(
        'QueryEngine',
        'Query:',
        stringifyQuery(query),
        'scans',
        context.documentReadCount,
        'local documents and returns',
        resultSize,
        'documents as results.'
      );
    }

    if (
      context.documentReadCount >
      this.relativeIndexReadCostPerDocument * resultSize
    ) {
      if (getLogLevel() <= LogLevel.DEBUG) {
        logDebug(
          'QueryEngine',
          'The SDK decides to create cache indexes for query:',
          stringifyQuery(query),
          'as using cache indexes may help improve performance.'
        );
      }
      return this.createTargetIndexes(
        transaction,
        user,
        queryToTarget(query)
      );
    }

    return PersistencePromise.resolve();
  }

  /**
   * Performs an indexed query that evaluates the query based on a collection's
   * persisted index values. Returns `null` if an index is not available.
   */
  performQueryUsingIndex(
    transaction: PersistenceTransaction,
    user: User,
    localDocumentsView: LocalDocumentsView,
    query: Query
  ): PersistencePromise<DocumentMap | null> {
    if (queryMatchesAllDocuments(query)) {
      // Queries that match all documents don't benefit from using
      // key-based lookups. It is more efficient to scan all documents in a
      // collection, rather than to perform individual lookups.
      return PersistencePromise.resolve<DocumentMap | null>(null);
    }

    let target = queryToTarget(query);
    return this.getIndexType(transaction, user, target).next(indexType => {
      if (indexType === IndexType.NONE) {
        // The target cannot be served from any index.
        return null;
      }

      if (query.limit !== null && indexType === IndexType.PARTIAL) {
        // We cannot apply a limit for targets that are served using a partial
        // index. If a partial index will be used to serve the target, the
        // query may return a superset of documents that match the target
        // (e.g. if the index doesn't include all the target's filters), or
        // may return the correct set of documents in the wrong order (e.g. if
        // the index doesn't include a segment for one of the orderBys).
        // Therefore, a limit should not be applied in such cases.
        query = queryWithLimit(query, null, LimitType.First);
        target = queryToTarget(query);
      }

      return this
        .getDocumentsMatchingTarget(transaction, user, target)
        .next(keys => {
          debugAssert(
            !!keys,
            'Index manager must return results for partial and full indexes.'
          );
          const sortedKeys = documentKeySet(...keys);
          return localDocumentsView
            .getDocuments(transaction, sortedKeys)
            .next(indexedDocuments => {
              return this
                .getMinOffset(transaction, user, target)
                .next(offset => {
                  const previousResults = applyQuery(query, indexedDocuments);

                  if (
                    needsRefill(
                      query,
                      previousResults,
                      sortedKeys,
                      offset.readTime
                    )
                  ) {
                    // A limit query whose boundaries change due to local
                    // edits can be re-run against the cache by excluding the
                    // limit. This ensures that all documents that match the
                    // query's filters are included in the result set. The SDK
                    // can then apply the limit once all local edits are
                    // incorporated.
                    return this.performQueryUsingIndex(
                      transaction, user,
                      localDocumentsView,
                      queryWithLimit(query, null, LimitType.First)
                    );
                  }

                  return appendRemainingResults(
                    transaction,
                    localDocumentsView,
                    previousResults,
                    query,
                    offset
                  ) as PersistencePromise<DocumentMap | null>;
                });
            });
        });
    });
  }

  addFieldIndex(
    transaction: PersistenceTransaction,
    user: User,
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
            user,
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
    user: User,
    target: Target
  ): PersistencePromise<void> {
    return PersistencePromise.forEach(
      this.getSubTargets(target),
      (subTarget: Target) => {
        return this.getIndexType(transaction, user, subTarget).next(type => {
          if (type === IndexType.NONE || type === IndexType.PARTIAL) {
            const targetIndexMatcher = new TargetIndexMatcher(subTarget);
            const fieldIndex = targetIndexMatcher.buildTargetIndex();
            if (fieldIndex != null) {
              return this.addFieldIndex(transaction, user, fieldIndex);
            }
          }
        });
      }
    );
  }

  getDocumentsMatchingTarget(
    transaction: PersistenceTransaction,
    user: User,
    target: Target
  ): PersistencePromise<DocumentKey[] | null> {
    const indexEntries = indexEntriesStore(transaction);

    let canServeTarget = true;
    const indexes = new Map<Target, FieldIndex | null>();

    return PersistencePromise.forEach(
      this.getSubTargets(target),
      (subTarget: Target) => {
        return this.getFieldIndex(transaction, user, subTarget).next(index => {
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
            user,
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
    user: User,
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

      indexRanges.push(...this.createRange(user, lowerBound, upperBound, notInBound));
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
    user: User,
    target: Target
  ): PersistencePromise<FieldIndex | null> {
    const targetIndexMatcher = new TargetIndexMatcher(target);
    const collectionGroup =
      target.collectionGroup != null
        ? target.collectionGroup
        : target.path.lastSegment();

    return this.getFieldIndexes(transaction, user, collectionGroup).next(indexes => {
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
    user: User,
    target: Target
  ): PersistencePromise<IndexType> {
    let indexType = IndexType.FULL;
    const subTargets = this.getSubTargets(target);
    return PersistencePromise.forEach(subTargets, (target: Target) => {
      return this.getFieldIndex(transaction, user, target).next(index => {
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
    user: User,
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
            .get([indexConfig.indexId!, user.uid || ''])
            .next(indexState => {
              result.push(fromDbIndexConfiguration(indexConfig, indexState));
            });
        }
      ).next(() => result);
    });
  }

  getNextCollectionGroupToUpdate(
    transaction: PersistenceTransaction,
    user: User
  ): PersistencePromise<string | null> {
    return this.getFieldIndexes(transaction, user).next(indexes => {
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
    user: User,
    collectionGroup: string,
    offset: IndexOffset
  ): PersistencePromise<void> {
    const indexes = indexConfigurationStore(transaction);
    const states = indexStateStore(transaction);
    return this.getNextSequenceNumber(transaction, user).next(nextSequenceNumber =>
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
                user,
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
    user: User,
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
        : this.getFieldIndexes(transaction, user, key.collectionGroup);

      return fieldIndexes.next(fieldIndexes => {
        memoizedIndexes.set(key.collectionGroup, fieldIndexes);
        return PersistencePromise.forEach(
          fieldIndexes,
          (fieldIndex: FieldIndex) => {
            return this.getExistingIndexEntries(
              transaction, user,
              key,
              fieldIndex
            ).next(existingEntries => {
              const newEntries = this.computeIndexEntries(doc, fieldIndex);
              if (!existingEntries.isEqual(newEntries)) {
                return this.updateEntries(
                  transaction, user,
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
    user: User,
    document: Document,
    fieldIndex: FieldIndex,
    indexEntry: IndexEntry
  ): PersistencePromise<void> {
    const indexEntries = indexEntriesStore(transaction);
    return indexEntries.put({
      indexId: indexEntry.indexId,
      uid: user.uid || '',
      arrayValue: indexEntry.arrayValue,
      directionalValue: indexEntry.directionalValue,
      orderedDocumentKey: this.encodeDirectionalKey(fieldIndex, document.key),
      documentKey: document.key.path.toArray()
    });
  }

  private deleteIndexEntry(
    transaction: PersistenceTransaction,
    user: User,
    document: Document,
    fieldIndex: FieldIndex,
    indexEntry: IndexEntry
  ): PersistencePromise<void> {
    const indexEntries = indexEntriesStore(transaction);
    return indexEntries.delete([
      indexEntry.indexId,
      user.uid || '',
      indexEntry.arrayValue,
      indexEntry.directionalValue,
      this.encodeDirectionalKey(fieldIndex, document.key),
      document.key.path.toArray()
    ]);
  }

  private getExistingIndexEntries(
    transaction: PersistenceTransaction,
    user: User,
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
            user.uid || '',
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
    user: User,
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
          this.addIndexEntry(transaction, user, document, fieldIndex, entry)
        );
      },
      /* onRemove= */ entry => {
        promises.push(
          this.deleteIndexEntry(transaction, user, document, fieldIndex, entry)
        );
      }
    );

    return PersistencePromise.waitFor(promises);
  }

  private getNextSequenceNumber(
    transaction: PersistenceTransaction,
    user: User
  ): PersistencePromise<number> {
    let nextSequenceNumber = 1;
    const states = indexStateStore(transaction);
    return states
      .iterate(
        {
          index: DbIndexStateSequenceNumberIndex,
          reverse: true,
          range: IDBKeyRange.upperBound([user.uid || '', Number.MAX_SAFE_INTEGER])
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
    user: User,
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
        user.uid || '',
        bounds[i].arrayValue,
        bounds[i].directionalValue,
        EMPTY_VALUE,
        []
      ] as DbIndexEntryKey;

      const upperBound = [
        bounds[i + 1].indexId,
        user.uid || '',
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
    user: User,
    collectionGroup: string
  ): PersistencePromise<IndexOffset> {
    return this.getFieldIndexes(transaction, user, collectionGroup).next(
      getMinOffsetFromFieldIndexes
    );
  }

  getMinOffset(
    transaction: PersistenceTransaction,
    user: User,
    target: Target
  ): PersistencePromise<IndexOffset> {
    return PersistencePromise.mapArray(
      this.getSubTargets(target),
      (subTarget: Target) =>
        this.getFieldIndex(transaction, user, subTarget).next(index =>
          index ? index : fail('Target cannot be served from index')
        )
    ).next(getMinOffsetFromFieldIndexes);
  }

}

const DEFAULT_INDEX_AUTO_CREATION_MIN_COLLECTION_SIZE = 100;

/**
 * This cost represents the evaluation result of
 * (([index, docKey] + [docKey, docContent]) per document in the result set)
 * / ([docKey, docContent] per documents in full collection scan) coming from
 * experiment [enter PR experiment URL here].
 * TODO(b/299284287) Choose a value appropriate for the browser/OS combination,
 *  as determined by more data points from running the experiment.
 */
const DEFAULT_RELATIVE_INDEX_READ_COST_PER_DOCUMENT = 8;

const LOG_TAG = 'FieldIndexManagementApiImpl';

const EMPTY_VALUE = new Uint8Array(0);

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
