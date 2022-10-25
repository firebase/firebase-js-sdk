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

import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  FieldIndex,
  fieldIndexGetArraySegment,
  fieldIndexGetDirectionalSegments,
  IndexKind
} from '../model/field_index';
import { FieldPath, ResourcePath } from '../model/path';
import {
  arrayValueContains,
  canonicalId,
  isArray,
  isReferenceValue,
  MAX_VALUE,
  MIN_VALUE,
  lowerBoundCompare,
  typeOrder,
  upperBoundCompare,
  valueCompare,
  valueEquals,
  valuesGetLowerBound,
  valuesGetUpperBound
} from '../model/values';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { debugAssert, debugCast, fail } from '../util/assert';
import { SortedSet } from '../util/sorted_set';
import { isNullOrUndefined } from '../util/types';

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
    let str = targetImpl.path.canonicalString();
    if (targetImpl.collectionGroup !== null) {
      str += '|cg:' + targetImpl.collectionGroup;
    }
    str += '|f:';
    str += targetImpl.filters.map(f => canonifyFilter(f)).join(',');
    str += '|ob:';
    str += targetImpl.orderBy.map(o => canonifyOrderBy(o)).join(',');

    if (!isNullOrUndefined(targetImpl.limit)) {
      str += '|l:';
      str += targetImpl.limit!;
    }
    if (targetImpl.startAt) {
      str += '|lb:';
      str += targetImpl.startAt.inclusive ? 'b:' : 'a:';
      str += targetImpl.startAt.position.map(p => canonicalId(p)).join(',');
    }
    if (targetImpl.endAt) {
      str += '|ub:';
      str += targetImpl.endAt.inclusive ? 'a:' : 'b:';
      str += targetImpl.endAt.position.map(p => canonicalId(p)).join(',');
    }
    targetImpl.memoizedCanonicalId = str;
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
    str += ', startAt: ';
    str += target.startAt.inclusive ? 'b:' : 'a:';
    str += target.startAt.position.map(p => canonicalId(p)).join(',');
  }
  if (target.endAt) {
    str += ', endAt: ';
    str += target.endAt.inclusive ? 'a:' : 'b:';
    str += target.endAt.position.map(p => canonicalId(p)).join(',');
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

export function targetIsDocumentTarget(target: Target): boolean {
  return (
    DocumentKey.isDocumentKey(target.path) &&
    target.collectionGroup === null &&
    target.filters.length === 0
  );
}

/** Returns the field filters that target the given field path. */
export function targetGetFieldFiltersForPath(
  target: Target,
  path: FieldPath
): FieldFilter[] {
  return target.filters.filter(
    f => f instanceof FieldFilter && f.field.isEqual(path)
  ) as FieldFilter[];
}

/**
 * Returns the values that are used in ARRAY_CONTAINS or ARRAY_CONTAINS_ANY
 * filters. Returns `null` if there are no such filters.
 */
export function targetGetArrayValues(
  target: Target,
  fieldIndex: FieldIndex
): ProtoValue[] | null {
  const segment = fieldIndexGetArraySegment(fieldIndex);
  if (segment === undefined) {
    return null;
  }

  for (const fieldFilter of targetGetFieldFiltersForPath(
    target,
    segment.fieldPath
  )) {
    switch (fieldFilter.op) {
      case Operator.ARRAY_CONTAINS_ANY:
        return fieldFilter.value.arrayValue!.values || [];
      case Operator.ARRAY_CONTAINS:
        return [fieldFilter.value];
      default:
      // Remaining filters are not array filters.
    }
  }
  return null;
}

/**
 * Returns the list of values that are used in != or NOT_IN filters. Returns
 * `null` if there are no such filters.
 */
export function targetGetNotInValues(
  target: Target,
  fieldIndex: FieldIndex
): ProtoValue[] | null {
  const values = new Map</* fieldPath = */ string, ProtoValue>();

  for (const segment of fieldIndexGetDirectionalSegments(fieldIndex)) {
    for (const fieldFilter of targetGetFieldFiltersForPath(
      target,
      segment.fieldPath
    )) {
      switch (fieldFilter.op) {
        case Operator.EQUAL:
        case Operator.IN:
          // Encode equality prefix, which is encoded in the index value before
          // the inequality (e.g. `a == 'a' && b != 'b'` is encoded to
          // `value != 'ab'`).
          values.set(segment.fieldPath.canonicalString(), fieldFilter.value);
          break;
        case Operator.NOT_IN:
        case Operator.NOT_EQUAL:
          // NotIn/NotEqual is always a suffix. There cannot be any remaining
          // segments and hence we can return early here.
          values.set(segment.fieldPath.canonicalString(), fieldFilter.value);
          return Array.from(values.values());
        default:
        // Remaining filters cannot be used as notIn bounds.
      }
    }
  }

  return null;
}

/**
 * Returns a lower bound of field values that can be used as a starting point to
 * scan the index defined by `fieldIndex`. Returns `MIN_VALUE` if no lower bound
 * exists.
 */
export function targetGetLowerBound(
  target: Target,
  fieldIndex: FieldIndex
): Bound {
  const values: ProtoValue[] = [];
  let inclusive = true;

  // For each segment, retrieve a lower bound if there is a suitable filter or
  // startAt.
  for (const segment of fieldIndexGetDirectionalSegments(fieldIndex)) {
    const segmentBound =
      segment.kind === IndexKind.ASCENDING
        ? targetGetAscendingBound(target, segment.fieldPath, target.startAt)
        : targetGetDescendingBound(target, segment.fieldPath, target.startAt);

    values.push(segmentBound.value);
    inclusive &&= segmentBound.inclusive;
  }
  return new Bound(values, inclusive);
}

/**
 * Returns an upper bound of field values that can be used as an ending point
 * when scanning the index defined by `fieldIndex`. Returns `MAX_VALUE` if no
 * upper bound exists.
 */
export function targetGetUpperBound(
  target: Target,
  fieldIndex: FieldIndex
): Bound {
  const values: ProtoValue[] = [];
  let inclusive = true;

  // For each segment, retrieve an upper bound if there is a suitable filter or
  // endAt.
  for (const segment of fieldIndexGetDirectionalSegments(fieldIndex)) {
    const segmentBound =
      segment.kind === IndexKind.ASCENDING
        ? targetGetDescendingBound(target, segment.fieldPath, target.endAt)
        : targetGetAscendingBound(target, segment.fieldPath, target.endAt);

    values.push(segmentBound.value);
    inclusive &&= segmentBound.inclusive;
  }

  return new Bound(values, inclusive);
}

/**
 * Returns the value to use as the lower bound for ascending index segment at
 * the provided `fieldPath` (or the upper bound for an descending segment).
 */
function targetGetAscendingBound(
  target: Target,
  fieldPath: FieldPath,
  bound: Bound | null
): { value: ProtoValue; inclusive: boolean } {
  let value: ProtoValue = MIN_VALUE;

  let inclusive = true;

  // Process all filters to find a value for the current field segment
  for (const fieldFilter of targetGetFieldFiltersForPath(target, fieldPath)) {
    let filterValue: ProtoValue = MIN_VALUE;
    let filterInclusive = true;

    switch (fieldFilter.op) {
      case Operator.LESS_THAN:
      case Operator.LESS_THAN_OR_EQUAL:
        filterValue = valuesGetLowerBound(fieldFilter.value);
        break;
      case Operator.EQUAL:
      case Operator.IN:
      case Operator.GREATER_THAN_OR_EQUAL:
        filterValue = fieldFilter.value;
        break;
      case Operator.GREATER_THAN:
        filterValue = fieldFilter.value;
        filterInclusive = false;
        break;
      case Operator.NOT_EQUAL:
      case Operator.NOT_IN:
        filterValue = MIN_VALUE;
        break;
      default:
      // Remaining filters cannot be used as lower bounds.
    }

    if (
      lowerBoundCompare(
        { value, inclusive },
        { value: filterValue, inclusive: filterInclusive }
      ) < 0
    ) {
      value = filterValue;
      inclusive = filterInclusive;
    }
  }

  // If there is an additional bound, compare the values against the existing
  // range to see if we can narrow the scope.
  if (bound !== null) {
    for (let i = 0; i < target.orderBy.length; ++i) {
      const orderBy = target.orderBy[i];
      if (orderBy.field.isEqual(fieldPath)) {
        const cursorValue = bound.position[i];
        if (
          lowerBoundCompare(
            { value, inclusive },
            { value: cursorValue, inclusive: bound.inclusive }
          ) < 0
        ) {
          value = cursorValue;
          inclusive = bound.inclusive;
        }
        break;
      }
    }
  }

  return { value, inclusive };
}

/**
 * Returns the value to use as the upper bound for ascending index segment at
 * the provided `fieldPath` (or the lower bound for a descending segment).
 */
function targetGetDescendingBound(
  target: Target,
  fieldPath: FieldPath,
  bound: Bound | null
): { value: ProtoValue; inclusive: boolean } {
  let value: ProtoValue = MAX_VALUE;
  let inclusive = true;

  // Process all filters to find a value for the current field segment
  for (const fieldFilter of targetGetFieldFiltersForPath(target, fieldPath)) {
    let filterValue: ProtoValue = MAX_VALUE;
    let filterInclusive = true;

    switch (fieldFilter.op) {
      case Operator.GREATER_THAN_OR_EQUAL:
      case Operator.GREATER_THAN:
        filterValue = valuesGetUpperBound(fieldFilter.value);
        filterInclusive = false;
        break;
      case Operator.EQUAL:
      case Operator.IN:
      case Operator.LESS_THAN_OR_EQUAL:
        filterValue = fieldFilter.value;
        break;
      case Operator.LESS_THAN:
        filterValue = fieldFilter.value;
        filterInclusive = false;
        break;
      case Operator.NOT_EQUAL:
      case Operator.NOT_IN:
        filterValue = MAX_VALUE;
        break;
      default:
      // Remaining filters cannot be used as upper bounds.
    }

    if (
      upperBoundCompare(
        { value, inclusive },
        { value: filterValue, inclusive: filterInclusive }
      ) > 0
    ) {
      value = filterValue;
      inclusive = filterInclusive;
    }
  }

  // If there is an additional bound, compare the values against the existing
  // range to see if we can narrow the scope.
  if (bound !== null) {
    for (let i = 0; i < target.orderBy.length; ++i) {
      const orderBy = target.orderBy[i];
      if (orderBy.field.isEqual(fieldPath)) {
        const cursorValue = bound.position[i];
        if (
          upperBoundCompare(
            { value, inclusive },
            { value: cursorValue, inclusive: bound.inclusive }
          ) > 0
        ) {
          value = cursorValue;
          inclusive = bound.inclusive;
        }
        break;
      }
    }
  }

  return { value, inclusive };
}

/** Returns the number of segments of a perfect index for this target. */
export function targetGetSegmentCount(target: Target): number {
  let fields = new SortedSet<FieldPath>(FieldPath.comparator);
  let hasArraySegment = false;

  for (const filter of target.filters) {
    for (const subFilter of filter.getFlattenedFilters()) {
      // __name__ is not an explicit segment of any index, so we don't need to
      // count it.
      if (subFilter.field.isKeyField()) {
        continue;
      }

      // ARRAY_CONTAINS or ARRAY_CONTAINS_ANY filters must be counted separately.
      // For instance, it is possible to have an index for "a ARRAY a ASC". Even
      // though these are on the same field, they should be counted as two
      // separate segments in an index.
      if (
        subFilter.op === Operator.ARRAY_CONTAINS ||
        subFilter.op === Operator.ARRAY_CONTAINS_ANY
      ) {
        hasArraySegment = true;
      } else {
        fields = fields.add(subFilter.field);
      }
    }
  }

  for (const orderBy of target.orderBy) {
    // __name__ is not an explicit segment of any index, so we don't need to
    // count it.
    if (!orderBy.field.isKeyField()) {
      fields = fields.add(orderBy.field);
    }
  }

  return fields.size + (hasArraySegment ? 1 : 0);
}

export function targetHasLimit(target: Target): boolean {
  return target.limit !== null;
}

export abstract class Filter {
  abstract matches(doc: Document): boolean;

  abstract getFlattenedFilters(): readonly FieldFilter[];

  abstract getFilters(): Filter[];

  abstract getFirstInequalityField(): FieldPath | null;
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

export const enum CompositeOperator {
  OR = 'or',
  AND = 'and'
}

/**
 * The direction of sorting in an order by.
 */
export const enum Direction {
  ASCENDING = 'asc',
  DESCENDING = 'desc'
}

// TODO(orquery) move Filter classes to a new file, e.g. filter.ts
export class FieldFilter extends Filter {
  protected constructor(
    public readonly field: FieldPath,
    public readonly op: Operator,
    public readonly value: ProtoValue
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
    const other = doc.data.field(this.field);
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

  getFlattenedFilters(): readonly FieldFilter[] {
    return [this];
  }

  getFilters(): Filter[] {
    return [this];
  }

  getFirstInequalityField(): FieldPath | null {
    if (this.isInequality()) {
      return this.field;
    }
    return null;
  }
}

export class CompositeFilter extends Filter {
  private memoizedFlattenedFilters: FieldFilter[] | null = null;

  protected constructor(
    public readonly filters: readonly Filter[],
    public readonly op: CompositeOperator
  ) {
    super();
  }

  /**
   * Creates a filter based on the provided arguments.
   */
  static create(filters: Filter[], op: CompositeOperator): CompositeFilter {
    return new CompositeFilter(filters, op);
  }

  matches(doc: Document): boolean {
    if (compositeFilterIsConjunction(this)) {
      // For conjunctions, all filters must match, so return false if any filter doesn't match.
      return this.filters.find(filter => !filter.matches(doc)) === undefined;
    } else {
      // For disjunctions, at least one filter should match.
      return this.filters.find(filter => filter.matches(doc)) !== undefined;
    }
  }

  getFlattenedFilters(): readonly FieldFilter[] {
    if (this.memoizedFlattenedFilters !== null) {
      return this.memoizedFlattenedFilters;
    }

    this.memoizedFlattenedFilters = this.filters.reduce((result, subfilter) => {
      return result.concat(subfilter.getFlattenedFilters());
    }, [] as FieldFilter[]);

    return this.memoizedFlattenedFilters;
  }

  // Returns a mutable copy of `this.filters`
  getFilters(): Filter[] {
    return Object.assign([], this.filters);
  }

  getFirstInequalityField(): FieldPath | null {
    const found = this.findFirstMatchingFilter(filter => filter.isInequality());

    if (found !== null) {
      return found.field;
    }
    return null;
  }

  // Performs a depth-first search to find and return the first FieldFilter in the composite filter
  // that satisfies the predicate. Returns `null` if none of the FieldFilters satisfy the
  // predicate.
  private findFirstMatchingFilter(
    predicate: (filter: FieldFilter) => boolean
  ): FieldFilter | null {
    for (const fieldFilter of this.getFlattenedFilters()) {
      if (predicate(fieldFilter)) {
        return fieldFilter;
      }
    }

    return null;
  }
}

/**
 * Returns a new composite filter that contains all filter from
 * `compositeFilter` plus all the given filters in `otherFilters`.
 * TODO(orquery) move compositeFilterWithAddedFilters to filter.ts in future refactor
 */
export function compositeFilterWithAddedFilters(
  compositeFilter: CompositeFilter,
  otherFilters: Filter[]
): CompositeFilter {
  const mergedFilters = compositeFilter.filters.concat(otherFilters);
  return CompositeFilter.create(mergedFilters, compositeFilter.op);
}

export function compositeFilterIsConjunction(
  compositeFilter: CompositeFilter
): boolean {
  return compositeFilter.op === CompositeOperator.AND;
}

export function compositeFilterIsDisjunction(
  compositeFilter: CompositeFilter
): boolean {
  return compositeFilter.op === CompositeOperator.OR;
}

/**
 * Returns true if this filter is a conjunction of field filters only. Returns false otherwise.
 */
export function compositeFilterIsFlatConjunction(
  compositeFilter: CompositeFilter
): boolean {
  return (
    compositeFilterIsFlat(compositeFilter) &&
    compositeFilterIsConjunction(compositeFilter)
  );
}

/**
 * Returns true if this filter does not contain any composite filters. Returns false otherwise.
 */
export function compositeFilterIsFlat(
  compositeFilter: CompositeFilter
): boolean {
  for (const filter of compositeFilter.filters) {
    if (filter instanceof CompositeFilter) {
      return false;
    }
  }
  return true;
}

export function canonifyFilter(filter: Filter): string {
  debugAssert(
    filter instanceof FieldFilter || filter instanceof CompositeFilter,
    'canonifyFilter() only supports FieldFilters and CompositeFilters'
  );

  if (filter instanceof FieldFilter) {
    // TODO(b/29183165): Technically, this won't be unique if two values have
    // the same description, such as the int 3 and the string "3". So we should
    // add the types in here somehow, too.
    return (
      filter.field.canonicalString() +
      filter.op.toString() +
      canonicalId(filter.value)
    );
  } else {
    // filter instanceof CompositeFilter
    const canonicalIdsString = filter.filters
      .map(filter => canonifyFilter(filter))
      .join(',');
    return `${filter.op}(${canonicalIdsString})`;
  }
}

export function filterEquals(f1: Filter, f2: Filter): boolean {
  if (f1 instanceof FieldFilter) {
    return fieldFilterEquals(f1, f2);
  } else if (f1 instanceof CompositeFilter) {
    return compositeFilterEquals(f1, f2);
  } else {
    fail('Only FieldFilters and CompositeFilters can be compared');
  }
}

export function fieldFilterEquals(f1: FieldFilter, f2: Filter): boolean {
  return (
    f2 instanceof FieldFilter &&
    f1.op === f2.op &&
    f1.field.isEqual(f2.field) &&
    valueEquals(f1.value, f2.value)
  );
}

export function compositeFilterEquals(
  f1: CompositeFilter,
  f2: Filter
): boolean {
  if (
    f2 instanceof CompositeFilter &&
    f1.op === f2.op &&
    f1.filters.length === f2.filters.length
  ) {
    const subFiltersMatch: boolean = f1.filters.reduce(
      (result: boolean, f1Filter: Filter, index: number): boolean =>
        result && filterEquals(f1Filter, f2.filters[index]),
      true
    );

    return subFiltersMatch;
  }

  return false;
}

/** Returns a debug description for `filter`. */
export function stringifyFilter(filter: Filter): string {
  debugAssert(
    filter instanceof FieldFilter || filter instanceof CompositeFilter,
    'stringifyFilter() only supports FieldFilters and CompositeFilters'
  );
  if (filter instanceof FieldFilter) {
    return stringifyFieldFilter(filter);
  } else if (filter instanceof CompositeFilter) {
    return stringifyCompositeFilter(filter);
  } else {
    return 'Filter';
  }
}

export function stringifyCompositeFilter(filter: CompositeFilter): string {
  return (
    filter.op.toString() +
    ` {` +
    filter.getFilters().map(stringifyFilter).join(' ,') +
    '}'
  );
}

export function stringifyFieldFilter(filter: FieldFilter): string {
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
    const other = doc.data.field(this.field);
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
    const other = doc.data.field(this.field);
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
    const other = doc.data.field(this.field);
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
    const other = doc.data.field(this.field);
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
  constructor(readonly position: ProtoValue[], readonly inclusive: boolean) {}
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

function boundCompareToDocument(
  bound: Bound,
  orderBy: OrderBy[],
  doc: Document
): number {
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
      const docValue = doc.data.field(orderByComponent.field);
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
  return comparison;
}

/**
 * Returns true if a document sorts after a bound using the provided sort
 * order.
 */
export function boundSortsAfterDocument(
  bound: Bound,
  orderBy: OrderBy[],
  doc: Document
): boolean {
  const comparison = boundCompareToDocument(bound, orderBy, doc);
  return bound.inclusive ? comparison >= 0 : comparison > 0;
}

/**
 * Returns true if a document sorts before a bound using the provided sort
 * order.
 */
export function boundSortsBeforeDocument(
  bound: Bound,
  orderBy: OrderBy[],
  doc: Document
): boolean {
  const comparison = boundCompareToDocument(bound, orderBy, doc);
  return bound.inclusive ? comparison <= 0 : comparison < 0;
}

export function boundEquals(left: Bound | null, right: Bound | null): boolean {
  if (left === null) {
    return right === null;
  } else if (right === null) {
    return false;
  }

  if (
    left.inclusive !== right.inclusive ||
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
