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

import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  ArrayValue,
  DoubleValue,
  FieldValue,
  NullValue,
  RefValue
} from '../model/field_value';
import { FieldPath, ResourcePath } from '../model/path';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { Target } from './target';

/**
 * Represents a local query: queries with features implemented by the SDK on top
 * of server implemented features.
 */
export class Query {
  static atPath(path: ResourcePath): Query {
    return new Query(new Target(path));
  }

  /**
   * Initializes a Query with a path and optional additional query constraints.
   * Path must currently be empty if this is a collection group query.
   */
  static newQuery(
    path: ResourcePath,
    collectionGroup: string | null = null,
    explicitOrderBy: OrderBy[] = [],
    filters: Filter[] = [],
    limit: number | null = null,
    startAt: Bound | null = null,
    endAt: Bound | null = null
  ): Query {
    return new Query(
      new Target(
        path,
        collectionGroup,
        explicitOrderBy,
        filters,
        limit,
        startAt,
        endAt
      )
    );
  }

  private memoizedCanonicalId: string | null = null;
  private memoizedOrderBy: OrderBy[] | null = null;

  // Constructs a new `Query` from a `Target` query. All non-local features
  // are delegated to this target instance.
  constructor(private readonly target: Target) {}

  get path(): ResourcePath {
    return this.target.path;
  }

  get collectionGroup(): string | null {
    return this.target.collectionGroup;
  }

  get orderBy(): OrderBy[] {
    if (this.memoizedOrderBy === null) {
      this.memoizedOrderBy = this.target.orderBy;
    }
    return this.memoizedOrderBy;
  }

  get explicitOrderBy(): OrderBy[] {
    return this.target.explicitOrderBy;
  }

  get filters(): Filter[] {
    return this.target.filters;
  }

  get limit(): number | null {
    return this.target.limit;
  }

  get startAt(): Bound | null {
    return this.target.startAt;
  }

  get endAt(): Bound | null {
    return this.target.endAt;
  }

  addFilter(filter: Filter): Query {
    return new Query(this.target.addFilter(filter));
  }

  addOrderBy(orderBy: OrderBy): Query {
    return new Query(this.target.addOrderBy(orderBy));
  }

  withLimit(limit: number | null): Query {
    return new Query(this.target.withLimit(limit));
  }

  withStartAt(bound: Bound): Query {
    return new Query(this.target.withStartAt(bound));
  }

  withEndAt(bound: Bound): Query {
    return new Query(this.target.withEndAt(bound));
  }

  /**
   * Helper to convert a collection group query into a collection query at a
   * specific path. This is used when executing collection group queries, since
   * we have to split the query into a set of collection queries at multiple
   * paths.
   */
  asCollectionQueryAtPath(path: ResourcePath): Query {
    return new Query(this.target.asCollectionQueryAtPath(path));
  }

  canonicalId(): string {
    if (this.memoizedCanonicalId === null) {
      this.memoizedCanonicalId = this.target.canonicalId();
    }
    return this.memoizedCanonicalId;
  }

  toString(): string {
    return `Query(${this.target.toString()})`;
  }

  toTarget(): Target {
    return this.target;
  }

  isEqual(other: Query): boolean {
    return this.target.isEqual(other.target);
  }

  docComparator(d1: Document, d2: Document): number {
    return this.target.docComparator(d1, d2);
  }

  matches(doc: Document): boolean {
    return this.target.matches(doc);
  }

  hasLimit(): boolean {
    return this.target.hasLimit();
  }

  getFirstOrderByField(): FieldPath | null {
    return this.target.getFirstOrderByField();
  }

  getInequalityFilterField(): FieldPath | null {
    return this.target.getInequalityFilterField();
  }

  // Checks if any of the provided Operators are included in the query and
  // returns the first one that is, or null if none are.
  findFilterOperator(operators: Operator[]): Operator | null {
    return this.target.findFilterOperator(operators);
  }

  isDocumentQuery(): boolean {
    return this.target.isDocumentQuery();
  }

  isCollectionGroupQuery(): boolean {
    return this.target.isCollectionGroupQuery();
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
        return fail('Unknown FieldFilter operator: ' + op);
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
    public value: FieldValue
  ) {
    super();
  }

