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

import { getFakeApp } from '../test/util';
import { logger } from './logger';
import * as indexeddb from './indexeddb';
import * as util from '@firebase/util';
import { writeTokenToStorage, readTokenFromStorage } from './storage';

vi.mock('./indexeddb', { spy: true });
vi.mock('@firebase/util', { spy: true });

describe('Storage', () => {
  const app = getFakeApp();
  const fakeToken = {
    token: 'fake-app-check-token',
    expireTimeMillis: 345,
    issuedAtTimeMillis: 0
  };

  it('sets and gets appCheck token to indexeddb', async () => {
    await writeTokenToStorage(app, fakeToken);
    expect(await readTokenFromStorage(app)).toEqual(fakeToken);
  });

  it('no op for writeTokenToStorage() if indexeddb is not available', async () => {
    vi.spyOn(util, 'isIndexedDBAvailable').mockReturnValue(false);
    await writeTokenToStorage(app, fakeToken);
    expect(await readTokenFromStorage(app)).toBe(undefined);
  });

  it('writeTokenToStorage() still resolves if writing to indexeddb failed', async () => {
    const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(indexeddb, 'writeTokenToIndexedDB').mockRejectedValue(
      'something went wrong!'
    );
    await expect(writeTokenToStorage(app, fakeToken)).resolves.not.toThrow();
    expect(warnStub.mock.calls[0][0]).toContain('something went wrong!');
  });

  it('resolves with undefined if indexeddb is not available', async () => {
    vi.spyOn(util, 'isIndexedDBAvailable').mockReturnValue(false);
    expect(await readTokenFromStorage(app)).toBe(undefined);
  });

  it('resolves with undefined if reading indexeddb failed', async () => {
    const warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(indexeddb, 'readTokenFromIndexedDB').mockRejectedValue(
      'something went wrong!'
    );
    expect(await readTokenFromStorage(app)).toBe(undefined);
    expect(warnStub.mock.calls[0][0]).toContain('something went wrong!');
  });
});
