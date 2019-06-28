/**
 * @license
 * Copyright 2019 Google Inc.
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
import '../testing/setup';
import { bufferToBase64UrlSafe } from './buffer-to-base64-url-safe';

const TYPED_ARRAY_REPRESENTATION = new TextEncoder().encode('hello world');
const BASE_64_REPRESENTATION = btoa('hello world');

describe('bufferToBase64', () => {
  it('returns a base64 representation of a Uint8Array', () => {
    expect(bufferToBase64UrlSafe(TYPED_ARRAY_REPRESENTATION)).to.equal(
      BASE_64_REPRESENTATION
    );
  });
});
