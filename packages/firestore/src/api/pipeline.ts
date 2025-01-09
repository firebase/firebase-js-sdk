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

import { Pipeline as LitePipeline } from '../lite-api/pipeline';
import { PipelineResult } from '../lite-api/pipeline-result';
import { DocumentData, DocumentReference } from '../lite-api/reference';
import { Stage } from '../lite-api/stage';
import { UserDataReader } from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import { DocumentKey } from '../model/document_key';

import {ensureFirestoreConfigured, Firestore} from './database';
import {cast} from "../util/input_validation";
import {firestoreClientExecutePipeline} from "../core/firestore_client";

export class Pipeline<
  AppModelType = DocumentData
> extends LitePipeline {
  /**
   * @internal
   * @private
   * @param db
   * @param userDataReader
   * @param userDataWriter
   * @param stages
   */
  constructor(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    stages: Stage[]
  ) {
    super(
      db,
      userDataReader,
      userDataWriter,
      stages
    );
  }

  /**
   * @internal
   * @private
   * @param db
   * @param userDataReader
   * @param userDataWriter
   * @param stages
   * @param converter
   * @protected
   */
  protected newPipeline(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    stages: Stage[],
    converter: unknown = {}
  ): Pipeline {
    return new Pipeline(
      db,
      userDataReader,
      userDataWriter,
      stages
    );
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
   * const futureResults = await firestore.pipeline().collection("books")
   *     .where(gt(Field.of("rating"), 4.5))
   *     .select("title", "author", "rating")
   *     .execute();
   * ```
   *
   * @return A Promise representing the asynchronous pipeline execution.
   */
  execute(): Promise<Array<PipelineResult>> {
    const firestore = cast(this._db, Firestore);
    const client = ensureFirestoreConfigured(firestore);
    return firestoreClientExecutePipeline(client, this).then(result => {
      const docs = result
        // Currently ignore any response from ExecutePipeline that does
        // not contain any document data in the `fields` property.
        .filter(element => !!element.fields)
        .map(
          element =>
            new PipelineResult(
              this._userDataWriter,
              element.key?.path
                ? new DocumentReference(firestore, null, element.key)
                : undefined,
              element.fields,
              element.executionTime?.toTimestamp(),
              element.createTime?.toTimestamp(),
              element.updateTime?.toTimestamp()
            )
        );

      return docs;
    });
  }
}
