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

import '../test/setup';
import { writeTokenToStorage, readTokenFromStorage } from './storage';
import * as indexeddbOperations from './indexeddb';
import { getFakeApp } from '../test/util';
import * as util from '@firebase/util';
import { logger } from './logger';
import { expect } from 'chai';
import { stub } from 'sinon';

describe('Storage', () => {
  const app = getFakeApp();
  const fakeToken = {
    token: 'fake-app-check-token',
    expireTimeMillis: 345,
    issuedAtTimeMillis: 0
  };

  it('sets and gets appCheck token to indexeddb', async () => {
    await writeTokenToStorage(app, fakeToken);
    expect(await readTokenFromStorage(app)).to.deep.equal(fakeToken);
  });

  it('no op for writeTokenToStorage() if indexeddb is not available', async () => {
    stub(util, 'isIndexedDBAvailable').returns(false);
    await writeTokenToStorage(app, fakeToken);
    expect(await readTokenFromStorage(app)).to.equal(undefined);
  });

  it('writeTokenToStorage() still resolves if writing to indexeddb failed', async () => {
    const warnStub = stub(logger, 'warn');
    stub(indexeddbOperations, 'writeTokenToIndexedDB').returns(
      Promise.reject('something went wrong!')
    );
    await expect(writeTokenToStorage(app, fakeToken)).to.eventually.fulfilled;
    expect(warnStub.args[0][0]).to.include('something went wrong!');
    warnStub.restore();
  });

  it('resolves with undefined if indexeddb is not available', async () => {
    stub(util, 'isIndexedDBAvailable').returns(false);
    expect(await readTokenFromStorage(app)).to.equal(undefined);
  });

  it('resolves with undefined if reading indexeddb failed', async () => {
    const warnStub = stub(logger, 'warn');
    stub(indexeddbOperations, 'readTokenFromIndexedDB').returns(
      Promise.reject('something went wrong!')
    );
    expect(await readTokenFromStorage(app)).to.equal(undefined);
    expect(warnStub.args[0][0]).to.include('something went wrong!');
    warnStub.restore();
  });
});
