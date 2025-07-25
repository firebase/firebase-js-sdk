/**
 * @license
 * Copyright 2017 Google LLC
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

// Helpers here mock Firestore in order to unit-test API types. Do NOT use
// these in any integration test, where we expect working Firestore object.

import {
  DocumentReference,
  ensureFirestoreConfigured,
  Firestore,
  Query,
  CollectionReference,
  QuerySnapshot,
  DocumentSnapshot,
  SnapshotMetadata
} from '../../src';
import {
  EmptyAppCheckTokenProvider,
  EmptyAuthCredentialsProvider
} from '../../src/api/credentials';
import { ExpUserDataWriter } from '../../src/api/reference_impl';
import { DatabaseId } from '../../src/core/database_info';
import { newQueryForPath, Query as InternalQuery } from '../../src/core/query';
import {
  ChangeType,
  DocumentViewChange,
  ViewSnapshot
} from '../../src/core/view_snapshot';
import { DocumentKeySet } from '../../src/model/collections';
import { DocumentSet } from '../../src/model/document_set';
import { JsonObject } from '../../src/model/object_value';
import { TEST_PROJECT } from '../unit/local/persistence_test_helpers';

import { doc, key, path as pathFrom } from './helpers';

/**
 * A mock Firestore. Will not work for integration test.
 */
export const FIRESTORE = newTestFirestore(TEST_PROJECT);

export function firestore(): Firestore {
  return FIRESTORE;
}

export function newTestFirestore(projectId = 'new-project'): Firestore {
  return new Firestore(
    new EmptyAuthCredentialsProvider(),
    new EmptyAppCheckTokenProvider(),
    new DatabaseId(projectId)
  );
}

export function collectionReference(path: string): CollectionReference {
  const db = firestore();
  ensureFirestoreConfigured(db);
  return new CollectionReference(db, /* converter= */ null, pathFrom(path));
}

export function documentReference(path: string): DocumentReference {
  const db = firestore();
  ensureFirestoreConfigured(db);
  return new DocumentReference(db, /* converter= */ null, key(path));
}

export function documentSnapshot(
  path: string,
  data: JsonObject<unknown> | null,
  fromCache: boolean,
  hasPendingWrites?: boolean
): DocumentSnapshot {
  hasPendingWrites = !!hasPendingWrites;
  const db = firestore();
  const userDataWriter = new ExpUserDataWriter(db);
  if (data) {
    return new DocumentSnapshot(
      db,
      userDataWriter,
      key(path),
      doc(path, 1, data),
      new SnapshotMetadata(hasPendingWrites, fromCache),
      /* converter= */ null
    );
  } else {
    return new DocumentSnapshot(
      db,
      userDataWriter,
      key(path),
      null,
      new SnapshotMetadata(hasPendingWrites, fromCache),
      /* converter= */ null
    );
  }
}

export function query(path: string): Query {
  const db = firestore();
  return new Query(db, /* converter= */ null, newQueryForPath(pathFrom(path)));
}

/**
 * A convenience method for creating a particular query snapshot for tests.
 *
 * @param path - To be used in constructing the query.
 * @param oldDocs - Provides the prior set of documents in the QuerySnapshot.
 * Each entry maps to a document, with the key being the document id, and the
 * value being the document contents.
 * @param docsToAdd - Specifies data to be added into the query snapshot as of
 * now. Each entry maps to a document, with the key being the document id, and
 * the value being the document contents.
 * @param mutatedKeys - The list of document with pending writes.
 * @param fromCache - Whether the query snapshot is cache result.
 * @param syncStateChanged - Whether the sync state has changed.
 * @returns A query snapshot that consists of both sets of documents.
 */
export function querySnapshot(
  path: string,
  oldDocs: { [key: string]: JsonObject<unknown> },
  docsToAdd: { [key: string]: JsonObject<unknown> },
  mutatedKeys: DocumentKeySet,
  fromCache: boolean,
  syncStateChanged: boolean,
  hasCachedResults?: boolean
): QuerySnapshot {
  const query: InternalQuery = newQueryForPath(pathFrom(path));
  let oldDocuments: DocumentSet = new DocumentSet();
  Object.keys(oldDocs).forEach(key => {
    oldDocuments = oldDocuments.add(doc(path + '/' + key, 1, oldDocs[key]));
  });
  let newDocuments: DocumentSet = new DocumentSet();
  const documentChanges: DocumentViewChange[] = [];
  Object.keys(docsToAdd).forEach(key => {
    const docToAdd = doc(path + '/' + key, 1, docsToAdd[key]);
    newDocuments = newDocuments.add(docToAdd);
    documentChanges.push({ type: ChangeType.Added, doc: docToAdd });
  });
  const viewSnapshot: ViewSnapshot = new ViewSnapshot(
    query,
    newDocuments,
    oldDocuments,
    documentChanges,
    mutatedKeys,
    fromCache,
    syncStateChanged,
    false,
    hasCachedResults ?? false
  );
  const db = firestore();
  return new QuerySnapshot(
    db,
    new ExpUserDataWriter(db),
    new Query(db, /* converter= */ null, query),
    viewSnapshot
  );
}
