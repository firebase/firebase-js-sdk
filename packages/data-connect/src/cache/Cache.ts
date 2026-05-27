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

import { generateSHA256Hash } from '@firebase/util';

import {
  CacheProvider,
  CacheSettings,
  type ConnectorConfig
} from '../api/DataConnect';
import { Code, DataConnectError } from '../core/error';
import { type AuthTokenProvider } from '../core/FirebaseAuthProvider';

import { InternalCacheProvider } from './CacheProvider';
import { PersistentCacheProvider } from './IndexedDbCacheProvider';
import { InMemoryCacheProvider } from './InMemoryCacheProvider';
import { ResultTree } from './ResultTree';
import { ResultTreeProcessor } from './ResultTreeProcessor';

export const Memory = 'memory';

export type DataConnectStorage = typeof Memory;

/**
 * ServerValues
 */
export interface ServerValues extends Record<string, unknown> {
  maxAge?: number;
}

export class DataConnectCache {
  private cacheProvider: InternalCacheProvider | null = null;
  private uid: string | null = null;
  constructor(
    private authProvider: AuthTokenProvider,
    private projectId: string,
    private connectorConfig: ConnectorConfig,
    private host: string,
    public cacheSettings: CacheSettings
  ) {
    this.authProvider.addTokenChangeListener(async _ => {
      const newUid = this.authProvider.getAuth().getUid();
      // We should only close if the token changes and so does the new UID
      if (this.uid !== newUid) {
        this.cacheProvider?.close();
        this.uid = newUid;
        const identifier = await this.getIdentifier(this.uid);
        this.cacheProvider = this.initializeNewProviders(identifier);
      }
    });
  }

  async initialize(): Promise<void> {
    if (!this.cacheProvider) {
      const identifier = await this.getIdentifier(this.uid);
      this.cacheProvider = this.initializeNewProviders(identifier);
    }
  }

  async getIdentifier(uid: string | null): Promise<string> {
    if (this.cacheSettings.cacheProvider.type === 'MEMORY') {
      const identifier = `memory-${this.projectId}-${this.connectorConfig.service}-${
        this.connectorConfig.connector
      }-${this.connectorConfig.location}-${uid}-${this.host}`;
      const sha256 = await generateSHA256Hash(identifier);
      return sha256;
    } else {
      const authScope = uid ? uid : 'anonymous';
      return `fdc_cache_${this.projectId}_${authScope}`;
    }
  }

  initializeNewProviders(identifier: string): InternalCacheProvider {
    return this.cacheSettings.cacheProvider.initialize(identifier);
  }

  getProvider(): InternalCacheProvider | null {
    return this.cacheProvider;
  }

  async containsResultTree(queryId: string): Promise<boolean> {
    await this.initialize();
    const resultTree = await this.cacheProvider!.getResultTree(queryId);
    return resultTree !== undefined;
  }
  async getResultTree(queryId: string): Promise<ResultTree | undefined> {
    await this.initialize();
    return this.cacheProvider!.getResultTree(queryId);
  }
  async getResultJSON(queryId: string): Promise<Record<string, unknown>> {
    await this.initialize();
    const processor = new ResultTreeProcessor();
    const cacheProvider = this.cacheProvider;
    const resultTree = await cacheProvider!.getResultTree(queryId);
    if (!resultTree) {
      throw new DataConnectError(
        Code.INVALID_ARGUMENT,
        `${queryId} not found in cache. Call "update()" first.`
      );
    }
    return processor.hydrateResults(resultTree.getRootStub());
  }
  async update(
    queryId: string,
    serverValues: ServerValues,
    entityIds: Record<string, unknown>
  ): Promise<string[]> {
    await this.initialize();
    const processor = new ResultTreeProcessor();
    const cacheProvider = this.cacheProvider;
    if (cacheProvider && cacheProvider.startWriteSession) {
      await cacheProvider.startWriteSession(entityIds);
    }
    const { entityNode: stubDataObject, impacted } =
      await processor.dehydrateResults(
        serverValues,
        entityIds,
        cacheProvider!,
        queryId
      );
    const now = new Date();
    await cacheProvider!.setResultTree(
      queryId,
      new ResultTree(
        stubDataObject,
        serverValues.maxAge || this.cacheSettings.maxAgeSeconds,
        now,
        now
      )
    );
    return impacted;
  }
}

export class MemoryStub implements CacheProvider<'MEMORY'> {
  type: 'MEMORY' = 'MEMORY';
  /**
   * @internal
   */
  initialize(cacheId: string): InMemoryCacheProvider {
    return new InMemoryCacheProvider(cacheId);
  }
}

export class PersistentStub implements CacheProvider<'PERSISTENT'> {
  type: 'PERSISTENT' = 'PERSISTENT';
  /**
   * @internal
   */
  initialize(cacheId: string): PersistentCacheProvider {
    return new PersistentCacheProvider(cacheId);
  }
}
