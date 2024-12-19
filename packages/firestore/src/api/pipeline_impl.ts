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

import { PipelineSource } from '../api/pipeline-source';
import { firestoreClientExecutePipeline } from '../core/firestore_client';
import { Pipeline as LitePipeline } from '../lite-api/pipeline';
import { PipelineResult } from '../lite-api/pipeline-result';
import { newUserDataReader } from '../lite-api/user_data_reader';
import { DocumentKey } from '../model/document_key';
import { cast } from '../util/input_validation';

import { DocumentReference, Query } from './reference';
import { ExpUserDataWriter } from './user_data_writer';

declare module './database' {
  interface Firestore {
    pipeline(): PipelineSource;
  }
}

/**
 * Experimental Modular API for console testing.
 * @param firestore
 */
export function pipeline(firestore: Firestore): PipelineSource;

/**
 * Experimental Modular API for console testing.
 * @param query
 */
export function pipeline(query: Query): Pipeline;

export function pipeline(
  firestoreOrQuery: Firestore | Query
): PipelineSource | Pipeline {
  if (firestoreOrQuery instanceof Firestore) {
    const firestore = firestoreOrQuery;
    return new PipelineSource(
      firestore,
      newUserDataReader(firestore),
      new ExpUserDataWriter(firestore),
      (key: DocumentKey) => {
        return new DocumentReference(firestore, null, key);
      }
    );
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
export function useFluentPipelines(): void {
  Firestore.prototype.pipeline = function (): PipelineSource {
    return pipeline(this);
  };

  Query.prototype.pipeline = function (): Pipeline {
    return pipeline(this);
  };

  Pipeline.prototype.execute = function (): Promise<PipelineResult[]> {
    return execute(this);
  };
}

export function execute<AppModelType>(
  pipeline: LitePipeline
): Promise<Array<PipelineResult<AppModelType>>> {
  const firestore = cast(pipeline._db, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientExecutePipeline(client, pipeline).then(result => {
    const docs = result
      // Currently ignore any response from ExecutePipeline that does
      // not contain any document data in the `fields` property.
      .filter(element => !!element.fields)
      .map(
        element =>
          new PipelineResult<AppModelType>(
            pipeline._userDataWriter,
            element.key?.path
              ? pipeline._documentReferenceFactory(element.key)
              : undefined,
            element.fields,
            element.executionTime?.toTimestamp(),
            element.createTime?.toTimestamp(),
            element.updateTime?.toTimestamp()
            //this.converter
          )
      );

    return docs;
  });
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
