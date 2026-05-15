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

import { Context, Span, type Tracer, trace } from '@opentelemetry/api';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ZoneContextManager } from '@opentelemetry/context-zone';

/**
 * The length of time to wait for activity to cease before closing the root span.
 */
const QUIESCENCE_WINDOW_MS = 150;

/**
 * Wrapper around the OpenTelemetry Span that tracks activity and quiescence for a client-side
 * root span.
 */
export class RootSpan {
  span: Span;
  private activeNetworkRequests: number;
  private lastActiveTimeMs: number;
  private quiescenceTimerId: number | null;
  private mutationObserver: MutationObserver | null;
  private manager: RootSpanContextManager;

  constructor(span: Span, manager: RootSpanContextManager) {
    this.span = span;
    this.manager = manager;
    this.lastActiveTimeMs = Date.now();
    this.quiescenceTimerId = null;
    this.activeNetworkRequests = 0;
    this.mutationObserver = new MutationObserver(() => {
      this.lastActiveTimeMs = Date.now();
    });
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * Indicates that a network request has started for this root span.
   */
  recordNetworkActivityStart(networkSpan: Span): void {
    const rootSpanTraceId = this.span.spanContext().traceId;
    const networkSpanTraceId = networkSpan.spanContext().traceId;

    if (rootSpanTraceId === networkSpanTraceId) {
      this.lastActiveTimeMs = Date.now();
      this.activeNetworkRequests++;
    }
  }

  /**
   * Indicates that a network request has ended for this root span.
   */
  recordNetworkActivityEnd(networkSpan: ReadableSpan): void {
    const rootSpanTraceId = this.span.spanContext().traceId;
    const networkSpanTraceId = networkSpan.spanContext().traceId;

    if (rootSpanTraceId === networkSpanTraceId) {
      this.lastActiveTimeMs = Date.now();
      this.activeNetworkRequests = Math.max(0, this.activeNetworkRequests - 1);
    }
  }

  /**
   * Triggers the closing of the root span after a quiescence window.
   */
  quiesce(): void {
    if (this.quiescenceTimerId) {
      window.clearTimeout(this.quiescenceTimerId);
    }

    this.quiescenceTimerId = window.setTimeout(() => {
      this.endRootSpanIfStable();
    }, QUIESCENCE_WINDOW_MS);
  }

  private endRootSpanIfStable(): void {
    if (this.activeNetworkRequests > 0) {
      this.quiesce(); // Keep waiting, there are active network requests
      return;
    }

    if (this.mutationObserver) {
      const timeSinceLastActivity = Date.now() - this.lastActiveTimeMs;
      if (timeSinceLastActivity < QUIESCENCE_WINDOW_MS) {
        this.quiesce(); // Keep waiting, the DOM is not yet stable
        return;
      }
    }
    this.endRootSpan();
  }

  private endRootSpan(): void {
    // End the span backdated to the exact millisecond work actually stopped
    this.span.end(this.lastActiveTimeMs);
    if (this.manager.getActiveRootSpan() === this) {
      this.manager.clearActiveRootSpan();
    }

    // Clean up the DOM observer to prevent memory leaks
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.quiescenceTimerId) {
      clearTimeout(this.quiescenceTimerId);
    }
  }
}

/**
 * A custom ContextManager that ensures the latest active root span is the default parent.
 */
export class RootSpanContextManager extends ZoneContextManager {
  private _activeRootSpan: RootSpan | undefined;

  startRootSpan(tracer: Tracer, rootSpanName: string): RootSpan {
    if (this._activeRootSpan) {
      this.clearActiveRootSpan();
    }
    const span = tracer.startSpan(rootSpanName);
    this._activeRootSpan = new RootSpan(span, this);
    this._activeRootSpan.quiesce();
    return this._activeRootSpan;
  }

  getActiveRootSpan(): RootSpan | undefined {
    return this._activeRootSpan;
  }

  clearActiveRootSpan(): void {
    this._activeRootSpan = undefined;
  }

  override active(): Context {
    const context = super.active();
    // If the root span is set and there isn't already an active span in context
    if (this._activeRootSpan && !trace.getSpan(context)) {
      return trace.setSpan(context, this._activeRootSpan.span);
    }
    return context;
  }
}
