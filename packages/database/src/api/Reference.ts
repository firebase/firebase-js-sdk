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
  Deferred,
  validateArgCount,
  validateCallback,
  contains,
  validateContextObject,
  errorPrefix,
  assert,
  Compat
} from '@firebase/util';

import {
  Repo,
  repoAddEventCallbackForQuery,
  repoGetValue,
  repoRemoveEventCallbackForQuery,
  repoServerTime,
  repoSetWithPriority,
  repoStartTransaction,
  repoUpdate
} from '../core/Repo';
import { KEY_INDEX } from '../core/snap/indexes/KeyIndex';
import { PathIndex } from '../core/snap/indexes/PathIndex';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { VALUE_INDEX } from '../core/snap/indexes/ValueIndex';
import { Node } from '../core/snap/Node';
import { syncPointSetReferenceConstructor } from '../core/SyncPoint';
import { nextPushId } from '../core/util/NextPushId';
import {
  Path,
  pathChild,
  pathEquals,
  pathGetBack,
  pathGetFront,
  pathIsEmpty,
  pathParent,
  pathToUrlEncodedString
} from '../core/util/Path';
import { MAX_NAME, MIN_NAME, ObjectToUniqueKey, warn } from '../core/util/util';
import {
  isValidPriority,
  validateBoolean,
  validateEventType,
  validateFirebaseDataArg,
  validateFirebaseMergeDataArg,
  validateKey,
  validatePathString,
  validatePriority,
  validateRootPathString,
  validateWritablePath
} from '../core/util/validation';
import { Change } from '../core/view/Change';
import { CancelEvent, DataEvent, Event, EventType } from '../core/view/Event';
import {
  QueryParams,
  queryParamsEndAt,
  queryParamsEndBefore,
  queryParamsGetQueryObject,
  queryParamsLimitToFirst,
  queryParamsLimitToLast,
  queryParamsOrderBy,
  queryParamsStartAfter,
  queryParamsStartAt
} from '../core/view/QueryParams';
import { DataSnapshot as ExpDataSnapshot } from '../exp/DataSnapshot';
import { Reference as ExpReference } from '../exp/Reference';

import { Database } from './Database';
import { OnDisconnect } from './onDisconnect';
import { TransactionResult } from './TransactionResult';

export interface ReferenceConstructor {
  new (database: Database, path: Path): Reference;
}

/**
 * Class representing a firebase data snapshot.  It wraps a SnapshotNode and
 * surfaces the public methods (val, forEach, etc.) we want to expose.
 */
export class DataSnapshot implements Compat<ExpDataSnapshot> {
  constructor(
    readonly _database: Database,
    readonly _delegate: ExpDataSnapshot
  ) {}

  /**
   * Retrieves the snapshot contents as JSON.  Returns null if the snapshot is
   * empty.
   *
   * @return JSON representation of the DataSnapshot contents, or null if empty.
   */
  val(): unknown {
    validateArgCount('DataSnapshot.val', 0, 0, arguments.length);
    return this._delegate.val();
  }

  /**
   * Returns the snapshot contents as JSON, including priorities of node.  Suitable for exporting
   * the entire node contents.
   * @return JSON representation of the DataSnapshot contents, or null if empty.
   */
  exportVal(): unknown {
    validateArgCount('DataSnapshot.exportVal', 0, 0, arguments.length);
    return this._delegate.exportVal();
  }

  // Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
  // for end-users
  toJSON(): unknown {
    // Optional spacer argument is unnecessary because we're depending on recursion rather than stringifying the content
    validateArgCount('DataSnapshot.toJSON', 0, 1, arguments.length);
    return this._delegate.toJSON();
  }

  /**
   * Returns whether the snapshot contains a non-null value.
   *
   * @return Whether the snapshot contains a non-null value, or is empty.
   */
  exists(): boolean {
    validateArgCount('DataSnapshot.exists', 0, 0, arguments.length);
    return this._delegate.exists();
  }

