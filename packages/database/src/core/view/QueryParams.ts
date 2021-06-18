/**
 * @license
 * Copyright 2017 Google LLC
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

import { assert, stringify } from '@firebase/util';

import { Index } from '../snap/indexes/Index';
import { KEY_INDEX } from '../snap/indexes/KeyIndex';
import { PathIndex } from '../snap/indexes/PathIndex';
import { PRIORITY_INDEX, PriorityIndex } from '../snap/indexes/PriorityIndex';
import { VALUE_INDEX } from '../snap/indexes/ValueIndex';
import { predecessor, successor } from '../util/NextPushId';
import { MAX_NAME, MIN_NAME } from '../util/util';

import { IndexedFilter } from './filter/IndexedFilter';
import { LimitedFilter } from './filter/LimitedFilter';
import { NodeFilter } from './filter/NodeFilter';
import { RangedFilter } from './filter/RangedFilter';

/**
 * Wire Protocol Constants
 */
const enum WIRE_PROTOCOL_CONSTANTS {
  INDEX_START_VALUE = 'sp',
  INDEX_START_NAME = 'sn',
  INDEX_END_VALUE = 'ep',
  INDEX_END_NAME = 'en',
  LIMIT = 'l',
  VIEW_FROM = 'vf',
  VIEW_FROM_LEFT = 'l',
  VIEW_FROM_RIGHT = 'r',
  INDEX = 'i'
}

/**
 * REST Query Constants
 */
const enum REST_QUERY_CONSTANTS {
  ORDER_BY = 'orderBy',
  PRIORITY_INDEX = '$priority',
  VALUE_INDEX = '$value',
  KEY_INDEX = '$key',
  START_AT = 'startAt',
  END_AT = 'endAt',
  LIMIT_TO_FIRST = 'limitToFirst',
  LIMIT_TO_LAST = 'limitToLast'
}

/**
 * This class is an immutable-from-the-public-api struct containing a set of query parameters defining a
 * range to be returned for a particular location. It is assumed that validation of parameters is done at the
 * user-facing API level, so it is not done here.
 */
export class QueryParams {
  limitSet_ = false;
  startSet_ = false;
  startNameSet_ = false;
  startAfterSet_ = false;
  endSet_ = false;
  endNameSet_ = false;
  endBeforeSet_ = false;
  limit_ = 0;
  viewFrom_ = '';
  indexStartValue_: unknown | null = null;
  indexStartName_ = '';
  indexEndValue_: unknown | null = null;
  indexEndName_ = '';
  index_: PriorityIndex = PRIORITY_INDEX;

  hasStart(): boolean {
    return this.startSet_;
  }

  hasStartAfter(): boolean {
    return this.startAfterSet_;
  }

  hasEndBefore(): boolean {
    return this.endBeforeSet_;
  }

  /**
   * @returns True if it would return from left.
   */
  isViewFromLeft(): boolean {
    if (this.viewFrom_ === '') {
      // limit(), rather than limitToFirst or limitToLast was called.
      // This means that only one of startSet_ and endSet_ is true. Use them
      // to calculate which side of the view to anchor to. If neither is set,
      // anchor to the end.
      return this.startSet_;
    } else {
      return this.viewFrom_ === WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_LEFT;
    }
  }

  /**
   * Only valid to call if hasStart() returns true
   */
  getIndexStartValue(): unknown {
    assert(this.startSet_, 'Only valid if start has been set');
    return this.indexStartValue_;
  }

  /**
   * Only valid to call if hasStart() returns true.
   * Returns the starting key name for the range defined by these query parameters
   */
  getIndexStartName(): string {
    assert(this.startSet_, 'Only valid if start has been set');
    if (this.startNameSet_) {
      return this.indexStartName_;
    } else {
      return MIN_NAME;
    }
  }

  hasEnd(): boolean {
    return this.endSet_;
  }

  /**
   * Only valid to call if hasEnd() returns true.
   */
  getIndexEndValue(): unknown {
    assert(this.endSet_, 'Only valid if end has been set');
    return this.indexEndValue_;
  }

  /**
   * Only valid to call if hasEnd() returns true.
   * Returns the end key name for the range defined by these query parameters
   */
  getIndexEndName(): string {
    assert(this.endSet_, 'Only valid if end has been set');
    if (this.endNameSet_) {
      return this.indexEndName_;
    } else {
      return MAX_NAME;
    }
  }

