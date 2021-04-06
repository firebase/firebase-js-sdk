/**
 * @license
 * Copyright 2020 Google LLC
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

import { assert, contains, getModularInstance, Deferred } from '@firebase/util';

import {
  Repo,
  repoAddEventCallbackForQuery,
  repoGetValue,
  repoRemoveEventCallbackForQuery,
  repoServerTime,
  repoSetWithPriority,
  repoUpdate
} from '../core/Repo';
import { ChildrenNode } from '../core/snap/ChildrenNode';
import { Index } from '../core/snap/indexes/Index';
import { KEY_INDEX } from '../core/snap/indexes/KeyIndex';
import { PathIndex } from '../core/snap/indexes/PathIndex';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { VALUE_INDEX } from '../core/snap/indexes/ValueIndex';
import { Node } from '../core/snap/Node';
import { syncPointSetReferenceConstructor } from '../core/SyncPoint';
import { syncTreeSetReferenceConstructor } from '../core/SyncTree';
import { parseRepoInfo } from '../core/util/libs/parser';
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
import {
  fatal,
  MAX_NAME,
  MIN_NAME,
  ObjectToUniqueKey
} from '../core/util/util';
import {
  isValidPriority,
  validateFirebaseDataArg,
  validateFirebaseMergeDataArg,
  validateKey,
  validatePathString,
  validatePriority,
  validateRootPathString,
  validateUrl,
  validateWritablePath
} from '../core/util/validation';
import { Change } from '../core/view/Change';
import { CancelEvent, DataEvent, EventType } from '../core/view/Event';
import {
  CallbackContext,
  EventRegistration,
  QueryContext,
  UserCallback
} from '../core/view/EventRegistration';
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

import { FirebaseDatabase } from './Database';
import { OnDisconnect } from './OnDisconnect';
import {
  ListenOptions,
  Query as Query,
  Reference as Reference,
  Unsubscribe
} from './Reference';

export class QueryImpl implements Query, QueryContext {
  /**
   * @hideconstructor
   */
  constructor(
    readonly _repo: Repo,
    readonly _path: Path,
    readonly _queryParams: QueryParams,
    readonly _orderByCalled: boolean
  ) {}

  get key(): string | null {
    if (pathIsEmpty(this._path)) {
      return null;
    } else {
      return pathGetBack(this._path);
    }
  }

  get ref(): Reference {
    return new ReferenceImpl(this._repo, this._path);
  }

  get _queryIdentifier(): string {
    const obj = queryParamsGetQueryObject(this._queryParams);
    const id = ObjectToUniqueKey(obj);
    return id === '{}' ? 'default' : id;
  }

  /**
   * An object representation of the query parameters used by this Query.
   */
  get _queryObject(): object {
    return queryParamsGetQueryObject(this._queryParams);
  }

  isEqual(other: QueryImpl | null): boolean {
    other = getModularInstance(other);
    if (!(other instanceof QueryImpl)) {
      return false;
    }

    const sameRepo = this._repo === other._repo;
    const samePath = pathEquals(this._path, other._path);
    const sameQueryIdentifier =
      this._queryIdentifier === other._queryIdentifier;

    return sameRepo && samePath && sameQueryIdentifier;
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this._repo.toString() + pathToUrlEncodedString(this._path);
  }
}

/**
 * Validates that no other order by call has been made
 */
function validateNoPreviousOrderByCall(query: QueryImpl, fnName: string) {
  if (query._orderByCalled === true) {
    throw new Error(fnName + ": You can't combine multiple orderBy calls.");
  }
}

/**
 * Validates start/end values for queries.
 */
