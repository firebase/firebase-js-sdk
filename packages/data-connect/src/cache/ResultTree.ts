/**
 * @license
 * Copyright 2025 Google LLC
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

import { EntityNode, DehydratedStubDataObject } from './EntityNode';

export class ResultTree {
  /**
   * Create a {@link ResultTree} from a dehydrated JSON object.
   * @param value The dehydrated JSON object.
   * @returns The {@link ResultTree}.
   */
  static fromJson(value: DehydratedResultTreeJson): ResultTree {
    return new ResultTree(
      EntityNode.fromJson(value.rootStub),
      value.maxAge,
      value.cachedAt,
      value.lastAccessed
    );
  }
  constructor(
    private rootStub: EntityNode,
    private maxAge: number = 30,
    public readonly cachedAt: Date,
    private _lastAccessed: Date
  ) {}
  isStale(): boolean {
    return (
      Date.now() - new Date(this.cachedAt.getTime()).getTime() >
      this.maxAge * 1000
    );
  }
  updateMaxAge(maxAgeInSeconds: number): void {
    this.maxAge = maxAgeInSeconds;
  }
  updateAccessed(): void {
    this._lastAccessed = new Date();
  }
  get lastAccessed(): Date {
    return this._lastAccessed;
  }
  getRootStub(): EntityNode {
    return this.rootStub;
  }
}

interface DehydratedResultTreeJson {
  rootStub: DehydratedStubDataObject;
  maxAge: number;
  cachedAt: Date;
  lastAccessed: Date;
}
