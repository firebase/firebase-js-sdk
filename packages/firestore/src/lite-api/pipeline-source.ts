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

import { DatabaseId } from '../core/database_info';
import { FirestoreError, Code } from '../util/error';

import { CollectionReference, DocumentReference } from './reference';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource,
  Stage
} from './stage';

/**
 * Represents the source of a Firestore {@link Pipeline}.
 * @beta
 */
export class PipelineSource<PipelineType> {
  /**
   * @internal
   * @private
   * @param _createPipeline
   */
  constructor(
    private databaseId: DatabaseId,
    /**
     * @internal
     * @private
     */
    public _createPipeline: (stages: Stage[]) => PipelineType
  ) {}

  /**
   * Set the pipeline's source to the collection specified by the given path.
   *
   * @param collectionPath A path to a collection that will be the source of this pipeline.
   */
  collection(collectionPath: string): PipelineType;

  /**
   * Set the pipeline's source to the collection specified by the given CollectionReference.
   *
   * @param collectionReference A CollectionReference for a collection that will be the source of this pipeline.
   * The converter for this CollectionReference will be ignored and not have an effect on this pipeline.
   *
   * @throws {@FirestoreError} Thrown if the provided CollectionReference targets a different project or database than the pipeline.
   */
  collection(collectionReference: CollectionReference): PipelineType;
  collection(collection: CollectionReference | string): PipelineType {
    if (collection instanceof CollectionReference) {
      this._validateReference(collection);
      return this._createPipeline([new CollectionSource(collection.path)]);
    } else {
      return this._createPipeline([new CollectionSource(collection)]);
    }
  }

  /**
   * Set the pipeline's source to the collection group with the given id.
   *
   * @param collectionid The id of a collection group that will be the source of this pipeline.
   */
  collectionGroup(collectionId: string): PipelineType {
    return this._createPipeline([new CollectionGroupSource(collectionId)]);
  }

  /**
   * Set the pipeline's source to be all documents in this database.
   */
  database(): PipelineType {
    return this._createPipeline([new DatabaseSource()]);
  }

  /**
   * Set the pipeline's source to the documents specified by the given paths and DocumentReferences.
   *
   * @param docs An array of paths and DocumentReferences specifying the individual documents that will be the source of this pipeline.
   * The converters for these DocumentReferences will be ignored and not have an effect on this pipeline.
   *
   * @throws {@FirestoreError} Thrown if any of the provided DocumentReferences target a different project or database than the pipeline.
   */
  documents(docs: Array<string | DocumentReference>): PipelineType {
    docs.forEach(doc => {
      if (doc instanceof DocumentReference) {
        this._validateReference(doc);
      }
    });

    return this._createPipeline([DocumentsSource.of(docs)]);
  }

  _validateReference(reference: CollectionReference | DocumentReference): void {
    const refDbId = reference.firestore._databaseId;
    if (!refDbId.isEqual(this.databaseId)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid ${
          reference instanceof CollectionReference
            ? 'CollectionReference'
            : 'DocumentReference'
        }. ` +
          `The project ID ("${refDbId.projectId}") or the database ("${refDbId.database}") does not match ` +
          `the project ID ("${this.databaseId.projectId}") and database ("${this.databaseId.database}") of the target database of this Pipeline.`
      );
    }
  }
}
