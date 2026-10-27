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

import {
  PostgrestFilterBuilder,
  PostgrestQueryBuilder
} from '@supabase/postgrest-js';
import { expect, vi } from 'vitest';

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { DISALLOWED_HEADER_KEYS } from '../core/settings';
import type {
  BuilderExecutionTracker,
  CreateBuilderFetch,
  MapPostgrestError,
  MutableSqlClientState
} from '../core/state';
import { getFetch, initializeFetch } from '../network/fetch';

import {
  FilterBuilderImpl,
  type UntypedPostgrestClientOptions,
  type UntypedPostgrestSchema,
  type UntypedPostgrestTable
} from './impl/FilterBuilderImpl';
import { QueryBuilderImpl } from './impl/QueryBuilderImpl';

import type {
  Builder,
  FilterBuilder,
  InvalidMethodError,
  OperationSuccess
} from './index';

interface CapturedRequest {
  url: URL;
  method: string;
  headers: Headers;
  body: string | undefined;
  signal: AbortSignal | null | undefined;
  tracker: BuilderExecutionTracker;
}

interface TestHarness {
  state: MutableSqlClientState;
  requests: CapturedRequest[];
  mapErrorCalls: Array<{
    rawError: unknown;
    status: number;
    statusText: string;
  }>;
  setResponder: (
    fn: (
      req: CapturedRequest,
      callIndex: number
    ) => Promise<Response> | Response
  ) => void;
  queryBuilder: (
    table?: string,
    options?: {
      schema?: string | undefined;
      headers?: Record<string, string> | undefined;
    }
  ) => QueryBuilderImpl;
  rpcBuilder: (fnName?: string) => FilterBuilder<unknown, 'RPC'>;
}

function createActiveState(): MutableSqlClientState {
  return {
    active: {
      appId: '1:123:web:abc',
      authTokenProvider: {
        getToken: () => Promise.resolve(null),
        addTokenChangeListener: () => {},
        removeTokenChangeListener: () => {},
        terminate: () => {},
        getAuth: () => undefined
      },
      appCheckTokenProvider: {
        getToken: () => Promise.resolve(null),
        addTokenChangeListener: () => {},
        removeTokenChangeListener: () => {},
        terminate: () => {}
      }
    }
  };
}

function jsonResponse(
  body: unknown,
  init: ResponseInit = { status: 200, statusText: 'OK' }
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers: init.headers
  });
}

function createHarness(): TestHarness {
  const state = createActiveState();
  const requests: CapturedRequest[] = [];
  const mapErrorCalls: Array<{
    rawError: unknown;
    status: number;
    statusText: string;
  }> = [];

  let responder: (
    req: CapturedRequest,
    callIndex: number
  ) => Promise<Response> | Response = () => jsonResponse([]);

  const createFetch: CreateBuilderFetch =
    (_state, tracker) =>
    async (input, init): Promise<Response> => {
      const rawUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const captured: CapturedRequest = {
        url: new URL(rawUrl),
        method: init?.method ?? 'GET',
        headers: new Headers(init?.headers),
        body: typeof init?.body === 'string' ? init.body : undefined,
        signal: init?.signal,
        tracker
      };
      const callIndex = requests.length;
      requests.push(captured);
      return responder(captured, callIndex);
    };

  const mapError: MapPostgrestError = (rawError, status, statusText) => {
    mapErrorCalls.push({ rawError, status, statusText });
    const record =
      rawError !== null && typeof rawError === 'object'
        ? (rawError as Record<string, unknown>)
        : {};
    const code =
      typeof record.code === 'string' && record.code.length > 0
        ? record.code
        : Code.OTHER;
    const message =
      typeof record.message === 'string'
        ? record.message
        : 'PostgREST request failed';
    const details =
      typeof record.details === 'string' ? record.details : undefined;
    const hint = typeof record.hint === 'string' ? record.hint : undefined;
    const category =
      typeof record.code === 'string' && record.code.length > 0
        ? FirebaseSqlErrorCategory.SQL_POSTGREST
        : FirebaseSqlErrorCategory.SQL_PLATFORM;
    return new FirebaseSqlError(code, message, category, details, hint, status);
  };

  return {
    state,
    requests,
    mapErrorCalls,
    setResponder: fn => {
      responder = fn;
    },
    queryBuilder: (table = 'users', options = {}) => {
      const delegate = new PostgrestQueryBuilder<
        UntypedPostgrestClientOptions,
        UntypedPostgrestSchema,
        UntypedPostgrestTable,
        string
      >(new URL(`https://sql.example.test/v1/${table}`), {
        headers: options.headers ?? {},
        schema: options.schema
      });
      return new QueryBuilderImpl(delegate, state, createFetch, mapError);
    },
    rpcBuilder: (fnName = 'compute_stats') => {
      const tracker: BuilderExecutionTracker = { clientError: null };
      const delegate = new PostgrestFilterBuilder<
        UntypedPostgrestClientOptions,
        UntypedPostgrestSchema,
        Record<string, unknown>,
        unknown,
        string,
        null,
        'RPC',
        false
      >({
        method: 'POST',
        url: new URL(`https://sql.example.test/v1/rpc/${fnName}`),
        headers: {},
        body: {},
        fetch: createFetch(state, tracker)
      });
      return new FilterBuilderImpl<unknown, 'RPC'>(
        delegate,
        state,
        tracker,
        mapError
      );
    }
  };
}

