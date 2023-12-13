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

import { FieldFilter, Operator } from '../core/filter';
import { Direction, OrderBy } from '../core/order_by';
import { Target } from '../core/target';
import { hardAssert } from '../util/assert';
import { SortedSet } from '../util/sorted_set';

import {
  FieldIndex,
  fieldIndexGetArraySegment,
  fieldIndexGetDirectionalSegments,
  IndexKind,
  IndexSegment,
  IndexState
} from './field_index';
import { FieldPath } from './path';

/**
 * A light query planner for Firestore.
 *
 * This class matches a `FieldIndex` against a Firestore Query `Target`. It
 * determines whether a given index can be used to serve the specified target.
 *
 * The following table showcases some possible index configurations:
 *
 * Query                                               | Index
 * -----------------------------------------------------------------------------
 * where('a', '==', 'a').where('b', '==', 'b')         | a ASC, b DESC
 * where('a', '==', 'a').where('b', '==', 'b')         | a ASC
 * where('a', '==', 'a').where('b', '==', 'b')         | b DESC
 * where('a', '>=', 'a').orderBy('a')                  | a ASC
 * where('a', '>=', 'a').orderBy('a', 'desc')          | a DESC
 * where('a', '>=', 'a').orderBy('a').orderBy('b')     | a ASC, b ASC
 * where('a', '>=', 'a').orderBy('a').orderBy('b')     | a ASC
 * where('a', 'array-contains', 'a').orderBy('b')      | a CONTAINS, b ASCENDING
 * where('a', 'array-contains', 'a').orderBy('b')      | a CONTAINS
 */
export class TargetIndexMatcher {
  // The collection ID (or collection group) of the query target.
  private readonly collectionId: string;
  // The inequality filters of the target (if it exists).
  // Note: The sort on FieldFilters is not required. Using SortedSet here just to utilize the custom
  // comparator.
  private inequalityFilters = new SortedSet<FieldFilter>((lhs, rhs) =>
    FieldPath.comparator(lhs.field, rhs.field)
  );

  // The list of equality filters of the target.
  private readonly equalityFilters: FieldFilter[];
  // The list of orderBys of the target.
  private readonly orderBys: OrderBy[];

  constructor(target: Target) {
    this.collectionId =
      target.collectionGroup != null
        ? target.collectionGroup
        : target.path.lastSegment();
    this.orderBys = target.orderBy;
    this.equalityFilters = [];
    for (const filter of target.filters) {
      const fieldFilter = filter as FieldFilter;
      if (fieldFilter.isInequality()) {
        this.inequalityFilters = this.inequalityFilters.add(fieldFilter);
      } else {
        this.equalityFilters.push(fieldFilter);
      }
    }
  }

  get hasMultipleInequality(): boolean {
    return this.inequalityFilters.size > 1;
  }

