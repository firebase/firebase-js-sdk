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
import { ZoneContextManager } from '@opentelemetry/context-zone';

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
  private isInterrupted = false;

  constructor(span: Span, manager: RootSpanContextManager) {
    this.span = span;
    this.manager = manager;
    this.lastActiveTimeMs = Date.now();
    this.quiescenceTimerId = null;
    this.activeNetworkRequests = 0;
    this.mutationObserver = new MutationObserver(() => {
      this.recordDomActivity();
    });
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  recordNetworkActivityStart() {
    if (this.isInterrupted) {
      return;
    }
    this.lastActiveTimeMs = Date.now();
    this.activeNetworkRequests++;
  }

  recordNetworkActivityEnd() {
    this.lastActiveTimeMs = Date.now();
    this.activeNetworkRequests = Math.max(0, this.activeNetworkRequests - 1);

    // If this is an interrupted span and all its network calls have finished, end it immediately.
    if (this.activeNetworkRequests === 0 && this.isInterrupted) {
      this.endRootSpan();
    }
  }

  recordDomActivity() {
    if (!this.isInterrupted) {
      this.lastActiveTimeMs = Date.now();
    }
  }

  interrupt() {
    this.isInterrupted = true;
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    this.lastActiveTimeMs = Math.max(this.lastActiveTimeMs, Date.now());
    if (this.activeNetworkRequests === 0) {
      this.endRootSpan();
    }
  }

  /**
   * Triggers the closing of the root span after a quiescence window.
   */
  quiesce() {
    if (this.quiescenceTimerId) {
      window.clearTimeout(this.quiescenceTimerId);
    }

    this.quiescenceTimerId = window.setTimeout(() => {
      this.endRootSpanIfStable();
    }, QUIESCENCE_WINDOW_MS);
  }

  private endRootSpanIfStable() {
    if (this.activeNetworkRequests > 0) {
      this.quiesce(); // Keep waiting, there are active network requests
      return;
    }

    if (!this.isInterrupted) {
      const timeSinceLastActivity = Date.now() - this.lastActiveTimeMs;
      if (timeSinceLastActivity < QUIESCENCE_WINDOW_MS) {
        this.quiesce(); // Keep waiting, the DOM is not yet stable
        return;
      }
    }

    this.endRootSpan();
  }

  private endRootSpan() {
    this.manager.removeRootSpanFromContext(this);
    // End the span backdated to the exact millisecond work actually stopped
    this.span.end(this.lastActiveTimeMs);

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
  private _interruptedRootSpans: RootSpan[] = [];

  startRootSpan(tracer: Tracer, rootSpanName: string): RootSpan {
    if (this._activeRootSpan) {
      this._interruptedRootSpans.push(this._activeRootSpan);
      this._activeRootSpan.interrupt();
      this.clearActiveRootSpan();
    }
    // Ensure the new root span is actually a root span (no parent), even if started from 
    // within an existing root span's context.
    const span = tracer.startSpan(rootSpanName, {}, trace.deleteSpan(this.active()));

    this._activeRootSpan = new RootSpan(span, this);
    this._activeRootSpan.quiesce();
    return this._activeRootSpan;
  }

  getActiveRootSpan(): RootSpan | undefined {
    return this._activeRootSpan;
  }

  getInterruptedRootSpan(traceId: string): RootSpan | undefined {
    return this._interruptedRootSpans.find(rs => (rs.span as any).spanContext().traceId == traceId);
  }

  getRootSpanByTraceId(traceId: string): RootSpan | undefined {
    if (this._activeRootSpan && (this._activeRootSpan.span as any).spanContext().traceId == traceId) {
      return this._activeRootSpan;
    } else {
      return this.getInterruptedRootSpan(traceId);
    }
  }

  clearActiveRootSpan(): void {
    this._activeRootSpan = undefined;
  }

  removeRootSpanFromContext(rootSpan: RootSpan): void {
    if (this._activeRootSpan == rootSpan) {
      this.clearActiveRootSpan();
    } else if (this._interruptedRootSpans.includes(rootSpan)) {
      this._interruptedRootSpans = this._interruptedRootSpans.filter(rs => rs != rootSpan);
    }
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
