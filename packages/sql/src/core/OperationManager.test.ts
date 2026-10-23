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

import { expect, vi } from 'vitest';

import { getFetch, initializeFetch } from '../network/fetch';
import {
  FirebaseSqlTransport,
  FirebaseSqlTransportInterface
} from '../network/transport';

import {
  OperationInfo,
  OperationManager,
  resolveHttpMethod
} from './OperationManager';

const REST_URL =
  'https://firebasedataconnect.googleapis.com/v1/projects/p/locations/l/services/s/postgrest';

function getHeadersFromCall(
  mockFetch: ReturnType<typeof vi.fn>,
  callIndex = 0
): Headers {
  const init = mockFetch.mock.calls[callIndex]?.[1] as RequestInit | undefined;
  return new Headers(init?.headers);
}

describe('OperationManager', () => {
  const originalFetch = getFetch();
  let mockFetch: ReturnType<typeof vi.fn>;
  let transport: FirebaseSqlTransport;

  beforeEach(() => {
    mockFetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    );
    initializeFetch(mockFetch as unknown as typeof fetch);
    transport = new FirebaseSqlTransport({
      settings: { serviceId: 's', location: 'l' }
    });
  });

  afterEach(() => {
    initializeFetch(originalFetch);
    vi.restoreAllMocks();
  });

  describe('resolveHttpMethod()', () => {
    it('defaults to GET, reads init.method, and uppercases method names', () => {
      expect(resolveHttpMethod()).toBe('GET');
      expect(resolveHttpMethod({})).toBe('GET');
      expect(resolveHttpMethod({ method: 'post' })).toBe('POST');
      expect(resolveHttpMethod({ method: 'patch' })).toBe('PATCH');
      expect(resolveHttpMethod({ method: 'delete' })).toBe('DELETE');
      expect(resolveHttpMethod({ method: 'head' })).toBe('HEAD');
    });
  });

  describe('OperationInfo extraction', () => {
    it('extracts OperationInfo for GET and HEAD queries', async () => {
      const manager = new OperationManager(REST_URL, transport);

      const getResult = await manager.execute(
        `${REST_URL}/movies?select=id,title`,
        { method: 'GET' }
      );
      expect(getResult.operationInfo).toEqual({
        restUrl: REST_URL,
        pathname: 'movies',
        searchParams: [['select', 'id,title']],
        relation: 'movies',
        method: 'GET',
        operationType: 'query'
      });

      const headResult = await manager.execute(
        `${REST_URL}/movies?select=*`,
        { method: 'head' },
        { isMaybeSingle: true }
      );
      expect(headResult.operationInfo).toMatchObject({
        method: 'HEAD',
        operationType: 'query',
        isMaybeSingle: true
      });
    });

    it('extracts OperationInfo for POST, PATCH, and DELETE mutations', async () => {
      const manager = new OperationManager(REST_URL, transport);

      const postResult = await manager.execute(`${REST_URL}/movies/`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Inception', year: 2010 })
      });
      expect(postResult.operationInfo).toEqual({
        restUrl: REST_URL,
        pathname: 'movies',
        searchParams: [],
        relation: 'movies',
        method: 'POST',
        operationType: 'mutation',
        body: { title: 'Inception', year: 2010 }
      });

      const patchResult = await manager.execute(`${REST_URL}/movies?id=eq.1`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Interstellar' })
      });
      expect(patchResult.operationInfo).toMatchObject({
        method: 'PATCH',
        operationType: 'mutation',
        body: { title: 'Interstellar' }
      });

      const deleteResult = await manager.execute(`${REST_URL}/movies?id=eq.1`, {
        method: 'DELETE'
      });
      expect(deleteResult.operationInfo).toMatchObject({
        method: 'DELETE',
        operationType: 'mutation'
      });
    });

    it('extracts OperationInfo for RPC operations and URL-decodes the function name', async () => {
      const manager = new OperationManager(REST_URL, transport);

      const rpcGet = await manager.execute(
        `${REST_URL}/rpc/calculate%20tax?amount=100`,
        { method: 'GET' }
      );
      expect(rpcGet.operationInfo).toEqual({
        restUrl: REST_URL,
        pathname: 'rpc/calculate%20tax',
        searchParams: [['amount', '100']],
        relation: 'calculate tax',
        method: 'GET',
        operationType: 'rpc'
      });
    });

    it('resolves relative URL paths with or without a leading slash against restUrl', async () => {
      const manager = new OperationManager(REST_URL, transport);

      const relSlash = await manager.execute('/movies?select=id');
      const relNoSlash = await manager.execute('movies?select=id');
      expect(relSlash.operationInfo.pathname).toBe('movies');
      expect(relNoSlash.operationInfo.pathname).toBe('movies');
      expect(mockFetch.mock.calls[0]?.[0]).toBe(`${REST_URL}/movies?select=id`);
      expect(mockFetch.mock.calls[1]?.[0]).toBe(`${REST_URL}/movies?select=id`);
    });

    it('supports explicit OperationDispatchContext overrides', () => {
      const manager = new OperationManager(REST_URL, transport, 'analytics');

      const info = manager.snapshotOperationInfo(
        `${REST_URL}/users?active=eq.true`,
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' }
        },
        {
          relation: 'custom_users',
          operationType: 'query',
          isMaybeSingle: false,
          body: { z: 1, a: 2 }
        }
      );

      expect(info).toEqual({
        restUrl: REST_URL,
        pathname: 'users',
        searchParams: [['active', 'eq.true']],
        relation: 'custom_users',
        method: 'POST',
        operationType: 'query',
        headers: {
          prefer: 'return=representation'
        },
        schemaName: 'analytics',
        body: { a: 2, z: 1 },
        isMaybeSingle: false
      });
    });
  });

  describe('Deterministic searchParams and body sorting', () => {
    it('sorts searchParams deterministically by key then value, preserving duplicate column filters', () => {
      const manager = new OperationManager(REST_URL, transport);
      const info = manager.snapshotOperationInfo(
        `${REST_URL}/users?select=*&age=lte.65&age=gte.18&active=eq.true`
      );

      expect(info.searchParams).toEqual([
        ['active', 'eq.true'],
        ['age', 'gte.18'],
        ['age', 'lte.65'],
        ['select', '*']
      ]);
    });

    it('normalizes and sorts context.body identically to JSON.stringify init.body, with raw string fallback', () => {
      const manager = new OperationManager(REST_URL, transport);
      const createdAt = new Date('2026-01-15T00:00:00.000Z');
      const rawPayload = {
        z: 1,
        createdAt,
        omitted: undefined,
        a: { d: 4, c: 3 }
      };

      const fromContext = manager.snapshotOperationInfo(
        `${REST_URL}/movies`,
        { method: 'POST' },
        { body: rawPayload }
      );
      const fromInit = manager.snapshotOperationInfo(`${REST_URL}/movies`, {
        method: 'POST',
        body: JSON.stringify(rawPayload)
      });

      expect(fromContext.body).toEqual({
        a: { c: 3, d: 4 },
        createdAt: '2026-01-15T00:00:00.000Z',
        z: 1
      });
      expect(JSON.stringify(fromContext.body)).toBe(
        JSON.stringify(fromInit.body)
      );

      const fallback = manager.snapshotOperationInfo(`${REST_URL}/movies`, {
        method: 'POST',
        body: 'raw-unparsed-payload'
      });
      expect(fallback.body).toBe('raw-unparsed-payload');
    });
  });

  describe('Dispatch-time snapshot isolation and deep freeze immutability', () => {
    it('isolates OperationInfo from in-flight and post-dispatch mutations to Headers and body', async () => {
      let resolveNetwork!: (value: Response) => void;
      const networkPromise = new Promise<Response>(resolve => {
        resolveNetwork = resolve;
      });
      mockFetch.mockImplementationOnce(() => networkPromise);

      const manager = new OperationManager(REST_URL, transport, 'public');
      const callerHeaders = new Headers({
        Accept: 'application/vnd.pgrst.object+json',
        Prefer: 'count=exact'
      });
      const callerBody: Record<string, unknown> = {
        title: 'Original',
        nested: { rating: 5 }
      };

      const executePromise = manager.execute(
        `${REST_URL}/movies?age=gte.18`,
        { method: 'POST', headers: callerHeaders },
        { body: callerBody }
      );

      // Mutate caller references while the network request is still in flight.
      callerHeaders.set('Accept', 'text/csv');
      callerHeaders.set('Prefer', 'return=minimal');
      callerBody.title = 'Mutated';
      (callerBody.nested as Record<string, unknown>).rating = 0;

      const networkResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200
      });
      resolveNetwork(networkResponse);
      const { response, operationInfo } = await executePromise;

      expect(response).toBe(networkResponse);
      expect(operationInfo.pathname).toBe('movies');
      expect(operationInfo.relation).toBe('movies');
      expect(operationInfo.searchParams).toEqual([['age', 'gte.18']]);
      expect(operationInfo.headers).toEqual({
        accept: 'application/vnd.pgrst.object+json',
        prefer: 'count=exact'
      });
      expect(operationInfo.body).toEqual({
        nested: { rating: 5 },
        title: 'Original'
      });
      expect(Object.isFrozen(operationInfo)).toBe(true);
      expect(Object.isFrozen(operationInfo.searchParams[0])).toBe(true);
      expect(Object.isFrozen(operationInfo.headers)).toBe(true);
      expect(Object.isFrozen(operationInfo.body)).toBe(true);
      expect(() => {
        (operationInfo as { pathname: string }).pathname = 'tampered';
      }).toThrow(TypeError);
      expect(() => {
        (operationInfo.body as { nested: { rating: number } }).nested.rating =
          99;
      }).toThrow(TypeError);
    });
  });

  describe('Header sanitization in OperationInfo', () => {
    it('merges settings.headers with request headers and strips sensitive or custom headers', () => {
      const configuredTransport = new FirebaseSqlTransport({
        settings: {
          serviceId: 's',
          location: 'l',
          headers: {
            Prefer: 'count=exact',
            Authorization: 'Bearer settings-secret'
          }
        }
      });
      const manager = new OperationManager(REST_URL, configuredTransport);
      const info = manager.snapshotOperationInfo(`${REST_URL}/movies`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.pgrst.object+json',
          'X-Firebase-AppCheck': 'secret',
          'X-Custom': 'val'
        }
      });

      expect(info.headers).toEqual({
        accept: 'application/vnd.pgrst.object+json',
        prefer: 'count=exact'
      });
      expect(JSON.stringify(info)).not.toContain('settings-secret');
      expect(JSON.stringify(info)).not.toContain('secret');
      expect(JSON.stringify(info)).not.toContain('val');
    });

    it('omits headers field when neither accept nor prefer is present', () => {
      const manager = new OperationManager(REST_URL, transport);
      const info = manager.snapshotOperationInfo(`${REST_URL}/movies`, {
        method: 'GET',
        headers: { Authorization: 'Bearer secret-jwt', 'X-Custom': 'value' }
      });

      expect('headers' in info).toBe(false);
      expect(info.headers).toBeUndefined();
    });
  });

  describe('PostgREST dispatch header resolution', () => {
    it('merges settings.headers and init.headers with correct precedence', async () => {
      const configuredTransport = new FirebaseSqlTransport({
        settings: {
          serviceId: 's',
          location: 'l',
          headers: {
            'X-From-Settings': 'settings-only',
            'X-Override-By-Init': 'from-settings'
          }
        }
      });
      const manager = new OperationManager(REST_URL, configuredTransport);

      await manager.execute(`${REST_URL}/movies`, {
        method: 'GET',
        headers: [
          ['X-From-Init', 'init-only'],
          ['X-Override-By-Init', 'from-init']
        ]
      });

      const headers = getHeadersFromCall(mockFetch, 0);
      expect(headers.get('X-From-Settings')).toBe('settings-only');
      expect(headers.get('X-From-Init')).toBe('init-only');
      expect(headers.get('X-Override-By-Init')).toBe('from-init');
    });

    it('does not attach Content-Type on GET or HEAD requests', async () => {
      const plainManager = new OperationManager(REST_URL, transport);

      await plainManager.execute(`${REST_URL}/movies`, { method: 'GET' });
      expect(getHeadersFromCall(mockFetch, 0).has('Content-Type')).toBe(false);

      await plainManager.execute(`${REST_URL}/movies`, { method: 'HEAD' });
      expect(getHeadersFromCall(mockFetch, 1).has('Content-Type')).toBe(false);
    });

    it('enforces Content-Type: application/json on POST, PATCH, and DELETE requests (overwriting caller-supplied Content-Type)', async () => {
      const configuredTransport = new FirebaseSqlTransport({
        settings: {
          serviceId: 's',
          location: 'l',
          headers: { 'Content-Type': 'text/plain' }
        }
      });
      const manager = new OperationManager(REST_URL, configuredTransport);

      await manager.execute(`${REST_URL}/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' }
      });
      expect(getHeadersFromCall(mockFetch, 0).get('Content-Type')).toBe(
        'application/json'
      );

      await manager.execute(`${REST_URL}/movies?id=eq.1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      expect(getHeadersFromCall(mockFetch, 1).get('Content-Type')).toBe(
        'application/json'
      );

      await manager.execute(`${REST_URL}/movies?id=eq.1`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'text/plain' }
      });
      expect(getHeadersFromCall(mockFetch, 2).get('Content-Type')).toBe(
        'application/json'
      );
    });

    it('sets Accept-Profile and strips Content-Profile on GET and HEAD requests when schemaName is configured', async () => {
      const scopedManager = new OperationManager(
        REST_URL,
        transport,
        'analytics'
      );

      await scopedManager.execute(`${REST_URL}/movies`, {
        method: 'GET',
        headers: { 'Content-Profile': 'stale' }
      });
      const getHeaders = getHeadersFromCall(mockFetch, 0);
      expect(getHeaders.get('Accept-Profile')).toBe('analytics');
      expect(getHeaders.has('Content-Profile')).toBe(false);

      await scopedManager.execute(`${REST_URL}/movies`, {
        method: 'HEAD',
        headers: { 'Content-Profile': 'stale' }
      });
      const headHeaders = getHeadersFromCall(mockFetch, 1);
      expect(headHeaders.get('Accept-Profile')).toBe('analytics');
      expect(headHeaders.has('Content-Profile')).toBe(false);
    });

    it('sets Content-Profile and strips Accept-Profile on POST, PATCH, and DELETE requests when schemaName is configured', async () => {
      const scopedManager = new OperationManager(
        REST_URL,
        transport,
        'analytics'
      );

      await scopedManager.execute(`${REST_URL}/movies`, {
        method: 'POST',
        headers: { 'Accept-Profile': 'stale' }
      });
      const postHeaders = getHeadersFromCall(mockFetch, 0);
      expect(postHeaders.get('Content-Profile')).toBe('analytics');
      expect(postHeaders.has('Accept-Profile')).toBe(false);

      await scopedManager.execute(`${REST_URL}/movies?id=eq.1`, {
        method: 'PATCH',
        headers: { 'Accept-Profile': 'stale' }
      });
      const patchHeaders = getHeadersFromCall(mockFetch, 1);
      expect(patchHeaders.get('Content-Profile')).toBe('analytics');
      expect(patchHeaders.has('Accept-Profile')).toBe(false);

      await scopedManager.execute(`${REST_URL}/movies?id=eq.1`, {
        method: 'DELETE',
        headers: { 'Accept-Profile': 'stale' }
      });
      const deleteHeaders = getHeadersFromCall(mockFetch, 2);
      expect(deleteHeaders.get('Content-Profile')).toBe('analytics');
      expect(deleteHeaders.has('Accept-Profile')).toBe(false);
    });

    it('falls back to transport.settings.schemaName when explicit schemaName is omitted', async () => {
      const settingsScopedTransport = new FirebaseSqlTransport({
        settings: { serviceId: 's', location: 'l', schemaName: 'billing' }
      });
      const settingsScopedManager = new OperationManager(
        REST_URL,
        settingsScopedTransport
      );
      await settingsScopedManager.execute(`${REST_URL}/invoices`, {
        method: 'GET'
      });
      const billingHeaders = getHeadersFromCall(mockFetch, 0);
      expect(billingHeaders.get('Accept-Profile')).toBe('billing');
    });

    it('omits Accept-Profile and Content-Profile headers when schemaName is undefined', async () => {
      const defaultManager = new OperationManager(
        REST_URL,
        transport,
        undefined
      );
      const unScopedResult = await defaultManager.execute(
        `${REST_URL}/movies`,
        { method: 'GET' }
      );
      expect('schemaName' in unScopedResult.operationInfo).toBe(false);
      const unScopedHeaders = getHeadersFromCall(mockFetch, 0);
      expect(unScopedHeaders.has('Accept-Profile')).toBe(false);
      expect(unScopedHeaders.has('Content-Profile')).toBe(false);
    });
  });

  describe('Delegation to transport.invokePostgrestOperation()', () => {
    it('createSqlFetch() synchronously invokes onSnapshot before network resolution and delegates to invokePostgrestOperation', async () => {
      const events: string[] = [];
      let capturedSnapshot: OperationInfo | undefined;
      const expectedResponse = new Response(JSON.stringify([{ id: 1 }]), {
        status: 200
      });

      mockFetch.mockImplementationOnce(async () => {
        events.push('network-fetch');
        return expectedResponse;
      });

      const invokeSpy = vi.spyOn(transport, 'invokePostgrestOperation');
      const manager = new OperationManager(REST_URL, transport, 'public');
      const sqlFetch = manager.createSqlFetch(
        { isMaybeSingle: true },
        snapshot => {
          events.push('on-snapshot');
          capturedSnapshot = snapshot;
        }
      );

      const responsePromise = sqlFetch(`${REST_URL}/movies?select=id`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      expect(events).toEqual(['on-snapshot']);
      expect(capturedSnapshot?.pathname).toBe('movies');
      expect(capturedSnapshot?.isMaybeSingle).toBe(true);
      expect(capturedSnapshot?.schemaName).toBe('public');
      expect(invokeSpy).toHaveBeenCalledTimes(1);

      const response = await responsePromise;
      expect(response).toBe(expectedResponse);
      expect(events).toEqual(['on-snapshot', 'network-fetch']);
      expect(capturedSnapshot?.searchParams).toEqual([['select', 'id']]);
    });

    it('delegates sqlFetch, createSqlFetch(), and execute() to FirebaseSqlTransportInterface.invokePostgrestOperation', async () => {
      const res1 = new Response(JSON.stringify({ ok: 1 }), { status: 200 });
      const res2 = new Response(JSON.stringify({ ok: 2 }), { status: 201 });
      const res3 = new Response(null, { status: 204 });
      const invokePostgrestOperation = vi
        .fn<FirebaseSqlTransportInterface['invokePostgrestOperation']>()
        .mockResolvedValueOnce(res1)
        .mockResolvedValueOnce(res2)
        .mockResolvedValueOnce(res3);

      const mockTransport: FirebaseSqlTransportInterface = {
        settings: {
          serviceId: 's',
          location: 'l',
          schemaName: 'custom_schema',
          headers: { 'X-Settings-Header': 'settings-val' }
        },
        invokePostgrestOperation,
        onAuthTokenChanged: vi.fn()
      };

      const manager = new OperationManager(REST_URL, mockTransport);

      // 1. Bound sqlFetch property
      const boundSqlFetch = manager.sqlFetch;
      const boundRes = await boundSqlFetch(`${REST_URL}/movies?select=id`, {
        method: 'GET',
        headers: { Prefer: 'count=exact' }
      });

      expect(boundRes).toBe(res1);
      expect(invokePostgrestOperation).toHaveBeenCalledTimes(1);
      expect(invokePostgrestOperation.mock.calls[0]?.[0]).toBe(
        `${REST_URL}/movies?select=id`
      );
      const boundHeaders = new Headers(
        invokePostgrestOperation.mock.calls[0]?.[1]?.headers
      );
      expect(boundHeaders.get('X-Settings-Header')).toBe('settings-val');
      expect(boundHeaders.get('Prefer')).toBe('count=exact');
      expect(boundHeaders.get('Accept-Profile')).toBe('custom_schema');

      // 2. createSqlFetch()
      const customFetch = manager.createSqlFetch();
      const customRes = await customFetch(`${REST_URL}/movies`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Dune' })
      });

      expect(customRes).toBe(res2);
      expect(invokePostgrestOperation).toHaveBeenCalledTimes(2);
      const createHeaders = new Headers(
        invokePostgrestOperation.mock.calls[1]?.[1]?.headers
      );
      expect(createHeaders.get('Content-Type')).toBe('application/json');
      expect(createHeaders.get('Content-Profile')).toBe('custom_schema');

      // 3. execute()
      const executeResult = await manager.execute(
        `${REST_URL}/movies?id=eq.1`,
        {
          method: 'DELETE'
        }
      );

      expect(executeResult.response).toBe(res3);
      expect(invokePostgrestOperation).toHaveBeenCalledTimes(3);
      expect(executeResult.operationInfo.schemaName).toBe('custom_schema');
      const executeHeaders = new Headers(
        invokePostgrestOperation.mock.calls[2]?.[1]?.headers
      );
      expect(executeHeaders.get('Content-Type')).toBe('application/json');
      expect(executeHeaders.get('Content-Profile')).toBe('custom_schema');
    });
  });
});
