/**
 * @license
 * Copyright 2025 Google LLC
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
import * as sinon from 'sinon';
import { FirebaseApp } from '@firebase/app';
import * as sdkLogs from '@opentelemetry/sdk-logs';
import {
  LoggerProvider,
  BatchLogRecordProcessor
} from '@opentelemetry/sdk-logs';
import { createLoggerProvider } from './logger-provider';
import { AttributesStore } from '../attributes-store';
import { FirebaseAttributesProcessor } from './attributes-processor';
import { AppCheckProvider } from './appcheck-provider';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { Provider } from '@firebase/component';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';

describe('createLoggerProvider', () => {
  let app: FirebaseApp;
  let attributesStore: AttributesStore;

  beforeEach(() => {
    app = {
      name: '[DEFAULT]',
      options: {
        projectId: 'test-project',
        appId: 'test-app',
        apiKey: 'test-api-key'
      }
    } as FirebaseApp;
    attributesStore = new AttributesStore(app.options);
  });

  it('should initialize LoggerProvider with FirebaseAttributesProcessor and BatchLogRecordProcessor', () => {
    const provider = createLoggerProvider(app, {}, attributesStore, []);
    expect(provider).to.be.an.instanceOf(LoggerProvider);

    const sharedState = (
      provider as unknown as {
        _sharedState: { registeredLogRecordProcessors: unknown[] };
      }
    )._sharedState;
    expect(sharedState.registeredLogRecordProcessors).to.have.lengthOf(2);
    expect(sharedState.registeredLogRecordProcessors[0]).to.be.an.instanceOf(
      FirebaseAttributesProcessor
    );
    expect(sharedState.registeredLogRecordProcessors[1]).to.be.an.instanceOf(
      BatchLogRecordProcessor
    );
  });

  it('should populate resource attributes with gcp.project_id and gcp.firebase.app_id', () => {
    const provider = createLoggerProvider(app, {}, attributesStore, []);
    const sharedState = (
      provider as unknown as {
        _sharedState: { resource: { attributes: Record<string, unknown> } };
      }
    )._sharedState;
    expect(sharedState.resource.attributes).to.include({
      'service.name': 'firebase_telemetry_service',
      'gcp.project_id': 'test-project',
      'gcp.firebase.app_id': 'test-app'
    });
    expect(sharedState.resource.attributes).to.not.have.property(
      'cloud.region'
    );
  });

  it('should omit gcp.project_id and gcp.firebase.app_id when undefined in app options', () => {
    const emptyApp = {
      name: '[DEFAULT]',
      options: {}
    } as FirebaseApp;
    const provider = createLoggerProvider(emptyApp, {}, attributesStore, []);
    const sharedState = (
      provider as unknown as {
        _sharedState: { resource: { attributes: Record<string, unknown> } };
      }
    )._sharedState;
    expect(sharedState.resource.attributes).to.not.have.property(
      'gcp.project_id'
    );
    expect(sharedState.resource.attributes).to.not.have.property(
      'gcp.firebase.app_id'
    );
  });

  it('should populate cloud.region resource attribute when a regional location is configured', () => {
    const provider = createLoggerProvider(
      app,
      { region: 'us-east5' },
      attributesStore,
      []
    );
    const sharedState = (
      provider as unknown as {
        _sharedState: { resource: { attributes: Record<string, unknown> } };
      }
    )._sharedState;
    expect(sharedState.resource.attributes).to.include({
      'service.name': 'firebase_telemetry_service',
      'gcp.project_id': 'test-project',
      'gcp.firebase.app_id': 'test-app',
      'cloud.region': 'us-east5'
    });
  });

  it('should export logs to global clienttelemetry /v1/logs endpoint with API key and App Check headers', async () => {
    const fetchStub = sinon
      .stub(globalThis, 'fetch')
      .resolves(new Response('', { status: 200 }));
    try {
      const mockAppCheckProvider = {
        getImmediate: () => ({
          getToken: async () => ({ token: 'test-appcheck-token' })
        }),
        get: async () => ({
          getToken: async () => ({ token: 'test-appcheck-token' })
        })
      } as unknown as Provider<AppCheckInternalComponentName>;
      const provider = createLoggerProvider(app, {}, attributesStore, [
        new AppCheckProvider(mockAppCheckProvider)
      ]);
      provider.getLogger('test').emit({
        severityNumber: SeverityNumber.ERROR,
        body: 'test error'
      });
      await provider.forceFlush();

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[0]).to.equal(
        'https://clienttelemetry.googleapis.com/v1/logs'
      );
      const headers = (fetchStub.firstCall.args[1] as RequestInit)
        .headers as Headers;
      expect(headers.get('X-Goog-Api-Key')).to.equal('test-api-key');
      expect(headers.get('X-Firebase-AppCheck')).to.equal(
        'test-appcheck-token'
      );
    } finally {
      fetchStub.restore();
    }
  });

  it('should export logs to regional REP clienttelemetry /v1/logs endpoint when region is set', async () => {
    const fetchStub = sinon
      .stub(globalThis, 'fetch')
      .resolves(new Response('', { status: 200 }));
    try {
      const provider = createLoggerProvider(
        app,
        { region: 'us-east5' },
        attributesStore,
        []
      );
      provider.getLogger('test').emit({
        severityNumber: SeverityNumber.ERROR,
        body: 'test error'
      });
      await provider.forceFlush();

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[0]).to.equal(
        'https://clienttelemetry.us-east5.rep.googleapis.com/v1/logs'
      );
    } finally {
      fetchStub.restore();
    }
  });

  describe('BatchLogRecordProcessor auto-flush on document hide', () => {
    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (Webpack ES module bundle where namespace exports are non-configurable)
        const onInitSpy = sinon.spy(
          BatchLogRecordProcessor.prototype as unknown as {
            _onInit: (options: unknown) => void;
          },
          '_onInit'
        );
        try {
          createLoggerProvider(app, {}, attributesStore, []);
          expect(onInitSpy.calledOnce).to.be.true;
          const args = onInitSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          onInitSpy.restore();
        }
      } else {
        // Node environment (CommonJS where exports are configurable)
        const origDesc = Object.getOwnPropertyDescriptor(
          sdkLogs,
          'BatchLogRecordProcessor'
        );
        Object.defineProperty(sdkLogs, 'BatchLogRecordProcessor', {
          value: origDesc?.get
            ? origDesc.get()
            : sdkLogs.BatchLogRecordProcessor,
          configurable: true,
          writable: true
        });
        const batchProcessorSpy = sinon.spy(sdkLogs, 'BatchLogRecordProcessor');
        try {
          createLoggerProvider(app, {}, attributesStore, []);
          expect(batchProcessorSpy.calledOnce).to.be.true;
          const args = batchProcessorSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          batchProcessorSpy.restore();
          if (origDesc) {
            Object.defineProperty(sdkLogs, 'BatchLogRecordProcessor', origDesc);
          }
        }
      }
    });
  });
});
