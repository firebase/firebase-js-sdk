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
import { getSessionId } from '../helpers';
import { CRASHLYTICS_ATTRIBUTE_KEYS } from '../constants';

/**
 * A SpanProcessor that adds Firebase-specific attributes to spans and delays span completion
 * until the UI has finished rendering.
 */
export class FirebaseSpanProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(span: Span, _parentContext: Context): void {
    const sessionId = getSessionId();
    if (sessionId) {
      span.setAttribute(CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID, sessionId);
    }

    // Intercept span.end to delay it until the UI has finished rendering and painting
    if (typeof window !== 'undefined') {
      const originalEnd = span.end;
      span.end = function (endTime?: number | Date | undefined): void {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            originalEnd.call(this, endTime);
          });
        });
      };
    }
  }

  onEnd(_span: ReadableSpan): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
