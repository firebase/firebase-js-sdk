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

/**
 * A SpanProcessor that adds Firebase-specific attributes to spans.
 */
export class FirebaseSpanProcessor implements SpanProcessor {
  constructor(private attributesStore: AttributesStore) {}

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(span: Span, _parentContext: Context): void {
    span.setAttributes(this.attributesStore.getSpanAttributes());
  }

  onEnd(_span: ReadableSpan): void {
    // no-op
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
