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
  FirebaseApp,
  _addComponent,
  deleteApp,
  getApps,
  initializeApp
} from '@firebase/app';
import { FirebaseAppCheckInternal } from '@firebase/app-check-interop-types';
import { FirebaseAuthInternal } from '@firebase/auth-interop-types';
import {
  Component,
  ComponentType,
  InstantiationMode,
  Name
} from '@firebase/component';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { DISALLOWED_HEADER_KEYS, SqlServiceSettings } from '../core/settings';
import type { MutableSqlClientState } from '../core/state';
import { SDK_VERSION, setSDKVersion } from '../core/version';
import { getFetch, initializeFetch } from '../network';
import { registerSql } from '../register';

import * as FirebaseSql from './FirebaseSql';

registerSql();

const defaultSettings: SqlServiceSettings = {
  serviceId: 'my-service',
  location: 'us-central1'
};

interface FirebaseSqlWithInternals {
  _state: MutableSqlClientState;
}

describe('FirebaseSql', () => {
  afterEach(async () => {
    await Promise.all(getApps().map(app => deleteApp(app)));
  });

  describe('terminate()', () => {
    it('evicts the instance from the registry and is safe when called repeatedly', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client1 = FirebaseSql.getSql(app, defaultSettings);
      const client2 = FirebaseSql.getSql(app, defaultSettings);
      expect(client1).toBe(client2);

      await FirebaseSql.terminate(client1);

      const client3 = FirebaseSql.getSql(app, defaultSettings);
      expect(client3).not.toBe(client1);

      // Re-terminating an already-terminated instance must not evict the new live instance.
      await FirebaseSql.terminate(client1);
      expect(FirebaseSql.getSql(app, defaultSettings)).toBe(client3);
    });

    it('terminates auth and App Check token providers once and is idempotent on repeated calls', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(app, defaultSettings);
      const internals = client as unknown as FirebaseSqlWithInternals;

      const authTerminateSpy = vi.spyOn(
        internals._state.active!.authTokenProvider,
        'terminate'
      );
      const appCheckTerminateSpy = vi.spyOn(
        internals._state.active!.appCheckTokenProvider,
        'terminate'
      );

      await FirebaseSql.terminate(client);

      expect(internals._state.active).toBeNull();
      expect(authTerminateSpy).toHaveBeenCalledTimes(1);
      expect(appCheckTerminateSpy).toHaveBeenCalledTimes(1);

      await FirebaseSql.terminate(client);

      expect(internals._state.active).toBeNull();
      expect(authTerminateSpy).toHaveBeenCalledTimes(1);
      expect(appCheckTerminateSpy).toHaveBeenCalledTimes(1);
    });

    it('terminates auth and App Check token providers when deleteApp() is called', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(app, defaultSettings);
      const internals = client as unknown as FirebaseSqlWithInternals;

      const authTerminateSpy = vi.spyOn(
        internals._state.active!.authTokenProvider,
        'terminate'
      );
      const appCheckTerminateSpy = vi.spyOn(
        internals._state.active!.appCheckTokenProvider,
        'terminate'
      );

      await deleteApp(app);

      expect(internals._state.active).toBeNull();
      expect(authTerminateSpy).toHaveBeenCalledTimes(1);
      expect(appCheckTerminateSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('getSql()', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    app = initializeApp({ projectId: 'test-project' });
  });

  afterEach(async () => {
    await Promise.all(getApps().map(app => deleteApp(app)));
  });

  it('throws FirebaseSqlError(INVALID_ARGUMENT) when first argument is invalid', () => {
    initializeApp({ projectId: 'test-project' });

    for (const invalidApp of ['invalid', null]) {
      let caughtError: unknown;
      try {
        FirebaseSql.getSql(
          invalidApp as unknown as FirebaseApp,
          defaultSettings
        );
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(FirebaseSqlError);
      expect((caughtError as FirebaseSqlError).code).toBe(
        Code.INVALID_ARGUMENT
      );
      expect((caughtError as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
      expect((caughtError as FirebaseSqlError).message).toBe(
        'First argument passed to getSql() must be a FirebaseApp or SqlServiceSettings instance.'
      );
    }
  });

  describe('app resolution', () => {
    it('throws app/no-app when no default FirebaseApp is initialized', async () => {
      await Promise.all(getApps().map(app => deleteApp(app)));
      expect(() => FirebaseSql.getSql(defaultSettings)).toThrow(/no-app/);
    });

    it('resolves the default FirebaseApp when called with settings only', () => {
      const defaultApp = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(defaultSettings);

      expect(client).toBeInstanceOf(FirebaseSql.FirebaseSql);
      expect(client.app).toBe(defaultApp);
      expect(client.settings.serviceId).toBe('my-service');
      expect(client.settings.location).toBe('us-central1');
    });

    it('resolves the default FirebaseApp when first argument is explicitly undefined', () => {
      const defaultApp = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(
        undefined as unknown as FirebaseApp,
        defaultSettings
      );

      expect(client).toBeInstanceOf(FirebaseSql.FirebaseSql);
      expect(client.app).toBe(defaultApp);
      expect(client.settings.serviceId).toBe('my-service');
    });

    it('throws FirebaseSqlError(INVALID_ARGUMENT) when projectId is missing or empty in app options', () => {
      const appWithoutProject = initializeApp({}, 'missing-project');
      const appWithEmptyProject = initializeApp(
        { projectId: '' },
        'empty-project'
      );

      for (const badApp of [appWithoutProject, appWithEmptyProject]) {
        let caughtError: unknown;
        try {
          FirebaseSql.getSql(badApp, defaultSettings);
        } catch (err) {
          caughtError = err;
        }

        expect(caughtError).toBeInstanceOf(FirebaseSqlError);
        expect((caughtError as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((caughtError as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }
    });
  });

  describe('settings validation and defensive copy', () => {
    it('defensively copies and freezes valid minimal and full settings on getSql()', () => {
      const minimalInput: SqlServiceSettings = Object.assign(
        {},
        defaultSettings
      );
      const minimalClient = FirebaseSql.getSql(app, minimalInput);
      expect(minimalClient.settings).toEqual(defaultSettings);
      expect(minimalClient.settings).not.toBe(minimalInput);
      expect(Object.isFrozen(minimalClient.settings)).toBe(true);

      const full: SqlServiceSettings = {
        serviceId: 'svc-1',
        location: 'europe-west1',
        schemaName: 'app_data',
        host: 'localhost',
        port: 8080,
        sslEnabled: false,
        headers: { 'X-Custom': 'abc' }
      };
      const fullClient = FirebaseSql.getSql(app, full);
      expect(fullClient.settings).toEqual(full);
      expect(fullClient.settings).not.toBe(full);
      expect(fullClient.settings.headers).not.toBe(full.headers);
      expect(Object.isFrozen(fullClient.settings)).toBe(true);
      expect(Object.isFrozen(fullClient.settings.headers)).toBe(true);
    });

    it('rejects nullish settings or missing required serviceId/location with FirebaseSqlError (invalid-argument, sql-client)', () => {
      const invalidCandidates: unknown[] = [
        null,
        undefined,
        { location: 'us-central1' },
        { serviceId: '', location: 'us-central1' },
        { serviceId: 'my-service' },
        { serviceId: 'my-service', location: '' }
      ];

      for (const candidate of invalidCandidates) {
        let caughtError: unknown;
        try {
          FirebaseSql.getSql(app, candidate as SqlServiceSettings);
        } catch (e) {
          caughtError = e;
        }
        expect(caughtError).toBeInstanceOf(FirebaseSqlError);
        expect((caughtError as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((caughtError as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }
    });
  });

  describe('instance caching and deduplication', () => {
    it('returns different instances for missing schemaName vs explicit schemaName: public', () => {
      const client1 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1'
      });
      const client2 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1',
        schemaName: 'public'
      });

      expect(client1).not.toBe(client2);
    });

    it('returns the exact same instance for implicit vs explicit sslEnabled: true', () => {
      const client1 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1'
      });
      const client2 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1',
        sslEnabled: true
      });

      expect(client1).toBe(client2);
    });

    it('returns distinct instances for different apps or settings fields (other than headers)', () => {
      const otherApp = initializeApp(
        { projectId: 'test-project' },
        'secondary'
      );
      const baseClient = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1'
      });

      expect(
        FirebaseSql.getSql(otherApp, {
          serviceId: 'my-service',
          location: 'us-central1'
        })
      ).not.toBe(baseClient);

      expect(
        FirebaseSql.getSql(app, {
          serviceId: 'other-service',
          location: 'us-central1'
        })
      ).not.toBe(baseClient);

      expect(
        FirebaseSql.getSql(app, {
          serviceId: 'my-service',
          location: 'europe-west1'
        })
      ).not.toBe(baseClient);

      expect(
        FirebaseSql.getSql(app, {
          serviceId: 'my-service',
          location: 'us-central1',
          host: 'localhost'
        })
      ).not.toBe(baseClient);

      expect(
        FirebaseSql.getSql(app, {
          serviceId: 'my-service',
          location: 'us-central1',
          port: 8080
        })
      ).not.toBe(baseClient);

      expect(
        FirebaseSql.getSql(app, {
          serviceId: 'my-service',
          location: 'us-central1',
          sslEnabled: false
        })
      ).not.toBe(baseClient);

      expect(
        FirebaseSql.getSql(app, {
          serviceId: 'my-service',
          location: 'us-central1',
          schemaName: 'analytics'
        })
      ).not.toBe(baseClient);
    });

    it('returns different instances for different custom headers', () => {
      const headersOne = {
        'X-One': '1'
      };
      const headersTwo = {
        'X-Two': '2'
      };
      const client1 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1',
        headers: headersOne
      });
      const client2 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1',
        headers: headersTwo
      });

      expect(client1).not.toBe(client2);
    });

    it('treats custom headers as case and order insensitive for deduplication', () => {
      const headersOne = {
        'X-One': '1',
        'X-Two': '2'
      };
      const headersTwo = {
        'x-two': '2',
        'x-one': '1'
      };
      const client1 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1',
        headers: headersOne
      });
      const client2 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1',
        headers: headersTwo
      });

      expect(client1).toBe(client2);
    });
  });
});

