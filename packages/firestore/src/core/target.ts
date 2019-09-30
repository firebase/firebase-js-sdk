/**
 * @license
 * Copyright 2019 Google Inc.
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
import { FieldPath, ResourcePath } from '../model/path';
import { assert } from '../util/assert';
import { isNullOrUndefined } from '../util/types';
import {
  OrderBy,
  Bound,
  Direction,
  FieldFilter,
  Filter,
  Operator,
  Query,
  KEY_ORDERING_ASC,
  KEY_ORDERING_DESC
} from './query';

export class Target {
  static atPath(path: ResourcePath): Target {
    return new Target(path);
  }

  private memoizedCanonicalId: string | null = null;
  private memoizedOrderBy: OrderBy[] | null = null;

  /**
   * Initializes a Target with a path and optional additional query constraints.
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

  addFilter(filter: Filter): Target {
    assert(
      this.getInequalityFilterField() == null ||
        !(filter instanceof FieldFilter) ||
        !filter.isInequality() ||
        filter.field.isEqual(this.getInequalityFilterField()!),
      'Target must only have one inequality field.'
    );

    assert(!this.isDocumentQuery(), 'No filtering allowed for document query');

    const newFilters = this.filters.concat([filter]);
    return new Target(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      newFilters,
      this.limit,
      this.startAt,
      this.endAt
    );
  }

  addOrderBy(orderBy: OrderBy): Target {
    assert(!this.startAt && !this.endAt, 'Bounds must be set after orderBy');
    // TODO(dimond): validate that orderBy does not list the same key twice.
    const newOrderBy = this.explicitOrderBy.concat([orderBy]);
    return new Target(
      this.path,
      this.collectionGroup,
      newOrderBy,
      this.filters.slice(),
      this.limit,
      this.startAt,
      this.endAt
    );
  }

  withLimit(limit: number | null): Target {
    return new Target(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      limit,
      this.startAt,
      this.endAt
    );
  }

  withStartAt(bound: Bound): Target {
    return new Target(
      this.path,
      this.collectionGroup,
      this.explicitOrderBy.slice(),
      this.filters.slice(),
      this.limit,
      bound,
      this.endAt
    );
  }

  withEndAt(bound: Bound): Target {
    return new Target(
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
  asCollectionQueryAtPath(path: ResourcePath): Target {
    return new Target(
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

  toQuery(): Query {
    return new Query(this);
  }

  toString(): string {
    let str = 'Target(' + this.path.canonicalString();
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

  isEqual(other: Target): boolean {
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
