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
import { EncodingMode, EntityNode } from './EntityNode';
import { ImpactedQueryRefsAccumulator } from './ImpactedQueryRefsAccumulator';

interface DehydratedResults {
  entityNode: EntityNode;
  impacted: string[];
}

export class ResultTreeProcessor {
  /**
   * Hydrate the EntityNode into a JSON object so that it can be returned to the user.
   * @param rootStubObject
   * @returns {string}
   */
  hydrateResults(rootStubObject: EntityNode): Record<string, unknown> {
    return rootStubObject.toJson(EncodingMode.hydrated);
  }
  // TODO: Make this closer to https://github.com/firebase/data-connect-ios-sdk/blob/main/Sources/Cache/ResultTreeProcessor.swift
  /**
   * Dehydrate results so that they can be stored in the cache.
   * @param json
   * @param entityIds
   * @param cacheProvider
   * @param queryId
   * @returns {Promise<DehydratedResults>}
   */
  async dehydrateResults(
    json: Record<string, unknown>,
    entityIds: Record<string, unknown>, // TODO: handle entity ids.
    cacheProvider: InternalCacheProvider,
    queryId: string
  ): Promise<DehydratedResults> {
    const acc = new ImpactedQueryRefsAccumulator(queryId);
    const entityNode = new EntityNode();
    await entityNode.loadData(queryId, json, entityIds, acc, cacheProvider);
    return {
      entityNode,
      impacted: acc.consumeEvents(),
    };
  }
}
