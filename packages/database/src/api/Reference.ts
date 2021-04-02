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
  Compat,
  Deferred,
  errorPrefix,
  validateArgCount,
  validateCallback,
  validateContextObject
} from '@firebase/util';

import {
  repoServerTime,
  repoSetWithPriority,
  repoStartTransaction,
  repoUpdate
} from '../core/Repo';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { Node } from '../core/snap/Node';
import { nextPushId } from '../core/util/NextPushId';
import {
  Path,
  pathChild,
  pathGetBack,
  pathGetFront,
  pathIsEmpty,
  pathParent
} from '../core/util/Path';
import { warn } from '../core/util/util';
import {
  validateBoolean,
  validateEventType,
  validateFirebaseDataArg,
  validateFirebaseMergeDataArg,
  validatePathString,
  validatePriority,
  validateRootPathString,
  validateWritablePath
} from '../core/util/validation';
import { UserCallback } from '../core/view/EventRegistration';
import { QueryParams } from '../core/view/QueryParams';
import {
  DataSnapshot as ExpDataSnapshot,
  off,
  onChildAdded,
  onChildChanged,
  onChildMoved,
  onChildRemoved,
  onValue,
  QueryImpl,
  ReferenceImpl,
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
  get
} from '../exp/Reference_impl';

import { Database } from './Database';
import { OnDisconnect } from './onDisconnect';
import { TransactionResult } from './TransactionResult';
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
 * A Query represents a filter to be applied to a firebase location.  This object purely represents the
 * query expression (and exposes our public API to build the query).  The actual query logic is in ViewBase.js.
 *
 * Since every Firebase reference is a query, Firebase inherits from this object.
 */
export class Query implements Compat<QueryImpl> {
  constructor(readonly database: Database, readonly _delegate: QueryImpl) {}

  on(
    eventType: string,
    callback: SnapshotCallback,
    cancelCallbackOrContext?: ((a: Error) => unknown) | object | null,
    context?: object | null
  ): SnapshotCallback {
    validateArgCount('Query.on', 2, 4, arguments.length);
    validateCallback('Query.on', 2, callback, false);

    const ret = Query.getCancelAndContextArgs_(
      'Query.on',
      cancelCallbackOrContext,
      context
    );
    const valueCallback: UserCallback = (expSnapshot, previousChildName?) => {
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
          errorPrefix('Query.on', 1, false) +
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
    validateEventType('Query.off', 1, eventType, true);
    validateCallback('Query.off', 2, callback, true);
    validateContextObject('Query.off', 3, context, true);
    if (callback) {
      const valueCallback: UserCallback = () => {};
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
    userCallback?: SnapshotCallback,
    failureCallbackOrContext?: ((a: Error) => void) | object | null,
    context?: object | null
  ): Promise<DataSnapshot> {
    validateArgCount('Query.once', 1, 4, arguments.length);
    validateCallback('Query.once', 2, userCallback, true);

    const ret = Query.getCancelAndContextArgs_(
      'Query.on',
      failureCallbackOrContext,
      context
    );
    const deferred = new Deferred<DataSnapshot>();
    const valueCallback: UserCallback = (expSnapshot, previousChildName?) => {
      const result = new DataSnapshot(this.database, expSnapshot);
      if (userCallback) {
        userCallback.call(ret.context, result, previousChildName);
      }
      deferred.resolve(result);
    };
    valueCallback.userCallback = userCallback;
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
          errorPrefix('Query.once', 1, false) +
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
   * @return URL for this location.
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
   * @param fnName The function name (on or once)
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
    return new Reference(this.database, this._delegate._path);
  }
}

export class Reference extends Query implements Compat<ReferenceImpl> {
  readonly _delegate: ReferenceImpl;

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
    super(
      database,
      new QueryImpl(database._delegate._repo, path, new QueryParams(), false)
    );
  }

  /** @return {?string} */
  getKey(): string | null {
    validateArgCount('Reference.key', 0, 0, arguments.length);

    if (pathIsEmpty(this._delegate._path)) {
      return null;
    } else {
      return pathGetBack(this._delegate._path);
    }
  }

  child(pathString: string | Path): Reference {
    validateArgCount('Reference.child', 1, 1, arguments.length);
    if (typeof pathString === 'number') {
      pathString = String(pathString);
    } else if (!(pathString instanceof Path)) {
      if (pathGetFront(this._delegate._path) === null) {
        validateRootPathString('Reference.child', 1, pathString, false);
      } else {
        validatePathString('Reference.child', 1, pathString, false);
      }
    }

    return new Reference(
      this.database,
      pathChild(this._delegate._path, pathString)
    );
  }

  /** @return {?Reference} */
  getParent(): Reference | null {
    validateArgCount('Reference.parent', 0, 0, arguments.length);

    const parentPath = pathParent(this._delegate._path);
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
    validateWritablePath('Reference.set', this._delegate._path);
    validateFirebaseDataArg(
      'Reference.set',
      1,
      newVal,
      this._delegate._path,
      false
    );
    validateCallback('Reference.set', 2, onComplete, true);

    const deferred = new Deferred();
    repoSetWithPriority(
      this._delegate._repo,
      this._delegate._path,
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
    validateWritablePath('Reference.update', this._delegate._path);

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
      this._delegate._path,
      false
    );
    validateCallback('Reference.update', 2, onComplete, true);
    const deferred = new Deferred();
    repoUpdate(
      this._delegate._repo,
      this._delegate._path,
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
    validateWritablePath('Reference.setWithPriority', this._delegate._path);
    validateFirebaseDataArg(
      'Reference.setWithPriority',
      1,
      newVal,
      this._delegate._path,
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
      this._delegate._repo,
      this._delegate._path,
      newVal,
      newPriority,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  remove(onComplete?: (a: Error | null) => void): Promise<unknown> {
    validateArgCount('Reference.remove', 0, 1, arguments.length);
    validateWritablePath('Reference.remove', this._delegate._path);
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
    validateWritablePath('Reference.transaction', this._delegate._path);
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
            new ReferenceImpl(this._delegate._repo, this._delegate._path),
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
    const watchRef = new Reference(this.database, this._delegate._path);
    watchRef.on('value', valueCallback);
    const unwatcher = function () {
      watchRef.off('value', valueCallback);
    };

    repoStartTransaction(
      this._delegate._repo,
      this._delegate._path,
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
    validateWritablePath('Reference.setPriority', this._delegate._path);
    validatePriority('Reference.setPriority', 1, priority, false);
    validateCallback('Reference.setPriority', 2, onComplete, true);

    const deferred = new Deferred();
    repoSetWithPriority(
      this._delegate._repo,
      pathChild(this._delegate._path, '.priority'),
      priority,
      null,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  push(value?: unknown, onComplete?: (a: Error | null) => void): Reference {
    validateArgCount('Reference.push', 0, 2, arguments.length);
    validateWritablePath('Reference.push', this._delegate._path);
    validateFirebaseDataArg(
      'Reference.push',
      1,
      value,
      this._delegate._path,
      true
    );
    validateCallback('Reference.push', 2, onComplete, true);

    const now = repoServerTime(this._delegate._repo);
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
    validateWritablePath('Reference.onDisconnect', this._delegate._path);
    return new OnDisconnect(this._delegate._repo, this._delegate._path);
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
