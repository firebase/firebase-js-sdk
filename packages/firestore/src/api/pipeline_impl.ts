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
import { toPipeline } from '../core/pipeline-util';
import { Pipeline as LitePipeline } from '../lite-api/pipeline';
import { PipelineResult } from '../lite-api/pipeline-result';
import { PipelineSource } from '../lite-api/pipeline-source';
import { Sort, Stage } from '../lite-api/stage';
import { newUserDataReader } from '../lite-api/user_data_reader';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';
import { Query } from './reference';
import { ExpUserDataWriter } from './user_data_writer';
import { RealtimePipelineSnapshot } from './snapshot';
import { FirestoreError } from '../util/error';
import { Unsubscribe } from './reference_impl';
import { Field } from '../lite-api/expressions';
import { firestoreClientListen } from '../core/firestore_client';
import { CorePipeline } from '../core/pipeline_run';
import { ViewSnapshot } from '../core/view_snapshot';

declare module './database' {
  interface Firestore {
    pipeline(): PipelineSource<Pipeline>;
  }
}

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
    const query = firestoreOrQuery;
    const db = cast<Firestore>(query.firestore, Firestore);

    const litePipeline: LitePipeline = toPipeline(query._query, db);
    return cast<Pipeline>(litePipeline, Pipeline);
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

/**
 * @internal
 * @private
 */
export function _onSnapshot(
  pipeline: LitePipeline,
  next: (snapshot: RealtimePipelineSnapshot) => void,
  error?: (error: FirestoreError) => void,
  complete?: () => void
): Unsubscribe {
  // TODO(pipeline): getting system fields needs to be done properly for type 2.
  // this.stages.push(
  //   new AddFields(
  //     this.selectablesToMap([
  //       '__name__',
  //       '__create_time__',
  //       '__update_time__'
  //     ])
  //   )
  // );

  pipeline.stages.push(new Sort([Field.of('__name__').ascending()]));

  const client = ensureFirestoreConfigured(pipeline._db as Firestore);
  const observer = {
    next: (snapshot: ViewSnapshot) => {
      new RealtimePipelineSnapshot(pipeline, snapshot);
    },
    error: error,
    complete: complete
  };
  // TODO(pipeline) hook up options
  firestoreClientListen(
    client,
    new CorePipeline(pipeline.userDataReader.serializer, pipeline.stages),
    {},
    observer
  );

  return () => {};
}
