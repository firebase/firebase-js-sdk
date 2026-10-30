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

import { FirebaseApp, deleteApp, getApps, initializeApp } from '@firebase/app';
import { expect, vi } from 'vitest';

import {
  FirebaseSqlErrorCategory,
  Code,
  FirebaseSqlError
} from '../core/error';
import { SqlServiceSettings } from '../core/settings';
import { AppCheckTokenProvider } from '../core/tokenProviders/AppCheckTokenProvider';
import { FirebaseAuthTokenProvider } from '../core/tokenProviders/FirebaseAuthTokenProvider';
import { registerSql } from '../register';

import * as FirebaseSql from './FirebaseSql';

registerSql();

const defaultSettings: SqlServiceSettings = {
  serviceId: 'my-service',
  location: 'us-central1'
};

interface FirebaseSqlWithInternals {
  _authTokenProvider: FirebaseAuthTokenProvider;
  _appCheckTokenProvider: AppCheckTokenProvider;
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
        internals._authTokenProvider,
        'terminate'
      );
      const appCheckTerminateSpy = vi.spyOn(
        internals._appCheckTokenProvider,
        'terminate'
      );

      await FirebaseSql.terminate(client);
      expect(authTerminateSpy).toHaveBeenCalledTimes(1);
      expect(appCheckTerminateSpy).toHaveBeenCalledTimes(1);

      await FirebaseSql.terminate(client);

      expect(authTerminateSpy).toHaveBeenCalledTimes(1);
      expect(appCheckTerminateSpy).toHaveBeenCalledTimes(1);
    });

    it('terminates auth and App Check token providers when deleteApp() is called', async () => {
      const app = initializeApp({ projectId: 'test-project' });
      const client = FirebaseSql.getSql(app, defaultSettings);
      const internals = client as unknown as FirebaseSqlWithInternals;

      const authTerminateSpy = vi.spyOn(
        internals._authTokenProvider,
        'terminate'
      );
      const appCheckTerminateSpy = vi.spyOn(
        internals._appCheckTokenProvider,
        'terminate'
      );

      await deleteApp(app);

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

  describe('normalizeInstanceIdentifierHeaders()', () => {
    it('returns an empty object when headers is undefined or empty', () => {
      expect(FirebaseSql.normalizeInstanceIdentifierHeaders(undefined)).toEqual(
        {}
      );
      expect(FirebaseSql.normalizeInstanceIdentifierHeaders({})).toEqual({});
    });

    it('lowercases all header keys', () => {
      const input = {
        'Content-Type': 'application/json',
        'X-CUSTOM-HEADER': 'value'
      };
      expect(FirebaseSql.normalizeInstanceIdentifierHeaders(input)).toEqual({
        'content-type': 'application/json',
        'x-custom-header': 'value'
      });
    });

    it('deterministically sorts entries by key code units regardless of values', () => {
      const input = {
        z: '1',
        a: '9',
        M: '5',
        b: '2'
      };
      const result = FirebaseSql.normalizeInstanceIdentifierHeaders(input);
      // Key order by code unit: 'M' (77), 'a' (97), 'b' (98), 'z' (122)
      expect(Object.keys(result)).toEqual(['m', 'a', 'b', 'z']);
    });

    it('de-duplicates case-differing keys deterministically based on key sorting order', () => {
      // In code-unit comparison, 'B' (66) < 'b' (98).
      // 'b' is processed after 'B', overwriting 'B' regardless of values.
      const input = {
        b: 'lowercase-val',
        B: 'uppercase-val'
      };
      expect(FirebaseSql.normalizeInstanceIdentifierHeaders(input)).toEqual({
        b: 'lowercase-val'
      });

      const reversedValues = {
        B: 'zzz',
        b: 'aaa'
      };
      expect(
        FirebaseSql.normalizeInstanceIdentifierHeaders(reversedValues)
      ).toEqual({
        b: 'aaa'
      });
    });
  });
});
