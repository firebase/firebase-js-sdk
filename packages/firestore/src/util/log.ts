/**
 * @license
 * Copyright 2017 Google LLC
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

import { Logger, LogLevel, LogLevelString } from '@firebase/logger';

import { SDK_VERSION } from '../core/version';
import { formatJSON } from '../platform/format_json';

export { LogLevel, LogLevelString };

const logClient = new Logger('@firebase/firestore');

// Helper methods are needed because variables can't be exported as read/write
export function getLogLevel(): LogLevel {
  return logClient.logLevel;
}

/**
 * Sets the verbosity of Cloud Firestore logs (debug, error, or silent).
 *
 * @param logLevel - The verbosity you set for activity and error logging. Can
 *   be any of the following values:
 *
 *   <ul>
 *     <li>`debug` for the most verbose logging level, primarily for
 *     debugging.</li>
 *     <li>`error` to log errors only.</li>
 *     <li><code>`silent` to turn off logging.</li>
 *   </ul>
 */
export function setLogLevel(logLevel: LogLevelString): void {
  logClient.setLogLevel(logLevel);
}

export function logDebug(msg: string, ...obj: unknown[]): void {
  if (logClient.logLevel <= LogLevel.DEBUG) {
    const args = obj.map(argToString);
    logClient.debug(`Firestore (${SDK_VERSION}): ${msg}`, ...args);
  }
}

export function logError(msg: string, ...obj: unknown[]): void {
  if (logClient.logLevel <= LogLevel.ERROR) {
    const args = obj.map(argToString);
    logClient.error(`Firestore (${SDK_VERSION}): ${msg}`, ...args);
  }
}

/**
 * @internal
 */
export function logWarn(msg: string, ...obj: unknown[]): void {
  if (logClient.logLevel <= LogLevel.WARN) {
    const args = obj.map(argToString);
    logClient.warn(`Firestore (${SDK_VERSION}): ${msg}`, ...args);
  }
}

/**
 * Converts an additional log parameter to a string representation.
 */
function argToString(obj: unknown): string | unknown {
  if (typeof obj === 'string') {
    return obj;
  } else {
    try {
      return formatJSON(obj);
    } catch (e) {
      // Converting to JSON failed, just log the object directly
      return obj;
    }
  }
}
