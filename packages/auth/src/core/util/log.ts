/**
 * @license
 * Copyright 2020 Google LLC
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

import { Logger, LogLevel } from '@firebase/logger';
import { SDK_VERSION } from '@firebase/app';

export { LogLevel };

const logClient = new Logger('@firebase/auth');

// Helper methods are needed because variables can't be exported as read/write
export function _getLogLevel(): LogLevel {
  return logClient.logLevel;
}

export function _setLogLevel(newLevel: LogLevel): void {
  logClient.logLevel = newLevel;
}

export function _logDebug(msg: string, ...args: string[]): void {
  if (logClient.logLevel <= LogLevel.DEBUG) {
    logClient.debug(`Auth (${SDK_VERSION}): ${msg}`, ...args);
  }
}

export function _logWarn(msg: string, ...args: string[]): void {
  if (logClient.logLevel <= LogLevel.WARN) {
    logClient.warn(`Auth (${SDK_VERSION}): ${msg}`, ...args);
  }
}

export function _logError(msg: string, ...args: string[]): void {
  if (logClient.logLevel <= LogLevel.ERROR) {
    logClient.error(`Auth (${SDK_VERSION}): ${msg}`, ...args);
  }
}
