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
import { expect } from 'chai';
import { FirebaseApp } from '@firebase/app';
import { CrashlyticsOptions } from '../public-types';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import * as sinon from 'sinon';
import { context, trace } from '@opentelemetry/api';
import { AttributesStore } from '../attributes-store';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { CompositePropagator } from '@opentelemetry/core';

describe('createTracingProvider', () => {
  let mockApp: FirebaseApp;
  let mockAttributesStore: AttributesStore;
  let mockSpan: any;
  beforeEach(() => {
    mockApp = {
      options: {
        projectId: 'test-project',
        appId: 'test-app-id',
        apiKey: 'test-api-key'
      }
    } as unknown as FirebaseApp;
    mockAttributesStore = {} as unknown as AttributesStore;
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
    sinon.restore();
  });

  it('should return a default tracing provider when running in a server/Node environment', () => {
    if (typeof window !== 'undefined') {
      return;
    }
    const mockCrashlyticsOptions = {} as CrashlyticsOptions;
    const { tracingProvider: provider } = createTracingProvider(
      mockApp,
      mockCrashlyticsOptions,
      mockAttributesStore
    );
    expect(provider).to.equal(trace.getTracerProvider());
  });

  it('should register the WebTracerProvider globally with a W3CTraceContextPropagator', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const registerSpy = sinon.spy(WebTracerProvider.prototype, 'register');

    const mockCrashlyticsOptions = {
      tracingUrl: 'http://localhost:4318'
    } as CrashlyticsOptions;

    const { tracingProvider: provider } = createTracingProvider(
      mockApp,
      mockCrashlyticsOptions,
      mockAttributesStore
    );

    expect(registerSpy.calledOnce).to.be.true;
    const registerArgs = registerSpy.firstCall.args[0];
    expect(registerArgs).to.be.ok;

    const propagator = registerArgs!.propagator;
    expect(propagator).to.be.ok;
    expect(propagator instanceof CompositePropagator).to.be.true;

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

    expect(carrier['traceparent']).to.equal(
      '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    );
    expect(provider).to.be.ok;
  });

  it('should register FetchInstrumentation with appropriate config', () => {
    if (typeof window === 'undefined') {
      return;
    }

    mockAttributesStore = {
      getSpanAttributes: sinon.stub().returns({ 'fetch-key': 'fetch-value' })
    } as unknown as AttributesStore;

    const fetchInstrumentationSpy = sinon.spy(
      FetchInstrumentation.prototype,
      'setConfig'
    );

    const mockCrashlyticsOptions = {
      endpointUrl: 'my-custom-endpoint.url',
      tracingUrl: 'my-custom-tracing.url'
    } as CrashlyticsOptions;

    createTracingProvider(mockApp, mockCrashlyticsOptions, mockAttributesStore);

    expect(fetchInstrumentationSpy.called).to.be.true;
    const fetchConfig = fetchInstrumentationSpy.lastCall.args[0] as any;
    expect(fetchConfig.ignoreUrls).to.be.an('array').with.lengthOf(2);

    const fetchPatterns = fetchConfig.ignoreUrls.map((r: RegExp) => r.source);
    expect(fetchPatterns).to.include('my-custom-endpoint\\.url');
    expect(fetchPatterns).to.include('my-custom-tracing\\.url');

    expect(fetchConfig.applyCustomAttributesOnSpan).to.be.a('function');
    fetchConfig.applyCustomAttributesOnSpan(mockSpan);
    expect(mockSpan.attributes).to.deep.equal({ 'fetch-key': 'fetch-value' });
  });

  it('should register XMLHttpRequestInstrumentation with appropriate config', () => {
    if (typeof window === 'undefined') {
      return;
    }

    mockAttributesStore = {
      getSpanAttributes: sinon.stub().returns({ 'xhr-key': 'xhr-value' })
    } as unknown as AttributesStore;

    const xhrInstrumentationSpy = sinon.spy(
      XMLHttpRequestInstrumentation.prototype,
      'setConfig'
    );

    const mockCrashlyticsOptions = {
      endpointUrl: 'my-custom-endpoint.url',
      tracingUrl: 'my-custom-tracing.url'
    } as CrashlyticsOptions;

    createTracingProvider(mockApp, mockCrashlyticsOptions, mockAttributesStore);

    expect(xhrInstrumentationSpy.called).to.be.true;
    const xhrConfig = xhrInstrumentationSpy.lastCall.args[0] as any;
    expect(xhrConfig.ignoreUrls).to.be.an('array').with.lengthOf(2);

    const xhrPatterns = xhrConfig.ignoreUrls.map((r: RegExp) => r.source);
    expect(xhrPatterns).to.include('my-custom-endpoint\\.url');
    expect(xhrPatterns).to.include('my-custom-tracing\\.url');

    expect(xhrConfig.applyCustomAttributesOnSpan).to.be.a('function');
    xhrConfig.applyCustomAttributesOnSpan(mockSpan);
    expect(mockSpan.attributes).to.deep.equal({ 'xhr-key': 'xhr-value' });
  });

  it('should register DocumentLoadInstrumentation with appropriate config', () => {
    if (typeof window === 'undefined') {
      return;
    }

    mockAttributesStore = {
      getSpanAttributes: sinon
        .stub()
        .returns({ 'docload-key': 'docload-value' })
    } as unknown as AttributesStore;

    const documentLoadInstrumentationSpy = sinon.spy(
      DocumentLoadInstrumentation.prototype,
      'setConfig'
    );

    createTracingProvider(mockApp, {}, mockAttributesStore);

    expect(documentLoadInstrumentationSpy.called).to.be.true;
    const documentLoadConfig = documentLoadInstrumentationSpy.lastCall
      .args[0] as any;
    expect(documentLoadConfig.semconvStabilityOptIn).to.equal('http');
    expect(documentLoadConfig.applyCustomAttributesOnSpan).to.be.an('object');

    const { documentLoad, documentFetch, resourceFetch } =
      documentLoadConfig.applyCustomAttributesOnSpan;

    for (const fn of [documentLoad, documentFetch, resourceFetch]) {
      mockSpan.attributes = {};
      expect(fn).to.be.a('function');
      fn(mockSpan);
      expect(mockSpan.attributes).to.deep.equal({
        'docload-key': 'docload-value'
      });
    }
  });

  describe('OTLPTraceExporter', () => {
    let fetchStub: sinon.SinonStub;

    beforeEach(() => {
      fetchStub = sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response('test response', { status: 200 }));
    });

    it('should attach dynamic headers to the export request', async () => {
      const mockHeaderProvider = {
        getHeader: sinon
          .stub()
          .resolves(['X-My-Dynamic-Header', 'dynamic-value'])
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

      expect(fetchStub.calledOnce).to.be.true;
      const fetchOptions = fetchStub.firstCall.args[1] as any;
      const requestHeaders = fetchOptions.headers as any;
      expect(requestHeaders.get('X-My-Dynamic-Header')).to.equal(
        'dynamic-value'
      );
    });

    it('should inject the installation id attribute into exported spans', async () => {
      const mockAttributesStore = {
        getInstallationIdAttribute: sinon.stub().resolves({
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

      expect(fetchStub.calledOnce).to.be.true;
      const fetchOptions = fetchStub.firstCall.args[1] as any;
      const requestBodyUint8 = fetchOptions.body;

      // Decode and parse request body
      const decodedString = new TextDecoder().decode(requestBodyUint8);
      const json = JSON.parse(decodedString);

      const spans = json.resourceSpans[0].scopeSpans[0].spans;
      const spanAttributes = spans[0].attributes || [];

      const dynamicAttr = spanAttributes.find(
        (a: any) => a.key === 'installation_id_key'
      );
      expect(dynamicAttr).to.be.ok;
      expect(dynamicAttr.value.stringValue).to.equal('installation_id_value');
    });
  });
});
