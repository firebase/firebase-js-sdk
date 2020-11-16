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

// Imports firebase via the raw sources and re-exports it. The
// "<repo-root>/integration/firestore" test suite replaces this file with a
// reference to the minified sources. If you change any exports in this file,
// you need to also adjust "integration/firestore/firebase_export.ts".

import * as firestore from '@firebase/firestore-types';

import firebase from '@firebase/app';

import { FieldValue } from '../../../src/compat/field_value';
import { FieldPath } from '../../../src/api/field_path';
import { Timestamp } from '../../../src/api/timestamp';
import { Blob } from '../../../src/api/blob';
import { GeoPoint } from '../../../src/api/geo_point';
import { FirebaseApp } from '@firebase/app-types';
import { Firestore } from '../../../src/api/database';

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
  firestore = (firebase as any).firestore(app);

  if (settings) {
    firestore.settings(settings);
  }
  return firestore;
}

export { Firestore, FieldValue, FieldPath, Timestamp, Blob, GeoPoint };
