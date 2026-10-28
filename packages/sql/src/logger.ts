/**
 * @license
 * Copyright 2026 Google LLC
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

import { SDK_VERSION } from './core/version';
import { FIREBASE_SQL_PACKAGE_NAME } from './util/constants';

/** @internal */
export const logger = new Logger(FIREBASE_SQL_PACKAGE_NAME);

export function getLogLevel(): LogLevelString {
  return LogLevel[logger.logLevel].toLowerCase() as LogLevelString;
}
export function setLogLevel(logLevel: LogLevelString): void {
  logger.setLogLevel(logLevel);
}
export function logDebug(msg: string): void {
  logger.debug(`Firebase SQL (${SDK_VERSION}): ${msg}`);
}

export function logError(msg: string): void {
  logger.error(`Firebase SQL (${SDK_VERSION}): ${msg}`);
}

/**
 * The App Check "placeholder" token, i.e. base64 of `{"error":"UNKNOWN_ERROR"}`,
 * sent when App Check fails to obtain a real token.
 * See `formatDummyToken(defaultTokenErrorData)` in `@firebase/app-check`.
 */
const PLACEHOLDER_APP_CHECK_TOKEN = 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==';

/**
 * Returns a partially redacted access token, keeping only a short prefix and
 * suffix so that tokens can be correlated in logs without exposing them.
 * @internal
 */
export function redactToken(token: string | null): string {
  if (token === null) {
    return 'null';
  }
  if (token === PLACEHOLDER_APP_CHECK_TOKEN) {
    return `${token} (the "placeholder" App Check token)`;
  }
  if (token.length < 30) {
    return '<redacted>';
  }
  return `${token.slice(0, 6)}<redacted>${token.slice(-6)}`;
}
