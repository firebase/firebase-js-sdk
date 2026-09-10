/**
 * @license
 * Copyright 2019 Google LLC
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

import { expect, vi, Mock, describe, it, beforeEach } from 'vitest';
import '../testing/setup';
import { retryIfServerError } from './common';

describe('common', () => {
  describe('retryIfServerError', () => {
    let fetchStub: Mock<() => Promise<Response>>;

    beforeEach(() => {
      fetchStub = vi.fn();
    });

    it('retries once if the server returns a 5xx error', async () => {
      const expectedResponse = new Response();
      fetchStub.mockResolvedValueOnce(new Response(null, { status: 500 }));
      fetchStub.mockResolvedValueOnce(expectedResponse);

      await expect(retryIfServerError(fetchStub)).resolves.toEqual(
        expectedResponse
      );
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it('does not retry again if the server returns a 5xx error twice', async () => {
      const expectedResponse = new Response(null, { status: 500 });
      fetchStub.mockResolvedValueOnce(new Response(null, { status: 500 }));
      fetchStub.mockResolvedValueOnce(expectedResponse);
      fetchStub.mockResolvedValueOnce(new Response());

      await expect(retryIfServerError(fetchStub)).resolves.toEqual(
        expectedResponse
      );
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it('does not retry if the error is not 5xx', async () => {
      const expectedResponse = new Response(null, { status: 404 });
      fetchStub.mockResolvedValue(expectedResponse);

      await expect(retryIfServerError(fetchStub)).resolves.toEqual(
        expectedResponse
      );
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('does not retry if response is ok', async () => {
      const expectedResponse = new Response();
      fetchStub.mockResolvedValue(expectedResponse);

      await expect(retryIfServerError(fetchStub)).resolves.toEqual(
        expectedResponse
      );
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });
  });
});
