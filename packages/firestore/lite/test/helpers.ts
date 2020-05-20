/**
 * @license
 * Copyright 2017 Google LLC
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

import * as firestore from '@firebase/firestore-types';
import { Firestore, initializeFirestore } from '../src/api/database';
import firebase from '../../test/integration/util/firebase_export';
import { Provider, ComponentContainer } from '@firebase/component';
import {
  collection,
  CollectionReference,
  doc,
  DocumentReference
} from '../src/api/reference';

/* eslint-disable no-restricted-globals */

/**
 * NOTE: These helpers are used by api/ tests and therefore may not have any
 * dependencies on src/ files.
 */
// __karma__ is an untyped global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __karma__: any;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../config/project.json');

const EMULATOR_PORT = process.env.FIRESTORE_EMULATOR_PORT;
const EMULATOR_PROJECT_ID = process.env.FIRESTORE_EMULATOR_PROJECT_ID;
export const USE_EMULATOR = !!EMULATOR_PORT;

const EMULATOR_FIRESTORE_SETTING = {
  host: `localhost:${EMULATOR_PORT}`,
  ssl: false
};

const PROD_FIRESTORE_SETTING = {
  host: 'firestore.googleapis.com',
  ssl: true
};

export const DEFAULT_SETTINGS = getDefaultSettings();

// eslint-disable-next-line no-console
console.log(`Default Settings: ${JSON.stringify(DEFAULT_SETTINGS)}`);

function getDefaultSettings(): firestore.Settings {
  const karma = typeof __karma__ !== 'undefined' ? __karma__ : undefined;
  if (karma && karma.config.firestoreSettings) {
    return karma.config.firestoreSettings;
  } else {
    return USE_EMULATOR ? EMULATOR_FIRESTORE_SETTING : PROD_FIRESTORE_SETTING;
  }
}

export const DEFAULT_PROJECT_ID = USE_EMULATOR
  ? EMULATOR_PROJECT_ID
  : PROJECT_CONFIG.projectId;

export function withTestDb(
  fn: (db: Firestore) => Promise<void>
): Promise<void> {
  return withTestDbSettings(DEFAULT_PROJECT_ID, DEFAULT_SETTINGS, fn);
}

let appCount = 0;

export async function withTestDbSettings(
  projectId: string,
  settings: firestore.Settings,
  fn: (db: Firestore) => Promise<void>
): Promise<void> {
  const app = firebase.initializeApp(
    { apiKey: 'fake-api-key', projectId },
    'test-app-' + appCount++
  );

  const firestore = new Firestore(
    app,
    new Provider('auth-internal', new ComponentContainer('default'))
  );
  initializeFirestore(firestore, settings);
  return fn(firestore);
}

export function withTestDoc(
  fn: (doc: DocumentReference) => Promise<void>
): Promise<void> {
  return withTestDb(db => {
    return fn(collection(db, 'test-collection').doc());
  });
}

export function withTestCollection(
  fn: (ref: CollectionReference) => Promise<void>
): Promise<void> {
  return withTestDb(db => {
    const topLevel = collection(db, 'test-collection');
    const nested = collection(doc(topLevel), 'nested');
    return fn(nested);
  });
}
