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

import { FirebaseFirestore as FirestoreExp } from './exp/src/api/database';
import {
  Firestore as FirestoreCompat,
  MemoryPersistenceProvider
} from './src/api/database';
import { FirestoreDatabase } from './lite/src/api/database';
import { Provider } from '@firebase/component';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
export {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot
} from './src/api/database';
export { Blob } from './src/api/blob';
export { GeoPoint } from './src/api/geo_point';
export { FieldPath } from './src/api/field_path';
export { FieldValue } from './src/compat/field_value';
export { Timestamp } from './src/api/timestamp';

/** Firestore class that exposes the constructor expected by the Console. */
export class Firestore extends FirestoreCompat {
  constructor(
    databaseId: FirestoreDatabase,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    super(
      databaseId,
      new FirestoreExp(databaseId, authProvider),
      new MemoryPersistenceProvider()
    );
  }
}
