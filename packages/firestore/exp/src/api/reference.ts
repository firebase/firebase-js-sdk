/**
 * @license
 * Copyright 2020 Google LLC
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

// See https://github.com/typescript-eslint/typescript-eslint/issues/363
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as firestore from '../../index';

import { Firestore } from './database';
import { DocumentKeyReference } from '../../../src/api/user_data_reader';
import { debugAssert } from '../../../src/util/assert';
import { cast } from '../../../lite/src/api/util';
import { DocumentSnapshot, QuerySnapshot } from './snapshot';
import {
  getDocsViaSnapshotListener,
  getDocViaSnapshotListener,
  SnapshotMetadata
} from '../../../src/api/database';
import { ViewSnapshot } from '../../../src/core/view_snapshot';
import { DocumentReference, Query } from '../../../lite/src/api/reference';
import { Document } from '../../../src/model/document';

export function getDoc<T>(
  reference: firestore.DocumentReference<T>
): Promise<firestore.DocumentSnapshot<T>> {
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast<Firestore>(ref.firestore, Firestore);
  return firestore._getFirestoreClient().then(async firestoreClient => {
    const viewSnapshot = await getDocViaSnapshotListener(
      firestoreClient,
      ref._key
    );
    return convertToDocSnapshot(firestore, ref, viewSnapshot);
  });
}

// TODO(firestorexp): Make sure we don't include Datastore/RemoteStore in builds
// that only include `getDocFromCache`.
export function getDocFromCache<T>(
  reference: firestore.DocumentReference<T>
): Promise<firestore.DocumentSnapshot<T>> {
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast<Firestore>(ref.firestore, Firestore);
  return firestore._getFirestoreClient().then(async firestoreClient => {
    const doc = await firestoreClient.getDocumentFromLocalCache(ref._key);
    return new DocumentSnapshot(
      firestore,
      ref._key,
      doc,
      new SnapshotMetadata(
        doc instanceof Document ? doc.hasLocalMutations : false,
        /* fromCache= */ true
      ),
      ref._converter
    );
  });
}

export function getDocFromServer<T>(
  reference: firestore.DocumentReference<T>
): Promise<firestore.DocumentSnapshot<T>> {
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast<Firestore>(ref.firestore, Firestore);
  return firestore._getFirestoreClient().then(async firestoreClient => {
    const viewSnapshot = await getDocViaSnapshotListener(
      firestoreClient,
      ref._key,
      { source: 'server' }
    );
    return convertToDocSnapshot(firestore, ref, viewSnapshot);
  });
}

export function getQuery<T>(
  query: firestore.Query<T>
): Promise<QuerySnapshot<T>> {
  const internalQuery = cast<Query<T>>(query, Query);
  const firestore = cast<Firestore>(query.firestore, Firestore);
  return firestore._getFirestoreClient().then(async firestoreClient => {
    const snapshot = await getDocsViaSnapshotListener(
      firestoreClient,
      internalQuery._query
    );
    return new QuerySnapshot(
      firestore,
      internalQuery,
      snapshot,
      new SnapshotMetadata(snapshot.hasPendingWrites, snapshot.fromCache)
    );
  });
}

export function getQueryFromCache<T>(
  query: firestore.Query<T>
): Promise<QuerySnapshot<T>> {
  const internalQuery = cast<Query<T>>(query, Query);
  const firestore = cast<Firestore>(query.firestore, Firestore);
  return firestore._getFirestoreClient().then(async firestoreClient => {
    const snapshot = await firestoreClient.getDocumentsFromLocalCache(
      internalQuery._query
    );
    return new QuerySnapshot(
      firestore,
      internalQuery,
      snapshot,
      new SnapshotMetadata(snapshot.hasPendingWrites, /* fromCache= */ true)
    );
  });
}
export function getQueryFromServer<T>(
  query: firestore.Query<T>
): Promise<QuerySnapshot<T>> {
  const internalQuery = cast<Query<T>>(query, Query);
  const firestore = cast<Firestore>(query.firestore, Firestore);
  return firestore._getFirestoreClient().then(async firestoreClient => {
    const snapshot = await getDocsViaSnapshotListener(
      firestoreClient,
      internalQuery._query,
      { source: 'server' }
    );
    return new QuerySnapshot(
      firestore,
      internalQuery,
      snapshot,
      new SnapshotMetadata(snapshot.hasPendingWrites, snapshot.fromCache)
    );
  });
}

/**
 * Converts a ViewSnapshot that contains the single document specified by `ref`
 * to a DocumentSnapshot.
 */
function convertToDocSnapshot<T>(
  firestore: Firestore,
  ref: DocumentKeyReference<T>,
  snapshot: ViewSnapshot
): DocumentSnapshot<T> {
  debugAssert(
    snapshot.docs.size <= 1,
    'Too many documents returned on a document query'
  );
  const doc = snapshot.docs.get(ref._key);

  return new DocumentSnapshot(
    firestore,
    ref._key,
    doc,
    new SnapshotMetadata(snapshot.hasPendingWrites, snapshot.fromCache),
    ref._converter
  );
}
