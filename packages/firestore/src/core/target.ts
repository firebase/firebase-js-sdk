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

import { DocumentKey, FieldPath, ResourcePath } from '../model/path';
import { isNullOrUndefined } from '../util/types';
import { debugAssert, debugCast, fail } from '../util/assert';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import {
  arrayValueContains,
  canonicalId,
  isArray,
  isReferenceValue,
  typeOrder,
  valueCompare,
  valueEquals
} from '../model/values';
import { Document } from '../model/document';

/**
 * A Target represents the WatchTarget representation of a Query, which is used
 * by the LocalStore and the RemoteStore to keep track of and to execute
 * backend queries. While a Query can represent multiple Targets, each Targets
 * maps to a single WatchTarget in RemoteStore and a single TargetData entry
 * in persistence.
 */
export interface Target {
  readonly path: ResourcePath;
  readonly collectionGroup: string | null;
  readonly orderBy: OrderBy[];
  readonly filters: Filter[];
  readonly limit: number | null;
  readonly startAt: Bound | null;
  readonly endAt: Bound | null;
}

// Visible for testing
export class TargetImpl implements Target {
  memoizedCanonicalId: string | null = null;
  constructor(
    readonly path: ResourcePath,
    readonly collectionGroup: string | null = null,
    readonly orderBy: OrderBy[] = [],
    readonly filters: Filter[] = [],
    readonly limit: number | null = null,
    readonly startAt: Bound | null = null,
    readonly endAt: Bound | null = null
  ) {}
}

/**
 * Initializes a Target with a path and optional additional query constraints.
 * Path must currently be empty if this is a collection group query.
 *
 * NOTE: you should always construct `Target` from `Query.toTarget` instead of
 * using this factory method, because `Query` provides an implicit `orderBy`
 * property.
 */
export function newTarget(
  path: ResourcePath,
  collectionGroup: string | null = null,
  orderBy: OrderBy[] = [],
  filters: Filter[] = [],
  limit: number | null = null,
  startAt: Bound | null = null,
  endAt: Bound | null = null
): Target {
  return new TargetImpl(
    path,
    collectionGroup,
    orderBy,
    filters,
    limit,
    startAt,
    endAt
  );
}

export function canonifyTarget(target: Target): string {
  const targetImpl = debugCast(target, TargetImpl);

  if (targetImpl.memoizedCanonicalId === null) {
    let canonicalId = targetImpl.path.canonicalString();
    if (targetImpl.collectionGroup !== null) {
      canonicalId += '|cg:' + targetImpl.collectionGroup;
    }
    canonicalId += '|f:';
    canonicalId += targetImpl.filters.map(f => canonifyFilter(f)).join(',');
    canonicalId += '|ob:';
    canonicalId += targetImpl.orderBy.map(o => canonifyOrderBy(o)).join(',');

    if (!isNullOrUndefined(targetImpl.limit)) {
      canonicalId += '|l:';
      canonicalId += targetImpl.limit!;
    }
    if (targetImpl.startAt) {
      canonicalId += '|lb:';
      canonicalId += canonifyBound(targetImpl.startAt);
    }
    if (targetImpl.endAt) {
      canonicalId += '|ub:';
      canonicalId += canonifyBound(targetImpl.endAt);
    }
    targetImpl.memoizedCanonicalId = canonicalId;
  }
  return targetImpl.memoizedCanonicalId;
}

export function stringifyTarget(target: Target): string {
  let str = target.path.canonicalString();
  if (target.collectionGroup !== null) {
    str += ' collectionGroup=' + target.collectionGroup;
  }
  if (target.filters.length > 0) {
    str += `, filters: [${target.filters
      .map(f => stringifyFilter(f))
      .join(', ')}]`;
  }
  if (!isNullOrUndefined(target.limit)) {
    str += ', limit: ' + target.limit;
  }
  if (target.orderBy.length > 0) {
    str += `, orderBy: [${target.orderBy
      .map(o => stringifyOrderBy(o))
      .join(', ')}]`;
  }
  if (target.startAt) {
    str += ', startAt: ' + canonifyBound(target.startAt);
  }
  if (target.endAt) {
    str += ', endAt: ' + canonifyBound(target.endAt);
  }
  return `Target(${str})`;
}

