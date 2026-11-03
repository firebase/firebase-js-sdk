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

import * as mockFetch from './mock_fetch';
import { FetchProvider } from '../../src/core/util/fetch_provider';

async function fetchJson(path: string, req?: object): Promise<object> {
  const body = req
    ? {
        body: JSON.stringify(req)
      }
    : {};
  const request: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    referrerPolicy: 'no-referrer',
    ...body
  };

  const response = await FetchProvider.fetch()(path, request);
  return response.json();
}

describe('mock fetch utility', () => {
  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  describe('matched requests', () => {
    it('returns the correct object for multiple routes', async () => {
      mockFetch.mock('/a', { a: 1 });
      mockFetch.mock('/b', { b: 2 });

      expect(await fetchJson('/a')).toEqual({ a: 1 });
      expect(await fetchJson('/b')).toEqual({ b: 2 });
    });

    it('passes through the status of the mock', async () => {
      mockFetch.mock('/not-ok', {}, 500);
      expect((await FetchProvider.fetch()('/not-ok')).status).toBe(500);
    });

    it('records calls to the mock', async () => {
      const someRequest = {
        sentence:
          'Buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo'
      };

      const mock = mockFetch.mock('/word', {});
      await fetchJson('/word', someRequest);
      await fetchJson('/word', { a: 'b' });
      await FetchProvider.fetch()('/word');

      expect(mock.calls.length).toBe(3);
      expect(mock.calls[0].request).toEqual(someRequest);
      expect(mock.calls[1].request).toEqual({ a: 'b' });
      expect(mock.calls[2].request).toBe(undefined);
    });
  });

  describe('route rejection', () => {
    it('if the route is not in the map', () => {
      mockFetch.mock('/test', {});
      expect(() => FetchProvider.fetch()('/not-test')).toThrow(
        'Unknown route being requested: /not-test'
      );
    });

    it('if call is not a string', () => {
      mockFetch.mock('/blah', {});
      expect(() =>
        FetchProvider.fetch()(new Request('http://localhost'))
      ).toThrow('URL passed to fetch was not a string');
    });
  });
});

describe('mock fetch utility (no setUp/tearDown)', () => {
  it('errors if mock attempted without setup', () => {
    expect(() => mockFetch.mock('/test', {})).toThrow(
      'Mock fetch is not set up'
    );
  });

  it('routes do not carry to next run', async () => {
    mockFetch.setUp();
    mockFetch.mock('/test', { first: 'first' });
    expect(await fetchJson('/test')).toEqual({ first: 'first' });
    mockFetch.tearDown();
    mockFetch.setUp();
    expect(() => FetchProvider.fetch()('/test')).toThrow(
      'Unknown route being requested: /test'
    );
    mockFetch.tearDown();
  });
});
