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

import { expect } from 'chai';
import * as mockFetch from './mock_fetch';

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

  const response = await fetch(path, request);
  return response.json();
}

describe('mock fetch utility', () => {
  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  describe('matched requests', () => {
    it('returns the correct object for multiple routes', async () => {
      mockFetch.mock('/a', { a: 1 });
      mockFetch.mock('/b', { b: 2 });

      expect(await fetchJson('/a')).to.eql({ a: 1 });
      expect(await fetchJson('/b')).to.eql({ b: 2 });
    });

    it('passes through the status of the mock', async () => {
      mockFetch.mock('/not-ok', {}, 500);
      expect((await fetch('/not-ok')).status).to.equal(500);
    });

    it('records calls to the mock', async () => {
      const someRequest = {
        sentence:
          'Buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo'
      };

      const mock = mockFetch.mock('/word', {});
      await fetchJson('/word', someRequest);
      await fetchJson('/word', { a: 'b' });
      await fetch('/word');

      expect(mock.calls.length).to.equal(3);
      expect(mock.calls[0].request).to.eql(someRequest);
      expect(mock.calls[1].request).to.eql({ a: 'b' });
      expect(mock.calls[2].request).to.equal(undefined);
    });
  });

  describe('route rejection', () => {
    it('if the route is not in the map', () => {
      mockFetch.mock('/test', {});
      expect(() => fetch('/not-test')).to.throw(
        'Unknown route being requested: /not-test'
      );
    });

    it('if call is not a string', () => {
      mockFetch.mock('/blah', {});
      expect(() => fetch(new Request({} as any))).to.throw(
        'URL passed to fetch was not a string'
      );
    });
  });
});

describe('mock fetch utility (no setUp/tearDown)', () => {
  it('errors if mock attempted without setup', () => {
    expect(() => mockFetch.mock('/test', {})).to.throw(
      'Mock fetch is not set up'
    );
  });

  it('routes do not carry to next run', async () => {
    mockFetch.setUp();
    mockFetch.mock('/test', { first: 'first' });
    expect(await fetchJson('/test')).to.eql({ first: 'first' });
    mockFetch.tearDown();
    mockFetch.setUp();
    expect(() => fetch('/test')).to.throw(
      'Unknown route being requested: /test'
    );
    mockFetch.tearDown();
  });
});
