import { assert } from '../../utils/assert';
import { KEY_INDEX } from "../core/snap/indexes/KeyIndex";
import { PRIORITY_INDEX } from "../core/snap/indexes/PriorityIndex";
import { VALUE_INDEX } from "../core/snap/indexes/ValueIndex";
import { PathIndex } from "../core/snap/indexes/PathIndex";
import { MIN_NAME,MAX_NAME,ObjectToUniqueKey } from "../core/util/util";
import { Path } from "../core/util/Path";
import { 
  isValidPriority, 
  validateEventType, 
  validatePathString,
  validateFirebaseDataArg,
  validateKey,
} from "../core/util/validation";
import { errorPrefix, validateArgCount, validateCallback, validateContextObject } from "../../utils/validation";
import { ValueEventRegistration, ChildEventRegistration } from "../core/view/EventRegistration";
import { Deferred, attachDummyErrorHandler } from "../../utils/promise";
import { Reference } from "./Reference";
import { Repo } from "../core/Repo";
import { QueryParams } from "../core/view/QueryParams";

/**
 * A Query represents a filter to be applied to a firebase location.  This object purely represents the
 * query expression (and exposes our public API to build the query).  The actual query logic is in ViewBase.js.
 *
 * Since every Firebase reference is a query, Firebase inherits from this object.
 */
export class Query {

  constructor(public repo: Repo, public path: Path, private queryParams_: QueryParams, private orderByCalled_: boolean) {}

  /**
   * Validates start/end values for queries.
   * @param {!QueryParams} params
   * @private
   */
  validateQueryEndpoints_(params) {
    var startNode = null;
    var endNode = null;
    if (params.hasStart()) {
      startNode = params.getIndexStartValue();
    }
    if (params.hasEnd()) {
      endNode = params.getIndexEndValue();
    }

    if (params.getIndex() === KEY_INDEX) {
      var tooManyArgsError = 'Query: When ordering by key, you may only pass one argument to ' +
          'startAt(), endAt(), or equalTo().';
      var wrongArgTypeError = 'Query: When ordering by key, the argument passed to startAt(), endAt(),' +
          'or equalTo() must be a string.';
      if (params.hasStart()) {
        var startName = params.getIndexStartName();
        if (startName != MIN_NAME) {
          throw new Error(tooManyArgsError);
        } else if (typeof(startNode) !== 'string') {
          throw new Error(wrongArgTypeError);
        }
      }
      if (params.hasEnd()) {
        var endName = params.getIndexEndName();
        if (endName != MAX_NAME) {
          throw new Error(tooManyArgsError);
        } else if (typeof(endNode) !== 'string') {
          throw new Error(wrongArgTypeError);
        }
      }
    }
    else if (params.getIndex() === PRIORITY_INDEX) {
      if ((startNode != null && !isValidPriority(startNode)) ||
          (endNode != null && !isValidPriority(endNode))) {
        throw new Error('Query: When ordering by priority, the first argument passed to startAt(), ' +
            'endAt(), or equalTo() must be a valid priority value (null, a number, or a string).');
      }
    } else {
      assert((params.getIndex() instanceof PathIndex) ||
                          (params.getIndex() === VALUE_INDEX), 'unknown index type.');
      if ((startNode != null && typeof startNode === 'object') ||
          (endNode != null && typeof endNode === 'object')) {
        throw new Error('Query: First argument passed to startAt(), endAt(), or equalTo() cannot be ' +
            'an object.');
      }
    }
  }

  /**
   * Validates that limit* has been called with the correct combination of parameters
   * @param {!QueryParams} params
   * @private
   */
  validateLimit_(params) {
    if (params.hasStart() && params.hasEnd() && params.hasLimit() && !params.hasAnchoredLimit()) {
      throw new Error(
          "Query: Can't combine startAt(), endAt(), and limit(). Use limitToFirst() or limitToLast() instead."
      );
    }
  }

  /**
   * Validates that no other order by call has been made
   * @param {!string} fnName
   * @private
   */
  validateNoPreviousOrderByCall_(fnName) {
    if (this.orderByCalled_ === true) {
      throw new Error(fnName + ": You can't combine multiple orderBy calls.");
    }
  }

  /**
   * @return {!QueryParams}
   */
  getQueryParams() {
    return this.queryParams_;
  }

