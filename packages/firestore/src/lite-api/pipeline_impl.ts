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

import {
  StructuredPipeline,
  StructuredPipelineOptions
} from '../core/structured_pipeline';
import { invokeExecutePipeline } from '../remote/datastore';
import { Code, FirestoreError } from '../util/error';
import { cast } from '../util/input_validation';

import { getDatastore } from './components';
import { Firestore } from './database';
import { Pipeline } from './pipeline';
import { PipelineResult, PipelineSnapshot } from './pipeline-result';
import { PipelineSource } from './pipeline-source';
import { PipelineExecuteOptions } from './pipeline_options';
import { DocumentReference } from './reference';
import { LiteUserDataWriter } from './reference_impl';
import { Stage } from './stage';
import { newUserDataReader, UserDataSource } from './user_data_reader';

declare module './database' {
  interface Firestore {
    /**
     * Creates and returns a new PipelineSource, which allows specifying the source stage of a {@link @firebase/firestore/pipelines#Pipeline}.
     *
     * @example
     * ```
     * let myPipeline: Pipeline = firestore.pipeline().collection('books');
     * ```
     */
    pipeline(): PipelineSource<Pipeline>;
  }
}

/**
 * Executes this pipeline and returns a Promise to represent the asynchronous operation.
 *
 * @param pipeline - The pipeline to execute.
 * @returns A Promise representing the asynchronous pipeline execution.
 */
export function execute(pipeline: Pipeline): Promise<PipelineSnapshot>;
/**
 * Executes a pipeline with options and returns a Promise to represent the asynchronous operation.
 *
 * @param options - Specifies the pipeline to execute and options.
 * @returns A Promise representing the asynchronous pipeline execution.
 */
export function execute(
  options: PipelineExecuteOptions
): Promise<PipelineSnapshot>;
export function execute(
  pipelineOrOptions: Pipeline | PipelineExecuteOptions
): Promise<PipelineSnapshot> {
  const options: PipelineExecuteOptions = !(
    pipelineOrOptions instanceof Pipeline
  )
    ? pipelineOrOptions
    : {
        pipeline: pipelineOrOptions
      };

  const { pipeline, rawOptions, atomic, ...rest } = options;

  if (!pipeline._db) {
    return Promise.reject(
      new FirestoreError(
        Code.FAILED_PRECONDITION,
        'This pipeline was created without a database (e.g., as a subcollection pipeline) and cannot be executed directly. It can only be used as part of another pipeline.'
      )
    );
  }
  const datastore = getDatastore(pipeline._db);
  const firestore = cast(pipeline._db, Firestore);

  const userDataReader = newUserDataReader(firestore);
  const context = userDataReader.createContext(
    UserDataSource.Argument,
    'execute'
  );

  pipeline._readUserData(context);
  const userDataWriter = new LiteUserDataWriter(firestore);

  const structuredPipelineOptions = new StructuredPipelineOptions(
    rest,
    rawOptions
  );
  structuredPipelineOptions._readUserData(context);

  const structuredPipeline: StructuredPipeline = new StructuredPipeline(
    pipeline,
    structuredPipelineOptions
  );

  return invokeExecutePipeline(datastore, structuredPipeline, { atomic }).then(
    result => {
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
            userDataWriter,
            element.fields!,
            element.key?.path
              ? new DocumentReference(firestore, null, element.key)
              : undefined,
            element.createTime?.toTimestamp(),
            element.updateTime?.toTimestamp()
          )
      );

    return new PipelineSnapshot(pipeline, docs, executionTime);
  });
}

/**
 * Creates and returns a new PipelineSource, which allows specifying the source stage of a {@link @firebase/firestore/pipelines#Pipeline}.
 *
 * @example
 * ```typescript
 * let myPipeline: Pipeline = firestore.pipeline().collection('books');
 * ```
 */
Firestore.prototype.pipeline = function (): PipelineSource<Pipeline> {
  const userDataWriter = new LiteUserDataWriter(this);
  const userDataReader = newUserDataReader(this);
  return new PipelineSource<Pipeline>(
    this._databaseId,
    userDataReader,
    (stages: Stage[]) => {
      return new Pipeline(this, userDataReader, userDataWriter, stages);
    }
  );
};
