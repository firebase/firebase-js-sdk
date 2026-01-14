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

import { InternalCacheProvider } from './CacheProvider';
import { EntityDataObject } from './EntityDataObject';
import { ResultTree } from './ResultTree';

export class InMemoryCacheProvider implements InternalCacheProvider {
  private bdos = new Map<string, EntityDataObject>();
  private resultTrees = new Map<string, ResultTree>();
  constructor(private _keyId: string) {}

  setResultTree(queryId: string, rt: ResultTree): Promise<void> {
    this.resultTrees.set(queryId, rt);
    return Promise.resolve();
  }
  // TODO: Should this be in the cache provider? This seems common along all CacheProviders.
  async getResultTree(queryId: string): Promise<ResultTree | undefined> {
    return this.resultTrees.get(queryId);
  }
  createGlobalId(): string {
    return crypto.randomUUID();
  }
  updateBackingData(backingData: EntityDataObject): Promise<void> {
    this.bdos.set(backingData.globalID, backingData);
    return Promise.resolve();
  }
  async getBdo(globalId: string): Promise<EntityDataObject> {
    if (!this.bdos.has(globalId)) {
      this.bdos.set(globalId, new EntityDataObject(globalId));
    }
    // Because of the above, we can guarantee that there will be a BDO at the globalId.
    return this.bdos.get(globalId)!;
  }
  close(): Promise<void> {
    // TODO: Noop
    return Promise.resolve();
  }
}
