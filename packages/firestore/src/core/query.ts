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

import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  canonicalId,
  valueCompare,
  arrayValueContains,
  valueEquals,
  isArray,
  isNanValue,
  isNullValue,
  isReferenceValue,
  typeOrder
} from '../model/values';
import { FieldPath, ResourcePath } from '../model/path';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { isNullOrUndefined } from '../util/types';
import { Target } from './target';

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
    readonly filters: Filter[] = [],
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
      const inequalityField = this.getInequalityFilterField();
      const firstOrderByField = this.getFirstOrderByField();
      if (inequalityField !== null && firstOrderByField === null) {
        // In order to implicitly add key ordering, we must also add the
        // inequality filter field for it to be a valid query.
        // Note that the default inequality field and key ordering is ascending.
        if (inequalityField.isKeyField()) {
          this.memoizedOrderBy = [KEY_ORDERING_ASC];
        } else {
          this.memoizedOrderBy = [
            new OrderBy(inequalityField),
            KEY_ORDERING_ASC
          ];
        }
      } else {
        assert(
          inequalityField === null ||
            (firstOrderByField !== null &&
              inequalityField.isEqual(firstOrderByField))
        );
        this.memoizedOrderBy = [];
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
            lastDirection === Direction.ASCENDING
              ? KEY_ORDERING_ASC
              : KEY_ORDERING_DESC
          );
        }
      }
    }
    return this.memoizedOrderBy;
  }

  addFilter(filter: Filter): Query {
    assert(
      this.getInequalityFilterField() == null ||
        !(filter instanceof FieldFilter) ||
        !filter.isInequality() ||
        filter.field.isEqual(this.getInequalityFilterField()!)
    );

    assert(!this.isDocumentQuery());

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
    assert(!this.startAt && !this.endAt);
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
    return `${this.toTarget().canonicalId()}|lt:${this.limitType}`;
  }

  toString(): string {
    return `Query(target=${this.toTarget().toString()}; limitType=${
      this.limitType
    })`;
  }

  isEqual(other: Query): boolean {
    return (
      this.toTarget().isEqual(other.toTarget()) &&
      this.limitType === other.limitType
    );
  }

  docComparator(d1: Document, d2: Document): number {
    let comparedOnKeyField = false;
    for (const orderBy of this.orderBy) {
      const comp = orderBy.compare(d1, d2);
      if (comp !== 0) {
        return comp;
      }
      comparedOnKeyField = comparedOnKeyField || orderBy.field.isKeyField();
    }
    // Assert that we actually compared by key
    assert(comparedOnKeyField);
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
      if (filter instanceof FieldFilter && filter.isInequality()) {
        return filter.field;
      }
    }
    return null;
  }

  // Checks if any of the provided Operators are included in the query and
  // returns the first one that is, or null if none are.
  findFilterOperator(operators: Operator[]): Operator | null {
    for (const filter of this.filters) {
      if (filter instanceof FieldFilter) {
        if (operators.indexOf(filter.op) >= 0) {
          return filter.op;
        }
      }
    }
    return null;
  }

  isDocumentQuery(): boolean {
    return this.toTarget().isDocumentQuery();
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
        this.memoizedTarget = new Target(
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
        this.memoizedTarget = new Target(
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
      if (!filter.matches(doc)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Makes sure a document is within the bounds, if provided.
   */
  private matchesBounds(doc: Document): boolean {
    if (this.startAt && !this.startAt.sortsBeforeDocument(this.orderBy, doc)) {
      return false;
    }
    if (this.endAt && this.endAt.sortsBeforeDocument(this.orderBy, doc)) {
      return false;
    }
    return true;
  }

  private assertValidBound(bound: Bound): void {
    assert(bound.position.length <= this.orderBy.length);
  }
}

export abstract class Filter {
  abstract matches(doc: Document): boolean;
  abstract canonicalId(): string;
  abstract isEqual(filter: Filter): boolean;
}

export class Operator {
  static LESS_THAN = new Operator('<');
  static LESS_THAN_OR_EQUAL = new Operator('<=');
  static EQUAL = new Operator('==');
  static GREATER_THAN = new Operator('>');
  static GREATER_THAN_OR_EQUAL = new Operator('>=');
  static ARRAY_CONTAINS = new Operator('array-contains');
  static IN = new Operator('in');
  static ARRAY_CONTAINS_ANY = new Operator('array-contains-any');

  static fromString(op: string): Operator {
    switch (op) {
      case '<':
        return Operator.LESS_THAN;
      case '<=':
        return Operator.LESS_THAN_OR_EQUAL;
      case '==':
        return Operator.EQUAL;
      case '>=':
        return Operator.GREATER_THAN_OR_EQUAL;
      case '>':
        return Operator.GREATER_THAN;
      case 'array-contains':
        return Operator.ARRAY_CONTAINS;
      case 'in':
        return Operator.IN;
      case 'array-contains-any':
        return Operator.ARRAY_CONTAINS_ANY;
      default:
        return fail();
    }
  }

  constructor(public name: string) {}

  toString(): string {
    return this.name;
  }

  isEqual(other: Operator): boolean {
    return this.name === other.name;
  }
}

export class FieldFilter extends Filter {
  protected constructor(
    public field: FieldPath,
    public op: Operator,
    public value: api.Value
  ) {
    super();
  }

  /**
   * Creates a filter based on the provided arguments.
   */
  static create(field: FieldPath, op: Operator, value: api.Value): FieldFilter {
    if (field.isKeyField()) {
      if (op === Operator.IN) {
        assert(isArray(value));
        assert(
          (value.arrayValue.values || []).every(elem => isReferenceValue(elem))
        );
        return new KeyFieldInFilter(field, value);
      } else {
        assert(isReferenceValue(value));
        assert(
          op !== Operator.ARRAY_CONTAINS && op !== Operator.ARRAY_CONTAINS_ANY
        );
        return new KeyFieldFilter(field, op, value);
      }
    } else if (isNullValue(value)) {
      if (op !== Operator.EQUAL) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Invalid query. Null supports only equality comparisons.'
        );
      }
      return new FieldFilter(field, op, value);
    } else if (isNanValue(value)) {
      if (op !== Operator.EQUAL) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Invalid query. NaN supports only equality comparisons.'
        );
      }
      return new FieldFilter(field, op, value);
    } else if (op === Operator.ARRAY_CONTAINS) {
      return new ArrayContainsFilter(field, value);
    } else if (op === Operator.IN) {
      assert(isArray(value));
      return new InFilter(field, value);
    } else if (op === Operator.ARRAY_CONTAINS_ANY) {
      assert(isArray(value));
      return new ArrayContainsAnyFilter(field, value);
    } else {
      return new FieldFilter(field, op, value);
    }
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);

    // Only compare types with matching backend order (such as double and int).
    return (
      other !== null &&
      typeOrder(this.value) === typeOrder(other) &&
      this.matchesComparison(valueCompare(other, this.value))
    );
  }

  protected matchesComparison(comparison: number): boolean {
    switch (this.op) {
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
        return fail();
    }
  }

  isInequality(): boolean {
    return (
      [
        Operator.LESS_THAN,
        Operator.LESS_THAN_OR_EQUAL,
        Operator.GREATER_THAN,
        Operator.GREATER_THAN_OR_EQUAL
      ].indexOf(this.op) >= 0
    );
  }

  canonicalId(): string {
    // TODO(b/29183165): Technically, this won't be unique if two values have
    // the same description, such as the int 3 and the string "3". So we should
    // add the types in here somehow, too.
    return (
      this.field.canonicalString() +
      this.op.toString() +
      canonicalId(this.value)
    );
  }

  isEqual(other: Filter): boolean {
    if (other instanceof FieldFilter) {
      return (
        this.op.isEqual(other.op) &&
        this.field.isEqual(other.field) &&
        valueEquals(this.value, other.value)
      );
    } else {
      return false;
    }
  }

  toString(): string {
    return `${this.field.canonicalString()} ${this.op} ${canonicalId(
      this.value
    )}`;
  }
}