  hasLimit(): boolean {
    return this.limitSet_;
  }

  /**
   * @returns True if a limit has been set and it has been explicitly anchored
   */
  hasAnchoredLimit(): boolean {
    return this.limitSet_ && this.viewFrom_ !== '';
  }

  /**
   * Only valid to call if hasLimit() returns true
   */
  getLimit(): number {
    assert(this.limitSet_, 'Only valid if limit has been set');
    return this.limit_;
  }

  getIndex(): Index {
    return this.index_;
  }

  loadsAllData(): boolean {
    return !(this.startSet_ || this.endSet_ || this.limitSet_);
  }

  isDefault(): boolean {
    return this.loadsAllData() && this.index_ === PRIORITY_INDEX;
  }

  copy(): QueryParams {
    const copy = new QueryParams();
    copy.limitSet_ = this.limitSet_;
    copy.limit_ = this.limit_;
    copy.startSet_ = this.startSet_;
    copy.indexStartValue_ = this.indexStartValue_;
    copy.startNameSet_ = this.startNameSet_;
    copy.indexStartName_ = this.indexStartName_;
    copy.endSet_ = this.endSet_;
    copy.indexEndValue_ = this.indexEndValue_;
    copy.endNameSet_ = this.endNameSet_;
    copy.indexEndName_ = this.indexEndName_;
    copy.index_ = this.index_;
    copy.viewFrom_ = this.viewFrom_;
    return copy;
  }
}

export function queryParamsGetNodeFilter(queryParams: QueryParams): NodeFilter {
  if (queryParams.loadsAllData()) {
    return new IndexedFilter(queryParams.getIndex());
  } else if (queryParams.hasLimit()) {
    return new LimitedFilter(queryParams);
  } else {
    return new RangedFilter(queryParams);
  }
}

export function queryParamsLimit(
  queryParams: QueryParams,
  newLimit: number
): QueryParams {
  const newParams = queryParams.copy();
  newParams.limitSet_ = true;
  newParams.limit_ = newLimit;
  newParams.viewFrom_ = '';
  return newParams;
}

export function queryParamsLimitToFirst(
  queryParams: QueryParams,
  newLimit: number
): QueryParams {
  const newParams = queryParams.copy();
  newParams.limitSet_ = true;
  newParams.limit_ = newLimit;
  newParams.viewFrom_ = WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_LEFT;
  return newParams;
}

export function queryParamsLimitToLast(
  queryParams: QueryParams,
  newLimit: number
): QueryParams {
  const newParams = queryParams.copy();
  newParams.limitSet_ = true;
  newParams.limit_ = newLimit;
  newParams.viewFrom_ = WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_RIGHT;
  return newParams;
}

export function queryParamsStartAt(
  queryParams: QueryParams,
  indexValue: unknown,
  key?: string | null
): QueryParams {
  const newParams = queryParams.copy();
  newParams.startSet_ = true;
  if (indexValue === undefined) {
    indexValue = null;
  }
  newParams.indexStartValue_ = indexValue;
  if (key != null) {
    newParams.startNameSet_ = true;
    newParams.indexStartName_ = key;
  } else {
    newParams.startNameSet_ = false;
    newParams.indexStartName_ = '';
  }
  return newParams;
}

export function queryParamsStartAfter(
  queryParams: QueryParams,
  indexValue: unknown,
  key?: string | null
): QueryParams {
  let params: QueryParams;
  if (queryParams.index_ === KEY_INDEX) {
    if (typeof indexValue === 'string') {
      indexValue = successor(indexValue as string);
    }
    params = queryParamsStartAt(queryParams, indexValue, key);
  } else {
    let childKey: string;
    if (key == null) {
      childKey = MAX_NAME;
    } else {
      childKey = successor(key);
    }
    params = queryParamsStartAt(queryParams, indexValue, childKey);
  }
  params.startAfterSet_ = true;
  return params;
}

export function queryParamsEndAt(
  queryParams: QueryParams,
  indexValue: unknown,
  key?: string | null
): QueryParams {
  const newParams = queryParams.copy();
  newParams.endSet_ = true;
  if (indexValue === undefined) {
    indexValue = null;
  }
  newParams.indexEndValue_ = indexValue;
  if (key !== undefined) {
    newParams.endNameSet_ = true;
    newParams.indexEndName_ = key;
  } else {
    newParams.endNameSet_ = false;
    newParams.indexEndName_ = '';
  }
  return newParams;
}

