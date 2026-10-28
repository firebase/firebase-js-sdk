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

import { copySqlServiceSettings, SqlServiceSettings } from './settings';

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
});
