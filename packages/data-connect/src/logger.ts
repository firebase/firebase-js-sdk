/**
 * @license
 * Copyright 2024 Google LLC
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
import { Logger, LogLevel, LogLevelString } from "@firebase/logger";
import { SDK_VERSION } from "./core/version";

const logger = new Logger('@firebase/data-connect');
export function setLogLevel(logLevel: LogLevelString) {
  logger.setLogLevel(logLevel);
}
export function logDebug(msg: string): void {
  // if (logger.logLevel <= LogLevel.DEBUG) {
    logger.debug(`DataConnect (${SDK_VERSION}): ${msg}`);
  // }
}

export function logError(msg: string): void {
  // if (logger.logLevel <= LogLevel.ERROR) {
    logger.error(`DataConnect (${SDK_VERSION}): ${msg}`);
  // }
}