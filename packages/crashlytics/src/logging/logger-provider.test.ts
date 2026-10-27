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
import {
  BatchLogRecordProcessor,
  LoggerProvider
} from '@opentelemetry/sdk-logs';
import { AttributesStore } from '../attributes-store';
import { breadcrumbs } from '../breadcrumbs';
import { TelemetryStore } from '../telemetry-store';
import { AppCheckProvider } from './appcheck-provider';
import { FirebaseAttributesLogProcessor } from './attributes-log-processor';
import { createLoggerProvider } from './logger-provider';
import { OnErrorLogRecordProcessor } from './on-error-log-record-processor';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { Provider } from '@firebase/component';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { ATTR_KEY_SESSION_SAMPLING_RATE } from '../constants';
import type {
  SamplingDecision,
  SessionSampler
} from '../sampling/session-sampler';

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
    vi.restoreAllMocks();
  });

  it('should initialize LoggerProvider with FirebaseAttributesLogProcessor and BatchLogRecordProcessor by default when breadcrumbs() is not set', () => {
    const { loggerProvider: provider, onErrorLogRecordProcessor } =
      createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
    expect(provider).toBeInstanceOf(LoggerProvider);
    expect(onErrorLogRecordProcessor).toBeUndefined();

    const attributesEmitSpy = vi.spyOn(
      FirebaseAttributesLogProcessor.prototype,
      'onEmit'
    );
    const batchEmitSpy = vi.spyOn(BatchLogRecordProcessor.prototype, 'onEmit');
    const onErrorEmitSpy = vi.spyOn(
      OnErrorLogRecordProcessor.prototype,
      'onEmit'
    );

    provider.getLogger('test-logger').emit({ body: 'test log' });

    expect(attributesEmitSpy).toHaveBeenCalledTimes(1);
    expect(batchEmitSpy).toHaveBeenCalledTimes(1);
    expect(onErrorEmitSpy).not.toHaveBeenCalled();
    expect(attributesEmitSpy.mock.invocationCallOrder[0]).toBeLessThan(
      batchEmitSpy.mock.invocationCallOrder[0]
    );
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
    expect(provider).toBeInstanceOf(LoggerProvider);
    expect(onErrorLogRecordProcessor).toBeInstanceOf(OnErrorLogRecordProcessor);

    const attributesEmitSpy = vi.spyOn(
      FirebaseAttributesLogProcessor.prototype,
      'onEmit'
    );
    const batchEmitSpy = vi.spyOn(BatchLogRecordProcessor.prototype, 'onEmit');
    const onErrorEmitSpy = vi.spyOn(
      OnErrorLogRecordProcessor.prototype,
      'onEmit'
    );

    provider.getLogger('test-logger').emit({ body: 'test log' });

    expect(attributesEmitSpy).toHaveBeenCalledTimes(1);
    expect(onErrorEmitSpy).toHaveBeenCalledTimes(1);
    expect(batchEmitSpy).not.toHaveBeenCalled();
    expect(attributesEmitSpy.mock.invocationCallOrder[0]).toBeLessThan(
      onErrorEmitSpy.mock.invocationCallOrder[0]
    );
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
    expect(sharedState.resource.attributes).toMatchObject({
      'service.name': 'firebase_telemetry_service',
      'gcp.project_id': 'test-project',
      'gcp.firebase.app_id': 'test-app'
    });
    expect(sharedState.resource.attributes).not.toHaveProperty('cloud.region');
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
    expect(sharedState.resource.attributes).not.toHaveProperty(
      'gcp.project_id'
    );
    expect(sharedState.resource.attributes).not.toHaveProperty(
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
    expect(sharedState.resource.attributes).toMatchObject({
      'service.name': 'firebase_telemetry_service',
      'gcp.project_id': 'test-project',
      'gcp.firebase.app_id': 'test-app',
      'cloud.region': 'us-east5'
    });
  });

  it('should export logs to global clienttelemetry /v1/logs endpoint with API key and App Check headers', async () => {
    const fetchStub = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 200 }));
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

      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(fetchStub.mock.calls[0][0]).toBe(
        'https://clienttelemetry.googleapis.com/v1/logs'
      );
      const headers = (fetchStub.mock.calls[0][1] as RequestInit)
        .headers as Headers;
      expect(headers.get('X-Goog-Api-Key')).toBe('test-api-key');
      expect(headers.get('X-Firebase-AppCheck')).toBe('test-appcheck-token');
    } finally {
      fetchStub.mockRestore();
    }
  });

  it('should export logs to regional REP clienttelemetry /v1/logs endpoint when region is set', async () => {
    const fetchStub = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 200 }));
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

      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(fetchStub.mock.calls[0][0]).toBe(
        'https://clienttelemetry.us-east5.rep.googleapis.com/v1/logs'
      );
    } finally {
      fetchStub.mockRestore();
    }
  });

  describe('session sampling', () => {
    function createSampler(decision: Partial<SamplingDecision>): SessionSampler {
      const fullDecision: SamplingDecision = {
        sessionId: 'session-1',
        sampled: true,
        samplingRate: 1,
        ...decision
      };
      return {
        getDecision: vi.fn().mockResolvedValue(fullDecision),
        decide: vi.fn().mockReturnValue(fullDecision),
        getSamplingAttribute: (d: SamplingDecision) => ({
          [ATTR_KEY_SESSION_SAMPLING_RATE]: d.samplingRate
        })
      } as unknown as SessionSampler;
    }

    function exportedLogRecords(
      fetchStub: ReturnType<typeof vi.spyOn>
    ): Array<{ attributes: Array<{ key: string; value: unknown }> }> {
      const body = (fetchStub.mock.calls[0][1] as RequestInit).body as Uint8Array;
      const payload = JSON.parse(new TextDecoder().decode(body));
      return payload.resourceLogs.flatMap((rl: any) =>
        rl.scopeLogs.flatMap((sl: any) => sl.logRecords)
      );
    }

    it('should stamp session.sampling.rate on every exported log record of a sampled session', async () => {
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('', { status: 200 }));
      try {
        const sampler = createSampler({ sampled: true, samplingRate: 0.25 });
        const { loggerProvider: provider } = createLoggerProvider(
          app,
          {},
          attributesStore,
          telemetryStore,
          [],
          sampler
        );
        const logger = provider.getLogger('test');
        logger.emit({ severityNumber: SeverityNumber.ERROR, body: 'one' });
        logger.emit({ severityNumber: SeverityNumber.INFO, body: 'two' });
        await provider.forceFlush();

        expect(sampler.getDecision).toHaveBeenCalled();
        expect(fetchStub).toHaveBeenCalledTimes(1);
        const records = exportedLogRecords(fetchStub);
        expect(records).toHaveLength(2);
        for (const record of records) {
          const attr = record.attributes.find(
            a => a.key === ATTR_KEY_SESSION_SAMPLING_RATE
          );
          expect(attr?.value).toEqual({ doubleValue: 0.25 });
        }
      } finally {
        fetchStub.mockRestore();
      }
    });

    it('should drop all log records of an unsampled session without a network request', async () => {
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('', { status: 200 }));
      try {
        const sampler = createSampler({ sampled: false, samplingRate: 0.25 });
        const { loggerProvider: provider } = createLoggerProvider(
          app,
          {},
          attributesStore,
          telemetryStore,
          [],
          sampler
        );
        provider.getLogger('test').emit({
          severityNumber: SeverityNumber.ERROR,
          body: 'dropped'
        });
        await provider.forceFlush();

        expect(sampler.getDecision).toHaveBeenCalled();
        expect(fetchStub).not.toHaveBeenCalled();
      } finally {
        fetchStub.mockRestore();
      }
    });

    it('should apply sampling to breadcrumb logs released by OnErrorLogRecordProcessor', async () => {
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('', { status: 200 }));
      try {
        const sampler = createSampler({ sampled: false, samplingRate: 0.5 });
        const { loggerProvider: provider, onErrorLogRecordProcessor } =
          createLoggerProvider(
            app,
            { features: [breadcrumbs()] },
            attributesStore,
            telemetryStore,
            [],
            sampler
          );
        provider.getLogger('test').emit({
          severityNumber: SeverityNumber.INFO,
          body: 'breadcrumb'
        });
        onErrorLogRecordProcessor!.onErrorOccurred();
        await provider.forceFlush();

        expect(fetchStub).not.toHaveBeenCalled();
      } finally {
        fetchStub.mockRestore();
      }
    });

    it('should export without a sampling attribute when no sampler is provided', async () => {
      const fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('', { status: 200 }));
      try {
        const { loggerProvider: provider } = createLoggerProvider(
          app,
          {},
          attributesStore,
          telemetryStore,
          []
        );
        provider.getLogger('test').emit({
          severityNumber: SeverityNumber.ERROR,
          body: 'plain'
        });
        await provider.forceFlush();

        expect(fetchStub).toHaveBeenCalledTimes(1);
        const [record] = exportedLogRecords(fetchStub);
        expect(
          record.attributes.some(a => a.key === ATTR_KEY_SESSION_SAMPLING_RATE)
        ).toBe(false);
      } finally {
        fetchStub.mockRestore();
      }
    });
  });

  describe('BatchLogRecordProcessor auto-flush on document hide', () => {
    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor by default when breadcrumbs() is not enabled', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (ES module bundle where namespace exports are non-configurable)
        const onInitSpy = vi.spyOn(
          BatchLogRecordProcessor.prototype as unknown as {
            _onInit: (options: unknown) => void;
          },
          '_onInit'
        );
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(onInitSpy).toHaveBeenCalledTimes(1);
          const args = onInitSpy.mock.calls[0][0];
          expect(args).toHaveProperty('disableAutoFlushOnDocumentHide', true);
        } finally {
          onInitSpy.mockRestore();
        }
      } else {
        // Node environment
        const BaseClass = Object.getPrototypeOf(BatchLogRecordProcessor);
        const BaseSpy = vi.fn(function (this: object, options: unknown) {
          return Reflect.construct(
            BaseClass,
            [options],
            new.target || this.constructor
          );
        });
        Object.setPrototypeOf(BaseSpy, Object.getPrototypeOf(BaseClass));
        BaseSpy.prototype = BaseClass.prototype;
        Object.setPrototypeOf(BatchLogRecordProcessor, BaseSpy);
        try {
          createLoggerProvider(app, {}, attributesStore, telemetryStore, []);
          expect(BaseSpy).toHaveBeenCalledTimes(1);
          const args = BaseSpy.mock.calls[0][0];
          expect(args).toHaveProperty('disableAutoFlushOnDocumentHide', true);
        } finally {
          Object.setPrototypeOf(BatchLogRecordProcessor, BaseClass);
        }
      }
    });

    it('should pass disableAutoFlushOnDocumentHide: true to BatchLogRecordProcessor when breadcrumbs() is enabled', () => {
      if ('_onInit' in BatchLogRecordProcessor.prototype) {
        // Browser environment (ES module bundle where namespace exports are non-configurable)
        const onInitSpy = vi.spyOn(
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
          expect(onInitSpy).toHaveBeenCalledTimes(1);
          const args = onInitSpy.mock.calls[0][0];
          expect(args).toHaveProperty('disableAutoFlushOnDocumentHide', true);
        } finally {
          onInitSpy.mockRestore();
        }
      } else {
        // Node environment
        const BaseSpy = vi.fn(function (this: object, options: unknown) {
          return Reflect.construct(
            BatchLogRecordProcessor,
            [options],
            new.target || this.constructor
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
          expect(BaseSpy).toHaveBeenCalledTimes(1);
          const args = BaseSpy.mock.calls[0][0];
          expect(args).toHaveProperty('disableAutoFlushOnDocumentHide', true);
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
