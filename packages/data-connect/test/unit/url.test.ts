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

import { expect } from 'chai';

import type {
  DataConnectOptions,
  TransportOptions
} from '../../src/api/DataConnect';
import { restUrlBuilder, websocketUrlBuilder } from '../../src/util/url';

describe('url builders', () => {
  const projectConfig = Object.freeze({
    projectId: 'my-project',
    location: 'us-central1',
    service: 'my-service',
    connector: 'my-connector'
  }) satisfies DataConnectOptions;

  describe('restUrlBuilder', () => {
    it('prod URL (HTTPS, no port)', () => {
      const transportOptions: TransportOptions = {
        host: 'firebasedataconnect.googleapis.com',
        sslEnabled: true
      };
      const url = restUrlBuilder(projectConfig, transportOptions);
      expect(url).to.equal(
        'https://firebasedataconnect.googleapis.com/v1/projects/my-project/' +
          'locations/us-central1/services/my-service/connectors/my-connector'
      );
    });

    it('emulator URL (HTTP, with port)', () => {
      const transportOptions: TransportOptions = {
        host: 'localhost',
        sslEnabled: false,
        port: 9399
      };
      const url = restUrlBuilder(projectConfig, transportOptions);
      expect(url).to.equal(
        'http://localhost:9399/v1/projects/my-project/' +
          'locations/us-central1/services/my-service/connectors/my-connector'
      );
    });
  });

  describe('websocketUrlBuilder', () => {
    it('prod URL (WSS, no port)', () => {
      const transportOptions: TransportOptions = {
        host: 'firebasedataconnect.googleapis.com',
        sslEnabled: true
      };
      const url = websocketUrlBuilder(projectConfig, transportOptions);
      expect(url).to.equal(
        'wss://firebasedataconnect.googleapis.com/ws/' +
          'google.firebase.dataconnect.v1.ConnectorStreamService.Connect/' +
          'my-project/locations/us-central1/services/my-service'
      );
    });

    it('emulator URL (WS, with port)', () => {
      const transportOptions: TransportOptions = {
        host: 'localhost',
        sslEnabled: false,
        port: 9399
      };
      const url = websocketUrlBuilder(projectConfig, transportOptions);
      expect(url).to.equal(
        'ws://localhost:9399/ws/' +
          'google.firebase.dataconnect.v1.ConnectorStreamService.Connect/' +
          'my-project/locations/us-central1/services/my-service'
      );
    });
  });
});
