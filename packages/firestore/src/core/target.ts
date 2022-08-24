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

import { DocumentKey } from '../model/document_key';
import {
  FieldIndex,
  fieldIndexGetArraySegment,
  fieldIndexGetDirectionalSegments,
  IndexKind
} from '../model/field_index';
import { FieldPath, ResourcePath } from '../model/path';
import {
  canonicalId,
  MAX_VALUE,
  MIN_VALUE,
  lowerBoundCompare,
  upperBoundCompare,
  valuesGetLowerBound,
  valuesGetUpperBound
} from '../model/values';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { debugCast } from '../util/assert';
import { SortedSet } from '../util/sorted_set';
import { isNullOrUndefined } from '../util/types';

import { Bound, boundEquals } from './bound';
import {
  Filter,
  FieldFilter,
  canonifyFilter,
  stringifyFilter,
  filterEquals,
  Operator
} from './filter';
import {
  canonifyOrderBy,
  OrderBy,
  orderByEquals,
  stringifyOrderBy
} from './order_by';

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
