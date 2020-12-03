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

export {
  FirebaseFirestore,
  initializeFirestore,
  getFirestore,
  terminate
} from './src/api/database';

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
} from './src/api/reference';

// TOOD(firestorelite): Add tests when Queries are usable
export { FieldPath, documentId } from './src/api/field_path';

// TOOD(firestorelite): Add tests when setDoc() is available
export {
  deleteField,
  increment,
  arrayRemove,
  arrayUnion,
  serverTimestamp
} from './src/api/field_value';

export {
  FirestoreDataConverter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  snapshotEqual
} from './src/api/snapshot';

export { WriteBatch, writeBatch } from './src/api/write_batch';

export { Transaction, runTransaction } from './src/api/transaction';

export { setLogLevel, LogLevelString as LogLevel } from '../src/util/log';

export { Bytes } from './src/api/bytes';

export { GeoPoint } from '../src/api/geo_point';

export { Timestamp } from '../src/api/timestamp';

export { FirestoreErrorCode, FirestoreError } from '../src/util/error';
export { FieldValue } from '../src/api/field_value';
export { Settings } from './src/api/components';
export { addDoc } from './src/api/query';
export { deleteDoc } from './src/api/query';
export { updateDoc } from './src/api/query';
export { setDoc } from './src/api/query';
export { getDocs } from './src/api/query';
export { getDoc } from './src/api/query';
export { endAt } from './src/api/query';
export { endBefore } from './src/api/query';
export { startAfter } from './src/api/query';
export { startAt } from './src/api/query';
export { limitToLast } from './src/api/query';
export { limit } from './src/api/query';
export { orderBy } from './src/api/query';
export { OrderByDirection } from './src/api/query';
export { where } from './src/api/query';
export { WhereFilterOp } from './src/api/query';
export { query } from './src/api/query';
export { QueryConstraint } from './src/api/query';
export { QueryConstraintType } from './src/api/query';
