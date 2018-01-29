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

/**
 * This is the file that people using Node.js will actually import. You should
 * only include this file if you have something specific about your
 * implementation that mandates having a separate entrypoint. Otherwise you can
 * just use index.ts
 */

/**
 * A container for all of the Logger instances
 */
export const instances: Logger[] = [];

/**
 * The JS SDK supports 5 log levels and also allows a user the ability to
 * silence the logs altogether.
 *
 * The order is a follows:
 * DEBUG < VERBOSE < INFO < WARN < ERROR < SILENT
 *
 * All of the log types above the current log level will be captured (i.e. if
 * I set the log level to `INFO`, errors will still be logged, but `DEBUG` and
 * `VERBOSE` logs will not)
 */
export enum LogLevel {
  DEBUG,
  VERBOSE,
  INFO,
  WARN,
  ERROR,
  SILENT
}

/**
 * We allow users the ability to pass their own log handler. We will pass the
 * type of log, the current log level, and any other arguments passed (i.e. the
 * messages that the user wants to log) to this function.
 */
export type LogHandler = (
  logType: LogLevel,
  currentLogLevel: LogLevel,
  ...args: any[]
) => void;

/**
 * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
 * messages on to their corresponding console counterparts (if the log method
 * is supported by the current log level)
 */
const defaultLogHandler: LogHandler = (
  logType: LogLevel,
  currentLevel: LogLevel,
  ...args: any[]
) => {
  if (logType < currentLevel) return;
  switch (logType) {
    case LogLevel.SILENT:
      return;
    case LogLevel.VERBOSE:
      console.log(...args);
      break;
    case LogLevel.INFO:
      console.info(...args);
      break;
    case LogLevel.WARN:
      console.warn(...args);
      break;
    case LogLevel.ERROR:
      console.error(...args);
      break;
    default:
      console.debug(...args);
  }
};

export class Logger {
  constructor() {
    /**
     * Capture the current instance for later use
     */
    instances.push(this);
  }

  /**
   * The log level of the given logger. Though all of the log levels can be
   * centrally set, each logger can be set individually if it desires.
   */
  private _logLevel = LogLevel.WARN;
  get logLevel() {
    return this._logLevel;
  }
  set logLevel(val) {
    if (!(val in LogLevel)) {
      throw new TypeError('Attempted to Invalid value assigned to `logLevel`');
    }
    this._logLevel = val;
  }

  /**
   * The log handler for the current logger instance. This can be set to any
   * function value, though this should not be needed the vast majority of the
   * time
   */
  private _logHandler: LogHandler = defaultLogHandler;
  get logHandler() {
    return this._logHandler;
  }
  set logHandler(val) {
    if (typeof val !== 'function') {
      throw new TypeError('Value assigned to `logHandler` must be a function');
    }
    this._logHandler = val;
  }

  /**
   * The functions below are all based on the `console` interface
   */

  debug(...args) {
    this._logHandler(LogLevel.DEBUG, this._logLevel, ...args);
  }
  log(...args) {
    this._logHandler(LogLevel.VERBOSE, this._logLevel, ...args);
  }
  info(...args) {
    this._logHandler(LogLevel.INFO, this._logLevel, ...args);
  }
  warn(...args) {
    this._logHandler(LogLevel.WARN, this._logLevel, ...args);
  }
  error(...args) {
    this._logHandler(LogLevel.ERROR, this._logLevel, ...args);
  }
}
