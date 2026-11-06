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

import { Context } from '@opentelemetry/api';
import {
  SpanProcessor,
  ReadableSpan,
  Span
} from '@opentelemetry/sdk-trace-base';
import { ATTR_USER_AGENT_ORIGINAL } from '@opentelemetry/semantic-conventions';
import { AttributesStore } from '../attributes-store';

/**
 * An OpenTelemetry SpanProcessor that enriches spans with dynamic Firebase attributes
 * on start and removes unwanted attributes (such as user_agent.original) on end.
 *
 * @internal
 */
export class FirebaseAttributesSpanProcessor implements SpanProcessor {
  constructor(private attributesStore: AttributesStore) {}

  onStart(span: Span, _parentContext?: Context): void {
    const dynamicAttributes = this.attributesStore.getSpanAttributes();
    for (const [key, value] of Object.entries(dynamicAttributes)) {
      if (value !== undefined && span.attributes?.[key] === undefined) {
        span.setAttribute(key, value);
      }
    }
  }

  onEnd(span: ReadableSpan): void {
    if (span.attributes) {
      delete (span.attributes as Record<string, unknown>)[
        ATTR_USER_AGENT_ORIGINAL
      ];
    }
  }

  async forceFlush(): Promise<void> {}
  async shutdown(): Promise<void> {}
}
