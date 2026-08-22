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

import { assert } from 'chai';
import {
  querystring,
  querystringDecode,
  extractQuerystring
} from '../src/query';

describe('querystring', () => {
  it('returns an empty string for no params', () => {
    assert.strictEqual(querystring({}), '');
  });

  it('joins params with a leading ampersand', () => {
    assert.strictEqual(querystring({ a: 'b' }), '&a=b');
    assert.strictEqual(querystring({ a: 1, b: 'x' }), '&a=1&b=x');
  });

  it('encodes keys and values', () => {
    assert.strictEqual(querystring({ 'a b': 'c&d' }), '&a%20b=c%26d');
  });
});

describe('querystringDecode', () => {
  it('decodes params with and without a leading question mark', () => {
    assert.deepEqual(querystringDecode('?a=1&b=2'), { a: '1', b: '2' });
    assert.deepEqual(querystringDecode('a=1'), { a: '1' });
  });

  it('returns an empty object for an empty string', () => {
    assert.deepEqual(querystringDecode(''), {});
  });

  it('decodes percent-encoded keys and values', () => {
    assert.deepEqual(querystringDecode('?a%20b=c%26d'), { 'a b': 'c&d' });
  });
});

describe('extractQuerystring', () => {
  it('returns the query string including the leading question mark', () => {
    assert.strictEqual(
      extractQuerystring('https://example.com/path?a=1&b=2'),
      '?a=1&b=2'
    );
  });

  it('stops at the fragment', () => {
    assert.strictEqual(
      extractQuerystring('https://example.com/path?a=1#frag'),
      '?a=1'
    );
  });

  it('returns an empty string when the url has no query', () => {
    assert.strictEqual(extractQuerystring('https://example.com/path'), '');
  });

  it('returns an empty string when the url only has a fragment', () => {
    assert.strictEqual(extractQuerystring('https://example.com/path#frag'), '');
  });

  it('handles a query string at the start of the input', () => {
    assert.strictEqual(extractQuerystring('?a=1&b=2'), '?a=1&b=2');
    assert.strictEqual(extractQuerystring('?a=1#frag'), '?a=1');
  });
});
