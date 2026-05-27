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
import sinon from 'sinon';
import { trace } from '@opentelemetry/api';
import { createTracingProvider, OTLPTraceExporter } from './tracing-provider';
import { FirebaseApp } from '@firebase/app';
import { RootSpanContextManager } from './root-span-context-manager';
import { OTLPExporterBase } from '@opentelemetry/otlp-exporter-base';
import { CrashlyticsOptions } from '../public-types';
import * as fetchTransportModule from '../fetch-transport';

describe('createTracingProvider', () => {
  let mockApp: FirebaseApp;
  let mockRootSpanContextManager: RootSpanContextManager;
  let mockCrashlyticsOptions: CrashlyticsOptions;

  beforeEach(() => {
    mockApp = {
      options: {
        projectId: 'test-project',
        appId: 'test-app-id',
        apiKey: 'test-api-key'
      }
    } as unknown as FirebaseApp;

    mockRootSpanContextManager = {
      enable: () => { }
    } as RootSpanContextManager;

    mockCrashlyticsOptions = {} as CrashlyticsOptions;
  });

  it('should return a default tracer provider when running in a server/Node environment', () => {
    const provider = createTracingProvider(
      mockApp,
      mockRootSpanContextManager,
      mockCrashlyticsOptions
    );
    expect(provider).to.equal(trace.getTracerProvider());
  });

  describe('when running in a browser environment', () => {
    beforeEach(() => {
      // @ts-ignore
      global.window = { location: { hostname: 'localhost' } } as any;
      // @ts-ignore
      global.XMLHttpRequest = class {
        open() { }
        send() { }
      } as any;
      // @ts-ignore
      global.fetch = async () => ({}) as any;
    });

    afterEach(() => {
      // @ts-ignore
      delete global.window;
      // @ts-ignore
      delete global.XMLHttpRequest;
      // @ts-ignore
      delete global.fetch;
      sinon.restore();
    });

    it('should use standard OTLP trace exporter when tracingUrl is the default localhost port 4318', () => {
      const fetchTransportStub = sinon.stub(fetchTransportModule, 'FetchTransport').returns({} as any);

      mockCrashlyticsOptions.tracingUrl = 'http://localhost:4318';

      const provider = createTracingProvider(
        mockApp,
        mockRootSpanContextManager,
        mockCrashlyticsOptions
      );

      expect(fetchTransportStub.called).to.be.false;
      expect(provider).to.be.ok;
    });

    it('should use custom OTLPTraceExporter with region-specific endpoint when tracingUrl is a custom URL', () => {
      const fetchTransportStub = sinon.stub(fetchTransportModule, 'FetchTransport').returns({} as any);

      mockCrashlyticsOptions.tracingUrl = 'https://custom-tracing.url';
      mockCrashlyticsOptions.region = 'us-central1';

      createTracingProvider(
        mockApp,
        mockRootSpanContextManager,
        mockCrashlyticsOptions
      );

      expect(fetchTransportStub.calledOnce).to.be.true;
      const args = fetchTransportStub.firstCall.args[0];
      expect(args.url).to.equal('https://custom-tracing.url/v1/projects/test-project/apps/test-app-id/locations/us-central1/traces');
    });

    it('should register Fetch and XMLHttpRequest instrumentations', () => {
      // Note: AI claims there isn't a clear way to verify ignoreUrls so excluded it for the test
      const originalFetch = global.fetch;
      const originalOpen = global.XMLHttpRequest.prototype.open;

      createTracingProvider(
        mockApp,
        mockRootSpanContextManager,
        mockCrashlyticsOptions
      );

      expect(global.fetch).to.not.equal(originalFetch);
      expect(global.XMLHttpRequest.prototype.open).to.not.equal(originalOpen);
    });
  });
});

describe('OTLPTraceExporter', () => {
  let exporter: OTLPTraceExporter;
  let mockAttrProvider: any;
  let superStub: sinon.SinonStub;

  beforeEach(() => {
    mockAttrProvider = {
      getAttribute: sinon.stub().resolves(['dynamic_key', 'dynamic_value'])
    };
    exporter = new OTLPTraceExporter({ url: 'http://localhost' }, [], [mockAttrProvider]);

    superStub = sinon.stub(OTLPExporterBase.prototype, 'export').callsFake((_spans, callback: any) => {
      callback({ code: 0 });
    });
  });

  afterEach(() => {
    superStub.restore();
    sinon.restore();
  });

  it('should create an OtlpNetworkExportDelegate with dynamicHeaderProviders', () => {
    const fetchTransportStub = sinon.stub(fetchTransportModule, 'FetchTransport').returns({} as any);
    const mockHeaderProvider = { getHeader: sinon.stub() };
    
    new OTLPTraceExporter({ url: 'http://localhost' }, [mockHeaderProvider], []);

    expect(fetchTransportStub.calledOnce).to.be.true;
    const args = fetchTransportStub.firstCall.args[0];
    expect(args.dynamicHeaderProviders).to.deep.equal([mockHeaderProvider]);
  });

  it('should inject resolved dynamic attributes into exported spans', async () => {
    const mockSpan = { attributes: {} } as any;
    const callback = sinon.stub();

    await exporter.export([mockSpan], callback);

    expect(mockSpan.attributes['dynamic_key']).to.equal('dynamic_value');
  });
});
