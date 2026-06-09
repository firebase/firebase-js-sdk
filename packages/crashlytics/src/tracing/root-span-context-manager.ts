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
  context,
  type SpanOptions
} from '@opentelemetry/api';
import { hrTimeToMilliseconds } from '@opentelemetry/core';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ZoneContextManager } from '@opentelemetry/context-zone';

export type RootSpanType = 'app-start' | 'user-interaction';
/**
 * The length of time to wait for activity to cease before closing the root span.
 */
export const QUIESCENCE_WINDOW_MS = 150;
/**
 * The length of time to wait for ui render activity to cease before closing the root span.
 * It is set as the expected time difference between requestAnimationFrame cycles.
 */
export const UI_RENDER_QUIESCENCE_WINDOW_MS = 17;

class UiRenderSpan {
  private activeRenderSpan: Span | undefined;
  private lastRenderCompletedAtMs: number | undefined;
  private quiescenceRenderTimerId: ReturnType<typeof setTimeout> | null = null;
  private isInterrupted = false;

  constructor(
    private parentSpan: Span,
    private tracer: Tracer,
    private onRenderStart: () => void,
    private onRenderEnd: () => void
  ) { }

  isActivelyRendering(): boolean {
    return this.activeRenderSpan !== undefined;
  }

  getLastRenderCompletedAtMs(): number | undefined {
    return this.lastRenderCompletedAtMs;
  }

  interrupt(interruptedAtMs: number): void {
    this.isInterrupted = true;
    if (this.activeRenderSpan) {
      this.lastRenderCompletedAtMs = interruptedAtMs;
      this.endUiRenderSpan();
    }
  }

  onMutation(): void {
    if (
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
    ) {
      window.requestAnimationFrame(() => { // frame 1
        if (this.isInterrupted) {
          return;
        }
        if (!this.activeRenderSpan) {
          this.startUiRenderSpan();
        } else if (this.lastRenderCompletedAtMs !== undefined && Date.now() - this.lastRenderCompletedAtMs >= UI_RENDER_QUIESCENCE_WINDOW_MS) {
          this.endUiRenderSpan();
          this.startUiRenderSpan();
        }

        // Quiescence does not exist during a pending post rAF callback because it is guaranteed
        // to happen eventually and no waiting period should prevent it (besides an interrupt)
        this.clearEndRenderSpanTimer();
        this.onRenderStart();

        window.requestAnimationFrame(() => { // frame 2
          if (this.isInterrupted) {
            return;
          }
          this.lastRenderCompletedAtMs = Date.now();
          this.startEndRenderSpanTimer();
          this.onRenderEnd();
        });
      });
    }
  }

  private startEndRenderSpanTimer(): void {
    this.clearEndRenderSpanTimer();

    this.quiescenceRenderTimerId = setTimeout(() => {
      this.endUiRenderSpan();
    }, UI_RENDER_QUIESCENCE_WINDOW_MS);
  }

  private clearEndRenderSpanTimer(): void {
    if (this.quiescenceRenderTimerId) {
      clearTimeout(this.quiescenceRenderTimerId);
      this.quiescenceRenderTimerId = null;
    }
  }

  private startUiRenderSpan(startTimeMs: number = Date.now()): void {
    const parentContext = trace.setSpan(context.active(), this.parentSpan);
    this.activeRenderSpan = this.tracer.startSpan(
      'UI Render',
      {
        startTime: startTimeMs
      },
      parentContext
    );
  }

  private endUiRenderSpan(): void {
    if (this.activeRenderSpan) {
      this.activeRenderSpan.end(this.lastRenderCompletedAtMs);
      this.activeRenderSpan = undefined;
      this.clearEndRenderSpanTimer();
    }
  }
}

/**
 * Wrapper around the OpenTelemetry Span that tracks activity and quiescence for a client-side
 * root span.
 */
export class RootSpan {
  span: Span;
  private uiRenderSpan: UiRenderSpan;
  private rootSpanStartAtMs: number;
  private activeNetworkRequests: number;
  private lastBackgroundActivityMs?: number;
  private interruptedAtMs: number | undefined;
  private quiescenceTimerId: ReturnType<typeof setTimeout> | null;
  private mutationObserver?: MutationObserver;
  private manager: RootSpanContextManager;
  private isDocumentLoaded = true;
  private tracer: Tracer;

  /**
   * Initializes a new RootSpan instance, setting initial activity markers
   * and starting the root span quiescence tracking.
   * @param span The OpenTelemetry Span wrapped by this instance.
   * @param manager The context manager that manages active root spans.
   * @param type The type of root span ('app-start' or 'user-interaction').
   * @param tracer The tracer used to start child spans (e.g. UI Render spans).
   */
  constructor(
    span: Span,
    manager: RootSpanContextManager,
    type: RootSpanType,
    tracer: Tracer
  ) {
    this.span = span;
    this.manager = manager;
    this.tracer = tracer;

    const sdkSpan = span as unknown as ReadableSpan;
    this.rootSpanStartAtMs = sdkSpan.startTime
      ? hrTimeToMilliseconds(sdkSpan.startTime)
      : Date.now();

    this.lastBackgroundActivityMs = undefined;
    this.interruptedAtMs = undefined;
    this.quiescenceTimerId = null;
    this.activeNetworkRequests = 0;
    this.uiRenderSpan = new UiRenderSpan(
      this.span,
      this.tracer,
      () => this.clearQuiesce(),
      () => this.quiesce()
    );

    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this.mutationObserver = new MutationObserver(() => this.uiRenderSpan.onMutation());
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    this.isDocumentLoaded = type !== 'app-start';
    // for app-start spans, we don't need to start the quiescence timer until after the document
    // is loaded, to avoid unnecessary timeout loops
    if (this.isDocumentLoaded) {
      this.quiesce();
    }
  }

