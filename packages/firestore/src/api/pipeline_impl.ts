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

import { Pipeline } from '../api/pipeline';
import { Pipeline as LitePipeline } from '../lite-api/pipeline';
import { PipelineResult } from '../lite-api/pipeline-result';
import { PipelineSource } from '../lite-api/pipeline-source';
import { Stage } from '../lite-api/stage';
import { newUserDataReader } from '../lite-api/user_data_reader';
import { cast } from '../util/input_validation';

import { Firestore } from './database';
import { Query } from './reference';
import { ExpUserDataWriter } from './user_data_writer';

/**
 * Experimental Modular API for console testing.
 * @param firestore
 */
export function pipeline(firestore: Firestore): PipelineSource<Pipeline>;

/**
 * Experimental Modular API for console testing.
 * @param query
 */
export function pipeline(query: Query): Pipeline;

export function pipeline(
  firestoreOrQuery: Firestore | Query
): PipelineSource<Pipeline> | Pipeline {
  if (firestoreOrQuery instanceof Firestore) {
    const firestore = firestoreOrQuery;
    return new PipelineSource<Pipeline>((stages: Stage[]) => {
      return new Pipeline(
        firestore,
        newUserDataReader(firestore),
        new ExpUserDataWriter(firestore),
        stages
      );
    });
  } else {
    let result;
    const query = firestoreOrQuery;
    const db = cast<Firestore>(query.firestore, Firestore);
    if (query._query.collectionGroup) {
      result = pipeline(db).collectionGroup(query._query.collectionGroup);
    } else {
      result = pipeline(db).collection(query._query.path.canonicalString());
    }

    // TODO(pipeline) convert existing query filters, limits, etc into
    // pipeline stages

    return result;
  }
}

export function execute(pipeline: LitePipeline): Promise<PipelineResult[]> {
  return pipeline.execute();
}

// Augment the Firestore class with the pipeline() factory method
Firestore.prototype.pipeline = function (): PipelineSource<Pipeline> {
  return pipeline(this);
};

// Augment the Query class with the pipeline() factory method
Query.prototype.pipeline = function (): Pipeline {
  return pipeline(this);
};
