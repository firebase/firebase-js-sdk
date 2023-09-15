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

import { AutoId } from '../../../src/util/misc';

import {
  query,
  CollectionReference,
  DocumentData,
  Firestore,
  Query,
  QueryConstraint,
  where,
  WithFieldValue,
  DocumentReference,
  addDoc as addDocument,
  setDoc as setDocument
} from './firebase_export';
import {
  batchCommitDocsToCollection,
  PERSISTENCE_MODE_UNSPECIFIED,
  PersistenceMode
} from './helpers';
import { COMPOSITE_INDEX_TEST_COLLECTION, DEFAULT_SETTINGS } from './settings';

export class CompositeIndexTestHelper {
  private readonly testId: string;
  private readonly TEST_ID_FIELD: string = 'testId';

  constructor() {
    // Initialize the testId when an instance of the class is created.
    this.testId = 'test-id-' + AutoId.newId();
  }

  async withTestDocs<T>(
    persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
    docs: { [key: string]: DocumentData },
    fn: (collection: CollectionReference, db: Firestore) => Promise<T>
  ): Promise<T> {
    this.addTestIdToDocs(docs);
    return batchCommitDocsToCollection(
      persistence,
      DEFAULT_SETTINGS,
      docs,
      COMPOSITE_INDEX_TEST_COLLECTION,
      fn
    );
  }
  async withEmptyCollection<T>(
    persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
    fn: (collection: CollectionReference, db: Firestore) => Promise<T>
  ): Promise<T> {
    return batchCommitDocsToCollection(
      persistence,
      DEFAULT_SETTINGS,
      {},
      COMPOSITE_INDEX_TEST_COLLECTION,
      fn
    );
  }

  // Add test-id to docs created under a specific test.
  // Docs are modified instead of deep copy for convenience of equality check in tests.
  private addTestIdToDocs(docs: { [key: string]: DocumentData }): void {
    for (const doc of Object.values(docs)) {
      doc[this.TEST_ID_FIELD] = this.testId;
    }
  }

  private addTestIdToDoc(doc: DocumentData): void {
    doc[this.TEST_ID_FIELD] = this.testId;
  }

  // add filter on test id
  query<AppModelType, DbModelType extends DocumentData>(
    query_: Query<AppModelType, DbModelType>,
    ...queryConstraints: QueryConstraint[]
  ): Query<AppModelType, DbModelType> {
    return query(
      query_,
      where(this.TEST_ID_FIELD, '==', this.testId),
      ...queryConstraints
    );
  }

  // add doc with test id
  addDoc<T, DbModelType extends DocumentData>(
    reference: CollectionReference<T, DbModelType>,
    data: WithFieldValue<T>
  ): Promise<DocumentReference<T, DbModelType>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as Record<string, any>)[this.TEST_ID_FIELD] = this.testId;
    return addDocument(reference, data);
  }

  // set doc with test-id
  setDoc<T, DbModelType extends DocumentData>(
    reference: DocumentReference<T, DbModelType>,
    data: WithFieldValue<T>
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as Record<string, any>)[this.TEST_ID_FIELD] = this.testId;
    return setDocument(reference, data);
  }
}
