import { Repo } from '../core/Repo';
import { Path } from '../core/util/Path';
import { QueryContext } from '../core/view/EventRegistration';

/**
 * @license
 * Copyright 2021 Google LLC
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

export interface Query extends QueryContext {
  readonly ref: Reference;
  isEqual(other: Query | null): boolean;
  toJSON(): string;
  toString(): string;
}

export interface Reference extends Query {
  readonly key: string | null;
  readonly parent: Reference | null;
}

export interface ThenableReference
  extends Reference,
    Pick<Promise<Reference>, 'then' | 'catch'> {}

export type Unsubscribe = () => void;

export interface ListenOptions {
  readonly onlyOnce?: boolean;
}

export interface ReferenceConstructor {
  new (repo: Repo, path: Path): Reference;
}
