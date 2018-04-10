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

import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  DoubleValue,
  FieldValue,
  NullValue,
  RefValue
} from '../model/field_value';
import { FieldPath, ResourcePath } from '../model/path';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { isNullOrUndefined } from '../util/types';

export class Query {
  static atPath(path: ResourcePath): Query {
    return new Query(path);
  }

  private memoizedCanonicalId: string | null = null;
  private memoizedOrderBy: OrderBy[] | null = null;

  constructor(
    readonly path: ResourcePath,
    readonly explicitOrderBy: OrderBy[] = [],
    readonly filters: Filter[] = [],
    readonly limit: number | null = null,
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
              inequalityField.isEqual(firstOrderByField)),
          'First orderBy should match inequality field.'
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
        !(filter instanceof RelationFilter) ||
        !filter.isInequality() ||
        filter.field.isEqual(this.getInequalityFilterField()!),
      'Query must only have one inequality field.'
    );

    assert(
      !DocumentKey.isDocumentKey(this.path),
      'No filtering allowed for document query'
    );
    const newFilters = this.filters.concat([filter]);
    return new Query(
      this.path,
      this.explicitOrderBy.slice(),
      newFilters,
      this.limit,
      this.startAt,
      this.endAt
    );
  }

  addOrderBy(orderBy: OrderBy): Query {
    assert(
      !DocumentKey.isDocumentKey(this.path),
      'No ordering allowed for document query'
    );
    assert(!this.startAt && !this.endAt, 'Bounds must be set after orderBy');
    // TODO(dimond): validate that orderBy does not list the same key twice.
    const newOrderBy = this.explicitOrderBy.concat([orderBy]);
    return new Query(
      this.path,
      newOrderBy,
      this.filters.slice(),
      this.limit,
      this.startAt,
      this.endAt
    );
  }

  withLimit(limit: number | null): Query {
    return new Query(
      this.path,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      limit,
      this.startAt,
      this.endAt
    );
  }

  withStartAt(bound: Bound): Query {
    return new Query(
      this.path,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      this.limit,
      bound,
      this.endAt
    );
  }

  withEndAt(bound: Bound): Query {
    return new Query(
      this.path,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      this.limit,
      this.startAt,
      bound
    );
  }

  // TODO(b/29183165): This is used to get a unique string from a query to, for
  // example, use as a dictionary key, but the implementation is subject to
  // collisions. Make it collision-free.
  canonicalId(): string {
    if (this.memoizedCanonicalId === null) {
      let canonicalId = this.path.canonicalString();
      canonicalId += '|f:';
      for (const filter of this.filters) {
        canonicalId += filter.canonicalId();
        canonicalId += ',';
      }
      canonicalId += '|ob:';
      // TODO(dimond): make this collision resistant
      for (const orderBy of this.orderBy) {
        canonicalId += orderBy.canonicalId();
        canonicalId += ',';
      }
      if (!isNullOrUndefined(this.limit)) {
        canonicalId += '|l:';
        canonicalId += this.limit!;
      }
      if (this.startAt) {
        canonicalId += '|lb:';
        canonicalId += this.startAt.canonicalId();
      }
      if (this.endAt) {
        canonicalId += '|ub:';
        canonicalId += this.endAt.canonicalId();
      }
      this.memoizedCanonicalId = canonicalId;
    }
    return this.memoizedCanonicalId;
  }

  toString(): string {
    let str = 'Query(' + this.path.canonicalString();
    if (this.filters.length > 0) {
      str += `, filters: [${this.filters.join(', ')}]`;
    }
    if (!isNullOrUndefined(this.limit)) {
      str += ', limit: ' + this.limit;
    }
    if (this.explicitOrderBy.length > 0) {
      str += `, orderBy: [${this.explicitOrderBy.join(', ')}]`;
    }
    if (this.startAt) {
      str += ', startAt: ' + this.startAt.canonicalId();
    }
    if (this.endAt) {
      str += ', endAt: ' + this.endAt.canonicalId();
    }

    return str + ')';
  }

  isEqual(other: Query): boolean {
    if (this.limit !== other.limit) {
      return false;
    }

    if (this.orderBy.length !== other.orderBy.length) {
      return false;
    }

    for (let i = 0; i < this.orderBy.length; i++) {
      if (!this.orderBy[i].isEqual(other.orderBy[i])) {
        return false;
      }
    }

    if (this.filters.length !== other.filters.length) {
      return false;
    }

    for (let i = 0; i < this.filters.length; i++) {
      if (!this.filters[i].isEqual(other.filters[i])) {
        return false;
      }
    }

    if (!this.path.isEqual(other.path)) {
      return false;
    }

    if (
      this.startAt !== null
        ? !this.startAt.isEqual(other.startAt)
        : other.startAt !== null
    ) {
      return false;
    }

    return this.endAt !== null
      ? this.endAt.isEqual(other.endAt)
      : other.endAt === null;
  }

  docComparator(d1: Document, d2: Document): number {
    let comparedOnKeyField = false;
    for (const orderBy of this.orderBy) {
      const comp = orderBy.compare(d1, d2);
      if (comp !== 0) return comp;
      comparedOnKeyField = comparedOnKeyField || orderBy.field.isKeyField();
    }
    // Assert that we actually compared by key
    assert(
      comparedOnKeyField,
      "orderBy used that doesn't compare on key field"
    );
    return 0;
  }

  matches(doc: Document): boolean {
    return (
      this.matchesAncestor(doc) &&
      this.matchesOrderBy(doc) &&
      this.matchesFilters(doc) &&
      this.matchesBounds(doc)
    );
  }

  hasLimit(): boolean {
    return !isNullOrUndefined(this.limit);
  }

  getFirstOrderByField(): FieldPath | null {
    return this.explicitOrderBy.length > 0
      ? this.explicitOrderBy[0].field
      : null;
  }

  getInequalityFilterField(): FieldPath | null {
    for (const filter of this.filters) {
      if (filter instanceof RelationFilter && filter.isInequality()) {
        return filter.field;
      }
    }
    return null;
  }

  isDocumentQuery(): boolean {
    return DocumentKey.isDocumentKey(this.path) && this.filters.length === 0;
  }

  private matchesAncestor(doc: Document): boolean {
    const docPath = doc.key.path;
    if (DocumentKey.isDocumentKey(this.path)) {
      // exact match for document queries
      return this.path.isEqual(docPath);
    } else {
      // shallow ancestor queries by default
      return (
        this.path.isPrefixOf(docPath) && this.path.length === docPath.length - 1
      );
    }
  }

  /**
   * A document must have a value for every ordering clause in order to show up
   * in the results.
   */
  private matchesOrderBy(doc: Document): boolean {
    for (const orderBy of this.explicitOrderBy) {
      // order by key always matches
      if (
        !orderBy.field.isKeyField() &&
        doc.field(orderBy.field) === undefined
      ) {
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
    assert(
      bound.position.length <= this.orderBy.length,
      'Bound is longer than orderBy'
    );
  }
}

export interface Filter {
  matches(doc: Document): boolean;
  canonicalId(): string;
  isEqual(filter: Filter): boolean;
}

export class RelationOp {
  static LESS_THAN = new RelationOp('<');
  static LESS_THAN_OR_EQUAL = new RelationOp('<=');
  static EQUAL = new RelationOp('==');
  static GREATER_THAN = new RelationOp('>');
  static GREATER_THAN_OR_EQUAL = new RelationOp('>=');

  static fromString(op: string): RelationOp {
    switch (op) {
      case '<':
        return RelationOp.LESS_THAN;
      case '<=':
        return RelationOp.LESS_THAN_OR_EQUAL;
      case '==':
        return RelationOp.EQUAL;
      case '>=':
        return RelationOp.GREATER_THAN_OR_EQUAL;
      case '>':
        return RelationOp.GREATER_THAN;
      default:
        return fail('Unknown relation: ' + op);
    }
  }

  constructor(public name: string) {}

  toString(): string {
    return this.name;
  }

  isEqual(other: RelationOp): boolean {
    return this.name === other.name;
  }
}

export class RelationFilter implements Filter {
  constructor(
    public field: FieldPath,
    public op: RelationOp,
    public value: FieldValue
  ) {}

  matches(doc: Document): boolean {
    if (this.field.isKeyField()) {
      assert(
        this.value instanceof RefValue,
        'Comparing on key, but filter value not a RefValue'
      );
      const refValue = this.value as RefValue;
      const comparison = DocumentKey.comparator(doc.key, refValue.key);
      return this.matchesComparison(comparison);
    } else {
      const val = doc.field(this.field);
      return val !== undefined && this.matchesValue(val);
    }
  }

  private matchesValue(value: FieldValue): boolean {
    // Only compare types with matching backend order (such as double and int).
    if (this.value.typeOrder !== value.typeOrder) {
      return false;
    }
    return this.matchesComparison(value.compareTo(this.value));
  }

  private matchesComparison(comparison: number): boolean {
    switch (this.op) {
      case RelationOp.LESS_THAN:
        return comparison < 0;
      case RelationOp.LESS_THAN_OR_EQUAL:
        return comparison <= 0;
      case RelationOp.EQUAL:
        return comparison === 0;
      case RelationOp.GREATER_THAN:
        return comparison > 0;
      case RelationOp.GREATER_THAN_OR_EQUAL:
        return comparison >= 0;
      default:
        return fail('Unknown relation op' + this.op);
    }
  }

  isInequality(): boolean {
    return this.op !== RelationOp.EQUAL;
  }

  canonicalId(): string {
    // TODO(b/29183165): Technically, this won't be unique if two values have
    // the same description, such as the int 3 and the string "3". So we should
    // add the types in here somehow, too.
    return (
      this.field.canonicalString() + this.op.toString() + this.value.toString()
    );
  }

  isEqual(other: Filter): boolean {
    if (other instanceof RelationFilter) {
      return (
        this.op.isEqual(other.op) &&
        this.field.isEqual(other.field) &&
        this.value.isEqual(other.value)
      );
    } else {
      return false;
    }
  }

  toString(): string {
    return `${this.field.canonicalString()} ${this.op} ${this.value.value()}`;
  }
}

/**
 * Filter that matches 'null' values.
 */
export class NullFilter implements Filter {
  constructor(public field: FieldPath) {}

  matches(doc: Document): boolean {
    const val = doc.field(this.field);
    return val !== undefined && val.value() === null;
  }

  canonicalId(): string {
    return this.field.canonicalString() + ' IS null';
  }

  toString(): string {
    return `${this.field.canonicalString()} IS null`;
  }

  isEqual(other: Filter): boolean {
    if (other instanceof NullFilter) {
      return this.field.isEqual(other.field);
    } else {
      return false;
    }
  }
}

/**
 * Filter that matches 'NaN' values.
 */
export class NanFilter implements Filter {
  constructor(public field: FieldPath) {}

  matches(doc: Document): boolean {
    const val = doc.field(this.field).value();
    return typeof val === 'number' && isNaN(val);
  }

  canonicalId(): string {
    return this.field.canonicalString() + ' IS NaN';
  }

  toString(): string {
    return `${this.field.canonicalString()} IS NaN`;
  }

  isEqual(other: Filter): boolean {
    if (other instanceof NanFilter) {
      return this.field.isEqual(other.field);
    } else {
      return false;
    }
  }
}

/**
 * Creates a filter based on the provided arguments.
 */
export function fieldFilter(
  field: FieldPath,
  op: RelationOp,
  value: FieldValue
): Filter {
  if (value.isEqual(NullValue.INSTANCE)) {
    if (op !== RelationOp.EQUAL) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. You can only perform equals ' + 'comparisons on null.'
      );
    }
    return new NullFilter(field);
  } else if (value.isEqual(DoubleValue.NAN)) {
    if (op !== RelationOp.EQUAL) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. You can only perform equals ' + 'comparisons on NaN.'
      );
    }
    return new NanFilter(field);
  } else {
    return new RelationFilter(field, op, value);
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
  constructor(readonly position: FieldValue[], readonly before: boolean) {}

  canonicalId(): string {
    // TODO(b/29183165): Make this collision robust.
    let canonicalId = this.before ? 'b:' : 'a:';
    for (const component of this.position) {
      canonicalId += component.toString();
    }
    return canonicalId;
  }

  /**
   * Returns true if a document sorts before a bound using the provided sort
   * order.
   */
  sortsBeforeDocument(orderBy: OrderBy[], doc: Document): boolean {
    assert(
      this.position.length <= orderBy.length,
      "Bound has more components than query's orderBy"
    );
    let comparison = 0;
    for (let i = 0; i < this.position.length; i++) {
      const orderByComponent = orderBy[i];
      const component = this.position[i];
      if (orderByComponent.field.isKeyField()) {
        assert(
          component instanceof RefValue,
          'Bound has a non-key value where the key path is being used.'
        );
        comparison = DocumentKey.comparator(
          (component as RefValue).key,
          doc.key
        );
      } else {
        const docValue = doc.field(orderByComponent.field);
        assert(
          docValue !== undefined,
          'Field should exist since document matched the orderBy already.'
        );
        comparison = component.compareTo(docValue);
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
      return thisPosition.isEqual(otherPosition);
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
        return fail('Unknown direction: ' + this.dir);
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
