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

import { EntityNode, StubDataObjectJson } from './EntityNode';

export class ResultTree {
  static parse(value: ResultTreeJson): ResultTree {
    const rt = new ResultTree(
      value.data,
      EntityNode.fromStorableJson(value.rootStub),
      value.ttlInMs,
      value.cachedAt,
      value.lastAccessed
    );
    return rt;
  }
  constructor(
    public readonly data: string,
    private rootStub: EntityNode,
    private ttlInMs: number = 300_000,
    private readonly cachedAt: Date,
    private lastAccessed: Date
  ) {}
  isStale(): boolean {
    return (
      Date.now() - new Date(this.cachedAt.getTime()).getTime() > this.ttlInMs
    );
  }
  updateTtl(ttlInMs: number): void {
    this.ttlInMs = ttlInMs;
  }
  updateAccessed(): void {
    this.lastAccessed = new Date();
  }
  getRootStub(): EntityNode {
    return this.rootStub;
  }
}

interface ResultTreeJson {
  rootStub: StubDataObjectJson;
  ttlInMs: number;
  cachedAt: Date;
  lastAccessed: Date;
  data: string;
}