  /**
   * @return {!Firebase}
   */
  getRef() {
    validateArgCount('Query.ref', 0, 0, arguments.length);
    // This is a slight hack. We cannot goog.require('fb.api.Firebase'), since Firebase requires fb.api.Query.
    // However, we will always export 'Firebase' to the global namespace, so it's guaranteed to exist by the time this
    // method gets called.
    return new Reference(this.repo, this.path);
  }

  /**
   * @param {!string} eventType
   * @param {!function(DataSnapshot, string=)} callback
   * @param {(function(Error)|Object)=} opt_cancelCallbackOrContext
   * @param {Object=} opt_context
   * @return {!function(DataSnapshot, string=)}
   */
  on(eventType, callback, opt_cancelCallbackOrContext?, opt_context?) {
    validateArgCount('Query.on', 2, 4, arguments.length);
    validateEventType('Query.on', 1, eventType, false);
    validateCallback('Query.on', 2, callback, false);

    var ret = this.getCancelAndContextArgs_('Query.on', opt_cancelCallbackOrContext, opt_context);

    if (eventType === 'value') {
      this.onValueEvent(callback, ret.cancel, ret.context);
    } else {
      var callbacks = {};
      callbacks[eventType] = callback;
      this.onChildEvent(callbacks, ret.cancel, ret.context);
    }
    return callback;
  }

  /**
   * @param {!function(!DataSnapshot)} callback
   * @param {?function(Error)} cancelCallback
   * @param {?Object} context
   * @protected
   */
  onValueEvent(callback, cancelCallback, context) {
    var container = new ValueEventRegistration(callback, cancelCallback || null, context || null);
    this.repo.addEventCallbackForQuery(this, container);
  }

  /**
   * @param {!Object.<string, !function(!DataSnapshot, ?string)>} callbacks
   * @param {?function(Error)} cancelCallback
   * @param {?Object} context
   */
  onChildEvent(callbacks, cancelCallback, context) {
    var container = new ChildEventRegistration(callbacks, cancelCallback, context);
    this.repo.addEventCallbackForQuery(this, container);
  }

  /**
   * @param {string=} opt_eventType
   * @param {(function(!DataSnapshot, ?string=))=} opt_callback
   * @param {Object=} opt_context
   */
  off(opt_eventType?, opt_callback?, opt_context?) {
    validateArgCount('Query.off', 0, 3, arguments.length);
    validateEventType('Query.off', 1, opt_eventType, true);
    validateCallback('Query.off', 2, opt_callback, true);
    validateContextObject('Query.off', 3, opt_context, true);

    var container = null;
    var callbacks = null;
    if (opt_eventType === 'value') {
      var valueCallback = /** @type {function(!DataSnapshot)} */ (opt_callback) || null;
      container = new ValueEventRegistration(valueCallback, null, opt_context || null);
    } else if (opt_eventType) {
      if (opt_callback) {
        callbacks = {};
        callbacks[opt_eventType] = opt_callback;
      }
      container = new ChildEventRegistration(callbacks, null, opt_context || null);
    }
    this.repo.removeEventCallbackForQuery(this, container);
  }

  /**
   * Attaches a listener, waits for the first event, and then removes the listener
   * @param {!string} eventType
   * @param {!function(!DataSnapshot, string=)} userCallback
   * @return {!firebase.Promise}
   */
  once(eventType, userCallback?, cancelOrContext?, context?) {
    validateArgCount('Query.once', 1, 4, arguments.length);
    validateEventType('Query.once', 1, eventType, false);
    validateCallback('Query.once', 2, userCallback, true);

    var ret = this.getCancelAndContextArgs_('Query.once', cancelOrContext, context);

    // TODO: Implement this more efficiently (in particular, use 'get' wire protocol for 'value' event)
    // TODO: consider actually wiring the callbacks into the promise. We cannot do this without a breaking change
    // because the API currently expects callbacks will be called synchronously if the data is cached, but this is
    // against the Promise specification.
    var self = this, firstCall = true;
    var deferred = new Deferred();
    attachDummyErrorHandler(deferred.promise);

    var onceCallback = function(snapshot) {
      // NOTE: Even though we unsubscribe, we may get called multiple times if a single action (e.g. set() with JSON)
      // triggers multiple events (e.g. child_added or child_changed).
      if (firstCall) {
        firstCall = false;
        self.off(eventType, onceCallback);

        if (userCallback) {
          userCallback.bind(ret.context)(snapshot);
        }
        deferred.resolve(snapshot);
      }
    };

    this.on(eventType, onceCallback, /*cancel=*/ function(err) {
      self.off(eventType, onceCallback);

      if (ret.cancel)
        ret.cancel.bind(ret.context)(err);
      deferred.reject(err);
    });
    return deferred.promise;
  }

