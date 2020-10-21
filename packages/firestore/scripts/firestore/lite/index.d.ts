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
export { Settings, FirebaseFirestore, initializeFirestore, getFirestore, terminate } from './src/api/database';
export { SetOptions, DocumentData, UpdateData, DocumentReference, Query, QueryConstraint, QueryConstraintType, CollectionReference, OrderByDirection, WhereFilterOp, collection, collectionGroup, doc, getDoc, getDocs, deleteDoc, setDoc, updateDoc, addDoc, refEqual, queryEqual, startAt, startAfter, endAt, endBefore, query, limit, limitToLast, where, orderBy } from './src/api/reference';
export { FieldPath, documentId } from './src/api/field_path';
export { FieldValue, deleteField, increment, arrayRemove, arrayUnion, serverTimestamp } from './src/api/field_value';
export { FirestoreDataConverter, DocumentSnapshot, QueryDocumentSnapshot, QuerySnapshot, snapshotEqual } from './src/api/snapshot';
export { WriteBatch, writeBatch } from './src/api/write_batch';
export { Transaction, runTransaction } from './src/api/transaction';
export { setLogLevel, LogLevel, LogLevelString } from '../src/util/log';
export { Bytes } from './src/api/bytes';
export { GeoPoint } from '../src/api/geo_point';
export { Timestamp } from '../src/api/timestamp';
export { FirestoreErrorCode, FirestoreError } from '../src/util/error';
