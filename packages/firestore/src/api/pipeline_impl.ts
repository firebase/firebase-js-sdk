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

import { toPipeline } from '../core/pipeline-util';
import { Pipeline } from '../lite-api/pipeline';

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
import { firestoreClientListen } from '../core/firestore_client';
import { ViewSnapshot } from '../core/view_snapshot';
import { toCorePipeline } from '../core/pipeline-util';
import { RealtimePipeline } from './realtime_pipeline';

declare module './database' {
  interface Firestore {
    pipeline(): PipelineSource<Pipeline>;
    realtimePipeline(): PipelineSource<RealtimePipeline>;
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

export function realtimePipeline(
  firestore: Firestore
): PipelineSource<RealtimePipeline> {
  return new PipelineSource<RealtimePipeline>((stages: Stage[]) => {
    return new RealtimePipeline(
      firestore,
      newUserDataReader(firestore),
      new ExpUserDataWriter(firestore),
      stages
    );
  });
}

Firestore.prototype.realtimePipeline =
  function (): PipelineSource<RealtimePipeline> {
    return realtimePipeline(this);
  };

/**
 * @internal
 * @private
 */
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  next: (snapshot: RealtimePipelineSnapshot) => void,
  error?: (error: FirestoreError) => void,
  complete?: () => void
): Unsubscribe {
  const client = ensureFirestoreConfigured(pipeline._db as Firestore);
  const observer = {
    next: (snapshot: ViewSnapshot) => {
      next(new RealtimePipelineSnapshot(pipeline, snapshot));
    },
    error: error,
    complete: complete
  };
  // TODO(pipeline) hook up options
  return firestoreClientListen(client, toCorePipeline(pipeline), {}, observer);
}
