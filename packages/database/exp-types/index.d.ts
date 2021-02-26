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

// eslint-disable-next-line import/no-extraneous-dependencies
import { FirebaseApp } from '@firebase/app';

/**
 * @public
 */
export declare function getDatabase(app: FirebaseApp, url?: string): Database;

/**
 * @public
 */
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
  toJSON(): object | null;
  val(): any;
}

/**
 * @public
 */
export interface Database {
  app: FirebaseApp;
  useEmulator(host: string, port: number): void;
  goOffline(): void;
  goOnline(): void;
  ref(path?: string | Reference): Reference;
  refFromURL(url: string): Reference;
}

/**
 * @public
 */
export interface OnDisconnect {
  cancel(onComplete?: (a: Error | null) => any): Promise<void>;
  remove(onComplete?: (a: Error | null) => any): Promise<void>;
  set(value: any, onComplete?: (a: Error | null) => any): Promise<void>;
  setWithPriority(
    value: any,
    priority: number | string | null,
    onComplete?: (a: Error | null) => any
  ): Promise<any>;
  update(values: object, onComplete?: (a: Error | null) => any): Promise<any>;
}

/**
 * @public
 */
type EventType =
  | 'value'
  | 'child_added'
  | 'child_changed'
  | 'child_moved'
  | 'child_removed';

/**
 * @public
 */
export interface Query {
  endAt(value: number | string | boolean | null, key?: string): Query;
  equalTo(value: number | string | boolean | null, key?: string): Query;
  isEqual(other: Query | null): boolean;
  limitToFirst(limit: number): Query;
  limitToLast(limit: number): Query;
  off(
    eventType?: EventType,
    callback?: (a: DataSnapshot, b?: string | null) => any,
    context?: object | null
  ): void;
  get(): Promise<DataSnapshot>;
  on(
    eventType: EventType,
    callback: (a: DataSnapshot, b?: string | null) => any,
    cancelCallbackOrContext?: ((a: Error) => any) | object | null,
    context?: object | null
  ): (a: DataSnapshot, b?: string | null) => any;
  once(
    eventType: EventType,
    successCallback?: (a: DataSnapshot, b?: string | null) => any,
    failureCallbackOrContext?: ((a: Error) => void) | object | null,
    context?: object | null
  ): Promise<DataSnapshot>;
  orderByChild(path: string): Query;
  orderByKey(): Query;
  orderByPriority(): Query;
  orderByValue(): Query;
  ref: Reference;
  startAt(value: number | string | boolean | null, key?: string): Query;
  toJSON(): object;
  toString(): string;
}

/**
 * @public
 */
export interface Reference extends Query {
  child(path: string): Reference;
  key: string | null;
  onDisconnect(): OnDisconnect;
  parent: Reference | null;
  push(value?: any, onComplete?: (a: Error | null) => any): ThenableReference;
  remove(onComplete?: (a: Error | null) => any): Promise<any>;
  root: Reference;
  set(value: any, onComplete?: (a: Error | null) => any): Promise<any>;
  setPriority(
    priority: string | number | null,
    onComplete: (a: Error | null) => any
  ): Promise<any>;
  setWithPriority(
    newVal: any,
    newPriority: string | number | null,
    onComplete?: (a: Error | null) => any
  ): Promise<any>;
  transaction(
    transactionUpdate: (a: any) => any,
    onComplete?: (a: Error | null, b: boolean, c: DataSnapshot | null) => any,
    applyLocally?: boolean
  ): Promise<any>;
  update(values: object, onComplete?: (a: Error | null) => any): Promise<any>;
}

/**
 * @public
 */
export declare const ServerValue: {
  TIMESTAMP: object;
  increment(delta: number): object;
};

/**
 * @public
 */
export interface ThenableReference
  extends Reference,
    Pick<Promise<Reference>, 'then' | 'catch'> {}

/**
 * @public
 */
export function enableLogging(
  logger?: boolean | ((a: string) => any),
  persistent?: boolean
): any;
