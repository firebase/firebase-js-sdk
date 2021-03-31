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

import { assert, contains } from '@firebase/util';

import {
  Repo,
  repoAddEventCallbackForQuery,
  repoRemoveEventCallbackForQuery
} from '../core/Repo';
import { ChildrenNode } from '../core/snap/ChildrenNode';
import { Index } from '../core/snap/indexes';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { Node } from '../core/snap/Node';
import { syncPointSetReferenceConstructor } from '../core/SyncPoint';
import { syncTreeSetReferenceConstructor } from '../core/SyncTree';
import {
  Path,
  pathChild,
  pathGetBack,
  pathIsEmpty,
  pathParent
} from '../core/util/Path';
import { ObjectToUniqueKey } from '../core/util/util';
import { Change } from '../core/view/Change';
import { CancelEvent, DataEvent, EventType } from '../core/view/Event';
import {
  CallbackContext,
  EventRegistration,
  QueryContext
} from '../core/view/EventRegistration';
import {
  QueryParams,
  queryParamsGetQueryObject
} from '../core/view/QueryParams';

import { FirebaseDatabase } from './Database';
import {
  ListenOptions,
  OnDisconnect,
  Query as Query,
  Reference as Reference,
  ThenableReference,
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
    private readonly _orderByCalled: boolean
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  }

  toJSON(): object {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  }

  toString(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  }
}

export class ReferenceImpl extends QueryImpl implements Reference {
  root: Reference;

  /** @hideconstructor */
  constructor(repo: Repo, path: Path) {
    super(repo, path, new QueryParams(), false);
  }

  get parent(): Reference | null {
    const parentPath = pathParent(this._path);
    return parentPath === null
      ? null
      : new ReferenceImpl(this._repo, parentPath);
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
    readonly ref: Reference,
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

export function ref(db: FirebaseDatabase, path?: string): Reference {
  return new ReferenceImpl(db._repo, new Path(path || ''));
}

export function refFromURL(db: FirebaseDatabase, url: string): Reference {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function child(ref: Reference, path: string): Reference {
  // TODO: Accept Compat class
  return new ReferenceImpl(ref._repo, pathChild(ref._path, path));
}

export function onDisconnect(ref: Reference): OnDisconnect {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function push(ref: Reference, value?: unknown): ThenableReference {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function remove(ref: Reference): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function set(ref: Reference, value: unknown): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function setPriority(
  ref: Reference,
  priority: string | number | null
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function setWithPriority(
  ref: Reference,
  newVal: unknown,
  newPriority: string | number | null
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function update(ref: Reference, values: object): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function get(query: Query): Promise<DataSnapshot> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
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
  callback: (
    snapshot: DataSnapshot,
    previousChildName: string | null
  ) => unknown,
  cancelCallbackOrListenOptions: ((error: Error) => unknown) | ListenOptions,
  options: ListenOptions
) {
  let cancelCallback: ((error: Error) => unknown) | undefined;
  if (typeof cancelCallbackOrListenOptions === 'object') {
    cancelCallback = undefined;
    options = cancelCallbackOrListenOptions;
  }
  if (typeof cancelCallbackOrListenOptions === 'function') {
    cancelCallback = cancelCallbackOrListenOptions;
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

export interface QueryConstraint {
  type:
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
}

export function endAt(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function endBefore(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function startAt(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function startAfter(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function limitToFirst(limit: number): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function limitToLast(limit: number): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function orderByChild(path: string): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function orderByKey(): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function orderByPriority(): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function orderByValue(): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function equalTo(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function query(query: Query, ...constraints: QueryConstraint[]): Query {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

/**
 * Define reference constructor in various modules
 *
 * We are doing this here to avoid several circular
 * dependency issues
 */
syncPointSetReferenceConstructor(ReferenceImpl);
syncTreeSetReferenceConstructor(ReferenceImpl);
