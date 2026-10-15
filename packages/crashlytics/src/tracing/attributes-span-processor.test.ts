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
import { ReadableSpan, Span } from '@opentelemetry/sdk-trace-base';
import { ATTR_USER_AGENT_ORIGINAL } from '@opentelemetry/semantic-conventions';
import { FirebaseAttributesSpanProcessor } from './attributes-span-processor';
import { AttributesStore, SPAN_ATTR_KEY } from '../attributes-store';
import { ROOT_CONTEXT } from '@opentelemetry/api';

describe('FirebaseAttributesSpanProcessor', () => {
  let attributesStore: AttributesStore;

  beforeEach(() => {
    attributesStore = new AttributesStore(
      { projectId: 'test-project', appId: 'test-app' },
      { appVersion: '1.2.3', region: 'us-central1' }
    );
  });

  it('should only delete user_agent.original from span attributes', () => {
    const processor = new FirebaseAttributesSpanProcessor();
    const mockSpan = {
      attributes: {
        [ATTR_USER_AGENT_ORIGINAL]:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'other.attr': 'keep-me'
      }
    } as unknown as ReadableSpan;

    processor.onEnd(mockSpan);

    expect(mockSpan.attributes[ATTR_USER_AGENT_ORIGINAL]).to.be.undefined;
    expect(mockSpan.attributes['other.attr']).to.equal('keep-me');
  });

  it('should enrich span with dynamic attributes from attributesStore onStart', () => {
    attributesStore.setSessionId('test-session-123');
    attributesStore.setRoutePathProvider(() => '/dashboard');

    const processor = new FirebaseAttributesSpanProcessor(attributesStore);
    const setAttributesRecord: Record<string, unknown> = {};

    const mockSpan = {
      attributes: {},
      setAttribute: (key: string, value: unknown) => {
        setAttributesRecord[key] = value;
      }
    } as unknown as Span;

    processor.onStart(mockSpan, ROOT_CONTEXT);

    expect(setAttributesRecord[SPAN_ATTR_KEY.GCP_RESOURCE_NAME]).to.equal(
      '//firebasetelemetry.googleapis.com/projects/test-project/locations/us-central1/'
    );
    expect(setAttributesRecord[SPAN_ATTR_KEY.SERVICE_VERSION]).to.equal(
      '1.2.3'
    );
    expect(setAttributesRecord[SPAN_ATTR_KEY.SESSION_ID]).to.equal(
      'test-session-123'
    );
    expect(setAttributesRecord[SPAN_ATTR_KEY.APP_SCREEN_ID]).to.equal(
      '/dashboard'
    );
  });

  it('should not throw if span.attributes is undefined onStart or onEnd', () => {
    const processor = new FirebaseAttributesSpanProcessor(attributesStore);
    const mockSpan = {
      setAttribute: () => {}
    } as unknown as Span;

    expect(() => processor.onStart(mockSpan, ROOT_CONTEXT)).to.not.throw();
    expect(() =>
      processor.onEnd(mockSpan as unknown as ReadableSpan)
    ).to.not.throw();
  });

  it('should gracefully handle forceFlush and shutdown calls', async () => {
    const processor = new FirebaseAttributesSpanProcessor(attributesStore);
    await processor.forceFlush();
    await processor.shutdown();
  });
});
