/**
 * @license
 * Copyright 2018 Google LLC
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
import * as os from 'os';

// @ts-ignore: There are no types for indexeddbshim.
import registerIndexedDBShim from 'indexeddbshim';

import { FakeWindow, SharedFakeWebStorage } from './test_platform';

// WARNING: The `indexeddbshim` installed via this module should only ever be
// used during initial development. Always validate your changes via
// `yarn test:browser` (which uses a browser-based IndexedDB implementation)
// before integrating with Firestore.
//
// To use this code to run persistence-based tests in Node, include this module
// and set the environment variable `USE_MOCK_PERSISTENCE` to `YES`.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny = global as any;

const dbDir = fs.mkdtempSync(os.tmpdir() + '/firestore_tests');

if (process.env.USE_MOCK_PERSISTENCE === 'YES') {
  const indexedDbShimOptions: Record<string, unknown> = {
    checkOrigin: false
  };

  // Mocking persistence using an in-memory database, rather than the default
  // on-disk database, can reduce test execution time by orders of magnitude;
  // however, some tests have erratic behavior when using an in-memory database
  // because they rely on the database persisting between opens (e.g. tests for
  // upgrading the database schema). Therefore, setting the
  // `MOCK_PERSISTENCE_MEMORY_DB` environment variable to `YES` is only
  // recommended during local build/test development cycles.
  if (process.env.MOCK_PERSISTENCE_MEMORY_DB === 'YES') {
    indexedDbShimOptions.memoryDatabase = ':memory:';
  } else {
    indexedDbShimOptions.databaseBasePath = dbDir;
    indexedDbShimOptions.deleteDatabaseFiles = true;
  }

  registerIndexedDBShim(null, indexedDbShimOptions);

  // 'indexeddbshim' installs IndexedDB onto `globalAny`, which means we don't
  // have to register it ourselves.
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
