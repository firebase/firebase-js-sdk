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

import firebase from '@firebase/app';
import '@firebase/firestore';
import '@firebase/firestore/bundle';
import { FirebaseApp } from '@firebase/app-types';
import { Settings, FirebaseFirestore } from '@firebase/firestore-types';

// This file replaces "packages/firestore/test/integration/util/firebase_export"
// and depends on the minified sources.

let appCount = 0;

export function newTestFirestore(
  projectId: string,
  nameOrApp?: string | FirebaseApp,
  settings?: Settings
): FirebaseFirestore {
  if (nameOrApp === undefined) {
    nameOrApp = 'test-app-' + appCount++;
  }
  const app =
    typeof nameOrApp === 'string'
      ? firebase.initializeApp({ apiKey: 'fake-api-key', projectId }, nameOrApp)
      : nameOrApp;

  const firestore = firebase.firestore(app);
  if (settings) {
    firestore.settings(settings);
  }
  return firestore;
}

export function usesFunctionalApi(): false {
  return false;
}

const Blob = firebase.firestore.Blob;
const DocumentReference = firebase.firestore.DocumentReference;
const FieldPath = firebase.firestore.FieldPath;
const FieldValue = firebase.firestore.FieldValue;
const Firestore = firebase.firestore.Firestore;
const GeoPoint = firebase.firestore.GeoPoint;
const QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
const Timestamp = firebase.firestore.Timestamp;

export {
  Blob,
  DocumentReference,
  FieldPath,
  FieldValue,
  Firestore,
  GeoPoint,
  QueryDocumentSnapshot,
  Timestamp
};