  /**
   * Returns a DataSnapshot of the specified child node's contents.
   *
   * @param childPathString Path to a child.
   * @return DataSnapshot for child node.
   */
  child(childPathString: string): DataSnapshot {
    validateArgCount('DataSnapshot.child', 0, 1, arguments.length);
    // Ensure the childPath is a string (can be a number)
    childPathString = String(childPathString);
    validatePathString('DataSnapshot.child', 1, childPathString, false);
    return new DataSnapshot(
      this._database,
      this._delegate.child(childPathString)
    );
  }

  /**
   * Returns whether the snapshot contains a child at the specified path.
   *
   * @param childPathString Path to a child.
   * @return Whether the child exists.
   */
  hasChild(childPathString: string): boolean {
    validateArgCount('DataSnapshot.hasChild', 1, 1, arguments.length);
    validatePathString('DataSnapshot.hasChild', 1, childPathString, false);
    return this._delegate.hasChild(childPathString);
  }

  /**
   * Returns the priority of the object, or null if no priority was set.
   *
   * @return The priority.
   */
  getPriority(): string | number | null {
    validateArgCount('DataSnapshot.getPriority', 0, 0, arguments.length);
    return this._delegate.priority;
  }

  /**
   * Iterates through child nodes and calls the specified action for each one.
   *
   * @param action Callback function to be called
   * for each child.
   * @return True if forEach was canceled by action returning true for
   * one of the child nodes.
   */
  forEach(action: (snapshot: DataSnapshot) => boolean | void): boolean {
    validateArgCount('DataSnapshot.forEach', 1, 1, arguments.length);
    validateCallback('DataSnapshot.forEach', 1, action, false);
    return this._delegate.forEach(expDataSnapshot =>
      action(new DataSnapshot(this._database, expDataSnapshot))
    );
  }

  /**
   * Returns whether this DataSnapshot has children.
   * @return True if the DataSnapshot contains 1 or more child nodes.
   */
  hasChildren(): boolean {
    validateArgCount('DataSnapshot.hasChildren', 0, 0, arguments.length);
    return this._delegate.hasChildren();
  }

  get key() {
    return this._delegate.key;
  }

  /**
   * Returns the number of children for this DataSnapshot.
   * @return The number of children that this DataSnapshot contains.
   */
  numChildren(): number {
    validateArgCount('DataSnapshot.numChildren', 0, 0, arguments.length);
    return this._delegate.size;
  }

  /**
   * @return The Firebase reference for the location this snapshot's data came
   * from.
   */
  getRef(): Reference {
    validateArgCount('DataSnapshot.ref', 0, 0, arguments.length);
    return new Reference(this._database, this._delegate.ref._path);
  }

  get ref(): Reference {
    return this.getRef();
  }
}

export interface SnapshotCallback {
  (dataSnapshot: DataSnapshot, previousChildName?: string | null): unknown;
}

/**
 * A wrapper class that converts events from the database@exp SDK to the legacy
 * Database SDK. Events are not converted directly as event registration relies
 * on reference comparison of the original user callback (see `matches()`).
 */
export class ExpSnapshotCallback {
  constructor(
    private readonly _database: Database,
    private readonly _userCallback: SnapshotCallback
  ) {}

  callback(
    thisArg: unknown,
    expDataSnapshot: ExpDataSnapshot,
    previousChildName?: string | null
  ): unknown {
    return this._userCallback.call(
      thisArg,
      new DataSnapshot(this._database, expDataSnapshot),
      previousChildName
    );
  }

  matches(exp: ExpSnapshotCallback): boolean {
    return this._userCallback === exp._userCallback;
  }
}

/**
 * An EventRegistration is basically an event type ('value', 'child_added', etc.) and a callback
 * to be notified of that type of event.
 *
 * That said, it can also contain a cancel callback to be notified if the event is canceled.  And
 * currently, this code is organized around the idea that you would register multiple child_ callbacks
 * together, as a single EventRegistration.  Though currently we don't do that.
 */
export interface EventRegistration {
  /**
   * True if this container has a callback to trigger for this event type
   */
  respondsTo(eventType: string): boolean;

  createEvent(change: Change, query: Query): Event;

  /**
   * Given event data, return a function to trigger the user's callback
   */
  getEventRunner(eventData: Event): () => void;

  createCancelEvent(error: Error, path: Path): CancelEvent | null;

  matches(other: EventRegistration): boolean;

