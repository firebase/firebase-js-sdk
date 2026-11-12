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

import { expect } from 'vitest';

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { SqlServiceSettings } from '../core/settings';

import {
  resolvePostgrestUrl,
  validateQueryParamKey,
  validateUrlQueryParams
} from './url';

describe('resolvePostgrestUrl', () => {
  const projectId = 'my-project';

  it('produces canonical cloud URL ending in /postgrest when location and serviceId are specified', () => {
    const settings: SqlServiceSettings = {
      location: 'us-central1',
      serviceId: 'my-service'
    };
    const url = resolvePostgrestUrl(settings, projectId);
    expect(url).toBe(
      'https://firebasedataconnect.googleapis.com/v1/projects/my-project/locations/us-central1/services/my-service/postgrest'
    );
  });

  it('supports custom host and port for local emulator testing', () => {
    const settings: SqlServiceSettings = {
      location: 'us-central1',
      serviceId: 'my-service',
      host: '127.0.0.1',
      port: 9399
    };
    const url = resolvePostgrestUrl(settings, projectId);
    expect(url).toBe(
      'https://127.0.0.1:9399/v1/projects/my-project/locations/us-central1/services/my-service/postgrest'
    );
  });

  it('uses http protocol when sslEnabled is false', () => {
    const settings: SqlServiceSettings = {
      location: 'us-central1',
      serviceId: 'my-service',
      host: '127.0.0.1',
      port: 9399,
      sslEnabled: false
    };
    const url = resolvePostgrestUrl(settings, projectId);
    expect(url).toBe(
      'http://127.0.0.1:9399/v1/projects/my-project/locations/us-central1/services/my-service/postgrest'
    );
  });

  it('uses https protocol by default and when sslEnabled is true', () => {
    const settingsWithSsl: SqlServiceSettings = {
      location: 'us-central1',
      serviceId: 'my-service',
      host: '127.0.0.1',
      port: 9399,
      sslEnabled: true
    };
    const url = resolvePostgrestUrl(settingsWithSsl, projectId);
    expect(url).toBe(
      'https://127.0.0.1:9399/v1/projects/my-project/locations/us-central1/services/my-service/postgrest'
    );
  });

  it('encodes projectId, location, and serviceId path segments', () => {
    const url = resolvePostgrestUrl(
      {
        location: 'us-central1/zone a',
        serviceId: 'service#1/test'
      },
      'my:project/id'
    );
    expect(url).toBe(
      'https://firebasedataconnect.googleapis.com/v1/projects/my%3Aproject%2Fid/locations/us-central1%2Fzone%20a/services/service%231%2Ftest/postgrest'
    );
  });

  it('does not append schemaName to the resolved PostgREST URL path', () => {
    const settings: SqlServiceSettings = {
      location: 'us-central1',
      serviceId: 'my-service',
      schemaName: 'analytics'
    };
    const url = resolvePostgrestUrl(settings, projectId);
    expect(url).toBe(
      'https://firebasedataconnect.googleapis.com/v1/projects/my-project/locations/us-central1/services/my-service/postgrest'
    );
  });
});

describe('validateQueryParamKey and validateUrlQueryParams', () => {
  it('allows non-dollar query parameter keys and coerces stateful objects once', () => {
    expect(validateQueryParamKey('id')).toBe('id');
    expect(validateQueryParamKey('price$')).toBe('price$');
    expect(validateQueryParamKey('a$b')).toBe('a$b');

    let calls = 0;
    const stateful = {
      toString(): string {
        calls++;
        return calls === 1 ? 'safe_col' : '$injected';
      }
    };
    expect(validateQueryParamKey(stateful as unknown as string)).toBe(
      'safe_col'
    );
    expect(calls).toBe(1);
  });

  it('rejects $-prefixed query parameter keys with Code.INVALID_ARGUMENT and SQL_CLIENT category', () => {
    for (const invalidKey of ['$id', '$alt', '$.xgafv', '$', '  $key']) {
      let thrown: unknown;
      try {
        validateQueryParamKey(invalidKey);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(FirebaseSqlError);
      expect((thrown as FirebaseSqlError).code).toBe(Code.INVALID_ARGUMENT);
      expect((thrown as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
  });

  it('validates URL query strings including percent-encoded %24 and semicolon-delimited keys while allowing $ in values and fragments', () => {
    expect(() =>
      validateUrlQueryParams(
        'https://firebasedataconnect.googleapis.com/v1/postgrest/items?id=eq.1&price=eq.$100&$frag_in_val=ok'.replace(
          '&$frag_in_val=ok',
          '#$id=1'
        )
      )
    ).not.toThrow();
    expect(() =>
      validateUrlQueryParams(
        new URL(
          'https://firebasedataconnect.googleapis.com/v1/postgrest/items?select=id,price$'
        )
      )
    ).not.toThrow();
    expect(() =>
      validateUrlQueryParams(
        'https://firebasedataconnect.googleapis.com/v1/postgrest/items#section?$id=1'
      )
    ).not.toThrow();

    for (const badUrl of [
      'https://firebasedataconnect.googleapis.com/v1/postgrest/items?$id=eq.1',
      'https://firebasedataconnect.googleapis.com/v1/postgrest/items?select=id&%24key=secret',
      'https://firebasedataconnect.googleapis.com/v1/postgrest/items?select=id;$alt=json',
      'https://firebasedataconnect.googleapis.com/v1/postgrest/items?+$id=eq.1',
      'https://firebasedataconnect.googleapis.com/v1/postgrest/items?%24id%ZZ=eq.1',
      'https://firebasedataconnect.googleapis.com/v1/postgrest/items?%20%24id%80=eq.1',
      'https://firebasedataconnect.googleapis.com/v1/postgrest/items?%C2%A0%24id%ZZ=eq.1'
    ]) {
      let thrown: unknown;
      try {
        validateUrlQueryParams(badUrl);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(FirebaseSqlError);
      expect((thrown as FirebaseSqlError).code).toBe(Code.INVALID_ARGUMENT);
      expect((thrown as FirebaseSqlError).category).toBe(
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
  });
});
