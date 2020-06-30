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
import {
  CollectionReference,
  doc,
  DocumentReference,
  newUserDataReader,
  Query
} from '../../../lite/src/api/reference';
import { cast } from '../../../lite/src/api/util';
import {
  applyFirestoreDataConverter,
  getDocsViaSnapshotListener,
  getDocViaSnapshotListener,
  SnapshotMetadata
} from '../../../src/api/database';
import { FieldPath } from '../../../src/api/field_path';
import {
  DocumentKeyReference,
  ParsedUpdateData
} from '../../../src/api/user_data_reader';
import { ViewSnapshot } from '../../../src/core/view_snapshot';
import { Document } from '../../../src/model/document';
import { DeleteMutation, Precondition } from '../../../src/model/mutation';
import { debugAssert } from '../../../src/util/assert';
import * as firestore from '../../index';

import { Firestore } from './database';
import { DocumentSnapshot, QuerySnapshot } from './snapshot';

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

export function setDoc<T>(
  reference: firestore.DocumentReference<T>,
  data: T
): Promise<void>;
export function setDoc<T>(
  reference: firestore.DocumentReference<T>,
  data: Partial<T>,
  options: firestore.SetOptions
): Promise<void>;
export function setDoc<T>(
  reference: firestore.DocumentReference<T>,
  data: T,
  options?: firestore.SetOptions
): Promise<void> {
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast(ref.firestore, Firestore);

  const convertedValue = applyFirestoreDataConverter(
    ref._converter,
    data,
    options
  );
  const dataReader = newUserDataReader(firestore);
  const parsed = dataReader.parseSetData(
    'setDoc',
    ref._key,
    convertedValue,
    ref._converter !== null,
    options
  );

  return firestore
    ._getFirestoreClient()
    .then(firestoreClient =>
      firestoreClient.write(parsed.toMutations(ref._key, Precondition.none()))
    );
}

export function updateDoc(
  reference: firestore.DocumentReference<unknown>,
  data: firestore.UpdateData
): Promise<void>;
export function updateDoc(
  reference: firestore.DocumentReference<unknown>,
  field: string | firestore.FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function updateDoc(
  reference: firestore.DocumentReference<unknown>,
  fieldOrUpdateData: string | firestore.FieldPath | firestore.UpdateData,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void> {
  const ref = cast<DocumentReference<unknown>>(reference, DocumentReference);
  const firestore = cast(ref.firestore, Firestore);
  const dataReader = newUserDataReader(firestore);

  let parsed: ParsedUpdateData;
  if (
    typeof fieldOrUpdateData === 'string' ||
    fieldOrUpdateData instanceof FieldPath
  ) {
    parsed = dataReader.parseUpdateVarargs(
      'updateDoc',
      ref._key,
      fieldOrUpdateData,
      value,
      moreFieldsAndValues
    );
  } else {
    parsed = dataReader.parseUpdateData(
      'updateDoc',
      ref._key,
      fieldOrUpdateData
    );
  }

  return firestore
    ._getFirestoreClient()
    .then(firestoreClient =>
      firestoreClient.write(
        parsed.toMutations(ref._key, Precondition.exists(true))
      )
    );
}

export function deleteDoc(
  reference: firestore.DocumentReference
): Promise<void> {
  const ref = cast<DocumentReference<unknown>>(reference, DocumentReference);
  const firestore = cast(ref.firestore, Firestore);
  return firestore
    ._getFirestoreClient()
    .then(firestoreClient =>
      firestoreClient.write([new DeleteMutation(ref._key, Precondition.none())])
    );
}

export function addDoc<T>(
  reference: firestore.CollectionReference<T>,
  data: T
): Promise<firestore.DocumentReference<T>> {
  const collRef = cast<CollectionReference<T>>(reference, CollectionReference);
  const firestore = cast(collRef, Firestore);
  const docRef = doc(collRef);

  const convertedValue = applyFirestoreDataConverter(collRef._converter, data);

  const dataReader = newUserDataReader(collRef.firestore);
  const parsed = dataReader.parseSetData(
    'addDoc',
    docRef._key,
    convertedValue,
    collRef._converter !== null
  );

  return firestore
    ._getFirestoreClient()
    .then(firestoreClient =>
      firestoreClient.write(
        parsed.toMutations(docRef._key, Precondition.exists(false))
      )
    )
    .then(() => docRef);
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
    'Expected zero or a single result on a document-only query'
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
