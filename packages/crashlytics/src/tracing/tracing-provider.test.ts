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
import { OTLPTraceExporter } from './tracing-provider';
import { OTLPExporterBase } from '@opentelemetry/otlp-exporter-base';

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
