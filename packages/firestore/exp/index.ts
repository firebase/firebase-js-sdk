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

export { FieldPath, documentId } from './src/api/field_path';

export {
  FirebaseFirestore,
  initializeFirestore,
  getFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  clearIndexedDbPersistence,
  waitForPendingWrites,
  disableNetwork,
  enableNetwork,
  terminate,
  Settings,
  PersistenceSettings,
  SnapshotMetadata
} from './src/api/database';

export {
  DocumentChange,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  snapshotEqual,
  SnapshotOptions,
  FirestoreDataConverter,
  DocumentChangeType
} from './src/api/snapshot';

export {
  DocumentReference,
  CollectionReference,
  Query,
  doc,
  collection,
  collectionGroup,
  SetOptions,
  DocumentData,
  UpdateData,
  refEqual,
  queryEqual
} from './src/api/reference';

export { Unsubscribe } from '../src/api/observer';

export { runTransaction, Transaction } from './src/api/transaction';

export {
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  onSnapshotsInSync,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc
} from './src/api/crud';

export {
  endAt,
  endBefore,
  startAfter,
  startAt,
  limitToLast,
  limit,
  orderBy,
  OrderByDirection,
  where,
  WhereFilterOp,
  query,
  QueryConstraint,
  QueryConstraintType
} from './src/api/query';

export {
  FieldValue,
  deleteField,
  increment,
  arrayRemove,
  arrayUnion,
  serverTimestamp
} from './src/api/field_value';

export { setLogLevel, LogLevelString as LogLevel } from '../src/util/log';

export { Bytes } from './src/api/bytes';

export { WriteBatch, writeBatch } from './src/api/write_batch';

export { GeoPoint } from '../src/api/geo_point';

export { Timestamp } from '../src/api/timestamp';

export { SnapshotListenOptions } from './src/api/crud';

export { CACHE_SIZE_UNLIMITED } from './src/api/database';

export { FirestoreErrorCode, FirestoreError } from '../src/util/error';
