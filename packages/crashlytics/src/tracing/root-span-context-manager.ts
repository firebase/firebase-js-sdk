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

import {
  Context,
  Span,
  type Tracer,
  trace,
  type SpanOptions,
  type TimeInput
} from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { timeInputToMilliseconds } from '../helpers';

/**
 * The length of time to wait for activity to cease before closing the root span.
 */
const QUIESCENCE_WINDOW_MS = 150;

export type RootSpanType = 'app-start' | 'user-interaction';

/**
 * Wrapper around the OpenTelemetry Span that tracks activity and quiescence for a client-side
 * root span.
 */
export class RootSpan {
  span: Span;

  private activeNetworkRequests: number;
  private startTimeMs: number;
  private lastBackgroundActivityMs?: number;
  private lastUiActivityMs?: number;
  private quiescenceTimerId: ReturnType<typeof setTimeout> | null;
  private mutationObserver: MutationObserver | null;
  private manager: RootSpanContextManager;
  private isInterrupted = false;
  private isDocumentLoaded = true;

  constructor(
    manager: RootSpanContextManager,
    span: Span,
    type: RootSpanType,
    startTimeInput?: TimeInput
  ) {
    this.span = span;
    this.manager = manager;

    this.startTimeMs =
      startTimeInput !== undefined
        ? timeInputToMilliseconds(startTimeInput)
        : Date.now();
    this.lastBackgroundActivityMs = undefined;
    this.lastUiActivityMs = undefined;

    this.quiescenceTimerId = null;
    this.activeNetworkRequests = 0;
    this.mutationObserver = this.createMutationObserver();

    this.isDocumentLoaded = type !== 'app-start';
    // for app-start spans, we don't need to start the quiescence timer until after the document
    // is loaded, to avoid unnecessary timeout loops
    if (this.isDocumentLoaded) {
      this.quiesce();
    }
  }

  /**
   * Marks the document load span as completed and triggers a quiescence check.
   */
  markDocumentLoaded(endTimeMs: number): void {
    this.isDocumentLoaded = true;
    this.setLastBackgroundActivityMs(endTimeMs);
    this.endRootSpanOrWait();
  }

  /**
   * Records network activity start for this root span.
   */
  recordNetworkActivityStart(): void {
    this.activeNetworkRequests++;
    this.setLastBackgroundActivityMs();
  }

  /**
   * Indicates that a network request has ended for this root span.
   */
  recordNetworkActivityEnd(endTimeMs?: number): void {
    this.activeNetworkRequests = Math.max(0, this.activeNetworkRequests - 1);
    this.setLastBackgroundActivityMs(endTimeMs);
    this.endRootSpanOrWait();
  }

  private setLastBackgroundActivityMs(timestamp: number = Date.now()): void {
    if (
      this.lastBackgroundActivityMs === undefined ||
      timestamp > this.lastBackgroundActivityMs
    ) {
      this.lastBackgroundActivityMs = timestamp;
    }
  }

  private setLastUiActivityMs(timestamp: number = Date.now()): void {
    if (
      !this.isInterrupted &&
      (this.lastUiActivityMs === undefined || timestamp > this.lastUiActivityMs)
    ) {
      this.lastUiActivityMs = timestamp;
    }
  }

  interrupt(): void {
    this.isInterrupted = true;
    this.clearMutationObserver();
    this.endRootSpanOrWait();
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
      this.setLastUiActivityMs();
      this.quiesce(); // Refresh quiescence timer due to DOM updates
      if (
        typeof window !== 'undefined' &&
        typeof window.requestAnimationFrame === 'function'
      ) {
        window.requestAnimationFrame(() => {
          setTimeout(() => {
            this.setLastUiActivityMs();
            this.quiesce(); // Refresh quiescence timer due to browser paint
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
    this.clearQuiescenceTimer();

    this.quiescenceTimerId = setTimeout(() => {
      this.endRootSpanOrWait();
    }, QUIESCENCE_WINDOW_MS);
  }

  private endRootSpanOrWait(): void {
    if (!this.isDocumentLoaded) {
      return; // Do not end yet, the document load has not completed
    }

    if (this.activeNetworkRequests > 0) {
      this.quiesce(); // Keep waiting, there are active network requests
      return;
    }

    if (
      !this.isInterrupted &&
      Date.now() - this.getLastActivityMs() < QUIESCENCE_WINDOW_MS
    ) {
      this.quiesce(); // Keep waiting, work is not yet stable
      return;
    }

    this.clearMutationObserver();
    this.clearQuiescenceTimer();

    const finalEndTime = this.getLastActivityMs();
    this.span.end(finalEndTime);
    this.manager.clearRootSpanFromContext(this);
  }

  private getLastActivityMs(): number {
    if (this.isInterrupted) {
      return this.lastBackgroundActivityMs ?? this.startTimeMs;
    }
    if (
      this.lastBackgroundActivityMs !== undefined &&
      this.lastUiActivityMs !== undefined
    ) {
      return Math.max(this.lastBackgroundActivityMs, this.lastUiActivityMs);
    }
    return (
      this.lastBackgroundActivityMs ?? this.lastUiActivityMs ?? this.startTimeMs
    );
  }

  private clearMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private clearQuiescenceTimer(): void {
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
  // TODO: cchestnut look into having a store to manage context data not unique to span context
  private _activeAppScreenId: string | undefined;
  startRootSpan(
    tracer: Tracer,
    type: RootSpanType,
    rootSpanName: string = type,
    options?: SpanOptions
  ): RootSpan {
    if (this._activeRootSpan) {
      this._interruptedRootSpans.push(this._activeRootSpan);
      this._activeRootSpan.interrupt();
      this.clearActiveRootSpan();
    }
    const span = tracer.startSpan(rootSpanName, options);
    this._activeRootSpan = new RootSpan(this, span, type, options?.startTime);
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
