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

import * as constants from './auto-constants';
import { TELEMETRY_SESSION_ID_KEY } from './constants';
import { Telemetry } from './public-types';
import { TelemetryService } from './service';

export function getAppVersion(telemetry: Telemetry): string {
  if ((telemetry as TelemetryService).options?.appVersion) {
    return (telemetry as TelemetryService).options!.appVersion!;
  } else if (constants.AUTO_CONSTANTS?.appVersion) {
    return constants.AUTO_CONSTANTS.appVersion;
  }
  return 'unset';
}

export function getSessionId(): string | undefined {
  if (
    typeof sessionStorage !== 'undefined' &&
    typeof crypto?.randomUUID === 'function'
  ) {
    try {
      let sessionId = sessionStorage.getItem(TELEMETRY_SESSION_ID_KEY);
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem(TELEMETRY_SESSION_ID_KEY, sessionId);
      }
      return sessionId;
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}
