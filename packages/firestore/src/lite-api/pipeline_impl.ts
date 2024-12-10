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

import { DocumentKey } from '../model/document_key';
import { invokeExecutePipeline } from '../remote/datastore';

import { getDatastore } from './components';
import { Firestore } from './database';
import { Pipeline } from './pipeline';
import { PipelineResult } from './pipeline-result';
import { PipelineSource } from './pipeline-source';
import { DocumentReference, Query } from './reference';
import { LiteUserDataWriter } from './reference_impl';
import { newUserDataReader } from './user_data_reader';

declare module './database' {
  interface Firestore {
    pipeline(): PipelineSource;
  }
}

declare module './reference' {
  interface Query {
    pipeline(): Pipeline;
  }
}

/**
 * Modular API for console experimentation.
 * @param pipeline Execute this pipeline.
 * @beta
 */
export function execute<AppModelType>(
  pipeline: Pipeline<AppModelType>
): Promise<Array<PipelineResult<AppModelType>>> {
  const datastore = getDatastore(pipeline._db);
  return invokeExecutePipeline(datastore, pipeline).then(result => {
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
    const db = firestoreOrQuery;
    const userDataWriter = new LiteUserDataWriter(db);
    const userDataReader = newUserDataReader(db);
    return new PipelineSource(
      db,
      userDataReader,
      userDataWriter,
      (key: DocumentKey) => {
        return new DocumentReference(db, null, key);
      }
    );
  } else {
    let pipeline;
    const query = firestoreOrQuery;
    if (query._query.collectionGroup) {
      pipeline = query.firestore
        .pipeline()
        .collectionGroup(query._query.collectionGroup);
    } else {
      pipeline = query.firestore
        .pipeline()
        .collection(query._query.path.canonicalString());
    }

    // TODO(pipeline) convert existing query filters, limits, etc into
    // pipeline stages

    return pipeline;
  }
}

export function useFluentPipelines(): void {
  Firestore.prototype.pipeline = function (): PipelineSource {
    return pipeline(this);
  };

  Query.prototype.pipeline = function (): Pipeline {
    return pipeline(this);
  };
}
