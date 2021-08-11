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
  OnDisconnect as ModularOnDisconnect,
  off,
  onChildAdded,
  onChildChanged,
  onChildMoved,
  onChildRemoved,
  onValue,
  EventType,
  limitToFirst,
  query,
  limitToLast,
  orderByChild,
  orderByKey,
  orderByValue,
  orderByPriority,
  startAt,
  startAfter,
  endAt,
  endBefore,
  equalTo,
  get,
  set,
  update,
  setWithPriority,
  remove,
  setPriority,
  push,
  runTransaction,
  child,
  DataSnapshot as ModularDataSnapshot,
  Query as ExpQuery,
  DatabaseReference as ModularReference,
  _QueryImpl,
  _ReferenceImpl,
  _validatePathString,
  _validateWritablePath,
  _UserCallback,
  _QueryParams
} from '@firebase/database';
import {
  Compat,
  Deferred,
  errorPrefix,
  validateArgCount,
  validateCallback,
  validateContextObject
} from '@firebase/util';

import { warn } from '../util/util';
import { validateBoolean, validateEventType } from '../util/validation';

import { Database } from './Database';
import { OnDisconnect } from './onDisconnect';
import { TransactionResult } from './TransactionResult';

/**
 * Class representing a firebase data snapshot.  It wraps a SnapshotNode and
 * surfaces the public methods (val, forEach, etc.) we want to expose.
 */
export class DataSnapshot implements Compat<ModularDataSnapshot> {
  constructor(
    readonly _database: Database,
    readonly _delegate: ModularDataSnapshot
  ) {}

  /**
   * Retrieves the snapshot contents as JSON.  Returns null if the snapshot is
   * empty.
   *
   * @returns JSON representation of the DataSnapshot contents, or null if empty.
   */
  val(): unknown {
    validateArgCount('DataSnapshot.val', 0, 0, arguments.length);
    return this._delegate.val();
  }

  /**
   * Returns the snapshot contents as JSON, including priorities of node.  Suitable for exporting
   * the entire node contents.
   * @returns JSON representation of the DataSnapshot contents, or null if empty.
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
   * @returns Whether the snapshot contains a non-null value, or is empty.
   */
  exists(): boolean {
    validateArgCount('DataSnapshot.exists', 0, 0, arguments.length);
    return this._delegate.exists();
  }

  /**
   * Returns a DataSnapshot of the specified child node's contents.
   *
   * @param path - Path to a child.
   * @returns DataSnapshot for child node.
   */
  child(path: string): DataSnapshot {
    validateArgCount('DataSnapshot.child', 0, 1, arguments.length);
    // Ensure the childPath is a string (can be a number)
    path = String(path);
    _validatePathString('DataSnapshot.child', 'path', path, false);
    return new DataSnapshot(this._database, this._delegate.child(path));
  }

  /**
   * Returns whether the snapshot contains a child at the specified path.
   *
   * @param path - Path to a child.
   * @returns Whether the child exists.
   */
  hasChild(path: string): boolean {
    validateArgCount('DataSnapshot.hasChild', 1, 1, arguments.length);
    _validatePathString('DataSnapshot.hasChild', 'path', path, false);
    return this._delegate.hasChild(path);
  }

  /**
   * Returns the priority of the object, or null if no priority was set.
   *
   * @returns The priority.
   */
  getPriority(): string | number | null {
    validateArgCount('DataSnapshot.getPriority', 0, 0, arguments.length);
    return this._delegate.priority;
  }

  /**
   * Iterates through child nodes and calls the specified action for each one.
   *
   * @param action - Callback function to be called
   * for each child.
   * @returns True if forEach was canceled by action returning true for
   * one of the child nodes.
   */
  forEach(action: (snapshot: DataSnapshot) => boolean | void): boolean {
    validateArgCount('DataSnapshot.forEach', 1, 1, arguments.length);
    validateCallback('DataSnapshot.forEach', 'action', action, false);
    return this._delegate.forEach(expDataSnapshot =>
      action(new DataSnapshot(this._database, expDataSnapshot))
    );
  }

  /**
   * Returns whether this DataSnapshot has children.
   * @returns True if the DataSnapshot contains 1 or more child nodes.
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
   * @returns The number of children that this DataSnapshot contains.
   */
  numChildren(): number {
    validateArgCount('DataSnapshot.numChildren', 0, 0, arguments.length);
    return this._delegate.size;
  }

  /**
   * @returns The Firebase reference for the location this snapshot's data came
   * from.
   */
  getRef(): Reference {
    validateArgCount('DataSnapshot.ref', 0, 0, arguments.length);
    return new Reference(this._database, this._delegate.ref);
  }

  get ref(): Reference {
    return this.getRef();
  }
}

export interface SnapshotCallback {
  (dataSnapshot: DataSnapshot, previousChildName?: string | null): unknown;
}

