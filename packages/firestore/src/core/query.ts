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

import * as api from '../protos/firestore_proto_api';

import { compareDocumentsByField, Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  canonicalId,
  valueCompare,
  arrayValueContains,
  valueEquals,
  isArray,
  isReferenceValue,
  typeOrder
} from '../model/values';
import { FieldPath, ResourcePath } from '../model/path';
import { debugAssert, fail } from '../util/assert';
import { isNullOrUndefined } from '../util/types';
import {
  canonifyTarget,
  isDocumentTarget,
  newTarget,
  stringifyTarget,
  Target,
  targetEquals
} from './target';

export const enum LimitType {
  First = 'F',
  Last = 'L'
}

/**
 * Query encapsulates all the query attributes we support in the SDK. It can
 * be run against the LocalStore, as well as be converted to a `Target` to
 * query the RemoteStore results.
 */
export class Query {
  // TODO(firestorelite): Refactor this class so that methods that are not used
  // in the Lite client become tree-shakeable.

  static atPath(path: ResourcePath): Query {
    return new Query(path);
  }

  private memoizedOrderBy: OrderBy[] | null = null;

  // The corresponding `Target` of this `Query` instance.
  private memoizedTarget: Target | null = null;

  /**
   * Initializes a Query with a path and optional additional query constraints.
   * Path must currently be empty if this is a collection group query.
   */
  constructor(
    readonly path: ResourcePath,
    readonly collectionGroup: string | null = null,
    readonly explicitOrderBy: OrderBy[] = [],
    readonly filters: FieldFilter[] = [],
    readonly limit: number | null = null,
    readonly limitType: LimitType = LimitType.First,
    readonly startAt: Bound | null = null,
    readonly endAt: Bound | null = null
  ) {
    if (this.startAt) {
      this.assertValidBound(this.startAt);
    }
    if (this.endAt) {
      this.assertValidBound(this.endAt);
    }
  }

