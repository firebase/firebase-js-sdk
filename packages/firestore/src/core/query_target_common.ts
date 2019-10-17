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

import { DocumentKey } from '../model/document_key';
import { isNullOrUndefined } from '../util/types';
import { Query } from './query';
import { Target } from './target';

// TODO(b/29183165): This is used to get a unique string from a query or target to,
// for example, use as a dictionary key, but the implementation is subject to
// collisions. Make it collision-free.
export function canonicalId(q: Query | Target): string {
  let canonicalId = q.path.canonicalString();
  if (q.collectionGroup !== null) {
    canonicalId += '|cg:' + q.collectionGroup;
  }
  canonicalId += '|f:';
  for (const filter of q.filters) {
    canonicalId += filter.canonicalId();
    canonicalId += ',';
  }
  canonicalId += '|ob:';
  // TODO(dimond): make q collision resistant
  for (const orderBy of q.orderBy) {
    canonicalId += orderBy.canonicalId();
    canonicalId += ',';
  }
  if (!isNullOrUndefined(q.limit)) {
    canonicalId += '|l:';
    canonicalId += q.limit!;
  }
  if (q.startAt) {
    canonicalId += '|lb:';
    canonicalId += q.startAt.canonicalId();
  }
  if (q.endAt) {
    canonicalId += '|ub:';
    canonicalId += q.endAt.canonicalId();
  }
  return canonicalId;
}

export function toString(q: Query | Target): string {
  let str = 'Target(' + q.path.canonicalString();
  if (q.collectionGroup !== null) {
    str += ' collectionGroup=' + q.collectionGroup;
  }
  if (q.filters.length > 0) {
    str += `, filters: [${q.filters.join(', ')}]`;
  }
  if (!isNullOrUndefined(q.limit)) {
    str += ', limit: ' + q.limit;
  }
  if (q.orderBy.length > 0) {
    str += `, orderBy: [${q.orderBy.join(', ')}]`;
  }
  if (q.startAt) {
    str += ', startAt: ' + q.startAt.canonicalId();
  }
  if (q.endAt) {
    str += ', endAt: ' + q.endAt.canonicalId();
  }

  return str + ')';
}

export function isEqual(l: Query | Target, r: Query | Target): boolean {
  if (typeof l !== typeof r) {
    return false;
  }
  if (l.limit !== r.limit) {
    return false;
  }

  if (l.orderBy.length !== r.orderBy.length) {
    return false;
  }

  for (let i = 0; i < r.orderBy.length; i++) {
    if (!l.orderBy[i].isEqual(r.orderBy[i])) {
      return false;
    }
  }

  if (l.filters.length !== r.filters.length) {
    return false;
  }

  for (let i = 0; i < l.filters.length; i++) {
    if (!l.filters[i].isEqual(r.filters[i])) {
      return false;
    }
  }

  if (l.collectionGroup !== r.collectionGroup) {
    return false;
  }

  if (!l.path.isEqual(r.path)) {
    return false;
  }

  if (l.startAt !== null ? !l.startAt.isEqual(r.startAt) : r.startAt !== null) {
    return false;
  }

  return l.endAt !== null ? l.endAt.isEqual(r.endAt) : r.endAt === null;
}

export function isDocumentQuery(q: Query | Target): boolean {
  return (
    DocumentKey.isDocumentKey(q.path) &&
    q.collectionGroup === null &&
    q.filters.length === 0
  );
}
