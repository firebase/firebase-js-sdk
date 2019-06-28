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
import { isNullOrUndefined } from '../util/types';

export class Query {
  static atPath(path: ResourcePath): Query {
    return new Query(path);
  }

  private memoizedCanonicalId: string | null = null;
  private memoizedOrderBy: OrderBy[] | null = null;

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
        !(filter instanceof FieldFilter) ||
        !filter.isInequality() ||
        filter.field.isEqual(this.getInequalityFilterField()!),
      'Query must only have one inequality field.'
    );

    assert(!this.isDocumentQuery(), 'No filtering allowed for document query');

    const newFilters = this.filters.concat([filter]);
    return new Query(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      newFilters,
      this.limit,
      this.startAt,
      this.endAt
    );
  }

  addOrderBy(orderBy: OrderBy): Query {
    assert(!this.startAt && !this.endAt, 'Bounds must be set after orderBy');
    // TODO(dimond): validate that orderBy does not list the same key twice.
    const newOrderBy = this.explicitOrderBy.concat([orderBy]);
    return new Query(
      this.path,
      this.collectionGroup,
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
      this.collectionGroup,
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
      this.collectionGroup,
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
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      this.limit,
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
      this.startAt,
      this.endAt
    );
  }

  // TODO(b/29183165): This is used to get a unique string from a query to, for
  // example, use as a dictionary key, but the implementation is subject to
  // collisions. Make it collision-free.
  canonicalId(): string {
    if (this.memoizedCanonicalId === null) {
      let canonicalId = this.path.canonicalString();
      if (this.isCollectionGroupQuery()) {
        canonicalId += '|cg:' + this.collectionGroup;
      }
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
    if (this.isCollectionGroupQuery()) {
      str += ' collectionGroup=' + this.collectionGroup;
    }
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

    if (this.collectionGroup !== other.collectionGroup) {
      return false;
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
      if (comp !== 0) {
        return comp;
      }
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
      this.matchesPathAndCollectionGroup(doc) &&
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
    return (
      DocumentKey.isDocumentKey(this.path) &&
      this.collectionGroup === null &&
      this.filters.length === 0
    );
  }

  isCollectionGroupQuery(): boolean {
    return this.collectionGroup !== null;
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
    assert(
      bound.position.length <= this.orderBy.length,
      'Bound is longer than orderBy'
    );
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
          'Invalid query. You can only perform equals comparisons on null.'
        );
      }
      return new FieldFilter(field, op, value);
    } else if (value.isEqual(DoubleValue.NAN)) {
      if (op !== Operator.EQUAL) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Invalid query. You can only perform equals comparisons on NaN.'
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
          docValue !== undefined,
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

const KEY_ORDERING_ASC = new OrderBy(FieldPath.keyField(), Direction.ASCENDING);
const KEY_ORDERING_DESC = new OrderBy(
  FieldPath.keyField(),
  Direction.DESCENDING
);
