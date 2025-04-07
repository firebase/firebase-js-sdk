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

// Re-adding necessary imports that were removed previously
import {
  CompleteFn,
  ErrorFn,
  isPartialObserver,
  NextFn,
  PartialObserver
} from '../api/observer';
import {
  firestoreClientExecutePipeline,
  firestoreClientListen
} from '../core/firestore_client';
import { ListenerDataSource } from '../core/event_manager';
import { toCorePipeline } from '../core/pipeline-util';
import { ViewSnapshot } from '../core/view_snapshot';
import { Pipeline as LitePipeline } from '../lite-api/pipeline';
import { PipelineResult, PipelineSnapshot } from '../lite-api/pipeline-result';
import { PipelineSource } from '../lite-api/pipeline-source';
import { Stage } from '../lite-api/stage';
import { newUserDataReader } from '../lite-api/user_data_reader';
import { FirestoreError } from '../util/error';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';
import { Pipeline } from './pipeline'; // Keep this specific Pipeline import if needed alongside LitePipeline
import { RealtimePipeline } from './realtime_pipeline';
import { DocumentReference } from './reference';
import { SnapshotListenOptions, Unsubscribe } from './reference_impl';
import { RealtimePipelineSnapshot } from './snapshot';
import { ExpUserDataWriter } from './user_data_writer';

declare module './database' {
  interface Firestore {
    pipeline(): PipelineSource<Pipeline>;
    realtimePipeline(): PipelineSource<RealtimePipeline>;
  }
}

/**
 * Executes this pipeline and returns a Promise to represent the asynchronous operation.
 *
 * The returned Promise can be used to track the progress of the pipeline execution
 * and retrieve the results (or handle any errors) asynchronously.
 *
 * The pipeline results are returned as a {@link PipelineSnapshot} that contains
 * a list of {@link PipelineResult} objects. Each {@link PipelineResult} typically
 * represents a single key/value map that has passed through all the
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
 * const snapshot: PipelineSnapshot = await execute(firestore.pipeline().collection("books")
 *     .where(gt(field("rating"), 4.5))
 *     .select("title", "author", "rating"));
 *
 * const results: PipelineResults = snapshot.results;
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
            element.executionTime?.toTimestamp(),
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

Firestore.prototype.realtimePipeline =
  function (): PipelineSource<RealtimePipeline> {
    return new PipelineSource<RealtimePipeline>(
      this._databaseId,
      (stages: Stage[]) => {
        return new RealtimePipeline(
          this,
          newUserDataReader(this),
          new ExpUserDataWriter(this),
          stages
        );
      }
    );
  };

/**
 * @internal
 * @private
 */
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  observer: {
    next?: (snapshot: RealtimePipelineSnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * @internal
 * @private
 */
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: RealtimePipelineSnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * @internal
 * @private
 */
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  onNext: (snapshot: RealtimePipelineSnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onComplete?: () => void
): Unsubscribe;
/**
 * @internal
 * @private
 */
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  options: SnapshotListenOptions,
  onNext: (snapshot: RealtimePipelineSnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onComplete?: () => void
): Unsubscribe;
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  ...args: unknown[]
): Unsubscribe {
  let options: SnapshotListenOptions = {
    includeMetadataChanges: false,
    source: 'default'
  };
  let currArg = 0;
  if (typeof args[currArg] === 'object' && !isPartialObserver(args[currArg])) {
    options = args[currArg] as SnapshotListenOptions;
    currArg++;
  }

  const internalOptions = {
    includeMetadataChanges: options.includeMetadataChanges,
    source: options.source as ListenerDataSource
  };

  let userObserver: PartialObserver<RealtimePipelineSnapshot>;
  if (isPartialObserver(args[currArg])) {
    userObserver = args[currArg] as PartialObserver<RealtimePipelineSnapshot>;
  } else {
    userObserver = {
      next: args[currArg] as NextFn<RealtimePipelineSnapshot>,
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };
  }

  const client = ensureFirestoreConfigured(pipeline._db as Firestore);
  const observer = {
    next: (snapshot: ViewSnapshot) => {
      if (userObserver.next) {
        userObserver.next(new RealtimePipelineSnapshot(pipeline, snapshot));
      }
    },
    error: userObserver.error,
    complete: userObserver.complete
  };

  return firestoreClientListen(
    client,
    toCorePipeline(pipeline),
    internalOptions, // Pass parsed options here
    observer
  );
}
