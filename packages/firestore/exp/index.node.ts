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

import { _registerComponent, registerVersion } from '@firebase/app-exp';
import { Component, ComponentType } from '@firebase/component';

import { version } from '../package.json';

import { Firestore } from './src/api/database';

export { FieldPath, documentId } from '../lite/src/api/field_path';

export {
  Firestore as FirebaseFirestore,
  initializeFirestore,
  getFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  clearIndexedDbPersistence,
  waitForPendingWrites,
  disableNetwork,
  enableNetwork,
  terminate
} from './src/api/database';

export {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  snapshotEqual
} from './src/api/snapshot';

export { SnapshotMetadata } from '../src/api/database';

export {
  DocumentReference,
  CollectionReference,
  Query,
  doc,
  collection,
  collectionGroup,
  parent
} from '../lite/src/api/reference';

export { runTransaction, Transaction } from '../lite/src/api/transaction';

export {
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getQuery,
  getQueryFromCache,
  getQueryFromServer,
  onSnapshot,
  onSnapshotsInSync,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc
} from './src/api/reference';

export {
  FieldValue,
  deleteField,
  increment,
  arrayRemove,
  arrayUnion,
  serverTimestamp
} from '../lite/src/api/field_value';

export { setLogLevel } from '../src/util/log';

export { Blob } from '../src/api/blob';

export { writeBatch } from './src/api/write_batch';

export { WriteBatch } from '../lite/src/api/write_batch';

export { GeoPoint } from '../src/api/geo_point';

export { Timestamp } from '../src/api/timestamp';

export { refEqual, queryEqual } from '../lite/src/api/reference';

export function registerFirestore(): void {
  _registerComponent(
    new Component(
      'firestore-exp',
      container => {
        const app = container.getProvider('app-exp').getImmediate()!;
        return ((app, auth) => new Firestore(app, auth))(
          app,
          container.getProvider('auth-internal')
        );
      },
      ComponentType.PUBLIC
    )
  );
  registerVersion('firestore-exp', version, 'node');
}

registerFirestore();
