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

import { DocumentKey } from '../model/document_key';

import { Firestore } from './database';
import { And, FilterExpr, Or } from './expressions';
import { or, and } from './overloads';
import { Pipeline } from './pipeline';
import { PipelineSource } from './pipeline-source';
import { DocumentReference, Query } from './reference';
import { LiteUserDataWriter } from './reference_impl';
import { newUserDataReader } from './user_data_reader';

export function useFirestorePipelines(): void {
  Firestore.prototype.pipeline = function (): PipelineSource {
    const userDataWriter = new LiteUserDataWriter(this);
    const userDataReader = newUserDataReader(this);
    return new PipelineSource(
      this,
      userDataReader,
      userDataWriter,
      (key: DocumentKey) => {
        return new DocumentReference(this, null, key);
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

  and._andFunction = function (left: FilterExpr, ...right: FilterExpr[]): And {
    return new And([left, ...right]);
  };

  or._orFunction = function (left: FilterExpr, ...right: FilterExpr[]): Or {
    return new Or([left, ...right]);
  };
}
