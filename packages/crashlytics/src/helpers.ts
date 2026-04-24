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

import { SeverityNumber } from '@opentelemetry/api-logs';
import * as constants from './auto-constants';
import {
  CRASHLYTICS_ATTRIBUTE_KEYS,
  CRASHLYTICS_SESSION_ID_KEY,
  CRASHLYTICS_TRACER_NAME
} from './constants';
import { Crashlytics, CrashlyticsOptions } from './public-types';
import { CrashlyticsService } from './service';
import { CrashlyticsInternal } from './types';
import { rootSpanContextManager } from './tracing/root-span-context-manager';
import type { Span } from '@opentelemetry/api';

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
 * Generate a new session UUID. We record it in two places:
 * 1. The client browser's sessionStorage (if available)
 * 2. In Cloud Logging as its own log entry
 */
export function startNewSession(crashlytics: Crashlytics): void {
  // Cast to CrashlyticsInternal to access internal loggerProvider
  const { loggerProvider, tracingProvider } =
    crashlytics as CrashlyticsInternal;

  if (
    typeof sessionStorage !== 'undefined' &&
    typeof crypto?.randomUUID === 'function'
  ) {
    try {
      const sessionId = crypto.randomUUID();
      sessionStorage.setItem(CRASHLYTICS_SESSION_ID_KEY, sessionId);

      // Emit session creation log
      const logger = loggerProvider.getLogger('session-logger');
      logger.emit({
        severityNumber: SeverityNumber.DEBUG,
        body: 'Session created',
        attributes: {
          [CRASHLYTICS_ATTRIBUTE_KEYS.SESSION_ID]: sessionId,
          [CRASHLYTICS_ATTRIBUTE_KEYS.APP_VERSION]: getAppVersion(
            (crashlytics as CrashlyticsService).options
          ),
        }
      });
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}

/**
 * Starts a new trace for the given Crashlytics instance.
 *
 * @param crashlytics - The {@link Crashlytics} instance.
 * @param rootSpanName - The name of the root span.
 */
export function startNewTrace(crashlytics: Crashlytics, rootSpanName: string): Span {
  const tracer = (crashlytics as CrashlyticsInternal).tracingProvider.getTracer(
    CRASHLYTICS_TRACER_NAME
  );
  const previousRootSpan = rootSpanContextManager.getRootSpan();
  const newRootSpan = tracer.startSpan(rootSpanName);
  rootSpanContextManager.setRootSpan(newRootSpan);
  if (previousRootSpan) {
    // TODO: Add logic to also end all child spans 
    previousRootSpan.end();
  }
  return newRootSpan;
}

/**
 * Registers event listeners to flush logs when the page is hidden. In some cases multiple listeners
 * may trigger at the same time, but flushing only occurs once per batch.
 */
export function registerListeners(crashlytics: Crashlytics): void {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        // TODO: Update this with idleness logic instead
        rootSpanContextManager.getRootSpan()?.end();
        await flush(crashlytics);
      }
    });
    window.addEventListener('pagehide', async () => {
        // TODO: Update this with idleness logic instead
      rootSpanContextManager.getRootSpan()?.end();
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