  /**
   * False basically means this is a "dummy" callback container being used as a sentinel
   * to remove all callback containers of a particular type.  (e.g. if the user does
   * ref.off('value') without specifying a specific callback).
   *
   * (TODO: Rework this, since it's hacky)
   *
   */
  hasAnyCallback(): boolean;
}

/**
 * Represents registration for 'value' events.
 */
export class ValueEventRegistration implements EventRegistration {
  constructor(
    private callback_: ExpSnapshotCallback | null,
    private cancelCallback_: ((e: Error) => void) | null,
    private context_: {} | null
  ) {}

  /**
   * @inheritDoc
   */
  respondsTo(eventType: string): boolean {
    return eventType === 'value';
  }

  /**
   * @inheritDoc
   */
  createEvent(change: Change, query: Query): DataEvent {
    const index = query.getQueryParams().getIndex();
    return new DataEvent(
      'value',
      this,
      new ExpDataSnapshot(
        change.snapshotNode,
        new ExpReference(query.getRef().database.repo_, query.getRef().path),
        index
      )
    );
  }

  /**
   * @inheritDoc
   */
  getEventRunner(eventData: CancelEvent | DataEvent): () => void {
    const ctx = this.context_;
    if (eventData.getEventType() === 'cancel') {
      assert(
        this.cancelCallback_,
        'Raising a cancel event on a listener with no cancel callback'
      );
      const cancelCB = this.cancelCallback_;
      return function () {
        // We know that error exists, we checked above that this is a cancel event
        cancelCB.call(ctx, (eventData as CancelEvent).error);
      };
    } else {
      const cb = this.callback_;
      return function () {
        cb.callback(ctx, (eventData as DataEvent).snapshot);
      };
    }
  }

  /**
   * @inheritDoc
   */
  createCancelEvent(error: Error, path: Path): CancelEvent | null {
    if (this.cancelCallback_) {
      return new CancelEvent(this, error, path);
    } else {
      return null;
    }
  }

  /**
   * @inheritDoc
   */
  matches(other: EventRegistration): boolean {
    if (!(other instanceof ValueEventRegistration)) {
      return false;
    } else if (!other.callback_ || !this.callback_) {
      // If no callback specified, we consider it to match any callback.
      return true;
    } else {
      return (
        other.callback_.matches(this.callback_) &&
        other.context_ === this.context_
      );
    }
  }

  /**
   * @inheritDoc
   */
  hasAnyCallback(): boolean {
    return this.callback_ !== null;
  }
}

/**
 * Represents the registration of 1 or more child_xxx events.
 *
 * Currently, it is always exactly 1 child_xxx event, but the idea is we might let you
 * register a group of callbacks together in the future.
 */
export class ChildEventRegistration implements EventRegistration {
  constructor(
    private callbacks_: {
      [child: string]: ExpSnapshotCallback;
    } | null,
    private cancelCallback_: ((e: Error) => void) | null,
    private context_?: {}
  ) {}

  /**
   * @inheritDoc
   */
  respondsTo(eventType: string): boolean {
    let eventToCheck =
      eventType === 'children_added' ? 'child_added' : eventType;
    eventToCheck =
      eventToCheck === 'children_removed' ? 'child_removed' : eventToCheck;
    return contains(this.callbacks_, eventToCheck);
  }

  /**
   * @inheritDoc
   */
  createCancelEvent(error: Error, path: Path): CancelEvent | null {
    if (this.cancelCallback_) {
      return new CancelEvent(this, error, path);
    } else {
      return null;
    }
  }

  /**
   * @inheritDoc
   */
  createEvent(change: Change, query: Query): DataEvent {
    assert(change.childName != null, 'Child events should have a childName.');
    const ref = query.getRef().child(change.childName);
    const index = query.getQueryParams().getIndex();
    return new DataEvent(
      change.type as EventType,
      this,
      new ExpDataSnapshot(
        change.snapshotNode,
        new ExpReference(ref.repo, ref.path),
        index
      ),
      change.prevName
    );
  }

