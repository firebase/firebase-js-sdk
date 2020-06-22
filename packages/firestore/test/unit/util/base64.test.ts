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

import * as rn from '../../../src/platform/rn/base64';

const BASE64_ENCODED = 'GRBoQgKB9LW1';
const BASE64_DECODED = '\u0019\u0010\u0068\u0042\u0002\u0081\u00f4\u00b5\u00b5';

describe('atob', () => {
  (typeof atob !== 'undefined' ? it : it.skip)(
    'decodes with native support',
    () => {
      const decoded = atob(BASE64_ENCODED);
      expect(decoded).to.equal(BASE64_DECODED);
    }
  );

  (typeof atob !== 'undefined' ? it : it.skip)(
    'roundtrips with native support',
    () => {
      expect(atob(btoa(BASE64_ENCODED))).to.equal(BASE64_ENCODED);
    }
  );

  it('decodes with polyfill', () => {
    const decoded = rn.decodeBase64(BASE64_ENCODED);
    expect(decoded).to.equal(BASE64_DECODED);
  });

  it('roundtrips with polyfill', () => {
    expect(rn.encodeBase64(rn.decodeBase64(BASE64_ENCODED))).to.equal(
      BASE64_ENCODED
    );
  });
});

describe('btoa', () => {
  (typeof btoa !== 'undefined' ? it : it.skip)(
    'encodes with native support',
    () => {
      const encoded = btoa(BASE64_DECODED);
      expect(encoded).to.equal(BASE64_ENCODED);
    }
  );

  (typeof btoa !== 'undefined' ? it : it.skip)(
    'roundtrips with native support',
    () => {
      expect(atob(btoa(BASE64_DECODED))).to.equal(BASE64_DECODED);
    }
  );

  it('encodes with polyfill', () => {
    const encoded = rn.encodeBase64(BASE64_DECODED);
    expect(encoded).to.equal(BASE64_ENCODED);
  });

  it('roundtrips with polyfill', () => {
    expect(rn.decodeBase64(rn.encodeBase64(BASE64_DECODED))).to.equal(
      BASE64_DECODED
    );
  });
});