export function queryParamsEndBefore(
  queryParams: QueryParams,
  indexValue: unknown,
  key?: string | null
): QueryParams {
  let childKey: string;
  let params: QueryParams;
  if (queryParams.index_ === KEY_INDEX) {
    if (typeof indexValue === 'string') {
      indexValue = predecessor(indexValue as string);
    }
    params = queryParamsEndAt(queryParams, indexValue, key);
  } else {
    if (key == null) {
      childKey = MIN_NAME;
    } else {
      childKey = predecessor(key);
    }
    params = queryParamsEndAt(queryParams, indexValue, childKey);
  }
  params.endBeforeSet_ = true;
  return params;
}

export function queryParamsOrderBy(
  queryParams: QueryParams,
  index: Index
): QueryParams {
  const newParams = queryParams.copy();
  newParams.index_ = index;
  return newParams;
}

/**
 * Returns a set of REST query string parameters representing this query.
 *
 * @returns query string parameters
 */
export function queryParamsToRestQueryStringParameters(
  queryParams: QueryParams
): Record<string, string | number> {
  const qs: Record<string, string | number> = {};

  if (queryParams.isDefault()) {
    return qs;
  }

  let orderBy;
  if (queryParams.index_ === PRIORITY_INDEX) {
    orderBy = REST_QUERY_CONSTANTS.PRIORITY_INDEX;
  } else if (queryParams.index_ === VALUE_INDEX) {
    orderBy = REST_QUERY_CONSTANTS.VALUE_INDEX;
  } else if (queryParams.index_ === KEY_INDEX) {
    orderBy = REST_QUERY_CONSTANTS.KEY_INDEX;
  } else {
    assert(queryParams.index_ instanceof PathIndex, 'Unrecognized index type!');
    orderBy = queryParams.index_.toString();
  }
  qs[REST_QUERY_CONSTANTS.ORDER_BY] = stringify(orderBy);

  if (queryParams.startSet_) {
    qs[REST_QUERY_CONSTANTS.START_AT] = stringify(queryParams.indexStartValue_);
    if (queryParams.startNameSet_) {
      qs[REST_QUERY_CONSTANTS.START_AT] +=
        ',' + stringify(queryParams.indexStartName_);
    }
  }

  if (queryParams.endSet_) {
    qs[REST_QUERY_CONSTANTS.END_AT] = stringify(queryParams.indexEndValue_);
    if (queryParams.endNameSet_) {
      qs[REST_QUERY_CONSTANTS.END_AT] +=
        ',' + stringify(queryParams.indexEndName_);
    }
  }

  if (queryParams.limitSet_) {
    if (queryParams.isViewFromLeft()) {
      qs[REST_QUERY_CONSTANTS.LIMIT_TO_FIRST] = queryParams.limit_;
    } else {
      qs[REST_QUERY_CONSTANTS.LIMIT_TO_LAST] = queryParams.limit_;
    }
  }

  return qs;
}

export function queryParamsGetQueryObject(
  queryParams: QueryParams
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  if (queryParams.startSet_) {
    obj[WIRE_PROTOCOL_CONSTANTS.INDEX_START_VALUE] =
      queryParams.indexStartValue_;
    if (queryParams.startNameSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.INDEX_START_NAME] =
        queryParams.indexStartName_;
    }
  }
  if (queryParams.endSet_) {
    obj[WIRE_PROTOCOL_CONSTANTS.INDEX_END_VALUE] = queryParams.indexEndValue_;
    if (queryParams.endNameSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.INDEX_END_NAME] = queryParams.indexEndName_;
    }
  }
  if (queryParams.limitSet_) {
    obj[WIRE_PROTOCOL_CONSTANTS.LIMIT] = queryParams.limit_;
    let viewFrom = queryParams.viewFrom_;
    if (viewFrom === '') {
      if (queryParams.isViewFromLeft()) {
        viewFrom = WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_LEFT;
      } else {
        viewFrom = WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_RIGHT;
      }
    }
    obj[WIRE_PROTOCOL_CONSTANTS.VIEW_FROM] = viewFrom;
  }
  // For now, priority index is the default, so we only specify if it's some other index
  if (queryParams.index_ !== PRIORITY_INDEX) {
    obj[WIRE_PROTOCOL_CONSTANTS.INDEX] = queryParams.index_.toString();
  }
  return obj;
}
