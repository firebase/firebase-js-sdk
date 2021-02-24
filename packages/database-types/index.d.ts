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

import { FirebaseApp } from '@firebase/app-types';

export function getDatabase(app: FirebaseApp): FirebaseDatabase;

export class DataSnapshot {
  private constructor();
  priority: string | number | null;
  numChildren: number;
  key: string | null;
  ref: Reference;

  child(path: string): DataSnapshot;
  exists(): boolean;
  exportVal(): any;
  forEach(action: (child: DataSnapshot) => boolean | void): boolean;
  hasChild(path: string): boolean;
  hasChildren(): boolean;
  toJSON(): object | null;
  val(): any;
}

export class FirebaseDatabase {
  private constructor();
  // This type property should likely be added to other Firebase Products. It
  // helps distinguish the different SDKs as at least Firestore and RTDB have no
  // other properties.
  'type': 'database';
  app: FirebaseApp;
}

export function useDatabaseEmulator(
  db: FirebaseDatabase,
  host: string,
  port: number
): void;
export function goOffline(db: FirebaseDatabase): void;
export function goOnline(db: FirebaseDatabase): void;
export function ref(db: FirebaseDatabase, path?: string | Reference): Reference;
export function refFromURL(db: FirebaseDatabase, url: string): Reference;

export interface OnDisconnect {
  cancel(onComplete?: (error: Error | null) => any): Promise<void>;
  remove(onComplete?: (error: Error | null) => any): Promise<void>;
  set(value: unknown, onComplete?: (error: Error | null) => any): Promise<void>;
  setWithPriority(
    value: unknown,
    priority: number | string | null,
    onComplete?: (error: Error | null) => any
  ): Promise<any>;
  update(
    values: object,
    onComplete?: (error: Error | null) => any
  ): Promise<void>;
}

export class Query {
  protected constructor();
  ref: Reference;
  isEqual(other: Query | null): boolean;
  toJSON(): object;
  toString(): string;
}

export function get(query: Query): Promise<DataSnapshot>;

export type Unsubscribe = () => {};
export interface ListenOptions {
  readonly once?: boolean;
}

export function onValue(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onValue(
  options: ListenOptions,
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;

export function onChildAdded(
  options: ListenOptions,
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
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;

export function onChildChanged(
  options: ListenOptions,
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onChildChanged(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;

export function onChildMoved(
  options: ListenOptions,
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onChildMoved(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;

export function onChildRemoved(
  options: ListenOptions,
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;
export function onChildRemoved(
  query: Query,
  callback: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown,
  cancelCallback?: (error: Error) => unknown
): Unsubscribe;

export function off(
  query: Query,
  callback?: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown
): void;

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
): QueryConstraint;
export function endBefore(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint;
export function startAt(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint;
export function startAfter(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint;
export function limitToFirst(limit: number): QueryConstraint;
export function limitToLast(limit: number): QueryConstraint;
export function orderByChild(path: string): QueryConstraint;
export function orderByKey(): QueryConstraint;
export function orderByPriority(): QueryConstraint;
export function orderByValue(): QueryConstraint;
export function equalTo(
  value: number | string | boolean | null,
  key?: string
): QueryConstraint;

export function query(query: Query, ...constraints: QueryConstraint[]): Query;

export class Reference extends Query {
  private constructor();
  key: string | null;
  parent: Reference | null;
  root: Reference;
}

export function child(ref: Reference, path: string): Reference;
export function onDisconnect(ref: Reference): OnDisconnect;

export function push(ref: Reference, value?: unknown): ThenableReference;
export function remove(ref: Reference): Promise<void>;
export function set(ref: Reference, value: unknown): Promise<void>;
export function setPriority(
  ref: Reference,
  priority: string | number | null
): Promise<void>;
export function setWithPriority(
  ref: Reference,
  newVal: unknown,
  newPriority: string | number | null
): Promise<void>;
export function update(ref: Reference, values: object): Promise<void>;

export interface TransactionOptions {
  readonly applyLocally?: boolean;
}

export function transaction(
  ref: Reference,
  transactionUpdate: (currentData: any) => unknown
): Promise<void>;
export function transaction(
  options: TransactionOptions,
  ref: Reference,
  transactionUpdate: (currentData: any) => unknown
): Promise<void>;

export class ServerValue {
  private constructor();
  TIMESTAMP: object;
  static increment(delta: number): object;
}

export interface ThenableReference
  extends Reference,
    Pick<Promise<Reference>, 'then' | 'catch'> {}

export function enableLogging(
  logger?: boolean | ((message: string) => unknown),
  persistent?: boolean
): void;