/** Filter that matches on key fields (i.e. '__name__'). */
export class KeyFieldFilter extends FieldFilter {
  private readonly key: DocumentKey;

  constructor(field: FieldPath, op: Operator, value: api.Value) {
    super(field, op, value);
    assert(isReferenceValue(value));
    this.key = DocumentKey.fromName(value.referenceValue);
  }

  matches(doc: Document): boolean {
    const comparison = DocumentKey.comparator(doc.key, this.key);
    return this.matchesComparison(comparison);
  }
}

/** Filter that matches on key fields within an array. */
export class KeyFieldInFilter extends FieldFilter {
  private readonly keys: DocumentKey[];

  constructor(field: FieldPath, value: api.Value) {
    super(field, Operator.IN, value);
    assert(isArray(value));
    this.keys = (value.arrayValue.values || []).map(v => {
      assert(isReferenceValue(v));
      return DocumentKey.fromName(v.referenceValue);
    });
  }

  matches(doc: Document): boolean {
    return this.keys.some(key => key.isEqual(doc.key));
  }
}

/** A Filter that implements the array-contains operator. */
export class ArrayContainsFilter extends FieldFilter {
  constructor(field: FieldPath, value: api.Value) {
    super(field, Operator.ARRAY_CONTAINS, value);
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);
    return isArray(other) && arrayValueContains(other.arrayValue, this.value);
  }
}

