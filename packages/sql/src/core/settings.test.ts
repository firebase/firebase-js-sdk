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

import { describe, expect, it } from 'vitest';

import { Code, FirebaseSqlError, FirebaseSqlErrorCategory } from './error';
import {
  copySqlServiceSettings,
  DISALLOWED_HEADER_KEYS,
  normalizeHeaders,
  SqlServiceSettings,
  validateHeaders,
  validateSqlServiceSettings
} from './settings';

describe('SqlServiceSettings', () => {
  const baseSettings: SqlServiceSettings = {
    serviceId: 'my-service',
    location: 'us-central1'
  };

  describe('copySqlServiceSettings', () => {
    it('returns an isolated deep clone of SqlServiceSettings including null-prototype headers', () => {
      const original: SqlServiceSettings = {
        serviceId: 'my-service',
        location: 'us-central1',
        schemaName: 'custom',
        host: '127.0.0.1',
        port: 5432,
        sslEnabled: false,
        headers: {
          'X-Client-Version': '1.0.0'
        }
      };

      const settingsCopy = copySqlServiceSettings(original);
      expect(settingsCopy).toEqual(original);
      expect(settingsCopy).not.toBe(original);
      expect(settingsCopy.headers).not.toBe(original.headers);

      original.serviceId = 'mutated-service';
      original.headers!['X-Client-Version'] = '2.0.0';

      expect(settingsCopy.serviceId).toBe('my-service');
      expect(settingsCopy.headers!['X-Client-Version']).toBe('1.0.0');

      const nullProtoHeaders = Object.assign(Object.create(null), {
        'X-Custom': '1'
      }) as Record<string, string>;
      const withNullProto = copySqlServiceSettings(
        Object.assign({}, baseSettings, {
          headers: nullProtoHeaders
        })
      );
      expect(withNullProto.headers).not.toBe(nullProtoHeaders);
      nullProtoHeaders['X-Custom'] = '2';
      expect(withNullProto.headers!['X-Custom']).toBe('1');
    });
  });

  describe('DISALLOWED_HEADER_KEYS and validateHeaders', () => {
    const expectedDisallowedHeaders = [
      'x-goog-api-client',
      'x-client-version',
      'x-firebase-gmpid',
      'x-firebase-auth-token',
      'x-firebase-appcheck',
      'authorization',
      'x-firebase-sqlconnect-affinity',
      'x-goog-request-params',
      'x-firebase-client',
      'x-firebase-client-log-type'
    ];

    it('contains all 10 reserved and forbidden header keys', () => {
      expect(Array.from(DISALLOWED_HEADER_KEYS).sort()).toEqual(
        [...expectedDisallowedHeaders].sort()
      );
    });

    it.each(expectedDisallowedHeaders)(
      'rejects disallowed header %s across case variants in validateHeaders and validateSqlServiceSettings',
      headerKey => {
        const mixedCaseKey = headerKey
          .split('-')
          .map((part, idx) =>
            idx % 2 === 0 ? part.toUpperCase() : part.toLowerCase()
          )
          .join('-');

        for (const variant of [
          headerKey,
          headerKey.toUpperCase(),
          mixedCaseKey
        ]) {
          let validateHeadersErr: unknown;
          try {
            validateHeaders({ [variant]: 'value' });
          } catch (err) {
            validateHeadersErr = err;
          }
          expect(validateHeadersErr).toBeInstanceOf(FirebaseSqlError);
          expect((validateHeadersErr as FirebaseSqlError).code).toBe(
            Code.INVALID_ARGUMENT
          );
          expect((validateHeadersErr as FirebaseSqlError).category).toBe(
            FirebaseSqlErrorCategory.SQL_CLIENT
          );

          let validateSettingsErr: unknown;
          try {
            validateSqlServiceSettings({
              ...baseSettings,
              headers: { 'X-Custom-Allowed': 'ok', [variant]: 'value' }
            });
          } catch (err) {
            validateSettingsErr = err;
          }
          expect(validateSettingsErr).toBeInstanceOf(FirebaseSqlError);
          expect((validateSettingsErr as FirebaseSqlError).code).toBe(
            Code.INVALID_ARGUMENT
          );
          expect((validateSettingsErr as FirebaseSqlError).category).toBe(
            FirebaseSqlErrorCategory.SQL_CLIENT
          );
        }
      }
    );

    it('allows undefined and non-disallowed custom headers and freezes validated settings', () => {
      expect(() => validateHeaders(undefined)).not.toThrow();
      expect(() =>
        validateHeaders({
          'X-Custom-Header': 'custom-val',
          Prefer: 'count=exact'
        })
      ).not.toThrow();

      const validated = validateSqlServiceSettings({
        ...baseSettings,
        headers: { 'X-Custom-Header': 'custom-val' }
      });
      expect(Object.isFrozen(validated)).toBe(true);
      expect(Object.isFrozen(validated.headers)).toBe(true);
      expect(normalizeHeaders({ 'X-Custom-Header': 'custom-val' })).toEqual({
        'x-custom-header': 'custom-val'
      });
    });
  });
});
