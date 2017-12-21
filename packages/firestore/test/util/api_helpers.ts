/**
 * Copyright 2017 Google Inc.
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

// Helpers here mock Firestore in order to unit-test API types. Do NOT use
// these in any integration test, where we expect working Firestore object.

import { DocumentReference, Firestore, Query } from '../../src/api/database';
import { Query as InternalQuery } from '../../src/core/query';
import { key, path as pathFrom } from './helpers';

/**
 * A mock Firestore. Will not work for integration test.
 */
export const FIRESTORE = new Firestore({
  projectId: 'projectid',
  database: 'database'
});

export function firestore(): Firestore {
  return FIRESTORE;
}

export function documentReference(path: string): DocumentReference {
  return new DocumentReference(key(path), FIRESTORE);
}

export function query(path: string): Query {
  return new Query(InternalQuery.atPath(pathFrom(path)), FIRESTORE);
}
