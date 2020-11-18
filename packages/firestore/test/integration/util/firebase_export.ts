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

// Imports firebase via the raw sources and re-exports it.
// This file exists for two reasons:
// - It serves as a single entry point to all Firebase types and can return
//   the leagcy SDK types directly (if `firebase.firestore` exists), or wrapping
//   types that use the firebase-exp SDK.
// - It can be replaced by the "<repo-root>/integration/firestore" test suite
//   with a reference to the minified sources.
//
// If you change any exports in this file, you need to also adjust
// "integration/firestore/firebase_export.ts".

import * as firestore from '@firebase/firestore-types';

import firebase from '@firebase/app';
// eslint-disable-next-line import/no-extraneous-dependencies
import firebaseAppCompat from '@firebase/app-compat';

import * as exp from '../../../exp/test/shim';
import { FieldValue } from '../../../src/compat/field_value';
import { FieldPath } from '../../../src/api/field_path';
import { FirebaseApp } from '@firebase/app-types';
import {
  Firestore,
  IndexedDbPersistenceProvider
} from '../../../src/api/database';
import { getFirestore } from '../../../exp/src/api/database';

/**
 * Detects whether we are running against the functionial (tree-shakeable)
 * Firestore API. Used to exclude some tests, e.g. those that validate invalid
 * TypeScript input.
 */
function usesFunctionalApi(): boolean {
  // Use the firebase namespace to detect if `firebase.firestore` has been
  // registered, which is only registered in the classic version of Firestore.
  return !('firestore' in firebase);
}

// TODO(dimond): Right now we create a new app and Firestore instance for
// every test and never clean them up. We may need to revisit.
let appCount = 0;

/**
 * Creates a new test instance of Firestore using either firebase.firestore()
 * or `initializeFirestore` from the modular API.
 */
export function newTestFirestore(
  projectId: string,
  nameOrApp?: string | FirebaseApp,
  settings?: firestore.Settings
): firestore.FirebaseFirestore {
  if (nameOrApp === undefined) {
    nameOrApp = 'test-app-' + appCount++;
  }

  let firestore: firestore.FirebaseFirestore;
  if (usesFunctionalApi()) {
    const app =
      typeof nameOrApp === 'string'
        ? firebaseAppCompat.initializeApp(
            {
              apiKey: 'fake-api-key',
              projectId
            },
            nameOrApp
          )
        : nameOrApp;

    firestore = new Firestore(
      app,
      getFirestore(app),
      new IndexedDbPersistenceProvider()
    );
  } else {
    const app =
      typeof nameOrApp === 'string'
        ? firebase.initializeApp(
            {
              apiKey: 'fake-api-key',
              projectId
            },
            nameOrApp
          )
        : nameOrApp;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    firestore = (firebase as any).firestore(app);
  }

  if (settings) {
    firestore.settings(settings);
  }
  return firestore;
}

// We only register firebase.firestore if the tests are run against the
// legacy SDK. To prevent a compile-time error with the firestore-exp
// SDK, we cast to `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyNamespace = (firebase as any).firestore;

const Timestamp = usesFunctionalApi()
  ? exp.Timestamp
  : legacyNamespace.Timestamp;
const GeoPoint = usesFunctionalApi() ? exp.GeoPoint : legacyNamespace.GeoPoint;
const Blob = usesFunctionalApi() ? exp.Blob : legacyNamespace.Blob;

export { Firestore, FieldValue, FieldPath, Timestamp, Blob, GeoPoint };