  get orderBy(): OrderBy[] {
    if (this.memoizedOrderBy === null) {
      this.memoizedOrderBy = [];

      const inequalityField = this.getInequalityFilterField();
      const firstOrderByField = this.getFirstOrderByField();
      if (inequalityField !== null && firstOrderByField === null) {
        // In order to implicitly add key ordering, we must also add the
        // inequality filter field for it to be a valid query.
        // Note that the default inequality field and key ordering is ascending.
        if (!inequalityField.isKeyField()) {
          this.memoizedOrderBy.push(new OrderBy(inequalityField));
        }
        this.memoizedOrderBy.push(
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
        for (const orderBy of this.explicitOrderBy) {
          this.memoizedOrderBy.push(orderBy);
          if (orderBy.field.isKeyField()) {
            foundKeyOrdering = true;
          }
        }
        if (!foundKeyOrdering) {
          // The order of the implicit key ordering always matches the last
          // explicit order by
          const lastDirection =
            this.explicitOrderBy.length > 0
              ? this.explicitOrderBy[this.explicitOrderBy.length - 1].dir
              : Direction.ASCENDING;
          this.memoizedOrderBy.push(
            new OrderBy(FieldPath.keyField(), lastDirection)
          );
        }
      }
    }
    return this.memoizedOrderBy;
  }

  addFilter(filter: FieldFilter): Query {
    debugAssert(
      this.getInequalityFilterField() == null ||
        !isInequalityFilter(filter) ||
        filter.field.isEqual(this.getInequalityFilterField()!),
      'Query must only have one inequality field.'
    );

    debugAssert(
      !this.isDocumentQuery(),
      'No filtering allowed for document query'
    );

    const newFilters = this.filters.concat([filter]);
    return new Query(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      newFilters,
      this.limit,
      this.limitType,
      this.startAt,
      this.endAt
    );
  }

  addOrderBy(orderBy: OrderBy): Query {
    debugAssert(
      !this.startAt && !this.endAt,
      'Bounds must be set after orderBy'
    );
    // TODO(dimond): validate that orderBy does not list the same key twice.
    const newOrderBy = this.explicitOrderBy.concat([orderBy]);
    return new Query(
      this.path,
      this.collectionGroup,
      newOrderBy,
      this.filters.slice(),
      this.limit,
      this.limitType,
      this.startAt,
      this.endAt
    );
  }

  withLimitToFirst(limit: number | null): Query {
    return new Query(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      limit,
      LimitType.First,
      this.startAt,
      this.endAt
    );
  }

  withLimitToLast(limit: number | null): Query {
    return new Query(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      limit,
      LimitType.Last,
      this.startAt,
      this.endAt
    );
  }

  withStartAt(bound: Bound): Query {
    return new Query(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      this.limit,
      this.limitType,
      bound,
      this.endAt
    );
  }

  withEndAt(bound: Bound): Query {
    return new Query(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      this.limit,
      this.limitType,
      this.startAt,
      bound
    );
  }

  /**
   * Helper to convert a collection group query into a collection query at a
   * specific path. This is used when executing collection group queries, since
   * we have to split the query into a set of collection queries at multiple
   * paths.
   */
  asCollectionQueryAtPath(path: ResourcePath): Query {
    return new Query(
      path,
      /*collectionGroup=*/ null,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      this.limit,
      this.limitType,
      this.startAt,
      this.endAt
    );
  }

  /**
   * Returns true if this query does not specify any query constraints that
   * could remove results.
   */
  matchesAllDocuments(): boolean {
    return (
      this.filters.length === 0 &&
      this.limit === null &&
      this.startAt == null &&
      this.endAt == null &&
      (this.explicitOrderBy.length === 0 ||
        (this.explicitOrderBy.length === 1 &&
          this.explicitOrderBy[0].field.isKeyField()))
    );
  }

  // TODO(b/29183165): This is used to get a unique string from a query to, for
  // example, use as a dictionary key, but the implementation is subject to
  // collisions. Make it collision-free.
  canonicalId(): string {
    return `${canonifyTarget(this.toTarget())}|lt:${this.limitType}`;
  }

  toString(): string {
    return `Query(target=${stringifyTarget(this.toTarget())}; limitType=${
      this.limitType
    })`;
  }

  isEqual(other: Query): boolean {
    return (
      targetEquals(this.toTarget(), other.toTarget()) &&
      this.limitType === other.limitType
    );
  }

  docComparator(d1: Document, d2: Document): number {
    let comparedOnKeyField = false;
    for (const orderBy of this.orderBy) {
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
  }

  matches(doc: Document): boolean {
    return (
      this.matchesPathAndCollectionGroup(doc) &&
      this.matchesOrderBy(doc) &&
      this.matchesFilters(doc) &&
      this.matchesBounds(doc)
    );
  }

  hasLimitToFirst(): boolean {
    return !isNullOrUndefined(this.limit) && this.limitType === LimitType.First;
  }

  hasLimitToLast(): boolean {
    return !isNullOrUndefined(this.limit) && this.limitType === LimitType.Last;
  }

  getFirstOrderByField(): FieldPath | null {
    return this.explicitOrderBy.length > 0
      ? this.explicitOrderBy[0].field
      : null;
  }

  getInequalityFilterField(): FieldPath | null {
    for (const filter of this.filters) {
      if (isInequalityFilter(filter)) {
        return filter.field;
      }
    }
    return null;
  }

  // Checks if any of the provided Operators are included in the query and
  // returns the first one that is, or null if none are.
  findFilterOperator(operators: Operator[]): Operator | null {
    for (const filter of this.filters) {
      if (operators.indexOf(filter.op) >= 0) {
        return filter.op;
      }
    }
    return null;
  }

  isDocumentQuery(): boolean {
    return isDocumentTarget(this.toTarget());
  }

  isCollectionGroupQuery(): boolean {
    return this.collectionGroup !== null;
  }

  /**
   * Converts this `Query` instance to it's corresponding `Target`
   * representation.
   */
  toTarget(): Target {
    if (!this.memoizedTarget) {
      if (this.limitType === LimitType.First) {
        this.memoizedTarget = newTarget(
          this.path,
          this.collectionGroup,
          this.orderBy,
          this.filters,
          this.limit,
          this.startAt,
          this.endAt
        );
      } else {
        // Flip the orderBy directions since we want the last results
        const orderBys = [] as OrderBy[];
        for (const orderBy of this.orderBy) {
          const dir =
            orderBy.dir === Direction.DESCENDING
              ? Direction.ASCENDING
              : Direction.DESCENDING;
          orderBys.push(new OrderBy(orderBy.field, dir));
        }

        // We need to swap the cursors to match the now-flipped query ordering.
        const startAt = this.endAt
          ? new Bound(this.endAt.position, !this.endAt.before)
          : null;
        const endAt = this.startAt
          ? new Bound(this.startAt.position, !this.startAt.before)
          : null;

        // Now return as a LimitType.First query.
        this.memoizedTarget = newTarget(
          this.path,
          this.collectionGroup,
          orderBys,
          this.filters,
          this.limit,
          startAt,
          endAt
        );
      }
    }
    return this.memoizedTarget!;
  }

  private matchesPathAndCollectionGroup(doc: Document): boolean {
    const docPath = doc.key.path;
    if (this.collectionGroup !== null) {
      // NOTE: this.path is currently always empty since we don't expose Collection
      // Group queries rooted at a document path yet.
      return (
        doc.key.hasCollectionId(this.collectionGroup) &&
        this.path.isPrefixOf(docPath)
      );
    } else if (DocumentKey.isDocumentKey(this.path)) {
      // exact match for document queries
      return this.path.isEqual(docPath);
    } else {
      // shallow ancestor queries by default
      return this.path.isImmediateParentOf(docPath);
    }
  }

  /**
   * A document must have a value for every ordering clause in order to show up
   * in the results.
   */
  private matchesOrderBy(doc: Document): boolean {
    for (const orderBy of this.explicitOrderBy) {
      // order by key always matches
      if (!orderBy.field.isKeyField() && doc.field(orderBy.field) === null) {
        return false;
      }
    }
    return true;
  }

  private matchesFilters(doc: Document): boolean {
    for (const filter of this.filters) {
      if (!fieldFilterMatches(filter, doc)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Makes sure a document is within the bounds, if provided.
   */
  private matchesBounds(doc: Document): boolean {
    if (this.startAt && !sortsBeforeDocument(this.startAt, this.orderBy, doc)) {
      return false;
    }
    if (this.endAt && sortsBeforeDocument(this.endAt, this.orderBy, doc)) {
      return false;
    }
    return true;
  }

  private assertValidBound(bound: Bound): void {
    debugAssert(
      bound.position.length <= this.orderBy.length,
      'Bound is longer than orderBy'
    );
  }
}

export const enum Operator {
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  EQUAL = '==',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  ARRAY_CONTAINS = 'array-contains',
  IN = 'in',
  ARRAY_CONTAINS_ANY = 'array-contains-any'
}

export class FieldFilter {
  constructor(
    public field: FieldPath,
    public op: Operator,
    public value: api.Value
  ) {}
}

/** Returns a debug description for `fieldFilter`. */
export function stringifyFieldFilter(fieldFilter: FieldFilter): string {
  return `${fieldFilter.field.canonicalString()} ${
    fieldFilter.op
  } ${canonicalId(fieldFilter.value)}`;
}

export function canonifyFieldFilter(fieldFilter: FieldFilter): string {
  // TODO(b/29183165): Technically, this won't be unique if two values have
  // the same description, such as the int 3 and the string "3". So we should
  // add the types in here somehow, too.
  return (
    fieldFilter.field.canonicalString() +
    fieldFilter.op.toString() +
    canonicalId(fieldFilter.value)
  );
}

/** Returns whether this filter filters by <, <=, => or >. */
export function isInequalityFilter(filter: FieldFilter): boolean {
  return (
    [
      Operator.LESS_THAN,
      Operator.LESS_THAN_OR_EQUAL,
      Operator.GREATER_THAN,
      Operator.GREATER_THAN_OR_EQUAL
    ].indexOf(filter.op) >= 0
  );
}

function fieldFilterMatches(filter: FieldFilter, doc: Document): boolean {
  const op = filter.op;
  const filterValue = filter.value;

  if (filter.field.isKeyField()) {
    if (op === Operator.IN) {
      // Filter that matches on key fields within an array.
      debugAssert(
        isArray(filterValue),
        'Comparing on key with IN, but filter value not an ArrayValue'
      );
      const keys = (filterValue.arrayValue.values || []).map(v => {
        debugAssert(
          isReferenceValue(v),
          'Comparing on key with IN, but an array value was not a ReferenceValue'
        );
        return DocumentKey.fromName(v.referenceValue);
      });
      return keys.some(key => key.isEqual(doc.key));
    } else {
      // Filter that matches on a single key field (i.e. '__name__').
      debugAssert(
        isReferenceValue(filterValue),
        'Comparing on key, but filter value not a RefValue'
      );
      debugAssert(
        op !== Operator.ARRAY_CONTAINS && op !== Operator.ARRAY_CONTAINS_ANY,
        `'${op}' queries don't make sense on document keys.`
      );
      const key = DocumentKey.fromName(filterValue.referenceValue);
      const comparison = DocumentKey.comparator(doc.key, key);
      return matchesComparison(filter, comparison);
    }
  }

  const fieldValue = doc.field(filter.field);
  if (op === Operator.ARRAY_CONTAINS) {
    return (
      isArray(fieldValue) &&
      arrayValueContains(fieldValue.arrayValue, filter.value)
    );
  } else if (op === Operator.ARRAY_CONTAINS_ANY) {
    debugAssert(
      isArray(filterValue),
      'ArrayContainsAnyFilter expects an ArrayValue'
    );
    if (!isArray(fieldValue) || !fieldValue.arrayValue.values) {
      return false;
    }
    return fieldValue.arrayValue.values.some(val =>
      arrayValueContains(filter.value.arrayValue!, val)
    );
  } else if (op === Operator.IN) {
    debugAssert(isArray(filterValue), 'InFilter expects an ArrayValue');
    return (
      fieldValue !== null &&
      arrayValueContains(filter.value.arrayValue!, fieldValue)
    );
  } else {
    // Only compare types with matching backend order (such as double and int).
    return (
      fieldValue !== null &&
      typeOrder(filter.value) === typeOrder(fieldValue) &&
      matchesComparison(filter, valueCompare(fieldValue, filter.value))
    );
  }
}

function matchesComparison(filter: FieldFilter, comparison: number): boolean {
  switch (filter.op) {
    case Operator.LESS_THAN:
      return comparison < 0;
    case Operator.LESS_THAN_OR_EQUAL:
      return comparison <= 0;
    case Operator.EQUAL:
      return comparison === 0;
    case Operator.GREATER_THAN:
      return comparison > 0;
    case Operator.GREATER_THAN_OR_EQUAL:
      return comparison >= 0;
    default:
      return fail('Unknown FieldFilter operator: ' + filter.op);
  }
}

export function fieldFilterEquals(f1: FieldFilter, f2: FieldFilter): boolean {
  return (
    f1.op === f2.op &&
    f1.field.isEqual(f2.field) &&
    valueEquals(f1.value, f2.value)
  );
}
/**
 * The direction of sorting in an order by.
 */
export const enum Direction {
  ASCENDING = 'asc',
  DESCENDING = 'desc'
}

/**
 * Represents a bound of a query.
 *
 * The bound is specified with the given components representing a position and
 * whether it's just before or just after the position (relative to whatever the
 * query order is).
 *
 * The position represents a logical index position for a query. It's a prefix
 * of values for the (potentially implicit) order by clauses of a query.
 *
 * Bound provides a function to determine whether a document comes before or
 * after a bound. This is influenced by whether the position is just before or
 * just after the provided values.
 */
export class Bound {
  constructor(readonly position: api.Value[], readonly before: boolean) {}
}

export function canonifyBound(bound: Bound): string {
  // TODO(b/29183165): Make this collision robust.
  return `${bound.before ? 'b' : 'a'}:${bound.position
    .map(p => canonicalId(p))
    .join(',')}`;
}

/**
 * Returns true if a document sorts before a bound using the provided sort
 * order.
 */
export function sortsBeforeDocument(
  bound: Bound,
  orderBy: OrderBy[],
  doc: Document
): boolean {
  debugAssert(
    bound.position.length <= orderBy.length,
    "Bound has more components than query's orderBy"
  );
  let comparison = 0;
  for (let i = 0; i < bound.position.length; i++) {
    const orderByComponent = orderBy[i];
    const component = bound.position[i];
    if (orderByComponent.field.isKeyField()) {
      debugAssert(
        isReferenceValue(component),
        'Bound has a non-key value where the key path is being used.'
      );
      comparison = DocumentKey.comparator(
        DocumentKey.fromName(component.referenceValue),
        doc.key
      );
    } else {
      const docValue = doc.field(orderByComponent.field);
      debugAssert(
        docValue !== null,
        'Field should exist since document matched the orderBy already.'
      );
      comparison = valueCompare(component, docValue);
    }
    if (orderByComponent.dir === Direction.DESCENDING) {
      comparison = comparison * -1;
    }
    if (comparison !== 0) {
      break;
    }
  }
  return bound.before ? comparison <= 0 : comparison < 0;
}

export function boundEquals(left: Bound | null, right: Bound | null): boolean {
  if (left === null) {
    return right === null;
  } else if (right === null) {
    return false;
  }

  if (
    left.before !== right.before ||
    left.position.length !== right.position.length
  ) {
    return false;
  }
  for (let i = 0; i < left.position.length; i++) {
    const leftPosition = left.position[i];
    const rightPosition = right.position[i];
    if (!valueEquals(leftPosition, rightPosition)) {
      return false;
    }
  }
  return true;
}

/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */
export class OrderBy {
  constructor(
    readonly field: FieldPath,
    readonly dir: Direction = Direction.ASCENDING
  ) {}
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

export function canonifyOrderBy(orderBy: OrderBy): string {
  // TODO(b/29183165): Make this collision robust.
  return orderBy.field.canonicalString() + orderBy.dir;
}

export function stringifyOrderBy(orderBy: OrderBy): string {
  return `${orderBy.field.canonicalString()} (${orderBy.dir})`;
}

export function orderByEquals(left: OrderBy, right: OrderBy): boolean {
  return left.dir === right.dir && left.field.isEqual(right.field);
}
