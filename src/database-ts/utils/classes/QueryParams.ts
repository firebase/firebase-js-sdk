import { PriorityIndex } from "./indexes/PriorityIndex";

const WIRE_PROTOCOL_CONSTANTS = {
  INDEX_START_VALUE: 'sp',
  INDEX_START_NAME: 'sn',
  INDEX_END_VALUE: 'ep',
  INDEX_END_NAME: 'en',
  LIMIT: 'l',
  VIEW_FROM: 'vf',
  VIEW_FROM_LEFT: 'l',
  VIEW_FROM_RIGHT: 'r',
  INDEX: 'i'
};

const REST_QUERY_CONSTANTS = {
  ORDER_BY: 'orderBy',
  PRIORITY_INDEX: '$priority',
  VALUE_INDEX: '$value',
  KEY_INDEX: '$key',
  START_AT: 'startAt',
  END_AT: 'endAt',
  LIMIT_TO_FIRST: 'limitToFirst',
  LIMIT_TO_LAST: 'limitToLast'
};

export class QueryParams {
  static DEFAULT = new QueryParams();
  private endNameSet = false;
  private endSet = false;
  private index = PriorityIndex.singleton
  private indexEndName = '';
  private indexEndValue = null;
  private indexStartName = '';
  private indexStartValue = null;
  private limit = 0;
  private limitSet = false;
  private startNameSet = false;
  private startSet = false;
  private viewFrom = '';
  endAt(indexValue, key): QueryParams { return new QueryParams(); }
  getIndex() {}
  hasEnd() {}
  hasLimit() {}
  hasStart() {}
  limitToFirst(limit): QueryParams { return new QueryParams(); }
  limitToLast(limit): QueryParams { return new QueryParams(); }
  startAt(indexValue, key): QueryParams { return new QueryParams(); }
}