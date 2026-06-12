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
  patchNetworkRequests
} from './tracing-provider';
import { expect } from 'chai';
import { FirebaseApp } from '@firebase/app';
import { RootSpanContextManager } from './root-span-context-manager';
import { CrashlyticsOptions } from '../public-types';
import * as sinon from 'sinon';
import { context, trace } from '@opentelemetry/api';
import { AttributesStore } from '../attributes-store';

describe('createTracingProvider', () => {
  let mockApp: FirebaseApp;
  let mockRootSpanContextManager: RootSpanContextManager;
  let mockCrashlyticsOptions: CrashlyticsOptions;
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
    mockCrashlyticsOptions = {} as CrashlyticsOptions;
    mockAttributesStore = {} as unknown as AttributesStore;
  });

  it('should return a tracer provider instance', () => {
    const provider = createTracingProvider(
      mockApp,
      mockRootSpanContextManager,
      mockCrashlyticsOptions,
      mockAttributesStore
    );
    expect(provider).to.be.ok;
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

    afterEach(() => {
      sinon.restore();
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
