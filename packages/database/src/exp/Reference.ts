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

import { Query } from './Query';

export class Reference extends Query {
  private constructor() {
    super();
  }

  key: string | null;
  parent: Reference | null;
  root: Reference;
}

export interface OnDisconnect {
  cancel(): Promise<void>;
  remove(): Promise<void>;
  set(value: unknown): Promise<void>;
  setWithPriority(
    value: unknown,
    priority: number | string | null
  ): Promise<void>;
  update(values: object): Promise<void>;
}

export interface ThenableReference
  extends Reference,
    Pick<Promise<Reference>, 'then' | 'catch'> {}

export function child(ref: Reference, path: string): Reference {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
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
