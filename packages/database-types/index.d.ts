/**
 * Copyright 2017 Google Inc.
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
  forEach(action: (a: DataSnapshot) => boolean): boolean;
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

  app: FirebaseApp;
  goOffline(): void;
  goOnline(): void;
  ref(path?: string | Reference): Reference;
  refFromURL(url: string): Reference;
}

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

export interface Query {
  endAt(value: number | string | boolean | null, key?: string): Query;
  equalTo(value: number | string | boolean | null, key?: string): Query;
  isEqual(other: Query | null): boolean;
  limitToFirst(limit: number): Query;
  limitToLast(limit: number): Query;
  off(
    eventType?: string,
    callback?: (a: DataSnapshot, b?: string | null) => any,
    context?: Object | null
  ): any;
  on(
    eventType: string,
    callback: (a: DataSnapshot | null, b?: string) => any,
    cancelCallbackOrContext?: Object | null,
    context?: Object | null
  ): (a: DataSnapshot | null, b?: string) => any;
  once(
    eventType: string,
    successCallback?: (a: DataSnapshot, b?: string) => any,
    failureCallbackOrContext?: Object | null,
    context?: Object | null
  ): Promise<any>;
  orderByChild(path: string): Query;
  orderByKey(): Query;
  orderByPriority(): Query;
  orderByValue(): Query;
  ref: Reference;
  startAt(value: number | string | boolean | null, key?: string): Query;
  toJSON(): Object;
  toString(): string;
}

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
  update(values: Object, onComplete?: (a: Error | null) => any): Promise<any>;
}

export interface ServerValue {
  TIMESTAMP: {
    '.sv': string;
  };
}

export interface ThenableReference extends Reference, PromiseLike<Reference> {}

export function enableLogging(
  logger?: boolean | ((a: string) => any),
  persistent?: boolean
): any;
