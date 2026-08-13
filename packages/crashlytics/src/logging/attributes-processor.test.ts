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
import { LogRecord } from '@opentelemetry/api-logs';
import { trace, context, SpanContext, TraceFlags } from '@opentelemetry/api';
import { FirebaseAttributesProcessor } from './attributes-processor';
import { AttributesStore, LOG_ATTR_KEY } from '../attributes-store';

describe('FirebaseAttributesProcessor', () => {
  let attributesStore: AttributesStore;

  beforeEach(() => {
    attributesStore = new AttributesStore(
      { projectId: 'test-project', appId: 'test-app' },
      { customAttributes: { appLevel: 'value1' } }
    );
  });

  it('should enrich log record with dynamic attributes from attributesStore', () => {
    const processor = new FirebaseAttributesProcessor(
      attributesStore,
      'test-project'
    );
    const logRecord: LogRecord = {
      attributes: { customKey: 'customValue' }
    };

    processor.onEmit(logRecord);

    expect(logRecord.attributes?.customKey).to.equal('customValue');
    expect(logRecord.attributes?.appLevel).to.equal('value1');
  });

  it('should not overwrite existing attributes on log record', () => {
    const processor = new FirebaseAttributesProcessor(
      attributesStore,
      'test-project'
    );
    const logRecord: LogRecord = {
      attributes: { appLevel: 'overridden' }
    };

    processor.onEmit(logRecord);

    expect(logRecord.attributes?.appLevel).to.equal('overridden');
  });

  it('should correlate trace and span IDs from logRecord.spanContext', () => {
    const processor = new FirebaseAttributesProcessor(
      attributesStore,
      'test-project'
    );
    const logRecord = {
      attributes: {},
      spanContext: {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7'
      }
    } as unknown as LogRecord;

    processor.onEmit(logRecord);

    expect(logRecord.attributes?.[LOG_ATTR_KEY.TRACE]).to.equal(
      'projects/test-project/traces/4bf92f3577b34da6a3ce929d0e0e4736'
    );
    expect(logRecord.attributes?.[LOG_ATTR_KEY.SPAN_ID]).to.equal(
      '00f067aa0ba902b7'
    );
  });

  it('should correlate trace and span IDs from explicit context when spanContext is missing on record', () => {
    const processor = new FirebaseAttributesProcessor(
      attributesStore,
      'test-project'
    );
    const logRecord: LogRecord = {
      attributes: {}
    };

    const spanContext: SpanContext = {
      traceId: '1234567890abcdef1234567890abcdef',
      spanId: 'abcdef1234567890',
      traceFlags: TraceFlags.SAMPLED
    };
    const ctx = trace.setSpanContext(context.active(), spanContext);

    processor.onEmit(logRecord, ctx);

    expect(logRecord.attributes?.[LOG_ATTR_KEY.TRACE]).to.equal(
      'projects/test-project/traces/1234567890abcdef1234567890abcdef'
    );
    expect(logRecord.attributes?.[LOG_ATTR_KEY.SPAN_ID]).to.equal(
      'abcdef1234567890'
    );
  });

  it('should gracefully handle flush and shutdown calls', async () => {
    const processor = new FirebaseAttributesProcessor(
      attributesStore,
      'test-project'
    );
    await processor.forceFlush();
    await processor.shutdown();
  });
});
