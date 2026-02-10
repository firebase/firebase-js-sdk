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
  private edos = new Map<string, EntityDataObject>();
  private resultTrees = new Map<string, ResultTree>();
  constructor(private _keyId: string) {}

  async setResultTree(queryId: string, rt: ResultTree): Promise<void> {
    this.resultTrees.set(queryId, rt);
  }
  // TODO: Should this be in the cache provider? This seems common along all CacheProviders.
  async getResultTree(queryId: string): Promise<ResultTree | undefined> {
    return this.resultTrees.get(queryId);
  }
  async createGlobalId(): Promise<string> {
    return crypto.randomUUID();
  }
  async updateEntityData(entityData: EntityDataObject): Promise<void> {
    this.edos.set(entityData.globalID, entityData);
  }
  async getEntityData(globalId: string): Promise<EntityDataObject> {
    if (!this.edos.has(globalId)) {
      this.edos.set(globalId, new EntityDataObject(globalId));
    }
    // Because of the above, we can guarantee that there will be an EDO at the globalId.
    return this.edos.get(globalId)!;
  }
  close(): Promise<void> {
    // No-op
    return Promise.resolve();
  }
}
