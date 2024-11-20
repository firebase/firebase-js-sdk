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

import { Pipeline } from '../lite-api/pipeline';
import { PipelineSource } from '../lite-api/pipeline-source';
import { newUserDataReader } from '../lite-api/user_data_reader';
import { DocumentKey } from '../model/document_key';

import { Firestore } from './database';
import { DocumentReference, Query } from './reference';
import { ExpUserDataWriter } from './user_data_writer';

export function useFirestorePipelines(): void {
  Firestore.prototype.pipeline = function (): PipelineSource {
    const firestore = this;
    return new PipelineSource(
      this,
      newUserDataReader(firestore),
      new ExpUserDataWriter(firestore),
      (key: DocumentKey) => {
        return new DocumentReference(firestore, null, key);
      }
    );
  };

  Query.prototype.pipeline = function (): Pipeline {
    let pipeline;
    if (this._query.collectionGroup) {
      pipeline = this.firestore
        .pipeline()
        .collectionGroup(this._query.collectionGroup);
    } else {
      pipeline = this.firestore
        .pipeline()
        .collection(this._query.path.canonicalString());
    }

    // TODO(pipeline) convert existing query filters, limits, etc into
    // pipeline stages

    return pipeline;
  };
}
