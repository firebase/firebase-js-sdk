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

import { DataSnapshot } from './DataSnapshot';
import { Reference } from './Reference';

export class Query {
  protected constructor() {}
  ref: Reference;

  isEqual(other: Query | null): boolean {
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

export function get(query: Query): Promise<DataSnapshot> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export type Unsubscribe = () => {};
export interface ListenOptions {
  readonly onlyOnce?: boolean;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function off(
  query: Query,
  callback?: (
    snapshot: DataSnapshot,
    previousChildName?: string | null
  ) => unknown
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
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
