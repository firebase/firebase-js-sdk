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
import { LOWERCASE_DISALLOWED_HEADER_KEYS } from '../util/constants';

import { Code, FirebaseSqlError, FirebaseSqlErrorCategory } from './error';
import {
  OperationManager,
  PostgrestRequestInfo,
  createErrorFromTransportFailure,
  createPostgrestRequestInfo,
  resolveHttpMethod
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

  describe('resolveHttpMethod() & CRI-1..CRI-6: createPostgrestRequestInfo()', () => {
    it('resolveHttpMethod() defaults to GET, accepts RequestInit or string, and uppercases method names', () => {
      expect(resolveHttpMethod()).toBe('GET');
      expect(resolveHttpMethod({})).toBe('GET');
      expect(resolveHttpMethod('get')).toBe('GET');
      expect(resolveHttpMethod('post')).toBe('POST');
      expect(resolveHttpMethod({ method: 'post' })).toBe('POST');
      expect(resolveHttpMethod({ method: 'patch' })).toBe('PATCH');
      expect(resolveHttpMethod({ method: 'delete' })).toBe('DELETE');
      expect(resolveHttpMethod({ method: 'head' })).toBe('HEAD');
    });

    it('CRI-1, CRI-2: normalizes method (default GET, uppercased) and deterministically sorts URL searchParams by [key, value] while preserving duplicate keys', () => {
      const infoDefault = createPostgrestRequestInfo(
        new URL(
          `${REST_URL}/users?select=*&age=lte.65&age=gte.18&active=eq.true`
        )
      );
      expect(infoDefault.method).toBe('GET');
      expect(infoDefault.url).toBe(
        `${REST_URL}/users?active=eq.true&age=gte.18&age=lte.65&select=*`
      );
      expect('headers' in infoDefault).toBe(false);
      expect('body' in infoDefault).toBe(false);

      const infoLowerPost = createPostgrestRequestInfo(
        `${REST_URL}/movies?z=2&a=1&a=0`,
        'post'
      );
      expect(infoLowerPost.method).toBe('POST');
      expect(infoLowerPost.url).toBe(`${REST_URL}/movies?a=0&a=1&z=2`);
    });

    it('CRI-3: sets accept-profile (and deletes content-profile) on GET/HEAD, sets content-profile (and deletes accept-profile) on POST/PATCH/DELETE, and injects neither when schemaName is undefined', () => {
      for (const method of ['GET', 'HEAD'] as const) {
        const info = createPostgrestRequestInfo(
          `${REST_URL}/movies`,
          method,
          { 'Content-Profile': 'stale-profile' },
          'analytics'
        );
        expect(info.headers).toEqual({
          'accept-profile': 'analytics'
        });
        expect(info.headers?.['content-profile']).toBeUndefined();
      }

      for (const method of ['POST', 'PATCH', 'DELETE'] as const) {
        const info = createPostgrestRequestInfo(
          `${REST_URL}/movies`,
          method,
          { 'Accept-Profile': 'stale-profile' },
          'analytics'
        );
        expect(info.headers).toEqual({
          'content-profile': 'analytics'
        });
        expect(info.headers?.['accept-profile']).toBeUndefined();
      }

      const withoutSchema = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'GET',
        undefined,
        undefined
      );
      expect('headers' in withoutSchema).toBe(false);

      const explicitProfileWithoutSchema = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'GET',
        { 'Accept-Profile': 'custom-explicit' }
      );
      expect(explicitProfileWithoutSchema.headers).toEqual({
        'accept-profile': 'custom-explicit'
      });
    });

    it('CRI-4: strips content-type and all 10 LOWERCASE_DISALLOWED_HEADER_KEYS, retains custom and PostgREST headers with sorted lowercase keys, and omits headers when empty', () => {
      const disallowedRecord: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      for (const key of LOWERCASE_DISALLOWED_HEADER_KEYS) {
        disallowedRecord[key.toUpperCase()] = `secret-${key}`;
      }

      const onlyDisallowed = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'POST',
        disallowedRecord
      );
      expect('headers' in onlyDisallowed).toBe(false);
      expect(onlyDisallowed.headers).toBeUndefined();

      const mixed = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'POST',
        {
          ...disallowedRecord,
          'X-Zebra': 'z-val',
          Prefer: 'return=representation,count=exact',
          Accept: 'application/vnd.pgrst.object+json',
          'X-Alpha': 'a-val'
        },
        'billing'
      );

      expect(mixed.headers).toEqual({
        accept: 'application/vnd.pgrst.object+json',
        'content-profile': 'billing',
        prefer: 'return=representation,count=exact',
        'x-alpha': 'a-val',
        'x-zebra': 'z-val'
      });
      expect(Object.keys(mixed.headers!)).toEqual([
        'accept',
        'content-profile',
        'prefer',
        'x-alpha',
        'x-zebra'
      ]);
      expect(JSON.stringify(mixed)).not.toContain('secret-');
      expect(JSON.stringify(mixed)).not.toContain('content-type');

      const fromTupleHeaders = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'GET',
        [
          ['X-Three', '3'],
          ['X-One', '1']
        ]
      );
      expect(fromTupleHeaders.headers).toEqual({
        'x-one': '1',
        'x-three': '3'
      });
    });

    it('CRI-5, CRI-6: normalizes body (Date, bigint, JSON string, raw string fallback, undefined key removal), recursively sorts keys, and deeply freezes requestInfo, headers, and body', () => {
      const createdAt = new Date('2026-01-15T00:00:00.000Z');
      const callerHeaders = new Headers({
        Prefer: 'count=exact',
        Accept: 'application/json'
      });
      const callerBody: Record<string, unknown> = {
        z: 1,
        bigId: BigInt('9007199254740993'),
        createdAt,
        omitted: undefined,
        a: {
          d: 4,
          c: [
            { y: 2, x: 1 },
            { b: 2, a: 1 }
          ]
        }
      };

      const fromObject = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'POST',
        callerHeaders,
        undefined,
        callerBody
      );

      // Mutate caller inputs after snapshotting to verify isolation
      callerHeaders.set('Accept', 'text/csv');
      callerBody.z = 999;
      (callerBody.a as Record<string, unknown>).d = 999;

      expect(fromObject.body).toEqual({
        a: {
          c: [
            { x: 1, y: 2 },
            { a: 1, b: 2 }
          ],
          d: 4
        },
        bigId: '9007199254740993',
        createdAt: '2026-01-15T00:00:00.000Z',
        z: 1
      });
      expect(Object.keys(fromObject.body as Record<string, unknown>)).toEqual([
        'a',
        'bigId',
        'createdAt',
        'z'
      ]);
      expect(
        Object.keys((fromObject.body as { a: Record<string, unknown> }).a)
      ).toEqual(['c', 'd']);

      // JSON string body normalizes identically to object body
      const fromJsonString = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'POST',
        undefined,
        undefined,
        JSON.stringify({ z: 1, a: { d: 4, c: 3 } })
      );
      expect(fromJsonString.body).toEqual({
        a: { c: 3, d: 4 },
        z: 1
      });

      // Raw non-JSON string fallback
      const fromRawString = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'POST',
        undefined,
        undefined,
        'raw-unparsed-payload'
      );
      expect(fromRawString.body).toBe('raw-unparsed-payload');

      // Deep freeze assertions
      expect(Object.isFrozen(fromObject)).toBe(true);
      expect(Object.isFrozen(fromObject.headers)).toBe(true);
      expect(Object.isFrozen(fromObject.body)).toBe(true);
      const nestedBody = fromObject.body as {
        a: { d: number; c: Array<{ x: number }> };
      };
      expect(Object.isFrozen(nestedBody.a)).toBe(true);
      expect(Object.isFrozen(nestedBody.a.c)).toBe(true);
      expect(Object.isFrozen(nestedBody.a.c[0])).toBe(true);

      expect(() => {
        (fromObject as { url: string }).url = 'https://tampered.example.com';
      }).toThrow(TypeError);
      expect(() => {
        (fromObject.headers as Record<string, string>).accept = 'text/csv';
      }).toThrow(TypeError);
      expect(() => {
        nestedBody.a.d = 99;
      }).toThrow(TypeError);
      expect(() => {
        nestedBody.a.c[0]!.x = 99;
      }).toThrow(TypeError);

      // Circular body fallback when JSON.stringify throws (CRI-5 & CRI-6)
      const cyclicBody: Record<string, unknown> = { b: 2, a: 1 };
      cyclicBody.self = cyclicBody;
      const fromCyclic = createPostgrestRequestInfo(
        `${REST_URL}/movies`,
        'POST',
        undefined,
        undefined,
        cyclicBody
      );
      expect(fromCyclic.body).toBe(cyclicBody);
      expect(Object.isFrozen(fromCyclic)).toBe(true);
      expect(Object.isFrozen(fromCyclic.body)).toBe(true);
    });
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
