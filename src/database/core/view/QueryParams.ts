import { assert } from "../../../utils/assert";
import { 
  MIN_NAME,
  MAX_NAME
} from "../util/util";
import { KEY_INDEX } from "../snap/indexes/KeyIndex";
import { PRIORITY_INDEX } from "../snap/indexes/PriorityIndex";
import { VALUE_INDEX } from "../snap/indexes/ValueIndex";
import { PathIndex } from "../snap/indexes/PathIndex";
import { IndexedFilter } from "./filter/IndexedFilter";
import { LimitedFilter } from "./filter/LimitedFilter";
import { RangedFilter } from "./filter/RangedFilter";
import { stringify } from "../../../utils/json";

/**
 * This class is an immutable-from-the-public-api struct containing a set of query parameters defining a
 * range to be returned for a particular location. It is assumed that validation of parameters is done at the
 * user-facing API level, so it is not done here.
 * @constructor
 */
export class QueryParams {
  endNameSet_
  endSet_
  index_
  indexEndName_
  indexEndValue_
  indexStartName_
  indexStartValue_
  limit_
  limitSet_
  startEndSet_
  startNameSet_
  startSet_
  viewFrom_

  constructor() {
    this.limitSet_ = false;
    this.startSet_ = false;
    this.startNameSet_ = false;
    this.endSet_ = false;
    this.endNameSet_ = false;

    this.limit_ = 0;
    this.viewFrom_ = '';
    this.indexStartValue_ = null;
    this.indexStartName_ = '';
    this.indexEndValue_ = null;
    this.indexEndName_ = '';

    this.index_ = PRIORITY_INDEX;
  };
  /**
   * Wire Protocol Constants
   * @const
   * @enum {string}
   * @private
   */
  private static WIRE_PROTOCOL_CONSTANTS_ = {
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

  /**
   * REST Query Constants
   * @const
   * @enum {string}
   * @private
   */
  private static REST_QUERY_CONSTANTS_ = {
    ORDER_BY: 'orderBy',
    PRIORITY_INDEX: '$priority',
    VALUE_INDEX: '$value',
    KEY_INDEX: '$key',
    START_AT: 'startAt',
    END_AT: 'endAt',
    LIMIT_TO_FIRST: 'limitToFirst',
    LIMIT_TO_LAST: 'limitToLast'
  };

  /**
   * Default, empty query parameters
   * @type {!QueryParams}
   * @const
   */
  static DEFAULT = new QueryParams();

  /**
   * @return {boolean}
   */
  hasStart() {
    return this.startSet_;
  };

  /**
   * @return {boolean} True if it would return from left.
   */
  isViewFromLeft() {
    if (this.viewFrom_ === '') {
      // limit(), rather than limitToFirst or limitToLast was called.
      // This means that only one of startSet_ and endSet_ is true. Use them
      // to calculate which side of the view to anchor to. If neither is set,
      // anchor to the end.
      return this.startSet_;
    } else {
      return this.viewFrom_ === QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_LEFT;
    }
  };

  /**
   * Only valid to call if hasStart() returns true
   * @return {*}
   */
  getIndexStartValue() {
    assert(this.startSet_, 'Only valid if start has been set');
    return this.indexStartValue_;
  };

  /**
   * Only valid to call if hasStart() returns true.
   * Returns the starting key name for the range defined by these query parameters
   * @return {!string}
   */
  getIndexStartName() {
    assert(this.startSet_, 'Only valid if start has been set');
    if (this.startNameSet_) {
      return this.indexStartName_;
    } else {
      return MIN_NAME;
    }
  };

  /**
   * @return {boolean}
   */
  hasEnd() {
    return this.endSet_;
  };

  /**
   * Only valid to call if hasEnd() returns true.
   * @return {*}
   */
  getIndexEndValue() {
    assert(this.endSet_, 'Only valid if end has been set');
    return this.indexEndValue_;
  };

  /**
   * Only valid to call if hasEnd() returns true.
   * Returns the end key name for the range defined by these query parameters
   * @return {!string}
   */
  getIndexEndName() {
    assert(this.endSet_, 'Only valid if end has been set');
    if (this.endNameSet_) {
      return this.indexEndName_;
    } else {
      return MAX_NAME;
    }
  };

  /**
   * @return {boolean}
   */
  hasLimit() {
    return this.limitSet_;
  };

  /**
   * @return {boolean} True if a limit has been set and it has been explicitly anchored
   */
  hasAnchoredLimit() {
    return this.limitSet_ && this.viewFrom_ !== '';
  };

  /**
   * Only valid to call if hasLimit() returns true
   * @return {!number}
   */
  getLimit() {
    assert(this.limitSet_, 'Only valid if limit has been set');
    return this.limit_;
  };

  /**
   * @return {!Index}
   */
  getIndex() {
    return this.index_;
  };

  /**
   * @return {!QueryParams}
   * @private
   */
  copy_() {
    var copy = new QueryParams();
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
  };

  /**
   * @param {!number} newLimit
   * @return {!QueryParams}
   */
  limit(newLimit) {
    var newParams = this.copy_();
    newParams.limitSet_ = true;
    newParams.limit_ = newLimit;
    newParams.viewFrom_ = '';
    return newParams;
  };

  /**
   * @param {!number} newLimit
   * @return {!QueryParams}
   */
  limitToFirst(newLimit) {
    var newParams = this.copy_();
    newParams.limitSet_ = true;
    newParams.limit_ = newLimit;
    newParams.viewFrom_ = QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_LEFT;
    return newParams;
  };

  /**
   * @param {!number} newLimit
   * @return {!QueryParams}
   */
  limitToLast(newLimit) {
    var newParams = this.copy_();
    newParams.limitSet_ = true;
    newParams.limit_ = newLimit;
    newParams.viewFrom_ = QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_RIGHT;
    return newParams;
  };

  /**
   * @param {*} indexValue
   * @param {?string=} key
   * @return {!QueryParams}
   */
  startAt(indexValue, key) {
    var newParams = this.copy_();
    newParams.startSet_ = true;
    if (!(indexValue !== undefined)) {
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
  };

  /**
   * @param {*} indexValue
   * @param {?string=} key
   * @return {!QueryParams}
   */
  endAt(indexValue, key) {
    var newParams = this.copy_();
    newParams.endSet_ = true;
    if (!(indexValue !== undefined)) {
      indexValue = null;
    }
    newParams.indexEndValue_ = indexValue;
    if ((key !== undefined)) {
      newParams.endNameSet_ = true;
      newParams.indexEndName_ = key;
    } else {
      newParams.startEndSet_ = false;
      newParams.indexEndName_ = '';
    }
    return newParams;
  };

  /**
   * @param {!Index} index
   * @return {!QueryParams}
   */
  orderBy(index) {
    var newParams = this.copy_();
    newParams.index_ = index;
    return newParams;
  };

  /**
   * @return {!Object}
   */
  getQueryObject() {
    var WIRE_PROTOCOL_CONSTANTS = QueryParams.WIRE_PROTOCOL_CONSTANTS_;
    var obj = {};
    if (this.startSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.INDEX_START_VALUE] = this.indexStartValue_;
      if (this.startNameSet_) {
        obj[WIRE_PROTOCOL_CONSTANTS.INDEX_START_NAME] = this.indexStartName_;
      }
    }
    if (this.endSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.INDEX_END_VALUE] = this.indexEndValue_;
      if (this.endNameSet_) {
        obj[WIRE_PROTOCOL_CONSTANTS.INDEX_END_NAME] = this.indexEndName_;
      }
    }
    if (this.limitSet_) {
      obj[WIRE_PROTOCOL_CONSTANTS.LIMIT] = this.limit_;
      var viewFrom = this.viewFrom_;
      if (viewFrom === '') {
        if (this.isViewFromLeft()) {
          viewFrom = WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_LEFT;
        } else {
          viewFrom = WIRE_PROTOCOL_CONSTANTS.VIEW_FROM_RIGHT;
        }
      }
      obj[WIRE_PROTOCOL_CONSTANTS.VIEW_FROM] = viewFrom;
    }
    // For now, priority index is the default, so we only specify if it's some other index
    if (this.index_ !== PRIORITY_INDEX) {
      obj[WIRE_PROTOCOL_CONSTANTS.INDEX] = this.index_.toString();
    }
    return obj;
  };

