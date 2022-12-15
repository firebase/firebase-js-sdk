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

import { FirebaseApp, initializeApp } from '@firebase/app';

import { Firestore, initializeFirestore } from '../../../src';
import { PrivateSettings } from '../../../src/lite-api/settings';

// TODO(dimond): Right now we create a new app and Firestore instance for
// every test and never clean them up. We may need to revisit.
let appCount = 0;

export function newTestApp(projectId: string, appName?: string): FirebaseApp {
  if (appName === undefined) {
    appName = 'test-app-' + appCount++;
  }
  return initializeApp(
    {
      apiKey: 'fake-api-key',
      projectId
    },
    appName
  );
}

export function newTestFirestore(
  app: FirebaseApp,
  settings?: PrivateSettings,
  dbName?: string
): Firestore {
  return initializeFirestore(app, settings || {}, dbName);
}

export * from '../../../src';
export { PrivateSettings };
