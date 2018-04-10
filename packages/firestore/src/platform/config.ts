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

import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { PublicBlob } from '../api/blob';
import {
  Firestore,
  PublicCollectionReference,
  PublicDocumentReference,
  PublicDocumentSnapshot,
  PublicFirestore,
  PublicQuery,
  PublicQueryDocumentSnapshot,
  PublicQuerySnapshot,
  PublicTransaction,
  PublicWriteBatch
} from '../api/database';
import { FieldPath } from '../api/field_path';
import { PublicFieldValue } from '../api/field_value';
import { GeoPoint } from '../api/geo_point';
import { Timestamp } from '../api/timestamp';
import { shallowCopy } from '../util/obj';

const firestoreNamespace = {
  Firestore: PublicFirestore,
  GeoPoint,
  Timestamp,
  Blob: PublicBlob,
  Transaction: PublicTransaction,
  WriteBatch: PublicWriteBatch,
  DocumentReference: PublicDocumentReference,
  DocumentSnapshot: PublicDocumentSnapshot,
  Query: PublicQuery,
  QueryDocumentSnapshot: PublicQueryDocumentSnapshot,
  QuerySnapshot: PublicQuerySnapshot,
  CollectionReference: PublicCollectionReference,
  FieldPath,
  FieldValue: PublicFieldValue,
  setLogLevel: Firestore.setLogLevel
};

/**
 * Configures Firestore as part of the Firebase SDK by calling registerService.
 */
export function configureForFirebase(firebase: FirebaseNamespace): void {
  (firebase as _FirebaseNamespace).INTERNAL.registerService(
    'firestore',
    (app: FirebaseApp) => new Firestore(app),
    shallowCopy(firestoreNamespace)
  );
}

/**
 * Exports the Firestore namespace into the provided `exportObject` object under
 * the key 'firestore'. This is used for wrapped binary that exposes Firestore
 * as a goog module.
 */
export function configureForStandalone(exportObject: {
  [key: string]: {};
}): void {
  const copiedNamespace = shallowCopy(firestoreNamespace);
  // Unlike the use with Firebase, the standalone allows the use of the
  // constructor, so export it's internal class
  copiedNamespace['Firestore'] = Firestore;
  exportObject['firestore'] = copiedNamespace;
}
