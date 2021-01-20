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

import { registerFirestore } from './register';
registerFirestore();

export { Settings } from '../src/lite/settings';

export {
  FirebaseFirestore,
  initializeFirestore,
  getFirestore,
  terminate,
  useFirestoreEmulator
} from '../src/lite/database';

export {
  SetOptions,
  DocumentData,
  UpdateData,
  DocumentReference,
  Query,
  CollectionReference,
  collection,
  collectionGroup,
  doc,
  refEqual,
  queryEqual
} from '../src/lite/reference';

export {
  endAt,
  endBefore,
  startAt,
  startAfter,
  limit,
  limitToLast,
  orderBy,
  OrderByDirection,
  where,
  WhereFilterOp,
  query,
  QueryConstraint,
  QueryConstraintType
} from '../src/lite/query';

export {
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs
} from '../src/lite/reference_impl';

// TOOD(firestorelite): Add tests when Queries are usable
export { FieldPath, documentId } from '../src/lite/field_path';

// TOOD(firestorelite): Add tests when setDoc() is available
export { FieldValue } from '../src/lite/field_value';

export {
  increment,
  arrayRemove,
  arrayUnion,
  serverTimestamp,
  deleteField
} from '../src/lite/field_value_impl';

export {
  FirestoreDataConverter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  snapshotEqual
} from '../src/lite/snapshot';

export { WriteBatch, writeBatch } from '../src/lite/write_batch';

export { Transaction, runTransaction } from '../src/lite/transaction';

export { setLogLevel, LogLevelString as LogLevel } from '../src/util/log';

export { Bytes } from '../src/lite/bytes';

export { GeoPoint } from '../src/lite/geo_point';

export { Timestamp } from '../src/lite/timestamp';

export { FirestoreErrorCode, FirestoreError } from '../src/util/error';