  /**
   * @inheritDoc
   */
  getEventRunner(eventData: CancelEvent | DataEvent): () => void {
    const ctx = this.context_;
    if (eventData.getEventType() === 'cancel') {
      assert(
        this.cancelCallback_,
        'Raising a cancel event on a listener with no cancel callback'
      );
      const cancelCB = this.cancelCallback_;
      return function () {
        // We know that error exists, we checked above that this is a cancel event
        cancelCB.call(ctx, (eventData as CancelEvent).error);
      };
    } else {
      const cb = this.callbacks_[(eventData as DataEvent).eventType];
      return function () {
        cb.callback(
          ctx,
          (eventData as DataEvent).snapshot,
          (eventData as DataEvent).prevName
        );
      };
    }
  }

  /**
   * @inheritDoc
   */
  matches(other: EventRegistration): boolean {
    if (other instanceof ChildEventRegistration) {
      if (!this.callbacks_ || !other.callbacks_) {
        return true;
      } else if (this.context_ === other.context_) {
        const otherKeys = Object.keys(other.callbacks_);
        const thisKeys = Object.keys(this.callbacks_);
        const otherCount = otherKeys.length;
        const thisCount = thisKeys.length;
        if (otherCount === thisCount) {
          // If count is 1, do an exact match on eventType, if either is defined but null, it's a match.
          // If event types don't match, not a match
          // If count is not 1, exact match across all

          if (otherCount === 1) {
            const otherKey = otherKeys[0];
            const thisKey = thisKeys[0];
            return (
              thisKey === otherKey &&
              (!other.callbacks_[otherKey] ||
                !this.callbacks_[thisKey] ||
                other.callbacks_[otherKey].matches(this.callbacks_[thisKey]))
            );
          } else {
            // Exact match on each key.
            return thisKeys.every(
              eventType =>
                other.callbacks_[eventType] === this.callbacks_[eventType]
            );
          }
        }
      }
    }

    return false;
  }

  /**
   * @inheritDoc
   */
  hasAnyCallback(): boolean {
    return this.callbacks_ !== null;
  }
}

/**
 * A Query represents a filter to be applied to a firebase location.  This object purely represents the
 * query expression (and exposes our public API to build the query).  The actual query logic is in ViewBase.js.
 *
 * Since every Firebase reference is a query, Firebase inherits from this object.
 */
export class Query {
  readonly repo: Repo;

  constructor(
    public database: Database,
    public path: Path,
    private queryParams_: QueryParams,
    private orderByCalled_: boolean
  ) {
    this.repo = database.repo_;
  }

  /**
   * Validates start/end values for queries.
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
        'Query: When ordering by key, the argument passed to startAt(), startAfter(), ' +
        'endAt(), endBefore(), or equalTo() must be a string.';
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
            'startAfter() endAt(), endBefore(), or equalTo() must be a valid priority value ' +
            '(null, a number, or a string).'
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
          'Query: First argument passed to startAt(), startAfter(), endAt(), endBefore(), or ' +
            'equalTo() cannot be an object.'
        );
      }
    }
  }

  /**
   * Validates that limit* has been called with the correct combination of parameters
   */
  private static validateLimit_(params: QueryParams) {
    if (
      params.hasStart() &&
      params.hasEnd() &&
      params.hasLimit() &&
      !params.hasAnchoredLimit()
    ) {
      throw new Error(
        "Query: Can't combine startAt(), startAfter(), endAt(), endBefore(), and limit(). Use " +
          'limitToFirst() or limitToLast() instead.'
      );
    }
  }

  /**
   * Validates that no other order by call has been made
   */
  private validateNoPreviousOrderByCall_(fnName: string) {
    if (this.orderByCalled_ === true) {
      throw new Error(fnName + ": You can't combine multiple orderBy calls.");
    }
  }

  getQueryParams(): QueryParams {
    return this.queryParams_;
  }

