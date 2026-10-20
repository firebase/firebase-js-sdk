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

import { createTracingProvider, OTLPTraceExporter } from './tracing-provider';
import { FirebaseApp } from '@firebase/app';
import { CrashlyticsOptions } from '../public-types';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { context, trace } from '@opentelemetry/api';
import { AttributesStore } from '../attributes-store';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { CompositePropagator } from '@opentelemetry/core';
import { TelemetryStore } from '../telemetry-store';
import { FirebaseAttributesSpanProcessor } from './attributes-span-processor';
import { OnErrorSpanProcessor } from './on-error-span-processor';
import type { MockInstance } from 'vitest';

describe('createTracingProvider', () => {
  let mockApp: FirebaseApp;
  let mockAttributesStore: AttributesStore;
  let mockTelemetryStore: TelemetryStore;
  let mockSpan: any;
  beforeEach(() => {
    mockApp = {
      options: {
        projectId: 'test-project',
        appId: 'test-app-id',
        apiKey: 'test-api-key'
      }
    } as unknown as FirebaseApp;
    mockAttributesStore = new AttributesStore({
      projectId: 'test-project',
      appId: 'test-app-id'
    });
    mockTelemetryStore = new TelemetryStore();
    mockSpan = {
      name: 'test-span',
      kind: 0,
      spanContext: () => ({
        traceId: '00000000000000000000000000000001',
        spanId: '0000000000000002',
        traceFlags: 1
      }),
      startTime: [0, 0],
      endTime: [1, 0],
      attributes: {},
      links: [],
      events: [],
      status: { code: 0 },
      resource: resourceFromAttributes({}),
      instrumentationScope: { name: 'test-scope', version: '1.0.0' },
      setAttributes: (attrs: Record<string, any>) => {
        Object.assign(mockSpan.attributes, attrs);
      }
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a default tracing provider when running in a server/Node environment', () => {
    if (typeof window !== 'undefined') {
      return;
    }
    const mockCrashlyticsOptions = {} as CrashlyticsOptions;
    const { tracingProvider: provider } = createTracingProvider(
      mockApp,
      mockCrashlyticsOptions,
      mockAttributesStore,
      mockTelemetryStore
    );
    expect(provider).toBe(trace.getTracerProvider());
  });

  it('should register the WebTracerProvider globally with a W3CTraceContextPropagator', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const registerSpy = vi.spyOn(WebTracerProvider.prototype, 'register');

    const mockCrashlyticsOptions = {
      endpointUrl: 'http://localhost:4318'
    } as CrashlyticsOptions;

    const { tracingProvider: provider } = createTracingProvider(
      mockApp,
      mockCrashlyticsOptions,
      mockAttributesStore,
      mockTelemetryStore
    );

    expect(registerSpy).toHaveBeenCalledTimes(1);
    const registerArgs = registerSpy.mock.calls[0][0];
    expect(registerArgs).toBeTruthy();

    const propagator = registerArgs!.propagator;
    expect(propagator).toBeTruthy();
    expect(propagator).toBeInstanceOf(CompositePropagator);

    // Verify that the registered propagator is a W3C trace context propagator
    // by checking that it injects a W3C spec-compliant 'traceparent' header.
    const spanContext = {
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceFlags: 1
    };
    const testContext = trace.setSpanContext(context.active(), spanContext);
    const carrier: Record<string, string> = {};
    const setter = {
      set: (c: any, k: string, v: string) => {
        c[k] = v;
      }
    };

    propagator!.inject(testContext, carrier, setter);

    expect(carrier['traceparent']).toBe(
      '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    );
    expect(provider).toBeTruthy();
  });

  it('should initialize WebTracerProvider with FirebaseAttributesSpanProcessor and OnErrorSpanProcessor', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const onStartSpy = vi.spyOn(
      FirebaseAttributesSpanProcessor.prototype,
      'onStart'
    );
    const attributesOnEndSpy = vi.spyOn(
      FirebaseAttributesSpanProcessor.prototype,
      'onEnd'
    );
    const onErrorOnEndSpy = vi.spyOn(OnErrorSpanProcessor.prototype, 'onEnd');

    const testTelemetryStore = new TelemetryStore();
    const { tracingProvider } = createTracingProvider(
      mockApp,
      {},
      new AttributesStore({ projectId: 'test-project', appId: 'test-app' }),
      testTelemetryStore
    );

    const tracer = tracingProvider.getTracer('test-tracer');
    const span = tracer.startSpan('root-span');
    span.end();

    expect(onStartSpy).toHaveBeenCalled();
    expect(attributesOnEndSpy).toHaveBeenCalled();
    expect(onErrorOnEndSpy).toHaveBeenCalled();
    expect(attributesOnEndSpy.mock.invocationCallOrder[0]).toBeLessThan(
      onErrorOnEndSpy.mock.invocationCallOrder[0]
    );
  });

  it('should register FetchInstrumentation with appropriate config', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fetchInstrumentationSpy = vi.spyOn(
      FetchInstrumentation.prototype,
      'setConfig'
    );

    const mockCrashlyticsOptions = {
      endpointUrl: 'my-custom-endpoint.url'
    } as CrashlyticsOptions;

    createTracingProvider(
      mockApp,
      mockCrashlyticsOptions,
      mockAttributesStore,
      mockTelemetryStore
    );

    expect(fetchInstrumentationSpy).toHaveBeenCalled();
    const fetchConfig = fetchInstrumentationSpy.mock.calls[
      fetchInstrumentationSpy.mock.calls.length - 1
    ][0] as any;
    expect(Array.isArray(fetchConfig.ignoreUrls)).toBe(true);
    expect(fetchConfig.ignoreUrls).toHaveLength(1);

    const fetchPatterns = fetchConfig.ignoreUrls.map((r: RegExp) => r.source);
    expect(fetchPatterns).toContain('my-custom-endpoint\\.url');
    expect(fetchConfig.semconvStabilityOptIn).toBe('http');
  });

  it('should register XMLHttpRequestInstrumentation with appropriate config', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const xhrInstrumentationSpy = vi.spyOn(
      XMLHttpRequestInstrumentation.prototype,
      'setConfig'
    );

    const mockCrashlyticsOptions = {
      endpointUrl: 'my-custom-endpoint.url'
    } as CrashlyticsOptions;

    createTracingProvider(
      mockApp,
      mockCrashlyticsOptions,
      mockAttributesStore,
      mockTelemetryStore
    );

    expect(xhrInstrumentationSpy).toHaveBeenCalled();
    const xhrConfig = xhrInstrumentationSpy.mock.calls[
      xhrInstrumentationSpy.mock.calls.length - 1
    ][0] as any;
    expect(Array.isArray(xhrConfig.ignoreUrls)).toBe(true);
    expect(xhrConfig.ignoreUrls).toHaveLength(1);

    const xhrPatterns = xhrConfig.ignoreUrls.map((r: RegExp) => r.source);
    expect(xhrPatterns).toContain('my-custom-endpoint\\.url');
    expect(xhrConfig.semconvStabilityOptIn).toBe('http');
  });

  it('should register DocumentLoadInstrumentation with appropriate config', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const documentLoadInstrumentationSpy = vi.spyOn(
      DocumentLoadInstrumentation.prototype,
      'setConfig'
    );

    createTracingProvider(mockApp, {}, mockAttributesStore, mockTelemetryStore);

    expect(documentLoadInstrumentationSpy).toHaveBeenCalled();
    const documentLoadConfig = documentLoadInstrumentationSpy.mock.calls[
      documentLoadInstrumentationSpy.mock.calls.length - 1
    ][0] as any;
    expect(documentLoadConfig.semconvStabilityOptIn).toBe('http');
  });

  describe('OTLPTraceExporter', () => {
    let fetchStub: MockInstance;

    beforeEach(() => {
      fetchStub = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('test response', { status: 200 }));
    });

    it('should attach dynamic headers to the export request', async () => {
      const mockHeaderProvider = {
        getHeader: vi
          .fn()
          .mockResolvedValue(['X-My-Dynamic-Header', 'dynamic-value'])
      };

      const exporter = new OTLPTraceExporter({ url: 'http://localhost' }, [
        mockHeaderProvider
      ]);

      await new Promise<void>((resolve, reject) => {
        exporter
          .export([mockSpan], res => {
            if (res.code === 0) {
              resolve();
            } else {
              reject(res.error || new Error('Export failed'));
            }
          })
          .catch(reject);
      });

      expect(fetchStub).toHaveBeenCalledTimes(1);
      const fetchOptions = fetchStub.mock.calls[0][1] as any;
      const requestHeaders = fetchOptions.headers as any;
      expect(requestHeaders.get('X-My-Dynamic-Header')).toBe('dynamic-value');
    });

    it('should inject the installation id attribute into exported spans', async () => {
      const mockAttributesStore = {
        getInstallationIdAttribute: vi.fn().mockResolvedValue({
          'installation_id_key': 'installation_id_value'
        })
      } as unknown as AttributesStore;

      const exporter = new OTLPTraceExporter(
        { url: 'http://localhost' },
        [],
        mockAttributesStore
      );

      await new Promise<void>((resolve, reject) => {
        exporter
          .export([mockSpan], res => {
            if (res.code === 0) {
              resolve();
            } else {
              reject(res.error || new Error('Export failed'));
            }
          })
          .catch(reject);
      });

      expect(fetchStub).toHaveBeenCalledTimes(1);
      const fetchOptions = fetchStub.mock.calls[0][1] as any;
      const requestBodyUint8 = fetchOptions.body;

      // Decode and parse request body
      const decodedString = new TextDecoder().decode(requestBodyUint8);
      const json = JSON.parse(decodedString);

      const spans = json.resourceSpans[0].scopeSpans[0].spans;
      const spanAttributes = spans[0].attributes || [];

      const dynamicAttr = spanAttributes.find(
        (a: any) => a.key === 'installation_id_key'
      );
      expect(dynamicAttr).toBeTruthy();
      expect(dynamicAttr.value.stringValue).toBe('installation_id_value');
    });
  });
});
