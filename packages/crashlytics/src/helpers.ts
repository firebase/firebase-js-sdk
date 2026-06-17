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

import { SeverityNumber, AnyValueMap } from '@opentelemetry/api-logs';
import { CRASHLYTICS_TRACER_NAME } from './constants';
import { Crashlytics } from './public-types';
import { CrashlyticsInternal } from './types';
import { type TimeInput } from '@opentelemetry/api';
import { hrTimeToMilliseconds, timeInputToHrTime } from '@opentelemetry/core';

/**
 * Converts OpenTelemetry TimeInput to milliseconds since epoch.
 */
export function timeInputToMilliseconds(time: TimeInput): number {
  return hrTimeToMilliseconds(timeInputToHrTime(time));
}

/**
 * Generate a new session UUID. We record it in two places:
 * 1. The client browser's sessionStorage (via attributesStore)
 * 2. In Cloud Logging as its own log entry
 */
export function startNewSession(crashlytics: Crashlytics): void {
  // Cast to CrashlyticsInternal to access internal loggerProvider
  const { loggerProvider, attributesStore } =
    crashlytics as CrashlyticsInternal;
  if (
    typeof sessionStorage !== 'undefined' &&
    typeof crypto?.randomUUID === 'function'
  ) {
    try {
      const sessionId = crypto.randomUUID();
      attributesStore.setSessionId(sessionId);

      const customAttributes = attributesStore.getLogAttributes();

      // Emit session creation log
      const logger = loggerProvider.getLogger('session-logger');
      logger.emit({
        severityNumber: SeverityNumber.DEBUG,
        body: 'Session created',
        attributes: customAttributes
      });
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}

/**
 * Starts a new trace for a user interaction. If a root span is already active, it will be
 * interrupted and a new root span will be started.
 *
 * @param crashlytics - The {@link Crashlytics} instance.
 */
export function startUserInteractionTrace(
  crashlytics: Crashlytics,
  rootSpanName: string
): void {
  const { contextManager, tracingProvider } =
    crashlytics as CrashlyticsInternal;

  const tracer = tracingProvider.getTracer(CRASHLYTICS_TRACER_NAME);
  contextManager.startRootSpan(tracer, rootSpanName);
}

/**
 * Generates a clean, scannable name for the click span based on the HTML element properties.
 *
 * @param element - The HTML element that was clicked.
 * @returns A string representing the name for the click span.
 */
export function generateClickSpanName(element: Element): string {
  const tagName = element.tagName.trim().toLowerCase();
  if (element.id) {
    return `click ${tagName} [id="${element.id}"]`;
  }
  if (element.getAttribute('data-testid')) {
    return `click ${tagName} [data-testid="${element.getAttribute(
      'data-testid'
    )}"]`;
  }
  if (element.getAttribute('data-analytics-id')) {
    return `click ${tagName} [data-analytics-id="${element.getAttribute(
      'data-analytics-id'
    )}"]`;
  }
  if (element.getAttribute('name')) {
    return `click ${tagName} [name="${element.getAttribute('name')}"]`;
  }
  if (element.getAttribute('aria-label')) {
    return `click ${tagName} [aria-label="${element.getAttribute(
      'aria-label'
    )}"]`;
  }
  if (element.getAttribute('role')) {
    return `click ${tagName} [role="${element.getAttribute('role')}"]`;
  }
  return `click ${tagName}`;
}

/**
 * Registers event listeners to flush logs when the page is hidden. In some cases multiple listeners
 * may trigger at the same time, but flushing only occurs once per batch.
 */
export function registerListeners(crashlytics: Crashlytics): void {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('visibilitychange', async () => {
      if (
        document.visibilityState === 'visible' ||
        document.visibilityState === 'hidden'
      ) {
        logVisibilityEvent(crashlytics, document.visibilityState);
      }

      if (document.visibilityState === 'hidden') {
        await flush(crashlytics);
      }
    });
    window.addEventListener('pagehide', async () => {
      await flush(crashlytics);
    });
  }
}

/**
 * Flushes all enqueued Crashlytics data immediately, instead of waiting for default batching.
 *
 * @public
 *
 * @param crashlytics - The {@link Crashlytics} instance.
 * @returns a promise which is resolved when all flushes are complete
 */
export function flush(crashlytics: Crashlytics): Promise<void> {
  // Cast to CrashlyticsInternal to access internal loggerProvider
  return (crashlytics as CrashlyticsInternal).loggerProvider
    .forceFlush()
    .catch(err => {
      console.error('Error flushing logs from Firebase Crashlytics:', err);
    });
}

/**
 * Logs a page visibility transition event (foreground or background).
 *
 * @public
 *
 * @param crashlytics - The {@link Crashlytics} instance.
 * @param visibilityState - The current page visibility state ('visible' or 'hidden').
 */
export function logVisibilityEvent(
  crashlytics: Crashlytics,
  visibilityState: 'visible' | 'hidden'
): void {
  const { loggerProvider, attributesStore } =
    crashlytics as CrashlyticsInternal;
  const logger = loggerProvider.getLogger('visibility-logger');
  const customAttributes: AnyValueMap = attributesStore.getLogAttributes();

  const body =
    visibilityState === 'hidden'
      ? 'Background lifecycle event'
      : 'Foreground lifecycle event';

  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body,
    attributes: customAttributes
  });
}
