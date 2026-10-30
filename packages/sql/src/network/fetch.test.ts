/**
 * @license
 * Copyright 2026 Google LLC
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

import { expect } from 'vitest';

import {
  FirebaseSqlErrorCategory,
  Code,
  FirebaseSqlError
} from '../core/error';

import { getFetch, initializeFetch } from './fetch';

describe('Firebase SQL Fetch Manager', () => {
  const originalFetch = getFetch();

  afterEach(() => {
    initializeFetch(originalFetch);
  });

  it('Provides a default fetch implementation in the current environment', () => {
    const activeFetch = getFetch();
    expect(activeFetch).toBeDefined();
    expect(typeof activeFetch).toBe('function');
  });

  it('Allows overriding fetch via initializeFetch', () => {
    const customFetch = (() =>
      Promise.resolve(new Response('custom'))) as unknown as typeof fetch;
    initializeFetch(customFetch);
    expect(getFetch()).toBe(customFetch);
  });

  it('Throws FirebaseSqlError with NOT_SUPPORTED and SQL_CLIENT if no fetch implementation is available', () => {
    initializeFetch(null);
    let caughtError: unknown;
    try {
      getFetch();
    } catch (err) {
      caughtError = err;
    }
    expect(caughtError).toBeInstanceOf(FirebaseSqlError);
    const sqlErr = caughtError as FirebaseSqlError;
    expect(sqlErr.code).toBe(Code.NOT_SUPPORTED);
    expect(sqlErr.category).toBe(FirebaseSqlErrorCategory.SQL_CLIENT);
    expect(sqlErr.message).toContain(
      'No Fetch implementation detected in the current environment.'
    );
  });
});
