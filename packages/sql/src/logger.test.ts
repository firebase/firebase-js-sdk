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

import { describe, expect, it } from 'vitest';

import { redactToken } from './logger';

describe('redactToken', () => {
  it('returns "null" when token is null', () => {
    expect(redactToken(null)).toBe('null');
  });

  it('annotates the placeholder App Check token', () => {
    const placeholderToken = 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==';
    expect(redactToken(placeholderToken)).toBe(
      'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ== (the "placeholder" App Check token)'
    );
  });

  it('returns "<redacted>" for short tokens (< 30 characters)', () => {
    expect(redactToken('')).toBe('<redacted>');
    expect(redactToken('short-token')).toBe('<redacted>');
    expect(redactToken('12345678901234567890123456789')).toBe('<redacted>');
  });

  it('returns prefix, "<redacted>", and suffix for tokens of length >= 30', () => {
    const token30 = '123456abcdefghijklmnopqr789012';
    expect(token30.length).toBe(30);
    expect(redactToken(token30)).toBe('123456<redacted>789012');

    const customToken = 'PREFIX_01234567890123456789_SUFFIX';
    expect(redactToken(customToken)).toBe('PREFIX<redacted>SUFFIX');
  });
});
