/**
 * @license
 * Copyright 2024 Google LLC
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

import { DocumentReference } from './reference';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource,
  Stage
} from './stage';

/**
 * Represents the source of a Firestore {@link Pipeline}.
 * @beta
 */
export class PipelineSource<PipelineType> {
  /**
   * @internal
   * @private
   * @param _createPipeline
   */
  constructor(
    /**
     * @internal
     * @private
     */
    public _createPipeline: (stages: Stage[]) => PipelineType
  ) {}

  collection(collectionPath: string): PipelineType {
    return this._createPipeline([new CollectionSource(collectionPath)]);
  }

  collectionGroup(collectionId: string): PipelineType {
    return this._createPipeline([new CollectionGroupSource(collectionId)]);
  }

  database(): PipelineType {
    return this._createPipeline([new DatabaseSource()]);
  }

  documents(docs: DocumentReference[]): PipelineType {
    return this._createPipeline([DocumentsSource.of(docs)]);
  }
}
