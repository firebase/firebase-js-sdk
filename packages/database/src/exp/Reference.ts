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
import { Repo } from '../core/Repo';
import {
  Path,
  pathChild,
  pathGetBack,
  pathIsEmpty,
  pathParent
} from '../core/util/Path';

export class Reference extends Query {
  root: Reference;

  constructor(readonly _repo: Repo, readonly _path: Path) {
    super();
  }

  get key(): string | null {
    if (pathIsEmpty(this._path)) {
      return null;
    } else {
      return pathGetBack(this._path);
    }
  }

  get parent(): Reference | null {
    const parentPath = pathParent(this._path);
    return parentPath === null ? null : new Reference(this._repo, parentPath);
  }
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
  // TODO: Accept Compat class
  return new Reference(ref._repo, pathChild(ref._path, path));
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
