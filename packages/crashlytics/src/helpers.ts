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
  LOG_ENTRY_ATTRIBUTE_KEYS,
  CRASHLYTICS_SESSION_ID_KEY
} from './constants';
import { Crashlytics } from './public-types';
import { CrashlyticsService } from './service';
import { CrashlyticsInternal } from './types';

/**
 * Returns the app version from the provided Telemetry instance, if available.
 */
export function getAppVersion(crashlytics: Crashlytics): string {
  if ((crashlytics as CrashlyticsService).options?.appVersion) {
    return (crashlytics as CrashlyticsService).options!.appVersion!;
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
  const { loggerProvider } = crashlytics as CrashlyticsInternal;
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
          [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: sessionId,
          [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: getAppVersion(crashlytics)
        }
      });
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
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
  // Cast to CrashlyticsInternal to access internal loggerProvider
  return (crashlytics as CrashlyticsInternal).loggerProvider
    .forceFlush()
    .catch(err => {
      console.error('Error flushing logs from Firebase Crashlytics:', err);
    });
}