/**
 * A Query represents a filter to be applied to a firebase location.  This object purely represents the
 * query expression (and exposes our public API to build the query).  The actual query logic is in ViewBase.js.
 *
 * Since every Firebase reference is a query, Firebase inherits from this object.
 */
export class Query implements Compat<ExpQuery> {
  constructor(readonly database: Database, readonly _delegate: ExpQuery) {}

  on(
    eventType: string,
    callback: SnapshotCallback,
    cancelCallbackOrContext?: ((a: Error) => unknown) | object | null,
    context?: object | null
  ): SnapshotCallback {
    validateArgCount('Query.on', 2, 4, arguments.length);
    validateCallback('Query.on', 'callback', callback, false);

    const ret = Query.getCancelAndContextArgs_(
      'Query.on',
      cancelCallbackOrContext,
      context
    );
    const valueCallback = (expSnapshot, previousChildName?) => {
      callback.call(
        ret.context,
        new DataSnapshot(this.database, expSnapshot),
        previousChildName
      );
    };
    valueCallback.userCallback = callback;
    valueCallback.context = ret.context;
    const cancelCallback = ret.cancel?.bind(ret.context);

    switch (eventType) {
      case 'value':
        onValue(this._delegate, valueCallback, cancelCallback);
        return callback;
      case 'child_added':
        onChildAdded(this._delegate, valueCallback, cancelCallback);
        return callback;
      case 'child_removed':
        onChildRemoved(this._delegate, valueCallback, cancelCallback);
        return callback;
      case 'child_changed':
        onChildChanged(this._delegate, valueCallback, cancelCallback);
        return callback;
      case 'child_moved':
        onChildMoved(this._delegate, valueCallback, cancelCallback);
        return callback;
      default:
        throw new Error(
          errorPrefix('Query.on', 'eventType') +
            'must be a valid event type = "value", "child_added", "child_removed", ' +
            '"child_changed", or "child_moved".'
        );
    }
  }

  off(
    eventType?: string,
    callback?: SnapshotCallback,
    context?: object | null
  ): void {
    validateArgCount('Query.off', 0, 3, arguments.length);
    validateEventType('Query.off', eventType, true);
    validateCallback('Query.off', 'callback', callback, true);
    validateContextObject('Query.off', 'context', context, true);
    if (callback) {
      const valueCallback: _UserCallback = () => {};
      valueCallback.userCallback = callback;
      valueCallback.context = context;
      off(this._delegate, eventType as EventType, valueCallback);
    } else {
      off(this._delegate, eventType as EventType | undefined);
    }
  }

  /**
   * Get the server-value for this query, or return a cached value if not connected.
   */
  get(): Promise<DataSnapshot> {
    return get(this._delegate).then(expSnapshot => {
      return new DataSnapshot(this.database, expSnapshot);
    });
  }

  /**
   * Attaches a listener, waits for the first event, and then removes the listener
   */
  once(
    eventType: string,
    callback?: SnapshotCallback,
    failureCallbackOrContext?: ((a: Error) => void) | object | null,
    context?: object | null
  ): Promise<DataSnapshot> {
    validateArgCount('Query.once', 1, 4, arguments.length);
    validateCallback('Query.once', 'callback', callback, true);

    const ret = Query.getCancelAndContextArgs_(
      'Query.once',
      failureCallbackOrContext,
      context
    );
    const deferred = new Deferred<DataSnapshot>();
    const valueCallback: _UserCallback = (expSnapshot, previousChildName?) => {
      const result = new DataSnapshot(this.database, expSnapshot);
      if (callback) {
        callback.call(ret.context, result, previousChildName);
      }
      deferred.resolve(result);
    };
    valueCallback.userCallback = callback;
    valueCallback.context = ret.context;
    const cancelCallback = (error: Error) => {
      if (ret.cancel) {
        ret.cancel.call(ret.context, error);
      }
      deferred.reject(error);
    };

    switch (eventType) {
      case 'value':
        onValue(this._delegate, valueCallback, cancelCallback, {
          onlyOnce: true
        });
        break;
      case 'child_added':
        onChildAdded(this._delegate, valueCallback, cancelCallback, {
          onlyOnce: true
        });
        break;
      case 'child_removed':
        onChildRemoved(this._delegate, valueCallback, cancelCallback, {
          onlyOnce: true
        });
        break;
      case 'child_changed':
        onChildChanged(this._delegate, valueCallback, cancelCallback, {
          onlyOnce: true
        });
        break;
      case 'child_moved':
        onChildMoved(this._delegate, valueCallback, cancelCallback, {
          onlyOnce: true
        });
        break;
      default:
        throw new Error(
          errorPrefix('Query.once', 'eventType') +
            'must be a valid event type = "value", "child_added", "child_removed", ' +
            '"child_changed", or "child_moved".'
        );
    }

    return deferred.promise;
  }

