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

import { CacheProvider } from './CacheProvider';
import { ImpactedQueryRefsAccumulator } from './ImpactedQueryRefsAccumulator';
import { EntityNode } from './EntityNode';

interface DehydratedResults {
  stubDataObject: EntityNode;
  data: string;
}

export class ResultTreeProcessor {
  hydrateResults(rootStubObject: EntityNode): string {
    return JSON.stringify(rootStubObject.toJson());
  }
  dehydrateResults(
    json: object,
    cacheProvider: CacheProvider,
    acc: ImpactedQueryRefsAccumulator
  ): DehydratedResults {
    const stubDataObject = new EntityNode(json, cacheProvider, acc);
    return {
      stubDataObject,
      data: JSON.stringify(stubDataObject.toStorableJson())
    };
  }
}
