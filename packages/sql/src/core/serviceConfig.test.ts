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

import {
  copyServiceConfig,
  ServiceConfig,
  validateServiceConfig
} from './serviceConfig';

describe('ServiceConfig', () => {
  const baseServiceConfig: ServiceConfig = {
    serviceId: 'my-service',
    location: 'us-central1'
  };

  describe('copyServiceConfig', () => {
    it('returns an isolated defensive clone of minimal and full ServiceConfig', () => {
      const minimalCopy = copyServiceConfig(baseServiceConfig);
      expect(minimalCopy).toEqual(baseServiceConfig);
      expect(minimalCopy).not.toBe(baseServiceConfig);

      const original: ServiceConfig = {
        serviceId: 'my-service',
        location: 'us-central1',
        schemaName: 'custom',
        host: '127.0.0.1',
        port: 5432,
        sslEnabled: false
      };

      const serviceConfigCopy = copyServiceConfig(original);
      expect(serviceConfigCopy).toEqual(original);
      expect(serviceConfigCopy).not.toBe(original);

      original.serviceId = 'mutated-service';
      original.schemaName = 'mutated-schema';
      original.port = 9999;

      expect(serviceConfigCopy.serviceId).toBe('my-service');
      expect(serviceConfigCopy.schemaName).toBe('custom');
      expect(serviceConfigCopy.port).toBe(5432);
    });
  });

  describe('validateServiceConfig', () => {
    it('returns a frozen defensive copy of valid ServiceConfig', () => {
      const input: ServiceConfig = {
        serviceId: 'svc-1',
        location: 'europe-west1',
        schemaName: 'app_data',
        host: 'localhost',
        port: 8080,
        sslEnabled: false
      };

      const validated = validateServiceConfig(input);
      expect(validated).toEqual(input);
      expect(validated).not.toBe(input);
      expect(Object.isFrozen(validated)).toBe(true);

      input.schemaName = 'mutated';
      expect(validated.schemaName).toBe('app_data');
    });
  });
});
