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
goog.provide('fb.api.Query');
goog.require('fb.core.snap.KeyIndex');
goog.require('fb.core.snap.PathIndex');
goog.require('fb.core.snap.PriorityIndex');
goog.require('fb.core.snap.ValueIndex');
goog.require('fb.core.util');
goog.require('fb.core.util.ObjectToUniqueKey');
goog.require('fb.core.util.Path');
goog.require('fb.core.util.validation');
goog.require('fb.core.view.ChildEventRegistration');
goog.require('fb.core.view.ValueEventRegistration');
goog.require('fb.util.promise');
goog.require('fb.util.promise.Deferred');
goog.require('fb.util.validation');


/**
 * A Query represents a filter to be applied to a firebase location.  This object purely represents the
 * query expression (and exposes our public API to build the query).  The actual query logic is in ViewBase.js.
 *
 * Since every Firebase reference is a query, Firebase inherits from this object.
 */
fb.api.Query = goog.defineClass(null, {
  /**
   * @param {!fb.core.Repo} repo
   * @param {!fb.core.util.Path} path
   * @param {!fb.core.view.QueryParams} queryParams
   * @param {!boolean} orderByCalled
   */
  constructor: function(repo, path, queryParams, orderByCalled) {
    this.repo = repo;
    this.path = path;
    this.queryParams_ = queryParams;
    this.orderByCalled_ = orderByCalled;
  },

  /**
   * Validates start/end values for queries.
   * @param {!fb.core.view.QueryParams} params
   * @private
   */
  validateQueryEndpoints_: function(params) {
    var startNode = null;
    var endNode = null;
    if (params.hasStart()) {
      startNode = params.getIndexStartValue();
    }
    if (params.hasEnd()) {
      endNode = params.getIndexEndValue();
    }

    if (params.getIndex() === fb.core.snap.KeyIndex) {
      var tooManyArgsError = 'Query: When ordering by key, you may only pass one argument to ' +
          'startAt(), endAt(), or equalTo().';
      var wrongArgTypeError = 'Query: When ordering by key, the argument passed to startAt(), endAt(),' +
          'or equalTo() must be a string.';
      if (params.hasStart()) {
        var startName = params.getIndexStartName();
        if (startName != fb.core.util.MIN_NAME) {
          throw new Error(tooManyArgsError);
        } else if (typeof(startNode) !== 'string') {
          throw new Error(wrongArgTypeError);
        }
      }
      if (params.hasEnd()) {
        var endName = params.getIndexEndName();
        if (endName != fb.core.util.MAX_NAME) {
          throw new Error(tooManyArgsError);
        } else if (typeof(endNode) !== 'string') {
          throw new Error(wrongArgTypeError);
        }
      }
    }
    else if (params.getIndex() === fb.core.snap.PriorityIndex) {
      if ((startNode != null && !fb.core.util.validation.isValidPriority(startNode)) ||
          (endNode != null && !fb.core.util.validation.isValidPriority(endNode))) {
        throw new Error('Query: When ordering by priority, the first argument passed to startAt(), ' +
            'endAt(), or equalTo() must be a valid priority value (null, a number, or a string).');
      }
    } else {
      fb.core.util.assert((params.getIndex() instanceof fb.core.snap.PathIndex) ||
                          (params.getIndex() === fb.core.snap.ValueIndex), 'unknown index type.');
      if ((startNode != null && typeof startNode === 'object') ||
          (endNode != null && typeof endNode === 'object')) {
        throw new Error('Query: First argument passed to startAt(), endAt(), or equalTo() cannot be ' +
            'an object.');
      }
    }
  },

  /**
   * Validates that limit* has been called with the correct combination of parameters
   * @param {!fb.core.view.QueryParams} params
   * @private
   */
  validateLimit_: function(params) {
    if (params.hasStart() && params.hasEnd() && params.hasLimit() && !params.hasAnchoredLimit()) {
      throw new Error(
          "Query: Can't combine startAt(), endAt(), and limit(). Use limitToFirst() or limitToLast() instead."
      );
    }
  },

  /**
   * Validates that no other order by call has been made
   * @param {!string} fnName
   * @private
   */
  validateNoPreviousOrderByCall_: function(fnName) {
    if (this.orderByCalled_ === true) {
      throw new Error(fnName + ": You can't combine multiple orderBy calls.");
    }
  },

  /**
   * @return {!fb.core.view.QueryParams}
   */
  getQueryParams: function() {
    return this.queryParams_;
  },

  /**
   * @return {!Firebase}
   */
  getRef: function() {
    fb.util.validation.validateArgCount('Query.ref', 0, 0, arguments.length);
    // This is a slight hack. We cannot goog.require('fb.api.Firebase'), since Firebase requires fb.api.Query.
    // However, we will always export 'Firebase' to the global namespace, so it's guaranteed to exist by the time this
    // method gets called.
    return new Firebase(this.repo, this.path);
  },

  /**
   * @param {!string} eventType
   * @param {!function(fb.api.DataSnapshot, string=)} callback
   * @param {(function(Error)|Object)=} opt_cancelCallbackOrContext
   * @param {Object=} opt_context
   * @return {!function(fb.api.DataSnapshot, string=)}
   */
  on: function(eventType, callback, opt_cancelCallbackOrContext, opt_context) {
    fb.util.validation.validateArgCount('Query.on', 2, 4, arguments.length);
    fb.core.util.validation.validateEventType('Query.on', 1, eventType, false);
    fb.util.validation.validateCallback('Query.on', 2, callback, false);

    var ret = this.getCancelAndContextArgs_('Query.on', opt_cancelCallbackOrContext, opt_context);

    if (eventType === 'value') {
      this.onValueEvent(callback, ret.cancel, ret.context);
    } else {
      var callbacks = {};
      callbacks[eventType] = callback;
      this.onChildEvent(callbacks, ret.cancel, ret.context);
    }
    return callback;
  },

  /**
   * @param {!function(!fb.api.DataSnapshot)} callback
   * @param {?function(Error)} cancelCallback
   * @param {?Object} context
   * @protected
   */
  onValueEvent: function(callback, cancelCallback, context) {
    var container = new fb.core.view.ValueEventRegistration(callback, cancelCallback || null, context || null);
    this.repo.addEventCallbackForQuery(this, container);
  },

  /**
   * @param {!Object.<string, !function(!fb.api.DataSnapshot, ?string)>} callbacks
   * @param {?function(Error)} cancelCallback
   * @param {?Object} context
   */
  onChildEvent: function(callbacks, cancelCallback, context) {
    var container = new fb.core.view.ChildEventRegistration(callbacks, cancelCallback, context);
    this.repo.addEventCallbackForQuery(this, container);
  },

  /**
   * @param {string=} opt_eventType
   * @param {(function(!fb.api.DataSnapshot, ?string=))=} opt_callback
   * @param {Object=} opt_context
   */
  off: function(opt_eventType, opt_callback, opt_context) {
    fb.util.validation.validateArgCount('Query.off', 0, 3, arguments.length);
    fb.core.util.validation.validateEventType('Query.off', 1, opt_eventType, true);
    fb.util.validation.validateCallback('Query.off', 2, opt_callback, true);
    fb.util.validation.validateContextObject('Query.off', 3, opt_context, true);

    var container = null;
    var callbacks = null;
    if (opt_eventType === 'value') {
      var valueCallback = /** @type {function(!fb.api.DataSnapshot)} */ (opt_callback) || null;
      container = new fb.core.view.ValueEventRegistration(valueCallback, null, opt_context || null);
    } else if (opt_eventType) {
      if (opt_callback) {
        callbacks = {};
        callbacks[opt_eventType] = opt_callback;
      }
      container = new fb.core.view.ChildEventRegistration(callbacks, null, opt_context || null);
    }
    this.repo.removeEventCallbackForQuery(this, container);
  },

  /**
   * Attaches a listener, waits for the first event, and then removes the listener
   * @param {!string} eventType
   * @param {!function(!fb.api.DataSnapshot, string=)} userCallback
   * @return {!firebase.Promise}
   */
  once: function(eventType, userCallback) {
    fb.util.validation.validateArgCount('Query.once', 1, 4, arguments.length);
    fb.core.util.validation.validateEventType('Query.once', 1, eventType, false);
    fb.util.validation.validateCallback('Query.once', 2, userCallback, true);

    var ret = this.getCancelAndContextArgs_('Query.once', arguments[2], arguments[3]);

    // TODO: Implement this more efficiently (in particular, use 'get' wire protocol for 'value' event)
    // TODO: consider actually wiring the callbacks into the promise. We cannot do this without a breaking change
    // because the API currently expects callbacks will be called synchronously if the data is cached, but this is
    // against the Promise specification.
    var self = this, firstCall = true;
    var deferred = new fb.util.promise.Deferred();
    fb.util.promise.attachDummyErrorHandler(deferred.promise);

    var onceCallback = function(snapshot) {
      // NOTE: Even though we unsubscribe, we may get called multiple times if a single action (e.g. set() with JSON)
      // triggers multiple events (e.g. child_added or child_changed).
      if (firstCall) {
        firstCall = false;
        self.off(eventType, onceCallback);

        if (userCallback) {
          goog.bind(userCallback, ret.context)(snapshot);
        }
        deferred.resolve(snapshot);
      }
    };

    this.on(eventType, onceCallback, /*cancel=*/ function(err) {
      self.off(eventType, onceCallback);

      if (ret.cancel)
        goog.bind(ret.cancel, ret.context)(err);
      deferred.reject(err);
    });
    return deferred.promise;
  },

  /**
   * Set a limit and anchor it to the start of the window.
   * @param {!number} limit
   * @return {!fb.api.Query}
   */
  limitToFirst: function(limit) {
    fb.util.validation.validateArgCount('Query.limitToFirst', 1, 1, arguments.length);
    if (!goog.isNumber(limit) || Math.floor(limit) !== limit || limit <= 0) {
      throw new Error('Query.limitToFirst: First argument must be a positive integer.');
    }
    if (this.queryParams_.hasLimit()) {
      throw new Error('Query.limitToFirst: Limit was already set (by another call to limit, ' +
          'limitToFirst, or limitToLast).');
    }

    return new fb.api.Query(this.repo, this.path, this.queryParams_.limitToFirst(limit), this.orderByCalled_);
  },

  /**
   * Set a limit and anchor it to the end of the window.
   * @param {!number} limit
   * @return {!fb.api.Query}
   */
  limitToLast: function(limit) {
    fb.util.validation.validateArgCount('Query.limitToLast', 1, 1, arguments.length);
    if (!goog.isNumber(limit) || Math.floor(limit) !== limit || limit <= 0) {
      throw new Error('Query.limitToLast: First argument must be a positive integer.');
    }
    if (this.queryParams_.hasLimit()) {
      throw new Error('Query.limitToLast: Limit was already set (by another call to limit, ' +
          'limitToFirst, or limitToLast).');
    }

    return new fb.api.Query(this.repo, this.path, this.queryParams_.limitToLast(limit),
                            this.orderByCalled_);
  },

  /**
   * Given a child path, return a new query ordered by the specified grandchild path.
   * @param {!string} path
   * @return {!fb.api.Query}
   */
  orderByChild: function(path) {
    fb.util.validation.validateArgCount('Query.orderByChild', 1, 1, arguments.length);
    if (path === '$key') {
      throw new Error('Query.orderByChild: "$key" is invalid.  Use Query.orderByKey() instead.');
    } else if (path === '$priority') {
      throw new Error('Query.orderByChild: "$priority" is invalid.  Use Query.orderByPriority() instead.');
    } else if (path === '$value') {
      throw new Error('Query.orderByChild: "$value" is invalid.  Use Query.orderByValue() instead.');
    }
    fb.core.util.validation.validatePathString('Query.orderByChild', 1, path, false);
    this.validateNoPreviousOrderByCall_('Query.orderByChild');
    var parsedPath = new fb.core.util.Path(path);
    if (parsedPath.isEmpty()) {
      throw new Error('Query.orderByChild: cannot pass in empty path.  Use Query.orderByValue() instead.');
    }
    var index = new fb.core.snap.PathIndex(parsedPath);
    var newParams = this.queryParams_.orderBy(index);
    this.validateQueryEndpoints_(newParams);

    return new fb.api.Query(this.repo, this.path, newParams, /*orderByCalled=*/true);
  },

  /**
   * Return a new query ordered by the KeyIndex
   * @return {!fb.api.Query}
   */
  orderByKey: function() {
    fb.util.validation.validateArgCount('Query.orderByKey', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByKey');
    var newParams = this.queryParams_.orderBy(fb.core.snap.KeyIndex);
    this.validateQueryEndpoints_(newParams);
    return new fb.api.Query(this.repo, this.path, newParams, /*orderByCalled=*/true);
  },

  /**
   * Return a new query ordered by the PriorityIndex
   * @return {!fb.api.Query}
   */
  orderByPriority: function() {
    fb.util.validation.validateArgCount('Query.orderByPriority', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByPriority');
    var newParams = this.queryParams_.orderBy(fb.core.snap.PriorityIndex);
    this.validateQueryEndpoints_(newParams);
    return new fb.api.Query(this.repo, this.path, newParams, /*orderByCalled=*/true);
  },

  /**
   * Return a new query ordered by the ValueIndex
   * @return {!fb.api.Query}
   */
  orderByValue: function() {
    fb.util.validation.validateArgCount('Query.orderByValue', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByValue');
    var newParams = this.queryParams_.orderBy(fb.core.snap.ValueIndex);
    this.validateQueryEndpoints_(newParams);
    return new fb.api.Query(this.repo, this.path, newParams, /*orderByCalled=*/true);
  },

  /**
   * @param {number|string|boolean|null} value
   * @param {?string=} opt_name
   * @return {!fb.api.Query}
   */
  startAt: function(value, opt_name) {
    fb.util.validation.validateArgCount('Query.startAt', 0, 2, arguments.length);
    fb.core.util.validation.validateFirebaseDataArg('Query.startAt', 1, value, this.path, true);
    fb.core.util.validation.validateKey('Query.startAt', 2, opt_name, true);

    var newParams = this.queryParams_.startAt(value, opt_name);
    this.validateLimit_(newParams);
    this.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasStart()) {
      throw new Error('Query.startAt: Starting point was already set (by another call to startAt ' +
          'or equalTo).');
    }

    // Calling with no params tells us to start at the beginning.
    if (!goog.isDef(value)) {
      value = null;
      opt_name = null;
    }
    return new fb.api.Query(this.repo, this.path, newParams, this.orderByCalled_);
  },

  /**
   * @param {number|string|boolean|null} value
   * @param {?string=} opt_name
   * @return {!fb.api.Query}
   */
  endAt: function(value, opt_name) {
    fb.util.validation.validateArgCount('Query.endAt', 0, 2, arguments.length);
    fb.core.util.validation.validateFirebaseDataArg('Query.endAt', 1, value, this.path, true);
    fb.core.util.validation.validateKey('Query.endAt', 2, opt_name, true);

    var newParams = this.queryParams_.endAt(value, opt_name);
    this.validateLimit_(newParams);
    this.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasEnd()) {
      throw new Error('Query.endAt: Ending point was already set (by another call to endAt or ' +
          'equalTo).');
    }

    return new fb.api.Query(this.repo, this.path, newParams, this.orderByCalled_);
  },

  /**
   * Load the selection of children with exactly the specified value, and, optionally,
   * the specified name.
   * @param {number|string|boolean|null} value
   * @param {string=} opt_name
   * @return {!fb.api.Query}
   */
  equalTo: function(value, opt_name) {
    fb.util.validation.validateArgCount('Query.equalTo', 1, 2, arguments.length);
    fb.core.util.validation.validateFirebaseDataArg('Query.equalTo', 1, value, this.path, false);
    fb.core.util.validation.validateKey('Query.equalTo', 2, opt_name, true);
    if (this.queryParams_.hasStart()) {
      throw new Error('Query.equalTo: Starting point was already set (by another call to startAt or ' +
          'equalTo).');
    }
    if (this.queryParams_.hasEnd()) {
      throw new Error('Query.equalTo: Ending point was already set (by another call to endAt or ' +
          'equalTo).');
    }
    return this.startAt(value, opt_name).endAt(value, opt_name);
  },

  /**
   * @return {!string} URL for this location.
   */
  toString: function() {
    fb.util.validation.validateArgCount('Query.toString', 0, 0, arguments.length);

    return this.repo.toString() + this.path.toUrlEncodedString();
  },

  // Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
  // for end-users.
  toJSON: function() {
    // An optional spacer argument is unnecessary for a string.
    fb.util.validation.validateArgCount('Query.toJSON', 0, 1, arguments.length);
    return this.toString();
  },

  /**
   * An object representation of the query parameters used by this Query.
   * @return {!Object}
   */
  queryObject: function() {
    return this.queryParams_.getQueryObject();
  },

  /**
   * @return {!string}
   */
  queryIdentifier: function() {
    var obj = this.queryObject();
    var id = fb.core.util.ObjectToUniqueKey(obj);
    return (id === '{}') ? 'default' : id;
  },

  /**
   * Return true if this query and the provided query are equivalent; otherwise, return false.
   * @param {fb.api.Query} other
   * @return {boolean}
   */
  isEqual: function(other) {
    fb.util.validation.validateArgCount('Query.isEqual', 1, 1, arguments.length);
    if (!(other instanceof fb.api.Query)) {
      var error = 'Query.isEqual failed: First argument must be an instance of firebase.database.Query.';
      throw new Error(error);
    }

    var sameRepo = (this.repo === other.repo);
    var samePath = this.path.equals(other.path);
    var sameQueryIdentifier = (this.queryIdentifier() === other.queryIdentifier());

    return (sameRepo && samePath && sameQueryIdentifier);
  },

  /**
   * Helper used by .on and .once to extract the context and or cancel arguments.
   * @param {!string} fnName The function name (on or once)
   * @param {(function(Error)|Object)=} opt_cancelOrContext
   * @param {Object=} opt_context
   * @return {{cancel: ?function(Error), context: ?Object}}
   * @private
   */
  getCancelAndContextArgs_: function(fnName, opt_cancelOrContext, opt_context) {
    var ret = {cancel: null, context: null};
    if (opt_cancelOrContext && opt_context) {
      ret.cancel = /** @type {function(Error)} */ (opt_cancelOrContext);
      fb.util.validation.validateCallback(fnName, 3, ret.cancel, true);

      ret.context = opt_context;
      fb.util.validation.validateContextObject(fnName, 4, ret.context, true);
    } else if (opt_cancelOrContext) { // we have either a cancel callback or a context.
      if (typeof opt_cancelOrContext === 'object' && opt_cancelOrContext !== null) { // it's a context!
        ret.context = opt_cancelOrContext;
      } else if (typeof opt_cancelOrContext === 'function') {
        ret.cancel = opt_cancelOrContext;
      } else {
        throw new Error(fb.util.validation.errorPrefix(fnName, 3, true) +
                        ' must either be a cancel callback or a context object.');
      }
    }
    return ret;
  }
}); // end fb.api.Query

goog.exportProperty(fb.api.Query.prototype, 'on', fb.api.Query.prototype.on);
// If we want to distinguish between value event listeners and child event listeners, like in the Java client, we can
// consider exporting this. If we do, add argument validation. Otherwise, arguments are validated in the public-facing
// portions of the API.
//goog.exportProperty(fb.api.Query.prototype, 'onValueEvent', fb.api.Query.prototype.onValueEvent);
// Note: as with the above onValueEvent method, we may wish to expose this at some point.
goog.exportProperty(fb.api.Query.prototype, 'off', fb.api.Query.prototype.off);
goog.exportProperty(fb.api.Query.prototype, 'once', fb.api.Query.prototype.once);
goog.exportProperty(fb.api.Query.prototype, 'limitToFirst', fb.api.Query.prototype.limitToFirst);
goog.exportProperty(fb.api.Query.prototype, 'limitToLast', fb.api.Query.prototype.limitToLast);
goog.exportProperty(fb.api.Query.prototype, 'orderByChild', fb.api.Query.prototype.orderByChild);
goog.exportProperty(fb.api.Query.prototype, 'orderByKey', fb.api.Query.prototype.orderByKey);
goog.exportProperty(fb.api.Query.prototype, 'orderByPriority', fb.api.Query.prototype.orderByPriority);
goog.exportProperty(fb.api.Query.prototype, 'orderByValue', fb.api.Query.prototype.orderByValue);
goog.exportProperty(fb.api.Query.prototype, 'startAt', fb.api.Query.prototype.startAt);
goog.exportProperty(fb.api.Query.prototype, 'endAt', fb.api.Query.prototype.endAt);
goog.exportProperty(fb.api.Query.prototype, 'equalTo', fb.api.Query.prototype.equalTo);
goog.exportProperty(fb.api.Query.prototype, 'toString', fb.api.Query.prototype.toString);
goog.exportProperty(fb.api.Query.prototype, 'isEqual', fb.api.Query.prototype.isEqual);

// Internal code should NOT use these exported properties - because when they are
// minified, they will refernce the minified name.  We could fix this by including
// our our externs file for all our exposed symbols.
fb.core.util.exportPropGetter(fb.api.Query.prototype, 'ref', fb.api.Query.prototype.getRef);
