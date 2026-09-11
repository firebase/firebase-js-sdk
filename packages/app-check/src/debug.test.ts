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
import { expect, vi } from 'vitest';
import { clearState, getDebugState } from './state';

const {
  mockReadOrCreateDebugTokenFromStorage,
  mockWriteDebugTokenToIndexedDB,
  mockReadDebugTokenFromIndexedDB
} = vi.hoisted(() => ({
  mockReadOrCreateDebugTokenFromStorage: vi.fn(),
  mockWriteDebugTokenToIndexedDB: vi.fn(),
  mockReadDebugTokenFromIndexedDB: vi.fn()
}));

vi.mock('./storage', async importOriginal => {
  const actual = await importOriginal<typeof import('./storage')>();
  return {
    ...actual,
    readOrCreateDebugTokenFromStorage: (...args: unknown[]) =>
      mockReadOrCreateDebugTokenFromStorage.getMockImplementation()
        ? mockReadOrCreateDebugTokenFromStorage(...args)
        : actual.readOrCreateDebugTokenFromStorage(...(args as [any]))
  };
});

vi.mock('./indexeddb', async importOriginal => {
  const actual = await importOriginal<typeof import('./indexeddb')>();
  return {
    ...actual,
    writeDebugTokenToIndexedDB: (...args: unknown[]) =>
      mockWriteDebugTokenToIndexedDB.getMockImplementation()
        ? mockWriteDebugTokenToIndexedDB(...args)
        : actual.writeDebugTokenToIndexedDB(...(args as [any])),
    readDebugTokenFromIndexedDB: (...args: unknown[]) =>
      mockReadDebugTokenFromIndexedDB.getMockImplementation()
        ? mockReadDebugTokenFromIndexedDB(...args)
        : actual.readDebugTokenFromIndexedDB()
  };
});

import { initializeDebugMode } from './debug';

describe('debug mode', () => {
  beforeEach(() => {
    mockReadOrCreateDebugTokenFromStorage.mockReset();
    mockWriteDebugTokenToIndexedDB.mockReset();
    mockReadDebugTokenFromIndexedDB.mockReset();
  });

  afterEach(() => {
    clearState();
    // reset the global variable for debug mode
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined;
  });

  it('enables debug mode if self.FIREBASE_APPCHECK_DEBUG_TOKEN is set to a string', async () => {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'my-debug-token';
    initializeDebugMode();
    const debugState = getDebugState();

    expect(debugState.enabled).toBe(true);
    await expect(debugState.token?.promise).resolves.toBe('my-debug-token');
  });

  it('generates a debug token if self.FIREBASE_APPCHECK_DEBUG_TOKEN is set to true', async () => {
    mockReadOrCreateDebugTokenFromStorage.mockResolvedValue('my-debug-token');

    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeDebugMode();
    const debugState = getDebugState();

    expect(debugState.enabled).toBe(true);
    await expect(debugState.token?.promise).resolves.toBe('my-debug-token');
  });

  it('saves the generated debug token to indexedDB', async () => {
    mockWriteDebugTokenToIndexedDB.mockResolvedValue(undefined);

    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeDebugMode();

    await getDebugState().token?.promise;
    expect(mockWriteDebugTokenToIndexedDB).toHaveBeenCalled();
  });

  it('uses the cached debug token when it exists if self.FIREBASE_APPCHECK_DEBUG_TOKEN is set to true', async () => {
    mockReadDebugTokenFromIndexedDB.mockResolvedValue('cached-debug-token');

    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeDebugMode();

    const debugState = getDebugState();
    expect(debugState.enabled).toBe(true);
    await expect(debugState.token?.promise).resolves.toBe('cached-debug-token');
  });
});
