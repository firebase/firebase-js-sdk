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
import { toPipelineStages } from '../core/pipeline-util';
import { Code, FirestoreError } from '../util/error';
import { isString } from '../util/types';

import {
  CollectionReference,
  DocumentReference,
  isCollectionReference,
  Query
} from './reference';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource,
  Stage
} from './stage';
import {
  CollectionGroupStageOptions,
  CollectionStageOptions,
  DatabaseStageOptions,
  DocumentsStageOptions
} from './stage_options';
import { UserDataReader, UserDataSource } from './user_data_reader';

/**
 * @beta
 * Provides the entry point for defining the data source of a Firestore {@link Pipeline}.
 *
 * Use the methods of this class (e.g., {@link PipelineSource#collection}, {@link PipelineSource#collectionGroup},
 * {@link PipelineSource#database}, or {@link PipelineSource#documents}) to specify the initial data
 * for your pipeline, such as a collection, a collection group, the entire database, or a set of specific documents.
 */
export class PipelineSource<PipelineType> {
  /**
   * @internal
   * @private
   * @param databaseId
   * @param userDataReader
   * @param _createPipeline
   */
  constructor(
    private databaseId: DatabaseId,
    private userDataReader: UserDataReader,
    /**
     * @internal
     * @private
     */
    public _createPipeline: (stages: Stage[]) => PipelineType
  ) {}

  /**
   * @beta
   * Returns all documents from the entire collection. The collection can be nested.
   * @param collection - Name or reference to the collection that will be used as the Pipeline source.
   */
  collection(collection: string | CollectionReference): PipelineType;
  /**
   * @beta
   * Returns all documents from the entire collection. The collection can be nested.
   * @param options - Options defining how this CollectionStage is evaluated.
   */
  collection(options: CollectionStageOptions): PipelineType;
  collection(
    collectionOrOptions: string | CollectionReference | CollectionStageOptions
  ): PipelineType {
    // Process argument union(s) from method overloads
    const options =
      isString(collectionOrOptions) ||
      isCollectionReference(collectionOrOptions)
        ? {}
        : collectionOrOptions;
    const collectionRefOrString =
      isString(collectionOrOptions) ||
      isCollectionReference(collectionOrOptions)
        ? collectionOrOptions
        : collectionOrOptions.collection;

    // Validate that a user provided reference is for the same Firestore DB
    if (isCollectionReference(collectionRefOrString)) {
      this._validateReference(collectionRefOrString);
    }

    // Convert user land convenience types to internal types
    const normalizedCollection = isString(collectionRefOrString)
      ? (collectionRefOrString as string)
      : collectionRefOrString.path;

    // Create stage object
    const stage = new CollectionSource(normalizedCollection, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'collection'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._createPipeline([stage]);
  }

  /**
   * @beta
   * Returns all documents from a collection ID regardless of the parent.
   * @param collectionId - ID of the collection group to use as the Pipeline source.
   */
  collectionGroup(collectionId: string): PipelineType;
  /**
   * @beta
   * Returns all documents from a collection ID regardless of the parent.
   * @param options - Options defining how this CollectionGroupStage is evaluated.
   */
  collectionGroup(options: CollectionGroupStageOptions): PipelineType;
  collectionGroup(
    collectionIdOrOptions: string | CollectionGroupStageOptions
  ): PipelineType {
    // Process argument union(s) from method overloads
    let collectionId: string;
    let options: {};
    if (isString(collectionIdOrOptions)) {
      collectionId = collectionIdOrOptions;
      options = {};
    } else {
      ({ collectionId, ...options } = collectionIdOrOptions);
    }

    // Create stage object
    const stage = new CollectionGroupSource(collectionId, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'collectionGroup'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._createPipeline([stage]);
  }

  /**
   * @beta
   * Returns all documents from the entire database.
   */
  database(): PipelineType;
  /**
   * @beta
   * Returns all documents from the entire database.
   * @param options - Options defining how a DatabaseStage is evaluated.
   */
  database(options: DatabaseStageOptions): PipelineType;
  database(options?: DatabaseStageOptions): PipelineType {
    // Process argument union(s) from method overloads
    options = options ?? {};

    // Create stage object
    const stage = new DatabaseSource(options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'database'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._createPipeline([stage]);
  }

  /**
   * @beta
   * Set the pipeline's source to the documents specified by the given paths and DocumentReferences.
   *
   * @param docs An array of paths and DocumentReferences specifying the individual documents that will be the source of this pipeline.
   * The converters for these DocumentReferences will be ignored and not have an effect on this pipeline.
   *
   * @throws {@FirestoreError} Thrown if any of the provided DocumentReferences target a different project or database than the pipeline.
   */
  documents(docs: Array<string | DocumentReference>): PipelineType;

  /**
   * @beta
   * Set the pipeline's source to the documents specified by the given paths and DocumentReferences.
   *
   * @param options - Options defining how this DocumentsStage is evaluated.
   *
   * @throws {@FirestoreError} Thrown if any of the provided DocumentReferences target a different project or database than the pipeline.
   */
  documents(options: DocumentsStageOptions): PipelineType;
  documents(
    docsOrOptions: Array<string | DocumentReference> | DocumentsStageOptions
  ): PipelineType {
    // Process argument union(s) from method overloads
    let options: {};
    let docs: Array<string | DocumentReference>;
    if (Array.isArray(docsOrOptions)) {
      docs = docsOrOptions;
      options = {};
    } else {
      ({ docs, ...options } = docsOrOptions);
    }

    // Validate that all user provided references are for the same Firestore DB
    docs
      .filter(v => v instanceof DocumentReference)
      .forEach(dr => this._validateReference(dr as DocumentReference));

    // Convert user land convenience types to internal types
    const normalizedDocs: string[] = docs.map(doc =>
      isString(doc) ? doc : doc.path
    );

    // Create stage object
    const stage = new DocumentsSource(normalizedDocs, options);

    // User data must be read in the context of the API method to
    // provide contextual errors
    const parseContext = this.userDataReader.createContext(
      UserDataSource.Argument,
      'documents'
    );
    stage._readUserData(parseContext);

    // Add stage to the pipeline
    return this._createPipeline([stage]);
  }

  /**
   * @beta
   * Convert the given Query into an equivalent Pipeline.
   *
   * @param query A Query to be converted into a Pipeline.
   *
   * @throws {@FirestoreError} Thrown if any of the provided DocumentReferences target a different project or database than the pipeline.
   */
  createFrom(query: Query): PipelineType {
    return this._createPipeline(
      toPipelineStages(query._query, query.firestore)
    );
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
