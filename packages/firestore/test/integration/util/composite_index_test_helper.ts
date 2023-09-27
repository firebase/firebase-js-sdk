/**
 * @license
 * Copyright 2023 Google LLC
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

import { and } from '../../../src/lite-api/query';
import { AutoId } from '../../../src/util/misc';

import {
  query as internalQuery,
  CollectionReference,
  DocumentData,
  Firestore,
  Query,
  QueryConstraint,
  where,
  WithFieldValue,
  DocumentReference,
  addDoc as addDocument,
  setDoc as setDocument,
  QueryCompositeFilterConstraint,
  QueryNonFilterConstraint,
  Timestamp
} from './firebase_export';
import {
  batchCommitDocsToCollection,
  checkOnlineAndOfflineResultsMatch,
  PERSISTENCE_MODE_UNSPECIFIED,
  PersistenceMode
} from './helpers';
import { COMPOSITE_INDEX_TEST_COLLECTION, DEFAULT_SETTINGS } from './settings';

/**
 * This helper class is designed to facilitate integration testing of Firestore
 * queries that require composite indexes within a controlled testing environment.
 *
 * Key Features:
 * - Runs tests against the dedicated test collection with predefined composite indexes.
 * - Automatically associates a test ID with documents for data isolation.
 * - Constructs Firestore queries with test ID filters.
 */
export class CompositeIndexTestHelper {
  private readonly testId: string;
  private readonly TEST_ID_FIELD: string = 'testId';

  // Creates a new instance of the CompositeIndexTestHelper class, with a unique test
  // identifier for data isolation.
  constructor() {
    this.testId = 'test-id-' + AutoId.newId();
  }

  // Runs a test with specified documents in the COMPOSITE_INDEX_TEST_COLLECTION.
  async withTestDocs<T>(
    persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
    docs: { [key: string]: DocumentData },
    fn: (collection: CollectionReference, db: Firestore) => Promise<T>
  ): Promise<T> {
    return batchCommitDocsToCollection(
      persistence,
      DEFAULT_SETTINGS,
      this.prepareTestDocuments(docs),
      COMPOSITE_INDEX_TEST_COLLECTION,
      fn
    );
  }

  // Hash the document key with testId.
  toHashedId(docId: string): string {
    return docId + '-' + this.testId;
  }

  toHashedIds(docs: string[]): string[] {
    return docs.map(docId => this.toHashedId(docId));
  }

  // Adds test-specific fields to a document, including the testId and expiration date.
  addTestSpecificFieldsToDoc(doc: DocumentData): DocumentData {
    return {
      ...doc,
      [this.TEST_ID_FIELD]: this.testId,
      expireAt: new Timestamp( // Expire test data after 24 hours
        Timestamp.now().seconds + 24 * 60 * 60,
        Timestamp.now().nanoseconds
      )
    };
  }

  // Helper method to hash document keys and add test-specific fields for the provided documents.
  private prepareTestDocuments(docs: { [key: string]: DocumentData }): {
    [key: string]: DocumentData;
  } {
    const result: { [key: string]: DocumentData } = {};
    for (const key in docs) {
      if (docs.hasOwnProperty(key)) {
        result[this.toHashedId(key)] = this.addTestSpecificFieldsToDoc(
          docs[key]
        );
      }
    }
    return result;
  }

  // Asserts that the result of running the query while online (against the backend/emulator) is
  // the same as running it while offline. The expected document Ids are hashed to match the
  // actual document IDs created by the test helper.
  async assertOnlineAndOfflineResultsMatch(
    query: Query,
    ...expectedDocs: string[]
  ): Promise<void> {
    return checkOnlineAndOfflineResultsMatch(
      query,
      ...this.toHashedIds(expectedDocs)
    );
  }

  // Adds a filter on test id for a query.
  query<AppModelType, DbModelType extends DocumentData>(
    query_: Query<AppModelType, DbModelType>,
    ...queryConstraints: QueryConstraint[]
  ): Query<AppModelType, DbModelType> {
    return internalQuery(
      query_,
      where(this.TEST_ID_FIELD, '==', this.testId),
      ...queryConstraints
    );
  }

  // Adds a filter on test id for a composite query.
  compositeQuery<AppModelType, DbModelType extends DocumentData>(
    query_: Query<AppModelType, DbModelType>,
    compositeFilter: QueryCompositeFilterConstraint,
    ...queryConstraints: QueryNonFilterConstraint[]
  ): Query<AppModelType, DbModelType> {
    return internalQuery(
      query_,
      and(where(this.TEST_ID_FIELD, '==', this.testId), compositeFilter),
      ...queryConstraints
    );
  }

  // Adds a document to a Firestore collection with test-specific fields.
  addDoc<T, DbModelType extends DocumentData>(
    reference: CollectionReference<T, DbModelType>,
    data: object
  ): Promise<DocumentReference<T, DbModelType>> {
    const docWithTestId = this.addTestSpecificFieldsToDoc(
      data
    ) as WithFieldValue<T>;
    return addDocument(reference, docWithTestId);
  }

  // Sets a document in Firestore with test-specific fields.
  setDoc<T, DbModelType extends DocumentData>(
    reference: DocumentReference<T, DbModelType>,
    data: object
  ): Promise<void> {
    const docWithTestId = this.addTestSpecificFieldsToDoc(
      data
    ) as WithFieldValue<T>;
    return setDocument(reference, docWithTestId);
  }
}
