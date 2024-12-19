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

import { Firestore } from './database';

export class Pipeline<
  AppModelType = DocumentData
> extends LitePipeline<AppModelType> {
  /**
   * @internal
   * @private
   * @param db
   * @param userDataReader
   * @param userDataWriter
   * @param documentReferenceFactory
   * @param stages
   * @param converter
   */
  constructor(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    documentReferenceFactory: (id: DocumentKey) => DocumentReference,
    stages: Stage[],
    // TODO(pipeline) support converter
    //private converter:  FirestorePipelineConverter<AppModelType> = defaultPipelineConverter()
    converter: unknown = {}
  ) {
    super(
      db,
      userDataReader,
      userDataWriter,
      documentReferenceFactory,
      stages,
      converter
    );
  }

  /**
   * @internal
   * @private
   * @param db
   * @param userDataReader
   * @param userDataWriter
   * @param documentReferenceFactory
   * @param stages
   * @param converter
   * @protected
   */
  protected newPipeline(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    documentReferenceFactory: (id: DocumentKey) => DocumentReference,
    stages: Stage[],
    converter: unknown = {}
  ): Pipeline<AppModelType> {
    return new Pipeline<AppModelType>(
      db,
      userDataReader,
      userDataWriter,
      documentReferenceFactory,
      stages,
      converter
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
  execute(): Promise<Array<PipelineResult<AppModelType>>> {
    throw new Error(
      'Pipelines not initialized. Your application must call `useFluentPipelines()` before using Firestore Pipeline features.'
    );
  }
}
