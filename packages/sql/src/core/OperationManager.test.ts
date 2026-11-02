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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FirebaseSqlTransport,
  FirebaseSqlTransportInterface
} from '../network/transport';

import { Code, FirebaseSqlError, FirebaseSqlErrorCategory } from './error';
import {
  OperationManager,
  PostgrestRequestInfo,
  createErrorFromTransportFailure,
  createPostgrestRequestInfo
} from './OperationManager';

const REST_URL =
  'https://firebasedataconnect.googleapis.com/v1/projects/p/locations/l/services/s/postgrest';

describe('OperationManager & createPostgrestRequestInfo', () => {
  let mockTransport: FirebaseSqlTransportInterface;
  let invokeSpy: ReturnType<
    typeof vi.fn<FirebaseSqlTransportInterface['invokePostgrestOperation']>
  >;

  beforeEach(() => {
    invokeSpy = vi.fn<
      FirebaseSqlTransportInterface['invokePostgrestOperation']
    >(() =>
      Promise.resolve({
        success: true,
        error: null,
        data: [],
        count: null,
        status: 200,
        statusText: 'OK'
      })
    );
    mockTransport = {
      settings: { serviceId: 's', location: 'l' },
      invokePostgrestOperation: invokeSpy
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OM-1..OM-5: OperationManager.execute() & createErrorFromTransportFailure()', () => {
    it('OM-1: forwards requestInfo and { signal, retry } to transport.invokePostgrestOperation()', async () => {
      const manager = new OperationManager(mockTransport);
      const controller = new AbortController();
      const requestInfo = createPostgrestRequestInfo(
        `${REST_URL}/movies?select=id,title`,
        'GET',
        { Accept: 'application/json' }
      );

      const result = await manager.execute(requestInfo, {
        signal: controller.signal,
        retry: false
      });

      expect(invokeSpy).toHaveBeenCalledExactlyOnceWith(requestInfo, {
        signal: controller.signal,
        retry: false
      });
      expect(result).toEqual({
        success: true,
        error: null,
        data: [],
        count: null,
        status: 200,
        statusText: 'OK'
      });
    });

    it('OM-2, OM-3: formats transport rejections into SQL_CLIENT OperationFailure or re-throws when throwOnError is true', async () => {
      const manager = new OperationManager(mockTransport);
      const requestInfo = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'GET'
      );

      // 1. Existing FirebaseSqlError returned unchanged by createErrorFromTransportFailure
      const existingSqlErr = new FirebaseSqlError(
        Code.NOT_SUPPORTED,
        'Fetch not supported',
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
      expect(createErrorFromTransportFailure(existingSqlErr)).toBe(
        existingSqlErr
      );

      // 2. Native Error / TypeError -> Code.OTHER, SQL_CLIENT, message & stack details
      const fetchTypeError = new TypeError('fetch failed');
      fetchTypeError.stack =
        'TypeError: fetch failed\n    at fetch (client.js:1:1)';
      invokeSpy.mockRejectedValueOnce(fetchTypeError);

      const failureResult = await manager.execute(requestInfo);
      expect(failureResult.success).toBe(false);
      expect(failureResult.data).toBeNull();
      expect(failureResult.count).toBeNull();
      expect(failureResult.status).toBe(0);
      expect(failureResult.statusText).toBe('');
      expect(failureResult.error).toBeInstanceOf(FirebaseSqlError);
      expect(failureResult.error?.code).toBe(Code.OTHER);
      expect(failureResult.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
      expect(failureResult.error?.message).toBe('TypeError: fetch failed');
      expect(failureResult.error?.details).toBe(fetchTypeError.stack);
      expect(failureResult.error?.status).toBeUndefined();

      // 3. Error-like object with custom details and hint
      const customErrObj = {
        message: 'Socket hang up',
        details: 'Connection reset by peer',
        hint: 'Check network connectivity'
      };
      const mappedCustom = createErrorFromTransportFailure(customErrObj);
      expect(mappedCustom.message).toBe('TransportError: Socket hang up');
      expect(mappedCustom.details).toBe('Connection reset by peer');
      expect(mappedCustom.hint).toBe('Check network connectivity');

      // 4. Primitive string and null fallbacks
      expect(createErrorFromTransportFailure('raw string error').message).toBe(
        'raw string error'
      );
      expect(createErrorFromTransportFailure(null).message).toBe(
        'Network request failed.'
      );

      // 5. When throwOnError: true, raw transport error is re-thrown unwrapped
      const rawNetworkErr = new TypeError('Failed to fetch raw');
      invokeSpy.mockRejectedValueOnce(rawNetworkErr);
      await expect(
        manager.execute(requestInfo, { throwOnError: true })
      ).rejects.toBe(rawNetworkErr);
    });

    it('OM-4: validates .maybeSingle() cardinality on 2xx array data (0 rows -> null, 1 row -> row[0], > 1 rows -> 406 PGRST116) and passes non-array or non-maybeSingle responses through untouched', async () => {
      const manager = new OperationManager(mockTransport);
      const requestInfo: PostgrestRequestInfo = {
        url: `${REST_URL}/movies`,
        method: 'GET'
      };

      // 1. 0 rows -> data: null (preserving status and count)
      invokeSpy.mockResolvedValueOnce({
        success: true,
        error: null,
        data: [],
        count: 0,
        status: 200,
        statusText: 'OK'
      });
      const zeroRows = await manager.execute(requestInfo, {
        isMaybeSingle: true
      });
      expect(zeroRows).toEqual({
        success: true,
        error: null,
        data: null,
        count: 0,
        status: 200,
        statusText: 'OK'
      });

      // 2. 1 row -> data: row[0] (preserving status and count)
      invokeSpy.mockResolvedValueOnce({
        success: true,
        error: null,
        data: [{ id: 7, title: 'Arrival' }],
        count: 1,
        status: 200,
        statusText: 'OK'
      });
      const oneRow = await manager.execute(requestInfo, {
        isMaybeSingle: true
      });
      expect(oneRow).toEqual({
        success: true,
        error: null,
        data: { id: 7, title: 'Arrival' },
        count: 1,
        status: 200,
        statusText: 'OK'
      });

      // 3. > 1 rows -> 406 Not Acceptable PGRST116 OperationFailure
      invokeSpy.mockResolvedValueOnce({
        success: true,
        error: null,
        data: [{ id: 1 }, { id: 2 }, { id: 3 }],
        count: 3,
        status: 200,
        statusText: 'OK'
      });
      const multiRows = await manager.execute(requestInfo, {
        isMaybeSingle: true
      });
      expect(multiRows.success).toBe(false);
      expect(multiRows.data).toBeNull();
      expect(multiRows.count).toBeNull();
      expect(multiRows.status).toBe(406);
      expect(multiRows.statusText).toBe('Not Acceptable');
      expect(multiRows.error).toBeInstanceOf(FirebaseSqlError);
      expect(multiRows.error?.code).toBe('PGRST116');
      expect(multiRows.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_POSTGREST
      );
      expect(multiRows.error?.message).toBe(
        'JSON object requested, multiple (or no) rows returned'
      );
      expect(multiRows.error?.details).toBe(
        'Results contain 3 rows, application/vnd.pgrst.object+json requires 1 row'
      );
      expect(multiRows.error?.hint).toBeUndefined();
      expect(multiRows.error?.status).toBe(406);

      // 4. Non-array data (e.g. CSV string) with isMaybeSingle: true passes through untouched
      invokeSpy.mockResolvedValueOnce({
        success: true,
        error: null,
        data: 'id,title\n1,A\n2,B',
        count: null,
        status: 200,
        statusText: 'OK'
      });
      const csvMaybeSingle = await manager.execute(requestInfo, {
        isMaybeSingle: true
      });
      expect(csvMaybeSingle.success).toBe(true);
      expect(csvMaybeSingle.data).toBe('id,title\n1,A\n2,B');

      // 5. isMaybeSingle: false with multiple rows passes through untouched
      invokeSpy.mockResolvedValueOnce({
        success: true,
        error: null,
        data: [{ id: 1 }, { id: 2 }],
        count: 2,
        status: 200,
        statusText: 'OK'
      });
      const normalMulti = await manager.execute(requestInfo, {
        isMaybeSingle: false
      });
      expect(normalMulti.success).toBe(true);
      expect(normalMulti.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('OM-5: throws result.error (FirebaseSqlError) when throwOnError is true and OperationResult has success: false (from transport or .maybeSingle() PGRST116)', async () => {
      const manager = new OperationManager(mockTransport);
      const requestInfo: PostgrestRequestInfo = {
        url: `${REST_URL}/movies`,
        method: 'GET'
      };

      // 1. Transport returns OperationFailure
      const transportSqlError = new FirebaseSqlError(
        'PGRST205',
        'Table not found',
        FirebaseSqlErrorCategory.SQL_POSTGREST,
        undefined,
        undefined,
        404
      );
      invokeSpy.mockResolvedValueOnce({
        success: false,
        error: transportSqlError,
        data: null,
        count: null,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(
        manager.execute(requestInfo, { throwOnError: true })
      ).rejects.toBe(transportSqlError);

      // 2. .maybeSingle() produces PGRST116 OperationFailure with throwOnError: true
      invokeSpy.mockResolvedValueOnce({
        success: true,
        error: null,
        data: [{ id: 1 }, { id: 2 }],
        count: null,
        status: 200,
        statusText: 'OK'
      });

      let caughtError: unknown;
      try {
        await manager.execute(requestInfo, {
          isMaybeSingle: true,
          throwOnError: true
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(FirebaseSqlError);
      const pgrst116 = caughtError as FirebaseSqlError;
      expect(pgrst116.code).toBe('PGRST116');
      expect(pgrst116.category).toBe(FirebaseSqlErrorCategory.SQL_POSTGREST);
      expect(pgrst116.status).toBe(406);

      // 3. .maybeSingle() with 0 or 1 row and throwOnError: true resolves normally
      invokeSpy.mockResolvedValueOnce({
        success: true,
        error: null,
        data: [],
        count: null,
        status: 200,
        statusText: 'OK'
      });
      const zeroSuccess = await manager.execute(requestInfo, {
        isMaybeSingle: true,
        throwOnError: true
      });
      expect(zeroSuccess.success).toBe(true);
      expect(zeroSuccess.data).toBeNull();
    });

    it('integrates end-to-end with a real FirebaseSqlTransport instance', async () => {
      const realTransport = new FirebaseSqlTransport({
        settings: { serviceId: 's', location: 'l' }
      });
      const transportSpy = vi
        .spyOn(realTransport, 'invokePostgrestOperation')
        .mockResolvedValueOnce({
          success: true,
          error: null,
          data: [{ id: 99 }],
          count: 1,
          status: 200,
          statusText: 'OK'
        });

      const manager = new OperationManager(realTransport);
      const req = createPostgrestRequestInfo(
        `${REST_URL}/movies?select=id`,
        'GET',
        undefined,
        'public'
      );
      const res = await manager.execute<{ id: number }>(req, {
        isMaybeSingle: true
      });

      expect(transportSpy).toHaveBeenCalledTimes(1);
      expect(res).toEqual({
        success: true,
        error: null,
        data: { id: 99 },
        count: 1,
        status: 200,
        statusText: 'OK'
      });
    });
  });
});
