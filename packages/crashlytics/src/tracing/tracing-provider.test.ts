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
import { RESOURCE_ATTRIBUTE_KEYS } from '../constants';
import { OTLPExporterBase } from '@opentelemetry/otlp-exporter-base';

describe('createTracingProvider', () => {
  let mockApp: FirebaseApp;
  let mockContextManager: RootSpanContextManager;

  beforeEach(() => {
    mockApp = {
      options: {
        projectId: 'my-project',
        appId: 'my-app-id',
        apiKey: 'my-api-key'
      }
    } as unknown as FirebaseApp;

    mockContextManager = {
      startRootSpan: sinon.stub(),
      getActiveRootSpan: sinon.stub(),
      clearActiveRootSpan: sinon.stub(),
      getActiveAppScreenId: sinon.stub(),
      setActiveAppScreenId: sinon.stub(),
      active: sinon.stub(),
      enable: sinon.stub().returnsThis(),
      disable: sinon.stub().returnsThis()
    } as unknown as RootSpanContextManager;

  });

  afterEach(() => {
    // @ts-ignore
    delete global.window;
    // @ts-ignore
    delete global.XMLHttpRequest;
    sinon.restore();
  });

  it('should return a default tracer provider when running in a server/Node environment', () => {
    const provider = createTracingProvider(mockApp, mockContextManager, {});
    expect(provider).to.equal(trace.getTracerProvider());
  });

  it('should construct resource with cloud resource ID containing project and region', () => {
    // @ts-ignore
    global.window = { location: { hostname: 'localhost' } } as any;
    // @ts-ignore
    global.XMLHttpRequest = class { };

    const provider = createTracingProvider(mockApp, mockContextManager, { region: 'us-central1' });

    // Peek into the internal _resource property
    const resource = (provider as any)._resource;

    expect(resource).to.exist;
    expect(resource.attributes[RESOURCE_ATTRIBUTE_KEYS.CLOUD_RESOURCE_ID]).to.equal(
      '//firebasetelemetry.googleapis.com/projects/my-project/locations/us-central1/'
    );
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
  });

  it('should fetch dynamic attributes from providers before exporting', async () => {
    const mockSpan = { attributes: {} };
    const callback = sinon.stub();

    await exporter.export([mockSpan as any], callback);

    expect(mockAttrProvider.getAttribute.calledOnce).to.be.true;
  });

  it('should inject resolved dynamic attributes into exported spans', async () => {
    const mockSpan = { attributes: {} } as any;
    const callback = sinon.stub();

    await exporter.export([mockSpan], callback);

    expect(mockSpan.attributes['dynamic_key']).to.equal('dynamic_value');
  });
});
