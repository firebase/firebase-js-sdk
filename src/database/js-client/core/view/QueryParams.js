/**
* Copyright 2017 Google Inc.
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
goog.provide('fb.core.view.QueryParams');
goog.require('fb.core.snap.Index');
goog.require('fb.core.snap.PriorityIndex');
goog.require('fb.core.util');
goog.require('fb.core.view.filter.IndexedFilter');
goog.require('fb.core.view.filter.LimitedFilter');
goog.require('fb.core.view.filter.NodeFilter');
goog.require('fb.core.view.filter.RangedFilter');

/**
 * This class is an immutable-from-the-public-api struct containing a set of query parameters defining a
 * range to be returned for a particular location. It is assumed that validation of parameters is done at the
 * user-facing API level, so it is not done here.
 * @constructor
 */
fb.core.view.QueryParams = function() {
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

  this.index_ = fb.core.snap.PriorityIndex;
};

/**
 * Wire Protocol Constants
 * @const
 * @enum {string}
 * @private
 */
fb.core.view.QueryParams.WIRE_PROTOCOL_CONSTANTS_ = {
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
fb.core.view.QueryParams.REST_QUERY_CONSTANTS_ = {
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
 * @type {!fb.core.view.QueryParams}
 * @const
 */
fb.core.view.QueryParams.DEFAULT = new fb.core.view.QueryParams();

/**
 * @return {boolean}
 */
fb.core.view.QueryParams.prototype.hasStart = function() {
  return this.startSet_;
};

/**
 * @return {boolean} True if it would return from left.
 */
fb.core.view.QueryParams.prototype.isViewFromLeft = function() {
  if (this.viewFrom_ === '') {
    // limit(), rather than limitToFirst or limitToLast was called.
    // This means that only one of startSet_ and endSet_ is true. Use them
    // to calculate which side of the view to anchor to. If neither is set,
    // anchor to the end.
    return this.startSet_;
  } else {
    return this.viewFrom_ === fb.core.view.QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_LEFT;
  }
};

/**
 * Only valid to call if hasStart() returns true
 * @return {*}
 */
fb.core.view.QueryParams.prototype.getIndexStartValue = function() {
  fb.core.util.assert(this.startSet_, 'Only valid if start has been set');
  return this.indexStartValue_;
};

/**
 * Only valid to call if hasStart() returns true.
 * Returns the starting key name for the range defined by these query parameters
 * @return {!string}
 */
fb.core.view.QueryParams.prototype.getIndexStartName = function() {
  fb.core.util.assert(this.startSet_, 'Only valid if start has been set');
  if (this.startNameSet_) {
    return this.indexStartName_;
  } else {
    return fb.core.util.MIN_NAME;
  }
};

/**
 * @return {boolean}
 */
fb.core.view.QueryParams.prototype.hasEnd = function() {
  return this.endSet_;
};

/**
 * Only valid to call if hasEnd() returns true.
 * @return {*}
 */
fb.core.view.QueryParams.prototype.getIndexEndValue = function() {
  fb.core.util.assert(this.endSet_, 'Only valid if end has been set');
  return this.indexEndValue_;
};

/**
 * Only valid to call if hasEnd() returns true.
 * Returns the end key name for the range defined by these query parameters
 * @return {!string}
 */
fb.core.view.QueryParams.prototype.getIndexEndName = function() {
  fb.core.util.assert(this.endSet_, 'Only valid if end has been set');
  if (this.endNameSet_) {
    return this.indexEndName_;
  } else {
    return fb.core.util.MAX_NAME;
  }
};

/**
 * @return {boolean}
 */
fb.core.view.QueryParams.prototype.hasLimit = function() {
  return this.limitSet_;
};

/**
 * @return {boolean} True if a limit has been set and it has been explicitly anchored
 */
fb.core.view.QueryParams.prototype.hasAnchoredLimit = function() {
  return this.limitSet_ && this.viewFrom_ !== '';
};

/**
 * Only valid to call if hasLimit() returns true
 * @return {!number}
 */
fb.core.view.QueryParams.prototype.getLimit = function() {
  fb.core.util.assert(this.limitSet_, 'Only valid if limit has been set');
  return this.limit_;
};

/**
 * @return {!fb.core.snap.Index}
 */
fb.core.view.QueryParams.prototype.getIndex = function() {
  return this.index_;
};

/**
 * @return {!fb.core.view.QueryParams}
 * @private
 */
fb.core.view.QueryParams.prototype.copy_ = function() {
  var copy = new fb.core.view.QueryParams();
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
 * @return {!fb.core.view.QueryParams}
 */
fb.core.view.QueryParams.prototype.limit = function(newLimit) {
  var newParams = this.copy_();
  newParams.limitSet_ = true;
  newParams.limit_ = newLimit;
  newParams.viewFrom_ = '';
  return newParams;
};

/**
 * @param {!number} newLimit
 * @return {!fb.core.view.QueryParams}
 */
fb.core.view.QueryParams.prototype.limitToFirst = function(newLimit) {
  var newParams = this.copy_();
  newParams.limitSet_ = true;
  newParams.limit_ = newLimit;
  newParams.viewFrom_ = fb.core.view.QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_LEFT;
  return newParams;
};

/**
 * @param {!number} newLimit
 * @return {!fb.core.view.QueryParams}
 */
fb.core.view.QueryParams.prototype.limitToLast = function(newLimit) {
  var newParams = this.copy_();
  newParams.limitSet_ = true;
  newParams.limit_ = newLimit;
  newParams.viewFrom_ = fb.core.view.QueryParams.WIRE_PROTOCOL_CONSTANTS_.VIEW_FROM_RIGHT;
  return newParams;
};

/**
 * @param {*} indexValue
 * @param {?string=} key
 * @return {!fb.core.view.QueryParams}
 */
fb.core.view.QueryParams.prototype.startAt = function(indexValue, key) {
  var newParams = this.copy_();
  newParams.startSet_ = true;
  if (!goog.isDef(indexValue)) {
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
 * @return {!fb.core.view.QueryParams}
 */
fb.core.view.QueryParams.prototype.endAt = function(indexValue, key) {
  var newParams = this.copy_();
  newParams.endSet_ = true;
  if (!goog.isDef(indexValue)) {
    indexValue = null;
  }
  newParams.indexEndValue_ = indexValue;
  if (goog.isDef(key)) {
    newParams.endNameSet_ = true;
    newParams.indexEndName_ = key;
  } else {
    newParams.startEndSet_ = false;
    newParams.indexEndName_ = '';
  }
  return newParams;
};

/**
 * @param {!fb.core.snap.Index} index
 * @return {!fb.core.view.QueryParams}
 */
fb.core.view.QueryParams.prototype.orderBy = function(index) {
  var newParams = this.copy_();
  newParams.index_ = index;
  return newParams;
};

/**
 * @return {!Object}
 */
fb.core.view.QueryParams.prototype.getQueryObject = function() {
  var WIRE_PROTOCOL_CONSTANTS = fb.core.view.QueryParams.WIRE_PROTOCOL_CONSTANTS_;
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
  if (this.index_ !== fb.core.snap.PriorityIndex) {
    obj[WIRE_PROTOCOL_CONSTANTS.INDEX] = this.index_.toString();
  }
  return obj;
};

/**
 * @return {boolean}
 */
fb.core.view.QueryParams.prototype.loadsAllData = function() {
  return !(this.startSet_ || this.endSet_ || this.limitSet_);
};

/**
 * @return {boolean}
 */
fb.core.view.QueryParams.prototype.isDefault = function() {
  return this.loadsAllData() && this.index_ == fb.core.snap.PriorityIndex;
};

/**
 * @return {!fb.core.view.filter.NodeFilter}
 */
fb.core.view.QueryParams.prototype.getNodeFilter = function() {
  if (this.loadsAllData()) {
    return new fb.core.view.filter.IndexedFilter(this.getIndex());
  } else if (this.hasLimit()) {
    return new fb.core.view.filter.LimitedFilter(this);
  } else {
    return new fb.core.view.filter.RangedFilter(this);
  }
};


/**
 * Returns a set of REST query string parameters representing this query.
 *
 * @return {!Object.<string,*>} query string parameters
 */
fb.core.view.QueryParams.prototype.toRestQueryStringParameters = function() {
  var REST_CONSTANTS = fb.core.view.QueryParams.REST_QUERY_CONSTANTS_;
  var qs = { };

  if (this.isDefault()) {
    return qs;
  }

  var orderBy;
  if (this.index_ === fb.core.snap.PriorityIndex) {
    orderBy = REST_CONSTANTS.PRIORITY_INDEX;
  } else if (this.index_ === fb.core.snap.ValueIndex) {
    orderBy = REST_CONSTANTS.VALUE_INDEX;
  } else if (this.index_ === fb.core.snap.KeyIndex) {
    orderBy = REST_CONSTANTS.KEY_INDEX;
  } else {
    fb.core.util.assert(this.index_ instanceof fb.core.snap.PathIndex, 'Unrecognized index type!');
    orderBy = this.index_.toString();
  }
  qs[REST_CONSTANTS.ORDER_BY] = fb.util.json.stringify(orderBy);

  if (this.startSet_) {
    qs[REST_CONSTANTS.START_AT] = fb.util.json.stringify(this.indexStartValue_);
    if (this.startNameSet_) {
      qs[REST_CONSTANTS.START_AT] += ',' + fb.util.json.stringify(this.indexStartName_);
    }
  }

  if (this.endSet_) {
    qs[REST_CONSTANTS.END_AT] = fb.util.json.stringify(this.indexEndValue_);
    if (this.endNameSet_) {
      qs[REST_CONSTANTS.END_AT] += ',' + fb.util.json.stringify(this.indexEndName_);
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

if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  fb.core.view.QueryParams.prototype.toString = function() {
    return fb.util.json.stringify(this.getQueryObject());
  };
}
