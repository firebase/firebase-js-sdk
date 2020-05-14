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

import {
  assert,
  errorPrefix,
  validateArgCount,
  validateCallback,
  validateContextObject,
  Deferred
} from '@firebase/util';
import { KEY_INDEX } from '../core/snap/indexes/KeyIndex';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { VALUE_INDEX } from '../core/snap/indexes/ValueIndex';
import { PathIndex } from '../core/snap/indexes/PathIndex';
import { MIN_NAME, MAX_NAME, ObjectToUniqueKey } from '../core/util/util';
import { Path } from '../core/util/Path';
import {
  isValidPriority,
  validateEventType,
  validatePathString,
  validateFirebaseDataArg,
  validateKey
} from '../core/util/validation';

import {
  ValueEventRegistration,
  ChildEventRegistration,
  EventRegistration
} from '../core/view/EventRegistration';

import { Repo } from '../core/Repo';
import { QueryParams } from '../core/view/QueryParams';
import { Reference } from './Reference';
import { DataSnapshot } from './DataSnapshot';

let __referenceConstructor: new (repo: Repo, path: Path) => Query;

export interface SnapshotCallback {
  (a: DataSnapshot, b?: string | null): unknown;
}

/**
 * A Query represents a filter to be applied to a firebase location.  This object purely represents the
 * query expression (and exposes our public API to build the query).  The actual query logic is in ViewBase.js.
 *
 * Since every Firebase reference is a query, Firebase inherits from this object.
 */
export class Query {
  static set __referenceConstructor(val) {
    __referenceConstructor = val;
  }

  static get __referenceConstructor() {
    assert(__referenceConstructor, 'Reference.ts has not been loaded');
    return __referenceConstructor;
  }

  constructor(
    public repo: Repo,
    public path: Path,
    private queryParams_: QueryParams,
    private orderByCalled_: boolean
  ) {}

  /**
   * Validates start/end values for queries.
   * @param {!QueryParams} params
   * @private
   */
  private static validateQueryEndpoints_(params: QueryParams) {
    let startNode = null;
    let endNode = null;
    if (params.hasStart()) {
      startNode = params.getIndexStartValue();
    }
    if (params.hasEnd()) {
      endNode = params.getIndexEndValue();
    }

    if (params.getIndex() === KEY_INDEX) {
      const tooManyArgsError =
        'Query: When ordering by key, you may only pass one argument to ' +
        'startAt(), endAt(), or equalTo().';
      const wrongArgTypeError =
        'Query: When ordering by key, the argument passed to startAt(), endAt(),' +
        'or equalTo() must be a string.';
      if (params.hasStart()) {
        const startName = params.getIndexStartName();
        if (startName !== MIN_NAME) {
          throw new Error(tooManyArgsError);
        } else if (typeof startNode !== 'string') {
          throw new Error(wrongArgTypeError);
        }
      }
      if (params.hasEnd()) {
        const endName = params.getIndexEndName();
        if (endName !== MAX_NAME) {
          throw new Error(tooManyArgsError);
        } else if (typeof endNode !== 'string') {
          throw new Error(wrongArgTypeError);
        }
      }
    } else if (params.getIndex() === PRIORITY_INDEX) {
      if (
        (startNode != null && !isValidPriority(startNode)) ||
        (endNode != null && !isValidPriority(endNode))
      ) {
        throw new Error(
          'Query: When ordering by priority, the first argument passed to startAt(), ' +
            'endAt(), or equalTo() must be a valid priority value (null, a number, or a string).'
        );
      }
    } else {
      assert(
        params.getIndex() instanceof PathIndex ||
          params.getIndex() === VALUE_INDEX,
        'unknown index type.'
      );
      if (
        (startNode != null && typeof startNode === 'object') ||
        (endNode != null && typeof endNode === 'object')
      ) {
        throw new Error(
          'Query: First argument passed to startAt(), endAt(), or equalTo() cannot be ' +
            'an object.'
        );
      }
    }
  }