  /**
   * Marks the document load span as completed and triggers a quiescence check.
   * @param endTimeMs The end timestamp of the document load span.
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
   * @param endTimeMs Optional end timestamp of the network request.
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

  /**
   * Interrupts the root span, stopping further UI observation and closing the
   * active UI render span and the root span itself.
   */
  interrupt(): void {
    this.interruptedAtMs = Date.now();
    this.clearMutationObserver();
    this.uiRenderSpan.interrupt(this.interruptedAtMs);
    this.endRootSpanOrWait();
  }

  /**
   * Returns the trace ID of the root span
   * @returns traceId
   */
  getTraceId(): string {
    return this.span.spanContext().traceId;
  }

  private getLastActivityMs(): number {
    const activityTimes = [
      this.rootSpanStartAtMs,
      this.lastBackgroundActivityMs,
      this.uiRenderSpan.getLastRenderCompletedAtMs()
    ].filter((t): t is number => t !== undefined);

    return Math.max(...activityTimes);
  }

  /**
   * Triggers the closing of the root span after a quiescence window of inactivity.
   */
  private quiesce(): void {
    this.clearQuiesce();

    this.quiescenceTimerId = setTimeout(() => {
      this.endRootSpanOrWait();
    }, QUIESCENCE_WINDOW_MS);
  }

  /**
   * Clears the root span quiescence timer, preventing it from executing.
   */
  private clearQuiesce(): void {
    if (this.quiescenceTimerId) {
      clearTimeout(this.quiescenceTimerId);
      this.quiescenceTimerId = null;
    }
  }

  private clearMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }
  }

  /**
   * Checks if the root span is stable (both network and UI activity have ceased) and ends it if so.
   */
  private endRootSpanOrWait(): void {
    if (!this.isDocumentLoaded) {
      return; // Do not end yet, the document load has not completed
    }
    if (this.activeNetworkRequests > 0) {
      this.quiesce(); // Keep waiting, there are active network requests
      return;
    }

    if (this.uiRenderSpan.isActivelyRendering()) {
      return;
    }

    const finalEndTime = this.getLastActivityMs();

    if (
      this.interruptedAtMs === undefined &&
      Date.now() - finalEndTime < QUIESCENCE_WINDOW_MS
    ) {
      this.quiesce(); // Keep waiting, work is not yet stable
      return;
    }

    this.clearMutationObserver();
    this.clearQuiesce();
    this.span.end(finalEndTime);
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
  /**
   * Starts a new root span, interrupting and clearing the previous active root span if one exists.
   * @param tracer The tracer to start the span.
   * @param type The type of the root span ('app-start' or 'user-interaction').
   * @param rootSpanName The name of the root span.
   * @param options Optional configuration options for the span.
   * @returns The newly created RootSpan instance.
   */
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
    this._activeRootSpan = new RootSpan(span, this, type, tracer);
    return this._activeRootSpan;
  }

  /**
   * Returns the currently active RootSpan instance, if any.
   * @returns The active RootSpan, or undefined.
   */
  getActiveRootSpan(): RootSpan | undefined {
    return this._activeRootSpan;
  }

  /**
   * Retrieves a RootSpan (either active or recently interrupted) by its trace ID.
   * @param traceId The trace ID to match.
   * @returns The RootSpan if found, or undefined.
   */
  getRootSpanByTraceId(traceId: string): RootSpan | undefined {
    if (this._activeRootSpan && this._activeRootSpan.getTraceId() === traceId) {
      return this._activeRootSpan;
    } else {
      return this._interruptedRootSpans.find(rs => rs.getTraceId() === traceId);
    }
  }

  /**
   * Clears the reference to the currently active root span.
   */
  clearActiveRootSpan(): void {
    this._activeRootSpan = undefined;
  }

  /**
   * Removes a RootSpan instance from active or interrupted tracking.
   * @param rootSpan The RootSpan to remove.
   */
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

  /**
   * Gets the active application screen ID (current page/route).
   * @returns The screen ID, or undefined.
   */
  getActiveAppScreenId(): string | undefined {
    return this._activeAppScreenId;
  }

  /**
   * Sets the active application screen ID (current page/route).
   * @param activeAppScreenId The screen ID.
   */
  setActiveAppScreenId(activeAppScreenId: string): void {
    this._activeAppScreenId = activeAppScreenId;
  }

  /**
   * Overrides ZoneContextManager active context, making the active RootSpan's span
   * the active Span in the returned Context if there isn't one already.
   * @returns The current Context.
   */
  override active(): Context {
    const context = super.active();
    // If the root span is set and there isn't already an active span in context
    if (this._activeRootSpan && !trace.getSpan(context)) {
      return trace.setSpan(context, this._activeRootSpan.span);
    }
    return context;
  }
}
