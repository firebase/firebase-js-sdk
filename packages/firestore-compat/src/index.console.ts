/**
 * @license
 * Copyright 2019 Google LLC
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

import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import {
  _DatabaseId,
  Firestore as FirestoreExp,
  FirestoreError,
  _EmptyCredentialsProvider
} from '@firebase/firestore';

import {
  Firestore as FirestoreCompat,
  MemoryPersistenceProvider
} from './api/database';

export {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot
} from './api/database';
export { Blob } from './api/blob';
export { GeoPoint } from './api/geo_point';
export { FieldPath } from './api/field_path';
export { FieldValue } from './api/field_value';
export { Timestamp } from './api/timestamp';

export interface FirestoreDatabase {
  projectId: string;
  database?: string;
}

/** Firestore class that exposes the constructor expected by the Console. */
export class Firestore extends FirestoreCompat {
  constructor(
    firestoreDatabase: FirestoreDatabase,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    super(
      databaseIdFromFirestoreDatabase(firestoreDatabase),
      new FirestoreExp(
        databaseIdFromFirestoreDatabase(firestoreDatabase),
        new _EmptyCredentialsProvider()
      ),
      new MemoryPersistenceProvider()
    );
  }
}

function databaseIdFromFirestoreDatabase(
  firestoreDatabase: FirestoreDatabase
): _DatabaseId {
  if (!firestoreDatabase.projectId) {
    throw new FirestoreError('invalid-argument', 'Must provide projectId');
  }
  return new _DatabaseId(
    firestoreDatabase.projectId,
    firestoreDatabase.database
  );
}