/** A Filter that implements the IN operator. */
export class InFilter extends FieldFilter {
  constructor(field: FieldPath, value: api.Value) {
    super(field, Operator.IN, value);
    assert(isArray(value));
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);
    return other !== null && arrayValueContains(this.value.arrayValue!, other);
  }
}

/** A Filter that implements the array-contains-any operator. */
export class ArrayContainsAnyFilter extends FieldFilter {
  constructor(field: FieldPath, value: api.Value) {
    super(field, Operator.ARRAY_CONTAINS_ANY, value);
    assert(isArray(value));
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);
    if (!isArray(other) || !other.arrayValue.values) {
      return false;
    }
    return other.arrayValue.values.some(val =>
      arrayValueContains(this.value.arrayValue!, val)
    );
  }
}

/**
 * The direction of sorting in an order by.
 */
export class Direction {
  static ASCENDING = new Direction('asc');
  static DESCENDING = new Direction('desc');

  private constructor(public name: string) {}

  toString(): string {
    return this.name;
  }
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

  canonicalId(): string {
    // TODO(b/29183165): Make this collision robust.
    return `${this.before ? 'b' : 'a'}:${this.position
      .map(p => canonicalId(p))
      .join(',')}`;
  }

  /**
   * Returns true if a document sorts before a bound using the provided sort
   * order.
   */
  sortsBeforeDocument(orderBy: OrderBy[], doc: Document): boolean {
    assert(this.position.length <= orderBy.length);
    let comparison = 0;
    for (let i = 0; i < this.position.length; i++) {
      const orderByComponent = orderBy[i];
      const component = this.position[i];
      if (orderByComponent.field.isKeyField()) {
        assert(isReferenceValue(component));
        comparison = DocumentKey.comparator(
          DocumentKey.fromName(component.referenceValue),
          doc.key
        );
      } else {
        const docValue = doc.field(orderByComponent.field);
        assert(docValue !== null);
        comparison = valueCompare(component, docValue);
      }
      if (orderByComponent.dir === Direction.DESCENDING) {
        comparison = comparison * -1;
      }
      if (comparison !== 0) {
        break;
      }
    }
    return this.before ? comparison <= 0 : comparison < 0;
  }

  isEqual(other: Bound | null): boolean {
    if (other === null) {
      return false;
    }
    if (
      this.before !== other.before ||
      this.position.length !== other.position.length
    ) {
      return false;
    }
    for (let i = 0; i < this.position.length; i++) {
      const thisPosition = this.position[i];
      const otherPosition = other.position[i];
      if (!valueEquals(thisPosition, otherPosition)) {
        return false;
      }
    }
    return true;
  }
}

/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */
export class OrderBy {
  readonly dir: Direction;
  private readonly isKeyOrderBy: boolean;

  constructor(readonly field: FieldPath, dir?: Direction) {
    if (dir === undefined) {
      dir = Direction.ASCENDING;
    }
    this.dir = dir;
    this.isKeyOrderBy = field.isKeyField();
  }

  compare(d1: Document, d2: Document): number {
    const comparison = this.isKeyOrderBy
      ? Document.compareByKey(d1, d2)
      : Document.compareByField(this.field, d1, d2);
    switch (this.dir) {
      case Direction.ASCENDING:
        return comparison;
      case Direction.DESCENDING:
        return -1 * comparison;
      default:
        return fail();
    }
  }

  canonicalId(): string {
    // TODO(b/29183165): Make this collision robust.
    return this.field.canonicalString() + this.dir.toString();
  }

  toString(): string {
    return `${this.field.canonicalString()} (${this.dir})`;
  }

  isEqual(other: OrderBy): boolean {
    return this.dir === other.dir && this.field.isEqual(other.field);
  }
}

const KEY_ORDERING_ASC = new OrderBy(FieldPath.keyField(), Direction.ASCENDING);
const KEY_ORDERING_DESC = new OrderBy(
  FieldPath.keyField(),
  Direction.DESCENDING
);
