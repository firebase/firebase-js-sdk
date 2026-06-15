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

import {
  createTracingProvider,
  patchNetworkRequests,
  OTLPTraceExporter
} from './tracing-provider';
import { expect } from 'chai';
import { FirebaseApp } from '@firebase/app';
import { RootSpanContextManager } from './root-span-context-manager';
import { CrashlyticsOptions } from '../public-types';
import * as fetchTransportModule from '../fetch-transport';
import { OTLPTraceExporter as OTLPStandardTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import * as sinon from 'sinon';
import { context, trace } from '@opentelemetry/api';
import { AttributesStore } from '../attributes-store';
import { resourceFromAttributes } from '@opentelemetry/resources';

describe('createTracingProvider', () => {
  let mockApp: FirebaseApp;
  let mockRootSpanContextManager: RootSpanContextManager;
  let mockAttributesStore: AttributesStore;
  beforeEach(() => {
    mockApp = {
      options: {
        projectId: 'test-project',
        appId: 'test-app-id',
        apiKey: 'test-api-key'
      }
    } as unknown as FirebaseApp;
    mockRootSpanContextManager = {
      enable: () => {},
      startRootSpan: () => ({}),
      getActiveRootSpan: () => undefined
    } as unknown as RootSpanContextManager;
    mockAttributesStore = {} as unknown as AttributesStore;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return a default tracing provider when running in a server/Node environment', () => {
    if (typeof window !== 'undefined') {
      return;
    }
    const mockCrashlyticsOptions = {} as CrashlyticsOptions;
    const provider = createTracingProvider(
      mockApp,
      mockRootSpanContextManager,
      mockCrashlyticsOptions,
      mockAttributesStore
    );
    expect(provider).to.equal(trace.getTracerProvider());
  });

  it('should use OTLPStandardTraceExporter when tracingUrl is the default localhost port 4318', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fetchTransportStub = sinon
      .stub(fetchTransportModule, 'FetchTransport')
      .returns({} as any);

    const mockCrashlyticsOptions = { tracingUrl: 'http://localhost:4318' } as CrashlyticsOptions;

    const provider = createTracingProvider(
      mockApp,
      mockRootSpanContextManager,
      mockCrashlyticsOptions,
      mockAttributesStore
    );

    expect(fetchTransportStub.called).to.be.false;
    expect(provider).to.be.ok;

    const activeProcessor = (provider as any)._activeSpanProcessor;
    const processors = activeProcessor._spanProcessors || [];
    const batchProcessor = processors.find(
      (p: any) => p.constructor.name === 'BatchSpanProcessor'
    );
    const exporter = (batchProcessor as any)._exporter;
    expect(exporter instanceof OTLPStandardTraceExporter).to.be.true;
  });

  it('should use custom OTLPTraceExporter with region-specific endpoint when tracingUrl is a custom URL', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fetchTransportStub = sinon
      .stub(fetchTransportModule, 'FetchTransport')
      .returns({} as any);

    const mockCrashlyticsOptions = { tracingUrl: 'https://custom-tracing.url', region: 'us-central1' } as CrashlyticsOptions;

    const provider = createTracingProvider(
      mockApp,
      mockRootSpanContextManager,
      mockCrashlyticsOptions,
      mockAttributesStore
    );

    expect(fetchTransportStub.calledOnce).to.be.true;
    const args = fetchTransportStub.firstCall.args[0];
    expect(args.url).to.equal(
      'https://custom-tracing.url/v1/projects/test-project/apps/test-app-id/locations/us-central1/traces'
    );

    const activeProcessor = (provider as any)._activeSpanProcessor;
    const processors = activeProcessor._spanProcessors || [];
    const batchProcessor = processors.find(
      (p: any) => p.constructor.name === 'BatchSpanProcessor'
    );
    const exporter = (batchProcessor as any)._exporter;
    expect(exporter instanceof OTLPTraceExporter).to.be.true;
  });

  it('should register Fetch and XMLHttpRequest instrumentations with appropriate ignoreUrls', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fetchInstrumentationSpy = sinon.spy(FetchInstrumentation.prototype, 'setConfig');
    const xhrInstrumentationSpy = sinon.spy(XMLHttpRequestInstrumentation.prototype, 'setConfig');

    const mockCrashlyticsOptions = {
      endpointUrl: 'my-custom-endpoint.url',
      tracingUrl: 'my-custom-tracing.url'
    } as CrashlyticsOptions;

    createTracingProvider(
      mockApp,
      mockRootSpanContextManager,
      mockCrashlyticsOptions,
      mockAttributesStore
    );

    expect(fetchInstrumentationSpy.called).to.be.true;
    expect(xhrInstrumentationSpy.called).to.be.true;

    const fetchConfig = fetchInstrumentationSpy.lastCall.args[0] as any;
    const xhrConfig = xhrInstrumentationSpy.lastCall.args[0] as any;

    expect(fetchConfig.ignoreUrls).to.be.an('array').with.lengthOf(2);
    expect(xhrConfig.ignoreUrls).to.be.an('array').with.lengthOf(2);

    // Verify both ignoreUrls patterns correspond to our custom endpoints
    const fetchPatterns = fetchConfig.ignoreUrls.map((r: RegExp) => r.source);
    expect(fetchPatterns).to.include('my-custom-endpoint\\.url');
    expect(fetchPatterns).to.include('my-custom-tracing\\.url');

    const xhrPatterns = xhrConfig.ignoreUrls.map((r: RegExp) => r.source);
    expect(xhrPatterns).to.include('my-custom-endpoint\\.url');
    expect(xhrPatterns).to.include('my-custom-tracing\\.url');
  });

  describe('OTLPTraceExporter', () => {
    let fetchStub: sinon.SinonStub;
    let mockSpan: any;

    beforeEach(() => {
      fetchStub = sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response('test response', { status: 200 }));

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
        instrumentationScope: { name: 'test-scope', version: '1.0.0' }
      } as any;
    });

    it('should attach dynamic headers to the export request', async () => {
      const mockHeaderProvider = {
        getHeader: sinon.stub().resolves(['X-My-Dynamic-Header', 'dynamic-value'])
      };

      const exporter = new OTLPTraceExporter(
        { url: 'http://localhost' },
        [mockHeaderProvider]
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
      const requestHeaders = fetchOptions.headers as any;
      expect(requestHeaders.get('X-My-Dynamic-Header')).to.equal('dynamic-value');
    });

    it('should inject dynamic attributes into exported spans', async () => {
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

      const dynamicAttr = spanAttributes.find((a: any) => a.key === 'installation_id_key');
      expect(dynamicAttr).to.be.ok;
      expect(dynamicAttr.value.stringValue).to.equal('installation_id_value');
    });
  });

  describe('patchNetworkRequests', () => {
    let originalFetch: typeof window.fetch;
    let originalOpen: typeof XMLHttpRequest.prototype.open;
    let startRootSpanStub: sinon.SinonStub;
    let getActiveRootSpanStub: sinon.SinonStub;
    let mockSpan: any;
    let activeSpanDuringFetch: any;
    let activeSpanDuringOpen: any;

    before(() => {
      if (typeof window !== 'undefined') {
        originalFetch = window.fetch;
        originalOpen = XMLHttpRequest.prototype.open;
      }
    });

    after(() => {
      if (typeof window !== 'undefined') {
        window.fetch = originalFetch;
        XMLHttpRequest.prototype.open = originalOpen;
      }
    });

    beforeEach(() => {
      if (typeof window !== 'undefined') {
        activeSpanDuringFetch = null;
        activeSpanDuringOpen = null;

        window.fetch = sinon.stub().callsFake(() => {
          activeSpanDuringFetch = trace.getSpan(context.active());
          return Promise.resolve({} as any);
        });

        XMLHttpRequest.prototype.open = sinon.stub().callsFake(() => {
          activeSpanDuringOpen = trace.getSpan(context.active());
        }) as any;

        mockSpan = {
          spanContext: () => ({
            traceId: '00000000000000000000000000000001',
            spanId: '0000000000000002',
            traceFlags: 1
          })
        };

        startRootSpanStub = sinon
          .stub(mockRootSpanContextManager, 'startRootSpan')
          .returns({ span: mockSpan } as any);
        getActiveRootSpanStub = sinon
          .stub(mockRootSpanContextManager, 'getActiveRootSpan')
          .returns(undefined);
      }
    });

    it('[fetch] should create a background network root span and run the fetch call under its context if no root span is active', () => {
      if (typeof window === 'undefined') {
        return;
      }

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      void window.fetch('/api/data');

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.true;
      expect(activeSpanDuringFetch).to.equal(mockSpan);
    });

    it('[fetch] should not create a background network root span if a root span is active', () => {
      if (typeof window === 'undefined') {
        return;
      }

      getActiveRootSpanStub.returns({} as any);

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      void window.fetch('/api/data');

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.false;
      expect(activeSpanDuringFetch).to.be.undefined;
    });

    it('[fetch] should not create a background network root span if the url is an ignored string', () => {
      if (typeof window === 'undefined') {
        return;
      }

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      void window.fetch('http://my-tracing-url/v1/projects/...');
      void window.fetch('http://my-logging-url/v1/projects/...');

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.false;
      expect(activeSpanDuringFetch).to.be.undefined;
    });

    it('[fetch] should not create a background network root span if the url is an ignored URL object', () => {
      if (typeof window === 'undefined') {
        return;
      }

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      void window.fetch(new URL('http://my-tracing-url/v1/projects/...'));
      void window.fetch(new URL('http://my-logging-url/v1/projects/...'));

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.false;
      expect(activeSpanDuringFetch).to.be.undefined;
    });

    it('[fetch] should not create a background network root span if the url is an ignored Request object', () => {
      if (typeof window === 'undefined') {
        return;
      }

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      void window.fetch(new Request('http://my-tracing-url/v1/projects/...'));
      void window.fetch(new Request('http://my-logging-url/v1/projects/...'));

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.false;
      expect(activeSpanDuringFetch).to.be.undefined;
    });

    it('[XHR] should create a background network root span and run the XHR call under its context if no root span is active', () => {
      if (typeof window === 'undefined') {
        return;
      }

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/data');

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.true;
      expect(activeSpanDuringOpen).to.equal(mockSpan);
    });

    it('[XHR] should not create a background network root span if a root span is active', () => {
      if (typeof window === 'undefined') {
        return;
      }

      getActiveRootSpanStub.returns({} as any);

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/data');

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.false;
      expect(activeSpanDuringOpen).to.be.undefined;
    });

    it('[XHR] should not create a background network root span if the url is an ignored string', () => {
      if (typeof window === 'undefined') {
        return;
      }

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      const xhr1 = new XMLHttpRequest();
      xhr1.open('POST', 'http://my-tracing-url/v1/projects/...');

      const xhr2 = new XMLHttpRequest();
      xhr2.open('POST', 'http://my-logging-url/v1/projects/...');

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.false;
      expect(activeSpanDuringOpen).to.be.undefined;
    });

    it('[XHR] should not create a background network root span if the url is an ignored URL object', () => {
      if (typeof window === 'undefined') {
        return;
      }

      patchNetworkRequests({} as any, mockRootSpanContextManager, [
        new RegExp('http://my-tracing-url'),
        new RegExp('http://my-logging-url')
      ]);

      const xhr1 = new XMLHttpRequest();
      xhr1.open('POST', new URL('http://my-tracing-url/v1/projects/...'));

      const xhr2 = new XMLHttpRequest();
      xhr2.open('POST', new URL('http://my-logging-url/v1/projects/...'));

      expect(
        startRootSpanStub.calledWith(sinon.match.any, 'background-network')
      ).to.be.false;
      expect(activeSpanDuringOpen).to.be.undefined;
    });
  });
});
