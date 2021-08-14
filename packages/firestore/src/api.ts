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

export { FieldPath, documentId } from './api/field_path';

export {
  Firestore,
  initializeFirestore,
  getFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  clearIndexedDbPersistence,
  waitForPendingWrites,
  disableNetwork,
  enableNetwork,
  terminate,
  connectFirestoreEmulator,
  loadBundle,
  namedQuery,
  ensureFirestoreConfigured
} from './api/database';

export {
  LoadBundleTask,
  LoadBundleTaskProgress,
  TaskState
} from './api/bundle';

export { FirestoreSettings, PersistenceSettings } from './api/settings';

export {
  DocumentChange,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  snapshotEqual,
  SnapshotOptions,
  FirestoreDataConverter,
  DocumentChangeType,
  SnapshotMetadata
} from './api/snapshot';

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
} from './api/reference';

export {
  endAt,
  endBefore,
  startAt,
  startAfter,
  limit,
  limitToLast,
  where,
  orderBy,
  query,
  QueryConstraint,
  QueryConstraintType,
  OrderByDirection,
  WhereFilterOp
} from './api/query';

export { Unsubscribe, SnapshotListenOptions } from './api/reference_impl';

export { runTransaction, Transaction } from './api/transaction';

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
  addDoc,
  executeWrite
} from './api/reference_impl';

export { FieldValue } from './api/field_value';

export {
  increment,
  arrayRemove,
  arrayUnion,
  serverTimestamp,
  deleteField
} from './api/field_value_impl';

export { setLogLevel, LogLevelString as LogLevel } from './util/log';

export { Bytes } from './api/bytes';

export { WriteBatch, writeBatch } from './api/write_batch';

export { GeoPoint } from './api/geo_point';

export { Timestamp } from './api/timestamp';

export { CACHE_SIZE_UNLIMITED } from './api/database';

export { FirestoreErrorCode, FirestoreError } from './util/error';

export { AbstractUserDataWriter } from './lite-api/user_data_writer';
