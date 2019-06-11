/**
 * @license
 * Copyright 2018 Google Inc.
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

import * as fs from 'fs';
import * as registerIndexedDBShim from 'indexeddbshim';
import * as os from 'os';

import { FakeWindow, SharedFakeWebStorage } from './test_platform';

// WARNING: The `indexeddbshim` installed via this module should only ever be
// used during initial development. Always validate your changes via
// `yarn test:browser` (which uses a browser-based IndexedDB implementation)
// before integrating with Firestore.
//
// To use this code to run persistence-based tests in Node, include this module
// and set the environment variable `USE_MOCK_PERSISTENCE` to `YES`.

const globalAny = global as any;

const dbDir = fs.mkdtempSync(os.tmpdir() + '/firestore_tests');

if (process.env.USE_MOCK_PERSISTENCE === 'YES') {
  registerIndexedDBShim(null, {
    checkOrigin: false,
    databaseBasePath: dbDir,
    deleteDatabaseFiles: true
  });

  const fakeWindow = new FakeWindow(
    new SharedFakeWebStorage(),
    globalAny.indexedDB
  );

  globalAny.window = fakeWindow;

  // We need to define the `Event` type as it is used in Node to send events to
  // WebStorage when using both the IndexedDB mock and the WebStorage mock.
  class Event {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(typeArg: string, eventInitDict?: EventInit) {}
  }

  globalAny.Event = Event;
}