  /**
   * Set a limit and anchor it to the start of the window.
   */
  limitToFirst(limit: number): Query {
    validateArgCount('Query.limitToFirst', 1, 1, arguments.length);
    return new Query(this.database, query(this._delegate, limitToFirst(limit)));
  }

  /**
   * Set a limit and anchor it to the end of the window.
   */
  limitToLast(limit: number): Query {
    validateArgCount('Query.limitToLast', 1, 1, arguments.length);
    return new Query(this.database, query(this._delegate, limitToLast(limit)));
  }

  /**
   * Given a child path, return a new query ordered by the specified grandchild path.
   */
  orderByChild(path: string): Query {
    validateArgCount('Query.orderByChild', 1, 1, arguments.length);
    return new Query(this.database, query(this._delegate, orderByChild(path)));
  }

  /**
   * Return a new query ordered by the KeyIndex
   */
  orderByKey(): Query {
    validateArgCount('Query.orderByKey', 0, 0, arguments.length);
    return new Query(this.database, query(this._delegate, orderByKey()));
  }

  /**
   * Return a new query ordered by the PriorityIndex
   */
  orderByPriority(): Query {
    validateArgCount('Query.orderByPriority', 0, 0, arguments.length);
    return new Query(this.database, query(this._delegate, orderByPriority()));
  }

  /**
   * Return a new query ordered by the ValueIndex
   */
  orderByValue(): Query {
    validateArgCount('Query.orderByValue', 0, 0, arguments.length);
    return new Query(this.database, query(this._delegate, orderByValue()));
  }

  startAt(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.startAt', 0, 2, arguments.length);
    return new Query(
      this.database,
      query(this._delegate, startAt(value, name))
    );
  }

  startAfter(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.startAfter', 0, 2, arguments.length);
    return new Query(
      this.database,
      query(this._delegate, startAfter(value, name))
    );
  }

  endAt(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.endAt', 0, 2, arguments.length);
    return new Query(this.database, query(this._delegate, endAt(value, name)));
  }

  endBefore(
    value: number | string | boolean | null = null,
    name?: string | null
  ): Query {
    validateArgCount('Query.endBefore', 0, 2, arguments.length);
    return new Query(
      this.database,
      query(this._delegate, endBefore(value, name))
    );
  }

  /**
   * Load the selection of children with exactly the specified value, and, optionally,
   * the specified name.
   */
  equalTo(value: number | string | boolean | null, name?: string) {
    validateArgCount('Query.equalTo', 1, 2, arguments.length);
    return new Query(
      this.database,
      query(this._delegate, equalTo(value, name))
    );
  }

  /**
   * @returns URL for this location.
   */
  toString(): string {
    validateArgCount('Query.toString', 0, 0, arguments.length);
    return this._delegate.toString();
  }

  // Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
  // for end-users.
  toJSON() {
    // An optional spacer argument is unnecessary for a string.
    validateArgCount('Query.toJSON', 0, 1, arguments.length);
    return this._delegate.toJSON();
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
    return this._delegate.isEqual(other._delegate);
  }

  /**
   * Helper used by .on and .once to extract the context and or cancel arguments.
   * @param fnName - The function name (on or once)
   *
   */
  private static getCancelAndContextArgs_(
    fnName: string,
    cancelOrContext?: ((a: Error) => void) | object | null,
    context?: object | null
  ): { cancel: ((a: Error) => void) | undefined; context: object | undefined } {
    const ret: {
      cancel: ((a: Error) => void) | null;
      context: object | null;
    } = { cancel: undefined, context: undefined };
    if (cancelOrContext && context) {
      ret.cancel = cancelOrContext as (a: Error) => void;
      validateCallback(fnName, 'cancel', ret.cancel, true);

      ret.context = context;
      validateContextObject(fnName, 'context', ret.context, true);
    } else if (cancelOrContext) {
      // we have either a cancel callback or a context.
      if (typeof cancelOrContext === 'object' && cancelOrContext !== null) {
        // it's a context!
        ret.context = cancelOrContext;
      } else if (typeof cancelOrContext === 'function') {
        ret.cancel = cancelOrContext as (a: Error) => void;
      } else {
        throw new Error(
          errorPrefix(fnName, 'cancelOrContext') +
            ' must either be a cancel callback or a context object.'
        );
      }
    }
    return ret;
  }

  get ref(): Reference {
    return new Reference(
      this.database,
      new _ReferenceImpl(this._delegate._repo, this._delegate._path)
    );
  }
}

export class Reference extends Query implements Compat<ModularReference> {
  then: Promise<Reference>['then'];
  catch: Promise<Reference>['catch'];

