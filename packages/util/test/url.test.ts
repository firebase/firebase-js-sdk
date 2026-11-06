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
import { isCloudWorkstation } from '../src/url';

describe('isCloudWorkstation', () => {
  it('accepts a bare cloud workstation hostname', () => {
    assert.isTrue(isCloudWorkstation('abc.cloudworkstations.dev'));
  });

  it('accepts a cloud workstation url with a protocol', () => {
    assert.isTrue(isCloudWorkstation('https://abc.cloudworkstations.dev'));
    assert.isTrue(isCloudWorkstation('http://abc.cloudworkstations.dev'));
  });

  it('ignores case in the hostname and the scheme', () => {
    // Host names and URL schemes are both case-insensitive.
    assert.isTrue(isCloudWorkstation('ABC.CloudWorkstations.dev'));
    assert.isTrue(isCloudWorkstation('https://ABC.CloudWorkstations.dev'));
    assert.isTrue(isCloudWorkstation('HTTPS://abc.cloudworkstations.dev'));
  });

  it('rejects hosts that merely contain the suffix', () => {
    assert.isFalse(isCloudWorkstation('evil-cloudworkstations.dev'));
    assert.isFalse(isCloudWorkstation('abc.cloudworkstations.dev.example.com'));
  });

  it('rejects a url whose path ends with the suffix', () => {
    assert.isFalse(
      isCloudWorkstation('https://example.com/abc.cloudworkstations.dev')
    );
    // The scheme is compared case-insensitively, so this is matched on the
    // hostname too rather than falling through to the raw string.
    assert.isFalse(
      isCloudWorkstation('HTTPS://example.com/abc.cloudworkstations.dev')
    );
  });

  it('returns false for an empty string', () => {
    assert.isFalse(isCloudWorkstation(''));
  });
});
