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

export interface DataSnapshot {
  child(path: string): DataSnapshot;
  exists(): boolean;
  exportVal(): any;
  forEach(action: (a: DataSnapshot) => boolean | void): boolean;
  getPriority(): string | number | null;
  hasChild(path: string): boolean;
  hasChildren(): boolean;
  key: string | null;
  numChildren(): number;
  ref: Reference;
  toJSON(): Object | null;
  val(): any;
}

export class FirebaseDatabase {
  private constructor();
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
  cancel(onComplete?: (a: Error | null) => any): Promise<void>;
  remove(onComplete?: (a: Error | null) => any): Promise<void>;
  set(value: any, onComplete?: (a: Error | null) => any): Promise<void>;
  setWithPriority(
    value: any,
    priority: number | string | null,
    onComplete?: (a: Error | null) => any
  ): Promise<any>;
  update(values: Object, onComplete?: (a: Error | null) => any): Promise<any>;
}

type EventType =
  | 'value'
  | 'child_added'
  | 'child_changed'
  | 'child_moved'
  | 'child_removed';

export interface Query {
  ref: Reference;
  isEqual(other: Query | null): boolean;
  toJSON(): Object;
  toString(): string;
}

export function get(query: Query): Promise<DataSnapshot>;
export function on(
  query: Query,
  eventType: EventType,
  callback: (a: DataSnapshot, b?: string | null) => any,
  cancelCallbackOrContext?: ((a: Error) => any) | Object | null,
  context?: Object | null
): (a: DataSnapshot, b?: string | null) => any;
export function off(
  query: Query,
  eventType?: EventType,
  callback?: (a: DataSnapshot, b?: string | null) => any,
  context?: Object | null
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
export function startAftr(
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

export interface Reference extends Query {
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
  newVal: any,
  newPriority: string | number | null
): Promise<void>;
export function transaction(
  ref: Reference,
  transactionUpdate: (a: any) => unknown,
  applyLocally?: boolean
): Promise<void>;
export function update(ref: Reference, values: Object): Promise<void>;

export interface ServerValue {
  TIMESTAMP: Object;
  increment(delta: number): Object;
}

export interface ThenableReference
  extends Reference,
    Pick<Promise<Reference>, 'then' | 'catch'> {}

export function enableLogging(
  logger?: boolean | ((a: string) => any),
  persistent?: boolean
): any;

declare module '@firebase/component' {
  interface NameServiceMapping {
    'database': FirebaseDatabase;
  }
}
