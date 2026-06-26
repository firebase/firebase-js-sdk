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
import { SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { hrTimeToMilliseconds } from '@opentelemetry/core';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { AttributesStore, LOG_ATTR_KEY } from '../attributes-store';

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
 * Tracks UI render span activity and quiescence.
 */
class UiRenderSpanManager {
  private activeRenderSpan: Span | undefined;
  private lastRenderCompletedAtMs: number | undefined;
  private quiescenceRenderTimerId: ReturnType<typeof setTimeout> | null = null;
  private isInterrupted = false;

  constructor(
    private tracer: Tracer,
    private onRenderStart: () => void,
    private onRenderEnd: () => void
  ) {}

  isActivelyRendering(): boolean {
    return this.activeRenderSpan !== undefined;
  }

  getLastRenderCompletedAtMs(): number | undefined {
    return this.lastRenderCompletedAtMs;
  }

  interrupt(interruptedAtMs: number): void {
    this.isInterrupted = true;
    if (this.activeRenderSpan) {
      if (this.quiescenceRenderTimerId === null) {
        this.lastRenderCompletedAtMs = interruptedAtMs;
        this.activeRenderSpan.setAttribute('interrupted_at', interruptedAtMs);
      }
      this.endUiRenderSpan();
    }
  }

  onMutation(): void {
    if (
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
    ) {
      window.requestAnimationFrame(() => {
        // frame 1
        if (this.isInterrupted) {
          return;
        }
        if (!this.activeRenderSpan) {
          this.startUiRenderSpan();
        } else if (
          this.lastRenderCompletedAtMs !== undefined &&
          Date.now() - this.lastRenderCompletedAtMs >=
            UI_RENDER_QUIESCENCE_WINDOW_MS
        ) {
          this.endUiRenderSpan();
          this.startUiRenderSpan();
        }

        // Quiescence does not exist during a pending post rAF callback because it is guaranteed
        // to happen eventually and no waiting period should prevent it (besides an interrupt)
        this.clearEndRenderSpanTimer();
        this.onRenderStart();

        window.requestAnimationFrame(() => {
          // frame 2
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
    this.activeRenderSpan = this.tracer.startSpan(
      'UI Render',
      {
        startTime: startTimeMs
      },
      context.active()
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
 * Tracks resource fetch span activity, like network requests and document load.
 */
class ResourceFetchSpans {
  private activeSpanIds: Set<string>;
  private lastSpanCompletedAtMs?: number;
  private isDocumentLoaded: boolean;

  constructor(isAppStart: boolean = false) {
    this.activeSpanIds = new Set<string>();
    this.lastSpanCompletedAtMs = undefined;
    this.isDocumentLoaded = !isAppStart;
  }

  hasActiveSpans(): boolean {
    return !this.isDocumentLoaded || this.activeSpanIds.size > 0;
  }

  getLastSpanCompletedAtMs(): number | undefined {
    return this.lastSpanCompletedAtMs;
  }

  setLastSpanCompletedAtMs(completedAtMs: number): void {
    if (
      this.lastSpanCompletedAtMs === undefined ||
      completedAtMs > this.lastSpanCompletedAtMs
    ) {
      this.lastSpanCompletedAtMs = completedAtMs;
    }
  }

  recordResourceFetchSpanStart(span: Span): void {
    this.activeSpanIds.add(span.spanContext().spanId);
  }

  recordResourceFetchSpanEnd(span: ReadableSpan): void {
    if (this.activeSpanIds.delete(span.spanContext().spanId)) {
      if (span.name === 'documentLoad') {
        this.isDocumentLoaded = true;
      }
      const completedAtMs = hrTimeToMilliseconds(span.endTime);
      this.setLastSpanCompletedAtMs(completedAtMs);
    }
  }
}

/**
 * Wrapper around the OpenTelemetry Span that tracks activity and quiescence for a client-side
 * root span.
 */
export class RootSpan {
  span: Span;
  private manager: RootSpanContextManager;
  private tracer: Tracer;
  private rootSpanStartAtMs: number;
  private quiescenceTimerId: ReturnType<typeof setTimeout> | null;
  private resourceFetchSpans: ResourceFetchSpans;
  private uiRenderSpanManager: UiRenderSpanManager;
  private mutationObserver?: MutationObserver;
  private isInterrupted: boolean = false;

  /**
   * Initializes a new RootSpan instance, setting initial activity markers
   * and starting the root span quiescence tracking.
   * @param span The OpenTelemetry Span wrapped by this instance.
   * @param manager The context manager that manages active root spans.
   * @param tracer The tracer used to start child spans (e.g. UI Render spans).
   */
  constructor(span: Span, manager: RootSpanContextManager, tracer: Tracer) {
    this.span = span;
    this.manager = manager;
    this.tracer = tracer;

    const sdkSpan = span as unknown as ReadableSpan;
    this.rootSpanStartAtMs = sdkSpan.startTime
      ? hrTimeToMilliseconds(sdkSpan.startTime)
      : Date.now();
    this.quiescenceTimerId = null;
    this.resourceFetchSpans = new ResourceFetchSpans(
      sdkSpan.name === 'app-start'
    );
    this.uiRenderSpanManager = new UiRenderSpanManager(
      this.tracer,
      () => this.clearQuiesce(),
      () => this.quiesce()
    );

    if (
      typeof MutationObserver !== 'undefined' &&
      typeof document !== 'undefined'
    ) {
      this.mutationObserver = new MutationObserver(() =>
        this.uiRenderSpanManager.onMutation()
      );
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    this.quiesce();
  }

  onResourceFetchSpanStart(span: Span): void {
    this.resourceFetchSpans.recordResourceFetchSpanStart(span);
    this.clearQuiesce();
  }

  onResourceFetchSpanEnd(span: ReadableSpan): void {
    this.resourceFetchSpans.recordResourceFetchSpanEnd(span);
    this.endRootSpanOrWait();
  }

  /**
   * Interrupts the root span, stopping further UI observation and closing the
   * active UI render span and the root span itself.
   */
  interrupt(interruptedAtMs: number): void {
    this.isInterrupted = true;
    this.clearMutationObserver();
    this.uiRenderSpanManager.interrupt(interruptedAtMs);
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
      this.resourceFetchSpans.getLastSpanCompletedAtMs(),
      this.uiRenderSpanManager.getLastRenderCompletedAtMs()
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
    if (
      this.resourceFetchSpans.hasActiveSpans() ||
      this.uiRenderSpanManager.isActivelyRendering()
    ) {
      return;
    }

    const lastActivityAtMs = this.getLastActivityMs();
    if (
      !this.isInterrupted &&
      Date.now() - lastActivityAtMs < QUIESCENCE_WINDOW_MS
    ) {
      this.quiesce(); // Keep waiting, work is not yet stable
      return;
    }

    this.clearMutationObserver();
    this.clearQuiesce();
    this.span.end(lastActivityAtMs);
    this.manager.clearRootSpanFromContext(this);
  }
}

/**
 * A custom ContextManager that ensures the latest active root span is the default parent.
 */
export class RootSpanContextManager extends ZoneContextManager {
  private _loggerProvider: LoggerProvider;
  private _attributesStore: AttributesStore;

  private _activeRootSpan: RootSpan | undefined;
  private _interruptedRootSpans: RootSpan[] = [];

  constructor(
    loggerProvider: LoggerProvider,
    attributesStore: AttributesStore
  ) {
    super();
    this._loggerProvider = loggerProvider;
    this._attributesStore = attributesStore;
  }

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
    rootSpanName: string,
    options?: SpanOptions
  ): RootSpan {
    let interruptedAtMs: number | undefined;
    let interruptedSpanContext: Context | undefined;
    if (this._activeRootSpan) {
      const interruptedRootSpan = this._activeRootSpan;
      this._interruptedRootSpans.push(interruptedRootSpan);
      interruptedAtMs = Date.now();
      interruptedSpanContext = trace.setSpan(
        context.active(),
        interruptedRootSpan.span
      );
      interruptedRootSpan.interrupt(interruptedAtMs);
      this.clearActiveRootSpan();
    }
    const span = tracer.startSpan(rootSpanName, options);
    this._activeRootSpan = new RootSpan(span, this, tracer);

    if (interruptedAtMs && interruptedSpanContext) {
      this.logInterruption(
        interruptedSpanContext,
        span.spanContext().traceId,
        interruptedAtMs
      );
    }

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

  private logInterruption(
    interruptedSpanContext: Context,
    interruptingTraceId: string,
    interruptedAtMs: number
  ): void {
    const logger = this._loggerProvider.getLogger('interruption-logger');

    const logAttributes = context.with(interruptedSpanContext, () =>
      this._attributesStore.getLogAttributes({
        [LOG_ATTR_KEY.INTERRUPTED_BY_TRACE]: interruptingTraceId
      })
    );

    logger.emit({
      timestamp: interruptedAtMs,
      severityNumber: SeverityNumber.INFO,
      body: 'Root span interrupted',
      attributes: logAttributes,
      context: interruptedSpanContext
    });
  }
}
