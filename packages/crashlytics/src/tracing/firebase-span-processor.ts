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

import { Context, Span } from '@opentelemetry/api';
import { SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { getAppVersion, getSessionId } from '../helpers';
import { COMMON_SPAN_ATTRIBUTE_KEYS, HTTP_SPAN_ATTRIBUTE_KEYS } from '../constants';
import { CrashlyticsOptions } from '../public-types';
import { FirebaseOptions } from '@firebase/app';

/**
 * A SpanProcessor that adds Firebase-specific attributes to spans.
 */
export class FirebaseSpanProcessor implements SpanProcessor {
  constructor(
    private crashlyticsOptions: CrashlyticsOptions = {},
    private firebaseOptions: FirebaseOptions = {}
  ) {}

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(span: Span, _parentContext: Context): void {
    span.setAttribute(
      COMMON_SPAN_ATTRIBUTE_KEYS.GCP_RESOURCE_NAME,
      `//firebasetelemetry.googleapis.com/projects/${this.firebaseOptions.projectId}/locations/global/`
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
    span.setAttribute(
      HTTP_SPAN_ATTRIBUTE_KEYS.URL_TEMPLATE,
      `/v1/projects/${this.firebaseOptions.projectId}`
    );
  }

  onEnd(_span: ReadableSpan): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
