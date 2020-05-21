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

export {
  Firestore as FirebaseFirestore,
  initializeFirestore,
  getFirestore,
  setLogLevel // writeBatch, // runTransaction, // terminate
} from './src/api/database';

export {
  collection,
  doc,
  parent,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  // addDoc,
  getQuery,
  Query,
  DocumentReference,
  CollectionReference // refEqual, // queryEqual
} from './src/api/reference';

export {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot // snapshotEqual
} from './src/api/snapshot';

// export { Transaction } from './src/api/transaction';

export { WriteBatch } from './src/api/write_batch';

export {
  FieldValue,
  deleteField,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from './src/api/field_value';

export {
  FieldPath //documentId
} from '../src/api/field_path';

export { Timestamp } from '../src/api/timestamp';

export { GeoPoint } from '../src/api/geo_point';

export { Blob } from '../src/api/blob';
