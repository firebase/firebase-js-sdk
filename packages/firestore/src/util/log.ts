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

import { Logger, LogHandler, LogLevel, LogLevelString } from '@firebase/logger';

import { SDK_VERSION } from '../core/version';
import { formatJSON } from '../platform/format_json';

import { generateUniqueDebugId } from './debug_uid';

export { LogLevel, LogLevelString };

const logClient = new Logger('@firebase/firestore');
const defaultLogHandler = logClient.logHandler;
let logBuffer: LogBuffer | undefined;

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
 * @param includeContext - If set to a positive value, the logger will buffer
 *   all log messages (of all log levels) and log the most recent messages
 *   when a message of `logLevel` is seen. This is useful if you want to get
 *   debug logging from the SDK leading up to a warning or error, but do not
 *   always want debug log verbosity. This param specifies how many messages
 *   to buffer.
 */
export function setLogLevel(
  logLevel: LogLevelString,
  includeContext: number = 0
): void {
  logClient.setLogLevel(logLevel);

  if (includeContext > 0) {
    logBuffer = new LogBuffer(includeContext);
    logClient.logHandler = bufferingLogHandler;
  } else {
    logBuffer = undefined;
    logClient.logHandler = defaultLogHandler;
  }
}

export function logDebug(msg: string, ...obj: unknown[]): void {
  if (logBuffer || logClient.logLevel <= LogLevel.DEBUG) {
    const args = obj.map(argToString);
    logClient.debug(`Firestore (${SDK_VERSION}): ${msg}`, ...args);
  }
}

export function logError(msg: string, ...obj: unknown[]): void {
  if (logBuffer || logClient.logLevel <= LogLevel.ERROR) {
    const args = obj.map(argToString);
    logClient.error(`Firestore (${SDK_VERSION}): ${msg}`, ...args);
  }
}

/**
 * @internal
 */
export function logWarn(msg: string, ...obj: unknown[]): void {
  if (logBuffer || logClient.logLevel <= LogLevel.WARN) {
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

class LogBuffer {
  private _buffer: Array<{ level: LogLevel; now: string; args: unknown[] }>;
  private _numTruncated: number = 0;

  constructor(readonly bufferSize: number) {
    this._buffer = [];
    this._numTruncated = 0;
  }

  /**
   * Clear the log buffer
   */
  clear(): void {
    this._buffer = [];
    this._numTruncated = 0;
  }

  /**
   * Add a new log message to the buffer. If the buffer will exceed
   * the allocated buffer size, then remove the oldest message from
   * the buffer.
   * @param level
   * @param now
   * @param args
   */
  add(level: LogLevel, now: string, args: unknown[]): void {
    this._buffer.push({
      level,
      now,
      args
    });

    if (this._buffer.length > this.bufferSize) {
      // remove the first (oldest) element
      this._buffer.shift();
      this._numTruncated++;
    }
  }

  /**
   * Returns the number of old log messages that have been
   * truncated from the log to maintain buffer size.
   */
  get numTruncated(): number {
    return this._numTruncated;
  }

  get first(): { level: LogLevel; now: string; args: unknown[] } | undefined {
    return this._buffer[0];
  }

  /**
   * Iterate from oldest to newest.
   */
  [Symbol.iterator](): Iterator<{
    level: LogLevel;
    now: string;
    args: unknown[];
  }> {
    let currentIndex = 0;
    // Create a snapshot of the buffer for iteration.
    // This ensures that if the buffer is modified while iterating (e.g., by adding new logs),
    // the iterator will continue to iterate over the state of the buffer as it was when iteration began.
    // It also means you iterate from the oldest to the newest log.
    const bufferSnapshot = [...this._buffer];

    return {
      next: (): IteratorResult<{
        level: LogLevel;
        now: string;
        args: unknown[];
      }> => {
        if (currentIndex < bufferSnapshot.length) {
          return { value: bufferSnapshot[currentIndex++], done: false };
        } else {
          return { value: undefined, done: true };
        }
      }
    };
  }
}

/**
 * By default, `console.debug` is not displayed in the developer console (in
 * chrome). To avoid forcing users to have to opt-in to these logs twice
 * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
 * logs to the `console.log` function.
 */
const ConsoleMethod = {
  [LogLevel.DEBUG]: 'log',
  [LogLevel.VERBOSE]: 'log',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error'
};

/**
 * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
 * messages on to their corresponding console counterparts (if the log method
 * is supported by the current log level)
 */
const bufferingLogHandler: LogHandler = (instance, logType, ...args): void => {
  const now = new Date().toISOString();

  // Fail-safe. This is never expected to be true, but if it is,
  // it's not important enough to throw.
  if (!logBuffer) {
    defaultLogHandler(instance, logType, args);
    return;
  }

  // Buffer any messages less than the current logLevel
  if (logType < instance.logLevel) {
    logBuffer!.add(logType, now, args);
    return;
  }

  // create identifier that associates all of the associated
  // context messages with the log message that caused the
  // flush of the logBuffer
  const id = generateUniqueDebugId();

  // Optionally write a log message stating if any log messages
  // were skipped.
  if (logBuffer.first) {
    writeLog(instance, id, LogLevel.INFO, logBuffer.first.now, [
      `... ${logBuffer.numTruncated} log messages skipped ...`
    ]);
  }

  // If here, write the log buffer contents as context
  for (const logInfo of logBuffer) {
    writeLog(instance, id, logInfo.level, logInfo.now, logInfo.args);
  }
  logBuffer.clear();

  // Now write the target log message.
  writeLog(instance, id, logType, now, args);
};

function writeLog(
  instance: Logger,
  id: string,
  logType: LogLevel,
  now: string,
  args: unknown[]
): void {
  const method = ConsoleMethod[logType as keyof typeof ConsoleMethod];
  if (method) {
    console[method as 'log' | 'info' | 'warn' | 'error'](
      `[${now}] (context: ${id})  ${instance.name}:`,
      ...args
    );
  } else {
    throw new Error(
      `Attempted to log a message with an invalid logType (value: ${logType})`
    );
  }
}
