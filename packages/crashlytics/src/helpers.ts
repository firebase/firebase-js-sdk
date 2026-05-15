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

import { AnyValueMap, SeverityNumber } from '@opentelemetry/api-logs';
import * as constants from './auto-constants';
import {
  CRASHLYTICS_ATTRIBUTE_KEYS,
  CRASHLYTICS_SESSION_ID_KEY,
  CRASHLYTICS_TRACER_NAME
} from './constants';
import { Crashlytics, CrashlyticsOptions } from './public-types';
import { CrashlyticsService } from './service';
import { CrashlyticsInternal } from './types';

import { trace } from '@opentelemetry/api';

/**
 * Returns the app version from the provided Telemetry instance, if available.
 */
export function getAppVersion(
  crashlyticsOptions: CrashlyticsOptions | undefined
): string {
  if (crashlyticsOptions?.appVersion) {
    return crashlyticsOptions?.appVersion;
  } else if (constants.AUTO_CONSTANTS?.appVersion) {
    return constants.AUTO_CONSTANTS.appVersion;
  }
  return 'unset';
}

/**
 * Returns the session ID stored in sessionStorage, if available.
 */
export function getSessionId(): string | undefined {
  if (typeof sessionStorage !== 'undefined') {
    try {
      return sessionStorage.getItem(CRASHLYTICS_SESSION_ID_KEY) || undefined;
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}

/**
 * Sets attributes that are common across all logs
 */
export function setCommonLogAttributes(
  crashlytics: Crashlytics,
  customAttributes: AnyValueMap
): void {
  const options =
    crashlytics instanceof CrashlyticsService ? crashlytics.options : undefined;
  // Add trace metadata
  const activeSpanContext = trace.getActiveSpan()?.spanContext();
  if (activeSpanContext?.traceId) {
    customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.TRACE_ID] =
      activeSpanContext.traceId;
    if (activeSpanContext?.spanId) {
      customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.SPAN_ID] =
        activeSpanContext.spanId;
    }
  }
  // Add app version metadata
  customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.APP_VERSION] =
    getAppVersion(options);
  // Add session ID metadata
  const sessionId = getSessionId();
  if (sessionId) {
    customAttributes[CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID] = sessionId;
  }
}

/**
 * Generate a new session UUID. We record it in two places:
 * 1. The client browser's sessionStorage (if available)
 * 2. In Cloud Logging as its own log entry
 */
export function startNewSession(crashlytics: Crashlytics): void {
  // Cast to CrashlyticsInternal to access internal loggerProvider
  const { loggerProvider } = crashlytics as CrashlyticsInternal;

  if (
    typeof sessionStorage !== 'undefined' &&
    typeof crypto?.randomUUID === 'function'
  ) {
    try {
      const sessionId = crypto.randomUUID();
      sessionStorage.setItem(CRASHLYTICS_SESSION_ID_KEY, sessionId);

      const customAttributes: AnyValueMap = {};
      setCommonLogAttributes(crashlytics, customAttributes);

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
 * Registers event listeners to flush logs when the page is hidden. In some cases multiple listeners
 * may trigger at the same time, but flushing only occurs once per batch.
 */
export function registerListeners(crashlytics: Crashlytics): void {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('visibilitychange', async () => {
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
  const { loggerProvider, contextManager } = crashlytics as CrashlyticsInternal;

  // If a root span is active, end it now so its final logs can be captured and flushed
  const activeRootSpan = contextManager.getActiveRootSpan();
  if (activeRootSpan) {
    activeRootSpan.span.end();
  }

  // Cast to CrashlyticsInternal to access internal loggerProvider
  return loggerProvider.forceFlush().catch(err => {
    console.error('Error flushing logs from Firebase Crashlytics:', err);
  });
}
