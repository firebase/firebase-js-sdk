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
  _getProvider,
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

import type { FirebaseSqlContext } from '../core/context';
import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import {
  SqlServiceSettings,
  validateSqlServiceSettings
} from '../core/settings';
import { SDK_VERSION, setSDKVersion } from '../core/version';
import { LOWERCASE_DISALLOWED_HEADER_KEYS } from '../network/headers';
import { registerSql } from '../register';

import * as FirebaseSql from './FirebaseSql';

registerSql();

const defaultSettings: SqlServiceSettings = {
  serviceId: 'my-service',
  location: 'us-central1'
};

interface FirebaseSqlWithInternals {
  _state:
    | { name: 'mutable'; headers: Headers }
    | { name: 'immutable'; context: FirebaseSqlContext }
    | { name: 'terminated' };
}

describe('FirebaseSql', () => {
  afterEach(async () => {
    await Promise.all(getApps().map(app => deleteApp(app)));
  });

  describe('terminate()', () => {
    it('evicts the instance from the registry in both mutable and immutable states and is safe when called repeatedly', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client1 = FirebaseSql.getSql(app, defaultSettings);
      const client2 = FirebaseSql.getSql(app, defaultSettings);
      expect(client1).toBe(client2);
      expect(client1.mutable).toBe(true);

      await FirebaseSql.terminate(client1);
      expect(client1.mutable).toBe(false);

      const client3 = FirebaseSql.getSql(app, defaultSettings);
      expect(client3).not.toBe(client1);
      expect(client3.mutable).toBe(true);

      // Re-terminating an already-terminated instance must not evict the new live instance.
      await FirebaseSql.terminate(client1);
      expect(FirebaseSql.getSql(app, defaultSettings)).toBe(client3);

      // Transition client3 to immutable before terminating.
      client3.from('users');
      expect(client3.mutable).toBe(false);
      await FirebaseSql.terminate(client3);

      const client4 = FirebaseSql.getSql(app, defaultSettings);
      expect(client4).not.toBe(client3);

      await FirebaseSql.terminate(client3);
      expect(FirebaseSql.getSql(app, defaultSettings)).toBe(client4);
    });

    it('terminates auth and App Check token providers once after entering immutable state and is idempotent on repeated calls', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(app, defaultSettings);
      const internals = client as unknown as FirebaseSqlWithInternals;

      expect(internals._state.name).toBe('mutable');
      client.from('users');
      expect(internals._state.name).toBe('immutable');
      if (internals._state.name !== 'immutable') {
        throw new Error('Expected immutable state');
      }
      const { context } = internals._state;

      const authTerminateSpy = vi.spyOn(
        context.resources!.authTokenProvider,
        'terminate'
      );
      const appCheckTerminateSpy = vi.spyOn(
        context.resources!.appCheckTokenProvider,
        'terminate'
      );

      await FirebaseSql.terminate(client);

      expect(internals._state.name).toBe('terminated');
      expect(context.resources).toBeNull();
      expect(authTerminateSpy).toHaveBeenCalledTimes(1);
      expect(appCheckTerminateSpy).toHaveBeenCalledTimes(1);

      await FirebaseSql.terminate(client);

      expect(internals._state.name).toBe('terminated');
      expect(context.resources).toBeNull();
      expect(authTerminateSpy).toHaveBeenCalledTimes(1);
      expect(appCheckTerminateSpy).toHaveBeenCalledTimes(1);
    });

    it('terminates auth and App Check token providers when deleteApp() is called', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(app, defaultSettings);
      const internals = client as unknown as FirebaseSqlWithInternals;

      client.from('users');
      if (internals._state.name !== 'immutable') {
        throw new Error('Expected immutable state');
      }
      const { context } = internals._state;

      const authTerminateSpy = vi.spyOn(
        context.resources!.authTokenProvider,
        'terminate'
      );
      const appCheckTerminateSpy = vi.spyOn(
        context.resources!.appCheckTokenProvider,
        'terminate'
      );

      await deleteApp(app);

      expect(internals._state.name).toBe('terminated');
      expect(context.resources).toBeNull();
      expect(authTerminateSpy).toHaveBeenCalledTimes(1);
      expect(appCheckTerminateSpy).toHaveBeenCalledTimes(1);
    });

    it('terminates a mutable instance cleanly when deleteApp() is called', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(app, defaultSettings);
      expect(client.mutable).toBe(true);

      await deleteApp(app);

      expect(client.mutable).toBe(false);
      expect(() => client.from('users')).toThrow(
        expect.objectContaining({
          code: Code.NOT_INITIALIZED,
          category: FirebaseSqlErrorCategory.SQL_CLIENT
        })
      );
    });

    it('aborts abortSignal before terminating token providers and evicts the instance even if context.resources is already null', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(app, defaultSettings);
      const internals = client as unknown as FirebaseSqlWithInternals;

      client.from('users');
      if (internals._state.name !== 'immutable') {
        throw new Error('Expected immutable state');
      }
      const { context } = internals._state;
      const events: string[] = [];

      context.abortSignal.addEventListener('abort', () => {
        events.push('abort');
      });

      vi.spyOn(
        context.resources!.appCheckTokenProvider,
        'terminate'
      ).mockImplementation(() => {
        expect(context.abortSignal.aborted).toBe(true);
        events.push('appCheckTerminate');
      });

      vi.spyOn(
        context.resources!.authTokenProvider,
        'terminate'
      ).mockImplementation(() => {
        expect(context.abortSignal.aborted).toBe(true);
        // Instance should still be registered while token providers are terminating.
        expect(FirebaseSql.getSql(app, defaultSettings)).toBe(client);
        events.push('authTerminate');
      });

      await FirebaseSql.terminate(client);

      expect(events).toEqual(['abort', 'appCheckTerminate', 'authTerminate']);
      expect(context.abortSignal.aborted).toBe(true);
      expect(context.abortSignal.reason).toBeInstanceOf(FirebaseSqlError);
      expect(context.abortSignal.reason).toEqual(
        expect.objectContaining({
          code: Code.NOT_INITIALIZED,
          category: FirebaseSqlErrorCategory.SQL_CLIENT
        })
      );
      const replacementClient = FirebaseSql.getSql(app, defaultSettings);
      expect(replacementClient).not.toBe(client);

      // Verify that even if context.resources is already null on an immutable instance,
      // abortSignal is still aborted and the cached instance is still evicted.
      replacementClient.from('users');
      const replacementInternals =
        replacementClient as unknown as FirebaseSqlWithInternals;
      if (replacementInternals._state.name !== 'immutable') {
        throw new Error('Expected immutable state');
      }
      const replacementContext = replacementInternals._state.context;
      replacementContext.resources!.appCheckTokenProvider.terminate();
      replacementContext.resources!.authTokenProvider.terminate();
      replacementContext.resources = null;

      await FirebaseSql.terminate(replacementClient);

      expect(replacementContext.abortSignal.aborted).toBe(true);
      expect(replacementContext.abortSignal.reason).toBeInstanceOf(
        FirebaseSqlError
      );
      expect(replacementContext.abortSignal.reason).toEqual(
        expect.objectContaining({
          code: Code.NOT_INITIALIZED,
          category: FirebaseSqlErrorCategory.SQL_CLIENT
        })
      );
      expect(FirebaseSql.getSql(app, defaultSettings)).not.toBe(
        replacementClient
      );
    });

    it('does not register auth or App Check onInit listeners or transition mutable state if PostgrestClient instantiation throws', () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(app, defaultSettings);

      const authOnInitSpy = vi.spyOn(
        _getProvider(app, 'auth-internal'),
        'onInit'
      );
      const appCheckOnInitSpy = vi.spyOn(
        _getProvider(app, 'app-check-internal'),
        'onInit'
      );

      const originalFetchDescriptor = Object.getOwnPropertyDescriptor(
        globalThis,
        'fetch'
      );
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        get() {
          throw new Error('Simulated fetch getter failure');
        }
      });

      try {
        expect(() => client.from('users')).toThrow(
          'Simulated fetch getter failure'
        );
      } finally {
        if (originalFetchDescriptor) {
          Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor);
        }
      }

      expect(authOnInitSpy).not.toHaveBeenCalled();
      expect(appCheckOnInitSpy).not.toHaveBeenCalled();
      expect(client.mutable).toBe(true);
    });
  });

  describe('mutable and setHeaders()', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('allows setting and overwriting headers while mutable, defensively copies inputs, and locks on from()/rpc()', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);
      expect(sql.mutable).toBe(true);

      sql.setHeaders({ 'X-First': 'one', 'X-Shared': 'initial' });

      const mutableHeaders: Record<string, string> = {
        'X-Second': 'two',
        'X-Shared': 'overwritten'
      };
      sql.setHeaders(mutableHeaders);
      // Mutating caller object after setHeaders() must not affect outgoing requests.
      mutableHeaders['X-Second'] = 'mutated';
      mutableHeaders['X-Injected'] = 'late';

      expect(sql.mutable).toBe(true);

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('[]', { status: 200 }))
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const builder1 = sql.from('users').select().setHeader('X-Op', 'op1');
      expect(sql.mutable).toBe(false);

      // Subsequent setHeaders() calls throw ALREADY_INITIALIZED once immutable.
      let immutableErr: unknown;
      try {
        sql.setHeaders({ 'X-After': 'blocked' });
      } catch (err) {
        immutableErr = err;
      }
      expect(immutableErr).toBeInstanceOf(FirebaseSqlError);
      expect((immutableErr as FirebaseSqlError).code).toBe(
        Code.ALREADY_INITIALIZED
      );
      expect((immutableErr as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );

      await builder1;
      await sql.from('users').select();

      const headers1 = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers1['x-first']).toBeUndefined();
      expect(headers1['x-second']).toBe('two');
      expect(headers1['x-shared']).toBe('overwritten');
      expect(headers1['x-injected']).toBeUndefined();
      expect(headers1['x-op']).toBe('op1');

      const headers2 = mockFetch.mock.calls[1][1]?.headers as Record<
        string,
        string
      >;
      expect(headers2['x-second']).toBe('two');
      expect(headers2['x-op']).toBeUndefined();
    });

    it('transitions mutable to false on rpc() and throws NOT_INITIALIZED on setHeaders() after terminate() from either mutable or immutable state', async () => {
      const app = initializeApp({ projectId: 'proj-1' });

      const sqlFromMutable = FirebaseSql.getSql(app, {
        serviceId: 'svc-mutable',
        location: 'us-central1'
      });
      await FirebaseSql.terminate(sqlFromMutable);
      expect(sqlFromMutable.mutable).toBe(false);

      let errAfterMutableTerminate: unknown;
      try {
        sqlFromMutable.setHeaders({ 'X-Test': 'val' });
      } catch (err) {
        errAfterMutableTerminate = err;
      }
      expect(errAfterMutableTerminate).toBeInstanceOf(FirebaseSqlError);
      expect((errAfterMutableTerminate as FirebaseSqlError).code).toBe(
        Code.NOT_INITIALIZED
      );
      expect((errAfterMutableTerminate as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );

      const sqlFromRpc = FirebaseSql.getSql(app, {
        serviceId: 'svc-rpc',
        location: 'us-central1'
      });
      expect(sqlFromRpc.mutable).toBe(true);
      void sqlFromRpc.rpc('ping');
      expect(sqlFromRpc.mutable).toBe(false);

      await FirebaseSql.terminate(sqlFromRpc);
      expect(sqlFromRpc.mutable).toBe(false);

      let errAfterImmutableTerminate: unknown;
      try {
        sqlFromRpc.setHeaders({ 'X-Test': 'val' });
      } catch (err) {
        errAfterImmutableTerminate = err;
      }
      expect(errAfterImmutableTerminate).toBeInstanceOf(FirebaseSqlError);
      expect((errAfterImmutableTerminate as FirebaseSqlError).code).toBe(
        Code.NOT_INITIALIZED
      );
      expect((errAfterImmutableTerminate as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    });

    it('accepts Headers instances and [string, string][] tuple arrays, defensively copies them, and rejects disallowed headers', async () => {
      const app = initializeApp({ projectId: 'proj-1' });

      // 1. Headers instance input
      const sqlWithHeaders = FirebaseSql.getSql(app, {
        serviceId: 'svc-headers-instance',
        location: 'us-central1'
      });
      const callerHeaders = new Headers({ 'X-From-Headers': 'h1' });
      sqlWithHeaders.setHeaders(callerHeaders);
      // Mutating caller's Headers instance after setHeaders() must not affect outgoing requests.
      callerHeaders.set('X-From-Headers', 'mutated');
      callerHeaders.set('X-Late-Header', 'late');

      // 2. Tuple array input
      const sqlWithTuples = FirebaseSql.getSql(app, {
        serviceId: 'svc-tuple-array',
        location: 'us-central1'
      });
      const callerTupleFirst: [string, string] = ['X-From-Tuple', 't1'];
      const callerTuples: Array<[string, string]> = [
        callerTupleFirst,
        ['X-Second-Tuple', 't2']
      ];
      sqlWithTuples.setHeaders(callerTuples);
      // Mutating caller's tuple array after setHeaders() must not affect outgoing requests.
      callerTupleFirst[1] = 'mutated';
      callerTuples.push(['X-Late-Tuple', 'late']);

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('[]', { status: 200 }))
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      await sqlWithHeaders.from('users').select();
      await sqlWithTuples.from('users').select();

      const wireFromHeaders = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(wireFromHeaders['x-from-headers']).toBe('h1');
      expect(wireFromHeaders['x-late-header']).toBeUndefined();

      const wireFromTuples = mockFetch.mock.calls[1][1]?.headers as Record<
        string,
        string
      >;
      expect(wireFromTuples['x-from-tuple']).toBe('t1');
      expect(wireFromTuples['x-second-tuple']).toBe('t2');
      expect(wireFromTuples['x-late-tuple']).toBeUndefined();

      // 3. Rejects disallowed headers inside Headers instance or tuple array
      const sqlMutable = FirebaseSql.getSql(app, {
        serviceId: 'svc-disallowed-variants',
        location: 'us-central1'
      });
      for (const key of LOWERCASE_DISALLOWED_HEADER_KEYS) {
        const upperKey = key.toUpperCase();

        let errHeaders: unknown;
        try {
          sqlMutable.setHeaders(new Headers({ [upperKey]: 'blocked' }));
        } catch (err) {
          errHeaders = err;
        }
        expect(errHeaders).toBeInstanceOf(FirebaseSqlError);
        expect((errHeaders as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((errHeaders as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );

        let errTuples: unknown;
        try {
          sqlMutable.setHeaders([[upperKey, 'blocked']]);
        } catch (err) {
          errTuples = err;
        }
        expect(errTuples).toBeInstanceOf(FirebaseSqlError);
        expect((errTuples as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((errTuples as FirebaseSqlError).category).toBe(
          FirebaseSqlErrorCategory.SQL_CLIENT
        );
      }
      expect(sqlMutable.mutable).toBe(true);
    });

    it('propagates TypeError synchronously on invalid HTTP header names/values or malformed inputs while preserving mutable state and prior headers', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);
      sql.setHeaders({ 'X-Preserved': 'still-here' });

      const invalidInputs: HeadersInit[] = [
        { 'Invalid Header': 'val' },
        { 'X-Val': 'a\nb' },
        null as unknown as HeadersInit
      ];

      for (const badInput of invalidInputs) {
        expect(() => sql.setHeaders(badInput)).toThrow(TypeError);
        expect(sql.mutable).toBe(true);
      }

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      await sql.from('users').select();
      const wireHeaders = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(wireHeaders['x-preserved']).toBe('still-here');
    });

    it('copies and validates headers before checking client lifecycle state, coercing stateful objects only once', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);

      let keyCoercions = 0;
      let valCoercions = 0;
      const statefulKey = {
        toString(): string {
          keyCoercions += 1;
          return keyCoercions === 1 ? 'X-Allowed' : 'Authorization';
        }
      };
      const statefulVal = {
        toString(): string {
          valCoercions += 1;
          return valCoercions === 1 ? 'safe-value' : 'mutated-value';
        }
      };

      const dynamicHeaders = [
        [statefulKey as unknown as string, statefulVal as unknown as string]
      ] as Array<[string, string]>;
      sql.setHeaders(dynamicHeaders);
      expect(keyCoercions).toBe(1);
      expect(valCoercions).toBe(1);

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      // Transition to immutable state and verify wire headers
      await sql.from('users').select();
      expect(keyCoercions).toBe(1);
      expect(valCoercions).toBe(1);
      const wireHeaders = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(wireHeaders['x-allowed']).toBe('safe-value');

      // When client is immutable, invalid HTTP header syntax still throws TypeError
      // and disallowed headers still throw INVALID_ARGUMENT before ALREADY_INITIALIZED.
      expect(sql.mutable).toBe(false);
      expect(() => sql.setHeaders({ 'Invalid Header': 'val' })).toThrow(
        TypeError
      );
      let immutableDisallowedErr: unknown;
      try {
        sql.setHeaders({ Authorization: 'Bearer tok' });
      } catch (err) {
        immutableDisallowedErr = err;
      }
      expect(immutableDisallowedErr).toBeInstanceOf(FirebaseSqlError);
      expect((immutableDisallowedErr as FirebaseSqlError).code).toBe(
        Code.INVALID_ARGUMENT
      );
      expect((immutableDisallowedErr as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );

      // When client is terminated, invalid HTTP header syntax still throws TypeError
      // and disallowed headers still throw INVALID_ARGUMENT before NOT_INITIALIZED.
      await FirebaseSql.terminate(sql);
      expect(() => sql.setHeaders({ 'Invalid Header': 'val' })).toThrow(
        TypeError
      );
      let terminatedDisallowedErr: unknown;
      try {
        sql.setHeaders({ Authorization: 'Bearer tok' });
      } catch (err) {
        terminatedDisallowedErr = err;
      }
      expect(terminatedDisallowedErr).toBeInstanceOf(FirebaseSqlError);
      expect((terminatedDisallowedErr as FirebaseSqlError).code).toBe(
        Code.INVALID_ARGUMENT
      );
      expect((terminatedDisallowedErr as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
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
      expect(client.restUrl).toBe(
        'https://firebasedataconnect.googleapis.com/v1/projects/test-project/locations/us-central1/services/my-service/postgrest'
      );
      expect(client.schemaName).toBeUndefined();
    });

    it('resolves the default FirebaseApp when first argument is explicitly undefined', () => {
      const defaultApp = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(
        undefined as unknown as FirebaseApp,
        defaultSettings
      );

      expect(client).toBeInstanceOf(FirebaseSql.FirebaseSql);
      expect(client.app).toBe(defaultApp);
      expect(client.restUrl).toBe(
        'https://firebasedataconnect.googleapis.com/v1/projects/test-project/locations/us-central1/services/my-service/postgrest'
      );
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
    it('defensively copies and freezes valid minimal and full settings and derives restUrl and schemaName on getSql()', () => {
      const minimalInput: SqlServiceSettings = Object.assign(
        {},
        defaultSettings
      );
      const validatedMinimal = validateSqlServiceSettings(minimalInput);
      expect(validatedMinimal).toEqual(defaultSettings);
      expect(validatedMinimal).not.toBe(minimalInput);
      expect(Object.isFrozen(validatedMinimal)).toBe(true);

      const minimalClient = FirebaseSql.getSql(app, minimalInput);
      expect(minimalClient.restUrl).toBe(
        'https://firebasedataconnect.googleapis.com/v1/projects/test-project/locations/us-central1/services/my-service/postgrest'
      );
      expect(minimalClient.schemaName).toBeUndefined();

      const full: SqlServiceSettings = {
        serviceId: 'svc-1',
        location: 'europe-west1',
        schemaName: 'app_data',
        host: 'localhost',
        port: 8080,
        sslEnabled: false
      };
      const validatedFull = validateSqlServiceSettings(full);
      expect(validatedFull).toEqual(full);
      expect(validatedFull).not.toBe(full);
      expect(Object.isFrozen(validatedFull)).toBe(true);

      const fullClient = FirebaseSql.getSql(app, full);
      full.schemaName = 'mutated';
      full.serviceId = 'mutated-svc';

      expect(fullClient.restUrl).toBe(
        'http://localhost:8080/v1/projects/test-project/locations/europe-west1/services/svc-1/postgrest'
      );
      expect(fullClient.schemaName).toBe('app_data');
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

    describe('port validation', () => {
      it('allows undefined port', () => {
        expect(() =>
          FirebaseSql.getSql(app, {
            serviceId: 'my-service',
            location: 'us-central1',
            port: undefined
          })
        ).not.toThrow();
      });

      it('allows valid port numbers within [1, 65535]', () => {
        expect(() =>
          FirebaseSql.getSql(app, {
            serviceId: 'my-service',
            location: 'us-central1',
            port: 1
          })
        ).not.toThrow();
        expect(() =>
          FirebaseSql.getSql(app, {
            serviceId: 'my-service',
            location: 'us-central1',
            port: 80
          })
        ).not.toThrow();
        expect(() =>
          FirebaseSql.getSql(app, {
            serviceId: 'my-service',
            location: 'us-central1',
            port: 443
          })
        ).not.toThrow();
        expect(() =>
          FirebaseSql.getSql(app, {
            serviceId: 'my-service',
            location: 'us-central1',
            port: 8080
          })
        ).not.toThrow();
        expect(() =>
          FirebaseSql.getSql(app, {
            serviceId: 'my-service',
            location: 'us-central1',
            port: 65535
          })
        ).not.toThrow();
      });

      it('throws FirebaseSqlError(INVALID_ARGUMENT) on invalid ports', () => {
        const invalidPorts = [
          NaN,
          -1,
          0,
          65536,
          100000,
          80.5,
          Infinity,
          -Infinity,
          '8080',
          null,
          {},
          true
        ];

        for (const badPort of invalidPorts) {
          let caughtError: unknown;
          try {
            FirebaseSql.getSql(app, {
              serviceId: 'my-service',
              location: 'us-central1',
              port: badPort as unknown as number
            });
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

    it('returns distinct instances for different apps or settings fields', () => {
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

    it('shares client headers and mutable state across cached getSql() lookups', async () => {
      const client1 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1'
      });
      client1.setHeaders({ 'X-One': '1' });

      const client2 = FirebaseSql.getSql(app, {
        serviceId: 'my-service',
        location: 'us-central1'
      });

      expect(client1).toBe(client2);
      expect(client2.mutable).toBe(true);

      client2.setHeaders({ 'X-Two': '2' });
      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('[]', { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);
      try {
        await client1.from('users').select();
      } finally {
        vi.unstubAllGlobals();
      }
      expect(client2.mutable).toBe(false);
      const wireHeaders = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(wireHeaders['x-one']).toBeUndefined();
      expect(wireHeaders['x-two']).toBe('2');
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
  const originalSdkVersion = SDK_VERSION;

  beforeEach(() => {
    setSDKVersion('0.0.1');
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    setSDKVersion(originalSdkVersion);
    await Promise.all(getApps().map(existingApp => deleteApp(existingApp)));
  });

  describe('from() CRUD, custom headers, and schemaName', () => {
    it('executes select, insert, upsert, update, and delete with filters and transforms', async () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const sql = FirebaseSql.getSql(app, defaultSettings);
      sql.setHeaders({ 'X-Custom-Client': 'yes' });

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
      vi.stubGlobal('fetch', mockFetch);

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
      vi.stubGlobal('fetch', mockFetch);

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
      vi.stubGlobal('fetch', mockFetch);

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
      vi.stubGlobal('fetch', mockFetch);

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
      vi.stubGlobal('fetch', mockFetch);

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

    it('rejects all disallowed headers synchronously in both sql.setHeaders() and builder.setHeader()', () => {
      const app = initializeApp({ projectId: 'proj-1' });
      const mutableSql = FirebaseSql.getSql(app, {
        ...defaultSettings,
        serviceId: 'mutable-service'
      });
      const sql = FirebaseSql.getSql(app, defaultSettings);

      for (const key of LOWERCASE_DISALLOWED_HEADER_KEYS) {
        const upperKey = key.toUpperCase();
        let setHeadersErr: unknown;
        try {
          mutableSql.setHeaders({ [upperKey]: 'blocked' });
        } catch (err) {
          setHeadersErr = err;
        }
        expect(mutableSql.mutable).toBe(true);
        expect(setHeadersErr).toBeInstanceOf(FirebaseSqlError);
        expect((setHeadersErr as FirebaseSqlError).code).toBe(
          Code.INVALID_ARGUMENT
        );
        expect((setHeadersErr as FirebaseSqlError).category).toBe(
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
      vi.stubGlobal('fetch', mockFetch);

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
      vi.stubGlobal('fetch', mockFetch);

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
      vi.stubGlobal('fetch', mockFetch);

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
