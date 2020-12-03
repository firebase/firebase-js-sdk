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

import { compareDocumentsByField, Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { FieldPath, ResourcePath } from '../model/path';
import { debugAssert, debugCast, fail } from '../util/assert';
import { isNullOrUndefined } from '../util/types';
import {
  Bound,
  canonifyTarget,
  Direction,
  FieldFilter,
  Filter,
  newTarget,
  Operator,
  OrderBy,
  sortsBeforeDocument,
  stringifyTarget,
  Target,
  targetEquals
} from './target';

export const enum LimitType {
  First = 'F',
  Last = 'L'
}

/**
 * The Query interface defines all external properties of a query.
 *
 * QueryImpl implements this interface to provide memoization for `queryOrderBy`
 * and `queryToTarget`.
 */
export interface Query {
  readonly path: ResourcePath;
  readonly collectionGroup: string | null;
  readonly explicitOrderBy: OrderBy[];
  readonly filters: Filter[];
  readonly limit: number | null;
  readonly limitType: LimitType;
  readonly startAt: Bound | null;
  readonly endAt: Bound | null;
}

/**
 * Query encapsulates all the query attributes we support in the SDK. It can
 * be run against the LocalStore, as well as be converted to a `Target` to
 * query the RemoteStore results.
 *
 * Visible for testing.
 */
export class QueryImpl implements Query {
  memoizedOrderBy: OrderBy[] | null = null;

  // The corresponding `Target` of this `Query` instance.
  memoizedTarget: Target | null = null;

  /**
   * Initializes a Query with a path and optional additional query constraints.
   * Path must currently be empty if this is a collection group query.
   */
  constructor(
    readonly path: ResourcePath,
    readonly collectionGroup: string | null = null,
    readonly explicitOrderBy: OrderBy[] = [],
    readonly filters: Filter[] = [],
    readonly limit: number | null = null,
    readonly limitType: LimitType = LimitType.First,
    readonly startAt: Bound | null = null,
    readonly endAt: Bound | null = null
  ) {
    if (this.startAt) {
      debugAssert(
        this.startAt.position.length <= queryOrderBy(this).length,
        'Bound is longer than orderBy'
      );
    }
    if (this.endAt) {
      debugAssert(
        this.endAt.position.length <= queryOrderBy(this).length,
        'Bound is longer than orderBy'
      );
    }
  }
}

/** Creates a new Query instance with the options provided. */
export function newQuery(
  path: ResourcePath,
  collectionGroup: string | null,
  explicitOrderBy: OrderBy[],
  filters: Filter[],
  limit: number | null,
  limitType: LimitType,
  startAt: Bound | null,
  endAt: Bound | null
): Query {
  return new QueryImpl(
    path,
    collectionGroup,
    explicitOrderBy,
    filters,
    limit,
    limitType,
    startAt,
    endAt
  );
}

/** Creates a new Query for a query that matches all documents at `path` */
export function newQueryForPath(path: ResourcePath): Query {
  return new QueryImpl(path);
}

/**
 * Helper to convert a collection group query into a collection query at a
 * specific path. This is used when executing collection group queries, since
 * we have to split the query into a set of collection queries at multiple
 * paths.
 */
export function asCollectionQueryAtPath(
  query: Query,
  path: ResourcePath
): Query {
  return new QueryImpl(
    path,
    /*collectionGroup=*/ null,
    query.explicitOrderBy.slice(),
    query.filters.slice(),
    query.limit,
    query.limitType,
    query.startAt,
    query.endAt
  );
}

/**
 * Returns true if this query does not specify any query constraints that
 * could remove results.
 */
export function matchesAllDocuments(query: Query): boolean {
  return (
    query.filters.length === 0 &&
    query.limit === null &&
    query.startAt == null &&
    query.endAt == null &&
    (query.explicitOrderBy.length === 0 ||
      (query.explicitOrderBy.length === 1 &&
        query.explicitOrderBy[0].field.isKeyField()))
  );
}

export function hasLimitToFirst(query: Query): boolean {
  return !isNullOrUndefined(query.limit) && query.limitType === LimitType.First;
}

export function hasLimitToLast(query: Query): boolean {
  return !isNullOrUndefined(query.limit) && query.limitType === LimitType.Last;
}

export function getFirstOrderByField(query: Query): FieldPath | null {
  return query.explicitOrderBy.length > 0
    ? query.explicitOrderBy[0].field
    : null;
}

export function getInequalityFilterField(query: Query): FieldPath | null {
  for (const filter of query.filters) {
    debugAssert(
      filter instanceof FieldFilter,
      'Only FieldFilters are supported'
    );
    if (filter.isInequality()) {
      return filter.field;
    }
  }
  return null;
}

/**
 * Checks if any of the provided Operators are included in the query and
 * returns the first one that is, or null if none are.
 */
export function findFilterOperator(
  query: Query,
  operators: Operator[]
): Operator | null {
  for (const filter of query.filters) {
    debugAssert(
      filter instanceof FieldFilter,
      'Only FieldFilters are supported'
    );
    if (operators.indexOf(filter.op) >= 0) {
      return filter.op;
    }
  }
  return null;
}

/**
 * Creates a new Query for a collection group query that matches all documents
 * within the provided collection group.
 */
export function newQueryForCollectionGroup(collectionId: string): Query {
  return new QueryImpl(ResourcePath.emptyPath(), collectionId);
}

/**
 * Returns whether the query matches a single document by path (rather than a
 * collection).
 */
export function isDocumentQuery(query: Query): boolean {
  return (
    DocumentKey.isDocumentKey(query.path) &&
    query.collectionGroup === null &&
    query.filters.length === 0
  );
}

/**
 * Returns whether the query matches a collection group rather than a specific
 * collection.
 */
export function isCollectionGroupQuery(query: Query): boolean {
  return query.collectionGroup !== null;
}

/**
 * Returns the implicit order by constraint that is used to execute the Query,
 * which can be different from the order by constraints the user provided (e.g.
 * the SDK and backend always orders by `__name__`).
 */
export function queryOrderBy(query: Query): OrderBy[] {
  const queryImpl = debugCast(query, QueryImpl);
  if (queryImpl.memoizedOrderBy === null) {
    queryImpl.memoizedOrderBy = [];

    const inequalityField = getInequalityFilterField(queryImpl);
    const firstOrderByField = getFirstOrderByField(queryImpl);
    if (inequalityField !== null && firstOrderByField === null) {
      // In order to implicitly add key ordering, we must also add the
      // inequality filter field for it to be a valid query.
      // Note that the default inequality field and key ordering is ascending.
      if (!inequalityField.isKeyField()) {
        queryImpl.memoizedOrderBy.push(new OrderBy(inequalityField));
      }
      queryImpl.memoizedOrderBy.push(
        new OrderBy(FieldPath.keyField(), Direction.ASCENDING)
      );
    } else {
      debugAssert(
        inequalityField === null ||
          (firstOrderByField !== null &&
            inequalityField.isEqual(firstOrderByField)),
        'First orderBy should match inequality field.'
      );
      let foundKeyOrdering = false;
      for (const orderBy of queryImpl.explicitOrderBy) {
        queryImpl.memoizedOrderBy.push(orderBy);
        if (orderBy.field.isKeyField()) {
          foundKeyOrdering = true;
        }
      }
      if (!foundKeyOrdering) {
        // The order of the implicit key ordering always matches the last
        // explicit order by
        const lastDirection =
          queryImpl.explicitOrderBy.length > 0
            ? queryImpl.explicitOrderBy[queryImpl.explicitOrderBy.length - 1]
                .dir
            : Direction.ASCENDING;
        queryImpl.memoizedOrderBy.push(
          new OrderBy(FieldPath.keyField(), lastDirection)
        );
      }
    }
  }
  return queryImpl.memoizedOrderBy;
}

/**
 * Converts this `Query` instance to it's corresponding `Target` representation.
 */
export function queryToTarget(query: Query): Target {
  const queryImpl = debugCast(query, QueryImpl);
  if (!queryImpl.memoizedTarget) {
    if (queryImpl.limitType === LimitType.First) {
      queryImpl.memoizedTarget = newTarget(
        queryImpl.path,
        queryImpl.collectionGroup,
        queryOrderBy(queryImpl),
        queryImpl.filters,
        queryImpl.limit,
        queryImpl.startAt,
        queryImpl.endAt
      );
    } else {
      // Flip the orderBy directions since we want the last results
      const orderBys = [] as OrderBy[];
      for (const orderBy of queryOrderBy(queryImpl)) {
        const dir =
          orderBy.dir === Direction.DESCENDING
            ? Direction.ASCENDING
            : Direction.DESCENDING;
        orderBys.push(new OrderBy(orderBy.field, dir));
      }

      // We need to swap the cursors to match the now-flipped query ordering.
      const startAt = queryImpl.endAt
        ? new Bound(queryImpl.endAt.position, !queryImpl.endAt.before)
        : null;
      const endAt = queryImpl.startAt
        ? new Bound(queryImpl.startAt.position, !queryImpl.startAt.before)
        : null;

      // Now return as a LimitType.First query.
      queryImpl.memoizedTarget = newTarget(
        queryImpl.path,
        queryImpl.collectionGroup,
        orderBys,
        queryImpl.filters,
        queryImpl.limit,
        startAt,
        endAt
      );
    }
  }
  return queryImpl.memoizedTarget!;
}

export function queryWithAddedFilter(query: Query, filter: Filter): Query {
  debugAssert(
    getInequalityFilterField(query) == null ||
      !(filter instanceof FieldFilter) ||
      !filter.isInequality() ||
      filter.field.isEqual(getInequalityFilterField(query)!),
    'Query must only have one inequality field.'
  );

  debugAssert(
    !isDocumentQuery(query),
    'No filtering allowed for document query'
  );

  const newFilters = query.filters.concat([filter]);
  return new QueryImpl(
    query.path,
    query.collectionGroup,
    query.explicitOrderBy.slice(),
    newFilters,
    query.limit,
    query.limitType,
    query.startAt,
    query.endAt
  );
}

export function queryWithAddedOrderBy(query: Query, orderBy: OrderBy): Query {
  debugAssert(
    !query.startAt && !query.endAt,
    'Bounds must be set after orderBy'
  );
  // TODO(dimond): validate that orderBy does not list the same key twice.
  const newOrderBy = query.explicitOrderBy.concat([orderBy]);
  return new QueryImpl(
    query.path,
    query.collectionGroup,
    newOrderBy,
    query.filters.slice(),
    query.limit,
    query.limitType,
    query.startAt,
    query.endAt
  );
}

export function queryWithLimit(
  query: Query,
  limit: number,
  limitType: LimitType
): Query {
  return new QueryImpl(
    query.path,
    query.collectionGroup,
    query.explicitOrderBy.slice(),
    query.filters.slice(),
    limit,
    limitType,
    query.startAt,
    query.endAt
  );
}

export function queryWithStartAt(query: Query, bound: Bound): Query {
  return new QueryImpl(
    query.path,
    query.collectionGroup,
    query.explicitOrderBy.slice(),
    query.filters.slice(),
    query.limit,
    query.limitType,
    bound,
    query.endAt
  );
}

export function queryWithEndAt(query: Query, bound: Bound): Query {
  return new QueryImpl(
    query.path,
    query.collectionGroup,
    query.explicitOrderBy.slice(),
    query.filters.slice(),
    query.limit,
    query.limitType,
    query.startAt,
    bound
  );
}

export function queryEquals(left: Query, right: Query): boolean {
  return (
    targetEquals(queryToTarget(left), queryToTarget(right)) &&
    left.limitType === right.limitType
  );
}

// TODO(b/29183165): This is used to get a unique string from a query to, for
// example, use as a dictionary key, but the implementation is subject to
// collisions. Make it collision-free.
export function canonifyQuery(query: Query): string {
  return `${canonifyTarget(queryToTarget(query))}|lt:${query.limitType}`;
}

export function stringifyQuery(query: Query): string {
  return `Query(target=${stringifyTarget(queryToTarget(query))}; limitType=${
    query.limitType
  })`;
}

/** Returns whether `doc` matches the constraints of `query`. */
export function queryMatches(query: Query, doc: Document): boolean {
  return (
    queryMatchesPathAndCollectionGroup(query, doc) &&
    queryMatchesOrderBy(query, doc) &&
    queryMatchesFilters(query, doc) &&
    queryMatchesBounds(query, doc)
  );
}

function queryMatchesPathAndCollectionGroup(
  query: Query,
  doc: Document
): boolean {
  const docPath = doc.key.path;
  if (query.collectionGroup !== null) {
    // NOTE: this.path is currently always empty since we don't expose Collection
    // Group queries rooted at a document path yet.
    return (
      doc.key.hasCollectionId(query.collectionGroup) &&
      query.path.isPrefixOf(docPath)
    );
  } else if (DocumentKey.isDocumentKey(query.path)) {
    // exact match for document queries
    return query.path.isEqual(docPath);
  } else {
    // shallow ancestor queries by default
    return query.path.isImmediateParentOf(docPath);
  }
}

/**
 * A document must have a value for every ordering clause in order to show up
 * in the results.
 */
function queryMatchesOrderBy(query: Query, doc: Document): boolean {
  for (const orderBy of query.explicitOrderBy) {
    // order by key always matches
    if (!orderBy.field.isKeyField() && doc.field(orderBy.field) === null) {
      return false;
    }
  }
  return true;
}

function queryMatchesFilters(query: Query, doc: Document): boolean {
  for (const filter of query.filters) {
    if (!filter.matches(doc)) {
      return false;
    }
  }
  return true;
}

/** Makes sure a document is within the bounds, if provided. */
function queryMatchesBounds(query: Query, doc: Document): boolean {
  if (
    query.startAt &&
    !sortsBeforeDocument(query.startAt, queryOrderBy(query), doc)
  ) {
    return false;
  }
  if (
    query.endAt &&
    sortsBeforeDocument(query.endAt, queryOrderBy(query), doc)
  ) {
    return false;
  }
  return true;
}

/**
 * Returns a new comparator function that can be used to compare two documents
 * based on the Query's ordering constraint.
 */
export function newQueryComparator(
  query: Query
): (d1: Document, d2: Document) => number {
  return (d1: Document, d2: Document): number => {
    let comparedOnKeyField = false;
    for (const orderBy of queryOrderBy(query)) {
      const comp = compareDocs(orderBy, d1, d2);
      if (comp !== 0) {
        return comp;
      }
      comparedOnKeyField = comparedOnKeyField || orderBy.field.isKeyField();
    }
    // Assert that we actually compared by key
    debugAssert(
      comparedOnKeyField,
      "orderBy used that doesn't compare on key field"
    );
    return 0;
  };
}

export function compareDocs(
  orderBy: OrderBy,
  d1: Document,
  d2: Document
): number {
  const comparison = orderBy.field.isKeyField()
    ? DocumentKey.comparator(d1.key, d2.key)
    : compareDocumentsByField(orderBy.field, d1, d2);
  switch (orderBy.dir) {
    case Direction.ASCENDING:
      return comparison;
    case Direction.DESCENDING:
      return -1 * comparison;
    default:
      return fail('Unknown direction: ' + orderBy.dir);
  }
}