  /**
   * Creates a filter based on the provided arguments.
   */
  static create(
    field: FieldPath,
    op: Operator,
    value: FieldValue
  ): FieldFilter {
    if (field.isKeyField()) {
      if (op === Operator.IN) {
        assert(
          value instanceof ArrayValue,
          'Comparing on key with IN, but filter value not an ArrayValue'
        );
        assert(
          (value as ArrayValue).internalValue.every(elem => {
            return elem instanceof RefValue;
          }),
          'Comparing on key with IN, but an array value was not a RefValue'
        );
        return new KeyFieldInFilter(field, value as ArrayValue);
      } else {
        assert(
          value instanceof RefValue,
          'Comparing on key, but filter value not a RefValue'
        );
        assert(
          op !== Operator.ARRAY_CONTAINS && op !== Operator.ARRAY_CONTAINS_ANY,
          `'${op.toString()}' queries don't make sense on document keys.`
        );
        return new KeyFieldFilter(field, op, value as RefValue);
      }
    } else if (value.isEqual(NullValue.INSTANCE)) {
      if (op !== Operator.EQUAL) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Invalid query. Null supports only equality comparisons.'
        );
      }
      return new FieldFilter(field, op, value);
    } else if (value.isEqual(DoubleValue.NAN)) {
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
      assert(
        value instanceof ArrayValue,
        'IN filter has invalid value: ' + value.toString()
      );
      return new InFilter(field, value as ArrayValue);
    } else if (op === Operator.ARRAY_CONTAINS_ANY) {
      assert(
        value instanceof ArrayValue,
        'ARRAY_CONTAINS_ANY filter has invalid value: ' + value.toString()
      );
      return new ArrayContainsAnyFilter(field, value as ArrayValue);
    } else {
      return new FieldFilter(field, op, value);
    }
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);

    // Only compare types with matching backend order (such as double and int).
    return (
      other !== null &&
      this.value.typeOrder === other.typeOrder &&
      this.matchesComparison(other.compareTo(this.value))
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
        return fail('Unknown FieldFilter operator: ' + this.op);
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
      this.field.canonicalString() + this.op.toString() + this.value.toString()
    );
  }

  isEqual(other: Filter): boolean {
    if (other instanceof FieldFilter) {
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

/** Filter that matches on key fields (i.e. '__name__'). */
export class KeyFieldFilter extends FieldFilter {
  matches(doc: Document): boolean {
    const refValue = this.value as RefValue;
    const comparison = DocumentKey.comparator(doc.key, refValue.key);
    return this.matchesComparison(comparison);
  }
}

/** Filter that matches on key fields within an array. */
export class KeyFieldInFilter extends FieldFilter {
  constructor(field: FieldPath, public value: ArrayValue) {
    super(field, Operator.IN, value);
  }

  matches(doc: Document): boolean {
    const arrayValue = this.value;
    return arrayValue.internalValue.some(refValue => {
      return doc.key.isEqual((refValue as RefValue).key);
    });
  }
}

/** A Filter that implements the array-contains operator. */
export class ArrayContainsFilter extends FieldFilter {
  constructor(field: FieldPath, value: FieldValue) {
    super(field, Operator.ARRAY_CONTAINS, value);
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);
    return other instanceof ArrayValue && other.contains(this.value);
  }
}

/** A Filter that implements the IN operator. */
export class InFilter extends FieldFilter {
  constructor(field: FieldPath, public value: ArrayValue) {
    super(field, Operator.IN, value);
  }

  matches(doc: Document): boolean {
    const arrayValue = this.value;
    const other = doc.field(this.field);
    return other !== null && arrayValue.contains(other);
  }
}

/** A Filter that implements the array-contains-any operator. */
export class ArrayContainsAnyFilter extends FieldFilter {
  constructor(field: FieldPath, public value: ArrayValue) {
    super(field, Operator.ARRAY_CONTAINS_ANY, value);
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);
    return (
      other instanceof ArrayValue &&
      other.internalValue.some(lhsElem => {
        return this.value.contains(lhsElem);
      })
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
          docValue !== null,
          'Field should exist since document matched the orderBy already.'
        );
        comparison = component.compareTo(docValue!);
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
      if (!thisPosition.isEqual(otherPosition)) {
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

export const KEY_ORDERING_ASC = new OrderBy(
  FieldPath.keyField(),
  Direction.ASCENDING
);
export const KEY_ORDERING_DESC = new OrderBy(
  FieldPath.keyField(),
  Direction.DESCENDING
);