  /**
   * Call options:
   *   new Reference(Repo, Path) or
   *   new Reference(url: string, string|RepoManager)
   *
   * Externally - this is the firebase.database.Reference type.
   */
  constructor(
    readonly database: Database,
    readonly _delegate: ModularReference
  ) {
    super(
      database,
      new _QueryImpl(
        _delegate._repo,
        _delegate._path,
        new _QueryParams(),
        false
      )
    );
  }

  /** @returns {?string} */
  getKey(): string | null {
    validateArgCount('Reference.key', 0, 0, arguments.length);
    return this._delegate.key;
  }

  child(pathString: string): Reference {
    validateArgCount('Reference.child', 1, 1, arguments.length);
    if (typeof pathString === 'number') {
      pathString = String(pathString);
    }
    return new Reference(this.database, child(this._delegate, pathString));
  }

  /** @returns {?Reference} */
  getParent(): Reference | null {
    validateArgCount('Reference.parent', 0, 0, arguments.length);
    const parent = this._delegate.parent;
    return parent ? new Reference(this.database, parent) : null;
  }

  /** @returns {!Reference} */
  getRoot(): Reference {
    validateArgCount('Reference.root', 0, 0, arguments.length);
    return new Reference(this.database, this._delegate.root);
  }

  set(
    newVal: unknown,
    onComplete?: (error: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.set', 1, 2, arguments.length);
    validateCallback('Reference.set', 'onComplete', onComplete, true);
    const result = set(this._delegate, newVal);
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  update(
    values: object,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.update', 1, 2, arguments.length);

    if (Array.isArray(values)) {
      const newObjectToMerge: { [k: string]: unknown } = {};
      for (let i = 0; i < values.length; ++i) {
        newObjectToMerge['' + i] = values[i];
      }
      values = newObjectToMerge;
      warn(
        'Passing an Array to Firebase.update() is deprecated. ' +
          'Use set() if you want to overwrite the existing data, or ' +
          'an Object with integer keys if you really do want to ' +
          'only update some of the children.'
      );
    }
    _validateWritablePath('Reference.update', this._delegate._path);
    validateCallback('Reference.update', 'onComplete', onComplete, true);

    const result = update(this._delegate, values);
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  setWithPriority(
    newVal: unknown,
    newPriority: string | number | null,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.setWithPriority', 2, 3, arguments.length);
    validateCallback(
      'Reference.setWithPriority',
      'onComplete',
      onComplete,
      true
    );

    const result = setWithPriority(this._delegate, newVal, newPriority);
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  remove(onComplete?: (a: Error | null) => void): Promise<unknown> {
    validateArgCount('Reference.remove', 0, 1, arguments.length);
    validateCallback('Reference.remove', 'onComplete', onComplete, true);

    const result = remove(this._delegate);
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  transaction(
    transactionUpdate: (currentData: unknown) => unknown,
    onComplete?: (
      error: Error | null,
      committed: boolean,
      dataSnapshot: DataSnapshot | null
    ) => void,
    applyLocally?: boolean
  ): Promise<TransactionResult> {
    validateArgCount('Reference.transaction', 1, 3, arguments.length);
    validateCallback(
      'Reference.transaction',
      'transactionUpdate',
      transactionUpdate,
      false
    );
    validateCallback('Reference.transaction', 'onComplete', onComplete, true);
    validateBoolean(
      'Reference.transaction',
      'applyLocally',
      applyLocally,
      true
    );

    const result = runTransaction(this._delegate, transactionUpdate, {
      applyLocally
    }).then(
      transactionResult =>
        new TransactionResult(
          transactionResult.committed,
          new DataSnapshot(this.database, transactionResult.snapshot)
        )
    );
    if (onComplete) {
      result.then(
        transactionResult =>
          onComplete(
            null,
            transactionResult.committed,
            transactionResult.snapshot
          ),
        error => onComplete(error, false, null)
      );
    }
    return result;
  }

  setPriority(
    priority: string | number | null,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.setPriority', 1, 2, arguments.length);
    validateCallback('Reference.setPriority', 'onComplete', onComplete, true);

    const result = setPriority(this._delegate, priority);
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  push(value?: unknown, onComplete?: (a: Error | null) => void): Reference {
    validateArgCount('Reference.push', 0, 2, arguments.length);
    validateCallback('Reference.push', 'onComplete', onComplete, true);

    const expPromise = push(this._delegate, value);
    const promise = expPromise.then(
      expRef => new Reference(this.database, expRef)
    );

    if (onComplete) {
      promise.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }

    const result = new Reference(this.database, expPromise);
    result.then = promise.then.bind(promise);
    result.catch = promise.catch.bind(promise, undefined);
    return result;
  }

  onDisconnect(): OnDisconnect {
    _validateWritablePath('Reference.onDisconnect', this._delegate._path);
    return new OnDisconnect(
      new ModularOnDisconnect(this._delegate._repo, this._delegate._path)
    );
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