  /**
   * Validates that limit* has been called with the correct combination of parameters
   * @param {!QueryParams} params
   * @private
   */
  private static validateLimit_(params: QueryParams) {
    if (
      params.hasStart() &&
      params.hasEnd() &&
      params.hasLimit() &&
      !params.hasAnchoredLimit()
    ) {
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
  private validateNoPreviousOrderByCall_(fnName: string) {
    if (this.orderByCalled_ === true) {
      throw new Error(fnName + ": You can't combine multiple orderBy calls.");
    }
  }

  /**
   * @return {!QueryParams}
   */
  getQueryParams(): QueryParams {
    return this.queryParams_;
  }

  /**
   * @return {!Reference}
   */
  getRef(): Reference {
    validateArgCount('Query.ref', 0, 0, arguments.length);
    // This is a slight hack. We cannot goog.require('fb.api.Firebase'), since Firebase requires fb.api.Query.
    // However, we will always export 'Firebase' to the global namespace, so it's guaranteed to exist by the time this
    // method gets called.
    return new Query.__referenceConstructor(this.repo, this.path) as Reference;
  }

  /**
   * @param {!string} eventType
   * @param {!function(DataSnapshot, string=)} callback
   * @param {(function(Error)|Object)=} cancelCallbackOrContext
   * @param {Object=} context
   * @return {!function(DataSnapshot, string=)}
   */
  on(
    eventType: string,
    callback: SnapshotCallback,
    cancelCallbackOrContext?: ((a: Error) => unknown) | object | null,
    context?: object | null
  ): SnapshotCallback {
    validateArgCount('Query.on', 2, 4, arguments.length);
    validateEventType('Query.on', 1, eventType, false);
    validateCallback('Query.on', 2, callback, false);

    const ret = Query.getCancelAndContextArgs_(
      'Query.on',
      cancelCallbackOrContext,
      context
    );

    if (eventType === 'value') {
      this.onValueEvent(callback, ret.cancel, ret.context);
    } else {
      const callbacks: { [k: string]: typeof callback } = {};
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
  protected onValueEvent(
    callback: (a: DataSnapshot) => void,
    cancelCallback: ((a: Error) => void) | null,
    context: object | null
  ) {
    const container = new ValueEventRegistration(
      callback,
      cancelCallback || null,
      context || null
    );
    this.repo.addEventCallbackForQuery(this, container);
  }

  /**
   * @param {!Object.<string, !function(!DataSnapshot, ?string)>} callbacks
   * @param {?function(Error)} cancelCallback
   * @param {?Object} context
   * @protected
   */
  onChildEvent(
    callbacks: { [k: string]: SnapshotCallback },
    cancelCallback: ((a: Error) => unknown) | null,
    context: object | null
  ) {
    const container = new ChildEventRegistration(
      callbacks,
      cancelCallback,
      context
    );
    this.repo.addEventCallbackForQuery(this, container);
  }

  /**
   * @param {string=} eventType
   * @param {(function(!DataSnapshot, ?string=))=} callback
   * @param {Object=} context
   */
  off(
    eventType?: string,
    callback?: SnapshotCallback,
    context?: object | null
  ): void {
    validateArgCount('Query.off', 0, 3, arguments.length);
    validateEventType('Query.off', 1, eventType, true);
    validateCallback('Query.off', 2, callback, true);
    validateContextObject('Query.off', 3, context, true);

    let container: EventRegistration | null = null;
    let callbacks: { [k: string]: typeof callback } | null = null;
    if (eventType === 'value') {
      const valueCallback = callback || null;
      container = new ValueEventRegistration(
        valueCallback,
        null,
        context || null
      );
    } else if (eventType) {
      if (callback) {
        callbacks = {};
        callbacks[eventType] = callback;
      }
      container = new ChildEventRegistration(callbacks, null, context || null);
    }
    this.repo.removeEventCallbackForQuery(this, container);
  }

  /**
   * Attaches a listener, waits for the first event, and then removes the listener
   * @param {!string} eventType
   * @param {!function(!DataSnapshot, string=)} userCallback
   * @param failureCallbackOrContext
   * @param context
   * @return {!firebase.Promise}
   */
  once(
    eventType: string,
    userCallback?: SnapshotCallback,
    failureCallbackOrContext?: ((a: Error) => void) | object | null,
    context?: object | null
  ): Promise<DataSnapshot> {
    validateArgCount('Query.once', 1, 4, arguments.length);
    validateEventType('Query.once', 1, eventType, false);
    validateCallback('Query.once', 2, userCallback, true);

    const ret = Query.getCancelAndContextArgs_(
      'Query.once',
      failureCallbackOrContext,
      context
    );

    // TODO: Implement this more efficiently (in particular, use 'get' wire protocol for 'value' event)
    // TODO: consider actually wiring the callbacks into the promise. We cannot do this without a breaking change
    // because the API currently expects callbacks will be called synchronously if the data is cached, but this is
    // against the Promise specification.
    let firstCall = true;
    const deferred = new Deferred<DataSnapshot>();

    // A dummy error handler in case a user wasn't expecting promises
    deferred.promise.catch(() => {});

    const onceCallback = (snapshot: DataSnapshot) => {
      // NOTE: Even though we unsubscribe, we may get called multiple times if a single action (e.g. set() with JSON)
      // triggers multiple events (e.g. child_added or child_changed).
      if (firstCall) {
        firstCall = false;
        this.off(eventType, onceCallback);

        if (userCallback) {
          userCallback.bind(ret.context)(snapshot);
        }
        deferred.resolve(snapshot);
      }
    };

    this.on(
      eventType,
      onceCallback,
      /*cancel=*/ err => {
        this.off(eventType, onceCallback);

        if (ret.cancel) {
          ret.cancel.bind(ret.context)(err);
        }
        deferred.reject(err);
      }
    );
    return deferred.promise;
  }

  /**
   * Set a limit and anchor it to the start of the window.
   * @param {!number} limit
   * @return {!Query}
   */
  limitToFirst(limit: number): Query {
    validateArgCount('Query.limitToFirst', 1, 1, arguments.length);
    if (
      typeof limit !== 'number' ||
      Math.floor(limit) !== limit ||
      limit <= 0
    ) {
      throw new Error(
        'Query.limitToFirst: First argument must be a positive integer.'
      );
    }
    if (this.queryParams_.hasLimit()) {
      throw new Error(
        'Query.limitToFirst: Limit was already set (by another call to limit, ' +
          'limitToFirst, or limitToLast).'
      );
    }

    return new Query(
      this.repo,
      this.path,
      this.queryParams_.limitToFirst(limit),
      this.orderByCalled_
    );
  }

  /**
   * Set a limit and anchor it to the end of the window.
   * @param {!number} limit
   * @return {!Query}
   */
  limitToLast(limit: number): Query {
    validateArgCount('Query.limitToLast', 1, 1, arguments.length);
    if (
      typeof limit !== 'number' ||
      Math.floor(limit) !== limit ||
      limit <= 0
    ) {
      throw new Error(
        'Query.limitToLast: First argument must be a positive integer.'
      );
    }
    if (this.queryParams_.hasLimit()) {
      throw new Error(
        'Query.limitToLast: Limit was already set (by another call to limit, ' +
          'limitToFirst, or limitToLast).'
      );
    }

    return new Query(
      this.repo,
      this.path,
      this.queryParams_.limitToLast(limit),
      this.orderByCalled_
    );
  }

  /**
   * Given a child path, return a new query ordered by the specified grandchild path.
   * @param {!string} path
   * @return {!Query}
   */
  orderByChild(path: string): Query {
    validateArgCount('Query.orderByChild', 1, 1, arguments.length);
    if (path === '$key') {
      throw new Error(
        'Query.orderByChild: "$key" is invalid.  Use Query.orderByKey() instead.'
      );
    } else if (path === '$priority') {
      throw new Error(
        'Query.orderByChild: "$priority" is invalid.  Use Query.orderByPriority() instead.'
      );
    } else if (path === '$value') {
      throw new Error(
        'Query.orderByChild: "$value" is invalid.  Use Query.orderByValue() instead.'
      );
    }
    validatePathString('Query.orderByChild', 1, path, false);
    this.validateNoPreviousOrderByCall_('Query.orderByChild');
    const parsedPath = new Path(path);
    if (parsedPath.isEmpty()) {
      throw new Error(
        'Query.orderByChild: cannot pass in empty path.  Use Query.orderByValue() instead.'
      );
    }
    const index = new PathIndex(parsedPath);
    const newParams = this.queryParams_.orderBy(index);
    Query.validateQueryEndpoints_(newParams);

    return new Query(this.repo, this.path, newParams, /*orderByCalled=*/ true);
  }

  /**
   * Return a new query ordered by the KeyIndex
   * @return {!Query}
   */
  orderByKey(): Query {
    validateArgCount('Query.orderByKey', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByKey');
    const newParams = this.queryParams_.orderBy(KEY_INDEX);
    Query.validateQueryEndpoints_(newParams);
    return new Query(this.repo, this.path, newParams, /*orderByCalled=*/ true);
  }

  /**
   * Return a new query ordered by the PriorityIndex
   * @return {!Query}
   */
  orderByPriority(): Query {
    validateArgCount('Query.orderByPriority', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByPriority');
    const newParams = this.queryParams_.orderBy(PRIORITY_INDEX);
    Query.validateQueryEndpoints_(newParams);
    return new Query(this.repo, this.path, newParams, /*orderByCalled=*/ true);
  }

  /**
   * Return a new query ordered by the ValueIndex
   * @return {!Query}
   */
  orderByValue(): Query {
    validateArgCount('Query.orderByValue', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByValue');
    const newParams = this.queryParams_.orderBy(VALUE_INDEX);
    Query.validateQueryEndpoints_(newParams);
    return new Query(this.repo, this.path, newParams, /*orderByCalled=*/ true);
  }

  /**
   * @param {number|string|boolean|null} value
   * @param {?string=} name
   * @return {!Query}
   */
  startAt(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.startAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.startAt', 1, value, this.path, true);
    validateKey('Query.startAt', 2, name, true);

    const newParams = this.queryParams_.startAt(value, name);
    Query.validateLimit_(newParams);
    Query.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasStart()) {
      throw new Error(
        'Query.startAt: Starting point was already set (by another call to startAt ' +
          'or equalTo).'
      );
    }

    // Calling with no params tells us to start at the beginning.
    if (value === undefined) {
      value = null;
      name = null;
    }
    return new Query(this.repo, this.path, newParams, this.orderByCalled_);
  }

  /**
   * @param {number|string|boolean|null} value
   * @param {?string=} name
   * @return {!Query}
   */
  endAt(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.endAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.endAt', 1, value, this.path, true);
    validateKey('Query.endAt', 2, name, true);

    const newParams = this.queryParams_.endAt(value, name);
    Query.validateLimit_(newParams);
    Query.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasEnd()) {
      throw new Error(
        'Query.endAt: Ending point was already set (by another call to endAt or ' +
          'equalTo).'
      );
    }

    return new Query(this.repo, this.path, newParams, this.orderByCalled_);
  }

  /**
   * Load the selection of children with exactly the specified value, and, optionally,
   * the specified name.
   * @param {number|string|boolean|null} value
   * @param {string=} name
   * @return {!Query}
   */
  equalTo(value: number | string | boolean | null, name?: string) {
    validateArgCount('Query.equalTo', 1, 2, arguments.length);
    validateFirebaseDataArg('Query.equalTo', 1, value, this.path, false);
    validateKey('Query.equalTo', 2, name, true);
    if (this.queryParams_.hasStart()) {
      throw new Error(
        'Query.equalTo: Starting point was already set (by another call to startAt or ' +
          'equalTo).'
      );
    }
    if (this.queryParams_.hasEnd()) {
      throw new Error(
        'Query.equalTo: Ending point was already set (by another call to endAt or ' +
          'equalTo).'
      );
    }
    return this.startAt(value, name).endAt(value, name);
  }

  /**
   * @return {!string} URL for this location.
   */
  toString(): string {
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
  queryObject(): object {
    return this.queryParams_.getQueryObject();
  }

  /**
   * @return {!string}
   */
  queryIdentifier(): string {
    const obj = this.queryObject();
    const id = ObjectToUniqueKey(obj);
    return id === '{}' ? 'default' : id;
  }

  /**
   * Return true if this query and the provided query are equivalent; otherwise, return false.
   * @param {Query} other
   * @return {boolean}
   */
  isEqual(other: Query): boolean {
    validateArgCount('Query.isEqual', 1, 1, arguments.length);
    if (!(other instanceof Query)) {
      const error =
        'Query.isEqual failed: First argument must be an instance of firebase.database.Query.';
      throw new Error(error);
    }

    const sameRepo = this.repo === other.repo;
    const samePath = this.path.equals(other.path);
    const sameQueryIdentifier =
      this.queryIdentifier() === other.queryIdentifier();

    return sameRepo && samePath && sameQueryIdentifier;
  }

  /**
   * Helper used by .on and .once to extract the context and or cancel arguments.
   * @param {!string} fnName The function name (on or once)
   * @param {(function(Error)|Object)=} cancelOrContext
   * @param {Object=} context
   * @return {{cancel: ?function(Error), context: ?Object}}
   * @private
   */
  private static getCancelAndContextArgs_(
    fnName: string,
    cancelOrContext?: ((a: Error) => void) | object | null,
    context?: object | null
  ): { cancel: ((a: Error) => void) | null; context: object | null } {
    const ret: {
      cancel: ((a: Error) => void) | null;
      context: object | null;
    } = { cancel: null, context: null };
    if (cancelOrContext && context) {
      ret.cancel = cancelOrContext as (a: Error) => void;
      validateCallback(fnName, 3, ret.cancel, true);

      ret.context = context;
      validateContextObject(fnName, 4, ret.context, true);
    } else if (cancelOrContext) {
      // we have either a cancel callback or a context.
      if (typeof cancelOrContext === 'object' && cancelOrContext !== null) {
        // it's a context!
        ret.context = cancelOrContext;
      } else if (typeof cancelOrContext === 'function') {
        ret.cancel = cancelOrContext as (a: Error) => void;
      } else {
        throw new Error(
          errorPrefix(fnName, 3, true) +
            ' must either be a cancel callback or a context object.'
        );
      }
    }
    return ret;
  }

  get ref(): Reference {
    return this.getRef();
  }
}