function validateQueryEndpoints(params: QueryParams) {
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
function validateLimit(params: QueryParams) {
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

export class ReferenceImpl extends QueryImpl implements Reference {
  /** @hideconstructor */
  constructor(repo: Repo, path: Path) {
    super(repo, path, new QueryParams(), false);
  }

  get parent(): ReferenceImpl | null {
    const parentPath = pathParent(this._path);
    return parentPath === null
      ? null
      : new ReferenceImpl(this._repo, parentPath);
  }

  get root(): ReferenceImpl {
    let ref: ReferenceImpl = this;
    while (ref.parent !== null) {
      ref = ref.parent;
    }
    return ref;
  }
}

export class DataSnapshot {
  /**
   * @param _node A SnapshotNode to wrap.
   * @param ref The location this snapshot came from.
   * @param _index The iteration order for this snapshot
   * @hideconstructor
   */
  constructor(
    readonly _node: Node,
    readonly ref: ReferenceImpl,
    readonly _index: Index
  ) {}

  get priority(): string | number | null {
    // typecast here because we never return deferred values or internal priorities (MAX_PRIORITY)
    return this._node.getPriority().val() as string | number | null;
  }

  get key(): string | null {
    return this.ref.key;
  }

  get size(): number {
    return this._node.numChildren();
  }

  child(path: string): DataSnapshot {
    const childPath = new Path(path);
    const childRef = child(this.ref, path);
    return new DataSnapshot(
      this._node.getChild(childPath),
      childRef,
      PRIORITY_INDEX
    );
  }

  exists(): boolean {
    return !this._node.isEmpty();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportVal(): any {
    return this._node.val(true);
  }

  forEach(action: (child: DataSnapshot) => boolean | void): boolean {
    if (this._node.isLeafNode()) {
      return false;
    }

    const childrenNode = this._node as ChildrenNode;
    // Sanitize the return value to a boolean. ChildrenNode.forEachChild has a weird return type...
    return !!childrenNode.forEachChild(this._index, (key, node) => {
      return action(
        new DataSnapshot(node, child(this.ref, key), PRIORITY_INDEX)
      );
    });
  }

  hasChild(path: string): boolean {
    const childPath = new Path(path);
    return !this._node.getChild(childPath).isEmpty();
  }

  hasChildren(): boolean {
    if (this._node.isLeafNode()) {
      return false;
    } else {
      return !this._node.isEmpty();
    }
  }

  toJSON(): object | null {
    return this.exportVal();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  val(): any {
    return this._node.val();
  }
}

export function ref(db: FirebaseDatabase, path?: string): ReferenceImpl {
  db = getModularInstance(db);
  db._checkNotDeleted('ref');
  return path !== undefined ? child(db._root, path) : db._root;
}

export function refFromURL(db: FirebaseDatabase, url: string): ReferenceImpl {
  db = getModularInstance(db);
  db._checkNotDeleted('refFromURL');
  const parsedURL = parseRepoInfo(url, db._repo.repoInfo_.nodeAdmin);
  validateUrl('refFromURL', parsedURL);

  const repoInfo = parsedURL.repoInfo;
  if (
    !db._repo.repoInfo_.isCustomHost() &&
    repoInfo.host !== db._repo.repoInfo_.host
  ) {
    fatal(
      'refFromURL' +
        ': Host name does not match the current database: ' +
        '(found ' +
        repoInfo.host +
        ' but expected ' +
        db._repo.repoInfo_.host +
        ')'
    );
  }

  return ref(db, parsedURL.path.toString());
}

export function child(ref: Reference, path: string): ReferenceImpl {
  ref = getModularInstance(ref);
  if (pathGetFront(ref._path) === null) {
    validateRootPathString('child', 'path', path, false);
  } else {
    validatePathString('child', 'path', path, false);
  }
  return new ReferenceImpl(ref._repo, pathChild(ref._path, path));
}

export function onDisconnect(ref: Reference): OnDisconnect {
  ref = getModularInstance(ref) as ReferenceImpl;
  return new OnDisconnect(ref._repo, ref._path);
}

export interface ThenableReferenceImpl
  extends ReferenceImpl,
    Pick<Promise<ReferenceImpl>, 'then' | 'catch'> {}

export function push(ref: Reference, value?: unknown): ThenableReferenceImpl {
  ref = getModularInstance(ref);
  validateWritablePath('push', ref._path);
  validateFirebaseDataArg('push', value, ref._path, true);
  const now = repoServerTime(ref._repo);
  const name = nextPushId(now);

  // push() returns a ThennableReference whose promise is fulfilled with a
  // regular Reference. We use child() to create handles to two different
  // references. The first is turned into a ThennableReference below by adding
  // then() and catch() methods and is used as the return value of push(). The
  // second remains a regular Reference and is used as the fulfilled value of
  // the first ThennableReference.
  const thennablePushRef: Partial<ThenableReferenceImpl> = child(ref, name);
  const pushRef = child(ref, name);

  let promise: Promise<ReferenceImpl>;
  if (value != null) {
    promise = set(pushRef, value).then(() => pushRef);
  } else {
    promise = Promise.resolve(pushRef);
  }

  thennablePushRef.then = promise.then.bind(promise);
  thennablePushRef.catch = promise.then.bind(promise, undefined);
  return thennablePushRef as ThenableReferenceImpl;
}

export function remove(ref: Reference): Promise<void> {
  validateWritablePath('remove', ref._path);
  return set(ref, null);
}

export function set(ref: Reference, value: unknown): Promise<void> {
  ref = getModularInstance(ref);
  validateWritablePath('set', ref._path);
  validateFirebaseDataArg('set', value, ref._path, false);
  const deferred = new Deferred<void>();
  repoSetWithPriority(
    ref._repo,
    ref._path,
    value,
    /*priority=*/ null,
    deferred.wrapCallback(() => {})
  );
  return deferred.promise;
}

export function setPriority(
  ref: Reference,
  priority: string | number | null
): Promise<void> {
  ref = getModularInstance(ref);
  validateWritablePath('setPriority', ref._path);
  validatePriority('setPriority', priority, false);
  const deferred = new Deferred<void>();
  repoSetWithPriority(
    ref._repo,
    pathChild(ref._path, '.priority'),
    priority,
    null,
    deferred.wrapCallback(() => {})
  );
  return deferred.promise;
}

export function setWithPriority(
  ref: Reference,
  value: unknown,
  priority: string | number | null
): Promise<void> {
  validateWritablePath('setWithPriority', ref._path);
  validateFirebaseDataArg('setWithPriority', value, ref._path, false);
  validatePriority('setWithPriority', priority, false);
  if (ref.key === '.length' || ref.key === '.keys') {
    throw 'setWithPriority failed: ' + ref.key + ' is a read-only object.';
  }

  const deferred = new Deferred<void>();
  repoSetWithPriority(
    ref._repo,
    ref._path,
    value,
    priority,
    deferred.wrapCallback(() => {})
  );
  return deferred.promise;
}

export function update(ref: Reference, values: object): Promise<void> {
  validateFirebaseMergeDataArg('update', values, ref._path, false);
  const deferred = new Deferred<void>();
  repoUpdate(
    ref._repo,
    ref._path,
    values as Record<string, unknown>,
    deferred.wrapCallback(() => {})
  );
  return deferred.promise;
}

export function get(query: Query): Promise<DataSnapshot> {
  const queryImpl = getModularInstance(query) as QueryImpl;
  return repoGetValue(query._repo, queryImpl).then(node => {
    return new DataSnapshot(
      node,
      new ReferenceImpl(query._repo, query._path),
      query._queryParams.getIndex()
    );
  });
}

/**
 * Represents registration for 'value' events.
 */
export class ValueEventRegistration implements EventRegistration {
  constructor(private callbackContext: CallbackContext) {}

  /**
   * @inheritDoc
   */
  respondsTo(eventType: string): boolean {
    return eventType === 'value';
  }

  /**
   * @inheritDoc
   */
  createEvent(change: Change, query: QueryContext): DataEvent {
    const index = query._queryParams.getIndex();
    return new DataEvent(
      'value',
      this,
      new DataSnapshot(
        change.snapshotNode,
        new ReferenceImpl(query._repo, query._path),
        index
      )
    );
  }

  /**
   * @inheritDoc
   */
  getEventRunner(eventData: CancelEvent | DataEvent): () => void {
    if (eventData.getEventType() === 'cancel') {
      return () =>
        this.callbackContext.onCancel((eventData as CancelEvent).error);
    } else {
      return () =>
        this.callbackContext.onValue((eventData as DataEvent).snapshot, null);
    }
  }

  /**
   * @inheritDoc
   */
  createCancelEvent(error: Error, path: Path): CancelEvent | null {
    if (this.callbackContext.hasCancelCallback) {
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
    } else if (!other.callbackContext || !this.callbackContext) {
      // If no callback specified, we consider it to match any callback.
      return true;
    } else {
      return other.callbackContext.matches(this.callbackContext);
    }
  }

  /**
   * @inheritDoc
   */
  hasAnyCallback(): boolean {
    return this.callbackContext !== null;
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
    private callbacks: {
      [child: string]: CallbackContext;
    } | null
  ) {}

  /**
   * @inheritDoc
   */
  respondsTo(eventType: string): boolean {
    let eventToCheck =
      eventType === 'children_added' ? 'child_added' : eventType;
    eventToCheck =
      eventToCheck === 'children_removed' ? 'child_removed' : eventToCheck;
    return contains(this.callbacks, eventToCheck);
  }

  /**
   * @inheritDoc
   */
  createCancelEvent(error: Error, path: Path): CancelEvent | null {
    if (this.callbacks['cancel'].hasCancelCallback) {
      return new CancelEvent(this, error, path);
    } else {
      return null;
    }
  }

  /**
   * @inheritDoc
   */
  createEvent(change: Change, query: QueryContext): DataEvent {
    assert(change.childName != null, 'Child events should have a childName.');
    const childRef = child(
      new ReferenceImpl(query._repo, query._path),
      change.childName
    );
    const index = query._queryParams.getIndex();
    return new DataEvent(
      change.type as EventType,
      this,
      new DataSnapshot(change.snapshotNode, childRef, index),
      change.prevName
    );
  }

  /**
   * @inheritDoc
   */
  getEventRunner(eventData: CancelEvent | DataEvent): () => void {
    if (eventData.getEventType() === 'cancel') {
      const cancelCB = this.callbacks['cancel'];
      return () => cancelCB.onCancel((eventData as CancelEvent).error);
    } else {
      const cb = this.callbacks[(eventData as DataEvent).eventType];
      return () =>
        cb.onValue(
          (eventData as DataEvent).snapshot,
          (eventData as DataEvent).prevName
        );
    }
  }

  /**
   * @inheritDoc
   */
  matches(other: EventRegistration): boolean {
    if (other instanceof ChildEventRegistration) {
      if (!this.callbacks || !other.callbacks) {
        return true;
      } else {
        const otherKeys = Object.keys(other.callbacks);
        const thisKeys = Object.keys(this.callbacks);
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
              (!other.callbacks[otherKey] ||
                !this.callbacks[thisKey] ||
                other.callbacks[otherKey].matches(this.callbacks[thisKey]))
            );
          } else {
            // Exact match on each key.
            return thisKeys.every(eventType =>
              other.callbacks[eventType].matches(this.callbacks[eventType])
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
    return this.callbacks !== null;
  }
}

function addEventListener(
  query: Query,
  eventType: EventType,
  callback: UserCallback,
  cancelCallbackOrListenOptions?: ((error: Error) => unknown) | ListenOptions,
  options?: ListenOptions
) {
  let cancelCallback: ((error: Error) => unknown) | undefined;
  if (typeof cancelCallbackOrListenOptions === 'object') {
    cancelCallback = undefined;
    options = cancelCallbackOrListenOptions;
  }
  if (typeof cancelCallbackOrListenOptions === 'function') {
    cancelCallback = cancelCallbackOrListenOptions;
  }

  if (options && options.onlyOnce) {
    const userCallback = callback;
    const onceCallback: UserCallback = (dataSnapshot, previousChildName) => {
      userCallback(dataSnapshot, previousChildName);
      repoRemoveEventCallbackForQuery(query._repo, query, container);
    };
    onceCallback.userCallback = callback.userCallback;
    onceCallback.context = callback.context;
    callback = onceCallback;
  }

  const callbackContext = new CallbackContext(
    callback,
    cancelCallback || undefined
  );
  const container =
    eventType === 'value'
      ? new ValueEventRegistration(callbackContext)
      : new ChildEventRegistration({
          [eventType]: callbackContext
        });
  repoAddEventCallbackForQuery(query._repo, query, container);
  return () => repoRemoveEventCallbackForQuery(query._repo, query, container);
}

export function onValue(
  query: Query,
  callback: (snapshot: DataSnapshot) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onValue(
  query: Query,
  callback: (snapshot: DataSnapshot) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onValue(
  query: Query,
  callback: (snapshot: DataSnapshot) => unknown,
  cancelCallback: (error: Error) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onValue(
  query: Query,
  callback: (snapshot: DataSnapshot) => unknown,
  cancelCallbackOrListenOptions?: ((error: Error) => unknown) | ListenOptions,
  options?: ListenOptions
): Unsubscribe {
  return addEventListener(
    query,
    'value',
    callback,
    cancelCallbackOrListenOptions,
    options
  );
}

export function onChildAdded(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onChildAdded(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onChildAdded(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallback: (error: Error) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onChildAdded(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallbackOrListenOptions?: ((error: Error) => unknown) | ListenOptions,
  options?: ListenOptions
): Unsubscribe {
  return addEventListener(
    query,
    'child_added',
    callback,
    cancelCallbackOrListenOptions,
    options
  );
}

export function onChildChanged(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onChildChanged(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onChildChanged(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallback: (error: Error) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onChildChanged(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallbackOrListenOptions?: ((error: Error) => unknown) | ListenOptions,
  options?: ListenOptions
): Unsubscribe {
  return addEventListener(
    query,
    'child_changed',
    callback,
    cancelCallbackOrListenOptions,
    options
  );
}

export function onChildMoved(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onChildMoved(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onChildMoved(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallback: (error: Error) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onChildMoved(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallbackOrListenOptions?: ((error: Error) => unknown) | ListenOptions,
  options?: ListenOptions
): Unsubscribe {
  return addEventListener(
    query,
    'child_moved',
    callback,
    cancelCallbackOrListenOptions,
    options
  );
}

export function onChildRemoved(
  query: Query,
  callback: (snapshot: DataSnapshot) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onChildRemoved(
  query: Query,
  callback: (snapshot: DataSnapshot) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onChildRemoved(
  query: Query,
  callback: (snapshot: DataSnapshot) => unknown,
  cancelCallback: (error: Error) => unknown,
  options: ListenOptions
): Unsubscribe;
export function onChildRemoved(
  query: Query,
  callback: (snapshot: DataSnapshot) => unknown,
  cancelCallbackOrListenOptions?: ((error: Error) => unknown) | ListenOptions,
  options?: ListenOptions
): Unsubscribe {
  return addEventListener(
    query,
    'child_removed',
    callback,
    cancelCallbackOrListenOptions,
    options
  );
}

export { EventType };

export function off(
  query: Query,
  eventType?: EventType,
  callback?: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown
): void {
  let container: EventRegistration | null = null;
  let callbacks: { [k: string]: CallbackContext } | null = null;
  const expCallback = callback ? new CallbackContext(callback) : null;
  if (eventType === 'value') {
    container = new ValueEventRegistration(expCallback);
  } else if (eventType) {
    if (callback) {
      callbacks = {};
      callbacks[eventType] = expCallback;
    }
    container = new ChildEventRegistration(callbacks);
  }
  repoRemoveEventCallbackForQuery(query._repo, query, container);
}

/** Describes the different query constraints available in this SDK. */
export type QueryConstraintType =
  | 'endAt'
  | 'endBefore'
  | 'startAt'
  | 'startAfter'
  | 'limitToFirst'
  | 'limitToLast'
  | 'orderByChild'
  | 'orderByKey'
  | 'orderByPriority'
  | 'orderByValue'
  | 'equalTo';

/**
 * A `QueryConstraint` is used to narrow the set of documents returned by a
 * Database query. `QueryConstraint`s are created by invoking {@link endAt},
 * {@link endBefore}, {@link startAt}, {@link startAfter}, {@link
 * limitToFirst}, {@link limitToLast}, {@link orderByChild},
 * {@link orderByChild}, {@link orderByKey} , {@link orderByPriority} ,
 * {@link orderByValue}  or {@link equalTo} and
 * can then be passed to {@link query} to create a new query instance that
 * also contains this `QueryConstraint`.
 */
export abstract class QueryConstraint {
  /** The type of this query constraints */
  abstract readonly type: QueryConstraintType;

  /**
   * Takes the provided `Query` and returns a copy of the `Query` with this
   * `QueryConstraint` applied.
   */
  abstract _apply<T>(query: QueryImpl): QueryImpl;
}

class QueryEndAtConstraint extends QueryConstraint {
  readonly type: 'endAt';

  constructor(
    private readonly _value: number | string | boolean | null,
    private readonly _key?: string
  ) {
    super();
  }

  _apply<T>(query: QueryImpl): QueryImpl {
    validateFirebaseDataArg('endAt', this._value, query._path, true);
    const newParams = queryParamsEndAt(
      query._queryParams,
      this._value,
      this._key
    );
    validateLimit(newParams);
    validateQueryEndpoints(newParams);
    if (query._queryParams.hasEnd()) {
      throw new Error(
        'endAt: Starting point was already set (by another call to endAt, ' +
          'endBefore or equalTo).'
      );
    }
    return new QueryImpl(
      query._repo,
      query._path,
      newParams,
      query._orderByCalled
    );
  }
}

export function endAt(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  validateKey('endAt', 'key', key, true);
  return new QueryEndAtConstraint(value, key);
}

class QueryEndBeforeConstraint extends QueryConstraint {
  readonly type: 'endBefore';

  constructor(
    private readonly _value: number | string | boolean | null,
    private readonly _key?: string
  ) {
    super();
  }

  _apply<T>(query: QueryImpl): QueryImpl {
    validateFirebaseDataArg('endBefore', this._value, query._path, false);
    const newParams = queryParamsEndBefore(
      query._queryParams,
      this._value,
      this._key
    );
    validateLimit(newParams);
    validateQueryEndpoints(newParams);
    if (query._queryParams.hasEnd()) {
      throw new Error(
        'endBefore: Starting point was already set (by another call to endAt, ' +
          'endBefore or equalTo).'
      );
    }
    return new QueryImpl(
      query._repo,
      query._path,
      newParams,
      query._orderByCalled
    );
  }
}

export function endBefore(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  validateKey('endBefore', 'key', key, true);
  return new QueryEndBeforeConstraint(value, key);
}

class QueryStartAtConstraint extends QueryConstraint {
  readonly type: 'startAt';

  constructor(
    private readonly _value: number | string | boolean | null,
    private readonly _key?: string
  ) {
    super();
  }

  _apply<T>(query: QueryImpl): QueryImpl {
    validateFirebaseDataArg('startAt', this._value, query._path, true);
    const newParams = queryParamsStartAt(
      query._queryParams,
      this._value,
      this._key
    );
    validateLimit(newParams);
    validateQueryEndpoints(newParams);
    if (query._queryParams.hasStart()) {
      throw new Error(
        'startAt: Starting point was already set (by another call to startAt, ' +
          'startBefore or equalTo).'
      );
    }
    return new QueryImpl(
      query._repo,
      query._path,
      newParams,
      query._orderByCalled
    );
  }
}

export function startAt(
  value: number | string | boolean | null = null,
  key?: string
): QueryConstraint {
  validateKey('startAt', 'key', key, true);
  return new QueryStartAtConstraint(value, key);
}

class QueryStartAfterConstraint extends QueryConstraint {
  readonly type: 'startAfter';

  constructor(
    private readonly _value: number | string | boolean | null,
    private readonly _key?: string
  ) {
    super();
  }

  _apply<T>(query: QueryImpl): QueryImpl {
    validateFirebaseDataArg('startAfter', this._value, query._path, false);
    const newParams = queryParamsStartAfter(
      query._queryParams,
      this._value,
      this._key
    );
    validateLimit(newParams);
    validateQueryEndpoints(newParams);
    if (query._queryParams.hasStart()) {
      throw new Error(
        'startAfter: Starting point was already set (by another call to startAt, ' +
          'startAfter, or equalTo).'
      );
    }
    return new QueryImpl(
      query._repo,
      query._path,
      newParams,
      query._orderByCalled
    );
  }
}

export function startAfter(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  validateKey('startAfter', 'key', key, true);
  return new QueryStartAfterConstraint(value, key);
}

class QueryLimitToFirstConstraint extends QueryConstraint {
  readonly type: 'limitToFirst';

  constructor(private readonly _limit: number) {
    super();
  }

  _apply<T>(query: QueryImpl): QueryImpl {
    if (query._queryParams.hasLimit()) {
      throw new Error(
        'limitToFirst: Limit was already set (by another call to limitToFirst ' +
          'or limitToLast).'
      );
    }
    return new QueryImpl(
      query._repo,
      query._path,
      queryParamsLimitToFirst(query._queryParams, this._limit),
      query._orderByCalled
    );
  }
}

export function limitToFirst(limit: number): QueryConstraint {
  if (typeof limit !== 'number' || Math.floor(limit) !== limit || limit <= 0) {
    throw new Error('limitToFirst: First argument must be a positive integer.');
  }
  return new QueryLimitToFirstConstraint(limit);
}

class QueryLimitToLastConstraint extends QueryConstraint {
  readonly type: 'limitToLast';

  constructor(private readonly _limit: number) {
    super();
  }

  _apply<T>(query: QueryImpl): QueryImpl {
    if (query._queryParams.hasLimit()) {
      throw new Error(
        'limitToLast: Limit was already set (by another call to limitToFirst ' +
          'or limitToLast).'
      );
    }
    return new QueryImpl(
      query._repo,
      query._path,
      queryParamsLimitToLast(query._queryParams, this._limit),
      query._orderByCalled
    );
  }
}

export function limitToLast(limit: number): QueryConstraint {
  if (typeof limit !== 'number' || Math.floor(limit) !== limit || limit <= 0) {
    throw new Error('limitToLast: First argument must be a positive integer.');
  }

  return new QueryLimitToLastConstraint(limit);
}

class QueryOrderByChildConstraint extends QueryConstraint {
  readonly type: 'orderByChild';

  constructor(private readonly _path: string) {
    super();
  }

  _apply<T>(query: QueryImpl): QueryImpl {
    validateNoPreviousOrderByCall(query, 'orderByChild');
    const parsedPath = new Path(this._path);
    if (pathIsEmpty(parsedPath)) {
      throw new Error(
        'orderByChild: cannot pass in empty path. Use orderByValue() instead.'
      );
    }
    const index = new PathIndex(parsedPath);
    const newParams = queryParamsOrderBy(query._queryParams, index);
    validateQueryEndpoints(newParams);

    return new QueryImpl(
      query._repo,
      query._path,
      newParams,
      /*orderByCalled=*/ true
    );
  }
}

export function orderByChild(path: string): QueryConstraint {
  if (path === '$key') {
    throw new Error(
      'orderByChild: "$key" is invalid.  Use orderByKey() instead.'
    );
  } else if (path === '$priority') {
    throw new Error(
      'orderByChild: "$priority" is invalid.  Use orderByPriority() instead.'
    );
  } else if (path === '$value') {
    throw new Error(
      'orderByChild: "$value" is invalid.  Use orderByValue() instead.'
    );
  }
  validatePathString('orderByChild', 'path', path, false);
  return new QueryOrderByChildConstraint(path);
}

class QueryOrderByKeyConstraint extends QueryConstraint {
  readonly type: 'orderByKey';

  _apply<T>(query: QueryImpl): QueryImpl {
    validateNoPreviousOrderByCall(query, 'orderByKey');
    const newParams = queryParamsOrderBy(query._queryParams, KEY_INDEX);
    validateQueryEndpoints(newParams);
    return new QueryImpl(
      query._repo,
      query._path,
      newParams,
      /*orderByCalled=*/ true
    );
  }
}

export function orderByKey(): QueryConstraint {
  return new QueryOrderByKeyConstraint();
}

class QueryOrderByPriorityConstraint extends QueryConstraint {
  readonly type: 'orderByPriority';

  _apply<T>(query: QueryImpl): QueryImpl {
    validateNoPreviousOrderByCall(query, 'orderByPriority');
    const newParams = queryParamsOrderBy(query._queryParams, PRIORITY_INDEX);
    validateQueryEndpoints(newParams);
    return new QueryImpl(
      query._repo,
      query._path,
      newParams,
      /*orderByCalled=*/ true
    );
  }
}

export function orderByPriority(): QueryConstraint {
  return new QueryOrderByPriorityConstraint();
}

class QueryOrderByValueConstraint extends QueryConstraint {
  readonly type: 'orderByValue';

  _apply<T>(query: QueryImpl): QueryImpl {
    validateNoPreviousOrderByCall(query, 'orderByValue');
    const newParams = queryParamsOrderBy(query._queryParams, VALUE_INDEX);
    validateQueryEndpoints(newParams);
    return new QueryImpl(
      query._repo,
      query._path,
      newParams,
      /*orderByCalled=*/ true
    );
  }
}

export function orderByValue(): QueryConstraint {
  return new QueryOrderByValueConstraint();
}

class QueryEqualToValueConstraint extends QueryConstraint {
  readonly type: 'equalTo';

  constructor(
    private readonly _value: number | string | boolean | null,
    private readonly _key?: string
  ) {
    super();
  }

  _apply<T>(query: QueryImpl): QueryImpl {
    validateFirebaseDataArg('equalTo', this._value, query._path, false);
    if (query._queryParams.hasStart()) {
      throw new Error(
        'equalTo: Starting point was already set (by another call to startAt/startAfter or ' +
          'equalTo).'
      );
    }
    if (query._queryParams.hasEnd()) {
      throw new Error(
        'equalTo: Ending point was already set (by another call to endAt/endBefore or ' +
          'equalTo).'
      );
    }
    return new QueryEndAtConstraint(this._value, this._key)._apply(
      new QueryStartAtConstraint(this._value, this._key)._apply(query)
    );
  }
}

export function equalTo(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  validateKey('equalTo', 'key', key, true);
  return new QueryEqualToValueConstraint(value, key);
}

/**
 * Creates a new immutable instance of `Query` that is extended to also include
 * additional query constraints.
 *
 * @param query - The Query instance to use as a base for the new constraints.
 * @param queryConstraints - The list of `QueryConstraint`s to apply.
 * @throws if any of the provided query constraints cannot be combined with the
 * existing or new constraints.
 */
export function query(
  query: Query,
  ...queryConstraints: QueryConstraint[]
): QueryImpl {
  let queryImpl = getModularInstance(query) as QueryImpl;
  for (const constraint of queryConstraints) {
    queryImpl = constraint._apply(queryImpl);
  }
  return queryImpl;
}

/**
 * Define reference constructor in various modules
 *
 * We are doing this here to avoid several circular
 * dependency issues
 */
syncPointSetReferenceConstructor(ReferenceImpl);
syncTreeSetReferenceConstructor(ReferenceImpl);
