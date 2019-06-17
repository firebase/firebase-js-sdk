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

/**
 * A container for all of the Logger instances
 */
export const instances: Logger[] = [];

/**
 * The JS SDK supports 5 log levels and also allows a user the ability to
 * silence the logs altogether.
 *
 * The order is a follows:
 * DEBUG < VERBOSE < INFO < WARN < ERROR
 *
 * All of the log types above the current log level will be captured (i.e. if
 * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
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
 * The default log level
 */
const defaultLogLevel: LogLevel = LogLevel.INFO;

/**
 * We allow users the ability to pass their own log handler. We will pass the
 * type of log, the current log level, and any other arguments passed (i.e. the
 * messages that the user wants to log) to this function.
 */
export type LogHandler = (
  loggerInstance: Logger,
  logType: LogLevel,
  ...args: unknown[]
) => void;

/**
 * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
 * messages on to their corresponding console counterparts (if the log method
 * is supported by the current log level)
 */
const defaultLogHandler: LogHandler = (instance, logType, ...args): void => {
  if (logType < instance.logLevel) {
    return;
  }
  const now = new Date().toISOString();
  switch (logType) {
    /**
     * By default, `console.debug` is not displayed in the developer console (in
     * chrome). To avoid forcing users to have to opt-in to these logs twice
     * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
     * logs to the `console.log` function.
     */
    case LogLevel.DEBUG:
      console.log(`[${now}]  ${instance.name}:`, ...args);
      break;
    case LogLevel.VERBOSE:
      console.log(`[${now}]  ${instance.name}:`, ...args);
      break;
    case LogLevel.INFO:
      console.info(`[${now}]  ${instance.name}:`, ...args);
      break;
    case LogLevel.WARN:
      console.warn(`[${now}]  ${instance.name}:`, ...args);
      break;
    case LogLevel.ERROR:
      console.error(`[${now}]  ${instance.name}:`, ...args);
      break;
    default:
      throw new Error(
        `Attempted to log a message with an invalid logType (value: ${logType})`
      );
  }
};

export class Logger {
  /**
   * Gives you an instance of a Logger to capture messages according to
   * Firebase's logging scheme.
   *
   * @param name The name that the logs will be associated with
   */
  constructor(public name: string) {
    /**
     * Capture the current instance for later use
     */
    instances.push(this);
  }

  /**
   * The log level of the given Logger instance.
   */
  private _logLevel = defaultLogLevel;
  get logLevel(): LogLevel {
    return this._logLevel;
  }
  set logLevel(val: LogLevel) {
    if (!(val in LogLevel)) {
      throw new TypeError('Invalid value assigned to `logLevel`');
    }
    this._logLevel = val;
  }

  /**
   * The log handler for the Logger instance.
   */
  private _logHandler: LogHandler = defaultLogHandler;
  get logHandler(): LogHandler {
    return this._logHandler;
  }
  set logHandler(val: LogHandler) {
    if (typeof val !== 'function') {
      throw new TypeError('Value assigned to `logHandler` must be a function');
    }
    this._logHandler = val;
  }

  /**
   * The functions below are all based on the `console` interface
   */

  debug(...args: unknown[]): void {
    this._logHandler(this, LogLevel.DEBUG, ...args);
  }
  log(...args: unknown[]): void {
    this._logHandler(this, LogLevel.VERBOSE, ...args);
  }
  info(...args: unknown[]): void {
    this._logHandler(this, LogLevel.INFO, ...args);
  }
  warn(...args: unknown[]): void {
    this._logHandler(this, LogLevel.WARN, ...args);
  }
  error(...args: unknown[]): void {
    this._logHandler(this, LogLevel.ERROR, ...args);
  }
}
