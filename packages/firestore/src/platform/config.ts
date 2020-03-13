/**
 * @license
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

import { FirebaseNamespace } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { Component, ComponentType } from '@firebase/component';
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
import { PersistenceProvider } from '../local/persistence';
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
  setLogLevel: Firestore.setLogLevel,
  CACHE_SIZE_UNLIMITED
};

/**
 * Configures Firestore as part of the Firebase SDK by calling registerService.
 *
 * @param firebase The FirebaseNamespace to register Firestore with
 * @param persistenceProviderFactory A factory function that returns a
 *    PersistenceProvider. The factory should return a new instance of the
 *    PersistenceProvider for each call, ensuring distinct persistent layers
 *    for all Firestore instances.
 */
export function configureForFirebase(
  firebase: FirebaseNamespace,
  persistenceProviderFactory: () => PersistenceProvider
): void {
  (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component(
      'firestore',
      container => {
        const app = container.getProvider('app').getImmediate()!;
        return new Firestore(
          app,
          container.getProvider('auth-internal'),
          persistenceProviderFactory()
        );
      },
      ComponentType.PUBLIC
    ).setServiceProps(shallowCopy(firestoreNamespace))
  );
}