  /**
   * Set a limit and anchor it to the start of the window.
   * @param {!number} limit
   * @return {!Query}
   */
  limitToFirst(limit): Query {
    validateArgCount('Query.limitToFirst', 1, 1, arguments.length);
    if (typeof limit !== 'number' || Math.floor(limit) !== limit || limit <= 0) {
      throw new Error('Query.limitToFirst: First argument must be a positive integer.');
    }
    if (this.queryParams_.hasLimit()) {
      throw new Error('Query.limitToFirst: Limit was already set (by another call to limit, ' +
          'limitToFirst, or limitToLast).');
    }

    return new Query(this.repo, this.path, this.queryParams_.limitToFirst(limit), this.orderByCalled_);
  }

  /**
   * Set a limit and anchor it to the end of the window.
   * @param {!number} limit
   * @return {!Query}
   */
  limitToLast(limit?): Query {
    validateArgCount('Query.limitToLast', 1, 1, arguments.length);
    if (typeof limit !== 'number' || Math.floor(limit) !== limit || limit <= 0) {
      throw new Error('Query.limitToLast: First argument must be a positive integer.');
    }
    if (this.queryParams_.hasLimit()) {
      throw new Error('Query.limitToLast: Limit was already set (by another call to limit, ' +
          'limitToFirst, or limitToLast).');
    }

    return new Query(this.repo, this.path, this.queryParams_.limitToLast(limit),
                            this.orderByCalled_);
  }

  /**
   * Given a child path, return a new query ordered by the specified grandchild path.
   * @param {!string} path
   * @return {!Query}
   */
  orderByChild(path) {
    validateArgCount('Query.orderByChild', 1, 1, arguments.length);
    if (path === '$key') {
      throw new Error('Query.orderByChild: "$key" is invalid.  Use Query.orderByKey() instead.');
    } else if (path === '$priority') {
      throw new Error('Query.orderByChild: "$priority" is invalid.  Use Query.orderByPriority() instead.');
    } else if (path === '$value') {
      throw new Error('Query.orderByChild: "$value" is invalid.  Use Query.orderByValue() instead.');
    }
    validatePathString('Query.orderByChild', 1, path, false);
    this.validateNoPreviousOrderByCall_('Query.orderByChild');
    var parsedPath = new Path(path);
    if (parsedPath.isEmpty()) {
      throw new Error('Query.orderByChild: cannot pass in empty path.  Use Query.orderByValue() instead.');
    }
    var index = new PathIndex(parsedPath);
    var newParams = this.queryParams_.orderBy(index);
    this.validateQueryEndpoints_(newParams);

    return new Query(this.repo, this.path, newParams, /*orderByCalled=*/true);
  }

