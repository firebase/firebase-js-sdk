// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { PipelineSnapshot } from './snapshot';
import { FirestoreError } from '../util/error';
import { Unsubscribe } from './reference_impl';
import { Sort } from '../lite-api/stage';
import { Field } from '../lite-api/expressions';
import { ensureFirestoreConfigured, Firestore } from './database';
import { ViewSnapshot } from '../core/view_snapshot';
import {
  firestoreClientExecutePipeline,
  firestoreClientListen
} from '../core/firestore_client';
import { Pipeline } from '../lite-api/pipeline';
import { PipelineResult } from '../lite-api/pipeline-result';
import { CorePipeline } from '../core/pipeline_run';

/**
 * Executes this pipeline and returns a Promise to represent the asynchronous operation.
 *
 * <p>The returned Promise can be used to track the progress of the pipeline execution
 * and retrieve the results (or handle any errors) asynchronously.
 *
 * <p>The pipeline results are returned as a list of {@link PipelineResult} objects. Each {@link
 * PipelineResult} typically represents a single key/value map that has passed through all the
 * stages of the pipeline, however this might differ depending on the stages involved in the
 * pipeline. For example:
 *
 * <ul>
 *   <li>If there are no stages or only transformation stages, each {@link PipelineResult}
 *       represents a single document.</li>
 *   <li>If there is an aggregation, only a single {@link PipelineResult} is returned,
 *       representing the aggregated results over the entire dataset .</li>
 *   <li>If there is an aggregation stage with grouping, each {@link PipelineResult} represents a
 *       distinct group and its associated aggregated values.</li>
 * </ul>
 *
 * <p>Example:
 *
 * ```typescript
 * const futureResults = await firestore.pipeline().collection("books")
 *     .where(gt(Field.of("rating"), 4.5))
 *     .select("title", "author", "rating")
 *     .execute();
 * ```
 *
 * @return A Promise representing the asynchronous pipeline execution.
 */
export function execute<AppModelType>(
  pipeline: Pipeline<AppModelType>
): Promise<Array<PipelineResult<AppModelType>>> {
  const client = ensureFirestoreConfigured(pipeline.liteDb as Firestore);
  return firestoreClientExecutePipeline(client, pipeline as Pipeline).then(
    result => {
      const docs = result.map(
        element =>
          new PipelineResult<AppModelType>(
            pipeline.userDataWriter,
            element.key?.path
              ? pipeline.documentReferenceFactory(element.key)
              : undefined,
            element.fields,
            element.executionTime?.toTimestamp(),
            element.createTime?.toTimestamp(),
            element.updateTime?.toTimestamp()
            //this.converter
          )
      );

      return docs;
    }
  );
}

/**
 * @internal
 * @private
 */
export function _onSnapshot(
  pipeline: Pipeline,
  next: (snapshot: PipelineSnapshot) => void,
  error?: (error: FirestoreError) => void,
  complete?: () => void
): Unsubscribe {
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

  const client = ensureFirestoreConfigured(pipeline.liteDb as Firestore);
  const observer = {
    next: (snapshot: ViewSnapshot) => {
      new PipelineSnapshot(pipeline, snapshot);
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