export function targetEquals(left: Target, right: Target): boolean {
  if (left.limit !== right.limit) {
    return false;
  }

  if (left.orderBy.length !== right.orderBy.length) {
    return false;
  }

  for (let i = 0; i < left.orderBy.length; i++) {
    if (!orderByEquals(left.orderBy[i], right.orderBy[i])) {
      return false;
    }
  }

  if (left.filters.length !== right.filters.length) {
    return false;
  }

  for (let i = 0; i < left.filters.length; i++) {
    if (!filterEquals(left.filters[i], right.filters[i])) {
      return false;
    }
  }

  if (left.collectionGroup !== right.collectionGroup) {
    return false;
  }

  if (!left.path.isEqual(right.path)) {
    return false;
  }

  if (!boundEquals(left.startAt, right.startAt)) {
    return false;
  }

  return boundEquals(left.endAt, right.endAt);
}

export function isDocumentTarget(target: Target): boolean {
  return (
    DocumentKey.isDocumentKey(target.path) &&
    target.collectionGroup === null &&
    target.filters.length === 0
  );
}

export abstract class Filter {
  abstract matches(doc: Document): boolean;
}

export const enum Operator {
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  EQUAL = '==',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  ARRAY_CONTAINS = 'array-contains',
  IN = 'in',
  NOT_IN = 'not-in',
  ARRAY_CONTAINS_ANY = 'array-contains-any'
}

/**
 * The direction of sorting in an order by.
 */
export const enum Direction {
  ASCENDING = 'asc',
  DESCENDING = 'desc'
}

export class FieldFilter extends Filter {
  protected constructor(
    public field: FieldPath,
    public op: Operator,
    public value: ProtoValue
  ) {
    super();
  }

  /**
   * Creates a filter based on the provided arguments.
   */
  static create(
    field: FieldPath,
    op: Operator,
    value: ProtoValue
  ): FieldFilter {
    if (field.isKeyField()) {
      if (op === Operator.IN || op === Operator.NOT_IN) {
        return this.createKeyFieldInFilter(field, op, value);
      } else {
        debugAssert(
          isReferenceValue(value),
          'Comparing on key, but filter value not a RefValue'
        );
        debugAssert(
          op !== Operator.ARRAY_CONTAINS && op !== Operator.ARRAY_CONTAINS_ANY,
          `'${op.toString()}' queries don't make sense on document keys.`
        );
        return new KeyFieldFilter(field, op, value);
      }
    } else if (op === Operator.ARRAY_CONTAINS) {
      return new ArrayContainsFilter(field, value);
    } else if (op === Operator.IN) {
      debugAssert(
        isArray(value),
        'IN filter has invalid value: ' + value.toString()
      );
      return new InFilter(field, value);
    } else if (op === Operator.NOT_IN) {
      debugAssert(
        isArray(value),
        'NOT_IN filter has invalid value: ' + value.toString()
      );
      return new NotInFilter(field, value);
    } else if (op === Operator.ARRAY_CONTAINS_ANY) {
      debugAssert(
        isArray(value),
        'ARRAY_CONTAINS_ANY filter has invalid value: ' + value.toString()
      );
      return new ArrayContainsAnyFilter(field, value);
    } else {
      return new FieldFilter(field, op, value);
    }
  }

  private static createKeyFieldInFilter(
    field: FieldPath,
    op: Operator.IN | Operator.NOT_IN,
    value: ProtoValue
  ): FieldFilter {
    debugAssert(
      isArray(value),
      `Comparing on key with ${op.toString()}` +
        ', but filter value not an ArrayValue'
    );
    debugAssert(
      (value.arrayValue.values || []).every(elem => isReferenceValue(elem)),
      `Comparing on key with ${op.toString()}` +
        ', but an array value was not a RefValue'
    );

    return op === Operator.IN
      ? new KeyFieldInFilter(field, value)
      : new KeyFieldNotInFilter(field, value);
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);
    // Types do not have to match in NOT_EQUAL filters.
    if (this.op === Operator.NOT_EQUAL) {
      return (
        other !== null &&
        this.matchesComparison(valueCompare(other!, this.value))
      );
    }

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
      case Operator.NOT_EQUAL:
        return comparison !== 0;
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
        Operator.GREATER_THAN_OR_EQUAL,
        Operator.NOT_EQUAL,
        Operator.NOT_IN
      ].indexOf(this.op) >= 0
    );
  }
}

export function canonifyFilter(filter: Filter): string {
  debugAssert(
    filter instanceof FieldFilter,
    'canonifyFilter() only supports FieldFilters'
  );
  // TODO(b/29183165): Technically, this won't be unique if two values have
  // the same description, such as the int 3 and the string "3". So we should
  // add the types in here somehow, too.
  return (
    filter.field.canonicalString() +
    filter.op.toString() +
    canonicalId(filter.value)
  );
}

