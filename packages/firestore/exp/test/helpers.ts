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

import { initializeApp } from '@firebase/app-exp';

import * as firestore from '../index';

import { initializeFirestore, doc } from '../index.node';

import {
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS
} from '../../test/integration/util/settings';
import { collection } from '../../lite/src/api/reference';
import { setDoc } from '../src/api/reference';
import { AutoId } from '../../src/util/misc';

let appCount = 0;

export async function withTestDbSettings(
  projectId: string,
  settings: firestore.Settings,
  fn: (db: firestore.FirebaseFirestore) => void | Promise<void>
): Promise<void> {
  const app = initializeApp(
    { apiKey: 'fake-api-key', projectId },
    'test-app-' + appCount++
  );

  const firestore = initializeFirestore(app, settings);
  return fn(firestore);
}

export function withTestDb(
  fn: (db: firestore.FirebaseFirestore) => void | Promise<void>
): Promise<void> {
  return withTestDbSettings(DEFAULT_PROJECT_ID, DEFAULT_SETTINGS, fn);
}

export function withTestCollection(
  fn: (collRef: firestore.CollectionReference) => void | Promise<void>
): Promise<void> {
  return withTestDb(db => {
    return fn(collection(db, AutoId.newId()));
  });
}

export function withTestDoc(
  fn: (doc: firestore.DocumentReference) => void | Promise<void>
): Promise<void> {
  return withTestDb(db => fn(doc(collection(db, 'test-collection'))));
}

export function withTestDocAndInitialData(
  data: firestore.DocumentData,
  fn: (doc: firestore.DocumentReference) => void | Promise<void>
): Promise<void> {
  return withTestDb(async db => {
    const ref = doc(collection(db, 'test-collection'));
    await setDoc(ref, data);
    return fn(ref);
  });
}
