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
  TELEMETRY_SESSION_ID_KEY
} from './constants';
import { Telemetry } from './public-types';
import { TelemetryService } from './service';

/**
 * Returns the app version from the provided Telemetry instance, if available.
 */
export function getAppVersion(telemetry: Telemetry): string {
  if ((telemetry as TelemetryService).options?.appVersion) {
    return (telemetry as TelemetryService).options!.appVersion!;
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
      return sessionStorage.getItem(TELEMETRY_SESSION_ID_KEY) || undefined;
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
export function startNewSession(telemetry: Telemetry): void {
  const { loggerProvider } = telemetry;
  if (
    typeof sessionStorage !== 'undefined' &&
    typeof crypto?.randomUUID === 'function'
  ) {
    try {
      const sessionId = crypto.randomUUID();
      sessionStorage.setItem(TELEMETRY_SESSION_ID_KEY, sessionId);

      // Emit session creation log
      const logger = loggerProvider.getLogger('session-logger');
      logger.emit({
        severityNumber: SeverityNumber.DEBUG,
        body: 'Session created',
        attributes: {
          [LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID]: sessionId,
          [LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION]: getAppVersion(telemetry)
        }
      });
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}
