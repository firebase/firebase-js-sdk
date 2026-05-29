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

import { Context, Span, type Tracer, trace, context } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';

/**
 * The length of time to wait for activity to cease before closing the root span.
 */
const QUIESCENCE_WINDOW_MS = 150;
const UI_RENDER_QUIESCENCE_WINDOW_MS = 100;
/**
 * Wrapper around the OpenTelemetry Span that tracks activity and quiescence for a client-side
 * root span.
 */
export class RootSpan {
  span: Span;
  private activeNetworkRequests: number;
  private lastNetworkActivityMs: number;
  private firstUiActivityMs: number | undefined;
  private lastUiActivityMs: number;
  private interruptedAtMs: number | undefined;
  private quiescenceTimerId: ReturnType<typeof setTimeout> | null;
  private quiescenceRenderTimerId: ReturnType<typeof setTimeout> | null;
  private mutationObserver: MutationObserver | null;
  private manager: RootSpanContextManager;
  private tracer: Tracer;

  constructor(span: Span, manager: RootSpanContextManager, tracer: Tracer) {
    this.span = span;
    this.manager = manager;
    this.tracer = tracer;

    const current = Date.now();
    this.lastNetworkActivityMs = current;
    this.firstUiActivityMs = undefined;
    this.lastUiActivityMs = current;
    this.interruptedAtMs = undefined;
    this.quiescenceTimerId = null;
    this.quiescenceRenderTimerId = null;
    this.activeNetworkRequests = 0;
    this.mutationObserver = this.createMutationObserver();
    this.quiesce();
  }

  /**
   * Records network activity start for this root span.
   */
  recordNetworkActivityStart(): void {
    this.activeNetworkRequests++;
    this.recordNetworkActivity();
  }

  /**
   * Indicates that a network request has ended for this root span.
   */
  recordNetworkActivityEnd(endTimeMs?: number): void {
    this.activeNetworkRequests = Math.max(0, this.activeNetworkRequests - 1);
    this.recordNetworkActivity(endTimeMs ?? Date.now());

    // Short-circuit quiescence if the root span is interrupted and network requests have ended
    if (this.interruptedAtMs !== undefined && this.activeNetworkRequests === 0) {
      this.endRootSpan();
    }
  }

  /**
   * Records network activity and resets the quiescence timer.
   * @param timestamp The time of the network activity.
   */
  private recordNetworkActivity(timestamp: number = Date.now()): void {
    if (timestamp > this.lastNetworkActivityMs) {
      this.lastNetworkActivityMs = timestamp;
      this.quiesce();
    }
  }

  /**
   * Records UI activity and resets the quiescence timer.
   */
  private recordUiActivity(timestamp: number = Date.now()): void {

    if (this.interruptedAtMs === undefined && timestamp > this.lastUiActivityMs) {
      this.firstUiActivityMs ??= timestamp;
      this.lastUiActivityMs = timestamp;
      this.renderQuiesce();
      this.quiesce();
    }
  }

  interrupt(): void {

    this.interruptedAtMs = Date.now();

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    this.endUIRenderSpan(this.interruptedAtMs);

    // Short-circuit quiescence if network requests have ended
    if (this.activeNetworkRequests === 0) {
      this.endRootSpan();
    }
  }

  /**
   * Returns the trace ID of the root span
   * @returns traceId
   */
  getTraceId(): string {
    return this.span.spanContext().traceId;
  }

