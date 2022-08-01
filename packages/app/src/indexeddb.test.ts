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
import '../test/setup';
import { match, stub } from 'sinon';
import {
  readHeartbeatsFromIndexedDB,
  writeHeartbeatsToIndexedDB
} from './indexeddb';
import { FirebaseApp } from './public-types';
import { AppError } from './errors';
import { HeartbeatsInIndexedDB } from './types';

/**
 * Mostly testing failure cases. heartbeatService.test.ts tests read-write
 * more extensively.
 */

describe('IndexedDB functions', () => {
  it('readHeartbeatsFromIndexedDB warns if IndexedDB.open() throws', async () => {
    const warnStub = stub(console, 'warn');
    if (typeof window !== 'undefined') {
      // Ensure that indexedDB.open() fails in browser. It will always fail in Node.
      stub(window.indexedDB, 'open').throws(new Error('abcd'));
      await readHeartbeatsFromIndexedDB({
        name: 'testname',
        options: { appId: 'test-app-id' }
      } as FirebaseApp);
      expect(warnStub).to.be.calledWith(match.any, match(AppError.IDB_GET));
    } else {
      await readHeartbeatsFromIndexedDB({
        name: 'testname',
        options: { appId: 'test-app-id' }
      } as FirebaseApp);
      expect(warnStub).to.be.calledWith(match.any, match(AppError.IDB_GET));
    }
  });
  it('writeHeartbeatsToIndexedDB warns if IndexedDB.open() throws', async () => {
    const warnStub = stub(console, 'warn');
    if (typeof window !== 'undefined') {
      // Ensure that indexedDB.open() fails in browser. It will always fail in Node.
      stub(window.indexedDB, 'open').throws(new Error('abcd'));
      await writeHeartbeatsToIndexedDB(
        {
          name: 'testname',
          options: { appId: 'test-app-id' }
        } as FirebaseApp,
        {} as HeartbeatsInIndexedDB
      );
      expect(warnStub).to.be.calledWith(match.any, match(AppError.IDB_WRITE));
    } else {
      await writeHeartbeatsToIndexedDB(
        {
          name: 'testname',
          options: { appId: 'test-app-id' }
        } as FirebaseApp,
        {} as HeartbeatsInIndexedDB
      );
      expect(warnStub).to.be.calledWith(match.any, match(AppError.IDB_WRITE));
    }
  });
});
