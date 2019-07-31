/**
 * @license
 * Copyright 2017 Google Inc.
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

import { Logger, LogLevel as FirebaseLogLevel } from '@firebase/logger';
import { SDK_VERSION } from '../core/version';
import { PlatformSupport } from '../platform/platform';

const logClient = new Logger('@firebase/firestore');

export enum LogLevel {
  DEBUG,
  ERROR,
  SILENT
}

// Helper methods are needed because variables can't be exported as read/write
export function getLogLevel(): LogLevel {
  if (logClient.logLevel === FirebaseLogLevel.DEBUG) {
    return LogLevel.DEBUG;
  } else if (logClient.logLevel === FirebaseLogLevel.SILENT) {
    return LogLevel.SILENT;
  } else {
    return LogLevel.ERROR;
  }
}
export function setLogLevel(newLevel: LogLevel): void {
  /**
   * Map the new log level to the associated Firebase Log Level
   */
  switch (newLevel) {
    case LogLevel.DEBUG:
      logClient.logLevel = FirebaseLogLevel.DEBUG;
      break;
    case LogLevel.ERROR:
      logClient.logLevel = FirebaseLogLevel.ERROR;
      break;
    case LogLevel.SILENT:
      logClient.logLevel = FirebaseLogLevel.SILENT;
      break;
    default:
      logClient.error(
        `Firestore (${SDK_VERSION}): Invalid value passed to \`setLogLevel\``
      );
  }
}

export function debug(tag: string, msg: string, ...obj: unknown[]): void {
  if (logClient.logLevel <= FirebaseLogLevel.DEBUG) {
    const args = obj.map(argToString);
    logClient.debug(`Firestore (${SDK_VERSION}) [${tag}]: ${msg}`, ...args);
  }
}

export function error(msg: string, ...obj: unknown[]): void {
  if (logClient.logLevel <= FirebaseLogLevel.ERROR) {
    const args = obj.map(argToString);
    logClient.error(`Firestore (${SDK_VERSION}): ${msg}`, ...args);
  }
}

/**
 * Converts an additional log parameter to a string representation.
 */
function argToString(obj: unknown): string | unknown {
  if (typeof obj === 'string') {
    return obj;
  } else {
    const platform = PlatformSupport.getPlatform();
    try {
      return platform.formatJSON(obj);
    } catch (e) {
      // Converting to JSON failed, just log the object directly
      return obj;
    }
  }
}