  /**
   * @return {boolean}
   */
  loadsAllData() {
    return !(this.startSet_ || this.endSet_ || this.limitSet_);
  };

  /**
   * @return {boolean}
   */
  isDefault() {
    return this.loadsAllData() && this.index_ == PRIORITY_INDEX;
  };

  /**
   * @return {!NodeFilter}
   */
  getNodeFilter() {
    if (this.loadsAllData()) {
      return new IndexedFilter(this.getIndex());
    } else if (this.hasLimit()) {
      return new LimitedFilter(this);
    } else {
      return new RangedFilter(this);
    }
  };


  /**
   * Returns a set of REST query string parameters representing this query.
   *
   * @return {!Object.<string,*>} query string parameters
   */
  toRestQueryStringParameters() {
    var REST_CONSTANTS = QueryParams.REST_QUERY_CONSTANTS_;
    var qs = { };

    if (this.isDefault()) {
      return qs;
    }

    var orderBy;
    if (this.index_ === PRIORITY_INDEX) {
      orderBy = REST_CONSTANTS.PRIORITY_INDEX;
    } else if (this.index_ === VALUE_INDEX) {
      orderBy = REST_CONSTANTS.VALUE_INDEX;
    } else if (this.index_ === KEY_INDEX) {
      orderBy = REST_CONSTANTS.KEY_INDEX;
    } else {
      assert(this.index_ instanceof PathIndex, 'Unrecognized index type!');
      orderBy = this.index_.toString();
    }
    qs[REST_CONSTANTS.ORDER_BY] = stringify(orderBy);

    if (this.startSet_) {
      qs[REST_CONSTANTS.START_AT] = stringify(this.indexStartValue_);
      if (this.startNameSet_) {
        qs[REST_CONSTANTS.START_AT] += ',' + stringify(this.indexStartName_);
      }
    }

    if (this.endSet_) {
      qs[REST_CONSTANTS.END_AT] = stringify(this.indexEndValue_);
      if (this.endNameSet_) {
        qs[REST_CONSTANTS.END_AT] += ',' + stringify(this.indexEndName_);
      }
    }

    if (this.limitSet_) {
      if (this.isViewFromLeft()) {
        qs[REST_CONSTANTS.LIMIT_TO_FIRST] = this.limit_;
      } else {
        qs[REST_CONSTANTS.LIMIT_TO_LAST] = this.limit_;
      }
    }

    return qs;
  };
}
