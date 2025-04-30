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
import { expect } from 'chai';

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
  Timestamp,
  DocumentSnapshot,
  getDoc as getDocument,
  updateDoc as updateDocument,
  UpdateData,
  getDocs as getDocuments,
  QuerySnapshot,
  deleteDoc as deleteDocument,
  doc,
  and,
  _AutoId,
  _FieldPath,
  newTestFirestore,
  newTestApp,
  collection
} from './firebase_export';
import {
  batchCommitDocsToCollection,
  checkOnlineAndOfflineResultsMatch,
  PERSISTENCE_MODE_UNSPECIFIED,
  PersistenceMode,
  toIds
} from './helpers';
import {
  COMPOSITE_INDEX_TEST_COLLECTION,
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS,
  TARGET_DB_ID
} from './settings';

/**
 * This helper class is designed to facilitate integration testing of Firestore queries that
 * require composite indexes within a controlled testing environment.
 *
 * <p>Key Features:
 *
 * <ul>
 *   <li>Runs tests against the dedicated test collection with predefined composite indexes.
 *   <li>Automatically associates a test ID with documents for data isolation.
 *   <li>Utilizes TTL policy for automatic test data cleanup.
 *   <li>Constructs Firestore queries with test ID filters.
 * </ul>
 */
export class CompositeIndexTestHelper {
  private readonly testId: string;
  private readonly TEST_ID_FIELD: string = 'testId';
  private readonly TTL_FIELD: string = 'expireAt';

  // Creates a new instance of the CompositeIndexTestHelper class, with a unique test
  // identifier for data isolation.
  constructor() {
    this.testId = 'test-id-' + _AutoId.newId();
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

  // Runs a test on COMPOSITE_INDEX_TEST_COLLECTION.
  async withTestCollection<T>(
    persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
    fn: (collection: CollectionReference, db: Firestore) => Promise<T>
  ): Promise<T> {
    const settings = { ...DEFAULT_SETTINGS };
    if (persistence !== PERSISTENCE_MODE_UNSPECIFIED) {
      settings.localCache = persistence.asLocalCacheFirestoreSettings();
    }
    const db = newTestFirestore(
      newTestApp(DEFAULT_PROJECT_ID),
      settings,
      TARGET_DB_ID
    );
    return fn(collection(db, COMPOSITE_INDEX_TEST_COLLECTION), db);
  }

  // Hash the document key with testId.
  private toHashedId(docId: string): string {
    return docId + '-' + this.testId;
  }

  private toHashedIds(docs: string[]): string[] {
    return docs.map(docId => this.toHashedId(docId));
  }

  // Adds test-specific fields to a document, including the testId and expiration date.
  addTestSpecificFieldsToDoc(doc: DocumentData): DocumentData {
    return {
      ...doc,
      [this.TEST_ID_FIELD]: this.testId,
      [this.TTL_FIELD]: new Timestamp( // Expire test data after 24 hours
        Timestamp.now().seconds + 24 * 60 * 60,
        Timestamp.now().nanoseconds
      )
    };
  }

  // Remove test-specific fields from a document, including the testId and expiration date.
  private removeTestSpecificFieldsFromDoc(doc: DocumentData): void {
    doc._document?.data?.delete(new _FieldPath([this.TEST_ID_FIELD]));
    doc._document?.data?.delete(new _FieldPath([this.TEST_ID_FIELD]));
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
    collection: CollectionReference,
    query: Query,
    ...expectedDocs: string[]
  ): Promise<void> {
    return checkOnlineAndOfflineResultsMatch(
      this.query(collection),
      query,
      ...this.toHashedIds(expectedDocs)
    );
  }

  // Asserts that the IDs in the query snapshot matches the expected Ids. The expected document
  // IDs are hashed to match the actual document IDs created by the test helper.
  assertSnapshotResultIdsMatch(
    snapshot: QuerySnapshot,
    expectedIds: string[]
  ): void {
    expect(toIds(snapshot)).to.deep.equal(this.toHashedIds(expectedIds));
  }

  // Adds a filter on test id for a query.
  query<T>(query_: Query<T>, ...queryConstraints: QueryConstraint[]): Query<T> {
    return internalQuery(
      query_,
      where(this.TEST_ID_FIELD, '==', this.testId),
      ...queryConstraints
    );
  }

  // Adds a filter on test id for a composite query.
  compositeQuery<T>(
    query_: Query<T>,
    compositeFilter: QueryCompositeFilterConstraint,
    ...queryConstraints: QueryNonFilterConstraint[]
  ): Query<T> {
    return internalQuery(
      query_,
      and(where(this.TEST_ID_FIELD, '==', this.testId), compositeFilter),
      ...queryConstraints
    );
  }
  // Get document reference from a document key.
  getDocRef<T>(
    coll: CollectionReference<T>,
    docId: string
  ): DocumentReference<T> {
    if (!docId.includes('test-id-')) {
      docId = this.toHashedId(docId);
    }
    return doc(coll, docId);
  }

  // Adds a document to a Firestore collection with test-specific fields.
  addDoc<T>(
    reference: CollectionReference<T>,
    data: object
  ): Promise<DocumentReference<T>> {
    const processedData = this.addTestSpecificFieldsToDoc(
      data
    ) as WithFieldValue<T>;
    return addDocument(reference, processedData);
  }

  // Sets a document in Firestore with test-specific fields.
  setDoc<T>(reference: DocumentReference<T>, data: object): Promise<void> {
    const processedData = this.addTestSpecificFieldsToDoc(
      data
    ) as WithFieldValue<T>;
    return setDocument(reference, processedData);
  }

  updateDoc<T, DbModelType extends DocumentData>(
    reference: DocumentReference<T, DbModelType>,
    data: UpdateData<DbModelType>
  ): Promise<void> {
    return updateDocument(reference, data);
  }

  deleteDoc<T>(reference: DocumentReference<T>): Promise<void> {
    return deleteDocument(reference);
  }

  // Retrieves a single document from Firestore with test-specific fields removed.
  async getDoc<T>(docRef: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
    const docSnapshot = await getDocument(docRef);
    this.removeTestSpecificFieldsFromDoc(docSnapshot);
    return docSnapshot;
  }

  // Retrieves multiple documents from Firestore with test-specific fields removed.
  async getDocs<T>(query_: Query<T>): Promise<QuerySnapshot<T>> {
    const querySnapshot = await getDocuments(this.query(query_));
    querySnapshot.forEach(doc => {
      this.removeTestSpecificFieldsFromDoc(doc);
    });
    return querySnapshot;
  }
}
