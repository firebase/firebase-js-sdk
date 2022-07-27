/**
 * @license
 * Copyright 2022 Google LLC
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

import { expect } from 'chai';

import {
  AggregateQuery,
  AggregateQuerySnapshot,
  CollectionReference,
  DocumentReference,
  Firestore,
  aggregateQueryEqual,
  aggregateQuerySnapshotEqual,
  collection,
  countQuery,
  disableNetwork,
  doc,
  enableNetwork,
  getAggregateFromServerDirect,
  query,
  setDoc,
  getDocs,
  waitForPendingWrites,
  limit,
  where
} from '../util/firebase_export';

import {Deferred} from '../../util/promise';

async function Demo0_NormalQuery(db: Firestore) {
  const query_ = collection(db, "games/halo/players");
  const snapshot = await getDocs(query_);
  expect(snapshot.size).to.equal(5000000);
}

async function Demo1_CountOfDocumentsInACollection(db: Firestore) {
  const countQuery_ = countQuery(collection(db, "games/halo/players"));
  const snapshot = await getAggregateFromServerDirect(countQuery_);
  expect(snapshot.getCount()).to.equal(5000000);
}

async function Demo2_CountOfDocumentsInACollectionWithFilter(db: Firestore) {
  const query_ = query(collection(db, "games/halo/players"), where("online", "==", true));
  const countQuery_ = countQuery(query_);
  const snapshot = await getAggregateFromServerDirect(countQuery_);
  expect(snapshot.getCount()).to.equal(2000);
}

async function Demo2_CountOfDocumentsInACollectionWithLimit(db: Firestore) {
  const query_ = query(collection(db, "games/halo/players"), limit(9000));
  const countQuery_ = countQuery(query_);
  const snapshot = await getAggregateFromServerDirect(countQuery_);
  expect(snapshot.getCount()).to.equal(9000);
}

