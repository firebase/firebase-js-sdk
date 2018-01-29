/**
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

/* tslint:disable:no-console */

import { SDK_VERSION } from '../core/version';
import { AnyJs } from './misc';
import { PlatformSupport } from '../platform/platform';
import { Logger, LogLevel as _LogLevel } from "@firebase/logger";

const client = new Logger();

export enum LogLevel {
  DEBUG,
  ERROR,
  SILENT
}

// Helper methods are needed because variables can't be exported as read/write
export function getLogLevel(): LogLevel {
  if (client.logLevel === _LogLevel.DEBUG) {
    return LogLevel.DEBUG;
  } 
  
  if (client.logLevel === _LogLevel.SILENT) {
    return LogLevel.SILENT;
  }
  
  return LogLevel.ERROR;
}
export function setLogLevel(newLevel: LogLevel): void {
  client.logLevel = newLevel;
}

export function debug(tag: string, msg: string, ...obj: AnyJs[]): void {
  const time = new Date().toISOString();
  const args = obj.map(argToString);
  client.log(`Firestore (${SDK_VERSION}) ${time} [${tag}]: ${msg}`, ...args);
}

export function error(msg: string, ...obj: AnyJs[]): void {
  const time = new Date().toISOString();
  const args = obj.map(argToString);
  client.error(`Firestore (${SDK_VERSION}) ${time}: ${msg}`, ...args);
}

/**
 * Converts an additional log parameter to a string representation.
 */
function argToString(obj: AnyJs): string | AnyJs {
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
