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

import { Context, Span, trace } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';

/**
 * A custom ContextManager that ensures the latest active root span is the default parent.
 */
export class RootSpanContextManager extends ZoneContextManager {
  private _rootSpan: Span | undefined;

  setRootSpan(span: Span | undefined): void {
    this._rootSpan = span;
  }

  getRootSpan(): Span | undefined {
    return this._rootSpan;
  }

  override active(): Context {
    const context = super.active();
    // If the root span is set and there isn't already an active span in context
    if (this._rootSpan && !trace.getSpan(context)) {
      return trace.setSpan(context, this._rootSpan);
    }
    return context;
  }
}