  /**
   * Returns whether the index can be used to serve the TargetIndexMatcher's
   * target.
   *
   * An index is considered capable of serving the target when:
   * - The target uses all index segments for its filters and orderBy clauses.
   *   The target can have additional filter and orderBy clauses, but not
   *   fewer.
   * - If an ArrayContains/ArrayContainsAnyfilter is used, the index must also
   *   have a corresponding `CONTAINS` segment.
   * - All directional index segments can be mapped to the target as a series of
   *   equality filters, a single inequality filter and a series of orderBy
   *   clauses.
   * - The segments that represent the equality filters may appear out of order.
   * - The optional segment for the inequality filter must appear after all
   *   equality segments.
   * - The segments that represent that orderBy clause of the target must appear
   *   in order after all equality and inequality segments. Single orderBy
   *   clauses cannot be skipped, but a continuous orderBy suffix may be
   *   omitted.
   */
  servedByIndex(index: FieldIndex): boolean {
    hardAssert(
      index.collectionGroup === this.collectionId,
      'Collection IDs do not match'
    );

    if (this.hasMultipleInequality) {
      // Only single inequality is supported for now.
      // TODO(Add support for multiple inequality query): b/298441043
      return false;
    }

    // If there is an array element, find a matching filter.
    const arraySegment = fieldIndexGetArraySegment(index);
    if (
      arraySegment !== undefined &&
      !this.hasMatchingEqualityFilter(arraySegment)
    ) {
      return false;
    }

    const segments = fieldIndexGetDirectionalSegments(index);
    let equalitySegments = new Set<string>();
    let segmentIndex = 0;
    let orderBysIndex = 0;

    // Process all equalities first. Equalities can appear out of order.
    for (; segmentIndex < segments.length; ++segmentIndex) {
      // We attempt to greedily match all segments to equality filters. If a
      // filter matches an index segment, we can mark the segment as used.
      if (this.hasMatchingEqualityFilter(segments[segmentIndex])) {
        equalitySegments = equalitySegments.add(
          segments[segmentIndex].fieldPath.canonicalString()
        );
      } else {
        // If we cannot find a matching filter, we need to verify whether the
        // remaining segments map to the target's inequality and its orderBy
        // clauses.
        break;
      }
    }

    // If we already have processed all segments, all segments are used to serve
    // the equality filters and we do not need to map any segments to the
    // target's inequality and orderBy clauses.
    if (segmentIndex === segments.length) {
      return true;
    }

    if (this.inequalityFilters.size > 0) {
      // Only a single inequality is currently supported. Get the only entry in the set.
      const inequalityFilter = this.inequalityFilters.getIterator().getNext();
      // If there is an inequality filter and the field was not in one of the
      // equality filters above, the next segment must match both the filter
      // and the first orderBy clause.
      if (!equalitySegments.has(inequalityFilter.field.canonicalString())) {
        const segment = segments[segmentIndex];

        if (
          !this.matchesFilter(inequalityFilter, segment) ||
          !this.matchesOrderBy(this.orderBys[orderBysIndex++], segment)
        ) {
          return false;
        }
      }

      ++segmentIndex;
    }

    // All remaining segments need to represent the prefix of the target's
    // orderBy.
    for (; segmentIndex < segments.length; ++segmentIndex) {
      const segment = segments[segmentIndex];
      if (
        orderBysIndex >= this.orderBys.length ||
        !this.matchesOrderBy(this.orderBys[orderBysIndex++], segment)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns a full matched field index for this target. Currently multiple
   * inequality query is not supported so function returns null.
   */
  buildTargetIndex(): FieldIndex | null {
    if (this.hasMultipleInequality) {
      return null;
    }

    // We want to make sure only one segment created for one field. For example,
    // in case like a == 3 and a > 2, Index {a ASCENDING} will only be created
    // once.
    let uniqueFields = new SortedSet<FieldPath>(FieldPath.comparator);
    const segments: IndexSegment[] = [];

    for (const filter of this.equalityFilters) {
      if (filter.field.isKeyField()) {
        continue;
      }
      const isArrayOperator =
        filter.op === Operator.ARRAY_CONTAINS ||
        filter.op === Operator.ARRAY_CONTAINS_ANY;
      if (isArrayOperator) {
        segments.push(new IndexSegment(filter.field, IndexKind.CONTAINS));
      } else {
        if (uniqueFields.has(filter.field)) {
          continue;
        }
        uniqueFields = uniqueFields.add(filter.field);
        segments.push(new IndexSegment(filter.field, IndexKind.ASCENDING));
      }
    }

    // Note: We do not explicitly check `this.inequalityFilter` but rather rely
    // on the target defining an appropriate "order by" to ensure that the
    // required index segment is added. The query engine would reject a query
    // with an inequality filter that lacks the required order-by clause.
    for (const orderBy of this.orderBys) {
      // Stop adding more segments if we see a order-by on key. Typically this
      // is the default implicit order-by which is covered in the index_entry
      // table as a separate column. If it is not the default order-by, the
      // generated index will be missing some segments optimized for order-bys,
      // which is probably fine.
      if (orderBy.field.isKeyField()) {
        continue;
      }

      if (uniqueFields.has(orderBy.field)) {
        continue;
      }
      uniqueFields = uniqueFields.add(orderBy.field);

      segments.push(
        new IndexSegment(
          orderBy.field,
          orderBy.dir === Direction.ASCENDING
            ? IndexKind.ASCENDING
            : IndexKind.DESCENDING
        )
      );
    }

    return new FieldIndex(
      FieldIndex.UNKNOWN_ID,
      this.collectionId,
      segments,
      IndexState.empty()
    );
  }

  private hasMatchingEqualityFilter(segment: IndexSegment): boolean {
    for (const filter of this.equalityFilters) {
      if (this.matchesFilter(filter, segment)) {
        return true;
      }
    }
    return false;
  }

  private matchesFilter(
    filter: FieldFilter | undefined,
    segment: IndexSegment
  ): boolean {
    if (filter === undefined || !filter.field.isEqual(segment.fieldPath)) {
      return false;
    }
    const isArrayOperator =
      filter.op === Operator.ARRAY_CONTAINS ||
      filter.op === Operator.ARRAY_CONTAINS_ANY;
    return (segment.kind === IndexKind.CONTAINS) === isArrayOperator;
  }

  private matchesOrderBy(orderBy: OrderBy, segment: IndexSegment): boolean {
    if (!orderBy.field.isEqual(segment.fieldPath)) {
      return false;
    }
    return (
      (segment.kind === IndexKind.ASCENDING &&
        orderBy.dir === Direction.ASCENDING) ||
      (segment.kind === IndexKind.DESCENDING &&
        orderBy.dir === Direction.DESCENDING)
    );
  }
}
