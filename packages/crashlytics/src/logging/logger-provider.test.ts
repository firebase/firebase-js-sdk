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

import { FirebaseApp } from '@firebase/app';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { Provider } from '@firebase/component';
import { SeverityNumber } from '@opentelemetry/api-logs';
import {
  BatchLogRecordProcessor,
  LoggerProvider
} from '@opentelemetry/sdk-logs';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { AttributesStore } from '../attributes-store';
import { breadcrumbs } from '../breadcrumbs';
import { TelemetryStore } from '../telemetry-store';
import { AppCheckProvider } from './appcheck-provider';
import { FirebaseAttributesLogProcessor } from './attributes-log-processor';
import { createLoggerProvider } from './logger-provider';
import { OnErrorLogRecordProcessor } from './on-error-log-record-processor';

describe('createLoggerProvider', () => {
  let app: FirebaseApp;
  let attributesStore: AttributesStore;
  let telemetryStore: TelemetryStore;

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
    telemetryStore = new TelemetryStore();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should initialize LoggerProvider with FirebaseAttributesLogProcessor and BatchLogRecordProcessor by default when breadcrumbs() is not set', () => {
    const { loggerProvider: provider, onErrorLogRecordProcessor } =
      createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
    expect(provider).to.be.an.instanceOf(LoggerProvider);
    expect(onErrorLogRecordProcessor).to.be.undefined;

    const attributesEmitSpy = sinon.spy(
      FirebaseAttributesLogProcessor.prototype,
      'onEmit'
    );
    const batchEmitSpy = sinon.spy(BatchLogRecordProcessor.prototype, 'onEmit');
    const onErrorEmitSpy = sinon.spy(
      OnErrorLogRecordProcessor.prototype,
      'onEmit'
    );

    provider.getLogger('test-logger').emit({ body: 'test log' });

    expect(attributesEmitSpy.calledOnce).to.be.true;
    expect(batchEmitSpy.calledOnce).to.be.true;
    expect(onErrorEmitSpy.called).to.be.false;
    sinon.assert.callOrder(attributesEmitSpy, batchEmitSpy);
  });

  it('should initialize LoggerProvider with FirebaseAttributesLogProcessor and OnErrorLogRecordProcessor when breadcrumbs() is enabled', () => {
    const { loggerProvider: provider, onErrorLogRecordProcessor } =
      createLoggerProvider(
        app,
        { features: [breadcrumbs()] },
        attributesStore,
        telemetryStore,
        []
      );
    expect(provider).to.be.an.instanceOf(LoggerProvider);
    expect(onErrorLogRecordProcessor).to.be.an.instanceOf(
      OnErrorLogRecordProcessor
    );

    const attributesEmitSpy = sinon.spy(
      FirebaseAttributesLogProcessor.prototype,
      'onEmit'
    );
    const batchEmitSpy = sinon.spy(BatchLogRecordProcessor.prototype, 'onEmit');
    const onErrorEmitSpy = sinon.spy(
      OnErrorLogRecordProcessor.prototype,
      'onEmit'
    );

    provider.getLogger('test-logger').emit({ body: 'test log' });

    expect(attributesEmitSpy.calledOnce).to.be.true;
    expect(onErrorEmitSpy.calledOnce).to.be.true;
    expect(batchEmitSpy.called).to.be.false;
    sinon.assert.callOrder(attributesEmitSpy, onErrorEmitSpy);
  });

  it('should populate resource attributes with gcp.project_id and gcp.firebase.app_id', () => {
    const { loggerProvider: provider } = createLoggerProvider(
      app,
      {},
      attributesStore,
      telemetryStore,
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
    const { loggerProvider: provider } = createLoggerProvider(
      emptyApp,
      {},
      attributesStore,
      telemetryStore,
      []
    );
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
    const { loggerProvider: provider } = createLoggerProvider(
      app,
      { region: 'us-east5' },
      attributesStore,
      telemetryStore,
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
      const { loggerProvider: provider } = createLoggerProvider(
        app,
        {},
        attributesStore,
        telemetryStore,
        [new AppCheckProvider(mockAppCheckProvider)]
      );
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
      const { loggerProvider: provider } = createLoggerProvider(
        app,
        { region: 'us-east5' },
        attributesStore,
        telemetryStore,
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
    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor by default when breadcrumbs() is not enabled', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (Webpack ES module bundle where namespace exports are non-configurable)
        const onInitSpy = sinon.spy(
          BatchLogRecordProcessor.prototype as unknown as {
            _onInit: (options: unknown) => void;
          },
          '_onInit'
        );
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(onInitSpy.calledOnce).to.be.true;
          const args = onInitSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          onInitSpy.restore();
        }
      } else {
        // Node environment
        const BaseClass = Object.getPrototypeOf(BatchLogRecordProcessor);
        const BaseSpy = sinon.spy(function (this: unknown, options: unknown) {
          return Reflect.construct(BaseClass, [options], new.target);
        });
        Object.setPrototypeOf(BaseSpy, Object.getPrototypeOf(BaseClass));
        BaseSpy.prototype = BaseClass.prototype;
        Object.setPrototypeOf(BatchLogRecordProcessor, BaseSpy);
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(BaseSpy.calledOnce).to.be.true;
          const args = BaseSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          Object.setPrototypeOf(BatchLogRecordProcessor, BaseClass);
        }
      }
    });

    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor when breadcrumbs() is enabled', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (Webpack ES module bundle where namespace exports are non-configurable)
        const onInitSpy = sinon.spy(
          BatchLogRecordProcessor.prototype as unknown as {
            _onInit: (options: unknown) => void;
          },
          '_onInit'
        );
        try {
          createLoggerProvider(
            app,
            { features: [breadcrumbs()] },
            attributesStore,
            telemetryStore,
            []
          );
          expect(onInitSpy.calledOnce).to.be.true;
          const args = onInitSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          onInitSpy.restore();
        }
      } else {
        // Node environment
        const BaseSpy = sinon.spy(function (this: unknown, options: unknown) {
          return Reflect.construct(
            BatchLogRecordProcessor,
            [options],
            new.target
          );
        });
        Object.setPrototypeOf(
          BaseSpy,
          Object.getPrototypeOf(BatchLogRecordProcessor)
        );
        BaseSpy.prototype = BatchLogRecordProcessor.prototype;
        Object.setPrototypeOf(OnErrorLogRecordProcessor, BaseSpy);
        try {
          createLoggerProvider(
            app,
            { features: [breadcrumbs()] },
            attributesStore,
            telemetryStore,
            []
          );
          expect(BaseSpy.calledOnce).to.be.true;
          const args = BaseSpy.firstCall.args[0];
          expect(args).to.have.property('disableAutoFlushOnDocumentHide', true);
        } finally {
          Object.setPrototypeOf(
            OnErrorLogRecordProcessor,
            BatchLogRecordProcessor
          );
        }
      }
    });
  });
});