function registerAuthMock(
  app: FirebaseApp,
  getTokenImpl: (
    forceRefresh?: boolean
  ) => Promise<{ accessToken: string } | null>
): ReturnType<typeof vi.fn<typeof getTokenImpl>> {
  const getTokenMock = vi.fn<typeof getTokenImpl>(getTokenImpl);
  const authMock: FirebaseAuthInternal = {
    getToken: getTokenMock,
    getUid: () => 'uid-123',
    addAuthTokenListener: vi.fn(),
    removeAuthTokenListener: vi.fn()
  };
  _addComponent(
    app,
    new Component(
      'auth-internal' as Name,
      () => authMock as never,
      ComponentType.PRIVATE
    ).setInstantiationMode(InstantiationMode.EAGER)
  );
  return getTokenMock;
}

function registerAppCheckMock(
  app: FirebaseApp,
  token: string
): ReturnType<
  typeof vi.fn<(forceRefresh?: boolean) => Promise<{ token: string }>>
> {
  const getTokenMock = vi.fn(async () => ({ token }));
  const appCheckMock: FirebaseAppCheckInternal = {
    getToken: getTokenMock,
    getLimitedUseToken: getTokenMock,
    addTokenListener: vi.fn(),
    removeTokenListener: vi.fn()
  };
  _addComponent(
    app,
    new Component(
      'app-check-internal' as Name,
      () => appCheckMock as never,
      ComponentType.PRIVATE
    ).setInstantiationMode(InstantiationMode.EAGER)
  );
  return getTokenMock;
}

