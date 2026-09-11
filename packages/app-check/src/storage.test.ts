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
import { getFakeApp } from '../test/util';
import { logger } from './logger';
import { expect, vi } from 'vitest';

const {
  mockWriteTokenToIndexedDB,
  mockReadTokenFromIndexedDB,
  mockIsIndexedDBAvailable
} = vi.hoisted(() => ({
  mockWriteTokenToIndexedDB: vi.fn(),
  mockReadTokenFromIndexedDB: vi.fn(),
  mockIsIndexedDBAvailable: vi.fn()
}));

vi.mock('./indexeddb', async importOriginal => {
  const actual = await importOriginal<typeof import('./indexeddb')>();
  return {
    ...actual,
    writeTokenToIndexedDB: (...args: unknown[]) =>
      mockWriteTokenToIndexedDB.getMockImplementation()
        ? mockWriteTokenToIndexedDB(...args)
        : actual.writeTokenToIndexedDB(...(args as [any, any])),
    readTokenFromIndexedDB: (...args: unknown[]) =>
      mockReadTokenFromIndexedDB.getMockImplementation()
        ? mockReadTokenFromIndexedDB(...args)
        : actual.readTokenFromIndexedDB(...(args as [any]))
  };
});

vi.mock('@firebase/util', async importOriginal => {
  const actual = await importOriginal<typeof import('@firebase/util')>();
  return {
    ...actual,
    isIndexedDBAvailable: () =>
      mockIsIndexedDBAvailable.getMockImplementation()
        ? mockIsIndexedDBAvailable()
        : actual.isIndexedDBAvailable()
  };
});

import { writeTokenToStorage, readTokenFromStorage } from './storage';

describe('Storage', () => {
  const app = getFakeApp();
  const fakeToken = {
    token: 'fake-app-check-token',
    expireTimeMillis: 345,
    issuedAtTimeMillis: 0
  };

  beforeEach(() => {
    mockWriteTokenToIndexedDB.mockReset();
    mockReadTokenFromIndexedDB.mockReset();
    mockIsIndexedDBAvailable.mockReset();
  });

  it('sets and gets appCheck token to indexeddb', async () => {
    await writeTokenToStorage(app, fakeToken);
    expect(await readTokenFromStorage(app)).toEqual(fakeToken);
  });

  it('no op for writeTokenToStorage() if indexeddb is not available', async () => {
    mockIsIndexedDBAvailable.mockReturnValue(false);
    await writeTokenToStorage(app, fakeToken);
    expect(await readTokenFromStorage(app)).toBe(undefined);
  });

  it('writeTokenToStorage() still resolves if writing to indexeddb failed', async () => {
    const warnStub = vi.spyOn(logger, 'warn');
    mockWriteTokenToIndexedDB.mockRejectedValue('something went wrong!');
    await expect(writeTokenToStorage(app, fakeToken)).resolves.not.toThrow();
    expect(warnStub.mock.calls[0][0]).toContain('something went wrong!');
    warnStub.mockRestore();
  });

  it('resolves with undefined if indexeddb is not available', async () => {
    mockIsIndexedDBAvailable.mockReturnValue(false);
    expect(await readTokenFromStorage(app)).toBe(undefined);
  });

  it('resolves with undefined if reading indexeddb failed', async () => {
    const warnStub = vi.spyOn(logger, 'warn');
    mockReadTokenFromIndexedDB.mockRejectedValue('something went wrong!');
    expect(await readTokenFromStorage(app)).toBe(undefined);
    expect(warnStub.mock.calls[0][0]).toContain('something went wrong!');
    warnStub.mockRestore();
  });
});
