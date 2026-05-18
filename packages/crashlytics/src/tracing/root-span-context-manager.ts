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
import { hrTimeToMilliseconds } from '@opentelemetry/core';

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
  private quiescenceTimerId: ReturnType<typeof setTimeout> | null;
  private mutationObserver: MutationObserver | null;
  private manager: RootSpanContextManager;

  constructor(span: Span, manager: RootSpanContextManager) {
    this.span = span;
    this.manager = manager;
    this.lastActiveTimeMs = Date.now();
    this.quiescenceTimerId = null;
    this.activeNetworkRequests = 0;
    this.mutationObserver = this.createMutationObserver();
    this.quiesce();
  }

  /**
   * Records an activity timestamp and resets the quiescence timer.
   */
  recordActivity(timestamp: number = Date.now()): void {
    if (timestamp > this.lastActiveTimeMs) {
      this.lastActiveTimeMs = timestamp;
    }
    this.quiesce();
  }

  /**
   * Indicates that a network request has started for this root span.
   */
  recordNetworkActivityStart(networkSpan: Span): void {
    const rootSpanTraceId = this.span.spanContext().traceId;
    const networkSpanTraceId = networkSpan.spanContext().traceId;

    if (rootSpanTraceId === networkSpanTraceId) {
      this.activeNetworkRequests++;
      this.recordActivity();
    }
  }

  /**
   * Indicates that a network request has ended for this root span.
   */
  recordNetworkActivityEnd(networkSpan: ReadableSpan): void {
    const rootSpanTraceId = this.span.spanContext().traceId;
    const networkSpanTraceId = networkSpan.spanContext().traceId;

    if (rootSpanTraceId === networkSpanTraceId) {
      this.activeNetworkRequests = Math.max(0, this.activeNetworkRequests - 1);
      this.recordActivity(hrTimeToMilliseconds(networkSpan.endTime));
    }
  }

  private createMutationObserver(): MutationObserver | null {
    if (
      typeof document === 'undefined' ||
      typeof MutationObserver === 'undefined'
    ) {
      return null; // not in a browser environment
    }

    const observer = new MutationObserver(() => {
      this.recordActivity(); // Refresh quiescence timer due to DOM updates
      if (
        typeof window !== 'undefined' &&
        typeof window.requestAnimationFrame === 'function'
      ) {
        window.requestAnimationFrame(() => {
          setTimeout(() => {
            this.recordActivity(); // Refresh quiescence timer due to browser paint
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

  private endRootSpanIfStable(): void {
    if (this.activeNetworkRequests > 0) {
      this.quiesce(); // Keep waiting, there are active network requests
      return;
    }

    const timeSinceLastActivity = Date.now() - this.lastActiveTimeMs;
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
    this.span.end(this.lastActiveTimeMs);
    if (this.manager.getActiveRootSpan() === this) {
      this.manager.clearActiveRootSpan();
    }
  }
}

/**
 * A custom ContextManager that ensures the latest active root span is the default parent.
 */
export class RootSpanContextManager extends ZoneContextManager {
  private _activeRootSpan: RootSpan | undefined;
  // TODO: cchestnut look into having a store to manage context data not unique to span context
  private _activeAppScreenId: string | undefined;
  startRootSpan(tracer: Tracer, rootSpanName: string): RootSpan {
    if (this._activeRootSpan) {
      this.clearActiveRootSpan();
    }
    const span = tracer.startSpan(rootSpanName);
    this._activeRootSpan = new RootSpan(span, this);
    return this._activeRootSpan;
  }

  getActiveRootSpan(): RootSpan | undefined {
    return this._activeRootSpan;
  }

  clearActiveRootSpan(): void {
    this._activeRootSpan = undefined;
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
