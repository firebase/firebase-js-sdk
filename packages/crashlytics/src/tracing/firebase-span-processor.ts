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
import { getAppVersion, getSessionId } from '../helpers';
import {
  COMMON_SPAN_ATTRIBUTE_KEYS,
  CRASHLYTICS_ATTRIBUTE_KEYS,
  DEFAULT_TELEMETRY_REGION
} from '../constants';
import { CrashlyticsOptions } from '../public-types';
import { FirebaseOptions } from '@firebase/app';
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
    private crashlyticsOptions: CrashlyticsOptions = {},
    private firebaseOptions: FirebaseOptions = {}
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
      rootSpan.onBackgroundSpanStart(span);
    }
    const activeAppScreenId =
      this.rootSpanContextManager.getActiveAppScreenId();
    if (activeAppScreenId) {
      span.setAttribute(
        CRASHLYTICS_ATTRIBUTE_KEYS.APP_SCREEN_ID,
        activeAppScreenId
      );
    }
    const region = this.crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;
    span.setAttribute(
      COMMON_SPAN_ATTRIBUTE_KEYS.GCP_RESOURCE_NAME,
      `//firebasetelemetry.googleapis.com/projects/${this.firebaseOptions.projectId}/locations/${region}/`
    );
    const sessionId = getSessionId();
    if (sessionId) {
      span.setAttribute(
        COMMON_SPAN_ATTRIBUTE_KEYS.GCP_FIREBASE_SESSION_ID,
        sessionId
      );
    }
    span.setAttribute(
      COMMON_SPAN_ATTRIBUTE_KEYS.GCP_FIREBASE_APP_VERSION,
      getAppVersion(this.crashlyticsOptions)
    );
  }

  onEnd(span: ReadableSpan): void {
    const rootSpan = this.rootSpanContextManager.getRootSpanByTraceId(
      span.spanContext().traceId
    );
    if (
      rootSpan &&
      (this.isNetworkSpan(span) || this.isDocumentLoadSpan(span))
    ) {
      rootSpan.onBackgroundSpanEnd(span);
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
