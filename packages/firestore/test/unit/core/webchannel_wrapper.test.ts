/**
 * @license
 * Copyright 2022 Google LLC
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

// Add some unit tests for classes exported from @firebase/webchannel-wrapper.
// These tests are mostly to ensure that the exported classes correctly map to
// underlying functionality from google-closure-library.

import { Md5 } from '@firebase/webchannel-wrapper';
import { expect } from 'chai';

describe('Md5', () => {
  // The precomputed MD5 digests of the 3-character strings "abc" and "def".
  const DIGEST_OF_ABC = Object.freeze([
    144, 1, 80, 152, 60, 210, 79, 176, 214, 150, 63, 125, 40, 225, 127, 114
  ]);
  const DIGEST_OF_DEF = Object.freeze([
    78, 217, 64, 118, 48, 235, 16, 0, 192, 246, 182, 56, 66, 222, 250, 125
  ]);

  it('constructor should create distinct instances', () => {
    const instance1 = new Md5();
    const instance2 = new Md5();
    expect(instance1).is.instanceof(Md5);
    expect(instance2).is.instanceof(Md5);
    expect(instance1).is.not.equal(instance2);
  });

  it('update() should accept a string', () => {
    const md5 = new Md5();
    md5.update('abc');
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should accept an array of number', () => {
    const md5 = new Md5();
    md5.update([97, 98, 99]);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should accept a Uint8Array', () => {
    const md5 = new Md5();
    md5.update(Uint8Array.from([97, 98, 99]));
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should honor opt_length on a string', () => {
    const md5 = new Md5();
    md5.update('abcdef', 3);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should honor opt_length on an array of number', () => {
    const md5 = new Md5();
    md5.update([97, 98, 99, 100, 101, 102], 3);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should honor opt_length on a Uint8Array', () => {
    const md5 = new Md5();
    md5.update(Uint8Array.from([97, 98, 99, 100, 101, 102]), 3);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('reset() should reset', () => {
    const md5 = new Md5();
    md5.update('abc');
    md5.reset();
    md5.update('def');
    expect(md5.digest()).to.deep.equal(DIGEST_OF_DEF);
  });
});
