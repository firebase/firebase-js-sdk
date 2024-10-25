/**
 * @license
 * Copyright 2022 Google LLC
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
import { FieldPath } from '../model/path';
import {
  arrayValueContains,
  canonicalId,
  isArray,
  isReferenceValue,
  typeOrder,
  valueCompare,
  valueEquals
} from '../model/values';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { debugAssert, fail } from '../util/assert';

// The operator of a FieldFilter
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

// The operator of a CompositeFilter
export const enum CompositeOperator {
  OR = 'or',
  AND = 'and'
}

export abstract class Filter {
  abstract matches(doc: Document): boolean;

  abstract getFlattenedFilters(): readonly FieldFilter[];

  abstract getFilters(): Filter[];
}

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
  } else if (compositeFilterIsFlatConjunction(filter)) {
    // Older SDK versions use an implicit AND operation between their filters.
    // In the new SDK versions, the developer may use an explicit AND filter.
    // To stay consistent with the old usages, we add a special case to ensure
    // the canonical ID for these two are the same. For example:
    // `col.whereEquals("a", 1).whereEquals("b", 2)` should have the same
    // canonical ID as `col.where(and(equals("a",1), equals("b",2)))`.
    return filter.filters.map(filter => canonifyFilter(filter)).join(',');
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

/**
 * Returns a new composite filter that contains all filter from
 * `compositeFilter` plus all the given filters in `otherFilters`.
 */
export function compositeFilterWithAddedFilters(
  compositeFilter: CompositeFilter,
  otherFilters: Filter[]
): CompositeFilter {
  const mergedFilters = compositeFilter.filters.concat(otherFilters);
  return CompositeFilter.create(mergedFilters, compositeFilter.op);
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
