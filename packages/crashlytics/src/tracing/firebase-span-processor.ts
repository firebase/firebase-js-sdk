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

import { Context } from '@opentelemetry/api';
import {
  SpanProcessor,
  ReadableSpan,
  Span
} from '@opentelemetry/sdk-trace-base';
import { AttributesStore } from '../attributes-store';
import { RootSpanContextManager } from './root-span-context-manager';

/**
 * The instrumentation scopes that are considered network activity.
 */
const NETWORK_INSTRUMENTATION_SCOPES = [
  '@opentelemetry/instrumentation-fetch',
  '@opentelemetry/instrumentation-xml-http-request'
];

/**
 * The instrumentation scope for document load activity.
 */
const DOCUMENT_LOAD_INSTRUMENTATION_SCOPE =
  '@opentelemetry/instrumentation-document-load';

/**
 * A SpanProcessor that adds Firebase-specific attributes to spans.
 */
export class FirebaseSpanProcessor implements SpanProcessor {
  constructor(
    private rootSpanContextManager: RootSpanContextManager,
    private attributesStore: AttributesStore
  ) {}

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(span: Span, _parentContext: Context): void {
    const rootSpan = this.rootSpanContextManager.getRootSpanByTraceId(
      span.spanContext().traceId
    );
    if (
      rootSpan &&
      (this.isNetworkSpan(span) || this.isDocumentLoadSpan(span))
    ) {
      rootSpan.onResourceFetchSpanStart(span);
    }
    span.setAttributes(this.attributesStore.getSpanAttributes());
  }

  onEnd(span: ReadableSpan): void {
    const rootSpan = this.rootSpanContextManager.getRootSpanByTraceId(
      span.spanContext().traceId
    );
    if (
      rootSpan &&
      (this.isNetworkSpan(span) || this.isDocumentLoadSpan(span))
    ) {
      rootSpan.onResourceFetchSpanEnd(span);
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  private isNetworkSpan(span: Span | ReadableSpan): boolean {
    return (
      !!span.instrumentationScope?.name &&
      NETWORK_INSTRUMENTATION_SCOPES.includes(span.instrumentationScope.name)
    );
  }

  private isDocumentLoadSpan(span: Span | ReadableSpan): boolean {
    return (
      span.name === 'documentLoad' &&
      span.instrumentationScope?.name === DOCUMENT_LOAD_INSTRUMENTATION_SCOPE
    );
  }
}
