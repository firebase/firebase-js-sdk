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

import { expect } from 'chai';
import { _errorForResponse } from './error';

describe('Error handling', () => {
  describe('_errorForResponse()', () => {
    it('returns null if ok', () => {
      expect(_errorForResponse(200, null)).to.be.null;
    });
    it('returns not-found error if 404', () => {
      const err = _errorForResponse(404, null, 'http://wrong-url.com');
      expect(err?.message).to.equal('not-found [404]');
      expect(err?.code).to.equal('functions/not-found');
      expect(err?.customData?.url).to.equal('http://wrong-url.com');
    });
    it('returns internal error and httpStatus if 0', () => {
      const err = _errorForResponse(0, null, 'http://wrong-url.com');
      expect(err?.message).to.equal('internal [0]');
      expect(err?.code).to.equal('functions/internal');
      expect(err?.customData?.url).to.equal('http://wrong-url.com');
    });
    it('returns internal error and httpStatus if 500', () => {
      const err = _errorForResponse(500, null, 'http://wrong-url.com');
      expect(err?.message).to.equal('internal [500]');
      expect(err?.code).to.equal('functions/internal');
      expect(err?.customData?.url).to.equal('http://wrong-url.com');
    });
    it('returns unknown and httpStatus if unknown http status', () => {
      const err = _errorForResponse(300, null, 'http://wrong-url.com');
      expect(err?.message).to.equal('unknown [300]');
      expect(err?.code).to.equal('functions/unknown');
      expect(err?.customData?.url).to.equal('http://wrong-url.com');
    });
    it('returns backend error message if json error.status is a known code', () => {
      const err = _errorForResponse(
        404,
        { error: { status: 'NOT_FOUND' } },
        'http://wrong-url.com'
      );
      expect(err?.message).to.equal('Backend error status: NOT_FOUND [404]');
      expect(err?.code).to.equal('functions/not-found');
      expect(err?.customData?.url).to.equal('http://wrong-url.com');
    });
    it(
      'returns backend error message if httpStatus is 0 and ' +
        'json error.status is a known code',
      () => {
        const err = _errorForResponse(
          0,
          { error: { status: 'NOT_FOUND' } },
          'http://wrong-url.com'
        );
        expect(err?.message).to.equal('Backend error status: NOT_FOUND [0]');
        expect(err?.code).to.equal('functions/not-found');
        expect(err?.customData?.url).to.equal('http://wrong-url.com');
      }
    );
    it(
      'returns unknown backend error status if ' +
        'json error.status does not match known code',
      () => {
        const err = _errorForResponse(
          404,
          {
            error: { status: 'page not found' }
          },
          'http://wrong-url.com'
        );
        expect(err?.message).to.equal(
          'Unknown backend error status: page not found [404]'
        );
        expect(err?.code).to.equal('functions/internal');
        expect(err?.customData?.url).to.equal('http://wrong-url.com');
      }
    );
    it(
      'returns unknown backend error status if httpStatus is 0 and ' +
        'json error.status does not match known code',
      () => {
        const err = _errorForResponse(
          0,
          {
            error: { status: 'weird' }
          },
          'http://wrong-url.com'
        );
        expect(err?.message).to.equal(
          'Unknown backend error status: weird [0]'
        );
        expect(err?.code).to.equal('functions/internal');
        expect(err?.customData?.url).to.equal('http://wrong-url.com');
      }
    );
    it('processes details correctly', () => {
      const err = _errorForResponse(
        404,
        {
          error: {
            status: 'NOT_FOUND',
            details: {
              '@type': 'type.googleapis.com/google.protobuf.Int64Value',
              value: 4
            }
          }
        },
        'http://wrong-url.com'
      );
      expect(err?.message).to.equal('Backend error status: NOT_FOUND [404]');
      expect(err?.code).to.equal('functions/not-found');
      expect(err?.customData?.url).to.equal('http://wrong-url.com');
      expect(err?.customData?.details).to.equal(4);
    });
  });
});