describe('FirebaseSql end-to-end operations', () => {
  const originalFetch = getFetch();
  const originalSdkVersion = SDK_VERSION;

  beforeEach(() => {
    setSDKVersion('0.0.1');
  });

  afterEach(async () => {
    initializeFetch(originalFetch);
    setSDKVersion(originalSdkVersion);
    await Promise.all(getApps().map(existingApp => deleteApp(existingApp)));
  });

  describe('from() CRUD, custom headers, and schemaName', () => {
    it('executes select, insert, upsert, update, and delete with filters and transforms', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, {
        ...defaultSettings,
        headers: { 'X-Custom-Client': 'yes' }
      });

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 1, name: 'Ada' }]), {
            status: 200,
            headers: { 'content-range': '0-0/5' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 2, name: 'Grace' }]), {
            status: 201
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 2, name: 'Grace Hopper' }]), {
            status: 201
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 2, name: 'Updated' }]), {
            status: 200
          })
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }));
      initializeFetch(mockFetch);

      const selectRes = await sql
        .from('users')
        .select('id,name', { count: 'exact' })
        .eq('id', 1)
        .order('id', { ascending: false })
        .limit(1);
      expect(selectRes.success).toBe(true);
      expect(selectRes.data).toEqual([{ id: 1, name: 'Ada' }]);
      expect(selectRes.count).toBe(5);

      const [selectUrl, selectInit] = mockFetch.mock.calls[0];
      expect(String(selectUrl)).toContain(
        '/v1/projects/proj-1/locations/us-central1/services/my-service/postgrest/users?'
      );
      expect(String(selectUrl)).toContain('select=id%2Cname');
      expect(String(selectUrl)).toContain('id=eq.1');
      const selectHeaders = selectInit?.headers as Record<string, string>;
      expect(selectHeaders['x-custom-client']).toBe('yes');
      expect('accept-profile' in selectHeaders).toBe(false);
      expect('content-profile' in selectHeaders).toBe(false);

      const insertRes = await sql
        .from('users')
        .insert({ id: 2, name: 'Grace' })
        .select();
      expect(insertRes.success).toBe(true);
      expect(mockFetch.mock.calls[1][1]?.method).toBe('POST');

      const upsertRes = await sql
        .from('users')
        .upsert({ id: 2, name: 'Grace Hopper' }, { onConflict: 'id' })
        .select();
      expect(upsertRes.success).toBe(true);
      expect(mockFetch.mock.calls[2][1]?.method).toBe('POST');

      const updateRes = await sql
        .from('users')
        .update({ name: 'Updated' })
        .eq('id', 2)
        .select();
      expect(updateRes.success).toBe(true);
      expect(mockFetch.mock.calls[3][1]?.method).toBe('PATCH');

      const deleteRes = await sql.from('users').delete().eq('id', 2);
      expect(deleteRes.success).toBe(true);
      expect(deleteRes.status).toBe(204);
      expect(mockFetch.mock.calls[4][1]?.method).toBe('DELETE');
    });

    it('sends Accept-Profile on GET/HEAD and Content-Profile on mutations when schemaName is configured', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, {
        ...defaultSettings,
        schemaName: 'analytics'
      });

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('[]', { status: 200 }))
        .mockResolvedValueOnce(new Response('', { status: 201 }));
      initializeFetch(mockFetch);

      await sql.from('events').select();
      await sql.from('events').insert({ kind: 'click' });

      const getHeaders = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      const postHeaders = mockFetch.mock.calls[1][1]?.headers as Record<
        string,
        string
      >;
      expect(getHeaders['accept-profile']).toBe('analytics');
      expect('content-profile' in getHeaders).toBe(false);
      expect(postHeaders['content-profile']).toBe('analytics');
      expect('accept-profile' in postHeaders).toBe(false);
    });
  });

  describe('rpc()', () => {
    interface LeaderboardRow {
      userId: number;
      score: number;
    }

    it('supports default POST JSON body, GET/HEAD options, overrideTypes<Row[]>(), and filters/transforms', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ userId: 7, score: 99 }]), {
            status: 200
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ userId: 7, score: 99 }]), {
            status: 200
          })
        )
        .mockResolvedValueOnce(
          new Response('', {
            status: 200,
            headers: { 'content-range': '*/12' }
          })
        );
      initializeFetch(mockFetch);

      const postRes = await sql
        .rpc('top_users', { minScore: 50 })
        .eq('userId', 7)
        .limit(5)
        .overrideTypes<LeaderboardRow[]>();
      expect(postRes.success).toBe(true);
      if (postRes.success) {
        const rows: LeaderboardRow[] = postRes.data;
        expect(rows).toEqual([{ userId: 7, score: 99 }]);
      }
      expect(mockFetch.mock.calls[0][1]?.method).toBe('POST');
      expect(mockFetch.mock.calls[0][1]?.body).toBe('{"minScore":50}');
      expect(String(mockFetch.mock.calls[0][0])).toContain(
        '/postgrest/rpc/top_users?userId=eq.7&limit=5'
      );

      const getRes = await sql.rpc(
        'top_users',
        { minScore: 50 },
        { get: true }
      );
      expect(getRes.success).toBe(true);
      expect(mockFetch.mock.calls[1][1]?.method).toBe('GET');
      expect(String(mockFetch.mock.calls[1][0])).toContain(
        '/postgrest/rpc/top_users?minScore=50'
      );

      const headRes = await sql.rpc(
        'top_users',
        { minScore: 50 },
        { head: true, count: 'exact' }
      );
      expect(headRes.success).toBe(true);
      expect(headRes.data).toBeNull();
      expect(headRes.count).toBe(12);
      expect(mockFetch.mock.calls[2][1]?.method).toBe('HEAD');
    });

    it('rejects dot-segments, percent-encodes /, ../, ?, and # in from() and rpc(), and preserves raw Error on blank from()', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);

      for (const dotSegment of ['.', '..']) {
        let fromDotErr: unknown;
        try {
          sql.from(dotSegment);
        } catch (err) {
          fromDotErr = err;
        }
        expect(fromDotErr).toBeInstanceOf(FirebaseSqlError);
        expect((fromDotErr as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((fromDotErr as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );

        let rpcDotErr: unknown;
        try {
          void sql.rpc(dotSegment);
        } catch (err) {
          rpcDotErr = err;
        }
        expect(rpcDotErr).toBeInstanceOf(FirebaseSqlError);
        expect((rpcDotErr as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((rpcDotErr as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }

      for (const blankTable of ['', '   ']) {
        let blankErr: unknown;
        try {
          sql.from(blankTable);
        } catch (err) {
          blankErr = err;
        }
        expect(blankErr).toBeInstanceOf(Error);
        expect(blankErr).not.toBeInstanceOf(FirebaseSqlError);
      }

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockImplementation(async () => new Response('[]', { status: 200 }));
      initializeFetch(mockFetch);

      await sql.from('a/b').select();
      await sql.from('../other').select();
      await sql.from('users?select=secret#frag').select();
      await sql.rpc('../users', { id: 1 });
      await sql.rpc('ns/fn?admin=true#frag', { id: 1 });

      const basePrefix =
        '/v1/projects/proj-1/locations/us-central1/services/my-service/postgrest';

      const url0 = new URL(String(mockFetch.mock.calls[0][0]));
      expect(url0.pathname).toBe(`${basePrefix}/a%2Fb`);

      const url1 = new URL(String(mockFetch.mock.calls[1][0]));
      expect(url1.pathname).toBe(`${basePrefix}/..%2Fother`);

      const url2 = new URL(String(mockFetch.mock.calls[2][0]));
      expect(url2.pathname).toBe(
        `${basePrefix}/users%3Fselect%3Dsecret%23frag`
      );
      expect(url2.searchParams.get('select')).not.toBe('secret');
      expect(url2.hash).toBe('');

      const url3 = new URL(String(mockFetch.mock.calls[3][0]));
      expect(url3.pathname).toBe(`${basePrefix}/rpc/..%2Fusers`);

      const url4 = new URL(String(mockFetch.mock.calls[4][0]));
      expect(url4.pathname).toBe(
        `${basePrefix}/rpc/ns%2Ffn%3Fadmin%3Dtrue%23frag`
      );
      expect(url4.searchParams.has('admin')).toBe(false);
      expect(url4.hash).toBe('');
    });
  });

  describe('headers, apiKey omission, disallowed headers, and 1x 401 retry', () => {
    it('attaches required headers, respects appId presence, and omits apiKey even when configured on FirebaseApp', async () => {
      const appWithIds = initializeApp(
        {
          projectId: 'proj-1',
          appId: '1:999:web:abc',
          apiKey: 'AIzaSyTestKeyShouldNotBeSent'
        },
        'with-ids'
      );
      registerAuthMock(appWithIds, async () => ({ accessToken: 'id-token-1' }));
      registerAppCheckMock(appWithIds, 'appcheck-token-1');

      const appWithoutIds = initializeApp(
        {
          projectId: 'proj-1',
          apiKey: 'AIzaSyTestKeyShouldNotBeSent'
        },
        'without-ids'
      );

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('[]', { status: 200 }))
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));
      initializeFetch(mockFetch);

      await FirebaseSql.getSql(appWithIds, defaultSettings)
        .from('users')
        .select();
      await FirebaseSql.getSql(appWithoutIds, defaultSettings).rpc(
        'ping',
        {},
        { get: true }
      );

      const [url1, init1] = mockFetch.mock.calls[0];
      const headers1 = init1?.headers as Record<string, string>;
      expect(String(url1)).not.toContain('key=');
      expect(String(url1)).not.toContain('AIzaSy');
      expect(headers1['x-goog-api-client']).toBe('gl-js/ fire/0.0.1');
      expect(headers1['x-client-version']).toBe('web/0.0.1');
      expect(headers1['x-firebase-gmpid']).toBe('1:999:web:abc');
      expect(headers1['x-firebase-auth-token']).toBe('id-token-1');
      expect(headers1['x-firebase-appcheck']).toBe('appcheck-token-1');
      expect('x-goog-api-key' in headers1).toBe(false);
      expect('authorization' in headers1).toBe(false);

      const [url2, init2] = mockFetch.mock.calls[1];
      const headers2 = init2?.headers as Record<string, string>;
      expect(String(url2)).not.toContain('key=');
      expect('x-firebase-gmpid' in headers2).toBe(false);
      expect('x-firebase-auth-token' in headers2).toBe(false);
      expect('x-firebase-appcheck' in headers2).toBe(false);
    });

    it('rejects all disallowed headers synchronously in both getSql() and builder.setHeader()', () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);

      for (const key of DISALLOWED_HEADER_KEYS) {
        const upperKey = key.toUpperCase();
        let getSqlErr: unknown;
        try {
          FirebaseSql.getSql(app, {
            ...defaultSettings,
            headers: { [upperKey]: 'blocked' }
          });
        } catch (err) {
          getSqlErr = err;
        }
        expect(getSqlErr).toBeInstanceOf(FirebaseSqlError);
        expect((getSqlErr as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((getSqlErr as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );

        let setHeaderErr: unknown;
        try {
          void sql.from('users').select().setHeader(upperKey, 'blocked');
        } catch (err) {
          setHeaderErr = err;
        }
        expect(setHeaderErr).toBeInstanceOf(FirebaseSqlError);
        expect((setHeaderErr as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((setHeaderErr as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }
    });

    it('performs a 1x token-refresh retry on HTTP 401 end-to-end through sql.from().select()', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const getTokenMock = registerAuthMock(app, async forceRefresh => ({
        accessToken: forceRefresh ? 'refreshed-jwt' : 'expired-jwt'
      }));
      const sql = FirebaseSql.getSql(app, defaultSettings);

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: {
                code: 401,
                status: 'UNAUTHENTICATED',
                message: 'Token expired'
              }
            }),
            { status: 401 }
          )
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 9 }]), { status: 200 })
        );
      initializeFetch(mockFetch);

      const res = await sql.from('users').select();
      expect(res.success).toBe(true);
      expect(res.data).toEqual([{ id: 9 }]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(getTokenMock).toHaveBeenCalledTimes(3);
      expect(getTokenMock).toHaveBeenNthCalledWith(1, false);
      expect(getTokenMock).toHaveBeenNthCalledWith(2, false);
      expect(getTokenMock).toHaveBeenNthCalledWith(3, true);
      expect(
        (mockFetch.mock.calls[1][1]?.headers as Record<string, string>)[
          'x-firebase-auth-token'
        ]
      ).toBe('refreshed-jwt');
    });
  });

  describe('error mapping, Preserve404, RawSync, and throwOnError()', () => {
    it('maps sql-postgrest, sql-platform, and sql-client errors and supports Preserve404 and throwOnError()', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: 'PGRST205',
              message: 'Table missing',
              details: null,
              hint: 'Check schema'
            }),
            { status: 404, statusText: 'Not Found' }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: {
                code: 403,
                status: 'PERMISSION_DENIED',
                message: 'IAM denied'
              }
            }),
            { status: 403, statusText: 'Forbidden' }
          )
        )
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(
          new Response('[]', { status: 404, statusText: 'Not Found' })
        )
        .mockResolvedValueOnce(
          new Response('', { status: 404, statusText: 'Not Found' })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: '23505',
              message: 'duplicate key',
              details: 'Key (id)=(1) exists',
              hint: null
            }),
            { status: 409, statusText: 'Conflict' }
          )
        );
      initializeFetch(mockFetch);

      const pgRes = await sql.from('missing').select().retry(false);
      expect(pgRes.success).toBe(false);
      expect(pgRes.error).toBeInstanceOf(FirebaseSqlError);
      expect(pgRes.error?.code).toBe('PGRST205');
      expect(pgRes.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_POSTGREST
      );
      expect(pgRes.error?.hint).toBe('Check schema');
      expect(pgRes.error?.status).toBe(404);

      const platformRes = await sql.from('users').select().retry(false);
      expect(platformRes.success).toBe(false);
      expect(platformRes.error?.code).toBe(Code.UNAUTHORIZED);
      expect(platformRes.error?.category).toBe(
        FirebaseSqlErrorCategory.SQL_PLATFORM
      );
      expect(platformRes.error?.message).toBe('IAM denied');
      expect(platformRes.error?.status).toBe(403);

      const netRes = await sql.from('users').select().retry(false);
      expect(netRes.success).toBe(false);
      expect(netRes.status).toBe(0);
      expect(netRes.error?.code).toBe(Code.OTHER);
      expect(netRes.error?.category).toBe(FirebaseSqlErrorCategory.SQL_CLIENT);
      expect(netRes.error?.status).toBeUndefined();

      const preserve404Array = await sql.from('users').select();
      expect(preserve404Array.success).toBe(true);
      expect(preserve404Array.status).toBe(200);
      expect(preserve404Array.data).toEqual([]);

      const preserve404Empty = await sql.from('users').delete().eq('id', 999);
      expect(preserve404Empty.success).toBe(true);
      expect(preserve404Empty.status).toBe(204);
      expect(preserve404Empty.data).toBeNull();

      let thrownErr: unknown;
      try {
        await sql.from('users').insert({ id: 1 }).throwOnError();
      } catch (err) {
        thrownErr = err;
      }
      expect(thrownErr).toBeInstanceOf(FirebaseSqlError);
      expect((thrownErr as FirebaseSqlError).code).toBe('23505');
      expect((thrownErr as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_POSTGREST
      );
    });

    it('propagates synchronous plain Error unwrapped on from("") and .csv().stripNulls()', () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);

      let emptyFromErr: unknown;
      try {
        sql.from('');
      } catch (err) {
        emptyFromErr = err;
      }
      expect(emptyFromErr).toBeInstanceOf(Error);
      expect(emptyFromErr).not.toBeInstanceOf(FirebaseSqlError);

      let csvStripErr: unknown;
      try {
        void sql.from('users').select().csv().stripNulls();
      } catch (err) {
        csvStripErr = err;
      }
      expect(csvStripErr).toBeInstanceOf(Error);
      expect(csvStripErr).not.toBeInstanceOf(FirebaseSqlError);
    });
  });

  describe('terminate() lifecycle on client methods and active builders', () => {
    it('throws NOT_INITIALIZED on from/rpc after terminate(), while pre-existing builders chain normally and fail on await', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);

      const mockFetch = vi.fn<typeof fetch>();
      initializeFetch(mockFetch);

      // Create builders BEFORE terminate(sql)
      const activeQueryBuilder = sql.from('users');
      const activeSelectBuilder = sql.from('users').select();
      const activeRpcBuilder = sql.rpc('my_fn', { x: 1 });

      await FirebaseSql.terminate(sql);
      // Re-entrant terminate()
      await expect(FirebaseSql.terminate(sql)).resolves.toBeUndefined();

      // Direct client methods throw synchronously with NOT_INITIALIZED
      for (const call of [() => sql.from('users'), () => sql.rpc('my_fn')]) {
        let syncErr: unknown;
        try {
          void call();
        } catch (err) {
          syncErr = err;
        }
        expect(syncErr).toBeInstanceOf(FirebaseSqlError);
        expect((syncErr as FirebaseSqlError).code).toBe(Code.NOT_INITIALIZED);
        expect((syncErr as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }

      // Active builders continue chaining synchronously without throwing
      const chainedFromQueryBuilder = activeQueryBuilder
        .select('id')
        .eq('id', 1)
        .order('id')
        .limit(5);
      const chainedSelect = activeSelectBuilder.eq('active', true).limit(10);
      const chainedRpcThrowing = activeRpcBuilder.limit(1).throwOnError();

      const res1 = await chainedFromQueryBuilder;
      expect(res1.success).toBe(false);
      expect(res1.status).toBe(0);
      expect(res1.error).toBeInstanceOf(FirebaseSqlError);
      expect(res1.error?.code).toBe(Code.NOT_INITIALIZED);
      expect(res1.error?.category).toBe(FirebaseSqlErrorCategory.SQL_CLIENT);

      const res2 = await chainedSelect;
      expect(res2.success).toBe(false);
      expect(res2.error?.code).toBe(Code.NOT_INITIALIZED);

      let rpcThrown: unknown;
      try {
        await chainedRpcThrowing;
      } catch (err) {
        rpcThrown = err;
      }
      expect(rpcThrown).toBeInstanceOf(FirebaseSqlError);
      expect((rpcThrown as FirebaseSqlError).code).toBe(Code.NOT_INITIALIZED);
      expect((rpcThrown as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