  /**
   * Return a new query ordered by the KeyIndex
   * @return {!Query}
   */
  orderByKey() {
    validateArgCount('Query.orderByKey', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByKey');
    var newParams = this.queryParams_.orderBy(KEY_INDEX);
    this.validateQueryEndpoints_(newParams);
    return new Query(this.repo, this.path, newParams, /*orderByCalled=*/true);
  }

  /**
   * Return a new query ordered by the PriorityIndex
   * @return {!Query}
   */
  orderByPriority() {
    validateArgCount('Query.orderByPriority', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByPriority');
    var newParams = this.queryParams_.orderBy(PRIORITY_INDEX);
    this.validateQueryEndpoints_(newParams);
    return new Query(this.repo, this.path, newParams, /*orderByCalled=*/true);
  }

  /**
   * Return a new query ordered by the ValueIndex
   * @return {!Query}
   */
  orderByValue() {
    validateArgCount('Query.orderByValue', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByValue');
    var newParams = this.queryParams_.orderBy(VALUE_INDEX);
    this.validateQueryEndpoints_(newParams);
    return new Query(this.repo, this.path, newParams, /*orderByCalled=*/true);
  }

  /**
   * @param {number|string|boolean|null} value
   * @param {?string=} opt_name
   * @return {!Query}
   */
  startAt(value = null, name?) {
    validateArgCount('Query.startAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.startAt', 1, value, this.path, true);
    validateKey('Query.startAt', 2, name, true);

    var newParams = this.queryParams_.startAt(value, name);
    this.validateLimit_(newParams);
    this.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasStart()) {
      throw new Error('Query.startAt: Starting point was already set (by another call to startAt ' +
          'or equalTo).');
    }

    // Calling with no params tells us to start at the beginning.
    if (value == null) {
      value = null;
      name = null;
    }
    return new Query(this.repo, this.path, newParams, this.orderByCalled_);
  }

  /**
   * @param {number|string|boolean|null} value
   * @param {?string=} opt_name
   * @return {!Query}
   */
  endAt(value = null, name?) {
    validateArgCount('Query.endAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.endAt', 1, value, this.path, true);
    validateKey('Query.endAt', 2, name, true);

    var newParams = this.queryParams_.endAt(value, name);
    this.validateLimit_(newParams);
    this.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasEnd()) {
      throw new Error('Query.endAt: Ending point was already set (by another call to endAt or ' +
          'equalTo).');
    }

    return new Query(this.repo, this.path, newParams, this.orderByCalled_);
  }

  /**
   * Load the selection of children with exactly the specified value, and, optionally,
   * the specified name.
   * @param {number|string|boolean|null} value
   * @param {string=} opt_name
   * @return {!Query}
   */
  equalTo(value, name?) {
    validateArgCount('Query.equalTo', 1, 2, arguments.length);
    validateFirebaseDataArg('Query.equalTo', 1, value, this.path, false);
    validateKey('Query.equalTo', 2, name, true);
    if (this.queryParams_.hasStart()) {
      throw new Error('Query.equalTo: Starting point was already set (by another call to startAt or ' +
          'equalTo).');
    }
    if (this.queryParams_.hasEnd()) {
      throw new Error('Query.equalTo: Ending point was already set (by another call to endAt or ' +
          'equalTo).');
    }
    return this.startAt(value, name).endAt(value, name);
  }

  /**
   * @return {!string} URL for this location.
   */
  toString() {
    validateArgCount('Query.toString', 0, 0, arguments.length);

    return this.repo.toString() + this.path.toUrlEncodedString();
  }

  // Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
  // for end-users.
  toJSON() {
    // An optional spacer argument is unnecessary for a string.
    validateArgCount('Query.toJSON', 0, 1, arguments.length);
    return this.toString();
  }

  /**
   * An object representation of the query parameters used by this Query.
   * @return {!Object}
   */
  queryObject() {
    return this.queryParams_.getQueryObject();
  }

  /**
   * @return {!string}
   */
  queryIdentifier() {
    var obj = this.queryObject();
    var id = ObjectToUniqueKey(obj);
    return (id === '{}') ? 'default' : id;
  }

  /**
   * Return true if this query and the provided query are equivalent; otherwise, return false.
   * @param {Query} other
   * @return {boolean}
   */
  isEqual(other?) {
    validateArgCount('Query.isEqual', 1, 1, arguments.length);
    if (!(other instanceof Query)) {
      var error = 'Query.isEqual failed: First argument must be an instance of firebase.database.Query.';
      throw new Error(error);
    }

    var sameRepo = (this.repo === other.repo);
    var samePath = this.path.equals(other.path);
    var sameQueryIdentifier = (this.queryIdentifier() === other.queryIdentifier());

    return (sameRepo && samePath && sameQueryIdentifier);
  }

  /**
   * Helper used by .on and .once to extract the context and or cancel arguments.
   * @param {!string} fnName The function name (on or once)
   * @param {(function(Error)|Object)=} opt_cancelOrContext
   * @param {Object=} opt_context
   * @return {{cancel: ?function(Error), context: ?Object}}
   * @private
   */
  getCancelAndContextArgs_(fnName, opt_cancelOrContext, opt_context) {
    var ret = {cancel: null, context: null};
    if (opt_cancelOrContext && opt_context) {
      ret.cancel = /** @type {function(Error)} */ (opt_cancelOrContext);
      validateCallback(fnName, 3, ret.cancel, true);

      ret.context = opt_context;
      validateContextObject(fnName, 4, ret.context, true);
    } else if (opt_cancelOrContext) { // we have either a cancel callback or a context.
      if (typeof opt_cancelOrContext === 'object' && opt_cancelOrContext !== null) { // it's a context!
        ret.context = opt_cancelOrContext;
      } else if (typeof opt_cancelOrContext === 'function') {
        ret.cancel = opt_cancelOrContext;
      } else {
        throw new Error(errorPrefix(fnName, 3, true) +
                        ' must either be a cancel callback or a context object.');
      }
    }
    return ret;
  }

  get ref() {
    return this.getRef();
  }
}; // end Query