describe('QueryBuilderImpl and FilterBuilderImpl', () => {
  let originalFetch: typeof fetch | null = null;

  beforeEach(() => {
    try {
      originalFetch = getFetch();
    } catch {
      originalFetch = globalThis.fetch;
    }
    initializeFetch(globalThis.fetch);
  });

  afterEach(() => {
    initializeFetch(originalFetch);
  });

  describe('QueryBuilder operations and reuse', () => {
    it('executes select() with default columns, cleaned columns, head, and count options', async () => {
      const h = createHarness();
      h.setResponder((req, idx) => {
        if (idx === 0) {
          return jsonResponse([{ id: 1, name: 'Ada' }]);
        }
        return new Response('', {
          status: 200,
          statusText: 'OK',
          headers: { 'content-range': '0-0/42' }
        });
      });

      const qb = h.queryBuilder('users', { schema: 'analytics' });
      const res1 = await qb.select('id, "display name"');
      expect(res1).toEqual({
        success: true,
        error: null,
        data: [{ id: 1, name: 'Ada' }],
        count: null,
        status: 200,
        statusText: 'OK'
      });
      expect(h.requests[0].method).toBe('GET');
      expect(h.requests[0].url.searchParams.get('select')).toBe(
        'id,"display name"'
      );
      expect(h.requests[0].headers.get('accept-profile')).toBe('analytics');

      const res2 = await qb.select(undefined, { head: true, count: 'exact' });
      expect(res2).toEqual({
        success: true,
        error: null,
        data: null,
        count: 42,
        status: 200,
        statusText: 'OK'
      });
      expect(h.requests[1].method).toBe('HEAD');
      expect(h.requests[1].url.searchParams.get('select')).toBe('*');
      expect(h.requests[1].headers.get('prefer')).toBe('count=exact');
    });

    it('executes insert(), upsert(), update(), and delete() with PostgREST headers and query params', async () => {
      const h = createHarness();
      h.setResponder(
        () => new Response('', { status: 201, statusText: 'Created' })
      );

      interface NewUser {
        readonly id: number;
        readonly name?: string;
      }
      const rows: readonly NewUser[] = [{ id: 1, name: 'Ada' }, { id: 2 }];

      const qb = h.queryBuilder('users', { schema: 'public' });

      const insertRes = await qb.insert(rows, {
        count: 'planned',
        defaultToNull: false
      });
      expect(insertRes.success).toBe(true);
      expect(insertRes.data).toBeNull();
      expect(insertRes.status).toBe(201);
      expect(h.requests[0].method).toBe('POST');
      expect(h.requests[0].url.searchParams.get('columns')).toBe('"id","name"');
      expect(h.requests[0].headers.get('prefer')).toBe(
        'count=planned, missing=default'
      );
      expect(h.requests[0].headers.get('content-profile')).toBe('public');
      expect(h.requests[0].body).toBe(JSON.stringify(rows));

      const upsertRes = await qb.upsert(
        { id: 1, name: 'Grace' },
        {
          onConflict: 'id',
          ignoreDuplicates: true,
          count: 'estimated',
          defaultToNull: false
        }
      );
      expect(upsertRes.success).toBe(true);
      expect(h.requests[1].method).toBe('POST');
      expect(h.requests[1].url.searchParams.get('on_conflict')).toBe('id');
      expect(h.requests[1].headers.get('prefer')).toBe(
        'resolution=ignore-duplicates, count=estimated, missing=default'
      );

      h.setResponder(
        () => new Response(null, { status: 204, statusText: 'No Content' })
      );

      const updateRes = await qb
        .update({ name: 'Katherine' }, { count: 'exact' })
        .eq('id', 1);
      expect(updateRes.success).toBe(true);
      expect(h.requests[2].method).toBe('PATCH');
      expect(h.requests[2].url.searchParams.get('id')).toBe('eq.1');
      expect(h.requests[2].headers.get('prefer')).toBe('count=exact');
      expect(h.requests[2].body).toBe(JSON.stringify({ name: 'Katherine' }));

      const deleteRes = await qb.delete({ count: 'exact' }).eq('id', 2);
      expect(deleteRes.success).toBe(true);
      expect(h.requests[3].method).toBe('DELETE');
      expect(h.requests[3].url.searchParams.get('id')).toBe('eq.2');
      expect(h.requests[3].headers.get('prefer')).toBe('count=exact');
    });

    it('isolates URL state, headers, and execution trackers across concurrent queries on a reused QueryBuilder', async () => {
      const h = createHarness();
      const qb = h.queryBuilder('items', {
        headers: { 'X-Base': 'base-val' }
      });

      const firstQuery = qb
        .select('id')
        .eq('id', 1)
        .setHeader('X-Per-Req', 'one')
        .retry(false);
      const secondQuery = qb.select('name').eq('id', 2);

      h.setResponder(req => {
        if (req.url.searchParams.get('id') === 'eq.1') {
          req.tracker.clientError = new FirebaseSqlError(
            Code.UNAUTHORIZED,
            'Auth token refresh failed',
            FirebaseSqlErrorCategory.SQL_CLIENT
          );
          const abortErr = new Error('Aborted');
          abortErr.name = 'AbortError';
          throw abortErr;
        }
        return jsonResponse([{ name: 'Item 2' }]);
      });

      const [res1, res2] = await Promise.all([firstQuery, secondQuery]);

      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.error.code).toBe(Code.UNAUTHORIZED);
        expect(res1.status).toBe(0);
      }

      expect(res2).toEqual({
        success: true,
        error: null,
        data: [{ name: 'Item 2' }],
        count: null,
        status: 200,
        statusText: 'OK'
      });

      expect(h.requests[0].headers.get('x-per-req')).toBe('one');
      expect(h.requests[1].headers.get('x-per-req')).toBeNull();
      expect(h.requests[0].headers.get('x-base')).toBe('base-val');
      expect(h.requests[1].headers.get('x-base')).toBe('base-val');
      expect(h.requests[0].tracker).not.toBe(h.requests[1].tracker);
    });
  });

  describe('FilterBuilder methods', () => {
    it('delegates comparison, pattern, regex, nullness, and list filters to PostgREST searchParams', async () => {
      const h = createHarness();
      const query = h
        .queryBuilder('events')
        .select()
        .eq('a', 1)
        .neq('b', 2)
        .gt('c', 3)
        .gte('d', 4)
        .lt('e', 5)
        .lte('f', 6)
        .like('g', '%foo%')
        .likeAllOf('h', ['%a%', '%b%'])
        .likeAnyOf('i', ['%c%', '%d%'])
        .ilike('j', '%bar%')
        .ilikeAllOf('k', ['%e%', '%f%'])
        .ilikeAnyOf('l', ['%g%', '%h%'])
        .regexMatch('m', '^abc')
        .regexIMatch('n', '^xyz')
        .is('o', null)
        .isDistinct('p', null)
        .in('q', ['alpha', 'a,b'])
        .notIn('r', [10, 20]);

      const res = await query;
      expect(res.success).toBe(true);

      const params = h.requests[0].url.searchParams;
      expect(params.get('a')).toBe('eq.1');
      expect(params.get('b')).toBe('neq.2');
      expect(params.get('c')).toBe('gt.3');
      expect(params.get('d')).toBe('gte.4');
      expect(params.get('e')).toBe('lt.5');
      expect(params.get('f')).toBe('lte.6');
      expect(params.get('g')).toBe('like.%foo%');
      expect(params.get('h')).toBe('like(all).{%a%,%b%}');
      expect(params.get('i')).toBe('like(any).{%c%,%d%}');
      expect(params.get('j')).toBe('ilike.%bar%');
      expect(params.get('k')).toBe('ilike(all).{%e%,%f%}');
      expect(params.get('l')).toBe('ilike(any).{%g%,%h%}');
      expect(params.get('m')).toBe('match.^abc');
      expect(params.get('n')).toBe('imatch.^xyz');
      expect(params.get('o')).toBe('is.null');
      expect(params.get('p')).toBe('isdistinct.null');
      expect(params.get('q')).toBe('in.(alpha,"a,b")');
      expect(params.get('r')).toBe('not.in.(10,20)');
    });

    it('delegates containment, range, overlap, textSearch, match, not, or, and filter methods', async () => {
      const h = createHarness();
      h.setResponder(() => jsonResponse([{ id: 1, nickname: 'Ace' }]));

      interface AddressFilter {
        readonly zip: number;
      }
      interface MatchFilter {
        readonly active: boolean;
        readonly ignored?: undefined;
      }

      const addr: AddressFilter = { zip: 94043 };
      const matchObj: MatchFilter = { active: true, ignored: undefined };

      const narrowedQuery = h
        .queryBuilder('events')
        .select()
        .contains('tags', ['x', 'y'])
        .contains('meta', addr)
        .contains('span', '[1,5)')
        .containedBy('tags_sub', ['x', 'y', 'z'])
        .containedBy('meta_sub', addr)
        .containedBy('span_sub', '[0,10)')
        .rangeGt('r1', '[1,2)')
        .rangeGte('r2', '[1,2)')
        .rangeLt('r3', '[5,6)')
        .rangeLte('r4', '[5,6)')
        .rangeAdjacent('r5', '[2,3)')
        .overlaps('ov_arr', ['a', 'b'])
        .overlaps('ov_rng', '[1,4)')
        .textSearch('body_fts', 'cat', { config: 'english' })
        .textSearch('body_pl', 'cat', { type: 'plain', config: 'simple' })
        .textSearch('body_ph', 'fat cat', { type: 'phrase' })
        .textSearch('body_w', 'fat or cat', { type: 'websearch' })
        .match(matchObj)
        .not('nickname', 'is', null)
        .not('status', 'eq', 'archived')
        .or('id.eq.1,id.eq.2')
        .or('role.eq.admin', { referencedTable: 'members' })
        .filter('score', 'not.lt', 50);

      const res = await narrowedQuery;
      expect(res.success).toBe(true);

      const params = h.requests[0].url.searchParams;
      expect(params.get('tags')).toBe('cs.{x,y}');
      expect(params.get('meta')).toBe('cs.{"zip":94043}');
      expect(params.get('span')).toBe('cs.[1,5)');
      expect(params.get('tags_sub')).toBe('cd.{x,y,z}');
      expect(params.get('meta_sub')).toBe('cd.{"zip":94043}');
      expect(params.get('span_sub')).toBe('cd.[0,10)');
      expect(params.get('r1')).toBe('sr.[1,2)');
      expect(params.get('r2')).toBe('nxl.[1,2)');
      expect(params.get('r3')).toBe('sl.[5,6)');
      expect(params.get('r4')).toBe('nxr.[5,6)');
      expect(params.get('r5')).toBe('adj.[2,3)');
      expect(params.get('ov_arr')).toBe('ov.{a,b}');
      expect(params.get('ov_rng')).toBe('ov.[1,4)');
      expect(params.get('body_fts')).toBe('fts(english).cat');
      expect(params.get('body_pl')).toBe('plfts(simple).cat');
      expect(params.get('body_ph')).toBe('phfts.fat cat');
      expect(params.get('body_w')).toBe('wfts.fat or cat');
      expect(params.get('active')).toBe('eq.true');
      expect(params.has('ignored')).toBe(false);
      expect(params.get('nickname')).toBe('not.is.null');
      expect(params.get('status')).toBe('not.eq.archived');
      expect(params.get('or')).toBe('(id.eq.1,id.eq.2)');
      expect(params.get('members.or')).toBe('(role.eq.admin)');
      expect(params.get('score')).toBe('not.lt.50');
    });
  });

  describe('TransformBuilder methods', () => {
    it('supports select(), order(), limit(), range(), rollback(), maxAffected(), and abortSignal()', async () => {
      const h = createHarness();
      h.setResponder(() => jsonResponse([{ id: 1 }]));

      const controller = new AbortController();
      const res = await h
        .queryBuilder('tasks')
        .update({ done: true })
        .eq('owner_id', 7)
        .maxAffected(5)
        .select('id, title')
        .order('id', { ascending: false, nullsFirst: true })
        .order('step', { referencedTable: 'subtasks', ascending: true })
        .limit(10, { referencedTable: 'subtasks' })
        .range(20, 29)
        .rollback()
        .abortSignal(controller.signal);

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toEqual([{ id: 1 }]);
      }

      const req = h.requests[0];
      expect(req.method).toBe('PATCH');
      expect(req.url.searchParams.get('select')).toBe('id,title');
      expect(req.url.searchParams.get('order')).toBe('id.desc.nullsfirst');
      expect(req.url.searchParams.get('subtasks.order')).toBe('step.asc');
      expect(req.url.searchParams.get('subtasks.limit')).toBe('10');
      expect(req.url.searchParams.get('offset')).toBe('20');
      expect(req.url.searchParams.get('limit')).toBe('10');
      expect(req.headers.get('prefer')).toBe(
        'handling=strict, max-affected=5, return=representation, tx=rollback'
      );
      expect(req.signal).toBe(controller.signal);

      // Verify compile-time Method guard on maxAffected for GET/POST
      const disallowedOnGet: InvalidMethodError<'maxAffected method only available on update or delete'> =
        h.queryBuilder('tasks').select().maxAffected(1);
      expect(disallowedOnGet).toBeDefined();
    });

    it('supports single(), maybeSingle(), csv(), geojson(), and explain()', async () => {
      const h = createHarness();
      const qb = h.queryBuilder('places');

      h.setResponder(() => jsonResponse({ id: 1, name: 'HQ' }));
      const singleRes = await qb.select().eq('id', 1).single();
      expect(singleRes.success).toBe(true);
      if (singleRes.success) {
        expect(singleRes.data).toEqual({ id: 1, name: 'HQ' });
      }
      expect(h.requests[0].headers.get('accept')).toBe(
        'application/vnd.pgrst.object+json'
      );

      h.setResponder(() => jsonResponse([]));
      const maybeEmpty = await qb.select().eq('id', 999).maybeSingle();
      expect(maybeEmpty.success).toBe(true);
      if (maybeEmpty.success) {
        expect(maybeEmpty.data).toBeNull();
      }

      h.setResponder(() => jsonResponse([{ id: 2, name: 'Branch' }]));
      const maybeOne = await qb.select().eq('id', 2).maybeSingle();
      expect(maybeOne.success).toBe(true);
      if (maybeOne.success) {
        expect(maybeOne.data).toEqual({ id: 2, name: 'Branch' });
      }

      h.setResponder(() => jsonResponse([{ id: 1 }, { id: 2 }]));
      const maybeMany = await qb.select().maybeSingle();
      expect(maybeMany.success).toBe(false);
      if (!maybeMany.success) {
        expect(maybeMany.status).toBe(406);
        expect(maybeMany.error.code).toBe('PGRST116');
        expect(maybeMany.error.category).toBe(
          FirebaseSqlErrorCategory.SQL_POSTGREST
        );
      }

      h.setResponder(
        () => new Response('id,name\n1,HQ', { status: 200, statusText: 'OK' })
      );
      const csvRes = await qb.select().csv();
      expect(csvRes.success).toBe(true);
      if (csvRes.success) {
        expect(csvRes.data).toBe('id,name\n1,HQ');
      }
      expect(h.requests[4].headers.get('accept')).toBe('text/csv');

      h.setResponder(() =>
        jsonResponse({ type: 'FeatureCollection', features: [] })
      );
      const geoRes = await qb.select().geojson();
      expect(geoRes.success).toBe(true);
      if (geoRes.success) {
        expect(geoRes.data).toEqual({
          type: 'FeatureCollection',
          features: []
        });
      }
      expect(h.requests[5].headers.get('accept')).toBe('application/geo+json');

      h.setResponder(
        () =>
          new Response('Seq Scan on places', {
            status: 200,
            statusText: 'OK'
          })
      );
      const explainText = await qb.select().explain();
      expect(explainText.success).toBe(true);
      if (explainText.success) {
        expect(explainText.data).toBe('Seq Scan on places');
      }
      expect(h.requests[6].headers.get('accept')).toContain(
        'application/vnd.pgrst.plan+text'
      );

      h.setResponder(() =>
        jsonResponse([{ Plan: { 'Node Type': 'Seq Scan' } }])
      );
      const explainJson = await qb.select().explain({
        format: 'json',
        analyze: true,
        verbose: true,
        settings: true,
        buffers: true,
        wal: true
      });
      expect(explainJson.success).toBe(true);
      if (explainJson.success) {
        expect(explainJson.data).toEqual([
          { Plan: { 'Node Type': 'Seq Scan' } }
        ]);
      }
      expect(h.requests[7].headers.get('accept')).toContain(
        'application/vnd.pgrst.plan+json'
      );
      expect(h.requests[7].headers.get('accept')).toContain(
        'options=analyze|verbose|settings|buffers|wal'
      );
    });
  });

  describe('Builder methods, Preserve404, and lifecycle', () => {
    it('handles stripNulls(), synchronous .csv().stripNulls() raw Error, setHeader() validation, retry(), returns(), and overrideTypes()', async () => {
      const h = createHarness();
      const qb = h.queryBuilder('users');

      h.setResponder(() => jsonResponse([{ id: 1 }]));
      await qb.select().stripNulls();
      expect(h.requests[0].headers.get('accept')).toBe(
        'application/vnd.pgrst.array+json;nulls=stripped'
      );

      h.setResponder(() => jsonResponse({ id: 1 }));
      await qb.select().single().stripNulls();
      expect(h.requests[1].headers.get('accept')).toBe(
        'application/vnd.pgrst.object+json;nulls=stripped'
      );

      let rawCsvError: unknown;
      try {
        void qb.select().csv().stripNulls();
      } catch (err) {
        rawCsvError = err;
      }
      expect(rawCsvError).toBeInstanceOf(Error);
      expect(rawCsvError).not.toBeInstanceOf(FirebaseSqlError);
      expect((rawCsvError as Error).message).toBe(
        'stripNulls() cannot be used with csv()'
      );

      h.setResponder(() => jsonResponse([{ id: 1 }]));
      await qb.select().setHeader('X-Custom-Trace', 'trace-123');
      expect(h.requests[2].headers.get('x-custom-trace')).toBe('trace-123');

      const hadAuthDisallowed = DISALLOWED_HEADER_KEYS.has('authorization');
      if (!hadAuthDisallowed) {
        DISALLOWED_HEADER_KEYS.add('authorization');
      }
      try {
        let disallowedErr: unknown;
        try {
          void qb.select().setHeader('Authorization', 'Bearer secret');
        } catch (err) {
          disallowedErr = err;
        }
        expect(disallowedErr).toBeInstanceOf(FirebaseSqlError);
        expect((disallowedErr as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((disallowedErr as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      } finally {
        if (!hadAuthDisallowed) {
          DISALLOWED_HEADER_KEYS.delete('authorization');
        }
      }

      let fetchCalls = 0;
      h.setResponder(() => {
        fetchCalls++;
        return new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
      const noRetryRes = await qb.select().retry(false);
      expect(noRetryRes.success).toBe(false);
      expect(fetchCalls).toBe(1);

      interface UserRow {
        id: number;
        email: string;
      }
      h.setResponder(() => jsonResponse([{ id: 1, email: 'ada@example.com' }]));

      const returnsRes = await qb
        .select()
        .returns<UserRow[]>()
        .order('id', { ascending: true });
      if (returnsRes.success) {
        const typedRows: UserRow[] = returnsRes.data;
        expect(typedRows[0].email).toBe('ada@example.com');
      }

      const rpcTypedBuilder: Builder<UserRow[], false> = h
        .rpcBuilder('list_users')
        .overrideTypes<UserRow[]>();
      const rpcRes = await rpcTypedBuilder;
      expect(rpcRes.success).toBe(true);
      if (rpcRes.success) {
        const rowsFromRpc: UserRow[] = rpcRes.data;
        expect(Array.isArray(rowsFromRpc)).toBe(true);
        expect(rowsFromRpc[0].id).toBe(1);
      }

      const replacedBuilder: Builder<UserRow[], false> = qb
        .select()
        .overrideTypes<UserRow[], { merge: false }>();
      const replacedRes = await replacedBuilder;
      expect(replacedRes.success).toBe(true);
    });

    it('preserves PostgREST 404 semantics (empty -> 204, [] -> 200, JSON error -> mapped failure)', async () => {
      const h = createHarness();
      const qb = h.queryBuilder('users');

      h.setResponder(
        () => new Response('', { status: 404, statusText: 'Not Found' })
      );
      const empty404 = await qb.select().throwOnError();
      expect(empty404).toEqual({
        success: true,
        error: null,
        data: null,
        count: null,
        status: 204,
        statusText: 'No Content'
      });

      h.setResponder(
        () => new Response('[]', { status: 404, statusText: 'Not Found' })
      );
      const array404 = await qb.select().throwOnError();
      expect(array404).toEqual({
        success: true,
        error: null,
        data: [],
        count: null,
        status: 200,
        statusText: 'OK'
      });
      expect(h.mapErrorCalls).toHaveLength(0);

      h.setResponder(
        () =>
          new Response(
            JSON.stringify({
              code: 'PGRST205',
              message: 'Could not find the table',
              details: null,
              hint: null
            }),
            { status: 404, statusText: 'Not Found' }
          )
      );
      const jsonErr404 = await qb.select();
      expect(jsonErr404.success).toBe(false);
      if (!jsonErr404.success) {
        expect(jsonErr404.status).toBe(404);
        expect(jsonErr404.statusText).toBe('Not Found');
        expect(jsonErr404.error).toBeInstanceOf(FirebaseSqlError);
        expect(jsonErr404.error.code).toBe('PGRST205');
      }

      let thrownErr: unknown;
      try {
        await qb.select().throwOnError();
      } catch (err) {
        thrownErr = err;
      }
      expect(thrownErr).toBeInstanceOf(FirebaseSqlError);
      expect((thrownErr as FirebaseSqlError).code).toBe('PGRST205');
      expect((thrownErr as FirebaseSqlError).status).toBe(404);
    });

    it('supports throwOnError() success and failure modes and missing fetch (Code.NOT_SUPPORTED)', async () => {
      const h = createHarness();
      const qb = h.queryBuilder('users');

      h.setResponder(() => jsonResponse([{ id: 7 }]));
      const ok: OperationSuccess<Array<Record<string, unknown>>> = await qb
        .select()
        .throwOnError();
      expect(ok.data).toEqual([{ id: 7 }]);

      initializeFetch(null);
      const noFetchDefault = await qb.select();
      expect(noFetchDefault.success).toBe(false);
      if (!noFetchDefault.success) {
        expect(noFetchDefault.error.code).toBe(Code.NOT_SUPPORTED);
        expect(noFetchDefault.error.category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
        expect(noFetchDefault.status).toBe(0);
        expect(noFetchDefault.statusText).toBe('');
      }

      const spy = vi.fn();
      await expect(qb.select().throwOnError().then(spy)).rejects.toMatchObject({
        code: Code.NOT_SUPPORTED,
        category: FirebaseSqlErrorCategory.SQL_CLIENT
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows chaining on active builders after state.active = null and fails at execution in default and throwOnError() modes', async () => {
      const h = createHarness();
      const qb = h.queryBuilder('users');
      const activeSelect = qb.select('id, name');
      const activeThrowing = qb.select('id').throwOnError();

      // Terminate client state after builders were created
      h.state.active = null;

      // Chaining methods must continue functioning normally without throwing synchronously
      const chainedDefault = activeSelect
        .eq('active', true)
        .order('id', { ascending: true })
        .limit(5)
        .setHeader('X-Trace', 'after-terminate');

      const chainedThrowing = activeThrowing.eq('id', 1).single();

      const defaultResult = await chainedDefault;
      expect(defaultResult.success).toBe(false);
      if (!defaultResult.success) {
        expect(defaultResult.error).toBeInstanceOf(FirebaseSqlError);
        expect(defaultResult.error.code).toBe(Code.NOT_INITIALIZED);
        expect(defaultResult.error.category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
        expect(defaultResult.status).toBe(0);
        expect(defaultResult.statusText).toBe('');
      }

      let rejectedError: unknown;
      try {
        await chainedThrowing;
      } catch (err) {
        rejectedError = err;
      }
      expect(rejectedError).toBeInstanceOf(FirebaseSqlError);
      expect((rejectedError as FirebaseSqlError).code).toBe(
        Code.NOT_INITIALIZED
      );
      expect((rejectedError as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
      expect(h.requests).toHaveLength(0);
    });

    it('fails with NOT_INITIALIZED when state.active becomes null mid-flight and resets tracker.clientError on re-execution', async () => {
      const h = createHarness();
      const qb = h.queryBuilder('users');

      let shouldSetClientError = true;
      h.setResponder(req => {
        if (shouldSetClientError) {
          req.tracker.clientError = new FirebaseSqlError(
            Code.OTHER,
            'Transient token error',
            FirebaseSqlErrorCategory.SQL_CLIENT
          );
          const abortErr = new Error('Aborted');
          abortErr.name = 'AbortError';
          throw abortErr;
        }
        return jsonResponse([{ id: 99 }]);
      });

      const reusableFilter = qb.select().retry(false);
      const firstAttempt = await reusableFilter;
      expect(firstAttempt.success).toBe(false);
      if (!firstAttempt.success) {
        expect(firstAttempt.error.message).toBe('Transient token error');
      }

      // Re-awaiting the same FilterBuilder must clear stale tracker.clientError
      shouldSetClientError = false;
      const secondAttempt = await reusableFilter;
      expect(secondAttempt.success).toBe(true);
      if (secondAttempt.success) {
        expect(secondAttempt.data).toEqual([{ id: 99 }]);
      }

      // Mid-flight termination while request is in progress
      h.setResponder(() => {
        h.state.active = null;
        return jsonResponse([{ id: 100 }]);
      });
      const inFlightDefault = await qb.select();
      expect(inFlightDefault.success).toBe(false);
      if (!inFlightDefault.success) {
        expect(inFlightDefault.error.code).toBe(Code.NOT_INITIALIZED);
        expect(inFlightDefault.status).toBe(0);
      }

      h.state.active = createActiveState().active;
      await expect(qb.select().throwOnError()).rejects.toMatchObject({
        code: Code.NOT_INITIALIZED,
        category: FirebaseSqlErrorCategory.SQL_CLIENT
      });
    });
  });
});
