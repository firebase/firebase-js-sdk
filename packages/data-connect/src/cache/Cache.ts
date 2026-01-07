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

import { generateSHA256HashBrowser } from '@firebase/util';

import {
  CacheProvider,
  CacheSettings,
  type ConnectorConfig
} from '../api/DataConnect';
import { DataConnectError } from '../core/error';
import { type AuthTokenProvider } from '../core/FirebaseAuthProvider';

import { InternalCacheProvider } from './CacheProvider';
import { ImpactedQueryRefsAccumulator } from './ImpactedQueryRefsAccumulator';
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
    public readonly cacheSettings: CacheSettings
  ) {
    this.authProvider.addTokenChangeListener(async _ => {
      const newUid = this.authProvider.getAuth().getUid();
      // We should only close if the token changes and so does the new UID
      if (this.uid !== newUid) {
        await this.cacheProvider?.close();
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
    const identifier = `${
      'memory' // TODO: replace this with indexeddb when persistence is available.
    }-${this.projectId}-${this.connectorConfig.service}-${
      this.connectorConfig.connector
    }-${this.connectorConfig.location}-${uid}-${this.host}`; // TODO: Check if null is the right identifier here.
    const sha256 = await generateSHA256HashBrowser(identifier);
    return sha256;
  }

  initializeNewProviders(identifier: string): InternalCacheProvider {
    return this.cacheSettings.cacheProvider.initialize(identifier);
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
  async getResultJSON(queryId: string): Promise<string> {
    await this.initialize();
    const processor = new ResultTreeProcessor();
    const cacheProvider = this.cacheProvider;
    const resultTree = await cacheProvider!.getResultTree(queryId);
    if (!resultTree) {
      throw new DataConnectError(
        'invalid-argument',
        `${queryId} not found in cache. Call "update() first."`
      );
    }
    return processor.hydrateResults(resultTree.getRootStub());
  }
  async update(queryId: string, serverValues: ServerValues, entityIds: Record<string, unknown>): Promise<string[]> {
    await this.initialize();
    const processor = new ResultTreeProcessor();
    const acc = new ImpactedQueryRefsAccumulator();
    const cacheProvider = this.cacheProvider;
    const { data, entityNode: stubDataObject } =
      await processor.dehydrateResults(
        serverValues,
        entityIds,
        cacheProvider!,
        acc,
        queryId
      );
    const now = new Date();
    await cacheProvider!.setResultTree(
      queryId,
      new ResultTree(
        data,
        stubDataObject,
        serverValues.maxAge || this.cacheSettings.maxAge,
        now,
        now
      )
    );
    return acc.consumeEvents();
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
