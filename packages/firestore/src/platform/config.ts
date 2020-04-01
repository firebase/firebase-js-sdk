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

import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { Component, ComponentType, Provider } from '@firebase/component';
import { PublicBlob } from '../api/blob';
import {
  CACHE_SIZE_UNLIMITED,
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
  setLogLevel: Firestore.setLogLevel,
  CACHE_SIZE_UNLIMITED
};

/**
 * Configures Firestore as part of the Firebase SDK by calling registerService.
 *
 * @param firebase The FirebaseNamespace to register Firestore with
 * @param firestoreFactory A factory function that returns a new Firestore
 *    instance.
 */
export function configureForFirebase(
  firebase: FirebaseNamespace,
  firestoreFactory: (
    app: FirebaseApp,
    auth: Provider<FirebaseAuthInternalName>
  ) => Firestore
): void {
  (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component(
      'firestore',
      container => {
        const app = container.getProvider('app').getImmediate()!;
        return firestoreFactory(app, container.getProvider('auth-internal'));
      },
      ComponentType.PUBLIC
    ).setServiceProps({ ...firestoreNamespace })
  );
}
