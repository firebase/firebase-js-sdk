/**
 * Copyright 2017 Google Inc.
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
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QuerySnapshot
} from '../../src/api/database';
import { Query as InternalQuery } from '../../src/core/query';
import {
  ChangeType,
  DocumentViewChange,
  ViewSnapshot
} from '../../src/core/view_snapshot';
import { DocumentKeySet } from '../../src/model/collections';
import { Document } from '../../src/model/document';
import { DocumentSet } from '../../src/model/document_set';
import { JsonObject } from '../../src/model/field_value';
import { AnyJs } from '../../src/util/misc';
import { doc, key, path as pathFrom } from './helpers';

/**
 * A mock Firestore. Will not work for integration test.
 */
export const FIRESTORE = new Firestore({
  projectId: 'projectid',
  database: 'database'
});

export function firestore(): Firestore {
  return FIRESTORE;
}

export function collectionReference(path: string): CollectionReference {
  return new CollectionReference(pathFrom(path), firestore());
}

export function documentReference(path: string): DocumentReference {
  return new DocumentReference(key(path), firestore());
}

export function documentSnapshot(
  path: string,
  data: JsonObject<AnyJs> | null,
  fromCache: boolean
): DocumentSnapshot {
  if (data) {
    return new DocumentSnapshot(
      firestore(),
      key(path),
      doc(path, 1, data),
      fromCache,
      /* hasPendingWrites= */ false
    );
  } else {
    return new DocumentSnapshot(
      firestore(),
      key(path),
      null,
      fromCache,
      /* hasPendingWrites= */ false
    );
  }
}

export function query(path: string): Query {
  return new Query(InternalQuery.atPath(pathFrom(path)), firestore());
}

/**
 * A convenience method for creating a particular query snapshot for tests.
 *
 * @param path To be used in constructing the query.
 * @param oldDocs Provides the prior set of documents in the QuerySnapshot. Each entry maps to a
 *     document, with the key being the document id, and the value being the document contents.
 * @param docsToAdd Specifies data to be added into the query snapshot as of now. Each entry maps
 *     to a document, with the key being the document id, and the value being the document contents.
 * @param mutatedKeys The list of document with pending writes.
 * @param fromCache Whether the query snapshot is cache result.
 * @param syncStateChanged Whether the sync state has changed.
 * @return A query snapshot that consists of both sets of documents.
 */
export function querySnapshot(
  path: string,
  oldDocs: { [key: string]: JsonObject<AnyJs> },
  docsToAdd: { [key: string]: JsonObject<AnyJs> },
  mutatedKeys: DocumentKeySet,
  fromCache: boolean,
  syncStateChanged: boolean
): QuerySnapshot {
  const query: InternalQuery = InternalQuery.atPath(pathFrom(path));
  let oldDocuments: DocumentSet = new DocumentSet();
  Object.keys(oldDocs).forEach(key => {
    oldDocuments = oldDocuments.add(doc(path + '/' + key, 1, oldDocs[key]));
  });
  let newDocuments: DocumentSet = new DocumentSet();
  const documentChanges: DocumentViewChange[] = [];
  Object.keys(docsToAdd).forEach(key => {
    const docToAdd: Document = doc(path + '/' + key, 1, docsToAdd[key]);
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
    false
  );
  return new QuerySnapshot(firestore(), query, viewSnapshot);
}
