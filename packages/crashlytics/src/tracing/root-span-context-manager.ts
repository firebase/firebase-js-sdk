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
/**
 * Wrapper around the OpenTelemetry Span that tracks activity and quiescence for a client-side
 * root span.
 */
export class RootSpan {
  span: Span;
  private rootSpanStartAtMs: number;
  private activeNetworkRequests: number;
  private lastBackgroundActivityMs?: number;
  private prePaintAtMs: number | undefined;
  private postPaintAtMs: number | undefined;
  private interruptedAtMs: number | undefined;
  private quiescenceTimerId: ReturnType<typeof setTimeout> | null;
  private quiescenceRenderTimerId: ReturnType<typeof setTimeout> | null;
  private mutationObserver: MutationObserver | null;
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
    this.prePaintAtMs = undefined;
    this.postPaintAtMs = undefined;
    this.interruptedAtMs = undefined;
    this.quiescenceTimerId = null;
    this.quiescenceRenderTimerId = null;
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

    this.endUIRenderSpan(this.postPaintAtMs ?? this.interruptedAtMs);

    this.endRootSpanOrWait();
  }

  /**
   * Returns the trace ID of the root span
   * @returns traceId
   */
  getTraceId(): string {
    return this.span.spanContext().traceId;
  }

  /**
   * Creates a MutationObserver to observe DOM changes, tracking UI render cycles
   * via requestAnimationFrame to measure paint timings.
   * @returns A MutationObserver instance, or null if not in a browser environment.
   */
  private createMutationObserver(): MutationObserver | null {
    if (
      typeof document === 'undefined' ||
      typeof MutationObserver === 'undefined'
    ) {
      return null; // not in a browser environment
    }

    const observer = new MutationObserver(() => {
      if (
        typeof window !== 'undefined' &&
        typeof window.requestAnimationFrame === 'function'
      ) {
        window.requestAnimationFrame(() => {
          // capture UI activity start in frame 1
          const currTimestamp = Date.now();

          if (this.prePaintAtMs === undefined) {
            this.prePaintAtMs = currTimestamp;
          } else if (this.postPaintAtMs !== undefined) {
            const timeSinceRenderEnd = currTimestamp - this.postPaintAtMs;
            if (timeSinceRenderEnd >= UI_RENDER_QUIESCENCE_WINDOW_MS) {
              this.endUIRenderSpan();
              this.prePaintAtMs = currTimestamp;
            }
          }

          this.postPaintAtMs = undefined;
          /**
           * Quiescence does not exist during a pending post rAF callback because it is guaranteed
           * to happen eventually and no waiting period should prevent it (besides an interrupt)
           */
          this.clearRenderQuiesce();
          this.clearQuiesce();
          // any queued timeout callback for a completed quiescence period becomes invalid here
          window.requestAnimationFrame(() => {
            // capture UI activity end in frame 2
            this.postPaintAtMs = Date.now();

            this.renderQuiesce();
            this.quiesce();
          });
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

  /**
   * Disconnects and cleans up the DOM mutation observer.
   */
  private clearMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private getLastActivityMs(): number {
    const activityTimes: number[] = [this.rootSpanStartAtMs];
    if (this.lastBackgroundActivityMs !== undefined) {
      activityTimes.push(this.lastBackgroundActivityMs);
    }
    if (this.postPaintAtMs !== undefined) {
      activityTimes.push(this.postPaintAtMs);
    } else if (this.interruptedAtMs !== undefined) {
      activityTimes.push(this.interruptedAtMs);
    }
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
   * Triggers the closing of the UI render span after a render quiescence window of inactivity.
   */
  private renderQuiesce(): void {
    this.clearRenderQuiesce();

    this.quiescenceRenderTimerId = setTimeout(() => {
      this.endUIRenderSpan();
    }, UI_RENDER_QUIESCENCE_WINDOW_MS);
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

  /**
   * Clears the UI render span quiescence timer, preventing it from executing.
   */
  private clearRenderQuiesce(): void {
    if (this.quiescenceRenderTimerId) {
      clearTimeout(this.quiescenceRenderTimerId);
      this.quiescenceRenderTimerId = null;
    }
  }

  /**
   * Starts and immediately ends a 'UI Render' span to capture the duration
   * of the measured UI rendering work.
   * @param endTimeMs Optional end timestamp. Defaults to the last paint completion time.
   */
  private endUIRenderSpan(
    endTimeMs: number | undefined = this.postPaintAtMs
  ): void {
    if (this.prePaintAtMs !== undefined && endTimeMs !== undefined) {
      const parentContext = trace.setSpan(context.active(), this.span);

      const uiSpan = this.tracer.startSpan(
        'UI Render',
        {
          startTime: this.prePaintAtMs
        },
        parentContext
      );

      uiSpan.end(endTimeMs);

      this.prePaintAtMs = undefined;

      this.clearRenderQuiesce();
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
    rootSpanName: string,
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