  getRef(): Reference {
    validateArgCount('Query.ref', 0, 0, arguments.length);
    // This is a slight hack. We cannot goog.require('fb.api.Firebase'), since Firebase requires fb.api.Query.
    // However, we will always export 'Firebase' to the global namespace, so it's guaranteed to exist by the time this
    // method gets called.
    return new Reference(this.database, this.path);
  }

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
    const expCallback = new ExpSnapshotCallback(this.database, callback);
    if (eventType === 'value') {
      this.onValueEvent(expCallback, ret.cancel, ret.context);
    } else {
      const callbacks: { [k: string]: ExpSnapshotCallback } = {};
      callbacks[eventType] = expCallback;
      this.onChildEvent(callbacks, ret.cancel, ret.context);
    }
    return callback;
  }

  protected onValueEvent(
    callback: ExpSnapshotCallback,
    cancelCallback: ((a: Error) => void) | null,
    context: object | null
  ) {
    const container = new ValueEventRegistration(
      callback,
      cancelCallback || null,
      context || null
    );
    repoAddEventCallbackForQuery(this.database.repo_, this, container);
  }

  protected onChildEvent(
    callbacks: { [k: string]: ExpSnapshotCallback },
    cancelCallback: ((a: Error) => unknown) | null,
    context: object | null
  ) {
    const container = new ChildEventRegistration(
      callbacks,
      cancelCallback,
      context
    );
    repoAddEventCallbackForQuery(this.database.repo_, this, container);
  }

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
    let callbacks: { [k: string]: ExpSnapshotCallback } | null = null;

    const expCallback = callback
      ? new ExpSnapshotCallback(this.database, callback)
      : null;
    if (eventType === 'value') {
      container = new ValueEventRegistration(
        expCallback,
        null,
        context || null
      );
    } else if (eventType) {
      if (callback) {
        callbacks = {};
        callbacks[eventType] = expCallback;
      }
      container = new ChildEventRegistration(callbacks, null, context || null);
    }
    repoRemoveEventCallbackForQuery(this.database.repo_, this, container);
  }

  /**
   * Get the server-value for this query, or return a cached value if not connected.
   */
  get(): Promise<DataSnapshot> {
    return repoGetValue(this.database.repo_, this).then(node => {
      return new DataSnapshot(
        this.database,
        new ExpDataSnapshot(
          node,
          new ExpReference(this.getRef().database.repo_, this.getRef().path),
          this.getQueryParams().getIndex()
        )
      );
    });
  }

  /**
   * Attaches a listener, waits for the first event, and then removes the listener
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
      this.database,
      this.path,
      queryParamsLimitToFirst(this.queryParams_, limit),
      this.orderByCalled_
    );
  }

  /**
   * Set a limit and anchor it to the end of the window.
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
      this.database,
      this.path,
      queryParamsLimitToLast(this.queryParams_, limit),
      this.orderByCalled_
    );
  }

  /**
   * Given a child path, return a new query ordered by the specified grandchild path.
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
    if (pathIsEmpty(parsedPath)) {
      throw new Error(
        'Query.orderByChild: cannot pass in empty path.  Use Query.orderByValue() instead.'
      );
    }
    const index = new PathIndex(parsedPath);
    const newParams = queryParamsOrderBy(this.queryParams_, index);
    Query.validateQueryEndpoints_(newParams);

    return new Query(
      this.database,
      this.path,
      newParams,
      /*orderByCalled=*/ true
    );
  }

  /**
   * Return a new query ordered by the KeyIndex
   */
  orderByKey(): Query {
    validateArgCount('Query.orderByKey', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByKey');
    const newParams = queryParamsOrderBy(this.queryParams_, KEY_INDEX);
    Query.validateQueryEndpoints_(newParams);
    return new Query(
      this.database,
      this.path,
      newParams,
      /*orderByCalled=*/ true
    );
  }

  /**
   * Return a new query ordered by the PriorityIndex
   */
  orderByPriority(): Query {
    validateArgCount('Query.orderByPriority', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByPriority');
    const newParams = queryParamsOrderBy(this.queryParams_, PRIORITY_INDEX);
    Query.validateQueryEndpoints_(newParams);
    return new Query(
      this.database,
      this.path,
      newParams,
      /*orderByCalled=*/ true
    );
  }

  /**
   * Return a new query ordered by the ValueIndex
   */
  orderByValue(): Query {
    validateArgCount('Query.orderByValue', 0, 0, arguments.length);
    this.validateNoPreviousOrderByCall_('Query.orderByValue');
    const newParams = queryParamsOrderBy(this.queryParams_, VALUE_INDEX);
    Query.validateQueryEndpoints_(newParams);
    return new Query(
      this.database,
      this.path,
      newParams,
      /*orderByCalled=*/ true
    );
  }

  startAt(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.startAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.startAt', 1, value, this.path, true);
    validateKey('Query.startAt', 2, name, true);

    const newParams = queryParamsStartAt(this.queryParams_, value, name);
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

    return new Query(this.database, this.path, newParams, this.orderByCalled_);
  }

  startAfter(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.startAfter', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.startAfter', 1, value, this.path, false);
    validateKey('Query.startAfter', 2, name, true);

    const newParams = queryParamsStartAfter(this.queryParams_, value, name);
    Query.validateLimit_(newParams);
    Query.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasStart()) {
      throw new Error(
        'Query.startAfter: Starting point was already set (by another call to startAt, startAfter ' +
          'or equalTo).'
      );
    }

    return new Query(this.database, this.path, newParams, this.orderByCalled_);
  }

  endAt(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.endAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.endAt', 1, value, this.path, true);
    validateKey('Query.endAt', 2, name, true);

    const newParams = queryParamsEndAt(this.queryParams_, value, name);
    Query.validateLimit_(newParams);
    Query.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasEnd()) {
      throw new Error(
        'Query.endAt: Ending point was already set (by another call to endAt, endBefore, or ' +
          'equalTo).'
      );
    }

    return new Query(this.database, this.path, newParams, this.orderByCalled_);
  }

  endBefore(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.endBefore', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.endBefore', 1, value, this.path, false);
    validateKey('Query.endBefore', 2, name, true);

    const newParams = queryParamsEndBefore(this.queryParams_, value, name);
    Query.validateLimit_(newParams);
    Query.validateQueryEndpoints_(newParams);
    if (this.queryParams_.hasEnd()) {
      throw new Error(
        'Query.endBefore: Ending point was already set (by another call to endAt, endBefore, or ' +
          'equalTo).'
      );
    }

    return new Query(this.database, this.path, newParams, this.orderByCalled_);
  }

  /**
   * Load the selection of children with exactly the specified value, and, optionally,
   * the specified name.
   */
  equalTo(value: number | string | boolean | null, name?: string) {
    validateArgCount('Query.equalTo', 1, 2, arguments.length);
    validateFirebaseDataArg('Query.equalTo', 1, value, this.path, false);
    validateKey('Query.equalTo', 2, name, true);
    if (this.queryParams_.hasStart()) {
      throw new Error(
        'Query.equalTo: Starting point was already set (by another call to startAt/startAfter or ' +
          'equalTo).'
      );
    }
    if (this.queryParams_.hasEnd()) {
      throw new Error(
        'Query.equalTo: Ending point was already set (by another call to endAt/endBefore or ' +
          'equalTo).'
      );
    }
    return this.startAt(value, name).endAt(value, name);
  }

  /**
   * @return URL for this location.
   */
  toString(): string {
    validateArgCount('Query.toString', 0, 0, arguments.length);

    return this.database.repo_.toString() + pathToUrlEncodedString(this.path);
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
   */
  queryObject(): object {
    return queryParamsGetQueryObject(this.queryParams_);
  }

  queryIdentifier(): string {
    const obj = this.queryObject();
    const id = ObjectToUniqueKey(obj);
    return id === '{}' ? 'default' : id;
  }

  /**
   * Return true if this query and the provided query are equivalent; otherwise, return false.
   */
  isEqual(other: Query): boolean {
    validateArgCount('Query.isEqual', 1, 1, arguments.length);
    if (!(other instanceof Query)) {
      const error =
        'Query.isEqual failed: First argument must be an instance of firebase.database.Query.';
      throw new Error(error);
    }

    const sameRepo = this.database.repo_ === other.database.repo_;
    const samePath = pathEquals(this.path, other.path);
    const sameQueryIdentifier =
      this.queryIdentifier() === other.queryIdentifier();

    return sameRepo && samePath && sameQueryIdentifier;
  }

  /**
   * Helper used by .on and .once to extract the context and or cancel arguments.
   * @param fnName The function name (on or once)
   *
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

export class Reference extends Query {
  then: Promise<Reference>['then'];
  catch: Promise<Reference>['catch'];

  /**
   * Call options:
   *   new Reference(Repo, Path) or
   *   new Reference(url: string, string|RepoManager)
   *
   * Externally - this is the firebase.database.Reference type.
   */
  constructor(database: Database, path: Path) {
    super(database, path, new QueryParams(), false);
  }

  /** @return {?string} */
  getKey(): string | null {
    validateArgCount('Reference.key', 0, 0, arguments.length);

    if (pathIsEmpty(this.path)) {
      return null;
    } else {
      return pathGetBack(this.path);
    }
  }

  child(pathString: string | Path): Reference {
    validateArgCount('Reference.child', 1, 1, arguments.length);
    if (typeof pathString === 'number') {
      pathString = String(pathString);
    } else if (!(pathString instanceof Path)) {
      if (pathGetFront(this.path) === null) {
        validateRootPathString('Reference.child', 1, pathString, false);
      } else {
        validatePathString('Reference.child', 1, pathString, false);
      }
    }

    return new Reference(this.database, pathChild(this.path, pathString));
  }

  /** @return {?Reference} */
  getParent(): Reference | null {
    validateArgCount('Reference.parent', 0, 0, arguments.length);

    const parentPath = pathParent(this.path);
    return parentPath === null
      ? null
      : new Reference(this.database, parentPath);
  }

  /** @return {!Reference} */
  getRoot(): Reference {
    validateArgCount('Reference.root', 0, 0, arguments.length);

    let ref: Reference = this;
    while (ref.getParent() !== null) {
      ref = ref.getParent();
    }
    return ref;
  }

  set(
    newVal: unknown,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.set', 1, 2, arguments.length);
    validateWritablePath('Reference.set', this.path);
    validateFirebaseDataArg('Reference.set', 1, newVal, this.path, false);
    validateCallback('Reference.set', 2, onComplete, true);

    const deferred = new Deferred();
    repoSetWithPriority(
      this.database.repo_,
      this.path,
      newVal,
      /*priority=*/ null,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  update(
    objectToMerge: object,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.update', 1, 2, arguments.length);
    validateWritablePath('Reference.update', this.path);

    if (Array.isArray(objectToMerge)) {
      const newObjectToMerge: { [k: string]: unknown } = {};
      for (let i = 0; i < objectToMerge.length; ++i) {
        newObjectToMerge['' + i] = objectToMerge[i];
      }
      objectToMerge = newObjectToMerge;
      warn(
        'Passing an Array to Firebase.update() is deprecated. ' +
          'Use set() if you want to overwrite the existing data, or ' +
          'an Object with integer keys if you really do want to ' +
          'only update some of the children.'
      );
    }
    validateFirebaseMergeDataArg(
      'Reference.update',
      1,
      objectToMerge,
      this.path,
      false
    );
    validateCallback('Reference.update', 2, onComplete, true);
    const deferred = new Deferred();
    repoUpdate(
      this.database.repo_,
      this.path,
      objectToMerge as { [k: string]: unknown },
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  setWithPriority(
    newVal: unknown,
    newPriority: string | number | null,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.setWithPriority', 2, 3, arguments.length);
    validateWritablePath('Reference.setWithPriority', this.path);
    validateFirebaseDataArg(
      'Reference.setWithPriority',
      1,
      newVal,
      this.path,
      false
    );
    validatePriority('Reference.setWithPriority', 2, newPriority, false);
    validateCallback('Reference.setWithPriority', 3, onComplete, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys') {
      throw (
        'Reference.setWithPriority failed: ' +
        this.getKey() +
        ' is a read-only object.'
      );
    }

    const deferred = new Deferred();
    repoSetWithPriority(
      this.database.repo_,
      this.path,
      newVal,
      newPriority,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  remove(onComplete?: (a: Error | null) => void): Promise<unknown> {
    validateArgCount('Reference.remove', 0, 1, arguments.length);
    validateWritablePath('Reference.remove', this.path);
    validateCallback('Reference.remove', 1, onComplete, true);

    return this.set(null, onComplete);
  }

  transaction(
    transactionUpdate: (a: unknown) => unknown,
    onComplete?: (
      error: Error | null,
      committed: boolean,
      dataSnapshot: DataSnapshot | null
    ) => void,
    applyLocally?: boolean
  ): Promise<TransactionResult> {
    validateArgCount('Reference.transaction', 1, 3, arguments.length);
    validateWritablePath('Reference.transaction', this.path);
    validateCallback('Reference.transaction', 1, transactionUpdate, false);
    validateCallback('Reference.transaction', 2, onComplete, true);
    // NOTE: applyLocally is an internal-only option for now.  We need to decide if we want to keep it and how
    // to expose it.
    validateBoolean('Reference.transaction', 3, applyLocally, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys') {
      throw (
        'Reference.transaction failed: ' +
        this.getKey() +
        ' is a read-only object.'
      );
    }

    if (applyLocally === undefined) {
      applyLocally = true;
    }

    const deferred = new Deferred<TransactionResult>();
    if (typeof onComplete === 'function') {
      deferred.promise.catch(() => {});
    }

    const promiseComplete = (
      error: Error | null,
      committed: boolean,
      node: Node | null
    ) => {
      let dataSnapshot: DataSnapshot | null = null;
      if (error) {
        deferred.reject(error);
        if (typeof onComplete === 'function') {
          onComplete(error, committed, null);
        }
      } else {
        dataSnapshot = new DataSnapshot(
          this.database,
          new ExpDataSnapshot(
            node,
            new ExpReference(this.database.repo_, this.path),
            PRIORITY_INDEX
          )
        );
        deferred.resolve(new TransactionResult(committed, dataSnapshot));
        if (typeof onComplete === 'function') {
          onComplete(error, committed, dataSnapshot);
        }
      }
    };

    // Add a watch to make sure we get server updates.
    const valueCallback = function () {};
    const watchRef = new Reference(this.database, this.path);
    watchRef.on('value', valueCallback);
    const unwatcher = function () {
      watchRef.off('value', valueCallback);
    };

    repoStartTransaction(
      this.database.repo_,
      this.path,
      transactionUpdate,
      promiseComplete,
      unwatcher,
      applyLocally
    );

    return deferred.promise;
  }

  setPriority(
    priority: string | number | null,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.setPriority', 1, 2, arguments.length);
    validateWritablePath('Reference.setPriority', this.path);
    validatePriority('Reference.setPriority', 1, priority, false);
    validateCallback('Reference.setPriority', 2, onComplete, true);

    const deferred = new Deferred();
    repoSetWithPriority(
      this.database.repo_,
      pathChild(this.path, '.priority'),
      priority,
      null,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  push(value?: unknown, onComplete?: (a: Error | null) => void): Reference {
    validateArgCount('Reference.push', 0, 2, arguments.length);
    validateWritablePath('Reference.push', this.path);
    validateFirebaseDataArg('Reference.push', 1, value, this.path, true);
    validateCallback('Reference.push', 2, onComplete, true);

    const now = repoServerTime(this.database.repo_);
    const name = nextPushId(now);

    // push() returns a ThennableReference whose promise is fulfilled with a regular Reference.
    // We use child() to create handles to two different references. The first is turned into a
    // ThennableReference below by adding then() and catch() methods and is used as the
    // return value of push(). The second remains a regular Reference and is used as the fulfilled
    // value of the first ThennableReference.
    const thennablePushRef = this.child(name);
    const pushRef = this.child(name);

    let promise;
    if (value != null) {
      promise = thennablePushRef.set(value, onComplete).then(() => pushRef);
    } else {
      promise = Promise.resolve(pushRef);
    }

    thennablePushRef.then = promise.then.bind(promise);
    thennablePushRef.catch = promise.then.bind(promise, undefined);

    if (typeof onComplete === 'function') {
      promise.catch(() => {});
    }

    return thennablePushRef;
  }

  onDisconnect(): OnDisconnect {
    validateWritablePath('Reference.onDisconnect', this.path);
    return new OnDisconnect(this.database.repo_, this.path);
  }

  get key(): string | null {
    return this.getKey();
  }

  get parent(): Reference | null {
    return this.getParent();
  }

  get root(): Reference {
    return this.getRoot();
  }
}

/**
 * Define reference constructor in various modules
 *
 * We are doing this here to avoid several circular
 * dependency issues
 */
syncPointSetReferenceConstructor(Reference);
