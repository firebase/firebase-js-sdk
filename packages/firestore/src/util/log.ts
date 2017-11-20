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

export enum LogLevel {
  DEBUG,
  ERROR,
  SILENT
}

let logLevel = LogLevel.ERROR;

// Helper methods are needed because variables can't be exported as read/write
export function getLogLevel(): LogLevel {
  return logLevel;
}
export function setLogLevel(newLevel: LogLevel): void {
  logLevel = newLevel;
}

export function debug(tag: string, msg: string, ...obj: AnyJs[]): void {
  if (logLevel <= LogLevel.DEBUG) {
    const time = new Date().toISOString();
    const args = obj.map(argToString);
    console.log(`Firestore (${SDK_VERSION}) ${time} [${tag}]: ${msg}`, ...args);
  }
}

export function error(msg: string, ...obj: AnyJs[]): void {
  if (logLevel <= LogLevel.ERROR) {
    const time = new Date().toISOString();
    const args = obj.map(argToString);
    console.error(`Firestore (${SDK_VERSION}) ${time}: ${msg}`, ...args);
  }
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
