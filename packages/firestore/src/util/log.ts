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
  logBuffer?.add(LogLevel.DEBUG, msg, obj);
  if (logClient.logLevel <= LogLevel.DEBUG) {
    const args = obj.map(argToString);
    logClient.debug(`Firestore (${SDK_VERSION}): ${msg}`, ...args);
  }
}

export function logError(msg: string, ...obj: unknown[]): void {
  logBuffer?.add(LogLevel.ERROR, msg, obj);
  if (logClient.logLevel <= LogLevel.ERROR) {
    const args = obj.map(argToString);
    logClient.error(`Firestore (${SDK_VERSION}): ${msg}`, ...args);
  }
}

/**
 * @internal
 */
export function logWarn(msg: string, ...obj: unknown[]): void {
  logBuffer?.add(LogLevel.WARN, msg, obj);
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

interface LogBufferMessage {
  level: LogLevel;
  msg: string;
  objs: unknown[];
  timestamp: number;
}

class LogBuffer {
  private readonly messages: LogBufferMessage[] = [];
  private readonly enabledDumpIds: string[];

  constructor(private readonly maxLength: number, enabledDumpIds: string[]) {
    this.enabledDumpIds = Array.from(enabledDumpIds);
  }

  add(level: LogLevel, msg: string, objs: unknown[]): void {
    const message: LogBufferMessage = {
      level,
      msg,
      objs: objs.map(value => structuredClone(value)),
      timestamp: performance.now()
    };
    if (this.messages.length === this.maxLength) {
      this.messages.shift();
    }
    this.messages.push(message);
  }

  private isDumpIdEnabled(dumpId: string | undefined): boolean {
    return (
      dumpId === undefined ||
      this.enabledDumpIds.length === 0 ||
      this.enabledDumpIds.includes(dumpId)
    );
  }

  dump(dumpId?: string | undefined): void {
    if (!this.isDumpIdEnabled(dumpId)) {
      return;
    }
    const oldLogLevel = logClient.logLevel;
    logClient.setLogLevel(LogLevel.DEBUG);
    try {
      this.doDump();
    } finally {
      logClient.setLogLevel(oldLogLevel);
    }
  }

  private doDump(dumpId?: string | undefined): void {
    const now = performance.now();
    const numBufferedMessages = this.messages.length;
    logClient.info(
      `Firestore (${SDK_VERSION}): ` +
        `Dumping ${numBufferedMessages} buffered log messages ` +
        `with dumpId=${dumpId}`
    );

    const i = 1;

    while (true) {
      const message = this.messages.shift();
      if (!message) {
        break;
      }
      const { level, msg, objs, timestamp } = message;
      const args = objs.map(argToString);
      const messageString =
        `Firestore (${SDK_VERSION}): BUFFERED ${i}/${numBufferedMessages} ` +
        `(${now - timestamp}ms ago): ${msg}`;
      if (level === LogLevel.WARN) {
        logClient.warn(messageString, ...args);
      } else if (level === LogLevel.ERROR) {
        logClient.error(messageString, ...args);
      } else {
        logClient.debug(messageString, ...args);
      }
    }
  }
}

let logBuffer: LogBuffer | null = null;

export function enableLogBuffer(
  maxLength: number,
  enabledDumpIds?: string[]
): void {
  if (logBuffer) {
    throw new Error('log buffer has already been enabled');
  }
  logBuffer = new LogBuffer(maxLength, enabledDumpIds ?? []);
}

export function dumpLogBuffer(dumpId?: string | undefined): void {
  logBuffer?.dump(dumpId);
}
