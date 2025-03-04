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
import { firestoreClientExecutePipeline } from '../core/firestore_client';
import { Pipeline as LitePipeline } from '../lite-api/pipeline';
import { PipelineResult, PipelineSnapshot } from '../lite-api/pipeline-result';
import { PipelineSource } from '../lite-api/pipeline-source';
import { Stage } from '../lite-api/stage';
import { newUserDataReader } from '../lite-api/user_data_reader';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';
import { DocumentReference } from './reference';
import { ExpUserDataWriter } from './user_data_writer';

declare module './database' {
  interface Firestore {
    pipeline(): PipelineSource<Pipeline>;
  }
}

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
 * const futureResults = await execute(firestore.pipeline().collection("books")
 *     .where(gt(field("rating"), 4.5))
 *     .select("title", "author", "rating"));
 * ```
 *
 * @param pipeline The pipeline to execute.
 * @return A Promise representing the asynchronous pipeline execution.
 */
export function execute(pipeline: LitePipeline): Promise<PipelineSnapshot> {
  const firestore = cast(pipeline._db, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientExecutePipeline(client, pipeline).then(result => {
    // Get the execution time from the first result.
    // firestoreClientExecutePipeline returns at least one PipelineStreamElement
    // even if the returned document set is empty.
    const executionTime =
      result.length > 0 ? result[0].executionTime?.toTimestamp() : undefined;

    const docs = result
      // Currently ignore any response from ExecutePipeline that does
      // not contain any document data in the `fields` property.
      .filter(element => !!element.fields)
      .map(
        element =>
          new PipelineResult(
            pipeline._userDataWriter,
            element.key?.path
              ? new DocumentReference(firestore, null, element.key)
              : undefined,
            element.fields,
            element.createTime?.toTimestamp(),
            element.updateTime?.toTimestamp()
          )
      );

    return new PipelineSnapshot(pipeline, docs, executionTime);
  });
}

// Augment the Firestore class with the pipeline() factory method
Firestore.prototype.pipeline = function (): PipelineSource<Pipeline> {
  return new PipelineSource<Pipeline>(this._databaseId, (stages: Stage[]) => {
    return new Pipeline(
      this,
      newUserDataReader(this),
      new ExpUserDataWriter(this),
      stages
    );
  });
};
