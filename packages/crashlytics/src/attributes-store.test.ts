/**
 * @license
 * Copyright 2026 Google LLC
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
import { trace } from '@opentelemetry/api';
import sinon from 'sinon';
import { AttributesStore, ATTR } from './attributes-store';
import { _FirebaseInstallationsInternal } from '@firebase/installations';

describe('AttributesStore', () => {
  it('should initialize with app version', () => {
    const store = new AttributesStore({ appVersion: '2.3.4' });
    expect(store.getLogAttributes()).to.include({
      [ATTR.COMMON.APP_VERSION]: '2.3.4'
    });
  });

  it('should set and retrieve common attributes', () => {
    const store = new AttributesStore({});
    store.setCommonAttribute(ATTR.COMMON.SESSION_ID, 'sess-123');
    expect(store.getLogAttributes()).to.include({
      [ATTR.COMMON.SESSION_ID]: 'sess-123'
    });
    expect(store.getSpanAttributes()).to.include({
      [ATTR.COMMON.SESSION_ID]: 'sess-123'
    });
  });

  it('should set and retrieve span attributes', () => {
    const store = new AttributesStore({});
    store.setSpanAttribute(ATTR.SPAN.GCP_RESOURCE_NAME, 'my-resource');
    expect(store.getSpanAttributes()).to.include({
      [ATTR.SPAN.GCP_RESOURCE_NAME]: 'my-resource'
    });
    expect(store.getLogAttributes()).to.not.have.property(ATTR.SPAN.GCP_RESOURCE_NAME);
  });

  it('should dynamically include active trace context in log attributes', () => {
    const store = new AttributesStore({});
    
    const mockSpanContext = { traceId: 't-123', spanId: 's-123' };
    const mockSpan = { spanContext: () => mockSpanContext };
    const getActiveSpanStub = sinon.stub(trace, 'getActiveSpan').returns(mockSpan as any);

    try {
      const attrs = store.getLogAttributes();
      expect(attrs).to.include({
        'logging.googleapis.com/trace': 't-123',
        'logging.googleapis.com/spanId': 's-123'
      });
    } finally {
      getActiveSpanStub.restore();
    }
  });

  it('should asynchronously fetch and return installation ID', async () => {
    const mockInstallations = {
      getId: async () => 'iid-123'
    } as unknown as _FirebaseInstallationsInternal;

    const mockProvider = {
      get: async () => mockInstallations
    } as any;

    const store = new AttributesStore({}, mockProvider);
    const iidAttr = await store.getInstallationIdAttribute();
    expect(iidAttr).to.deep.equal({
      ['app.installation.id']: 'iid-123'
    });
  });
});