export function filterEquals(f1: Filter, f2: Filter): boolean {
  debugAssert(
    f1 instanceof FieldFilter && f2 instanceof FieldFilter,
    'Only FieldFilters can be compared'
  );

  return (
    f1.op === f2.op &&
    f1.field.isEqual(f2.field) &&
    valueEquals(f1.value, f2.value)
  );
}

/** Returns a debug description for `filter`. */
export function stringifyFilter(filter: Filter): string {
  debugAssert(
    filter instanceof FieldFilter,
    'stringifyFilter() only supports FieldFilters'
  );
  return `${filter.field.canonicalString()} ${filter.op} ${canonicalId(
    filter.value
  )}`;
}

/** Filter that matches on key fields (i.e. '__name__'). */
export class KeyFieldFilter extends FieldFilter {
  private readonly key: DocumentKey;

  constructor(field: FieldPath, op: Operator, value: ProtoValue) {
    super(field, op, value);
    debugAssert(
      isReferenceValue(value),
      'KeyFieldFilter expects a ReferenceValue'
    );
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

  constructor(field: FieldPath, value: ProtoValue) {
    super(field, Operator.IN, value);
    this.keys = extractDocumentKeysFromArrayValue(Operator.IN, value);
  }

  matches(doc: Document): boolean {
    return this.keys.some(key => key.isEqual(doc.key));
  }
}

/** Filter that matches on key fields not present within an array. */
export class KeyFieldNotInFilter extends FieldFilter {
  private readonly keys: DocumentKey[];

  constructor(field: FieldPath, value: ProtoValue) {
    super(field, Operator.NOT_IN, value);
    this.keys = extractDocumentKeysFromArrayValue(Operator.NOT_IN, value);
  }

  matches(doc: Document): boolean {
    return !this.keys.some(key => key.isEqual(doc.key));
  }
}

function extractDocumentKeysFromArrayValue(
  op: Operator.IN | Operator.NOT_IN,
  value: ProtoValue
): DocumentKey[] {
  debugAssert(
    isArray(value),
    'KeyFieldInFilter/KeyFieldNotInFilter expects an ArrayValue'
  );
  return (value.arrayValue?.values || []).map(v => {
    debugAssert(
      isReferenceValue(v),
      `Comparing on key with ${op.toString()}, but an array value was not ` +
        `a ReferenceValue`
    );
    return DocumentKey.fromName(v.referenceValue);
  });
}

/** A Filter that implements the array-contains operator. */
export class ArrayContainsFilter extends FieldFilter {
  constructor(field: FieldPath, value: ProtoValue) {
    super(field, Operator.ARRAY_CONTAINS, value);
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);
    return isArray(other) && arrayValueContains(other.arrayValue, this.value);
  }
}

/** A Filter that implements the IN operator. */
export class InFilter extends FieldFilter {
  constructor(field: FieldPath, value: ProtoValue) {
    super(field, Operator.IN, value);
    debugAssert(isArray(value), 'InFilter expects an ArrayValue');
  }

  matches(doc: Document): boolean {
    const other = doc.field(this.field);
    return other !== null && arrayValueContains(this.value.arrayValue!, other);
  }
}

/** A Filter that implements the not-in operator. */
export class NotInFilter extends FieldFilter {
  constructor(field: FieldPath, value: ProtoValue) {
    super(field, Operator.NOT_IN, value);
    debugAssert(isArray(value), 'NotInFilter expects an ArrayValue');
  }

  matches(doc: Document): boolean {
    if (
      arrayValueContains(this.value.arrayValue!, { nullValue: 'NULL_VALUE' })
    ) {
      return false;
    }
    const other = doc.field(this.field);
    return other !== null && !arrayValueContains(this.value.arrayValue!, other);
  }
}

/** A Filter that implements the array-contains-any operator. */
export class ArrayContainsAnyFilter extends FieldFilter {
  constructor(field: FieldPath, value: ProtoValue) {
    super(field, Operator.ARRAY_CONTAINS_ANY, value);
    debugAssert(isArray(value), 'ArrayContainsAnyFilter expects an ArrayValue');
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
  constructor(readonly position: ProtoValue[], readonly before: boolean) {}
}

export function canonifyBound(bound: Bound): string {
  // TODO(b/29183165): Make this collision robust.
  return `${bound.before ? 'b' : 'a'}:${bound.position
    .map(p => canonicalId(p))
    .join(',')}`;
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
