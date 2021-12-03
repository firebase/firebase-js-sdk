/**
 * @license
 * Copyright 2021 Google LLC
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

// eslint-disable-next-line import/no-extraneous-dependencies
import { FirebaseApp } from '@firebase/app-compat';
import { FirebaseNamespace } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { Component, ComponentType } from '@firebase/component';
import {
  Firestore as ModularFirestore,
  CACHE_SIZE_UNLIMITED,
  GeoPoint,
  Timestamp
} from '@firebase/firestore';

import { Blob } from './api/blob';
import {
  Firestore,
  Transaction,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  setLogLevel
} from './api/database';
import { FieldPath } from './api/field_path';
import { FieldValue } from './api/field_value';

const firestoreNamespace = {
  Firestore,
  GeoPoint,
  Timestamp,
  Blob,
  Transaction,
  WriteBatch,
  DocumentReference,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  CollectionReference,
  FieldPath,
  FieldValue,
  setLogLevel,
  CACHE_SIZE_UNLIMITED
};

/**
 * Configures Firestore as part of the Firebase SDK by calling registerComponent.
 *
 * @param firebase - The FirebaseNamespace to register Firestore with
 * @param firestoreFactory - A factory function that returns a new Firestore
 *    instance.
 */
export function configureForFirebase(
  firebase: FirebaseNamespace,
  firestoreFactory: (
    app: FirebaseApp,
    firestoreExp: ModularFirestore
  ) => Firestore
): void {
  (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component(
      'firestore-compat',
      container => {
        const app = container.getProvider('app-compat').getImmediate()!;
        const firestoreExp = container.getProvider('firestore').getImmediate()!;
        return firestoreFactory(app, firestoreExp);
      },
      'PUBLIC' as ComponentType.PUBLIC
    ).setServiceProps({ ...firestoreNamespace })
  );
}
