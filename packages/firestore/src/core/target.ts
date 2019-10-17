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

import { ResourcePath } from '../model/path';
import { Bound, Filter, OrderBy, Query } from './query';
import {
  canonicalId,
  toString,
  isEqual,
  isDocumentQuery
} from './query_target_common';

/**
 * Represents a backend query: the query protos SDK sent to backend and persisted
 * in the LocalStore are from this class.
 */
export class Target {
  private memoizedCanonicalId: string | null = null;

  /**
   * Initializes a Target with a path and optional additional query constraints.
   * Path must currently be empty if this is a collection group query.
   *
   * NOTE: you should always construct `Target` from `Query.toTarget` instead of
   * using this constructor, because `Query` provides sensible default `orderBy`
   * property.
   */
  constructor(
    readonly path: ResourcePath,
    readonly collectionGroup: string | null = null,
    readonly orderBy: OrderBy[] = [],
    readonly filters: Filter[] = [],
    readonly limit: number | null = null,
    readonly startAt: Bound | null = null,
    readonly endAt: Bound | null = null
  ) {}

  canonicalId(): string {
    if (this.memoizedCanonicalId === null) {
      this.memoizedCanonicalId = canonicalId(this);
    }
    return this.memoizedCanonicalId;
  }

  toString(): string {
    return toString(this);
  }

  isEqual(other: Target): boolean {
    return isEqual(this, other);
  }

  isDocumentQuery(): boolean {
    return isDocumentQuery(this);
  }

  toQuery(): Query {
    return new Query(
      this.path,
      this.collectionGroup,
      this.orderBy,
      this.filters,
      this.limit,
      this.startAt,
      this.endAt
    );
  }
}
