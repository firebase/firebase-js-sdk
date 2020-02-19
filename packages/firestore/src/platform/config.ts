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

import * as firestore from '@firebase/firestore-types';

import { FirebaseNamespace } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { PublicBlob } from '../api/blob';
import {
  CACHE_SIZE_UNLIMITED,
  Firestore,
  PublicCollectionReference,
  PublicDocumentReference,
  PublicDocumentSnapshot,
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
import { Dict, shallowCopy } from '../util/obj';
import { Component, ComponentType } from '@firebase/component';

const firestoreNamespace: Dict<unknown> = {
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
 */
export function configureForFirebase<T extends Function>(
  firebase: FirebaseNamespace,
  publicFirestore: T,
  internalFirestore: typeof Firestore
): void {
  const copiedNamespace = shallowCopy(firestoreNamespace);
  copiedNamespace.Firestore = publicFirestore;
  (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component(
      'firestore',
      container => {
        const app = container.getProvider('app').getImmediate()!;
        return new internalFirestore(
          app,
          container.getProvider('auth-internal')
        );
      },
      ComponentType.PUBLIC
    ).setServiceProps(copiedNamespace)
  );
}
