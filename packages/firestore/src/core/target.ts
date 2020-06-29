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
import { ResourcePath } from '../model/path';
import { isNullOrUndefined } from '../util/types';
import {
  Bound,
  boundEquals,
  canonifyBound,
  canonifyOrderBy,
  Filter,
  OrderBy,
  orderByEquals,
  stringifyOrderBy
} from './query';
import { debugCast } from '../util/assert';

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
    canonicalId += targetImpl.filters.map(f => f.canonicalId()).join(',');
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
    str += `, filters: [${target.filters.join(', ')}]`;
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
    if (!left.filters[i].isEqual(right.filters[i])) {
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