  private createMutationObserver(): MutationObserver | null {
    if (
      typeof document === 'undefined' ||
      typeof MutationObserver === 'undefined'
    ) {
      return null; // not in a browser environment
    }

    const observer = new MutationObserver(() => {
      this.recordUiActivity(); // Refresh quiescence timer due to DOM updates
      if (
        typeof window !== 'undefined' &&
        typeof window.requestAnimationFrame === 'function'
      ) {
        window.requestAnimationFrame(() => {
          setTimeout(() => {
            this.recordUiActivity(); // Refresh quiescence timer due to browser paint
          }, 0);
        });
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    return observer;
  }

  // Triggers the closing of the root span after a quiescence window.
  private quiesce(): void {
    if (this.quiescenceTimerId) {
      clearTimeout(this.quiescenceTimerId);
    }

    this.quiescenceTimerId = setTimeout(() => {
      this.endRootSpanIfStable();
    }, QUIESCENCE_WINDOW_MS);
  }

  // Triggers the closing of the UI render span after a render quiescence window.
  private renderQuiesce(): void {
    if (this.quiescenceRenderTimerId) {
      clearTimeout(this.quiescenceRenderTimerId);
    }

    this.quiescenceRenderTimerId = setTimeout(() => {
      this.endUIRenderSpanIfStable();
    }, UI_RENDER_QUIESCENCE_WINDOW_MS);
  }

  private endUIRenderSpanIfStable(): void {
    if (this.interruptedAtMs === undefined) {
      const timeSinceLastRenderActivity = Date.now() - this.lastUiActivityMs;
      if (timeSinceLastRenderActivity < UI_RENDER_QUIESCENCE_WINDOW_MS - 5) {
        this.renderQuiesce(); // keep waiting, UI is not stable yet
        return;
      }
      this.endUIRenderSpan();
    }
  }

  private endUIRenderSpan(endTimeMs: number = this.lastUiActivityMs): void {
    if (this.firstUiActivityMs !== undefined) {
      const parentContext = trace.setSpan(context.active(), this.span);

      const uiSpan = this.tracer.startSpan('UI Render', {
        startTime: this.firstUiActivityMs
      }, parentContext);

      uiSpan.end(endTimeMs);

      this.firstUiActivityMs = undefined;

      if (this.quiescenceTimerId) {
        clearTimeout(this.quiescenceTimerId);
      }
    }
  }

  private endRootSpanIfStable(): void {
    if (this.activeNetworkRequests > 0) {
      this.quiesce(); // Keep waiting, there are active network requests
      return;
    }

    const timeSinceLastActivity =
      Date.now() - Math.max(this.lastNetworkActivityMs, this.lastUiActivityMs);
    // Subtract 5 milliseconds from quiescence window to account for browser timer imprecision
    if (timeSinceLastActivity < QUIESCENCE_WINDOW_MS - 5) {
      this.quiesce(); // Keep waiting, work is not yet stable
      return;
    }
    this.endRootSpan();
  }

  private endRootSpan(): void {
    // Clean up the DOM observer to prevent memory leaks
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.quiescenceTimerId) {
      clearTimeout(this.quiescenceTimerId);
    }

    // End the span backdated to the exact millisecond work actually stopped
    if (this.interruptedAtMs !== undefined) {
      const endTime = Math.max(this.lastNetworkActivityMs, this.interruptedAtMs);

      this.span.end(endTime);
    } else {
      const endTime = Math.max(this.lastNetworkActivityMs, this.lastUiActivityMs);

      this.span.end(endTime);
    }
    this.manager.clearRootSpanFromContext(this);
  }
}

/**
 * A custom ContextManager that ensures the latest active root span is the default parent.
 */
export class RootSpanContextManager extends ZoneContextManager {
  private _activeRootSpan: RootSpan | undefined;
  private _interruptedRootSpans: RootSpan[] = [];
  // TODO: cchestnut look into having a store to manage context data not unique to span context
  private _activeAppScreenId: string | undefined;
  startRootSpan(tracer: Tracer, rootSpanName: string): RootSpan {
    if (this._activeRootSpan) {
      this._interruptedRootSpans.push(this._activeRootSpan);
      this._activeRootSpan.interrupt();
      this.clearActiveRootSpan();
    }
    const span = tracer.startSpan(rootSpanName);
    this._activeRootSpan = new RootSpan(span, this, tracer);
    return this._activeRootSpan;
  }

  getActiveRootSpan(): RootSpan | undefined {
    return this._activeRootSpan;
  }

  getRootSpanByTraceId(traceId: string): RootSpan | undefined {
    if (this._activeRootSpan && this._activeRootSpan.getTraceId() === traceId) {
      return this._activeRootSpan;
    } else {
      return this._interruptedRootSpans.find(rs => rs.getTraceId() === traceId);
    }
  }

  clearActiveRootSpan(): void {
    this._activeRootSpan = undefined;
  }

  clearRootSpanFromContext(rootSpan: RootSpan): void {
    if (this._activeRootSpan === rootSpan) {
      this.clearActiveRootSpan();
    }
    if (this._interruptedRootSpans.includes(rootSpan)) {
      this._interruptedRootSpans = this._interruptedRootSpans.filter(
        rs => rs !== rootSpan
      );
    }
  }

  getActiveAppScreenId(): string | undefined {
    return this._activeAppScreenId;
  }

  setActiveAppScreenId(activeAppScreenId: string): void {
    this._activeAppScreenId = activeAppScreenId;
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
